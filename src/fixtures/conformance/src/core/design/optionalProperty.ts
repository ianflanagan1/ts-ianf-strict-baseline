export type Delivery = { readonly kind: 'delivered'; readonly at?: number } | { readonly kind: 'waiting' };
