// path: src/ui/DebugHud.ts
import type { InputSystem } from '../systems/InputSystem';
import type { Action } from '../systems/input/InputSource';
import type { TouchPad } from './touchpad/TouchPad';

const COUNTED_ACTIONS: readonly Action[] = ['confirm', 'cancel', 'menu', 'select'];

/**
 * 開発用の入力状態表示(?debug=1 のときだけ作る)。
 * 実機で「押しているのに反応しない」を確かめるため、押下回数と十字キーの判定角度を出す。
 */
export class DebugHud {
  private readonly el: HTMLPreElement;

  constructor(
    private readonly input: InputSystem,
    private readonly touchPad: TouchPad,
  ) {
    this.el = document.createElement('pre');
    this.el.id = 'debug-hud';
    document.body.appendChild(this.el);
    requestAnimationFrame(this.tick);
  }

  private readonly tick = (): void => {
    const down = this.input.getDownActions().join(',') || '-';
    const counts = COUNTED_ACTIONS.map((a) => `${a}:${this.input.getPressCount(a)}`).join(' ');
    const dpad = this.touchPad.getDebug();
    const angle = dpad.active ? `${dpad.angleDeg.toFixed(0)}°` : '-';
    const ratio = dpad.active ? dpad.distanceRatio.toFixed(2) : '-';
    this.el.textContent =
      `down: ${down}\n` + `press: ${counts}\n` + `dpad: ${dpad.direction ?? '-'}  angle=${angle}  r=${ratio}`;
    requestAnimationFrame(this.tick);
  };
}
