// The gap the listing records: a suppression with a description, and an ESLint directive.
// @ts-expect-error -- the count is a string here.
export const count: number = 'one';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const describe = (value: any): string => typeof value;
