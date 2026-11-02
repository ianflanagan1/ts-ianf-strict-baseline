export function f(n: number): number {
  const reset = (): void => {
    n = 0;
  };
  reset();
  return n;
}
