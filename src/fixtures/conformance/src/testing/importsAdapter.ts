import { now } from '../adapters/driven/clock.ts';

// Shipped test code that references a driven adapter, which it may not.
export const stamped = (): number => now();
