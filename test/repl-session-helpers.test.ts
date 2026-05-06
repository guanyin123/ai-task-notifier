import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { isMissingResumeSessionError } from '../src/claude/run-prompt.js';
import {
  handleReplCommand,
  HELP_LINES,
  reportNotificationFailure,
  runPromptWithSessionRecovery
} from '../src/app/repl.js';

const clearStoredSessionStateMock = vi.hoisted(() => vi.fn());

vi.mock('../src/state/session-store.js', () => ({
  clearStoredSessionState: clearStoredSessionStateMock,
  loadStoredSessionState: vi.fn(),
  saveStoredSessionState: vi.fn()
}));

describe('resume session errors', () => {
  it('detects stale session resume failures', () => {
    expect(
      isMissingResumeSessionError(
        'No conversation found with session ID: 00000000-0000-0000-0000-000000000000'
      )
    ).toBe(true);
  });

  it('ignores unrelated errors', () => {
    expect(isMissingResumeSessionError('network timeout')).toBe(false);
  });
});

describe('notification failure reporting', () => {
  it('does not throw when formatting a notification warning', () => {
    expect(() => reportNotificationFailure(new Error('osascript failed'))).not.toThrow();
  });
});

describe('REPL commands', () => {
  const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

  beforeEach(() => {
    clearStoredSessionStateMock.mockReset();
    consoleLogSpy.mockClear();
  });

  afterEach(() => {
    consoleLogSpy.mockReset();
  });

  it('prints help for /help', () => {
    const result = handleReplCommand('/help', 'session-1');

    expect(result).toEqual({ type: 'continue', currentSessionId: 'session-1' });
    expect(consoleLogSpy).toHaveBeenCalledWith(HELP_LINES.join('\n'));
  });

  it('clears the current session for /clear', () => {
    const result = handleReplCommand('/clear', 'session-1');

    expect(result).toEqual({ type: 'continue', currentSessionId: undefined });
    expect(clearStoredSessionStateMock).toHaveBeenCalledTimes(1);
  });
});

describe('stale session recovery', () => {
  beforeEach(() => {
    clearStoredSessionStateMock.mockReset();
  });

  it('clears the stale session and retries without resume session id', async () => {
    const onStaleSession = vi.fn();
    const executePrompt = vi
      .fn()
      .mockRejectedValueOnce(
        new Error('No conversation found with session ID: 00000000-0000-0000-0000-000000000000')
      )
      .mockResolvedValueOnce({
        visibleText: 'OK',
        durationMs: 1000,
        exitCode: 0,
        sessionId: 'new-session-id'
      });

    const result = await runPromptWithSessionRecovery({
      currentSessionId: 'stale-session-id',
      executePrompt,
      onStaleSession
    });

    expect(onStaleSession).toHaveBeenCalledTimes(1);
    expect(clearStoredSessionStateMock).toHaveBeenCalledTimes(1);
    expect(executePrompt).toHaveBeenNthCalledWith(1, 'stale-session-id');
    expect(executePrompt).toHaveBeenNthCalledWith(2);
    expect(result).toEqual({
      result: {
        visibleText: 'OK',
        durationMs: 1000,
        exitCode: 0,
        sessionId: 'new-session-id'
      },
      currentSessionId: 'new-session-id',
      recovered: true
    });
  });

  it('clears in-memory stale session state before retrying, even if the retry fails', async () => {
    const onStaleSession = vi.fn();
    const executePrompt = vi
      .fn()
      .mockRejectedValueOnce(
        new Error('No conversation found with session ID: 00000000-0000-0000-0000-000000000000')
      )
      .mockRejectedValueOnce(new Error('network timeout'));

    await expect(
      runPromptWithSessionRecovery({
        currentSessionId: 'stale-session-id',
        executePrompt,
        onStaleSession
      })
    ).rejects.toThrow('network timeout');

    expect(onStaleSession).toHaveBeenCalledTimes(1);
    expect(clearStoredSessionStateMock).toHaveBeenCalledTimes(1);
    expect(executePrompt).toHaveBeenNthCalledWith(1, 'stale-session-id');
    expect(executePrompt).toHaveBeenNthCalledWith(2);
  });
});
