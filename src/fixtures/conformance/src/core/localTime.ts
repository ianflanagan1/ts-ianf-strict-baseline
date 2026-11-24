// The gap the listing records: a time built from a timestamp in the machine's local time zone.
export const hour = (timestamp: number): number => new Date(timestamp).getHours();
