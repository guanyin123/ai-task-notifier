import { EventEmitter } from 'node:events';

import { describe, expect, it } from 'vitest';

import { getResultSessionId, parseClaudeStreamLine } from '../src/claude/parser.js';
import {
  buildClaudePromptArgs,
  waitForChildExit,
  type ChildExitAwaitable
} from '../src/claude/run-prompt.js';

class FakeChild extends EventEmitter implements ChildExitAwaitable {}

describe('run prompt helpers', () => {
  it('builds default Claude args for a fresh prompt', () => {
    expect(buildClaudePromptArgs({ prompt: 'hello' })).toEqual([
      '-p',
      '--verbose',
      '--output-format',
      'stream-json',
      '--include-partial-messages',
      '--include-hook-events',
      'hello'
    ]);
  });

  it('builds resume args when a session id is provided', () => {
    expect(buildClaudePromptArgs({ prompt: 'hello', resumeSessionId: 'session-123' })).toEqual([
      '-p',
      '--resume',
      'session-123',
      '--verbose',
      '--output-format',
      'stream-json',
      '--include-partial-messages',
      '--include-hook-events',
      'hello'
    ]);
  });

  it('extracts the result session id from a result event', () => {
    const event = parseClaudeStreamLine(
      '{"type":"result","subtype":"success","session_id":"session-abc"}'
    );

    expect(event).not.toBeNull();
    expect(getResultSessionId(event!)).toBe('session-abc');
  });

  it('resolves when the child process closes', async () => {
    const child = new FakeChild();
    const pending = waitForChildExit(child);

    child.emit('close', 0);

    await expect(pending).resolves.toBe(0);
  });

  it('rejects when the child process emits an error', async () => {
    const child = new FakeChild();
    const pending = waitForChildExit(child);
    const error = new Error('spawn claude ENOENT');

    child.emit('error', error);

    await expect(pending).rejects.toThrow('spawn claude ENOENT');
  });
});
