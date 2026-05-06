import { spawnSync } from 'node:child_process';
import process from 'node:process';

const TERM_PROGRAM_NAME_MAP: Record<string, string[]> = {
  Apple_Terminal: ['Terminal'],
  'iTerm.app': ['iTerm2', 'iTerm'],
  WezTerm: ['WezTerm'],
  vscode: ['Code', 'Visual Studio Code'],
  WarpTerminal: ['Warp'],
  Hyper: ['Hyper']
};

export function getLikelyTerminalAppNames(termProgram = process.env.TERM_PROGRAM): string[] {
  if (!termProgram) {
    return [];
  }

  return TERM_PROGRAM_NAME_MAP[termProgram] ?? [termProgram];
}

export function getFrontmostApplicationName(): string | null {
  const result = spawnSync(
    'osascript',
    [
      '-e',
      'tell application "System Events" to get name of first application process whose frontmost is true'
    ],
    {
      encoding: 'utf8'
    }
  );

  if (result.error || result.status !== 0) {
    return null;
  }

  const name = result.stdout.trim();
  return name.length > 0 ? name : null;
}

export function isCurrentTerminalAppFocused(
  termProgram = process.env.TERM_PROGRAM,
  frontmostAppName = getFrontmostApplicationName()
): boolean | null {
  const terminalNames = getLikelyTerminalAppNames(termProgram);

  if (terminalNames.length === 0 || !frontmostAppName) {
    return null;
  }

  return terminalNames.includes(frontmostAppName);
}
