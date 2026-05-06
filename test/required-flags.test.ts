import { describe, expect, it } from 'vitest';

import {
  detectMissingFlags,
  hasRequiredStreamFlags,
  REQUIRED_STREAM_FLAGS
} from '../src/claude/required-flags.js';

describe('Claude stream flag detection', () => {
  it('accepts help text that includes every required flag', () => {
    const helpText = REQUIRED_STREAM_FLAGS.join('\n');

    expect(hasRequiredStreamFlags(helpText)).toBe(true);
    expect(detectMissingFlags(helpText)).toEqual([]);
  });

  it('reports the missing flags', () => {
    const helpText = '--print\n--output-format';

    expect(hasRequiredStreamFlags(helpText)).toBe(false);
    expect(detectMissingFlags(helpText)).toEqual([
      '--input-format',
      '--include-partial-messages',
      '--include-hook-events'
    ]);
  });
});
