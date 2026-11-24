type Order = { readonly total: number };

// The gap the listing records: a cast that claims a type nothing tested.
export const asOrder = (body: unknown): Order => body as Order;

export const asText = (value: number): string => value as unknown as string;
