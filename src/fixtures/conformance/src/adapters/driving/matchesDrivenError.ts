import { NotFound } from '../driven/notFound.ts';

// A driving adapter recognises a driven adapter's error, to answer with a 404.
export const status = (error: unknown): number => (error instanceof NotFound ? 404 : 500);
