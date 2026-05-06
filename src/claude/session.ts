import {
  extractVisibleTextFromAssistantEvent,
  getMessageIdFromStart,
  getTextDelta,
  isAssistantEvent,
  isAssistantMessageStart,
  isMessageStopEvent,
  type ClaudeOutputEvent
} from './parser.js';

export type ConversationPhase = 'idle' | 'streaming' | 'done' | 'error';

export interface CurrentAssistantMessage {
  turnId: number;
  messageId?: string;
  textChunks: string[];
  hasVisibleText: boolean;
  sawMessageStop: boolean;
}

export interface SessionSnapshot {
  turnId: number;
  phase: ConversationPhase;
  notifiedTurnIds: number[];
  currentAssistantMessage: CurrentAssistantMessage | null;
}

export interface SessionUpdate {
  shouldNotify: boolean;
  turnId: number | null;
  visibleText: string;
  reason: 'message_stop' | null;
}

function hasVisibleText(text: string): boolean {
  return text.trim().length > 0;
}

export class ClaudeSessionTracker {
  private turnId = 0;

  private phase: ConversationPhase = 'idle';

  private notifiedTurnIds = new Set<number>();

  private currentAssistantMessage: CurrentAssistantMessage | null = null;

  ingest(event: ClaudeOutputEvent): SessionUpdate {
    if (isAssistantMessageStart(event)) {
      this.turnId += 1;
      this.phase = 'streaming';
      this.currentAssistantMessage = {
        turnId: this.turnId,
        messageId: getMessageIdFromStart(event),
        textChunks: [],
        hasVisibleText: false,
        sawMessageStop: false
      };

      return this.noopUpdate();
    }

    const current = this.currentAssistantMessage;

    if (!current) {
      return this.noopUpdate();
    }

    const textDelta = getTextDelta(event);

    if (textDelta.length > 0) {
      current.textChunks.push(textDelta);
      current.hasVisibleText = current.hasVisibleText || hasVisibleText(textDelta);
      return this.noopUpdate();
    }

    if (isAssistantEvent(event)) {
      if (typeof event.message.id === 'string') {
        current.messageId = event.message.id;
      }

      const finalText = extractVisibleTextFromAssistantEvent(event);

      if (finalText.length > 0) {
        current.textChunks = [finalText];
        current.hasVisibleText = true;
      }

      return this.noopUpdate();
    }

    if (isMessageStopEvent(event)) {
      current.sawMessageStop = true;
      this.phase = 'done';

      const visibleText = current.textChunks.join('').trim();
      const shouldNotify =
        current.hasVisibleText && !this.notifiedTurnIds.has(current.turnId);

      if (shouldNotify) {
        this.notifiedTurnIds.add(current.turnId);

        return {
          shouldNotify: true,
          turnId: current.turnId,
          visibleText,
          reason: 'message_stop'
        };
      }
    }

    return this.noopUpdate();
  }

  snapshot(): SessionSnapshot {
    return {
      turnId: this.turnId,
      phase: this.phase,
      notifiedTurnIds: [...this.notifiedTurnIds],
      currentAssistantMessage: this.currentAssistantMessage
        ? {
            ...this.currentAssistantMessage,
            textChunks: [...this.currentAssistantMessage.textChunks]
          }
        : null
    };
  }

  private noopUpdate(): SessionUpdate {
    return {
      shouldNotify: false,
      turnId: null,
      visibleText: '',
      reason: null
    };
  }
}
