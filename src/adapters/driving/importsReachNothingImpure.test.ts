import path from 'node:path';
import { afterAll, describe, it } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { importsReachNothingImpure } from './importsReachNothingImpure.ts';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

// Each case is a module of the conformance fixture's core, so its imports resolve to the fixture's packages under
// src/fixtures/conformance/node_modules/. tr46 and punycode there are the published 7.0.0 and 2.3.1, unchanged.
const filename = path.join(import.meta.dirname, '..', '..', 'fixtures', 'conformance', 'src', 'core', 'case.ts');

const impure = (specifier: string, operation: string, ...steps: ReadonlyArray<string>) => [
  { messageId: 'impure' as const, data: { specifier, operation, path: steps.join(' → ') } },
];

ruleTester.run('imports-reach-nothing-impure', importsReachNothingImpure, {
  valid: [
    { name: 'tr46 7.0.0 is pure', filename, code: `import { toASCII } from 'tr46';` },
    { name: 'punycode 2.3.1 is pure, its global pattern used only by replace', filename, code: `import punycode from 'punycode/';` },
    { name: 'a JSON module is pure', filename, code: `import table from 'tr46/lib/mappingTable.json' with { type: 'json' };` },
    {
      name: 'a function that calls the function value it was passed is pure',
      filename,
      code: `import { applyTwice } from 'applies-callback';`,
    },
    {
      name: 'load-time code may build a module-scope value, and replace may use a global pattern',
      filename,
      code: `import { words } from 'builds-table';`,
    },
    { name: "the package's import condition decides which module is followed", filename, code: `import { double } from 'dual-format';` },
    { name: 'modules that require each other are each read once', filename, code: `import { isEven } from 'cyclic';` },
    { name: 'a type-only import runs nothing', filename, code: `import type { square } from 'memo-cache';` },
    { name: "the core's own modules are left to the rules that check them", filename, code: `import { upper } from './pure.ts';` },
  ],
  invalid: [
    {
      name: 'a package that reads the environment when it loads is reported',
      filename,
      code: `import { level } from 'reads-env-at-load';`,
      errors: impure('reads-env-at-load', 'the global `process`', 'reads-env-at-load@1.0.0/index.js:4'),
    },
    {
      name: 'the clock read two packages deep is reported, with the path to it',
      filename,
      code: `import { stamp } from 'stamps-time';`,
      errors: impure('stamps-time', 'the global `Date`', 'stamps-time@1.0.0/index.js', 'time-source@1.0.0/index.js:3'),
    },
    {
      name: 'a module-scope cache a function writes is reported',
      filename,
      code: `import { square } from 'memo-cache';`,
      errors: impure('memo-cache', "a function's write to the module-scope `cache`", 'memo-cache@1.0.0/index.js:8'),
    },
    {
      name: 'a require of a computed name is reported',
      filename,
      code: `import { codec } from 'loads-by-name';`,
      errors: impure('loads-by-name', 'a `require` of a name it computes', 'loads-by-name@1.0.0/index.js:4'),
    },
    {
      name: 'eval is reported',
      filename,
      code: `import { evaluate } from 'runs-text';`,
      errors: impure('runs-text', 'the global `eval`', 'runs-text@1.0.0/index.js:4'),
    },
    {
      name: 'a host module a package imports is reported',
      filename,
      code: `import { read } from 'reads-files';`,
      errors: impure('reads-files', 'the host module `node:fs`', 'reads-files@1.0.0/index.js:1'),
    },
    {
      name: 'a module-scope global pattern a function runs exec on is reported',
      filename,
      code: `import { firstNumber } from 'scans-globally';`,
      errors: impure(
        'scans-globally',
        'the module-scope regular expression `digits`, whose `g` flag keeps `lastIndex` between calls',
        'scans-globally@1.0.0/index.js:7',
      ),
    },
    {
      name: 'a comparison by locale is reported',
      filename,
      code: `import { sorted } from 'compares-locale';`,
      errors: impure(
        'compares-locale',
        "`localeCompare()`, whose result depends on the runtime's locale data",
        'compares-locale@1.0.0/index.js:4',
      ),
    },
    {
      name: 'a change to a built-in is reported',
      filename,
      code: `import 'patches-array';`,
      errors: impure('patches-array', 'a change to the built-in `Array`', 'patches-array@1.0.0/index.js:3'),
    },
    {
      name: 'a re-export is followed as an import is',
      filename,
      code: `export * from 'memo-cache';`,
      errors: impure('memo-cache', "a function's write to the module-scope `cache`", 'memo-cache@1.0.0/index.js:8'),
    },
    {
      name: 'an import() of a named package is followed',
      filename,
      code: `export const load = () => import('runs-text');`,
      errors: impure('runs-text', 'the global `eval`', 'runs-text@1.0.0/index.js:4'),
    },
    {
      name: 'a host module the core imports is reported',
      filename,
      code: `import { readFileSync } from 'node:fs';`,
      errors: [{ messageId: 'hostModule', data: { specifier: 'node:fs' } }],
    },
    {
      name: "a host module's bare name is reported",
      filename,
      code: `import fs from 'fs';`,
      errors: [{ messageId: 'hostModule', data: { specifier: 'fs' } }],
    },
    {
      name: 'an import that does not resolve is reported',
      filename,
      code: `import { groupBy } from 'not-installed';`,
      errors: [{ messageId: 'unresolved', data: { specifier: 'not-installed' } }],
    },
    {
      name: 'an import() of a computed name is reported',
      filename,
      code: `export const load = (name: string) => import(name);`,
      errors: [{ messageId: 'computedImport' }],
    },
  ],
});
