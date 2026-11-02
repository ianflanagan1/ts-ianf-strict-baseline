import path from 'node:path';
import { cruise, type IViolation } from 'dependency-cruiser';
import { ESLint } from 'eslint';
import prettier from 'prettier';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import baseline from '../../dependency-cruiser.js';
import { baseline as eslintBaseline } from '../eslint.ts';

// Each test is named for the rulebook clause it proves, and src/fixtures/conformance has a module for each
// violation the clause describes. dependency-cruiser and ESLint run over it with this package's configs.

const fixture = path.join(import.meta.dirname, '..', 'fixtures', 'conformance');

type Edge = { readonly rule: string; readonly from: string; readonly to: string };

async function cruiseFixture(): Promise<ReadonlyArray<Edge>> {
  const result = await cruise(['src'], {
    ...baseline.options,
    baseDir: fixture,
    validate: true,
    ruleSet: { forbidden: baseline.forbidden ?? [] },
  });
  if (typeof result.output === 'string') {
    throw new Error('dependency-cruiser returned a report, not a result');
  }
  return result.output.summary.violations.map((v: IViolation) => ({ rule: v.rule.name, from: v.from, to: v.to }));
}

// The rules ESLint reports for each module, by its path from the fixture.
async function lintFixture(): Promise<ReadonlyMap<string, ReadonlyArray<string>>> {
  const eslint = new ESLint({ cwd: fixture, overrideConfigFile: true, overrideConfig: eslintBaseline(fixture) });
  const results = await eslint.lintFiles(['src/**/*.ts']);
  return new Map(results.map((result) => [path.relative(fixture, result.filePath), result.messages.map((m) => m.ruleId ?? 'parse')]));
}

const [violations, lint] = await Promise.all([cruiseFixture(), lintFixture()]);

