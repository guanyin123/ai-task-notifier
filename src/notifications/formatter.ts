export interface ReplyNotificationFormatOptions {
  visibleText: string;
  previewLength?: number;
  durationMs?: number;
  includePreview?: boolean;
}

export interface NotificationPayload {
  title: string;
  body: string;
  sound: string;
}

export const DEFAULT_NOTIFICATION_TITLE = 'Claude Code';
export const DEFAULT_NOTIFICATION_BODY = '本轮回复已完成';
export const DEFAULT_NOTIFICATION_SOUND = 'Glass';
export const DEFAULT_NOTIFICATION_PREVIEW_LENGTH = 32;

export function compactWhitespace(text: string): string {
  return text.replace(/\s+/gu, ' ').trim();
}

export function buildPreview(
  text: string,
  previewLength = DEFAULT_NOTIFICATION_PREVIEW_LENGTH
): string {
  const compactText = compactWhitespace(text);

  if (compactText.length <= previewLength) {
    return compactText;
  }

  return `${compactText.slice(0, previewLength).trimEnd()}...`;
}

export function formatReplyCompleteNotification(
  options: ReplyNotificationFormatOptions & { sound?: string }
): NotificationPayload {
  const previewLength = options.previewLength ?? DEFAULT_NOTIFICATION_PREVIEW_LENGTH;
  const includePreview = options.includePreview ?? true;
  const parts = [DEFAULT_NOTIFICATION_BODY];

  if (typeof options.durationMs === 'number' && options.durationMs >= 1000) {
    parts[0] = `${parts[0]} (${Math.round(options.durationMs / 1000)}s)`;
  }

  if (includePreview) {
    const preview = buildPreview(options.visibleText, previewLength);

    if (preview.length > 0) {
      parts.push(`已完成: ${preview}`);
    }
  }

  return {
    title: DEFAULT_NOTIFICATION_TITLE,
    body: parts.join('\n'),
    sound: options.sound ?? DEFAULT_NOTIFICATION_SOUND
  };
}
