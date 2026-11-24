// Real tr46 7.0.0, which is pure: relative requires, a JSON table and module-scope regular expressions without the g or y flag.
import { toASCII } from 'tr46';

export const asciiDomain = (domain: string): unknown => toASCII(domain);
