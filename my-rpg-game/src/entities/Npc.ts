import Phaser from 'phaser';
import {
  CHARACTER_HEIGHT,
  CHARACTER_WIDTH,
  PLAYER_BODY_HEIGHT,
  PLAYER_BODY_WIDTH,
} from '../config/constants';

export class Npc extends Phaser.Physics.Arcade.Sprite {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textureKey: string,
    readonly eventId: string,
  ) {
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    this.setOrigin(0.5, 1);
    this.setDepth(this.y);

    const body = this.body;
    if (!(body instanceof Phaser.Physics.Arcade.StaticBody)) {
      throw new Error('Npc requires a static Arcade body');
    }
    body.setSize(PLAYER_BODY_WIDTH, PLAYER_BODY_HEIGHT);
    body.setOffset((CHARACTER_WIDTH - PLAYER_BODY_WIDTH) / 2, CHARACTER_HEIGHT - PLAYER_BODY_HEIGHT);
  }
}
