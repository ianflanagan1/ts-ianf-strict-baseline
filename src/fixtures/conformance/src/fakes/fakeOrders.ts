import { upper } from '../core/pure.ts';
import type { Orders } from '../orchestrators/countOrders.ts';

// A fake: it has its port's shape and uses the core, which a fake may.
export const fakeOrders = (count: number): Orders => ({ count: () => Promise.resolve(count) });

export const label = (): string => upper('fake');
