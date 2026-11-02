// @ts-check
import { defineConfig } from 'eslint/config';
import { baseline } from '../../adapters/driving/eslint.ts';

export default defineConfig(baseline(import.meta.dirname));
