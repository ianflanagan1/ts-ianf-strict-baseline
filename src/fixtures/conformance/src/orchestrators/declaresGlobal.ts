// A port declared for every module to name, which a module then references with no import.
declare global {
  interface SharedOrders {
    readonly count: () => number;
  }
}

export const countShared = (orders: SharedOrders): number => orders.count();
