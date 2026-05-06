import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { DEFAULT_APP_CONFIG } from '../src/config/defaults.js';
import { getDefaultConfigPath, loadAppConfig } from '../src/config/load.js';

describe('config loading', () => {
  it('returns defaults when the config file does not exist', () => {
    const tempHome = mkdtempSync(path.join(tmpdir(), 'ai-task-notifier-home-'));

    expect(loadAppConfig(getDefaultConfigPath(tempHome))).toEqual(DEFAULT_APP_CONFIG);
  });

  it('merges file values with defaults', () => {
    const tempHome = mkdtempSync(path.join(tmpdir(), 'ai-task-notifier-home-'));
    const configPath = getDefaultConfigPath(tempHome);

    mkdirSync(path.dirname(configPath), { recursive: true });
    writeFileSync(
      configPath,
      JSON.stringify({
        notifications: {
          enabled: false,
          previewLength: 20
        }
      })
    );

    expect(loadAppConfig(configPath)).toEqual({
      notifications: {
        enabled: false,
        sound: 'Glass',
        includePreview: true,
        previewLength: 20,
        minReplySeconds: 0,
        notifyOnlyWhenAppInBackground: false
      }
    });
  });

  it('throws a helpful error for invalid config content', () => {
    const tempHome = mkdtempSync(path.join(tmpdir(), 'ai-task-notifier-home-'));
    const configPath = getDefaultConfigPath(tempHome);

    mkdirSync(path.dirname(configPath), { recursive: true });
    writeFileSync(
      configPath,
      JSON.stringify({
        notifications: {
          previewLength: 3
        }
      })
    );

    expect(() => loadAppConfig(configPath)).toThrow(`Invalid config file at ${configPath}`);
  });
});
