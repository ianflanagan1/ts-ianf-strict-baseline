type Result<T, E> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

const parse = (s: string): Result<number, 'not a number'> => {
  const n = Number(s);
  return Number.isNaN(n) ? { ok: false, error: 'not a number' } : { ok: true, value: n };
};

export function use(s: string): string | null {
  const parsed = parse(s);
  if (!parsed.ok) {
  }
  const found = s === '' ? null : s;
  if (found === null) {
  }
  return found;
}
