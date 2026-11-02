// An adapter reads configuration for itself.
export const databaseUrl = (): string | undefined => process.env['DATABASE_URL'];
