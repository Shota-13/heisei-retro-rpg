export interface SayCommand {
  readonly type: 'say';
  readonly textId: string;
}

export interface InputCommand {
  readonly type: 'input';
  readonly inputId: string;
  readonly textId: string;
}

export type EventCommand = SayCommand | InputCommand;

export interface EventDefinition {
  readonly id: string;
  readonly commands: readonly EventCommand[];
}

export class EventRunner {
  private readonly eventsById: ReadonlyMap<string, EventDefinition>;
  private currentEvent: EventDefinition | null = null;
  private commandIndex = 0;

  constructor(rawEvents: unknown) {
    this.eventsById = parseEvents(rawEvents);
  }

  start(eventId: string): EventCommand {
    if (this.isRunning()) {
      throw new Error(`Cannot start event "${eventId}" while another event is running`);
    }

    const event = this.eventsById.get(eventId);
    if (!event) {
      throw new Error(`Event "${eventId}" was not found`);
    }

    this.currentEvent = event;
    this.commandIndex = 0;
    const command = this.advance();
    if (!command) {
      throw new Error(`Event "${eventId}" has no commands`);
    }
    return command;
  }

  advance(): EventCommand | null {
    if (!this.currentEvent) return null;

    const command = this.currentEvent.commands[this.commandIndex];
    if (command) {
      this.commandIndex += 1;
      return command;
    }

    this.currentEvent = null;
    this.commandIndex = 0;
    return null;
  }

  isRunning(): boolean {
    return this.currentEvent !== null;
  }
}

function parseEvents(rawEvents: unknown): ReadonlyMap<string, EventDefinition> {
  if (!isUnknownArray(rawEvents)) {
    throw new Error('Event data must be an array');
  }

  const eventsById = new Map<string, EventDefinition>();
  for (const [eventIndex, rawEvent] of rawEvents.entries()) {
    if (!isRecord(rawEvent) || typeof rawEvent.id !== 'string' || !rawEvent.id.trim()) {
      throw new Error(`Event at index ${eventIndex} must have a non-empty id`);
    }
    if (!isUnknownArray(rawEvent.commands) || rawEvent.commands.length === 0) {
      throw new Error(`Event "${rawEvent.id}" must have at least one command`);
    }
    if (eventsById.has(rawEvent.id)) {
      throw new Error(`Event id "${rawEvent.id}" is duplicated`);
    }

    const commands: EventCommand[] = [];
    for (const [commandIndex, rawCommand] of rawEvent.commands.entries()) {
      if (!isRecord(rawCommand) || typeof rawCommand.textId !== 'string' || !rawCommand.textId.trim()) {
        throw new Error(`Command ${commandIndex} in event "${rawEvent.id}" is invalid`);
      }

      if (rawCommand.type === 'say') {
        commands.push({ type: 'say', textId: rawCommand.textId });
      } else if (
        rawCommand.type === 'input' &&
        typeof rawCommand.inputId === 'string' &&
        rawCommand.inputId.trim()
      ) {
        commands.push({
          type: 'input',
          inputId: rawCommand.inputId,
          textId: rawCommand.textId,
        });
      } else {
        throw new Error(`Command ${commandIndex} in event "${rawEvent.id}" is invalid`);
      }
    }

    eventsById.set(rawEvent.id, { id: rawEvent.id, commands });
  }

  return eventsById;
}

function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
