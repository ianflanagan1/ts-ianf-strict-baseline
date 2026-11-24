class Order {
  private readonly total: number;

  constructor(total: number) {
    this.total = total;
  }

  double(): number {
    return this.total * 2;
  }
}

export const read = (order: Order): number => order['total'];
