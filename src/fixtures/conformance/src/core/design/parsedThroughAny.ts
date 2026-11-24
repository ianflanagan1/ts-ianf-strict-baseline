type Order = { readonly total: number };

export const parse = (json: string): Order => {
  const order: Order = JSON.parse(json);
  return order;
};
