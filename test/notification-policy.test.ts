import { describe, expect, it } from 'vitest';

import { isCurrentTerminalAppFocused, getLikelyTerminalAppNames } from '../src/notifications/macos-focus.js';
import { shouldSendReplyNotification } from '../src/notifications/policy.js';

describe('notification policy', () => {
  it('suppresses notifications shorter than minReplySeconds', () => {
    expect(
      shouldSendReplyNotification({
        durationMs: 2500,
        minReplySeconds: 3,
        notifyOnlyWhenAppInBackground: false
      })
    ).toBe(false);
  });

  it('suppresses notifications when the app is focused and background-only mode is enabled', () => {
    expect(
      shouldSendReplyNotification({
        durationMs: 5000,
        minReplySeconds: 0,
        notifyOnlyWhenAppInBackground: true,
        isAppFocused: true
      })
    ).toBe(false);
  });

  it('allows notifications when focus cannot be determined', () => {
    expect(
      shouldSendReplyNotification({
        durationMs: 5000,
        minReplySeconds: 0,
        notifyOnlyWhenAppInBackground: true,
        isAppFocused: null
      })
    ).toBe(true);
  });
});

describe('macOS focus helpers', () => {
  it('maps known terminal programs to likely app names', () => {
    expect(getLikelyTerminalAppNames('Apple_Terminal')).toEqual(['Terminal']);
    expect(getLikelyTerminalAppNames('iTerm.app')).toEqual(['iTerm2', 'iTerm']);
  });

  it('matches the frontmost terminal app name', () => {
    expect(isCurrentTerminalAppFocused('Apple_Terminal', 'Terminal')).toBe(true);
    expect(isCurrentTerminalAppFocused('Apple_Terminal', 'Safari')).toBe(false);
    expect(isCurrentTerminalAppFocused(undefined, 'Terminal')).toBeNull();
  });
});
