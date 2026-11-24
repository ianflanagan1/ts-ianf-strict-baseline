import { readFileSync } from 'node:fs';

// A store and a decision in one module.
export const rows = (file: string): ReadonlyArray<string> => readFileSync(file, 'utf8').split('\n');

export const keeps = (row: string): boolean => row !== '';
