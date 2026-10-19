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
import { EventRunner, type EventCommand } from '../core/EventRunner';
import { getPlayerName, savePlayerName } from '../core/playerName';
import { Npc } from '../entities/Npc';
import { Player } from '../entities/Player';
import type { Facing } from '../entities/facing';
import fieldNpcEvents from '../data/events/field_npcs.json';
import japaneseTexts from '../data/text/ja.json';
import type { InputSystem } from '../systems/InputSystem';
import { DialogueBox } from '../ui/DialogueBox';
import { EndingScreen } from '../ui/EndingScreen';

const MAP_TILES_W = 40;
const MAP_TILES_H = 30;
const WAKE_TO_BLINK_DELAY_MS = 1000;
const PLAYER_BLINK_CLOSED_MS = 140;
const PLAYER_BLINK_OPEN_MS = 180;
const JAPANESE_TEXTS = new Map(Object.entries(japaneseTexts));

/** 仮の壁。[タイルX, タイルY, 幅(タイル), 高さ(タイル)]。Tiled の読み込みができたら不要になる。 */
const WALLS: ReadonlyArray<readonly [number, number, number, number]> = [
  [8, 4, 1, 8],
  [8, 4, 10, 1],
  [20, 12, 4, 4],
  [4, 18, 12, 1],
  [28, 6, 1, 14],
];

const PLAYER_START_TILE = { x: 4, y: 4 } as const;

