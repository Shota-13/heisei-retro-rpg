// path: src/systems/InputSystem.ts
import { ALL_ACTIONS, type Action, type InputSource } from './input/InputSource';

export interface MoveVector {
  readonly x: number;
  readonly y: number;
}

/**
 * ゲーム側が使う入力の窓口。キーやボタンを直接見ず、アクション(Action)で問い合わせる。
 * キーボード・タッチ操作盤・ゲームパッドは InputSource として追加する。Phaser には依存しない。
 */
export class InputSystem {
  private readonly sources: InputSource[] = [];

  addSource(source: InputSource): void {
    this.sources.push(source);
  }

  isDown(action: Action): boolean {
    return this.sources.some((source) => source.isDown(action));
  }

  /**
   * 押された瞬間を1回だけ true にする。短いタップでも取りこぼさない(ラッチ)。
   * 全入力源から消費するので、同時押しでも二重に発火しない。
   */
  justPressed(action: Action): boolean {
    const now = performance.now();
    let hit = false;
    for (const source of this.sources) {
      if (source.consumePressed(action, now)) hit = true;
    }
    return hit;
  }

  /** 8方向の移動ベクトル。斜めは正規化し、速度が約1.4倍にならないようにする。 */
  getMoveVector(): MoveVector {
    const x = (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0);
    const y = (this.isDown('down') ? 1 : 0) - (this.isDown('up') ? 1 : 0);
    if (x !== 0 && y !== 0) {
      return { x: x * Math.SQRT1_2, y: y * Math.SQRT1_2 };
    }
    return { x, y };
  }

  /** 溜まっている古いラッチを捨てる(シーン開始時などに呼ぶ)。 */
  clearPressed(): void {
    const now = performance.now();
    for (const action of ALL_ACTIONS) {
      for (const source of this.sources) {
        source.consumePressed(action, now);
      }
    }
  }

  /** 全入力を強制的に離した状態にする。 */
  resetAll(): void {
    for (const source of this.sources) {
      source.reset();
    }
  }

  /** 開発用: これまでの押下回数(全入力源の合計)。 */
  getPressCount(action: Action): number {
    return this.sources.reduce((sum, source) => sum + source.getPressCount(action), 0);
  }

  /** 開発用: いま押されているアクションの一覧。 */
  getDownActions(): Action[] {
    return ALL_ACTIONS.filter((action) => this.isDown(action));
  }
}
