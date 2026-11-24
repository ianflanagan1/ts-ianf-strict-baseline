import { bannedSyntax } from './bannedSyntax.ts';

export type Severity = 'off' | 'warn' | 'error';

export type RuleSetting = { readonly severity: Severity; readonly options: ReadonlyArray<unknown> };

// The package names devbox.json pins, without their versions, and the scripts it defines.
export type DevboxFacts = { readonly packages: ReadonlyArray<string>; readonly scripts: ReadonlyArray<string> };

// The namespace the project includes the baseline's Taskfile under, the tasks the include leaves out, and whether
// the included tasks run in the project root, as they do unless the include sets `dir`.
export type BaselineInclude = {
  readonly namespace: string;
  readonly excludes: ReadonlyArray<string>;
  readonly runsInProjectRoot: boolean;
};

// Each task the Taskfile defines, with the tasks it runs through its cmds and deps.
export type TaskfileFacts = {
  readonly tasks: Readonly<Record<string, ReadonlyArray<string>>>;
  readonly baselineInclude: BaselineInclude | null;
};

// The roles the ESLint baseline gives a module, by its path.
export type Role = 'core' | 'orchestrator' | 'driving-adapter' | 'driven-adapter' | 'entrypoint';

// The ESLint rules that apply to a file in each role, by role.
export type RoleRules = Readonly<Record<Role, Readonly<Record<string, RuleSetting>>>>;

// What gatherFacts found in a project. A null means the file or config wasn't there at all.
export type ProjectFacts = {
  readonly compilerOptions: Readonly<Record<string, unknown>> | null;
  readonly eslintRules: Readonly<Record<string, RuleSetting>> | null;
  readonly eslintRoleRules: RoleRules | null;
  readonly prettierOptions: Readonly<Record<string, unknown>> | null;
  readonly expectedPrettierOptions: Readonly<Record<string, unknown>>;
  readonly devbox: DevboxFacts | null;
  readonly taskfile: TaskfileFacts | null;
  readonly dependencyCruiserRules: Readonly<Record<string, Severity>> | null;
  readonly packageName: string | null;
  readonly packageManager: string | null;
  readonly devDependencies: ReadonlyArray<string>;
  readonly rootFiles: ReadonlyArray<string>;
  readonly gitignore: ReadonlyArray<string> | null;
};

const requiredCompilerOptions = [
  'strict',
  'noUncheckedIndexedAccess',
  'exactOptionalPropertyTypes',
  'noImplicitReturns',
  'noImplicitOverride',
  'noFallthroughCasesInSwitch',
  'verbatimModuleSyntax',
];

const requiredErrorRules = [
  'ts-ianf-strict-baseline/no-unused-result',
  '@typescript-eslint/switch-exhaustiveness-check',
  '@typescript-eslint/no-floating-promises',
  '@typescript-eslint/only-throw-error',
  '@typescript-eslint/no-unnecessary-condition',
  '@typescript-eslint/prefer-readonly',
  'no-param-reassign',
  'no-restricted-syntax',
];

// The rules the baseline turns on for each role, and where that role's files are.
const requiredRoleRules: ReadonlyArray<{ readonly role: Role; readonly where: string; readonly rules: ReadonlyArray<string> }> = [
  {
    role: 'core',
    where: 'src/core/',
    rules: [
      'ts-ianf-strict-baseline/no-effects',
      'ts-ianf-strict-baseline/imports-reach-nothing-impure',
      'ts-ianf-strict-baseline/no-configuration',
    ],
  },
  {
    role: 'orchestrator',
    where: 'src/orchestrators/',
    rules: ['ts-ianf-strict-baseline/no-effects', 'ts-ianf-strict-baseline/no-configuration'],
  },
  {
    role: 'driving-adapter',
    where: 'src/adapters/driving/',
    rules: ['ts-ianf-strict-baseline/no-configuration', 'max-lines-per-function'],
  },
  { role: 'driven-adapter', where: 'src/adapters/driven/', rules: ['ts-ianf-strict-baseline/no-configuration', 'max-lines-per-function'] },
  { role: 'entrypoint', where: 'src/main.ts', rules: ['max-lines-per-function'] },
];

const requiredTasks = ['setup', 'check', 'format', 'lint-file'];

// The project's task of each name must run the baseline's, so the commands come from the package.
const sharedTasks = ['check', 'format', 'lint-file'];

const baselineTaskfile = './node_modules/@ianflanagan1/ts-ianf-strict-baseline/Taskfile.baseline.yml';

