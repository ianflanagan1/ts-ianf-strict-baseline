// The gap the listing records: a loop that fills a list, which a const local doesn't stop.
export function doubled(values: ReadonlyArray<number>): ReadonlyArray<number> {
  const result: number[] = [];
  for (const value of values) {
    result.push(value * 2);
  }
  return result;
}
