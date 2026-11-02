import type { Shape } from './shape.ts';

export function name(shape: Shape): string {
  switch (shape.kind) {
    case 'circle':
      return 'circle';
    case 'square':
      return 'square';
    default:
      return 'other';
  }
}
