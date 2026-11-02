export class Counter {
  private start: number;

  constructor(start: number) {
    this.start = start;
  }

  value(): number {
    return this.start;
  }
}
