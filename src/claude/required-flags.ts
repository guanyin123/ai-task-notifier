export const REQUIRED_STREAM_FLAGS = [
  '--print',
  '--input-format',
  '--output-format',
  '--include-partial-messages',
  '--include-hook-events'
] as const;

export function detectMissingFlags(helpText: string): string[] {
  return REQUIRED_STREAM_FLAGS.filter((flag) => !helpText.includes(flag));
}

export function hasRequiredStreamFlags(helpText: string): boolean {
  return detectMissingFlags(helpText).length === 0;
}
