import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseClaudeStreamLines } from '../src/claude/parser.js';
import { ClaudeSessionTracker } from '../src/claude/session.js';

const fixturePath = path.resolve(process.cwd(), 'test/fixtures/ok-stream.jsonl');

describe('Claude session tracker', () => {
  it('notifies only when an assistant text message reaches message_stop', () => {
    const fixture = readFileSync(fixturePath, 'utf8');
    const events = parseClaudeStreamLines(fixture);
    const tracker = new ClaudeSessionTracker();

    const notifications = events
      .map((event) => tracker.ingest(event))
      .filter((update) => update.shouldNotify);

    expect(notifications).toEqual([
      {
        shouldNotify: true,
        turnId: 2,
        visibleText: 'OK',
        reason: 'message_stop'
      }
    ]);

    expect(tracker.snapshot()).toMatchObject({
      turnId: 2,
      phase: 'done',
      notifiedTurnIds: [2],
      currentAssistantMessage: {
        turnId: 2,
        messageId: 'msg_text',
        hasVisibleText: true,
        sawMessageStop: true,
        textChunks: ['OK']
      }
    });
  });
});
