type Result<T, E> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

const parse = (s: string): Result<number, 'not a number'> => {
  const n = Number(s);
  return Number.isNaN(n) ? { ok: false, error: 'not a number' } : { ok: true, value: n };
};

// The gap the listing records: a failure's branch that holds only a comment, or returns success.
export function use(s: string): Result<number, 'not a number'> {
  const parsed = parse(s);
  if (!parsed.ok) {
    // Nothing to do.
  }
  if (!parsed.ok) {
    return { ok: true, value: 0 };
  }
  return parsed;
}
