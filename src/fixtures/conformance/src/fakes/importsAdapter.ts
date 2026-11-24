import { now } from '../adapters/driven/clock.ts';

// A fake that passes calls through to its port's adapter, which no fake may.
export const fakeNow = (): number => now();
