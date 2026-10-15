// path: src/config/debug.ts
// URLパラメータによる開発用フラグ。 例: http://localhost:5173/?debug=1&touch=1

const params = new URLSearchParams(window.location.search);

export const DEBUG_FLAGS = {
  /** 入力状態の表示と、Arcade Physics の当たり判定表示 */
  debug: params.has('debug'),
  /** PCでも操作盤を表示する(マウスでタッチ操作の確認ができる) */
  forceTouch: params.has('touch'),
} as const;
