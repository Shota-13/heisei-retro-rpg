// path: src/entities/Player.ts
import Phaser from 'phaser';
import {
  CHARACTER_HEIGHT,
  CHARACTER_WIDTH,
  PLAYER_BODY_HEIGHT,
  PLAYER_BODY_WIDTH,
  PLAYER_SPEED,
  TEXTURE_KEYS,
} from '../config/constants';
import type { MoveVector } from '../systems/InputSystem';
import { resolveFacing, type Facing } from './facing';

/**
 * 主人公。位置(x, y)は「足元の中心」。
 * 当たり判定は足元の小さい矩形だけなので、頭は壁に重なって見える(見下ろし型RPGの定番)。
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  private facing: Facing = 'down';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEXTURE_KEYS.player.down);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.setCollideWorldBounds(true);

    const body = this.body;
    if (!(body instanceof Phaser.Physics.Arcade.Body)) {
      throw new Error('Player requires a dynamic Arcade body');
    }
    body.setSize(PLAYER_BODY_WIDTH, PLAYER_BODY_HEIGHT, false);
    body.setOffset((CHARACTER_WIDTH - PLAYER_BODY_WIDTH) / 2, CHARACTER_HEIGHT - PLAYER_BODY_HEIGHT);
  }

  getFacing(): Facing {
    return this.facing;
  }

  setEyesClosed(isClosed: boolean): void {
    this.setTexture(isClosed ? TEXTURE_KEYS.player.downBlink : TEXTURE_KEYS.player.down);
  }

  move(direction: MoveVector): void {
    this.setVelocity(direction.x * PLAYER_SPEED, direction.y * PLAYER_SPEED);

    const next = resolveFacing(this.facing, direction);
    if (next !== this.facing) {
      this.facing = next;
      this.setTexture(TEXTURE_KEYS.player[next]);
    }
  }

  /** Y座標(足元)で描画順を決める。奥にいるものが手前のものの後ろに描かれる。 */
  updateDepth(): void {
    this.setDepth(this.y);
  }
}
