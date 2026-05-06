import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { z } from 'zod';

const SESSION_STORE_DIR = '.ai-task-notifier';
const SESSION_STORE_FILE = 'session.json';

const sessionStoreSchema = z.object({
  version: z.literal(1),
  currentSessionId: z.string().uuid(),
  updatedAt: z.string()
});

export interface StoredSessionState {
  version: 1;
  currentSessionId: string;
  updatedAt: string;
}

export function getSessionStorePath(cwd = process.cwd()): string {
  return path.join(cwd, SESSION_STORE_DIR, SESSION_STORE_FILE);
}

export function loadStoredSessionState(cwd = process.cwd()): StoredSessionState | null {
  const filePath = getSessionStorePath(cwd);

  try {
    const raw = readFileSync(filePath, 'utf8');
    return sessionStoreSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveStoredSessionState(currentSessionId: string, cwd = process.cwd()): void {
  const filePath = getSessionStorePath(cwd);
  const directory = path.dirname(filePath);

  mkdirSync(directory, { recursive: true });
  writeFileSync(
    filePath,
    JSON.stringify(
      {
        version: 1,
        currentSessionId,
        updatedAt: new Date().toISOString()
      } satisfies StoredSessionState,
      null,
      2
    )
  );
}

export function clearStoredSessionState(cwd = process.cwd()): void {
  rmSync(getSessionStorePath(cwd), { force: true });
}
