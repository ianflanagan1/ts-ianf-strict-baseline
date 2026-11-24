// The conformance tests lint this file for its spy. vitest runs it too, as it does every test file, so it passes.
import { expect, it, vi } from 'vitest';
import { countOrders } from './countOrders.ts';

it('stands in for a port with a spy scripted for one test', async () => {
  const orders = { count: () => Promise.resolve(0) };
  vi.spyOn(orders, 'count').mockResolvedValue(2);
  expect(await countOrders(orders)).toBe(2);
});
