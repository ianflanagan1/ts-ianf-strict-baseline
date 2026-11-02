type Result<T, E> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

const parse = (s: string): Result<number, 'not a number'> => {
  const n = Number(s);
  return Number.isNaN(n) ? { ok: false, error: 'not a number' } : { ok: true, value: n };
};

const find = (items: ReadonlyArray<string>, s: string): string | null => items.find((item) => item === s) ?? null;

export function use(items: ReadonlyArray<string>): void {
  parse('1');
  const found = find(items, 'a');
}
