import type { Orders } from '../orchestrators/countOrders.ts';

export const describe = (orders: Orders): string => typeof orders;
