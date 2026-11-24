import type { Shape } from './shape.ts';

export function name(shape: Shape): string {
  switch (shape.kind) {
    case 'circle':
      return 'circle';
    case 'square':
    case 'triangle':
      return 'polygon';
    default:
      throw new Error('unreachable');
  }
}
