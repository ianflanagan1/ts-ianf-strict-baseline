import type { Shape } from './shape.ts';

// The type checker rejects a value that isn't a member of the union.
export const hexagon: Shape = { kind: 'hexagon' };
