#!/usr/bin/env node

import { startRepl } from './app/repl.js';

async function main(): Promise<void> {
  await startRepl();
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Fatal: ${message}`);
  process.exitCode = 1;
});
