abstract class Named {
  abstract name(): string;
}

export class Thing extends Named {
  name(): string {
    return 'thing';
  }
}
