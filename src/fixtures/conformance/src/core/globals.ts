// The gap the listing records: globals perform effects without an import.
export const now = (): number => Date.now();
export const roll = (): number => Math.random();
export const home = (): string | undefined => process.env['HOME'];
export const say = (): void => console.log('hello');
