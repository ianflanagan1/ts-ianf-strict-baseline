// A package whose function calls only the function value it was passed, which the core's own argument decides.
import { applyTwice } from 'applies-callback';

export const quadruple = (n: number): unknown => applyTwice((x: number) => x * 2, n);
