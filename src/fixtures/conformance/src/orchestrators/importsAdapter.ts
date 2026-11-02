import { now } from '../adapters/driven/clock.ts';

export const stamp = (): number => now();
