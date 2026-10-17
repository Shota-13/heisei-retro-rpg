// path: src/config/constants.ts

/** 論理解像度(ドット絵を描く世界の大きさ)。決定: 320×240(4:3) */
export const LOGICAL_WIDTH = 320;
export const LOGICAL_HEIGHT = 240;

/**
 * キャンバスの倍率。キャンバスの実解像度 = 論理解像度 × SCALE。
 * 通常シーンはカメラを SCALE 倍ズームして描画する。2〜4で調整可能。
 * 960 などの数値は直書きせず、必ずここから計算する。
 */
export const SCALE = 3;
export const CANVAS_WIDTH = LOGICAL_WIDTH * SCALE;
export const CANVAS_HEIGHT = LOGICAL_HEIGHT * SCALE;

/** 高画質シーン(ScenicScene)の背景を制作する倍率。縮小して使えるよう、最大の4倍で作る。 */
export const HIRES_AUTHORING_SCALE = 4;

/** タイルとキャラクターの寸法(ピクセル)。キャラ枠は全員 16×24 に統一。 */
export const TILE_SIZE = 16;
export const CHARACTER_WIDTH = 16;
export const CHARACTER_HEIGHT = 24;

/** プレイヤーの移動速度(論理ピクセル/秒)。 */
export const PLAYER_SPEED = 64;

/** 足元の当たり判定(論理ピクセル)。キャラの下端に合わせて配置する。 */
export const PLAYER_BODY_WIDTH = 10;
export const PLAYER_BODY_HEIGHT = 6;

export const SCENE_KEYS = {
  boot: 'BootScene',
  field: 'FieldScene',
} as const;

export const TEXTURE_KEYS = {
  player: {
    up: 'tex_player_up',
    down: 'tex_player_down',
    left: 'tex_player_left',
    right: 'tex_player_right',
  },
  npc: {
    blue: 'tex_npc_blue',
    red: 'tex_npc_red',
    green: 'tex_npc_green',
    yellow: 'tex_npc_yellow',
  },
  wall: 'tex_wall',
  floor: 'tex_floor',
} as const;
