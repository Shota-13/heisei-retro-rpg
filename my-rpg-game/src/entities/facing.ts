// path: src/entities/facing.ts

/** キャラの絵は上下左右の4方向だけ(斜めに動いても、見た目はどれか1方向)。 */
export type Facing = 'up' | 'down' | 'left' | 'right';

/**
 * 移動ベクトルから向きを決める(純粋関数)。
 * - 1軸だけ動いているなら、その向き
 * - 斜めのときは、今の向きが斜めの成分に含まれていれば維持する(向きがバタつかない)。
 *   含まれていなければ横向きを優先する
 * - 止まっているときは変えない
 */
export function resolveFacing(current: Facing, move: { readonly x: number; readonly y: number }): Facing {
  const horizontal: Facing | null = move.x < 0 ? 'left' : move.x > 0 ? 'right' : null;
  const vertical: Facing | null = move.y < 0 ? 'up' : move.y > 0 ? 'down' : null;

  if (horizontal && vertical) {
    return current === horizontal || current === vertical ? current : horizontal;
  }
  return horizontal ?? vertical ?? current;
}
