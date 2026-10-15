// path: src/systems/input/KeyboardSource.ts
import { INPUT_LATCH_MS } from '../../config/input';
import { ActionState } from './ActionState';
import type { Action, InputSource } from './InputSource';

/**
 * キー割り当て。`KeyboardEvent.code`(物理キー位置)を使うので、
 * 日本語入力ONでもキー配列が違っても動く。
 */
const KEY_BINDINGS: Readonly<Record<Action, readonly string[]>> = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  confirm: ['KeyZ', 'Enter', 'Space'],
  cancel: ['KeyX', 'Escape', 'Backspace'],
  menu: ['KeyC'],
  select: ['KeyV'],
  dash: ['ShiftLeft', 'ShiftRight'],
};

/** Phaser のシーンに依存せず、window のキーイベントを直接読む(シーンが切り替わっても入力が途切れない)。 */
export class KeyboardSource implements InputSource {
  private readonly state = new ActionState(INPUT_LATCH_MS);
  private readonly actionsByCode = new Map<string, Action[]>();
  private readonly abort = new AbortController();

  constructor(target: Window = window) {
    for (const [action, codes] of Object.entries(KEY_BINDINGS) as [Action, readonly string[]][]) {
      for (const code of codes) {
        const list = this.actionsByCode.get(code) ?? [];
        list.push(action);
        this.actionsByCode.set(code, list);
      }
    }

    const { signal } = this.abort;
    target.addEventListener('keydown', this.onKeyDown, { signal });
    target.addEventListener('keyup', this.onKeyUp, { signal });
    target.addEventListener('blur', () => this.reset(), { signal });
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

  reset(): void {
    this.state.reset();
  }

  dispose(): void {
    this.abort.abort();
    this.reset();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    // Ctrl+C(コピー)などのブラウザのショートカットは邪魔しない
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    // 入力欄(プレイヤー名入力など)に打っている間はゲーム入力にしない
    if (isTypingTarget(event.target)) return;

    const actions = this.actionsByCode.get(event.code);
    if (!actions) return;

    event.preventDefault(); // 矢印・スペースによるスクロールを防ぐ
    if (event.repeat) return;
    const now = performance.now();
    for (const action of actions) {
      this.state.press(action, event.code, now);
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    const actions = this.actionsByCode.get(event.code);
    if (!actions) return;
    for (const action of actions) {
      this.state.release(action, event.code);
    }
  };
}

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}
