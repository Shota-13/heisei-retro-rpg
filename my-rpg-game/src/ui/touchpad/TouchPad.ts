// path: src/ui/touchpad/TouchPad.ts
import { HAPTIC_PULSE_MS, INPUT_LATCH_MS } from '../../config/input';
import { ActionState } from '../../systems/input/ActionState';
import type { Action, InputSource } from '../../systems/input/InputSource';
import { DIRECTION_ACTIONS, resolveDpadDirection, type Direction8 } from './dpadDirection';

const DPAD_HOLDER = 'dpad';

const DPAD_CLASS_BY_ACTION: Readonly<Partial<Record<Action, string>>> = {
  up: 'is-up',
  down: 'is-down',
  left: 'is-left',
  right: 'is-right',
};

export interface TouchPadDebug {
  readonly active: boolean;
  readonly direction: Direction8 | null;
  readonly angleDeg: number;
  readonly distanceRatio: number;
}

/**
 * 画面下のHTML操作盤(十字キー・A・B・MENU・SELECT)を InputSource として扱う。
 * - 十字キー: 中心からの角度で8方向を判定。pointer capture で、指が領域外に出ても入力を維持
 * - ボタン: 押した事実をラッチ。十字キーとは別の指として独立に追跡(同時押し可)
 * - pointercancel / lostpointercapture / blur / 非表示 で全入力を強制リセット
 */
export class TouchPad implements InputSource {
  /** ボタン押下時の振動(Androidのみ)。設定画面ができたらここをON/OFFする。 */
  haptics = true;

  private readonly state = new ActionState(INPUT_LATCH_MS);
  private readonly abort = new AbortController();
  private readonly dpadEl: HTMLElement;
  private readonly dpadVisualEl: HTMLElement;
  private readonly buttonEls: ReadonlyArray<{ el: HTMLElement; action: Action }>;

  private dpadPointerId: number | null = null;
  private currentDirection: Direction8 | null = null;
  private lastDebug: TouchPadDebug = { active: false, direction: null, angleDeg: 0, distanceRatio: 0 };

  constructor(root: HTMLElement) {
    const dpad = root.querySelector<HTMLElement>('[data-dpad]');
    const dpadVisual = root.querySelector<HTMLElement>('[data-dpad-visual]');
    if (!dpad || !dpadVisual) {
      throw new Error('操作盤の十字キー要素([data-dpad] / [data-dpad-visual])が見つかりません');
    }
    this.dpadEl = dpad;
    this.dpadVisualEl = dpadVisual;

    this.buttonEls = Array.from(root.querySelectorAll<HTMLElement>('[data-action]')).map((el) => ({
      el,
      action: el.dataset.action as Action,
    }));

    const { signal } = this.abort;

    // 十字キー
    this.dpadEl.addEventListener('pointerdown', this.onDpadDown, { signal });
    this.dpadEl.addEventListener('pointermove', this.onDpadMove, { signal });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
      this.dpadEl.addEventListener(type, this.onDpadEnd, { signal });
    }

