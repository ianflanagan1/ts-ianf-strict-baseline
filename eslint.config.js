// @ts-check
import { defineConfig } from 'eslint/config';
import { baseline } from './src/eslint.ts';

// src/cli.ts is the entrypoint, and src/verify/gatherFacts.ts the driven adapter that reads a project's files.
export default defineConfig(
  { ignores: ['src/fixtures/'] },
  baseline(import.meta.dirname),
  {
    files: ['src/cli.ts', 'src/verify/gatherFacts.ts'],
    rules: { 'ts-baseline/no-effects': 'off', 'max-lines-per-function': ['error', { max: 50 }] },
  },
  {
    files: ['src/cli.ts'],
    rules: { 'ts-baseline/no-configuration': 'off' },
  },
);
