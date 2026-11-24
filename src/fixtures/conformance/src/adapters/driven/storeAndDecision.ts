import { readFileSync } from 'node:fs';

// The gap the listing records: a store and a decision in one module, where the store's imports are allowed.
export const rows = (file: string): ReadonlyArray<string> => readFileSync(file, 'utf8').split('\n');

export const keeps = (row: string): boolean => row !== '';
