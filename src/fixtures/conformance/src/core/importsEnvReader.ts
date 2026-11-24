// A package that reads the environment when it is loaded.
import { level } from 'reads-env-at-load';

export const logLevel = (): unknown => level();
