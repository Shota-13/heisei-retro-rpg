// path: src/systems/input/ActionState.ts
import type { Action } from './InputSource';

/**
 * アクションごとの「押されている状態」と「押下のラッチ」を管理する。
 * 同じアクションを複数の物理入力(Z と Enter、複数の指など)が押せるので、
 * 押している主体(holder)ごとに記録し、1つでも残っていれば押下中とみなす。
 */
export class ActionState {
  private readonly holders = new Map<Action, Set<string>>();
  private readonly pressedAt = new Map<Action, number>();
  private readonly pressCounts = new Map<Action, number>();

  constructor(private readonly latchMs: number) {}

  press(action: Action, holder: string, nowMs: number): void {
    let set = this.holders.get(action);
    if (!set) {
      set = new Set<string>();
      this.holders.set(action, set);
    }
    if (set.has(holder)) return; // キーリピートなどの二重押しは無視
    set.add(holder);
    this.pressedAt.set(action, nowMs);
    this.pressCounts.set(action, (this.pressCounts.get(action) ?? 0) + 1);
  }

  release(action: Action, holder: string): void {
    this.holders.get(action)?.delete(holder);
  }

  /** 指定の holder が押しているアクションをすべて離す。 */
  releaseHolder(holder: string): void {
    for (const set of this.holders.values()) {
      set.delete(holder);
    }
  }

  isDown(action: Action): boolean {
    return (this.holders.get(action)?.size ?? 0) > 0;
  }

  /** 押下を1回だけ返す。ラッチ時間を過ぎた古い押下は無効(捨てる)。 */
  consumePressed(action: Action, nowMs: number): boolean {
    const at = this.pressedAt.get(action);
    if (at === undefined) return false;
    this.pressedAt.delete(action);
    return nowMs - at <= this.latchMs;
  }

  getPressCount(action: Action): number {
    return this.pressCounts.get(action) ?? 0;
  }

  /** 全入力を離し、ラッチも捨てる。押下回数(開発用)は残す。 */
  reset(): void {
    this.holders.clear();
    this.pressedAt.clear();
  }
}
