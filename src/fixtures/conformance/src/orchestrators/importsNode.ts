import { readFileSync } from 'node:fs';

export const read = (): string => readFileSync('f', 'utf8');
