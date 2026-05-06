import { spawnSync } from 'node:child_process';
import process from 'node:process';

import {
  extractVisibleTextFromAssistantEvent,
  getStreamEventType,
  parseClaudeStreamLines
} from '../src/claude/parser.js';
import { ClaudeSessionTracker } from '../src/claude/session.js';
import {
  detectMissingFlags,
  REQUIRED_STREAM_FLAGS
} from '../src/claude/required-flags.js';
import { formatReplyCompleteNotification } from '../src/notifications/formatter.js';
import { sendMacOsNotification } from '../src/notifications/macos.js';

function runClaudeCommand(args: string[]): string {
  const result = spawnSync('claude', args, {
    encoding: 'utf8'
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = result.stderr.trim();
    throw new Error(stderr || `claude ${args.join(' ')} exited with status ${result.status}`);
  }

  return result.stdout;
}

function collectArgValue(flag: string): string | undefined {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);

  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

function hasArg(flag: string): boolean {
  return process.argv.slice(2).includes(flag);
}

function runLiveProbe(prompt: string): void {
  const rawOutput = runClaudeCommand([
    '-p',
    '--verbose',
    '--output-format',
    'stream-json',
    '--include-partial-messages',
    '--include-hook-events',
    prompt
  ]);

  const events = parseClaudeStreamLines(rawOutput);
  const topLevelCounts = new Map<string, number>();
  const streamCounts = new Map<string, number>();
  const assistantTexts: string[] = [];
  const tracker = new ClaudeSessionTracker();
  const shouldNotify = hasArg('--notify');
  let notificationCount = 0;

  for (const event of events) {
    topLevelCounts.set(event.type, (topLevelCounts.get(event.type) ?? 0) + 1);

    const streamType = getStreamEventType(event);

    if (streamType) {
      streamCounts.set(streamType, (streamCounts.get(streamType) ?? 0) + 1);
    }

    const visibleText = extractVisibleTextFromAssistantEvent(event);

    if (visibleText.length > 0) {
      assistantTexts.push(visibleText);
    }

    const update = tracker.ingest(event);

    if (shouldNotify && update.shouldNotify) {
      sendMacOsNotification(
        formatReplyCompleteNotification({
          visibleText: update.visibleText
        })
      );
      notificationCount += 1;
    }
  }

  console.log(`Live probe prompt: ${prompt}`);
  console.log(`Parsed events: ${events.length}`);
  console.log(
    `Top-level counts: ${[...topLevelCounts.entries()]
      .map(([key, value]) => `${key}=${value}`)
      .join(', ')}`
  );
  console.log(
    `Stream event counts: ${[...streamCounts.entries()]
      .map(([key, value]) => `${key}=${value}`)
      .join(', ')}`
  );

  if (assistantTexts.length > 0) {
    console.log(`Visible assistant messages: ${assistantTexts.join(' | ')}`);
  }

  if (shouldNotify) {
    console.log(`Notifications sent: ${notificationCount}`);
  }

  if (hasArg('--raw')) {
    console.log('');
    console.log('Raw stream-json output:');
    console.log(rawOutput.trim());
  }
}

function main(): void {
  const version = runClaudeCommand(['--version']).trim();
  const helpText = runClaudeCommand(['--help']);
  const missingFlags = detectMissingFlags(helpText);
  const wantsLiveProbe = hasArg('--live');
  const prompt = collectArgValue('--prompt') ?? 'Reply with exactly OK';

  console.log(`Claude Code version: ${version}`);

  if (missingFlags.length > 0) {
    console.error(`Missing required stream flags: ${missingFlags.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  console.log('All required stream flags are present.');
  console.log(`Validated flags: ${REQUIRED_STREAM_FLAGS.join(', ')}`);

  if (!helpText.includes('--verbose')) {
    console.error('Missing required verbose flag for live stream-json probing.');
    process.exitCode = 1;
    return;
  }

  console.log('Verified: current Claude CLI advertises --verbose for stream-json mode.');

  if (!wantsLiveProbe) {
    console.log(
      'Live probe skipped. Run `npm run probe -- --live` to capture real stream-json events.'
    );
    return;
  }

  runLiveProbe(prompt);
}

main();
