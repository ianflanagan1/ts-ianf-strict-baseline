type Constructor = new (...args: ReadonlyArray<never>) => object;

const withTimestamps = <T extends Constructor>(base: T) =>
  class extends base {
    stamp(): number {
      return 0;
    }
  };

class Base {}

export class Stamped extends withTimestamps(Base) {}
