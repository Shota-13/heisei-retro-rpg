// path: src/scenes/FieldScene.ts
import Phaser from 'phaser';
import { CHARACTER_HEIGHT, SCALE, SCENE_KEYS, TEXTURE_KEYS, TILE_SIZE } from '../config/constants';
import { getServices } from '../core/services';
import { Player } from '../entities/Player';
import type { InputSystem } from '../systems/InputSystem';

const MAP_TILES_W = 40;
const MAP_TILES_H = 30;

/** 仮の壁。[タイルX, タイルY, 幅(タイル), 高さ(タイル)]。Tiled の読み込みができたら不要になる。 */
const WALLS: ReadonlyArray<readonly [number, number, number, number]> = [
  [8, 4, 1, 8],
  [8, 4, 10, 1],
  [20, 12, 4, 4],
  [4, 18, 12, 1],
  [28, 6, 1, 14],
];

const PLAYER_START_TILE = { x: 4, y: 6 } as const;

export class FieldScene extends Phaser.Scene {
  private player!: Player;
  private input$!: InputSystem; // Phaser.Scene.input と名前が衝突するため別名にしている

  constructor() {
    super(SCENE_KEYS.field);
  }

  create(): void {
    this.input$ = getServices().input;
    this.input$.clearPressed();

    const worldW = MAP_TILES_W * TILE_SIZE;
    const worldH = MAP_TILES_H * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldW, worldH);

    // 仮の床
    this.add.tileSprite(0, 0, worldW, worldH, TEXTURE_KEYS.floor).setOrigin(0, 0).setDepth(-1);

    // 仮の壁(静的な当たり判定つき)
    const walls: Phaser.GameObjects.TileSprite[] = [];
    for (const [tx, ty, tw, th] of WALLS) {
      const wall = this.add
        .tileSprite(tx * TILE_SIZE, ty * TILE_SIZE, tw * TILE_SIZE, th * TILE_SIZE, TEXTURE_KEYS.wall)
        .setOrigin(0, 0);
      this.physics.add.existing(wall, true);
      wall.setDepth(wall.y + wall.height); // 壁の下端でソート(キャラが壁の手前/奥で正しく重なる)
      walls.push(wall);
    }

    this.player = new Player(this, PLAYER_START_TILE.x * TILE_SIZE, PLAYER_START_TILE.y * TILE_SIZE);
    this.physics.add.collider(this.player, walls);

    // 通常シーンは、カメラを SCALE 倍ズームして論理解像度(320×240)の世界を映す
    const camera = this.cameras.main;
    camera.setZoom(SCALE);
    camera.setBounds(0, 0, worldW, worldH);
    camera.startFollow(this.player, true, 1, 1, 0, CHARACTER_HEIGHT / 2);
  }

  override update(): void {
    this.player.move(this.input$.getMoveVector());
    this.player.updateDepth();
  }
}
