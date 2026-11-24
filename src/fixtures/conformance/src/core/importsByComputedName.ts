// A package that requires a module by a name it computes.
import { codec } from 'loads-by-name';

export const utf8 = (): unknown => codec('utf8');
