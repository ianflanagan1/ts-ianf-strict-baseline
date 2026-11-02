import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { listingJson, listingPath } from './listing.ts';

const packageRoot = path.join(import.meta.dirname, '..', '..');

describe('the rulebook listing', () => {
  it('is what rulebook-coverage.json holds', async () => {
    expect(await readFile(path.join(packageRoot, listingPath), 'utf8')).toBe(listingJson());
  });

  it('names only tests that exist as proof', async () => {
    const proofs = [...listingJson().matchAll(/"([^"]+\.test\.ts): ([^"]+)"/gu)];
    expect(proofs.length).toBeGreaterThan(0);
    for (const [, file = '', test = ''] of proofs) {
      const source = await readFile(path.join(packageRoot, file), 'utf8');
      // A name with an apostrophe is double-quoted.
      expect(source.includes(`it('${test}'`) || source.includes(`it("${test}"`), `${file}: ${test}`).toBe(true);
    }
  });
});
