// The gap the listing records: a module-level const can still hold a mutable object.
const seen = new Set<string>();

export const isFirst = (s: string): boolean => {
  const first = !seen.has(s);
  seen.add(s);
  return first;
};
