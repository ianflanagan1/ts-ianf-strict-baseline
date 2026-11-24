import path from 'node:path';
import { cruise, type IViolation } from 'dependency-cruiser';
import { ESLint } from 'eslint';
import prettier from 'prettier';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import baseline from '../../dependency-cruiser.js';
import { baseline as eslintBaseline } from '../adapters/driving/eslint.ts';
import { findProblems } from '../core/findProblems.ts';
import { aConformingProject } from '../testing/aProject.ts';

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

// The codes of the errors the type checker reports for a module, under strict.
function typeErrors(module: string): ReadonlyArray<number> {
  const program = ts.createProgram([path.join(fixture, 'src', `${module}.ts`)], {
    strict: true,
    noEmit: true,
    module: ts.ModuleKind.NodeNext,
    allowImportingTsExtensions: true,
  });
  return ts.getPreEmitDiagnostics(program).map((d) => d.code);
}

const [violations, lint] = await Promise.all([cruiseFixture(), lintFixture()]);

describe('conformance', () => {
  const from = (rule: string, module: string): ReadonlyArray<string> =>
    violations.filter((v) => v.rule === rule && v.from === `src/${module}.ts`).map((v) => v.to);
  // Every dependency rule a module breaks.
  const broken = (module: string): ReadonlyArray<string> => violations.filter((v) => v.from === `src/${module}.ts`).map((v) => v.rule);
  // The baseline's rules that ESLint reported for a module, leaving out the type-aware rules a fixture trips by
  // breaking another rule on purpose.
  const reported = (rule: string, module: string): number => (lint.get(`src/${module}.ts`) ?? []).filter((r) => r === rule).length;
  // Whether no check, of dependencies or of code, reports a module.
  const passes = (module: string): boolean => broken(module).length === 0 && lint.get(`src/${module}.ts`)?.length === 0;

  // Architecture

  it('core-references-only-core', () => {
    expect(from('core-is-pure', 'core/importsOrchestrator')).toEqual(['src/orchestrators/app.ts']);
    expect(from('core-is-pure', 'core/importsPort')).toEqual(['src/orchestrators/countOrders.ts']);
    expect(from('core-is-pure', 'core/importsAdapter')).toEqual(['src/adapters/driven/clock.ts']);
    expect(from('core-is-pure', 'core/importsEntrypoint')).toEqual(['src/main.ts']);
    expect(from('core-is-pure', 'core/usesPure')).toEqual([]);
    expect(from('core-is-pure', 'core/importsTr46')).toEqual([]);
  });

  it('core-references-only-core misses a name another module declares globally', () => {
    expect(passes('core/usesGlobal')).toBe(true);
  });

  it('core-does-nothing-impure', () => {
    expect(reported('ts-ianf-strict-baseline/imports-reach-nothing-impure', 'core/importsNode')).toBe(1);
    expect(reported('ts-ianf-strict-baseline/no-effects', 'core/globals')).toBe(5);
    expect(reported('ts-ianf-strict-baseline/no-effects', 'core/moduleState')).toBe(1);
    expect(reported('ts-ianf-strict-baseline/no-effects', 'core/seasonReadsClock')).toBe(1);
    expect(reported('ts-ianf-strict-baseline/no-effects', 'core/pure')).toBe(0);
  });

  it('core-does-nothing-impure misses a mutable const', () => {
    expect(lint.get('src/core/mutableConst.ts')).toEqual([]);
  });

  it('core-does-nothing-impure misses a time in the local time zone', () => {
    expect(lint.get('src/core/localTime.ts')).toEqual([]);
  });

  it('core-calls-reach-nothing-impure', () => {
    // yaml is the real package ts-ianf-strict-baseline installs, which calls process.emitWarning.
    for (const module of [
      'importsLibrary',
      'importsTimeStamper',
      'importsCache',
      'importsByComputedName',
      'importsEval',
      'importsFileReader',
    ]) {
      expect(reported('ts-ianf-strict-baseline/imports-reach-nothing-impure', `core/${module}`), module).toBe(1);
    }
    for (const module of ['importsTr46', 'importsPunycode', 'importsCallbackApplier']) {
      expect(reported('ts-ianf-strict-baseline/imports-reach-nothing-impure', `core/${module}`), module).toBe(0);
    }
  });

  it('core-loading-does-nothing-impure', () => {
    expect(reported('ts-ianf-strict-baseline/imports-reach-nothing-impure', 'core/importsEnvReader')).toBe(1);
    expect(reported('ts-ianf-strict-baseline/imports-reach-nothing-impure', 'core/importsTr46')).toBe(0);
  });

  it('every-declaration-has-one-role', () => {
    expect(from('core-is-pure', 'core/pure')).toEqual([]);
    expect(from('core-is-pure', 'orchestrators/app')).toEqual([]);
    expect(reported('ts-ianf-strict-baseline/no-effects', 'adapters/driven/clock')).toBe(0);
    expect(reported('ts-ianf-strict-baseline/no-effects', 'main')).toBe(0);
    expect(reported('ts-ianf-strict-baseline/no-configuration', 'main')).toBe(0);
    expect(reported('max-lines-per-function', 'core/pure')).toBe(0);
    expect(reported('no-restricted-syntax', 'adapters/unplaced')).toBe(1);
    expect(reported('no-restricted-syntax', 'app/stray')).toBe(1);
    expect(reported('no-restricted-syntax', 'adapters/driven/clock')).toBe(0);
    expect(reported('no-restricted-syntax', 'adapters/driving/server')).toBe(0);
    expect(reported('no-restricted-syntax', 'fakes/fakeOrders')).toBe(0);
    expect(reported('no-restricted-syntax', 'testing/assertOrders')).toBe(0);
    expect(broken('testing/assertOrders')).toEqual([]);
    expect(from('test-code-imports-no-adapter', 'testing/importsAdapter')).toEqual(['src/adapters/driven/clock.ts']);
    expect(from('only-tests-import-fakes-and-test-code', 'core/importsTesting')).toEqual(['src/testing/assertOrders.ts']);
  });

  it('fake-code-references-only-ports-values-and-fakes', () => {
    expect(broken('fakes/fakeOrders')).toEqual([]);
    expect(from('fakes-import-only-core-orchestrators-and-fakes', 'fakes/importsAdapter')).toEqual(['src/adapters/driven/clock.ts']);
  });

  it('only-test-code-references-fake-code', () => {
    expect(from('only-tests-import-fakes-and-test-code', 'orchestrators/usesFake')).toEqual(['src/fakes/fakeOrders.ts']);
    expect(from('only-tests-import-fakes-and-test-code', 'adapters/driven/fallsBackToFake')).toEqual(['src/fakes/fakeOrders.ts']);
    expect(from('only-tests-import-fakes-and-test-code', 'testing/assertOrders')).toEqual([]);
  });

  it('a-unit-of-code-holds-one-role', () => {
    expect(reported('ts-ianf-strict-baseline/imports-reach-nothing-impure', 'core/storeAndDecision')).toBe(1);
  });

  it('a-unit-of-code-holds-one-role misses a module whose directory allows both', () => {
    expect(passes('adapters/driven/storeAndDecision')).toBe(true);
  });

  it('adapters-and-entrypoints-perform-only-their-roles-operations', () => {
    expect(reported('ts-ianf-strict-baseline/no-configuration', 'adapters/driven/readsEnv')).toBe(1);
    expect(reported('ts-ianf-strict-baseline/no-configuration', 'adapters/driving/readsArgv')).toBe(1);
  });

  it('driving-adapter-code-references-only-orchestrators-and-the-core', () => {
    expect(from('driving-adapters-import-no-driven-adapter', 'adapters/driving/importsDriven')).toEqual(['src/adapters/driven/clock.ts']);
    expect(from('entrypoint-is-not-imported', 'adapters/driving/importsEntrypoint')).toEqual(['src/main.ts']);
    expect(from('driving-adapters-import-no-driven-adapter', 'adapters/driving/server')).toEqual([]);
  });

  it('driving-adapter-code-references-only-orchestrators-and-the-core misses a port', () => {
    expect(passes('adapters/driving/importsPort')).toBe(true);
  });

  it('driven-adapter-code-references-only-ports-and-values', () => {
    expect(from('driven-adapters-import-only-core-and-driven-adapters', 'adapters/driven/importsOrchestrator')).toEqual([
      'src/orchestrators/app.ts',
    ]);
    expect(from('driven-adapters-import-only-core-and-driven-adapters', 'adapters/driven/importsDriving')).toEqual([
      'src/adapters/driving/server.ts',
    ]);
    expect(from('entrypoint-is-not-imported', 'adapters/driven/importsEntrypoint')).toEqual(['src/main.ts']);
  });

  it('driven-adapter-code-references-only-ports-and-values misses a call to a decision', () => {
    expect(passes('adapters/driven/callsDecision')).toBe(true);
  });

  it('adapter-code-function-size-is-limited', () => {
    expect(reported('max-lines-per-function', 'adapters/driven/long')).toBe(1);
  });

  it('only-entrypoint-code-reads-configuration', () => {
    expect(reported('ts-ianf-strict-baseline/no-configuration', 'core/globals')).toBe(1);
    expect(reported('ts-ianf-strict-baseline/no-configuration', 'adapters/driven/readsEnv')).toBe(1);
    expect(reported('ts-ianf-strict-baseline/no-configuration', 'adapters/driving/readsArgv')).toBe(1);
  });

  it('only-entrypoint-code-reads-configuration misses a process that is imported', () => {
    expect(passes('adapters/driven/readsEnvThroughImport')).toBe(true);
  });

  it('entrypoint-code-function-size-is-limited', () => {
    expect(reported('max-lines-per-function', 'main')).toBe(1);
  });

  it('entrypoint-code-wires-without-a-container', () => {
    expect(from('no-container', 'orchestrators/usesContainer')).toEqual(['inversify']);
  });

  it('no-reference-cycles', () => {
    expect(from('no-circular', 'core/cycle/a')).toEqual(['src/core/cycle/b.ts']);
    expect(from('no-circular', 'core/cycle/label')).toEqual(['src/core/cycle/union.ts']);
  });

  it('nothing-sleeps', () => {
    expect(reported('ts-ianf-strict-baseline/no-effects', 'core/sleeps')).toBe(1);
  });

  it('nothing-sleeps misses an adapter that sleeps', () => {
    expect(passes('adapters/driven/sleeps')).toBe(true);
  });

  it('orchestrator-code-references-no-entrypoint-or-adapter-code', () => {
    expect(from('orchestrators-import-no-adapter', 'orchestrators/importsAdapter')).toEqual(['src/adapters/driven/clock.ts']);
    expect(from('orchestrators-import-no-adapter', 'orchestrators/importsDriving')).toEqual(['src/adapters/driving/server.ts']);
    expect(from('entrypoint-is-not-imported', 'orchestrators/importsEntrypoint')).toEqual(['src/main.ts']);
    expect(from('orchestrators-import-no-adapter', 'main')).toEqual([]);
  });

  it('orchestrator-code-performs-no-effects', () => {
    expect(from('orchestrators-are-pure', 'orchestrators/importsNode')).toEqual(['fs']);
    expect(reported('ts-ianf-strict-baseline/no-effects', 'orchestrators/clock')).toBe(1);
    expect(from('orchestrators-are-pure', 'adapters/driven/clock')).toEqual([]);
  });

  it('port-methods-take-and-return-signature-types', () => {
    expect(reported('@typescript-eslint/no-explicit-any', 'orchestrators/portTakesAny')).toBe(1);
  });

  it('port-methods-take-and-return-signature-types misses a callback, an unknown and a map', () => {
    expect(passes('orchestrators/portTakesCallback')).toBe(true);
  });

  // Design

  it('closed-families-are-sealed', () => {
    expect(typeErrors('core/design/outsideTheUnion')).toContain(2322);
    expect(reported('no-restricted-syntax', 'core/design/anEnum')).toBe(1);
  });

  it('matches-on-closed-families-are-exhaustive', () => {
    expect(reported('@typescript-eslint/switch-exhaustiveness-check', 'core/design/missingCase')).toBe(1);
    expect(reported('@typescript-eslint/switch-exhaustiveness-check', 'core/design/exhaustive')).toBe(0);
  });

  it('matches-on-closed-families-have-no-default-arm', () => {
    expect(reported('@typescript-eslint/switch-exhaustiveness-check', 'core/design/defaultForTheRest')).toBe(1);
    expect(reported('@typescript-eslint/switch-exhaustiveness-check', 'core/design/defaultThatThrows')).toBe(1);
    expect(reported('@typescript-eslint/switch-exhaustiveness-check', 'core/design/defaultWithEveryCase')).toBe(1);
  });

  it('no-code-is-run-from-text', () => {
    expect(reported('@typescript-eslint/no-implied-eval', 'core/design/runsText')).toBe(2);
  });

  it('no-code-is-run-from-text misses eval', () => {
    expect(lint.get('src/core/design/evals.ts')).toEqual([]);
  });

  it('visibility-is-not-bypassed', () => {
    expect(reported('@typescript-eslint/dot-notation', 'core/design/elementAccess')).toBe(1);
  });

  it('visibility-is-not-bypassed misses a key held in a constant', () => {
    expect(lint.get('src/core/design/elementAccessByConstant.ts')).toEqual([]);
    expect(typeErrors('core/design/elementAccessByConstant')).toEqual([]);
  });

  it('loops-compute-no-value-an-operation-names', () => {
    expect(reported('no-restricted-syntax', 'core/design/loopCounter')).toBe(2);
  });

  it('loops-compute-no-value-an-operation-names misses a loop that fills a list', () => {
    expect(lint.get('src/core/design/loopFillsList.ts')).toEqual([]);
  });

  it('collection-operations-take-pure-functions', () => {
    expect(reported('no-restricted-syntax', 'core/design/countingCallback')).toBe(1);
  });

  it('collection-operations-take-pure-functions misses forEach with an effect', () => {
    expect(passes('adapters/driven/forEachWithEffect')).toBe(true);
  });

  it('parameters-are-typed', () => {
    expect(typeErrors('core/design/untypedParameter')).toEqual([7006]);
  });

  it('fields-are-typed', () => {
    expect(typeErrors('core/design/untypedField')).toEqual([7008]);
  });

  it('classes-extend-only-allowed-bases', () => {
    expect(reported('no-restricted-syntax', 'core/design/extendsProjectClass')).toBe(1);
    expect(reported('no-restricted-syntax', 'core/design/extendsAbstractClass')).toBe(1);
    expect(reported('no-restricted-syntax', 'core/design/extendsLibraryClass')).toBe(1);
    expect(lint.get('src/core/design/extendsError.ts')).toEqual([]);
  });

  it('types-declare-every-method-they-have', () => {
    expect(reported('no-restricted-syntax', 'core/design/extendsMixin')).toBe(2);
  });

  it('no-parameter-default-values', () => {
    expect(reported('no-restricted-syntax', 'core/design/defaults')).toBe(3);
  });

  it('no-optional-parameters', () => {
    expect(reported('no-restricted-syntax', 'core/design/optional')).toBe(1);
  });

  it('core-type-fields-are-not-nullable', () => {
    expect(reported('no-restricted-syntax', 'core/design/optionalProperty')).toBe(1);
  });

  it('core-type-fields-are-not-nullable misses a null, an undefined and an optional field of a class', () => {
    expect(lint.get('src/core/design/nullableField.ts')).toEqual([]);
    expect(lint.get('src/core/design/optionalClassField.ts')).toEqual([]);
  });

  it('parameters-are-not-reassigned', () => {
    for (const module of ['assignedParameter', 'compoundParameter', 'incrementedParameter', 'defaultedParameter', 'closureParameter']) {
      expect(reported('no-param-reassign', `core/design/${module}`), module).toBe(1);
    }
  });

  it('locals-are-declared-constant', () => {
    for (const module of ['reassignedLocal', 'neverReassignedLet', 'varLocal', 'assignedInBranches', 'assignedInTry', 'suiteState']) {
      expect(reported('no-restricted-syntax', `core/design/${module}`), module).toBe(1);
    }
    expect(reported('no-restricted-syntax', 'core/design/loopCounter')).toBe(2);
  });

  it('fields-are-declared-read-only', () => {
    expect(reported('@typescript-eslint/prefer-readonly', 'core/design/mutableField')).toBe(1);
  });

  it('no-type-turns-checking-off', () => {
    expect(reported('@typescript-eslint/no-explicit-any', 'core/design/anyParameter')).toBe(1);
    expect(reported('@typescript-eslint/no-explicit-any', 'core/design/anyField')).toBe(1);
    expect(reported('@typescript-eslint/no-unsafe-assignment', 'core/design/parsedThroughAny')).toBe(1);
    expect(reported('@typescript-eslint/no-unsafe-function-type', 'core/design/functionType')).toBe(1);
  });

  it('no-cast-asserts-an-unchecked-type', () => {
    expect(reported('@typescript-eslint/no-non-null-assertion', 'core/design/nonNullAssertion')).toBe(1);
  });

  it('no-cast-asserts-an-unchecked-type misses a cast', () => {
    expect(lint.get('src/core/design/asCast.ts')).toEqual([]);
  });

  // Errors

  it('error-types-of-other-roles-are-not-matched', () => {
    expect(from('driving-adapters-import-no-driven-adapter', 'adapters/driving/matchesDrivenError')).toEqual([
      'src/adapters/driven/notFound.ts',
    ]);
  });

  it('returned-failures-are-used', () => {
    expect(reported('ts-ianf-strict-baseline/no-unused-result', 'core/design/dropsResult')).toBe(1);
    expect(reported('@typescript-eslint/no-unused-vars', 'core/design/dropsResult')).toBe(1);
  });

  it('returned-failures-are-used misses a dropped sentinel', () => {
    expect(lint.get('src/core/design/dropsSentinel.ts')).toEqual([]);
  });

  it('failure-branches-act', () => {
    expect(reported('no-empty', 'core/design/emptyFailureBranch')).toBe(2);
  });

  it('failure-branches-act misses a branch that holds a comment or returns success', () => {
    expect(lint.get('src/core/design/commentedFailureBranch.ts')).toEqual([]);
  });

  // Project

  it('type-checker-runs-at-its-strictest misses an option of strict turned off by itself', () => {
    expect(findProblems(aConformingProject().withCompilerOption('strictNullChecks', false).build())).toEqual([]);
  });

  it('baseline-settings-are-not-weakened misses a rule verify does not list', () => {
    const facts = aConformingProject().withEslintRule('@typescript-eslint/no-explicit-any', { severity: 'off', options: [] }).build();
    expect(findProblems(facts)).toEqual([]);
  });

  it('checks-are-not-suppressed', () => {
    expect(reported('@typescript-eslint/ban-ts-comment', 'core/design/suppressed')).toBe(1);
    expect(reported('@typescript-eslint/ban-ts-comment', 'core/design/unchecked')).toBe(1);
  });

  it('checks-are-not-suppressed misses a described suppression and an ESLint directive', () => {
    expect(lint.get('src/core/design/suppressedWithReason.ts')).toEqual([]);
  });

  // Testing

  it('no-mocking-libraries', () => {
    expect(reported('no-restricted-properties', 'orchestrators/spiesOnPort.test')).toBe(1);
  });

  it('no-mocking-libraries misses a stub made of vi.fn functions', () => {
    expect(lint.get('src/orchestrators/stubsPort.test.ts')).toEqual([]);
  });

  // Formatting

  it('check-fails-on-unformatted-files', async () => {
    const config = path.join(import.meta.dirname, '..', '..', 'prettier.json');
    const options = { ...(await prettier.resolveConfig(config, { config })), parser: 'typescript' };
    expect(await prettier.check('export const greet = (name: string): string => `hello ${name}`;\n', options)).toBe(true);
    expect(await prettier.check('export const greet = (name : string) : string=>{\n    return "hello " + name\n}\n', options)).toBe(false);
  });
});
