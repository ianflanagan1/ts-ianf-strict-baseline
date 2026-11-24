import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { baseline } from '../adapters/driving/eslint.ts';
import { listingJson } from '../core/listing.ts';

// Keeps docs/eslint-rules-to-build.md, the list of ESLint rules the baseline still needs, in step with the listing
// and with the rules that exist.

const packageRoot = path.join(import.meta.dirname, '..', '..');
const listPath = 'docs/eslint-rules-to-build.md';

// What an entry says of its rule itself, when no other document specifies it.
const ownFields = ['Reports', 'Allows', 'Fixtures', 'Why no existing tool'];

type Entry = { readonly rule: string; readonly fields: ReadonlyMap<string, string> };

// Each entry under its "### <rule-name>" heading, with its fields: the text after "- **<Field>:**" on its line.
const entriesOf = (contents: string): ReadonlyArray<Entry> =>
  contents
    .split(/^### /mu)
    .slice(1)
    .map((section) => {
      const [heading = '', ...body] = section.split('\n');
      const lines = body.join('\n').matchAll(/^- \*\*([^*]+):\*\* (.+)$/gmu);
      return { rule: heading.trim(), fields: new Map([...lines].map(([, field = '', text = '']) => [field, text])) };
    });

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === 'object' && value !== null;

// The listing's coverage of each clause, by the clause's id.
const coverageByClause = (): ReadonlyMap<string, unknown> => {
  const listing: unknown = JSON.parse(listingJson());
  const clauses = isRecord(listing) && isRecord(listing.clauses) ? listing.clauses : {};
  return new Map(Object.entries(clauses).map(([id, claim]) => [id, isRecord(claim) ? claim.coverage : null]));
};

// The names of the rules the baseline's own plugin has.
const existingRules = (): ReadonlySet<string> =>
  new Set(baseline(packageRoot).flatMap((block) => Object.keys(block.plugins?.['ts-ianf-strict-baseline']?.rules ?? {})));

const entries = entriesOf(await readFile(path.join(packageRoot, listPath), 'utf8'));

describe('the list of ESLint rules to build', () => {
  it('lists at least one rule', () => {
    expect(entries.length, `${listPath} lists no rule; give each a "### <rule-name>" heading`).toBeGreaterThan(0);
  });

  it('gives each rule one entry, under the name the plugin will register', () => {
    const rules = entries.map((entry) => entry.rule);
    for (const rule of rules) {
      expect(rule, `"${rule}" isn't a rule's name, such as no-unused-result`).toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/u);
      expect(rules.filter((other) => other === rule).length, `${rule} has two entries`).toBe(1);
    }
  });

  it('names only clauses the listing has and covers short of full', () => {
    const coverage = coverageByClause();
    for (const { rule, fields } of entries) {
      const clauses = [...(fields.get('Clauses') ?? '').matchAll(/`([a-z0-9-]+)`/gu)].map(([, clause = '']) => clause);
      expect(clauses.length, `${rule} names no clause on a Clauses line`).toBeGreaterThan(0);
      for (const clause of clauses) {
        expect(coverage.has(clause), `${rule} names ${clause}, which the listing doesn't have`).toBe(true);
        expect(coverage.get(clause), `${rule} names ${clause}, which the listing covers in full; drop the clause from the entry`).not.toBe(
          'full',
        );
      }
    }
  });

  it('says what each rule must do, or where that is specified', () => {
    for (const { rule, fields } of entries.filter((entry) => !entry.fields.has('Specified in'))) {
      for (const field of ownFields) {
        expect(fields.has(field), `${rule} has no ${field} line, and no Specified in line in its place`).toBe(true);
      }
    }
  });

  it('lists no rule the plugin already has', () => {
    const existing = existingRules();
    for (const { rule } of entries) {
      expect(existing.has(rule), `ts-ianf-strict-baseline/${rule} exists; delete its entry from ${listPath}`).toBe(false);
    }
  });
});
