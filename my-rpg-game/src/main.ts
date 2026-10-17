// path: src/main.ts
import Phaser from 'phaser';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './config/constants';
import { DEBUG_FLAGS } from './config/debug';
import { provideServices } from './core/services';
import { BootScene } from './scenes/BootScene';
import { FieldScene } from './scenes/FieldScene';
import { InputSystem } from './systems/InputSystem';
import { KeyboardSource } from './systems/input/KeyboardSource';
import { DebugHud } from './ui/DebugHud';
import { installMobileGuards, shouldShowControls } from './ui/mobileGuards';
import { TouchPad } from './ui/touchpad/TouchPad';

// --- 入力: キーボードとタッチ操作盤を、同じ InputSystem にまとめる ---
const controlsEl = document.getElementById('controls');
if (!controlsEl) {
  throw new Error('#controls not found in index.html');
}

const input = new InputSystem();
input.addSource(new KeyboardSource());
const touchPad = new TouchPad(controlsEl);
input.addSource(touchPad);
provideServices({ input });

installMobileGuards();
document.documentElement.classList.toggle('has-controls', shouldShowControls(DEBUG_FLAGS.forceTouch));
if (DEBUG_FLAGS.debug) {
  new DebugHud(input, touchPad);
}

// --- ゲーム ---
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  // キャンバスの実解像度は 論理解像度 × SCALE。通常シーンはカメラを SCALE 倍ズームして描く
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  backgroundColor: '#000000',
  pixelArt: true,
  roundPixels: true,
  disableContextMenu: true,
  input: { keyboard: false }, // キーボードは KeyboardSource が window から直接読む
  scale: {
    mode: Phaser.Scale.FIT, // 整数倍スケールの調整はフェーズ3
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: DEBUG_FLAGS.debug },
  },
  scene: [BootScene, FieldScene],
};

const game = new Phaser.Game(config);

if (DEBUG_FLAGS.debug) {
  // 開発用: ブラウザのコンソールや自動テストから状態を覗けるようにする(?debug=1 のときだけ)
  (window as Window & { __debug?: { game: Phaser.Game; input: InputSystem } }).__debug = { game, input };
}
