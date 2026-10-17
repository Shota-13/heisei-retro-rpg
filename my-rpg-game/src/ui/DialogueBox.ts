export class DialogueBox {
  constructor(private readonly element: HTMLElement) {
    this.hide();
  }

  show(text: string): void {
    this.element.textContent = text;
    this.element.hidden = false;
  }

  hide(): void {
    this.element.textContent = '';
    this.element.hidden = true;
  }
}
