import type { Label } from './label.ts';

export type Shape = { readonly kind: 'circle'; readonly label: Label } | { readonly kind: 'square' };
