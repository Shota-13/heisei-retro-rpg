const RAIN_MESSAGE = 'プレイシテクレテアリガトウ';
const RAIN_FONT_SIZE_PX = 14;
const RAIN_TRAIL_LENGTH = 12;

interface RainColumn {
  y: number;
  readonly speed: number;
  readonly glyphs: string[];
}

export class EndingScreen {
  private readonly context: CanvasRenderingContext2D;
  private readonly columns: RainColumn[] = [];
  private animationFrameId: number | null = null;
  private delayTimerId: number | null = null;
  private width = 0;
  private height = 0;
  private pixelRatio = 1;
  private readonly resizeAbortController = new AbortController();

  constructor(
    private readonly element: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
    private readonly card: HTMLElement,
  ) {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not create ending screen canvas context');
    }
    this.context = context;
    this.hide();
    window.addEventListener('resize', this.resize, { signal: this.resizeAbortController.signal });
  }

  showAfterDelay(delayMs: number): void {
    if (this.delayTimerId !== null || this.animationFrameId !== null) return;

    this.delayTimerId = window.setTimeout(() => {
      this.delayTimerId = null;
      this.element.hidden = false;
      this.card.hidden = false;
      this.resize();
      this.animationFrameId = window.requestAnimationFrame(this.animate);
    }, delayMs);
  }

  hide(): void {
    if (this.delayTimerId !== null) {
      window.clearTimeout(this.delayTimerId);
      this.delayTimerId = null;
    }
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.element.hidden = true;
    this.card.hidden = true;
  }

  destroy(): void {
    this.hide();
    this.resizeAbortController.abort();
  }

  private readonly resize = (): void => {
    if (this.element.hidden) return;

    const bounds = this.element.getBoundingClientRect();
    this.width = bounds.width;
    this.height = bounds.height;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * this.pixelRatio);
    this.canvas.height = Math.round(this.height * this.pixelRatio);
    this.context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);

    const columnCount = Math.ceil(this.width / RAIN_FONT_SIZE_PX);
    this.columns.length = 0;
    for (let index = 0; index < columnCount; index += 1) {
      this.columns.push({
        y: Math.random() * -this.height,
        speed: 1 + Math.random() * 2.5,
        glyphs: createGlyphs(),
      });
    }
  };

  private readonly animate = (): void => {
    this.context.fillStyle = 'rgba(3, 10, 7, 0.32)';
    this.context.fillRect(0, 0, this.width, this.height);
    this.context.font = `${RAIN_FONT_SIZE_PX}px monospace`;
    this.context.textAlign = 'center';

    for (let columnIndex = 0; columnIndex < this.columns.length; columnIndex += 1) {
      const column = this.columns[columnIndex];
      for (let trailIndex = 0; trailIndex < RAIN_TRAIL_LENGTH; trailIndex += 1) {
        const glyphY = column.y - trailIndex * RAIN_FONT_SIZE_PX;
        if (glyphY < 0 || glyphY > this.height) continue;

        this.context.fillStyle = trailIndex === 0 ? '#d5ffe0' : `rgba(0, 255, 100, ${1 - trailIndex / RAIN_TRAIL_LENGTH})`;
        this.context.fillText(
          column.glyphs[trailIndex],
          columnIndex * RAIN_FONT_SIZE_PX + RAIN_FONT_SIZE_PX / 2,
          glyphY,
        );
      }

      column.y += column.speed;
      if (column.y - RAIN_TRAIL_LENGTH * RAIN_FONT_SIZE_PX > this.height) {
        column.y = -Math.random() * this.height * 0.5;
        column.glyphs.splice(0, column.glyphs.length, ...createGlyphs());
      }
    }

    this.animationFrameId = window.requestAnimationFrame(this.animate);
  }
}

function createGlyphs(): string[] {
  const characters = Array.from(RAIN_MESSAGE);
  const startIndex = Math.floor(Math.random() * characters.length);
  return Array.from({ length: RAIN_TRAIL_LENGTH }, (_, trailIndex) => {
    const messageIndex = (startIndex - trailIndex + characters.length) % characters.length;
    return characters[messageIndex];
  });
}
