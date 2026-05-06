type JsonRecord = Record<string, unknown>;

export interface ClaudeMessageContentBlock extends JsonRecord {
  type?: string;
  text?: string;
}

export interface ClaudeMessage extends JsonRecord {
  id?: string;
  role?: string;
  content?: ClaudeMessageContentBlock[];
}

export interface ClaudeStreamEvent extends JsonRecord {
  type?: string;
}

export interface ClaudeOutputEvent extends JsonRecord {
  type: string;
}

export interface ClaudeAssistantEvent extends ClaudeOutputEvent {
  type: 'assistant';
  message: ClaudeMessage;
}

export interface ClaudeStreamEnvelope extends ClaudeOutputEvent {
  type: 'stream_event';
  event: ClaudeStreamEvent;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): JsonRecord | null {
  return isRecord(value) ? value : null;
}

export function parseClaudeStreamLine(line: string): ClaudeOutputEvent | null {
  const trimmed = line.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);

    if (!isRecord(parsed) || typeof parsed.type !== 'string') {
      return null;
    }

    return parsed as ClaudeOutputEvent;
  } catch {
    return null;
  }
}

export function parseClaudeStreamLines(text: string): ClaudeOutputEvent[] {
  return text
    .split(/\r?\n/u)
    .map((line) => parseClaudeStreamLine(line))
    .filter((event): event is ClaudeOutputEvent => event !== null);
}

export function isStreamEnvelope(event: ClaudeOutputEvent): event is ClaudeStreamEnvelope {
  return event.type === 'stream_event' && isRecord(event.event);
}

export function isAssistantEvent(event: ClaudeOutputEvent): event is ClaudeAssistantEvent {
  return event.type === 'assistant' && isRecord(event.message);
}

export function getStreamEventType(event: ClaudeOutputEvent): string | null {
  if (!isStreamEnvelope(event) || typeof event.event.type !== 'string') {
    return null;
  }

  return event.event.type;
}

export function isAssistantMessageStart(event: ClaudeOutputEvent): boolean {
  if (getStreamEventType(event) !== 'message_start' || !isStreamEnvelope(event)) {
    return false;
  }

  const message = asRecord(event.event.message);
  return message?.role === 'assistant';
}

export function isMessageStopEvent(event: ClaudeOutputEvent): boolean {
  return getStreamEventType(event) === 'message_stop';
}

export function getMessageIdFromStart(event: ClaudeOutputEvent): string | undefined {
  if (!isAssistantMessageStart(event) || !isStreamEnvelope(event)) {
    return undefined;
  }

  const message = asRecord(event.event.message);
  return typeof message?.id === 'string' ? message.id : undefined;
}

export function getTextDelta(event: ClaudeOutputEvent): string {
  if (getStreamEventType(event) !== 'content_block_delta' || !isStreamEnvelope(event)) {
    return '';
  }

  const delta = asRecord(event.event.delta);

  if (delta?.type !== 'text_delta' || typeof delta.text !== 'string') {
    return '';
  }

  return delta.text;
}

export function extractVisibleTextFromContent(content: unknown): string {
  if (!Array.isArray(content)) {
    return '';
  }

  const textBlocks = content
    .map((block) => {
      const record = asRecord(block);

      if (record?.type !== 'text' || typeof record.text !== 'string') {
        return '';
      }

      return record.text.trim();
    })
    .filter((value) => value.length > 0);

  return textBlocks.join('\n\n');
}

export function extractVisibleTextFromAssistantEvent(event: ClaudeOutputEvent): string {
  if (!isAssistantEvent(event)) {
    return '';
  }

  return extractVisibleTextFromContent(event.message.content);
}

export function getResultSessionId(event: ClaudeOutputEvent): string | undefined {
  if (event.type !== 'result' || typeof event.session_id !== 'string') {
    return undefined;
  }

  return event.session_id;
}
