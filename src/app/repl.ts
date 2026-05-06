import { createInterface } from 'node:readline/promises';
import process from 'node:process';

import {
  isMissingResumeSessionError,
  runClaudePrompt
} from '../claude/run-prompt.js';
import { loadAppConfig } from '../config/load.js';
import { isCurrentTerminalAppFocused } from '../notifications/macos-focus.js';
import { formatReplyCompleteNotification } from '../notifications/formatter.js';
import { sendMacOsNotification } from '../notifications/macos.js';
import { shouldSendReplyNotification } from '../notifications/policy.js';
import {
  clearStoredSessionState,
  loadStoredSessionState,
  saveStoredSessionState
} from '../state/session-store.js';
import type { RunClaudePromptResult } from '../claude/run-prompt.js';

export const HELP_LINES = [
  '可用命令:',
  '  /help     查看帮助',
  '  /session  查看当前会话 ID',
  '  /new      开启新会话，保留当前终端内容',
  '  /clear    清空当前会话，并在支持时清屏',
  '  exit      退出',
  '  quit      退出'
] as const;

export type ReplCommandResult =
  | { type: 'continue'; currentSessionId?: string }
  | { type: 'exit' };

export function reportNotificationFailure(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Warning: failed to send notification: ${message}`);
}

export function printHelp(): void {
  console.log(HELP_LINES.join('\n'));
  console.log('');
}

function printBanner(): void {
  console.log('AI Task Notifier');
  console.log('');
  console.log('输入消息开始连续对话，输入 exit 或 quit 退出。');
  console.log('输入 /help 查看命令，/new 开启新会话，/session 查看当前会话状态。');
  console.log('当前模式: 复用 Claude session，并在回复完成时弹出通知。');
  console.log('');
}

function clearScreenIfPossible(): void {
  if (!process.stdout.isTTY) {
    return;
  }

  process.stdout.write('\x1Bc');
}

export function handleReplCommand(
  trimmed: string,
  currentSessionId: string | undefined
): ReplCommandResult | null {
  if (trimmed === 'exit' || trimmed === 'quit') {
    return { type: 'exit' };
  }

  if (trimmed === '/help') {
    printHelp();
    return { type: 'continue', currentSessionId };
  }

  if (trimmed === '/new') {
    clearStoredSessionState();
    console.log('已开启新会话。');
    console.log('');
    return { type: 'continue', currentSessionId: undefined };
  }

  if (trimmed === '/clear') {
    clearStoredSessionState();
    clearScreenIfPossible();
    printBanner();
    console.log('已清空当前会话。');
    console.log('');
    return { type: 'continue', currentSessionId: undefined };
  }

  if (trimmed === '/session') {
    console.log(currentSessionId ? `当前会话: ${currentSessionId}` : '当前还没有活动会话。');
    console.log('');
    return { type: 'continue', currentSessionId };
  }

  return null;
}

export async function runPromptWithSessionRecovery(options: {
  currentSessionId?: string;
  executePrompt: (resumeSessionId?: string) => Promise<RunClaudePromptResult>;
  onStaleSession?: () => void;
}): Promise<{ result: RunClaudePromptResult; currentSessionId?: string; recovered: boolean }> {
  try {
    const result = await options.executePrompt(options.currentSessionId);

    return {
      result,
      currentSessionId: result.sessionId ?? options.currentSessionId,
      recovered: false
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (options.currentSessionId && isMissingResumeSessionError(message)) {
      options.onStaleSession?.();
      clearStoredSessionState();
      const result = await options.executePrompt();

      return {
        result,
        currentSessionId: result.sessionId,
        recovered: true
      };
    }

    throw error;
  }
}

export async function startRepl(): Promise<void> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  printBanner();
  const config = loadAppConfig();
  let currentSessionId = loadStoredSessionState()?.currentSessionId;

  if (currentSessionId) {
    console.log(`已恢复最近会话: ${currentSessionId}`);
    console.log('');
  }

  try {
    while (true) {
      let prompt: string;

      try {
        prompt = await rl.question('> ');
      } catch (error) {
        if (
          error instanceof Error &&
          'code' in error &&
          (error.code === 'ERR_USE_AFTER_CLOSE' || error.code === 'ABORT_ERR')
        ) {
          break;
        }

        throw error;
      }

      const trimmed = prompt.trim();

      if (!trimmed) {
        continue;
      }

      const commandResult = handleReplCommand(trimmed, currentSessionId);

      if (commandResult?.type === 'exit') {
        break;
      }

      if (commandResult?.type === 'continue') {
        currentSessionId = commandResult.currentSessionId;
        continue;
      }

      let startedOutput = false;

      try {
        const executePrompt = async (resumeSessionId?: string) =>
          runClaudePrompt({
            prompt: trimmed,
            resumeSessionId,
            onTextDelta(chunk) {
              if (!startedOutput) {
                process.stdout.write('Claude: ');
                startedOutput = true;
              }

              process.stdout.write(chunk);
            },
            onReplyComplete({ visibleText, durationMs }) {
              if (!startedOutput && visibleText.length > 0) {
                console.log(`Claude: ${visibleText}`);
                startedOutput = true;
              }

              if (!config.notifications.enabled) {
                return;
              }

              const isAppFocused = config.notifications.notifyOnlyWhenAppInBackground
                ? isCurrentTerminalAppFocused()
                : null;

              if (
                !shouldSendReplyNotification({
                  durationMs,
                  minReplySeconds: config.notifications.minReplySeconds,
                  notifyOnlyWhenAppInBackground:
                    config.notifications.notifyOnlyWhenAppInBackground,
                  isAppFocused
                })
              ) {
                return;
              }

              try {
                sendMacOsNotification(
                  formatReplyCompleteNotification({
                    visibleText,
                    durationMs,
                    sound: config.notifications.sound,
                    includePreview: config.notifications.includePreview,
                    previewLength: config.notifications.previewLength
                  })
                );
              } catch (error) {
                reportNotificationFailure(error);
              }
            }
          });

        const { result, currentSessionId: nextSessionId } = await runPromptWithSessionRecovery({
          currentSessionId,
          executePrompt,
          onStaleSession() {
            currentSessionId = undefined;
            if (startedOutput) {
              process.stdout.write('\n');
            }

            console.log('缓存会话已失效，已切换到新会话并重试当前消息。');
            console.log('');
          }
        });

        currentSessionId = nextSessionId;

        if (currentSessionId) {
          saveStoredSessionState(currentSessionId);
        }

        if (startedOutput) {
          process.stdout.write('\n\n');
        } else if (result.visibleText.length > 0) {
          console.log(`Claude: ${result.visibleText}`);
          console.log('');
        }
      } catch (error) {
        if (startedOutput) {
          process.stdout.write('\n');
        }

        const message = error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        console.log('');
      }
    }
  } finally {
    rl.close();
  }
}
