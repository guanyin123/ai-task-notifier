import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  extractVisibleTextFromAssistantEvent,
  getStreamEventType,
  getTextDelta,
  parseClaudeStreamLine,
  parseClaudeStreamLines
} from '../src/claude/parser.js';

const fixturePath = path.resolve(process.cwd(), 'test/fixtures/ok-stream.jsonl');

describe('Claude stream parser', () => {
  it('returns null for invalid JSONL lines', () => {
    expect(parseClaudeStreamLine('not json')).toBeNull();
    expect(parseClaudeStreamLine('')).toBeNull();
  });

  it('parses fixture lines and extracts visible text only from text messages', () => {
    const fixture = readFileSync(fixturePath, 'utf8');
    const events = parseClaudeStreamLines(fixture);

    expect(events).toHaveLength(11);
    expect(getStreamEventType(events[1]!)).toBe('message_start');
    expect(getTextDelta(events[7]!)).toBe('OK');

    const visibleTexts = events
      .map((event) => extractVisibleTextFromAssistantEvent(event))
      .filter((text) => text.length > 0);

    expect(visibleTexts).toEqual(['OK']);
  });
});
