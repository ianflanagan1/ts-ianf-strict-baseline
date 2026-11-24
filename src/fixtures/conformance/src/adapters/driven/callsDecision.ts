// The gap the listing records: the checks don't tell a decision from a value, so a store may call either.
import { upper } from '../../core/pure.ts';

export const rows = (found: ReadonlyArray<string>): ReadonlyArray<string> => found.filter((row) => upper(row) === row);
