import { parse } from 'yaml';

export const load = (text: string): unknown => parse(text);