const requiredDependencyRules = [
  'core-is-pure',
  'orchestrators-import-no-adapter',
  'orchestrators-are-pure',
  'driving-adapters-import-no-driven-adapter',
  'driven-adapters-import-only-core-and-driven-adapters',
  'entrypoint-is-not-imported',
  'only-tests-import-fakes-and-test-code',
  'fakes-import-only-core-orchestrators-and-fakes',
  'test-code-imports-no-adapter',
  'no-container',
  'no-circular',
];

const requiredDevDependencies = ['@ianflanagan1/ts-ianf-strict-baseline', 'dependency-cruiser', 'knip', 'vitest'];

// Each entry is satisfied by any one of its files.
const requiredRootFiles: ReadonlyArray<{ readonly what: string; readonly anyOf: ReadonlyArray<string> }> = [
  { what: 'a committed lockfile', anyOf: ['pnpm-lock.yaml', 'package-lock.json'] },
  { what: 'a knip config', anyOf: ['knip.json', 'knip.jsonc', '.knip.json', 'knip.config.ts'] },
];

// The .gitignore line for the directory every project's tools keep their caches in.
// COUPLED:tool-cache-dir:[=; //github.com/ianflanagan1/code-rulebook/rulebook/setups/ianf-strict/rules/project/tool-caches-are-ignored.yaml; //github.com/ianflanagan1/code-rulebook/rulebook/setups/ianf-strict/baselines.md;
// //github.com/ianflanagan1/go-ianf-strict-baseline/internal/core/baseline/baseline.go; //github.com/ianflanagan1/php-ianf-strict-baseline/src/Core/ProjectProblems.php]
const cacheIgnore = '/cache/';

// Every way the project falls short of the baseline, each phrased as what to change.
export function findProblems(facts: ProjectFacts): ReadonlyArray<string> {
  return [
    ...compilerOptionProblems(facts.compilerOptions),
    ...eslintProblems(facts.eslintRules),
    ...roleProblems(facts.eslintRoleRules),
    ...prettierProblems(facts.prettierOptions, facts.expectedPrettierOptions),
    ...devboxProblems(facts.devbox),
    ...taskfileProblems(facts.taskfile),
    ...dependencyCruiserProblems(facts.dependencyCruiserRules),
    ...packageProblems(facts),
    ...gitignoreProblems(facts.gitignore),
  ];
}

function compilerOptionProblems(options: Readonly<Record<string, unknown>> | null): ReadonlyArray<string> {
  if (options === null) {
    return ['No tsconfig.json at the project root: add one that extends @ianflanagan1/ts-ianf-strict-baseline/tsconfig.json.'];
  }
  return requiredCompilerOptions
    .filter((name) => options[name] !== true)
    .map((name) => `tsconfig.json: \`${name}\` must be true, as it is in @ianflanagan1/ts-ianf-strict-baseline/tsconfig.json.`);
}

function eslintProblems(rules: Readonly<Record<string, RuleSetting>> | null): ReadonlyArray<string> {
  if (rules === null) {
    return ['No ESLint config applies to TypeScript files: add an eslint.config.js that starts with `baseline(import.meta.dirname)`.'];
  }
  const weakened = requiredErrorRules
    .filter((name) => rules[name]?.severity !== 'error')
    .map((name) => `ESLint: \`${name}\` must be an error, as it is in the baseline.`);
  return [
    ...weakened,
    ...switchProblems(rules['@typescript-eslint/switch-exhaustiveness-check']),
    ...bannedSyntaxProblems(rules['no-restricted-syntax']),
  ];
}

function switchProblems(setting: RuleSetting | undefined): ReadonlyArray<string> {
  const options = setting?.options[0];
  const required = ['considerDefaultExhaustiveForUnions', 'allowDefaultCaseForExhaustiveSwitch'];
  return required
    .filter((name) => !isRecord(options) || options[name] !== false)
    .map((name) => `ESLint: \`@typescript-eslint/switch-exhaustiveness-check\` must set \`${name}: false\`.`);
}

function roleProblems(roleRules: RoleRules | null): ReadonlyArray<string> {
  if (roleRules === null) {
    return [];
  }
  return requiredRoleRules.flatMap(({ role, where, rules }) =>
    rules
      .filter((name) => roleRules[role][name]?.severity !== 'error')
      .map((name) => `ESLint: \`${name}\` must be an error in ${where}, as it is in the baseline.`),
  );
}

function bannedSyntaxProblems(setting: RuleSetting | undefined): ReadonlyArray<string> {
  const selectors = (setting?.options ?? []).map((entry) => (isRecord(entry) ? entry.selector : entry));
  return bannedSyntax
    .filter((ban) => !selectors.includes(ban.selector))
    .map((ban) => `ESLint: \`no-restricted-syntax\` no longer bans \`${ban.selector}\`; spread \`bannedSyntax\` into it.`);
}