    // ボタン
    for (const { el, action } of this.buttonEls) {
      el.addEventListener('pointerdown', (e) => this.onButtonDown(e, el, action), { signal });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
        el.addEventListener(type, (e) => this.onButtonEnd(e, el, action), { signal });
      }
    }

    // 長押しメニューの抑止
    root.addEventListener('contextmenu', (e) => e.preventDefault(), { signal });

    // 取りこぼし対策: ウィンドウから離れたら全入力をリセット
    window.addEventListener('blur', () => this.reset(), { signal });
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) this.reset();
      },
      { signal },
    );
  }

  isDown(action: Action): boolean {
    return this.state.isDown(action);
  }

  consumePressed(action: Action, nowMs: number): boolean {
    return this.state.consumePressed(action, nowMs);
  }

  getPressCount(action: Action): number {
    return this.state.getPressCount(action);
  }

  getDebug(): TouchPadDebug {
    return this.lastDebug;
  }

  reset(): void {
    this.state.reset();
    this.dpadPointerId = null;
    this.currentDirection = null;
    this.lastDebug = { ...this.lastDebug, active: false, direction: null };
    this.renderDpad();
    for (const { el } of this.buttonEls) {
      el.classList.remove('is-down');
    }
  }

  dispose(): void {
    this.abort.abort();
    this.reset();
  }

  // ---- 十字キー ----------------------------------------------------------

  private readonly onDpadDown = (event: PointerEvent): void => {
    if (!isPrimaryPress(event)) return;
    if (this.dpadPointerId !== null) return; // 十字キーは1本の指だけ
    event.preventDefault();
    this.dpadPointerId = event.pointerId;
    this.dpadEl.setPointerCapture(event.pointerId);
    this.updateDpad(event);
    this.vibrate();
  };

  private readonly onDpadMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.dpadPointerId) return;
    event.preventDefault();
    this.updateDpad(event);
  };

  private readonly onDpadEnd = (event: PointerEvent): void => {
    if (event.pointerId !== this.dpadPointerId) return;
    this.dpadPointerId = null;
    this.applyDirection(null);
    this.lastDebug = { ...this.lastDebug, active: false, direction: null };
  };

  private updateDpad(event: PointerEvent): void {
    const rect = this.dpadVisualEl.getBoundingClientRect();
    const result = resolveDpadDirection({
      dx: event.clientX - (rect.left + rect.width / 2),
      dy: event.clientY - (rect.top + rect.height / 2),
      radiusPx: rect.width / 2,
      previous: this.currentDirection,
    });
    this.lastDebug = {
      active: true,
      direction: result.direction,
      angleDeg: result.angleDeg,
      distanceRatio: result.distanceRatio,
    };
    this.applyDirection(result.direction);
  }

  /** 方向が変わったときだけ、押すアクション・離すアクションを差し替える。 */
  private applyDirection(next: Direction8 | null): void {
    if (next === this.currentDirection) return;

    const before = new Set<Action>(this.currentDirection ? DIRECTION_ACTIONS[this.currentDirection] : []);
    const after = new Set<Action>(next ? DIRECTION_ACTIONS[next] : []);
    const now = performance.now();

    for (const action of before) {
      if (!after.has(action)) this.state.release(action, DPAD_HOLDER);
    }
    for (const action of after) {
      if (!before.has(action)) this.state.press(action, DPAD_HOLDER, now);
    }

    this.currentDirection = next;
    this.renderDpad();
  }

  private renderDpad(): void {
    const active = new Set<Action>(this.currentDirection ? DIRECTION_ACTIONS[this.currentDirection] : []);
    for (const [action, cls] of Object.entries(DPAD_CLASS_BY_ACTION) as [Action, string][]) {
      this.dpadEl.classList.toggle(cls, active.has(action));
    }
  }

  // ---- ボタン ------------------------------------------------------------

  private onButtonDown(event: PointerEvent, el: HTMLElement, action: Action): void {
    if (!isPrimaryPress(event)) return;
    event.preventDefault();
    el.setPointerCapture(event.pointerId);
    this.state.press(action, `ptr:${event.pointerId}`, performance.now());
    el.classList.add('is-down');
    this.vibrate();
  }

  private onButtonEnd(event: PointerEvent, el: HTMLElement, action: Action): void {
    this.state.release(action, `ptr:${event.pointerId}`);
    el.classList.toggle('is-down', this.state.isDown(action));
  }

  private vibrate(): void {
    if (this.haptics && 'vibrate' in navigator) {
      navigator.vibrate(HAPTIC_PULSE_MS);
    }
  }
}

/** マウスの右クリックなどは無視する(タッチ・ペン・マウス左ボタンのみ)。 */
function isPrimaryPress(event: PointerEvent): boolean {
  return event.pointerType !== 'mouse' || event.button === 0;
}
