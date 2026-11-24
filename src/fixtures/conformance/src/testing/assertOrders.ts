import { upper } from '../core/pure.ts';
import { fakeOrders } from '../fakes/fakeOrders.ts';
import type { Orders } from '../orchestrators/countOrders.ts';

// Test code a project ships for the tests of projects that depend on it: it may use the core, ports and fakes.
export const emptyOrders = (): Orders => fakeOrders(0);

export const describeOrders = (name: string): string => upper(name);
