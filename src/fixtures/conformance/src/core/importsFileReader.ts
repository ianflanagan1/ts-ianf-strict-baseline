// A package that imports node:fs.
import { read } from 'reads-files';

export const config = (): unknown => read('config.json');
