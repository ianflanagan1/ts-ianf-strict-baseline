import { fakeOrders } from '../../fakes/fakeOrders.ts';

// A driven adapter that falls back to its port's fake, which only test code may reference.
export const offlineCount = (): Promise<number> => fakeOrders(0).count();
