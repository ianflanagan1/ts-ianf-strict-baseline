// @ts-check
import { defineConfig } from 'eslint/config';
import { baseline } from './src/adapters/driving/eslint.ts';

// The package follows the roles it ships, by the same paths a project uses.
export default defineConfig({ ignores: ['src/fixtures/'] }, baseline(import.meta.dirname));
