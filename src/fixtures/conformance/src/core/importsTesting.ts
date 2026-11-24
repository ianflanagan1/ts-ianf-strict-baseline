import { describeOrders } from '../testing/assertOrders.ts';

// Core code that references shipped test code, which only test code may.
export const described = (): string => describeOrders('orders');
