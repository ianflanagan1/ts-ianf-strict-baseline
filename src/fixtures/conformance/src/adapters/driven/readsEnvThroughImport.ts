// The gap the listing records: configuration read through an imported process, or one taken apart.
import process from 'node:process';

const { argv } = process;

export const databaseUrl = (): string | undefined => process.env.DATABASE_URL;
export const flags = (): ReadonlyArray<string> => argv.slice(2);
