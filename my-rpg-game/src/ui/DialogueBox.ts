export class DialogueBox {
  private readonly abortController = new AbortController();

  constructor(
    private readonly element: HTMLElement,
    private readonly speakerElement: HTMLElement,
    private readonly textElement: HTMLElement,
    private readonly nameInputForm: HTMLFormElement,
    private readonly nameInput: HTMLInputElement,
    onNameSubmit: () => void,
  ) {
    this.nameInputForm.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();
        onNameSubmit();
      },
      { signal: this.abortController.signal },
    );
    this.hide();
  }

  show(speakerName: string, text: string): void {
    this.speakerElement.textContent = speakerName;
    this.textElement.textContent = text;
    this.nameInputForm.hidden = true;
    this.element.hidden = false;
  }

  showNameInput(speakerName: string, prompt: string, currentName: string): void {
    this.speakerElement.textContent = speakerName;
    this.textElement.textContent = prompt;
    this.nameInput.value = currentName;
    this.nameInputForm.hidden = false;
    this.element.hidden = false;
    this.nameInput.focus();
  }

  isNameInputVisible(): boolean {
    return !this.nameInputForm.hidden;
  }

  getEnteredName(): string {
    return this.nameInput.value;
  }

  focusNameInput(): void {
    this.nameInput.focus();
  }

  hide(): void {
    this.speakerElement.textContent = '';
    this.textElement.textContent = '';
    this.nameInputForm.hidden = true;
    this.element.hidden = true;
  }

  destroy(): void {
    this.abortController.abort();
  }
}
