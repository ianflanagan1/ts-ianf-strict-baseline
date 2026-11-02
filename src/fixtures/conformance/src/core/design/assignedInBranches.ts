export function label(n: number): string {
  let text: string;
  if (n > 0) {
    text = 'positive';
  } else {
    text = 'not positive';
  }
  return text;
}
