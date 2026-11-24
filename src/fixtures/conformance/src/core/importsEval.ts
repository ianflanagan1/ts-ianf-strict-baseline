// A package that runs text as code.
import { evaluate } from 'runs-text';

export const sum = (): unknown => evaluate('1 + 2');
