import { fakeOrders } from '../fakes/fakeOrders.ts';

// An orchestrator that references a fake, which only test code may.
export const countNothing = (): Promise<number> => fakeOrders(0).count();
