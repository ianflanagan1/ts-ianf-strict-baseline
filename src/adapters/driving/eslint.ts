import { defineConfig } from 'eslint/config';
import type { Linter } from 'eslint';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import { bannedSyntax } from '../../core/bannedSyntax.ts';
import { importsReachNothingImpure } from './importsReachNothingImpure.ts';
import { noConfiguration } from './noConfiguration.ts';
import { noEffects } from './noEffects.ts';
import { noUnusedResult } from './noUnusedResult.ts';

export { bannedSyntax };

// A module's path decides its role. The core is src/core/, orchestrators are src/orchestrators/, driving adapters
// are src/adapters/driving/, driven adapters are src/adapters/driven/ and the entrypoint is src/main.ts. Fakes are
// src/fakes/, and test code a project ships for the tests of projects that depend on it is src/testing/. Any other
// module under src/ has no role, and is reported. Tests have no role, and may do anything.
// COUPLED:ts-roles: eslint. The paths of each role, and a probe file for each
const sources = ['src/**/*.ts', 'src/**/*.tsx'];
const tests = ['**/*.test.ts', '**/*.test.tsx'];
const core = ['src/core/**'];
const orchestrators = ['src/orchestrators/**'];
const adapters = ['src/adapters/driving/**', 'src/adapters/driven/**'];
const entrypoint = ['src/main.ts', 'src/main.tsx'];
const fakes = ['src/fakes/**'];
const testCode = ['src/testing/**'];
// COUPLED:ts-roles:END

// The rules every module is held to, wherever it is.
const everywhere: Linter.RulesRecord = {
  'ts-ianf-strict-baseline/no-unused-result': 'error',
  '@typescript-eslint/switch-exhaustiveness-check': [
    'error',
    { considerDefaultExhaustiveForUnions: false, allowDefaultCaseForExhaustiveSwitch: false, requireDefaultForNonUnion: false },
  ],
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/only-throw-error': 'error',
  '@typescript-eslint/prefer-readonly': 'error',
  '@typescript-eslint/no-unnecessary-condition': 'error',
  '@typescript-eslint/consistent-type-imports': 'error',
  // Ports are interfaces and variant families are types, so neither form is preferred everywhere.
  '@typescript-eslint/consistent-type-definitions': 'off',
  '@typescript-eslint/array-type': ['error', { default: 'array', readonly: 'generic' }],
  '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true, allowBoolean: true }],
  'no-restricted-syntax': ['error', ...bannedSyntax],
  // A parameter holds the argument it was given for the whole function.
  'no-param-reassign': ['error', { props: false }],
  // An underscore marks a name bound only to leave it out, as when a rest pattern drops fields.
  '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_', ignoreRestSiblings: true }],
  // Modified complexity counts a switch once: exhaustive switches over closed families grow with the family, not with risk.
  complexity: ['warn', { max: 10, variant: 'modified' }],
  'max-depth': ['warn', 3],
  'max-params': ['warn', 3],
};

// The rules each role adds, by its paths.
const roleBlocks: Linter.Config[] = [
  // The core and the orchestrators reach the outside only through ports.
  { files: [...core, ...orchestrators], ignores: tests, rules: { 'ts-ianf-strict-baseline/no-effects': 'error' } },
  // What the core imports from outside it does nothing impure, at any depth.
  { files: core, ignores: tests, rules: { 'ts-ianf-strict-baseline/imports-reach-nothing-impure': 'error' } },
  // Only the entrypoint reads configuration, and passes the values in.
  { files: sources, ignores: [...entrypoint, ...tests], rules: { 'ts-ianf-strict-baseline/no-configuration': 'error' } },
  // Adapters and the entrypoint stay small enough that no decision can hide in them.
  { files: [...adapters, ...entrypoint], ignores: tests, rules: { 'max-lines-per-function': ['error', { max: 50 }] } },
  // A module under src/ in none of the roles' directories has no role.
  {
    files: sources,
    ignores: [...core, ...orchestrators, ...adapters, ...entrypoint, ...fakes, ...testCode, ...tests],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...bannedSyntax,
        {
          selector: 'Program',
          message:
            "This module has no role: move it to src/core/ if it decides, src/orchestrators/ if it runs a use case, src/adapters/driving/ if it turns calls from outside into calls to orchestrators, src/adapters/driven/ if it implements a port, src/fakes/ if it is a port's fake, or src/testing/ if it is test code other projects' tests import.",
        },
      ],
    },
  },
];

const testBlock: Linter.Config = {
  files: tests,
  rules: {
    'no-restricted-properties': [
      'error',
      { object: 'vi', property: 'mock', message: 'Pass a fake in through a port instead.' },
      { object: 'vi', property: 'spyOn', message: 'Pass a fake in through a port instead.' },
      { object: 'vi', property: 'useFakeTimers', message: 'Take time from a clock port and pass a fixed clock.' },
      { object: 'vi', property: 'setSystemTime', message: 'Take time from a clock port and pass a fixed clock.' },
    ],
    // Builders and test helpers are stateless functions, so a test may pass several values to them.
    'max-params': 'off',
  },
};

// The baseline's own rules, by the names the plugin registers.
const ownRules = {
  'no-unused-result': noUnusedResult,
  'no-effects': noEffects,
  'no-configuration': noConfiguration,
  'imports-reach-nothing-impure': importsReachNothingImpure,
};

// The baseline for a TypeScript project whose tsconfig is in `tsconfigRootDir`. A project adds its own blocks after
// it, such as ignores and import restrictions for its core.
export function baseline(tsconfigRootDir: string): Linter.Config[] {
  return defineConfig(
    { ignores: ['**/node_modules/', '**/dist/', '**/.devbox/', '**/coverage/'] },
    js.configs.recommended,
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    {
      languageOptions: { parserOptions: { projectService: true, tsconfigRootDir } },
      plugins: {
        // typescript-eslint 8 types rules against ESLint 9's RuleContext, which ESLint 10 changed; the rule runs fine.
        // @ts-expect-error -- remove once typescript-eslint's rule types match ESLint 10.
        'ts-ianf-strict-baseline': { rules: ownRules },
      },
      rules: everywhere,
    },
    ...roleBlocks,
    {
      files: ['**/*.tsx', '**/*.jsx'],
      plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
      rules: {
        ...jsxA11y.flatConfigs.recommended.rules,
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'error',
      },
    },
    testBlock,
  );
}
