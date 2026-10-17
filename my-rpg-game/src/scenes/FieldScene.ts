// path: src/scenes/FieldScene.ts
import Phaser from 'phaser';
import {
  CHARACTER_HEIGHT,
  PLAYER_BODY_WIDTH,
  SCALE,
  SCENE_KEYS,
  TEXTURE_KEYS,
  TILE_SIZE,
} from '../config/constants';
import { getServices } from '../core/services';
import { EventRunner, type SayCommand } from '../core/EventRunner';
import { Npc } from '../entities/Npc';
import { Player } from '../entities/Player';
import type { Facing } from '../entities/facing';
import fieldNpcEvents from '../data/events/field_npcs.json';
import japaneseTexts from '../data/text/ja.json';
import type { InputSystem } from '../systems/InputSystem';
import { DialogueBox } from '../ui/DialogueBox';

const MAP_TILES_W = 40;
const MAP_TILES_H = 30;
const JAPANESE_TEXTS = new Map(Object.entries(japaneseTexts));

/** 仮の壁。[タイルX, タイルY, 幅(タイル), 高さ(タイル)]。Tiled の読み込みができたら不要になる。 */
const WALLS: ReadonlyArray<readonly [number, number, number, number]> = [
  [8, 4, 1, 8],
  [8, 4, 10, 1],
  [20, 12, 4, 4],
  [4, 18, 12, 1],
  [28, 6, 1, 14],
];

const PLAYER_START_TILE = { x: 4, y: 6 } as const;

const NPC_PLACEMENTS = [
  { tileX: 4, tileY: 7, textureKey: TEXTURE_KEYS.npc.blue, eventId: 'event.field.npc.blue' },
  { tileX: 11, tileY: 10, textureKey: TEXTURE_KEYS.npc.red, eventId: 'event.field.npc.red' },
  { tileX: 15, tileY: 6, textureKey: TEXTURE_KEYS.npc.green, eventId: 'event.field.npc.green' },
  { tileX: 23, tileY: 22, textureKey: TEXTURE_KEYS.npc.yellow, eventId: 'event.field.npc.yellow' },
] as const;

const FACING_OFFSETS: Readonly<Record<Facing, { readonly x: number; readonly y: number }>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export class FieldScene extends Phaser.Scene {
  private player: Player | null = null;
  private input$: InputSystem | null = null; // Phaser.Scene.input と名前が衝突するため別名にしている
  private readonly npcs: Npc[] = [];
  private readonly eventRunner = new EventRunner(fieldNpcEvents);
  private dialogueBox: DialogueBox | null = null;

  constructor() {
    super(SCENE_KEYS.field);
  }

  create(): void {
    const input = getServices().input;
    this.input$ = input;
    input.clearPressed();

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

    const player = new Player(this, PLAYER_START_TILE.x * TILE_SIZE, PLAYER_START_TILE.y * TILE_SIZE);
    this.player = player;
    this.npcs.length = 0;
    for (const placement of NPC_PLACEMENTS) {
      const npc = new Npc(
        this,
        placement.tileX * TILE_SIZE,
        placement.tileY * TILE_SIZE,
        placement.textureKey,
        placement.eventId,
      );
      this.npcs.push(npc);
      this.physics.add.collider(player, npc);
    }
    this.physics.add.collider(player, walls);
    const dialogueElement = document.getElementById('dialogue');
    if (!dialogueElement) {
      throw new Error('Dialogue box element not found');
    }
    this.dialogueBox = new DialogueBox(dialogueElement);

    // 通常シーンは、カメラを SCALE 倍ズームして論理解像度(320×240)の世界を映す
    const camera = this.cameras.main;
    camera.setZoom(SCALE);
    camera.setBounds(0, 0, worldW, worldH);
    camera.startFollow(player, true, 1, 1, 0, CHARACTER_HEIGHT / 2);
  }

  override update(): void {
    const player = this.getPlayer();
    const input = this.getInput();
    if (this.eventRunner.isRunning()) {
      player.move({ x: 0, y: 0 });
      player.updateDepth();
      if (input.justPressed('confirm')) this.advanceEvent();
      return;
    }

    if (input.justPressed('confirm')) {
      this.interactWithNpcAhead();
      if (this.eventRunner.isRunning()) {
        player.move({ x: 0, y: 0 });
        player.updateDepth();
        return;
      }
    }

    player.move(input.getMoveVector());
    player.updateDepth();
  }

  private interactWithNpcAhead(): void {
    const player = this.getPlayer();
    const offset = FACING_OFFSETS[player.getFacing()];
    const targetX = player.x + offset.x * TILE_SIZE;
    const targetY = player.y + offset.y * TILE_SIZE;
    const npc = this.npcs.find(
      (candidate) =>
        Math.abs(candidate.x - targetX) <= (TILE_SIZE + PLAYER_BODY_WIDTH) / 2 &&
        Math.abs(candidate.y - targetY) <= TILE_SIZE / 2,
    );
    if (!npc) return;

    this.showCommand(this.eventRunner.start(npc.eventId));
  }

  private advanceEvent(): void {
    const command = this.eventRunner.advance();
    if (command) {
      this.showCommand(command);
    } else {
      this.getDialogueBox().hide();
    }
  }

  private showCommand(command: SayCommand): void {
    const text = JAPANESE_TEXTS.get(command.textId);
    if (text === undefined) {
      throw new Error(`Japanese text "${command.textId}" was not found`);
    }
    this.getDialogueBox().show(text);
  }

  private getDialogueBox(): DialogueBox {
    if (!this.dialogueBox) {
      throw new Error('Dialogue box has not been created');
    }
    return this.dialogueBox;
  }

  private getPlayer(): Player {
    if (!this.player) {
      throw new Error('Player has not been created');
    }
    return this.player;
  }

  private getInput(): InputSystem {
    if (!this.input$) {
      throw new Error('Input system has not been initialized');
    }
    return this.input$;
  }
}
