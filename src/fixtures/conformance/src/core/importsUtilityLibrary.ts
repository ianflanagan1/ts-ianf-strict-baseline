// A third-party utility library, to group a list.
import { groupBy } from 'lodash';

export const byLength = (words: ReadonlyArray<string>): unknown => groupBy(words, (word) => word.length);
