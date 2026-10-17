// path: src/systems/PlaceholderTextures.ts
import type Phaser from 'phaser';
import { CHARACTER_HEIGHT, CHARACTER_WIDTH, TEXTURE_KEYS, TILE_SIZE } from '../config/constants';
import { PLACEHOLDER_COLORS as C } from '../config/placeholder';
import type { Facing } from '../entities/facing';

const FACINGS: readonly Facing[] = ['up', 'down', 'left', 'right'];
const NPC_TEXTURES = [
  { key: TEXTURE_KEYS.npc.blue, shirtColor: C.npcShirts.blue },
  { key: TEXTURE_KEYS.npc.red, shirtColor: C.npcShirts.red },
  { key: TEXTURE_KEYS.npc.green, shirtColor: C.npcShirts.green },
  { key: TEXTURE_KEYS.npc.yellow, shirtColor: C.npcShirts.yellow },
] as const;

/** 仮素材をコードで生成する。本素材(ドット絵)が入ったら、BootScene の preload に置き換える。 */
export function createPlaceholderTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);

  // キャラ 16×24(4方向)
  for (const facing of FACINGS) {
    g.clear();
    // 脚
    g.fillStyle(C.pants, 1).fillRect(4, 18, 3, 6).fillRect(9, 18, 3, 6);
    // 胴
    g.fillStyle(C.shirt, 1).fillRect(3, 10, 10, 9);
    // 頭
    g.fillStyle(C.skin, 1).fillRect(3, 1, 10, 9);
    // 髪(後ろ向きは顔全体が髪)
    g.fillStyle(C.hair, 1).fillRect(3, 1, 10, facing === 'up' ? 9 : 3);
    // 目
    g.fillStyle(C.eye, 1);
    if (facing === 'down') g.fillRect(5, 6, 2, 2).fillRect(9, 6, 2, 2);
    if (facing === 'left') g.fillRect(4, 6, 2, 2);
    if (facing === 'right') g.fillRect(10, 6, 2, 2);
    g.generateTexture(TEXTURE_KEYS.player[facing], CHARACTER_WIDTH, CHARACTER_HEIGHT);
  }

  for (const { key, shirtColor } of NPC_TEXTURES) {
    g.clear();
    g.fillStyle(C.pants, 1).fillRect(4, 18, 3, 6).fillRect(9, 18, 3, 6);
    g.fillStyle(shirtColor, 1).fillRect(3, 10, 10, 9);
    g.fillStyle(C.skin, 1).fillRect(3, 1, 10, 9);
    g.fillStyle(C.hair, 1).fillRect(3, 1, 10, 3);
    g.fillStyle(C.eye, 1).fillRect(5, 6, 2, 2).fillRect(9, 6, 2, 2);
    g.generateTexture(key, CHARACTER_WIDTH, CHARACTER_HEIGHT);
  }

  // 床タイル 16×16
  g.clear();
  g.fillStyle(C.floorA, 1).fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  g.fillStyle(C.floorB, 1).fillRect(0, 0, TILE_SIZE / 2, TILE_SIZE / 2).fillRect(TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2);
  g.generateTexture(TEXTURE_KEYS.floor, TILE_SIZE, TILE_SIZE);

  // 壁タイル 16×16
  g.clear();
  g.fillStyle(C.wallEdge, 1).fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  g.fillStyle(C.wallFill, 1).fillRect(1, 1, TILE_SIZE - 2, TILE_SIZE - 2);
  g.generateTexture(TEXTURE_KEYS.wall, TILE_SIZE, TILE_SIZE);

  g.destroy();
}
