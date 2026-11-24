// A package with a module-scope cache that its function writes.
import { square } from 'memo-cache';

export const area = (side: number): unknown => square(side);
