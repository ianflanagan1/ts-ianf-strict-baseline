import type { Shape } from './union.ts';

// A unit-of-code that a variant of the union references, and that references the union.
export type Label = { readonly text: string; readonly of: ReadonlyArray<Shape> };
