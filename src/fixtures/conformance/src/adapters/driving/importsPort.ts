// The gap the listing records: a port is in its orchestrator's module, which a driving adapter may import.
import type { Orders } from '../../orchestrators/countOrders.ts';

export const handle = (orders: Orders): Promise<number> => orders.count();
