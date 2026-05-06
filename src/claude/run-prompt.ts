import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

import { getResultSessionId, getTextDelta, parseClaudeStreamLine } from './parser.js';
import { ClaudeSessionTracker } from './session.js';

export interface RunClaudePromptOptions {
  prompt: string;
  resumeSessionId?: string;
  onTextDelta?: (chunk: string) => void;
  onReplyComplete?: (result: { visibleText: string; durationMs: number }) => void;
}

export interface RunClaudePromptResult {
  visibleText: string;
  durationMs: number;
  exitCode: number;
  sessionId?: string;
}

export interface ChildExitAwaitable {
  once(event: 'close', listener: (code: number | null) => void): unknown;
  once(event: 'error', listener: (error: Error) => void): unknown;
  off(event: 'close', listener: (code: number | null) => void): unknown;
  off(event: 'error', listener: (error: Error) => void): unknown;
}

export function isMissingResumeSessionError(message: string): boolean {
  return message.includes('No conversation found with session ID:');
}

export function waitForChildExit(child: ChildExitAwaitable): Promise<number | null> {
  return new Promise<number | null>((resolve, reject) => {
    const handleClose = (code: number | null) => {
      child.off('error', handleError);
      resolve(code);
    };

    const handleError = (error: Error) => {
      child.off('close', handleClose);
      reject(error);
    };

    child.once('close', handleClose);
    child.once('error', handleError);
  });
}

export function buildClaudePromptArgs(options: {
  prompt: string;
  resumeSessionId?: string;
}): string[] {
  const args = ['-p'];

  if (options.resumeSessionId) {
    args.push('--resume', options.resumeSessionId);
  }

  args.push(
    '--verbose',
    '--output-format',
    'stream-json',
    '--include-partial-messages',
    '--include-hook-events',
    options.prompt
  );

  return args;
}

export async function runClaudePrompt(
  options: RunClaudePromptOptions
): Promise<RunClaudePromptResult> {
  const startedAt = Date.now();
  const tracker = new ClaudeSessionTracker();
  const child = spawn('claude', buildClaudePromptArgs(options), {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stderr = '';
  let visibleText = '';
  let sessionId = options.resumeSessionId;
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => {
    stderr += chunk;
  });

  const lines = createInterface({
    input: child.stdout
  });

  const lineLoop = (async () => {
    for await (const line of lines) {
      const event = parseClaudeStreamLine(line);

      if (!event) {
        continue;
      }

      const resultSessionId = getResultSessionId(event);

      if (resultSessionId) {
        sessionId = resultSessionId;
      }

      const textDelta = getTextDelta(event);

      if (textDelta.length > 0) {
        options.onTextDelta?.(textDelta);
      }

      const update = tracker.ingest(event);

      if (update.shouldNotify) {
        visibleText = update.visibleText;
        options.onReplyComplete?.({
          visibleText,
          durationMs: Date.now() - startedAt
        });
      }
    }
  })();

  const exitCode = await waitForChildExit(child);
  await lineLoop;

  if ((exitCode ?? 0) !== 0) {
    const cleanedError = stderr.trim();
    throw new Error(cleanedError || `claude exited with status ${exitCode}`);
  }

  if (visibleText.length === 0) {
    const snapshot = tracker.snapshot();
    visibleText = snapshot.currentAssistantMessage?.textChunks.join('').trim() ?? '';
  }

  return {
    visibleText,
    durationMs: Date.now() - startedAt,
    exitCode: exitCode ?? 0,
    sessionId
  };
}
