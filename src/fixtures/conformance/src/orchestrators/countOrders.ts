// A port, declared with the orchestrator that calls it.
export interface Orders {
  readonly count: () => Promise<number>;
}

export const countOrders = (orders: Orders): Promise<number> => orders.count();
