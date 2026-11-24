// The gap the listing records: a port whose methods take a callback, a value of unknown type and a map.
export interface Rows {
  readonly each: (visit: (row: unknown) => void) => Promise<void>;
  readonly byColumn: () => Promise<ReadonlyMap<string, unknown>>;
}

export const visitRows = (rows: Rows, visit: (row: unknown) => void): Promise<void> => rows.each(visit);