describe('conformance', () => {
  const from = (rule: string, module: string): ReadonlyArray<string> =>
    violations.filter((v) => v.rule === rule && v.from === `src/${module}.ts`).map((v) => v.to);
  // The baseline's rules that ESLint reported for a module, leaving out the type-aware rules a fixture trips by
  // breaking another rule on purpose.
  const reported = (rule: string, module: string): number => (lint.get(`src/${module}.ts`) ?? []).filter((r) => r === rule).length;

  it('core-imports-only-core', () => {
    expect(from('core-is-pure', 'core/importsOrchestrator')).toEqual(['src/orchestrators/app.ts']);
    expect(from('core-is-pure', 'core/usesPure')).toEqual([]);
  });

  it('core-performs-no-effects', () => {
    expect(from('core-is-pure', 'core/importsNode')).toEqual(['fs']);
    expect(reported('ts-baseline/no-effects', 'core/globals')).toBe(4);
    expect(reported('ts-baseline/no-effects', 'core/moduleState')).toBe(1);
    expect(reported('ts-baseline/no-effects', 'core/pure')).toBe(0);
  });

  it('core-performs-no-effects misses a mutable const', () => {
    expect(lint.get('src/core/mutableConst.ts')).toEqual([]);
  });

  it('core-libraries-are-pure', () => {
    expect(from('core-is-pure', 'core/importsLibrary')).toEqual([expect.stringContaining('/node_modules/yaml/')]);
  });

  it('every-unit-has-one-role', () => {
    expect(from('core-is-pure', 'core/pure')).toEqual([]);
    expect(from('core-is-pure', 'orchestrators/app')).toEqual([]);
    expect(reported('ts-baseline/no-effects', 'adapters/driven/clock')).toBe(0);
    expect(reported('ts-baseline/no-effects', 'main')).toBe(0);
    expect(reported('ts-baseline/no-configuration', 'main')).toBe(0);
    expect(reported('max-lines-per-function', 'core/pure')).toBe(0);
    expect(reported('no-restricted-syntax', 'adapters/unplaced')).toBe(1);
    expect(reported('no-restricted-syntax', 'adapters/driven/clock')).toBe(0);
    expect(reported('no-restricted-syntax', 'adapters/driving/server')).toBe(0);
  });

  it('orchestrator-imports-no-adapter', () => {
    expect(from('orchestrators-import-no-adapter', 'orchestrators/importsAdapter')).toEqual(['src/adapters/driven/clock.ts']);
    expect(from('orchestrators-import-no-adapter', 'orchestrators/importsDriving')).toEqual(['src/adapters/driving/server.ts']);
    expect(from('entrypoint-is-not-imported', 'orchestrators/importsEntrypoint')).toEqual(['src/main.ts']);
    expect(from('orchestrators-import-no-adapter', 'main')).toEqual([]);
  });

  it('orchestrator-performs-no-effects', () => {
    expect(from('orchestrators-are-pure', 'orchestrators/importsNode')).toEqual(['fs']);
    expect(reported('ts-baseline/no-effects', 'orchestrators/clock')).toBe(1);
    expect(from('orchestrators-are-pure', 'adapters/driven/clock')).toEqual([]);
  });

  it('driving-adapter-imports-only-core-orchestrators-and-driving-adapters', () => {
    expect(from('driving-adapters-import-no-driven-adapter', 'adapters/driving/importsDriven')).toEqual(['src/adapters/driven/clock.ts']);
    expect(from('entrypoint-is-not-imported', 'adapters/driving/importsEntrypoint')).toEqual(['src/main.ts']);
    expect(from('driving-adapters-import-no-driven-adapter', 'adapters/driving/server')).toEqual([]);
  });

  it('driven-adapter-imports-only-core-ports-and-driven-adapters', () => {
    expect(from('driven-adapters-import-only-core-and-driven-adapters', 'adapters/driven/importsOrchestrator')).toEqual([
      'src/orchestrators/app.ts',
    ]);
    expect(from('driven-adapters-import-only-core-and-driven-adapters', 'adapters/driven/importsDriving')).toEqual([
      'src/adapters/driving/server.ts',
    ]);
  });

  it('adapter-size-is-limited', () => {
    expect(reported('max-lines-per-function', 'adapters/driven/long')).toBe(1);
  });

  it('entrypoint-size-is-limited', () => {
    expect(reported('max-lines-per-function', 'main')).toBe(1);
  });

  it('only-entrypoints-read-configuration', () => {
    expect(reported('ts-baseline/no-configuration', 'core/globals')).toBe(1);
    expect(reported('ts-baseline/no-configuration', 'adapters/driven/readsEnv')).toBe(1);
  });

  it('wired-without-a-container', () => {
    expect(from('no-container', 'orchestrators/usesContainer')).toEqual(['inversify']);
  });

  it('no-import-cycles', () => {
    expect(from('no-circular', 'cycle/a')).toEqual(['src/cycle/b.ts']);
  });

  it('closed-families-are-sealed', () => {
    const file = path.join(fixture, 'src', 'design', 'outsideTheUnion.ts');
    const program = ts.createProgram([file], {
      strict: true,
      noEmit: true,
      module: ts.ModuleKind.NodeNext,
      allowImportingTsExtensions: true,
    });
    const errors = ts.getPreEmitDiagnostics(program).map((d) => d.code);
    expect(errors).toContain(2322);
    expect(reported('no-restricted-syntax', 'design/anEnum')).toBe(1);
  });

  it('matches-on-closed-families-are-exhaustive', () => {
    expect(reported('@typescript-eslint/switch-exhaustiveness-check', 'design/missingCase')).toBe(1);
    expect(reported('@typescript-eslint/switch-exhaustiveness-check', 'design/exhaustive')).toBe(0);
  });

  it('matches-on-closed-families-have-no-default-arm', () => {
    expect(reported('@typescript-eslint/switch-exhaustiveness-check', 'design/defaultForTheRest')).toBe(1);
    expect(reported('@typescript-eslint/switch-exhaustiveness-check', 'design/defaultWithEveryCase')).toBe(1);
  });

  it('classes-extend-only-allowed-bases', () => {
    expect(reported('no-restricted-syntax', 'design/extendsProjectClass')).toBe(1);
    expect(reported('no-restricted-syntax', 'design/extendsAbstractClass')).toBe(1);
    expect(reported('no-restricted-syntax', 'design/extendsLibraryClass')).toBe(1);
    expect(lint.get('src/design/extendsError.ts')).toEqual([]);
  });

  it('no-parameter-default-values', () => {
    expect(reported('no-restricted-syntax', 'design/defaults')).toBe(3);
  });

  it('no-optional-parameters', () => {
    expect(reported('no-restricted-syntax', 'design/optional')).toBe(1);
  });

  it('returned-failures-are-used', () => {
    expect(reported('ts-baseline/no-unused-result', 'design/dropsResult')).toBe(1);
    expect(reported('@typescript-eslint/no-unused-vars', 'design/dropsResult')).toBe(1);
  });

  it('returned-failures-are-used misses a dropped sentinel', () => {
    expect(lint.get('src/design/dropsSentinel.ts')).toEqual([]);
  });

  it('check-fails-on-unformatted-files', async () => {
    const config = path.join(import.meta.dirname, '..', '..', 'prettier.json');
    const options = { ...(await prettier.resolveConfig(config, { config })), parser: 'typescript' };
    expect(await prettier.check('export const greet = (name: string): string => `hello ${name}`;\n', options)).toBe(true);
    expect(await prettier.check('export const greet = (name : string) : string=>{\n    return "hello " + name\n}\n', options)).toBe(false);
  });
});
