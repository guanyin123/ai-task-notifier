import { describe, expect, it } from 'vitest';

import {
  buildPreview,
  compactWhitespace,
  formatReplyCompleteNotification
} from '../src/notifications/formatter.js';

describe('notification formatter', () => {
  it('compacts whitespace before building preview', () => {
    expect(compactWhitespace('  hello \n\n world  ')).toBe('hello world');
  });

  it('truncates long previews', () => {
    expect(buildPreview('abcdefghijklmnopqrstuvwxyz', 10)).toBe('abcdefghij...');
  });

  it('formats reply complete payload with preview and duration', () => {
    expect(
      formatReplyCompleteNotification({
        visibleText: '  stream-json parser is stable now  ',
        durationMs: 4200,
        sound: 'Ping'
      })
    ).toEqual({
      title: 'Claude Code',
      body: '本轮回复已完成 (4s)\n已完成: stream-json parser is stable now',
      sound: 'Ping'
    });
  });
});
