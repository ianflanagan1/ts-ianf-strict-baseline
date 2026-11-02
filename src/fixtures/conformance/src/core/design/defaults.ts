export function greet(name = 'world'): string {
  return `hello ${name}`;
}

export class Greeter {
  constructor(private readonly greeting = 'hello') {}

  greet(name = 'world'): string {
    return `${this.greeting} ${name}`;
  }
}
