export class Greeter {
  greet(name: string): string {
    if (name === '') {
      name = 'you';
    }
    return `Hello, ${name}`;
  }
}
