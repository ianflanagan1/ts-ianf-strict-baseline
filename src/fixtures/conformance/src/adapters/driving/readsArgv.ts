// A driving adapter reads the command line for itself.
export const args = (): ReadonlyArray<string> => process.argv.slice(2);