const NPC_PLACEMENTS = [
  {
    tileX: 4,
    tileY: 7,
    textureKey: TEXTURE_KEYS.npc.blue,
    eventId: 'event.field.npc.blue',
    speakerName: 'モーフィア',
  },
  {
    tileX: 11,
    tileY: 10,
    textureKey: TEXTURE_KEYS.npc.red,
    eventId: 'event.field.npc.red',
    speakerName: 'トロニティ',
  },
  {
    tileX: 15,
    tileY: 6,
    textureKey: TEXTURE_KEYS.npc.green,
    eventId: 'event.field.npc.green',
    speakerName: 'カイ',
  },
  {
    tileX: 23,
    tileY: 22,
    textureKey: TEXTURE_KEYS.npc.yellow,
    eventId: 'event.field.npc.yellow',
    speakerName: 'セラフィ',
  },
  {
    tileX: 11,
    tileY: 15,
    textureKey: TEXTURE_KEYS.npc.purple,
    eventId: 'event.field.npc.purple',
    speakerName: 'ノヴァ',
  },
  {
    tileX: 17,
    tileY: 20,
    textureKey: TEXTURE_KEYS.npc.cyan,
    eventId: 'event.field.npc.cyan',
    speakerName: 'アリス',
  },
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
  private readonly talkedToNpcEventIds = new Set<string>();
  private dialogueBox: DialogueBox | null = null;
  private endingScreen: EndingScreen | null = null;
  private wakeOverlay: HTMLElement | null = null;
  private currentSpeakerName: string | null = null;
  private canControlPlayer = false;
  private hasFinished = false;
  private hasOpenedWakeScreen = false;
  private hasFinishedWakeBlink = false;

  constructor() {
    super(SCENE_KEYS.field);
  }

  create(): void {
    const input = getServices().input;
    this.input$ = input;
    input.clearPressed();
    this.talkedToNpcEventIds.clear();
    this.hasFinished = false;
    this.canControlPlayer = false;
    this.hasOpenedWakeScreen = false;
    this.hasFinishedWakeBlink = false;

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
    const speakerElement = document.getElementById('dialogue-speaker');
    const textElement = document.getElementById('dialogue-text');
    const nameInputForm = document.getElementById('dialogue-name-form');
    const nameInput = document.getElementById('dialogue-name-input');
    if (
      !dialogueElement ||
      !speakerElement ||
      !textElement ||
      !(nameInputForm instanceof HTMLFormElement) ||
      !(nameInput instanceof HTMLInputElement)
    ) {
      throw new Error('Dialogue box elements not found');
    }
    this.dialogueBox = new DialogueBox(
      dialogueElement,
      speakerElement,
      textElement,
      nameInputForm,
      nameInput,
      () => this.submitPlayerName(),
    );
    const endingElement = document.getElementById('game-ending');
    if (!endingElement) {
      throw new Error('Game ending element not found');
    }
    const endingCanvas = endingElement.querySelector('canvas');
    const endingCard = endingElement.querySelector('.game-ending-card');
    if (!(endingCanvas instanceof HTMLCanvasElement) || !(endingCard instanceof HTMLElement)) {
      throw new Error('Game ending elements not found');
    }
    this.endingScreen?.destroy();
    this.endingScreen = new EndingScreen(endingElement, endingCanvas, endingCard);
    const wakeOverlay = document.getElementById('wake-overlay');
    if (!(wakeOverlay instanceof HTMLElement)) {
      throw new Error('Wake-up overlay not found');
    }
    this.wakeOverlay = wakeOverlay;
    this.wakeOverlay.addEventListener('animationend', this.handleWakeAnimationEnd);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.dialogueBox?.destroy());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.endingScreen?.destroy());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.wakeOverlay?.removeEventListener('animationend', this.handleWakeAnimationEnd);
    });

    // 通常シーンは、カメラを SCALE 倍ズームして論理解像度(320×240)の世界を映す
    const camera = this.cameras.main;
    camera.setZoom(SCALE);
    camera.setBounds(0, 0, worldW, worldH);
    camera.startFollow(player, true, 1, 1, 0, CHARACTER_HEIGHT / 2);
    this.openWakeScreen();
  }

  override update(): void {
    const player = this.getPlayer();
    const input = this.getInput();
    if (!this.canControlPlayer || this.hasFinished) {
      player.move({ x: 0, y: 0 });
      player.updateDepth();
      return;
    }

    if (this.eventRunner.isRunning()) {
      player.move({ x: 0, y: 0 });
      player.updateDepth();
      if (input.justPressed('confirm')) {
        if (this.getDialogueBox().isNameInputVisible()) {
          this.submitPlayerName();
        } else {
          this.advanceEvent();
        }
      }
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

  private playWakeUpBlink(player: Player): void {
    player.setEyesClosed(true);
    this.time.delayedCall(PLAYER_BLINK_CLOSED_MS, () => {
      player.setEyesClosed(false);
      this.time.delayedCall(PLAYER_BLINK_OPEN_MS, () => {
        player.setEyesClosed(true);
        this.time.delayedCall(PLAYER_BLINK_CLOSED_MS, () => {
          player.setEyesClosed(false);
          this.hasFinishedWakeBlink = true;
          this.enablePlayerAfterWakeUp();
        });
      });
    });
  }

  private openWakeScreen(): void {
    const wakeOverlay = this.wakeOverlay;
    if (!wakeOverlay) {
      throw new Error('Wake-up overlay has not been created');
    }
    wakeOverlay.hidden = false;
    document.getElementById('game-frame')?.classList.add('is-waking');
    wakeOverlay.classList.add('is-opening');
  }

  private readonly handleWakeAnimationEnd = (event: AnimationEvent): void => {
    if (event.target !== this.wakeOverlay?.querySelector('.wake-lid-bottom')) return;

    const wakeOverlay = this.wakeOverlay;
    if (!wakeOverlay) return;
    wakeOverlay.hidden = true;
    wakeOverlay.classList.remove('is-opening');
    document.getElementById('game-frame')?.classList.remove('is-waking');
    this.hasOpenedWakeScreen = true;
    this.time.delayedCall(WAKE_TO_BLINK_DELAY_MS, () => this.playWakeUpBlink(this.getPlayer()));
  };

  private enablePlayerAfterWakeUp(): void {
    if (!this.hasOpenedWakeScreen || !this.hasFinishedWakeBlink) return;

    this.getInput().resetAll();
    this.getInput().clearPressed();
    this.canControlPlayer = true;
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

    this.currentSpeakerName = NPC_PLACEMENTS.find(
      (placement) => placement.eventId === npc.eventId,
    )?.speakerName ?? null;
    if (!this.currentSpeakerName) {
      throw new Error(`Speaker name for event "${npc.eventId}" was not found`);
    }
    this.talkedToNpcEventIds.add(npc.eventId);
    this.showCommand(this.eventRunner.start(npc.eventId));
  }

  private advanceEvent(): void {
    const command = this.eventRunner.advance();
    if (command) {
      this.showCommand(command);
    } else {
      this.getDialogueBox().hide();
      this.currentSpeakerName = null;
      if (this.talkedToNpcEventIds.size === NPC_PLACEMENTS.length) {
        this.finishGame();
      }
    }
  }

  private finishGame(): void {
    this.hasFinished = true;
    this.canControlPlayer = false;
    this.getInput().resetAll();
    this.getInput().clearPressed();
    this.getEndingScreen().showAfterDelay(2000);
  }

  private showCommand(command: EventCommand): void {
    if (!this.currentSpeakerName) {
      throw new Error('Speaker name has not been set');
    }

    if (command.type === 'input') {
      if (command.inputId !== 'playerName') {
        throw new Error(`Input "${command.inputId}" is not supported`);
      }
      const existingName = getPlayerName();
      if (existingName) {
        this.advanceEvent();
        return;
      }
      const prompt = JAPANESE_TEXTS.get(command.textId);
      if (prompt === undefined) {
        throw new Error(`Japanese text "${command.textId}" was not found`);
      }
      this.getDialogueBox().showNameInput(this.currentSpeakerName, prompt, '');
      return;
    }

    const japaneseText = JAPANESE_TEXTS.get(command.textId);
    if (japaneseText === undefined) {
      throw new Error(`Japanese text "${command.textId}" was not found`);
    }
    const playerName = getPlayerName();
    const text = japaneseText
      .split('{playerNameWithHonorific}')
      .join(playerName ? `${playerName}さん` : '君')
      .split('{playerName}')
      .join(playerName ?? '君');
    this.getDialogueBox().show(this.currentSpeakerName, text);
  }

  private submitPlayerName(): void {
    const dialogueBox = this.getDialogueBox();
    if (!dialogueBox.isNameInputVisible()) return;

    const enteredName = dialogueBox.getEnteredName().trim();
    if (!enteredName) {
      dialogueBox.focusNameInput();
      return;
    }

    savePlayerName(enteredName);
    this.advanceEvent();
  }

  private getDialogueBox(): DialogueBox {
    if (!this.dialogueBox) {
      throw new Error('Dialogue box has not been created');
    }
    return this.dialogueBox;
  }

  private getEndingScreen(): EndingScreen {
    if (!this.endingScreen) {
      throw new Error('Game ending screen has not been created');
    }
    return this.endingScreen;
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
