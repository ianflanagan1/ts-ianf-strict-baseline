// The gap the listing records: a call that drops a sentinel, as a statement, isn't reported.
const find = (items: ReadonlyArray<string>, s: string): string | null => items.find((item) => item === s) ?? null;

export function use(items: ReadonlyArray<string>): void {
  find(items, 'a');
}
