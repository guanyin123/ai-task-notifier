import type { AppConfig } from './schema.js';

export const DEFAULT_APP_CONFIG: AppConfig = {
  notifications: {
    enabled: true,
    sound: 'Glass',
    includePreview: true,
    previewLength: 32,
    minReplySeconds: 0,
    notifyOnlyWhenAppInBackground: false
  }
};
