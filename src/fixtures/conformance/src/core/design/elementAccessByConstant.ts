class Order {
  private readonly total: number;

  constructor(total: number) {
    this.total = total;
  }

  double(): number {
    return this.total * 2;
  }
}

const field = 'total';

// The gap the listing records: a private field read by element access with a key held in a constant.
export const read = (order: Order): number => order[field];
