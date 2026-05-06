import { z } from 'zod';

export const appConfigSchema = z.object({
  notifications: z.object({
    enabled: z.boolean().default(true),
    sound: z.string().min(1).default('Glass'),
    includePreview: z.boolean().default(true),
    previewLength: z.number().int().min(8).max(120).default(32),
    minReplySeconds: z.number().int().min(0).max(3600).default(0),
    notifyOnlyWhenAppInBackground: z.boolean().default(false)
  })
});

export type AppConfig = z.infer<typeof appConfigSchema>;
