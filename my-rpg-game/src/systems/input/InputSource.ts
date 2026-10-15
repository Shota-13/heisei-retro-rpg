// path: src/systems/input/InputSource.ts

/** ゲームが扱う入力の種類。キーやボタンではなく「何をしたいか」で表す。 */
export type Action =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'confirm' // A: 決定・話す・調べる
  | 'cancel' // B: キャンセル
  | 'menu' // MENU(START相当)
  | 'select' // SELECT(予約)
  | 'dash'; // ダッシュ(予約)

export const ALL_ACTIONS: readonly Action[] = [
  'up',
  'down',
  'left',
  'right',
  'confirm',
  'cancel',
  'menu',
  'select',
  'dash',
];

/** 入力の供給元(キーボード、タッチ操作盤、ゲームパッドなど)。Phaser には依存しない。 */
export interface InputSource {
  /** 今押されているか */
  isDown(action: Action): boolean;
  /**
   * 押された事実を1回だけ返す(ラッチ)。
   * 押した瞬間に離しても、一定時間内なら次の呼び出しで必ず true になる。
   */
  consumePressed(action: Action, nowMs: number): boolean;
  /** 開発用: これまでの押下回数 */
  getPressCount(action: Action): number;
  /** 全入力を強制的に離した状態にする */
  reset(): void;
  dispose(): void;
}
