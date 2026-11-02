export function parse(json: string): unknown {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    value = null;
  }
  return value;
}
