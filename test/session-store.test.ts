import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  clearStoredSessionState,
  getSessionStorePath,
  loadStoredSessionState,
  saveStoredSessionState
} from '../src/state/session-store.js';

describe('session store', () => {
  it('saves and loads a session id in the project-local store', () => {
    const cwd = mkdtempSync(path.join(tmpdir(), 'ai-task-notifier-'));
    const sessionId = '123e4567-e89b-12d3-a456-426614174000';

    saveStoredSessionState(sessionId, cwd);

    const stored = loadStoredSessionState(cwd);

    expect(stored).toMatchObject({
      version: 1,
      currentSessionId: sessionId
    });
    expect(readFileSync(getSessionStorePath(cwd), 'utf8')).toContain(sessionId);
  });

  it('clears the stored session state', () => {
    const cwd = mkdtempSync(path.join(tmpdir(), 'ai-task-notifier-'));
    const sessionId = '123e4567-e89b-12d3-a456-426614174000';

    saveStoredSessionState(sessionId, cwd);
    clearStoredSessionState(cwd);

    expect(loadStoredSessionState(cwd)).toBeNull();
  });
});
