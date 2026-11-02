#!/usr/bin/env node
import { gatherFacts } from './adapters/driven/gatherFacts.ts';
import { run } from './adapters/driving/cli.ts';

// The entrypoint and top-level handler: it reads the arguments, wires the command line to the project's files and
// turns any error into a message and a non-zero exit code.
async function main(): Promise<void> {
  try {
    process.exitCode = await run(process.argv.slice(2), { facts: gatherFacts });
  } catch (error: unknown) {
    console.error(error);
    process.exitCode = 1;
  }
}

await main();
