// path: src/ui/mobileGuards.ts

/**
 * スマホのブラウザ標準動作(ダブルタップ拡大・ピンチ・長押しメニュー・引っ張り更新・スクロール)を抑える。
 * CSS の touch-action: none と overscroll-behavior: none が主役で、これは念のための補強。
 */
export function installMobileGuards(): void {
  const prevent = (event: Event): void => event.preventDefault();

  document.addEventListener('contextmenu', prevent);

  // iOS Safari のピンチ操作(標準の型定義にはないイベント名)
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, prevent);
  }

  // 1画面固定でスクロールするものがないので、タッチ移動は常に抑止してよい
  document.addEventListener('touchmove', prevent, { passive: false });
}

/** 操作盤を出すか: タッチ主体の端末、または ?touch=1 */
export function shouldShowControls(forceTouch: boolean): boolean {
  return forceTouch || window.matchMedia('(pointer: coarse)').matches;
}