function prettierProblems(
  options: Readonly<Record<string, unknown>> | null,
  expected: Readonly<Record<string, unknown>>,
): ReadonlyArray<string> {
  if (options === null) {
    return ['No Prettier config: add a .prettierrc.json containing "@ianflanagan1/ts-ianf-strict-baseline/prettier".'];
  }
  return Object.entries(expected)
    .filter(([name, value]) => options[name] !== value)
    .map(
      ([name, value]) =>
        `Prettier: \`${name}\` must be ${JSON.stringify(value)}, as it is in @ianflanagan1/ts-ianf-strict-baseline/prettier.`,
    );
}

function devboxProblems(devbox: DevboxFacts | null): ReadonlyArray<string> {
  if (devbox === null) {
    return ['No devbox.json: pin Node, the package manager and go-task in devbox.'];
  }
  const taskRunner = devbox.packages.includes('go-task') ? [] : ['devbox.json: pin go-task, which runs the Taskfile.'];
  const scripts = devbox.scripts.map((name) => `devbox.json: move the \`${name}\` script into a Taskfile task; devbox only pins tools.`);
  return [...taskRunner, ...scripts];
}

function taskfileProblems(taskfile: TaskfileFacts | null): ReadonlyArray<string> {
  if (taskfile === null) {
    return ["No Taskfile.yml: add one with setup, check, format and lint-file tasks, and include the baseline's tasks as `baseline`."];
  }
  const include = taskfile.baselineInclude;
  const namespace = include?.namespace ?? 'baseline';
  const missing = requiredTasks.filter((name) => !(name in taskfile.tasks)).map((name) => `Taskfile: add a \`${name}\` task.`);
  const notIncluded =
    include === null
      ? [`Taskfile: include the baseline's tasks: \`includes: { baseline: { taskfile: ${baselineTaskfile}, optional: true } }\`.`]
      : [];
  const elsewhere =
    include?.runsInProjectRoot === false
      ? ["Taskfile: drop `dir` from the baseline's include; its tasks check the directory they run in, which must be the project root."]
      : [];
  const excluded = sharedTasks
    .filter((name) => include?.excludes.includes(name) === true)
    .map((name) => `Taskfile: don't exclude \`${name}\` from the baseline's tasks.`);
  const notRun = sharedTasks
    .filter((name) => {
      const runs = taskfile.tasks[name];
      return runs !== undefined && !runs.includes(`${namespace}:${name}`);
    })
    .map((name) => `Taskfile: have \`${name}\` run \`task: ${namespace}:${name}\`.`);
  return [...missing, ...notIncluded, ...elsewhere, ...excluded, ...notRun];
}

function dependencyCruiserProblems(rules: Readonly<Record<string, Severity>> | null): ReadonlyArray<string> {
  if (rules === null) {
    return [
      'No dependency-cruiser config: add a .dependency-cruiser.js that extends @ianflanagan1/ts-ianf-strict-baseline/dependency-cruiser.',
    ];
  }
  return requiredDependencyRules
    .filter((name) => rules[name] !== 'error')
    .map(
      (name) => `dependency-cruiser: \`${name}\` must be an error, as it is in @ianflanagan1/ts-ianf-strict-baseline/dependency-cruiser.`,
    );
}

function packageProblems(facts: ProjectFacts): ReadonlyArray<string> {
  const manager = facts.packageManager === null ? ['package.json: pin the package manager with a `packageManager` field.'] : [];
  // The baseline package checks itself, so being it counts as depending on it.
  const dependencies = requiredDevDependencies
    .filter((name) => name !== facts.packageName && !facts.devDependencies.includes(name))
    .map((name) => `package.json: add \`${name}\` to devDependencies.`);
  const files = requiredRootFiles
    .filter((required) => !required.anyOf.some((file) => facts.rootFiles.includes(file)))
    .map((required) => `Add ${required.what} at the project root (${required.anyOf.join(' or ')}).`);
  return [...manager, ...dependencies, ...files];
}

// Git ignores a line's trailing spaces.
function gitignoreProblems(lines: ReadonlyArray<string> | null): ReadonlyArray<string> {
  if (lines === null) {
    return [`No .gitignore: add one with the line \`${cacheIgnore}\`, for the directory tools keep their caches in.`];
  }
  return lines.some((line) => line.trimEnd() === cacheIgnore)
    ? []
    : [`.gitignore: add the line \`${cacheIgnore}\`, for the directory tools keep their caches in.`];
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}
