// path: src/ui/touchpad/dpadDirection.ts
import {
  DPAD_CARDINAL_ANGLE_DEG,
  DPAD_DEADZONE_RATIO,
  DPAD_DEADZONE_RELEASE_FACTOR,
  DPAD_DIAGONAL_ANGLE_DEG,
  DPAD_HYSTERESIS_DEG,
} from '../../config/input';
import type { Action } from '../../systems/input/InputSource';

export type Direction8 =
  | 'up'
  | 'up_right'
  | 'right'
  | 'down_right'
  | 'down'
  | 'down_left'
  | 'left'
  | 'up_left';

interface Sector {
  readonly direction: Direction8;
  /** 扇形の中心角(度)。0°=右、時計回り(画面の下向きが90°) */
  readonly centerDeg: number;
  readonly halfWidthDeg: number;
}

if (4 * DPAD_CARDINAL_ANGLE_DEG + 4 * DPAD_DIAGONAL_ANGLE_DEG !== 360) {
  throw new Error('DPAD_CARDINAL_ANGLE_DEG と DPAD_DIAGONAL_ANGLE_DEG の合計(4×各)が 360° になっていません');
}

const CARD_HALF = DPAD_CARDINAL_ANGLE_DEG / 2;
const DIAG_HALF = DPAD_DIAGONAL_ANGLE_DEG / 2;

const SECTORS: readonly Sector[] = [
  { direction: 'right', centerDeg: 0, halfWidthDeg: CARD_HALF },
  { direction: 'down_right', centerDeg: 45, halfWidthDeg: DIAG_HALF },
  { direction: 'down', centerDeg: 90, halfWidthDeg: CARD_HALF },
  { direction: 'down_left', centerDeg: 135, halfWidthDeg: DIAG_HALF },
  { direction: 'left', centerDeg: 180, halfWidthDeg: CARD_HALF },
  { direction: 'up_left', centerDeg: 225, halfWidthDeg: DIAG_HALF },
  { direction: 'up', centerDeg: 270, halfWidthDeg: CARD_HALF },
  { direction: 'up_right', centerDeg: 315, halfWidthDeg: DIAG_HALF },
];

const SECTOR_BY_DIRECTION: Readonly<Record<Direction8, Sector>> = Object.fromEntries(
  SECTORS.map((sector) => [sector.direction, sector]),
) as Record<Direction8, Sector>;

/** 方向 → 押されるアクション(斜めは2つ同時) */
export const DIRECTION_ACTIONS: Readonly<Record<Direction8, readonly Action[]>> = {
  up: ['up'],
  up_right: ['up', 'right'],
  right: ['right'],
  down_right: ['down', 'right'],
  down: ['down'],
  down_left: ['down', 'left'],
  left: ['left'],
  up_left: ['up', 'left'],
};

export interface DpadInput {
  /** 十字キー中心から指までの横・縦の距離(画面座標、下が+) */
  readonly dx: number;
  readonly dy: number;
  /** 十字キー(見た目)の半径 */
  readonly radiusPx: number;
  /** 直前に判定していた方向(ヒステリシス用) */
  readonly previous: Direction8 | null;
}

export interface DpadResult {
  readonly direction: Direction8 | null;
  /** 0°=右、時計回り。0〜360 */
  readonly angleDeg: number;
  /** 中心からの距離 ÷ 半径 */
  readonly distanceRatio: number;
}

function angularDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * 指の位置から8方向を判定する(DOM・Phaser に依存しない純粋関数)。
 * - 中心付近は不感帯(入力なし)
 * - 斜めの扇形は上下左右より狭い(意図しない斜めを減らす)
 * - 直前の方向は扇形を少し広げて維持する(境界でのチラつき防止)
 */
export function resolveDpadDirection(input: DpadInput): DpadResult {
  const { dx, dy, radiusPx, previous } = input;
  const distanceRatio = radiusPx > 0 ? Math.hypot(dx, dy) / radiusPx : 0;
  const angleDeg = (((Math.atan2(dy, dx) * 180) / Math.PI) % 360 + 360) % 360;

  const deadzone = previous ? DPAD_DEADZONE_RATIO * DPAD_DEADZONE_RELEASE_FACTOR : DPAD_DEADZONE_RATIO;
  if (distanceRatio < deadzone) {
    return { direction: null, angleDeg, distanceRatio };
  }

  if (previous) {
    const sector = SECTOR_BY_DIRECTION[previous];
    if (angularDistance(angleDeg, sector.centerDeg) <= sector.halfWidthDeg + DPAD_HYSTERESIS_DEG) {
      return { direction: previous, angleDeg, distanceRatio };
    }
  }

  // 扇形はすき間なく並んでいるので、「中心からの角度差 − 半幅」が最小のものが該当する扇形
  let best = SECTORS[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const sector of SECTORS) {
    const score = angularDistance(angleDeg, sector.centerDeg) - sector.halfWidthDeg;
    if (score < bestScore) {
      bestScore = score;
      best = sector;
    }
  }
  return { direction: best ? best.direction : null, angleDeg, distanceRatio };
}
