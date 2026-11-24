// The gap the listing records: a stub made of vi.fn functions given scripted return values.
import { expect, it, vi } from 'vitest';
import { countOrders } from './countOrders.ts';

it('stands in for a port with a stub scripted for one test', async () => {
  const orders = { count: vi.fn().mockResolvedValue(2) };
  expect(await countOrders(orders)).toBe(2);
});
