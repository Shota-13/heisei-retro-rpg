// path: src/config/input.ts
// 操作感に関わる値。実機で触りながら調整する前提で、すべてここに集約する。
// (十字キーの判定領域の余白は CSS 変数 --dpad-pad(style.css)で調整する)

/** 十字キー: 中心付近の不感帯(十字キーの半径に対する比率)。 */
export const DPAD_DEADZONE_RATIO = 0.2;
/** 十字キー: すでに入力中のとき、不感帯の解除側に掛ける係数(チラつき防止。1未満で狭くなる)。 */
export const DPAD_DEADZONE_RELEASE_FACTOR = 0.75;
/** 十字キー: 上下左右の扇形の幅(度)。 */
export const DPAD_CARDINAL_ANGLE_DEG = 50;
/** 十字キー: 斜めの扇形の幅(度)。4×CARDINAL + 4×DIAGONAL = 360 になること。 */
export const DPAD_DIAGONAL_ANGLE_DEG = 40;
/** 十字キー: 方向が切り替わる境界での余裕(度)。 */
export const DPAD_HYSTERESIS_DEG = 5;

/** 押下をラッチ(保持)しておく時間。1フレームより短いタップを取りこぼさないため。 */
export const INPUT_LATCH_MS = 120;

/** ボタン押下時の振動(ミリ秒)。Androidのみ有効。 */
export const HAPTIC_PULSE_MS = 10;
