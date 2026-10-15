// path: src/scenes/BootScene.ts
import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/constants';
import { createPlaceholderTextures } from '../systems/PlaceholderTextures';

/** 素材の準備をして FieldScene へ進む。本素材が入ったら、ここで preload する。 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot);
  }

  create(): void {
    createPlaceholderTextures(this);
    this.scene.start(SCENE_KEYS.field);
  }
}
