import { spawnSync } from 'node:child_process';

import type { NotificationPayload } from './formatter.js';

function escapeAppleScriptString(value: string): string {
  return value.replace(/\\/gu, '\\\\').replace(/"/gu, '\\"');
}

export function sendMacOsNotification(payload: NotificationPayload): void {
  const body = escapeAppleScriptString(payload.body);
  const title = escapeAppleScriptString(payload.title);
  const sound = escapeAppleScriptString(payload.sound);
  const script = `display notification "${body}" with title "${title}" sound name "${sound}"`;
  const result = spawnSync('osascript', ['-e', script], {
    encoding: 'utf8'
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = result.stderr.trim();
    throw new Error(stderr || `osascript exited with status ${result.status}`);
  }
}
