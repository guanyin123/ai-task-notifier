import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { z } from 'zod';

import { DEFAULT_APP_CONFIG } from './defaults.js';
import { appConfigSchema, type AppConfig } from './schema.js';

export function getDefaultConfigPath(homeDirectory = os.homedir()): string {
  return path.join(homeDirectory, '.config', 'ai-task-notifier', 'config.json');
}

function mergeConfig(input: unknown): AppConfig {
  const parsed = appConfigSchema.partial().parse(input);

  return {
    notifications: {
      ...DEFAULT_APP_CONFIG.notifications,
      ...parsed.notifications
    }
  };
}

export function loadAppConfig(configPath = getDefaultConfigPath()): AppConfig {
  try {
    const raw = readFileSync(configPath, 'utf8');
    return mergeConfig(JSON.parse(raw));
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error.code === 'ENOENT' || error.code === 'ENOTDIR')
    ) {
      return DEFAULT_APP_CONFIG;
    }

    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      throw new Error(`Invalid config file at ${configPath}: ${error.message}`);
    }

    throw error;
  }
}
