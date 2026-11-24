export function evens(values: ReadonlyArray<number>): ReadonlyArray<number> {
  let calls = 0;
  const found = values.filter((value) => {
    calls += 1;
    return value % 2 === 0;
  });
  return calls > 0 ? found : [];
}
