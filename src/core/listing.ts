// How ts-ianf-strict-baseline enforces each clause of the code rulebook (github.com/ianflanagan1/code-rulebook), as
// the coverage listing the rulebook checks. rulebook-coverage.json holds it, written by `ts-ianf-strict-baseline rulebook`.

// COUPLED:coverage-listing-schema:[same-shape; //github.com/ianflanagan1/code-rulebook/schema/coverage.schema.json; //github.com/ianflanagan1/code-rulebook/internal/core/rulebook/model.go;
// //github.com/ianflanagan1/go-ianf-strict-baseline/internal/core/rulebook/rulebook.go;
// //github.com/ianflanagan1/php-ianf-strict-baseline/src/Core/RulebookListing.php] fields, check kinds and coverage levels
type Check =
  | { readonly kind: 'language' | 'custom'; readonly 'on-finding': OnFinding; readonly summary: string }
  | { readonly kind: 'tool'; readonly tool: string; readonly 'on-finding': OnFinding; readonly summary: string };

// What the baseline does with a check's findings other than fail: it sends those of a provisional clause's check to a
// person for review. Null, a finding fails.
type OnFinding = 'review' | null;

// Whether the baseline means to close a gap, for every coverage short of full. A declined check says why.
type Intent = { readonly intent: 'planned'; readonly reason: null } | { readonly intent: 'declined'; readonly reason: string };

type Claim =
  | {
      readonly coverage: 'full';
      readonly checks: ReadonlyArray<string>;
      readonly proof: ReadonlyArray<string>;
      readonly note: string | null;
    }
  | ({
      readonly coverage: 'partial';
      readonly checks: ReadonlyArray<string>;
      readonly gap: string;
      readonly proof: ReadonlyArray<string> | null;
    } & Intent)
  | ({ readonly coverage: 'convention-only'; readonly where: string } & Intent)
  | ({ readonly coverage: 'none'; readonly note: string | null } & Intent);

// The rulebook's roles, by id.
type Role = 'entrypoint' | 'driving-adapter' | 'driven-adapter' | 'port' | 'orchestrator' | 'decision' | 'value' | 'fake';

type Listing = {
  readonly language: 'typescript';
  readonly baseline: string;
  readonly roles: Readonly<Record<Role, string>>;
  readonly 'reviewed-roles': ReadonlyArray<Role>;
  readonly checks: Readonly<Record<string, Check>>;
  readonly clauses: Readonly<Record<string, Claim>>;
};
// COUPLED:coverage-listing-schema:END

const conformance = (test: string): ReadonlyArray<string> => [`src/rulebook/conformance.test.ts: ${test}`];

const verify = (test: string): string => `src/core/findProblems.test.ts: ${test}`;

const gathered = (test: string): string => `src/adapters/driven/gatherFacts.test.ts: ${test}`;

const planned: Intent = { intent: 'planned', reason: null };

const declined = (reason: string): Intent => ({ intent: 'declined', reason });

const none: Claim = { coverage: 'none', note: null, ...planned };

// A clause nothing checks, with what the checks do near it.
const noneBecause = (note: string): Claim => ({ coverage: 'none', note, ...planned });

// A clause the README's Errors section states, which nothing checks.
const errorsConvention = (intent: Intent): Claim => ({ coverage: 'convention-only', where: 'README.md, Errors', ...intent });

// No clause is provisional, so every check's finding fails.
const depcruise = (summary: string): Check => ({ kind: 'tool', tool: 'dependency-cruiser', 'on-finding': null, summary });

const eslint = (summary: string): Check => ({ kind: 'tool', tool: 'eslint', 'on-finding': null, summary });

const custom = (summary: string): Check => ({ kind: 'custom', 'on-finding': null, summary });

const language = (summary: string): Check => ({ kind: 'language', 'on-finding': null, summary });

const effectsGap =
  "A module-level const can hold a mutable object, a time is built and read in the machine's local time zone, browser globals such as window and document pass, and keeping state that changes across calls in an instance's fields (held-state) isn't detected.";

// What every check of references misses: dependency-cruiser reads imports, and a global needs none.
const globalsGap =
  "A name another module declares for every module, with declare global or in a declaration file, is referenced with no import, which dependency-cruiser doesn't see.";

// What imports-reach-nothing-impure misses in the code a package loads.
const reachGap =
  "State kept through this, as an object's method that changes its own field does, or through a local that holds a module-scope value, isn't seen, and nor is a change made by passing a module-scope value to a function other than Object.assign, Object.defineProperty and their kind, or by a method other than the mutating ones of arrays, maps and sets. Math.random reached by destructuring or a computed member passes. A method called replace, match, split or search is taken by its name for String's, so a global regular expression given to another object's method of that name passes. Totality isn't checked: a function that throws passes. ESLint's cache keeps a core module's result until that module or the config changes, so an upgraded package is read again only then, or with the cache cleared.";

// Where imports-reach-nothing-impure is stricter than the clause.
const reachConservative =
  "It reads what a module's code does, not which of its functions the core calls: one operation anywhere in a module the import loads is reported, even where nothing the core calls reaches it. Whatever it can't follow is reported rather than passed: a require or import() of a computed name, an import it can't resolve (a native addon, a tsconfig path alias or a package.json imports entry among them), code it can't parse, a feature test such as typeof window, and a callback a module runs while it loads that writes a module-scope value, which it takes for a function run later.";

const oneCoreGap = "The checks don't tell a decision from a value: the one core directory holds both.";

const noHelpers =
  'The checks tell no helper from a member: every module there counts as a member, and a helper is a function or type a module leaves unexported.';

const listing: Listing = {
  language: 'typescript',
  baseline: '@ianflanagan1/ts-ianf-strict-baseline',
  // Every role is told by where a module is, never from a declaration's own code, which every-declaration-has-one-role
  // records as its gap.
  roles: {
    entrypoint:
      "By path: the module src/main.ts or src/main.tsx, and nothing else, so the checks tell one entrypoint and no second program's. Its helpers are the functions it leaves unexported; a module of wiring that entrypoints share has no directory, and is reported as having no role.",
    'driving-adapter': `By path: every module under src/adapters/driving/. The checks don't tell a driving adapter's entry from the helpers that serve its contract, or one driving adapter from another. ${noHelpers}`,
    'driven-adapter': `By path: every module under src/adapters/driven/, whether or not anything in it implements a port. ${noHelpers}`,
    port: "Not told. A port is an interface declared in its orchestrator's module, under src/orchestrators/, and the checks hold it to what they hold orchestrator code to: nothing tells an interface that is a port from any other declaration there.",
    orchestrator: `By path: every module under src/orchestrators/, the ports declared there included. ${noHelpers}`,
    decision:
      "By path: every module under src/core/. The checks don't tell a decision from a value: the one core directory holds both, and each is held to what the core is held to.",
    value:
      "By path: every module under src/core/. The checks don't tell a value from a decision: the one core directory holds both, and each is held to what the core is held to.",
    fake: `By path: every module under src/fakes/, whether or not anything in it has a port's shape. One declared in a test file (*.test.ts) is test code to the checks, with no role. ${noHelpers}`,
  },
  'reviewed-roles': ['entrypoint', 'driving-adapter', 'driven-adapter'],
  checks: {
    'role-paths': custom(
      "The ESLint and dependency-cruiser configs give each module under src/ one role by its path, and verify checks that a file in each role's directory has that role's rules.",
    ),
    'unplaced-modules': eslint(
      "no-restricted-syntax reports every module under src/ but tests that is in none of the roles' directories, nor in src/fakes/ or src/testing/, which has no role.",
    ),
    'depcruise-core-is-pure': depcruise(
      "core-is-pure: a module under src/core/ imports none of the project's own code outside src/core/. Packages and host modules are left to imports-reach-nothing-impure.",
    ),
    'depcruise-orchestrators-import-no-adapter': depcruise(
      'orchestrators-import-no-adapter: no orchestrator imports a module under src/adapters/.',
    ),
    'depcruise-orchestrators-are-pure': depcruise('orchestrators-are-pure: no orchestrator imports a Node built-in.'),
    'depcruise-driving-adapters': depcruise(
      'driving-adapters-import-no-driven-adapter: no module under src/adapters/driving/ imports one under src/adapters/driven/.',
    ),
    'depcruise-driven-adapters': depcruise(
      'driven-adapters-import-only-core-and-driven-adapters: a module under src/adapters/driven/ imports only the core and other driven adapters.',
    ),
    'depcruise-entrypoint-is-not-imported': depcruise('entrypoint-is-not-imported: no module but a test imports src/main.ts.'),
    'depcruise-only-tests-import-fakes-and-test-code': depcruise(
      'only-tests-import-fakes-and-test-code: no module but a test imports one under src/fakes/ or src/testing/, the test code a project ships for the tests of projects that depend on it, apart from the modules of those two directories. test-code-imports-no-adapter keeps a module under src/testing/ from importing an adapter.',
    ),
    'depcruise-fakes': depcruise(
      'fakes-import-only-core-orchestrators-and-fakes: a module under src/fakes/ imports nothing else under src/ but the core, the orchestrators, where the ports are declared, and other fakes.',
    ),
    'depcruise-no-container': depcruise(
      'no-container: no module imports a dependency-injection container: inversify, tsyringe, typedi, awilix and others.',
    ),
    'depcruise-no-circular': depcruise('no-circular: no module depends on itself through others.'),
    'no-effects': custom(
      'ESLint rule ts-ianf-strict-baseline/no-effects, in the core and the orchestrators: no global that performs an effect (timers, crypto, fetch, storage, process, console, globalThis), no new Date() or Date.now(), no Math.random(), and no module-level let or var.',
    ),
    'imports-reach-nothing-impure': custom(
      "ESLint rule ts-ianf-strict-baseline/imports-reach-nothing-impure, in the core: it resolves each import of a package or host module as Node does, with the import conditions, and reads every module that import loads, at any depth, CommonJS and ES modules alike, with typescript-eslint's parser and scope analysis. It reports a host module; an import it can't resolve, and a require or import() of a computed name; a global other than ECMAScript's own pure ones, eval, Function, Date, Intl, process and console among those reported; Math.random; localeCompare and the toLocale methods; a change to a built-in; a module-scope binding that a function assigns, writes through or changes with a mutating method; and a module-scope regular expression with the g or y flag whose lastIndex a function can see. Each report names the path from the core's import to the operation and the line it is on. Its verdicts are kept for the run, by package name, version and install location.",
    ),
    'no-configuration': custom(
      'ESLint rule ts-ianf-strict-baseline/no-configuration, everywhere but src/main.ts and tests: no process.env, process.argv, import.meta.env or parseArgs.',
    ),
    'max-lines-edges': eslint('max-lines-per-function limits functions in src/adapters/ and src/main.ts to 50 lines.'),
    complexity: eslint("complexity is at most 10 everywhere: a warning, which check's --max-warnings 0 makes fail."),
    'union-types': language(
      'A TypeScript union is closed: no other module can add a member, and the type checker rejects a value outside it.',
    ),
    'no-implicit-any': language(
      'tsc with strict, which verify requires: a parameter or field with no type, and nothing to infer one from, is an error rather than an any.',
    ),
    'banned-syntax': eslint(
      "no-restricted-syntax bans enums, default and optional parameters, optional properties of object types and interfaces, let and var, and a class extending anything but JavaScript's own errors.",
    ),
    'switch-exhaustiveness': eslint(
      '@typescript-eslint/switch-exhaustiveness-check: a switch on a union names every member, and has no default arm once it does, with considerDefaultExhaustiveForUnions and allowDefaultCaseForExhaustiveSwitch off.',
    ),
    'no-param-reassign': eslint('no-param-reassign: no function assigns to one of its parameters, including from a closure.'),
    'prefer-readonly': eslint('@typescript-eslint/prefer-readonly: a private field that is never reassigned is declared readonly.'),
    'no-unused-result': custom('ESLint rule ts-ianf-strict-baseline/no-unused-result: no expression statement drops a Result.'),
    'no-unused-vars': eslint('@typescript-eslint/no-unused-vars: no variable is assigned and never read.'),
    'no-empty': eslint('no-empty: no block is empty, unless it holds a comment.'),
    'no-explicit-any': eslint('@typescript-eslint/no-explicit-any: no type is written as any.'),
    'no-unsafe-any': eslint(
      "@typescript-eslint/no-unsafe-assignment, no-unsafe-argument, no-unsafe-call, no-unsafe-member-access and no-unsafe-return: a value of type any isn't assigned to a typed variable, passed, called, read from or returned.",
    ),
    'no-unsafe-function-type': eslint('@typescript-eslint/no-unsafe-function-type: no type is written as Function.'),
    'no-non-null-assertion': eslint('@typescript-eslint/no-non-null-assertion: no value is asserted defined with the ! operator.'),
    'no-implied-eval': eslint(
      '@typescript-eslint/no-implied-eval: no function is built from text with new Function, and no text is passed as code to setTimeout, setInterval or setImmediate.',
    ),
    'dot-notation': eslint(
      '@typescript-eslint/dot-notation: a field named by a string literal is read with a dot, where the type checker enforces private.',
    ),
    'ban-ts-comment': eslint(
      '@typescript-eslint/ban-ts-comment: no @ts-ignore or @ts-nocheck comment, and no @ts-expect-error comment without a description.',
    ),
    'test-mocks': eslint('no-restricted-properties, in tests: no vi.mock or vi.spyOn.'),
    'prettier-check': {
      kind: 'tool',
      tool: 'prettier',
      'on-finding': null,
      summary: "The shared check task runs prettier --check, and verify requires a project's check to run the shared one.",
    },
    'verify-prettier': custom('verify reports a Prettier option that differs from @ianflanagan1/ts-ianf-strict-baseline/prettier.'),
    'verify-settings': custom(
      "verify reads the project's settings as each tool resolves them, and reports a tsconfig strictness option of the baseline's that isn't on, one of the ESLint rules it lists that isn't an error, in general or in its role's files, a banned syntax the project dropped, and a dependency-cruiser rule of the baseline's that isn't an error.",
    ),
    'verify-shared-tasks': custom(
      "verify requires a project's check, format and lint-file tasks to run the baseline's own, which run every check, ts-ianf-strict-baseline verify among them, over the whole project, and counts none run with ignore_error.",
    ),
    'shared-task-caches': custom(
      "The shared tasks keep Prettier's, tsc's and ESLint's caches under cache/, and verify requires a project's check, format and lint-file tasks to run the shared ones.",
    ),
    'verify-gitignore': custom('verify reports a .gitignore without the line /cache/, or a project without one.'),
  },
  clauses: {
    // Architecture: core-is-pure
    'core-references-only-core': {
      coverage: 'partial',
      checks: ['depcruise-core-is-pure'],
      gap: globalsGap,
      proof: [
        ...conformance('core-references-only-core'),
        ...conformance('core-references-only-core misses a name another module declares globally'),
      ],
      ...planned,
    },
    'core-does-nothing-impure': {
      coverage: 'partial',
      checks: ['imports-reach-nothing-impure', 'no-effects'],
      gap: effectsGap,
      proof: [
        ...conformance('core-does-nothing-impure'),
        ...conformance('core-does-nothing-impure misses a mutable const'),
        ...conformance('core-does-nothing-impure misses a time in the local time zone'),
      ],
      ...planned,
    },
    'core-calls-reach-nothing-impure': {
      coverage: 'partial',
      checks: ['imports-reach-nothing-impure'],
      gap: `${reachGap} ${reachConservative}`,
      proof: conformance('core-calls-reach-nothing-impure'),
      ...planned,
    },
    'core-loading-does-nothing-impure': {
      coverage: 'partial',
      checks: ['imports-reach-nothing-impure', 'no-effects'],
      gap: `In the core's own modules, browser globals such as window and document pass at load time, as they do anywhere, since no-effects leaves them out. In the modules a package loads: ${reachGap}`,
      proof: [...conformance('core-does-nothing-impure'), ...conformance('core-loading-does-nothing-impure')],
      ...planned,
    },

    // Architecture: core-takes-values
    'core-receives-only-pure-values': none,

    // Architecture: every-declaration-has-one-role
    'every-declaration-has-one-role': {
      coverage: 'partial',
      checks: ['role-paths', 'unplaced-modules'],
      gap: "A role is taken from the module's path and not from the declaration's own code. A service that holds both a port and a database client is checked as whatever its directory says, and a declaration that fits no role is reported only when its module is in none of the roles' directories.",
      proof: [...conformance('every-declaration-has-one-role'), verify("reports a role's rule that a later block turned off")],
      ...planned,
    },
    'a-unit-of-code-holds-one-role': {
      coverage: 'partial',
      checks: ['role-paths', 'imports-reach-nothing-impure'],
      gap: "A module has the one role its path gives it, and nothing compares the roles of its declarations. One that mixes roles is reported only where a declaration imports what the module's directory may not, as a store in a core module does; a controller beside its orchestrator, or a decision beside a store under src/adapters/driven/, isn't.",
      proof: [
        ...conformance('a-unit-of-code-holds-one-role'),
        ...conformance('a-unit-of-code-holds-one-role misses a module whose directory allows both'),
      ],
      ...planned,
    },
    'dependency-declarations-keep-their-role': noneBecause(
      "The checks give a dependency's declarations no roles. dependency-cruiser's core-is-pure no longer keeps the core from every package: imports-reach-nothing-impure judges a package by what its code does, so a first-party dependency's orchestrator, which does nothing impure itself, passes in the core, as its core type does. Code of every other role may reference any declaration of a dependency.",
    ),
    'other-roles-reach-only-members': none,

    // Architecture: adapters-and-entrypoints-reach-only-their-operations
    'adapters-and-entrypoints-perform-only-their-roles-operations': {
      coverage: 'partial',
      checks: ['no-configuration'],
      gap: 'Only reading configuration is reported. An adapter or the entrypoint may perform any other operation: a driving adapter may call out over the network or reach a database, a driven adapter may serve requests, and the entrypoint may do either.',
      proof: conformance('adapters-and-entrypoints-perform-only-their-roles-operations'),
      ...planned,
    },
    'adapters-and-entrypoints-reach-only-their-roles-operations': none,

    // Architecture: adapters-stay-thin
    'driving-adapter-code-references-only-orchestrators-and-the-core': {
      coverage: 'partial',
      checks: ['depcruise-driving-adapters', 'depcruise-entrypoint-is-not-imported'],
      gap: `A port is declared in its orchestrator's module, which a driving adapter may import, so a controller that references a port isn't reported. ${globalsGap}`,
      proof: [
        ...conformance('driving-adapter-code-references-only-orchestrators-and-the-core'),
        ...conformance('driving-adapter-code-references-only-orchestrators-and-the-core misses a port'),
      ],
      ...planned,
    },
    'driving-adapter-code-only-reports-what-a-decision-returns': none,
    'driven-adapter-code-references-only-ports-and-values': {
      coverage: 'partial',
      checks: ['depcruise-driven-adapters', 'depcruise-entrypoint-is-not-imported'],
      gap: `${oneCoreGap} A driven adapter may reference any module under src/core/, so a store that calls a decision function isn't reported. ${globalsGap}`,
      proof: [
        ...conformance('driven-adapter-code-references-only-ports-and-values'),
        ...conformance('driven-adapter-code-references-only-ports-and-values misses a call to a decision'),
      ],
      ...planned,
    },
    'driving-adapter-code-calls-no-driven-adapter': {
      coverage: 'partial',
      checks: ['depcruise-driving-adapters'],
      gap: 'A driving adapter that declares an interface and is given a driven adapter through it by src/main.ts is not caught, nor is one given the system clock; only importing a driven adapter of the project is.',
      proof: conformance('driving-adapter-code-references-only-orchestrators-and-the-core'),
      ...planned,
    },
    'driven-adapter-code-calls-no-orchestrator': {
      coverage: 'partial',
      checks: ['depcruise-driven-adapters'],
      gap: 'A driven adapter that declares an interface and is given an orchestrator through it by src/main.ts is not caught; only importing one is.',
      proof: conformance('driven-adapter-code-references-only-ports-and-values'),
      ...planned,
    },
    'adapter-code-function-size-is-limited': {
      coverage: 'full',
      checks: ['max-lines-edges', 'complexity'],
      proof: conformance('adapter-code-function-size-is-limited'),
      note: null,
    },

    // Architecture: entrypoints-build-and-start
    'only-entrypoint-code-reads-configuration': {
      coverage: 'partial',
      checks: ['no-configuration'],
      gap: "Only the global process and the names env, argv and parseArgs imported from Node are reported: configuration read through process imported whole from node:process, or through a name taken from it by destructuring, isn't, and neither is a library that reads it.",
      proof: [
        ...conformance('only-entrypoint-code-reads-configuration'),
        ...conformance('only-entrypoint-code-reads-configuration misses a process that is imported'),
      ],
      ...planned,
    },
    'entrypoint-code-function-size-is-limited': {
      coverage: 'full',
      checks: ['max-lines-edges'],
      proof: conformance('entrypoint-code-function-size-is-limited'),
      note: 'Only src/main.ts may import both adapters and orchestrators, so wiring that entrypoints would share has no other module to be in.',
    },
    'entrypoint-code-wires-without-a-container': {
      coverage: 'partial',
      checks: ['depcruise-no-container'],
      gap: 'Only the common container libraries are banned, not a service locator written in the project.',
      proof: conformance('entrypoint-code-wires-without-a-container'),
      ...declined(
        'An import check sees only the libraries it lists, and a hand-written locator is a map looked up by name, which no static check tells from other maps.',
      ),
    },
    'entrypoint-code-calls-only-driving-adapters-and-values': noneBecause(
      'Nothing checks what src/main.ts calls: it may import and call any module.',
    ),

    // Architecture: internal-values-stay-inside
    'outside-facing-code-names-no-internal-type': none,
    'external-driving-adapters-get-no-internal-values': none,
    'external-driving-adapters-get-no-internal-values-from-decisions': none,
    'external-driven-adapters-take-no-internal-values': none,
    'only-decisions-and-internal-adapters-read-internal-values': none,
    'the-internal-wrapper-shows-nothing-it-holds': noneBecause(
      "TypeScript's shared ID unit-of-code, which would hold the Internal wrapper and the tests of what it shows, doesn't exist yet.",
    ),

    // Architecture: no-reference-cycles
    'no-reference-cycles': {
      coverage: 'partial',
      checks: ['depcruise-no-circular'],
      gap: globalsGap,
      proof: conformance('no-reference-cycles'),
      ...planned,
    },

    // Architecture: nothing-sleeps
    'nothing-sleeps': {
      coverage: 'partial',
      checks: ['no-effects', 'imports-reach-nothing-impure', 'depcruise-orchestrators-are-pure'],
      gap: "Only the core and the orchestrators are checked, where a timer global or Node's timers can't be reached: an adapter or the entrypoint may sleep, an orchestrator may call a library that does, and Atomics.wait passes everywhere.",
      proof: [...conformance('nothing-sleeps'), ...conformance('nothing-sleeps misses an adapter that sleeps')],
      ...planned,
    },

    // Architecture: orchestrators-act-the-core-decides
    'orchestrator-code-branches-only-on-decisions': none,
    'orchestrator-code-runs-no-loop-until-stopped': none,

    // Architecture: orchestrators-reach-outside-through-ports
    'orchestrator-code-references-no-entrypoint-or-adapter-code': {
      coverage: 'partial',
      checks: ['depcruise-orchestrators-import-no-adapter', 'depcruise-entrypoint-is-not-imported'],
      gap: globalsGap,
      proof: conformance('orchestrator-code-references-no-entrypoint-or-adapter-code'),
      ...planned,
    },
    'orchestrator-code-performs-no-effects': {
      coverage: 'partial',
      checks: ['depcruise-orchestrators-are-pure', 'no-effects'],
      gap: effectsGap,
      proof: conformance('orchestrator-code-performs-no-effects'),
      ...planned,
    },
    'orchestrator-code-reaches-nothing-impure': none,

    // Architecture: ports-and-orchestrators-take-signature-types
    'port-methods-take-and-return-signature-types': {
      coverage: 'partial',
      checks: ['no-explicit-any'],
      gap: "Only a parameter or result written as any is reported, as it is anywhere: a port's method may take or return a value of unknown type, an object, a map, a callback, a plain-data type or a library's type.",
      proof: [
        ...conformance('port-methods-take-and-return-signature-types'),
        ...conformance('port-methods-take-and-return-signature-types misses a callback, an unknown and a map'),
      ],
      ...planned,
    },
    'orchestrator-takes-and-returns-signature-types': none,
    'decisions-driving-adapters-call-take-and-return-signature-types': none,
    'orchestrator-is-given-ports': {
      coverage: 'partial',
      checks: ['depcruise-orchestrators-import-no-adapter', 'depcruise-no-container'],
      gap: "An orchestrator may import any library, so one built with a third-party client, a logger or a writer, or with an interface it didn't declare, isn't reported.",
      proof: [
        ...conformance('orchestrator-code-references-no-entrypoint-or-adapter-code'),
        ...conformance('entrypoint-code-wires-without-a-container'),
      ],
      ...planned,
    },

    // Architecture: ports-belong-to-their-callers
    'port-is-declared-by-its-caller': {
      coverage: 'partial',
      checks: ['depcruise-orchestrators-import-no-adapter'],
      gap: `An orchestrator can't import an adapter, so it can't take an interface an adapter's module exports. ${globalsGap}`,
      proof: conformance('orchestrator-code-references-no-entrypoint-or-adapter-code'),
      ...planned,
    },
    'port-units-of-code-follow-interface-implementation': {
      coverage: 'partial',
      checks: ['depcruise-driven-adapters'],
      gap: `A module of interfaces that other orchestrators import is an orchestrator like any other, so a ports module is not caught. ${globalsGap}`,
      proof: conformance('driven-adapter-code-references-only-ports-and-values'),
      ...planned,
    },
    'port-is-named-in-domain-terms': {
      coverage: 'convention-only',
      where: 'README.md, Roles',
      ...declined(
        "Whether a name is in the domain's terms, or a method is shaped for one thing its caller does, is a judgement no static check can make.",
      ),
    },

    // Architecture: ports-have-no-call-order
    'port-methods-return-no-interfaces': none,
    'port-methods-need-no-call-order': none,
    'writes-that-belong-together-are-one-port-call': none,

    // Architecture: reserved-operations-come-only-from-system-adapters
    'reserved-operations-are-performed-only-by-their-system-adapters': noneBecause(
      "no-effects bans the clock, timers and randomness in the core and the orchestrators, which core-does-nothing-impure and orchestrator-code-performs-no-effects record. In adapter and entrypoint code, where this clause's violations are, the checks allow them all, and TypeScript's shared code doesn't hold the system adapters yet.",
    ),
    'no-third-party-feature-performs-a-reserved-operation': none,
    'standard-library-and-third-party-code-takes-sources-from-the-system-adapters': none,

    // Architecture: values-decide-nothing
    'value-code-references-only-value-code': {
      coverage: 'partial',
      checks: ['depcruise-core-is-pure'],
      gap: `${oneCoreGap} Value code is kept from referencing the shell, but a core type that references a decision function isn't reported. ${globalsGap}`,
      proof: conformance('core-references-only-core'),
      ...planned,
    },
    'value-code-decides-nothing': noneBecause(
      "The checks don't tell a decision from a value, and nothing reads whether a core type's method derives a value or decides something.",
    ),

    // Design: arguments-are-not-mutated
    'arguments-are-not-mutated': none,

    // Design: closed-families-match-exhaustively
    'closed-families-are-sealed': {
      coverage: 'partial',
      checks: ['union-types', 'banned-syntax'],
      gap: 'A family modelled as an interface that classes implement is not recognised as one, so any module can add a variant.',
      proof: conformance('closed-families-are-sealed'),
      ...declined(
        "Whether an interface's variants are all its module's own is a design decision, which no static check can see until the family is a union.",
      ),
    },
    'sealed-variants-share-their-unit-of-code': none,
    'matches-on-closed-families-are-exhaustive': {
      coverage: 'full',
      checks: ['switch-exhaustiveness'],
      proof: conformance('matches-on-closed-families-are-exhaustive'),
      note: 'Enums are banned, so a closed family is always a union. An if-else chain over one is not checked.',
    },
    'matches-on-closed-families-have-no-default-arm': {
      coverage: 'full',
      checks: ['switch-exhaustiveness'],
      proof: conformance('matches-on-closed-families-have-no-default-arm'),
      note: 'TypeScript knows a switch that names every member returns, so no default arm is allowed, not even one that only throws.',
    },

    // Design: code-reaches-only-what-it-names
    'no-code-is-run-from-text': {
      coverage: 'partial',
      checks: ['no-implied-eval'],
      gap: "eval itself isn't reported.",
      proof: [...conformance('no-code-is-run-from-text'), ...conformance('no-code-is-run-from-text misses eval')],
      ...planned,
    },
    'nothing-is-called-by-a-computed-name': none,
    'nothing-is-imported-by-a-computed-path': none,
    'visibility-is-not-bypassed': {
      coverage: 'partial',
      checks: ['dot-notation'],
      gap: "Only a key written as a string literal is reported: a private field read by element access with a key held in a constant isn't.",
      proof: [...conformance('visibility-is-not-bypassed'), ...conformance('visibility-is-not-bypassed misses a key held in a constant')],
      ...planned,
    },

    // Design: collection-values-come-from-named-operations
    'loops-compute-no-value-an-operation-names': {
      coverage: 'partial',
      checks: ['banned-syntax'],
      gap: "With let and var banned, a loop can't keep a count, a total, a flag or the best element so far in a local. One that fills a list or a map, which a const local still lets it change, or that returns the first element to pass a test, isn't reported.",
      proof: [
        ...conformance('loops-compute-no-value-an-operation-names'),
        ...conformance('loops-compute-no-value-an-operation-names misses a loop that fills a list'),
      ],
      ...planned,
    },
    'collection-operations-take-pure-functions': {
      coverage: 'partial',
      checks: ['banned-syntax'],
      gap: "With let and var banned, a function passed to a collection operation can't count in a local it captured. forEach isn't reported, and neither is a function passed to one that calls a port, performs an effect or changes a list or map it captured.",
      proof: [
        ...conformance('collection-operations-take-pure-functions'),
        ...conformance('collection-operations-take-pure-functions misses forEach with an effect'),
      ],
      ...planned,
    },
    'folds-compute-no-value-a-narrower-operation-names': none,
    'collection-operations-come-from-one-place': noneBecause(
      "dependency-cruiser's core-is-pure no longer keeps every library from the core, and imports-reach-nothing-impure passes a utility library whose code is pure. Nothing reports a utility library in any role, reduce, a function's name passed to map, a project's own generic collection function or a class that wraps a collection.",
    ),

    // Design: constructors-only-store
    'constructors-only-store-their-arguments': none,
    'field-initialisers-are-constants': none,
    'core-types-have-factory-functions': none,
    'core-types-are-built-only-by-their-factory-functions': none,
    'no-standard-library-or-third-party-code-builds-core-types': none,
    'one-factory-function-calls-each-constructor': none,
    'factory-functions-take-signature-types': none,

    // Design: declarations-are-typed
    'parameters-are-typed': {
      coverage: 'full',
      checks: ['no-implicit-any'],
      proof: conformance('parameters-are-typed'),
      note: null,
    },
    'return-types-are-declared-where-called-from-outside': none,
    'fields-are-typed': {
      coverage: 'full',
      checks: ['no-implicit-any'],
      proof: conformance('fields-are-typed'),
      note: null,
    },
    'collection-types-name-their-element-type': noneBecause(
      "A new Map() with no type arguments isn't reported, even where it is returned as a map of a declared type.",
    ),

    // Design: fields-are-set-once
    'fields-are-declared-read-only': {
      coverage: 'partial',
      checks: ['prefer-readonly'],
      gap: "Only a private field of a class that is never reassigned is reported: a public or protected field, a property of an object type, and a read-only field whose type lets its contents change, such as an array rather than a ReadonlyArray, aren't.",
      proof: conformance('fields-are-declared-read-only'),
      ...planned,
    },
    'fields-are-assigned-only-at-construction': none,
    'field-collections-are-not-changed': none,

    // Design: locals-are-not-reassigned
    'locals-are-declared-constant': {
      coverage: 'full',
      checks: ['banned-syntax'],
      proof: conformance('locals-are-declared-constant'),
      note: 'let and var are banned outright, so every local is const.',
    },

    // Design: no-boolean-parameters-or-fields
    'no-boolean-parameters': none,
    'no-boolean-fields': none,

    // Design: no-default-parameter-values
    'no-parameter-default-values': {
      coverage: 'full',
      checks: ['banned-syntax'],
      proof: conformance('no-parameter-default-values'),
      note: null,
    },
    'no-optional-parameters': { coverage: 'full', checks: ['banned-syntax'], proof: conformance('no-optional-parameters'), note: null },

    // Design: no-inheritance
    'classes-extend-only-allowed-bases': {
      coverage: 'full',
      checks: ['banned-syntax'],
      proof: conformance('classes-extend-only-allowed-bases'),
      note: "The allowlist is JavaScript's own errors, so a thrown error can have a name of its own.",
    },
    'types-declare-every-method-they-have': {
      coverage: 'partial',
      checks: ['banned-syntax'],
      gap: "A class extending a mixin's result is reported, since it extends something other than an error, but code that copies methods onto a class or its prototype, and a Proxy that forwards calls, aren't.",
      proof: conformance('types-declare-every-method-they-have'),
      ...planned,
    },

    // Design: no-nullable-fields
    'core-type-fields-are-not-nullable': {
      coverage: 'partial',
      checks: ['banned-syntax'],
      gap: "Only an optional property of an object type or interface is reported, as it is anywhere. A field typed with null or undefined, an optional field of a class, and a collection of nullable elements aren't, and nothing tells a core type's fields from a plain-data type's.",
      proof: [
        ...conformance('core-type-fields-are-not-nullable'),
        ...conformance('core-type-fields-are-not-nullable misses a null, an undefined and an optional field of a class'),
      ],
      ...planned,
    },

    // Design: only-calls-run-code
    'field-access-runs-no-code': none,
    'conversions-run-no-code': none,
    'iteration-runs-no-code': none,
    'no-hooks-reached-through-catch-all-parameters': none,
    'nothing-runs-when-a-value-is-collected': none,

    // Design: open-interfaces-only-for-outside-variants
    'open-interfaces-are-not-matched-by-implementation': none,
    'no-port-is-sealed': none,

    // Design: parameters-are-not-reassigned
    'parameters-are-not-reassigned': {
      coverage: 'full',
      checks: ['no-param-reassign'],
      proof: conformance('parameters-are-not-reassigned'),
      note: null,
    },

    // Design: shapes-follow-roles
    'every-type-has-one-shape': none,
    'only-adapter-and-entrypoint-code-references-plain-data-types': none,
    'the-core-takes-no-plain-data': none,

    // Design: unknown-types-are-narrowed-at-the-edges
    'unknown-types-stay-in-adapter-and-entrypoint-code': none,
    'no-type-turns-checking-off': {
      coverage: 'partial',
      checks: ['no-explicit-any', 'no-unsafe-any', 'no-unsafe-function-type'],
      gap: "A declaration file that declares a module with no body, which makes everything imported from it any, isn't reported.",
      proof: conformance('no-type-turns-checking-off'),
      ...planned,
    },
    'no-cast-asserts-an-unchecked-type': {
      coverage: 'partial',
      checks: ['no-non-null-assertion'],
      gap: "Only the non-null operator is reported. A cast with as, a cast through unknown, a definite assignment assertion, a type guard or assertion function that tests nothing, String() of an unknown, and a declaration file that narrows a library's types aren't.",
      proof: [...conformance('no-cast-asserts-an-unchecked-type'), ...conformance('no-cast-asserts-an-unchecked-type misses a cast')],
      ...planned,
    },

    // Design: values-are-grouped-by-name
    'no-positional-groups': none,

    // Design: values-are-not-changed-once-built
    'built-values-are-not-changed': none,

    // Design: values-are-not-compared-by-identity
    'references-are-not-compared-by-identity': none,
    'collections-are-not-keyed-by-instance': none,

    // Design: values-have-immutable-types
    'values-have-immutable-types': noneBecause(
      "dependency-cruiser's core-is-pure no longer keeps every library from the core, which reported a third-party class a core type names, and a type-only import runs nothing for imports-reach-nothing-impure to read. Nothing reads whether a type is immutable: a standard-library type that changes in place, such as Date, passes everywhere.",
    ),
    'collection-types-are-immutable': none,

    // Errors
    'core-throws-nothing': errorsConvention(planned),
    'core-catches-expected-failures-it-calls': errorsConvention(
      declined(
        'Whether a built-in or a library throws for an expected failure is in its documentation, not its types, so no static check can tell which calls need a catch.',
      ),
    ),
    'driving-adapter-catches-each-invocation': errorsConvention(planned),
    'driving-adapter-code-catches-everything-only-around-invocations': errorsConvention(planned),
    'invocation-catch-all-reports-a-failure': errorsConvention(
      declined('What a catch-all writes to its caller and its log is not decidable statically.'),
    ),
    'invocation-catch-all-keeps-internals-from-outside-callers': errorsConvention(
      declined('What a catch-all writes to its caller is not decidable statically.'),
    ),
    'driving-adapter-reports-returned-failures': none,
    'driving-adapter-reports-failures-a-decision-returns': none,
    'entrypoint-catches-what-escapes': errorsConvention(planned),
    'error-types-of-other-roles-are-not-matched': {
      coverage: 'partial',
      checks: [
        'depcruise-core-is-pure',
        'depcruise-orchestrators-import-no-adapter',
        'depcruise-driving-adapters',
        'depcruise-driven-adapters',
      ],
      gap: `An error type is out of reach only where its module can't be imported. src/main.ts may import any module, so an entrypoint that matches a driving adapter's error type isn't reported; a first-party dependency's declarations have no roles, so its adapters' error types can be matched anywhere, the core included when the module that declares one does nothing impure; and a driving adapter may match an error type an orchestrator's module declares. ${globalsGap}`,
      proof: [
        ...conformance('error-types-of-other-roles-are-not-matched'),
        ...conformance('orchestrator-code-references-no-entrypoint-or-adapter-code'),
      ],
      ...planned,
    },
    'orchestrator-code-throws-nothing': errorsConvention(planned),
    'orchestrator-code-catches-nothing': errorsConvention(planned),
    'port-methods-return-expected-failures': errorsConvention(
      declined('TypeScript has no checked exceptions, so what an implementation of a port throws is not in its signature.'),
    ),
    'driven-adapter-code-converts-expected-failures': errorsConvention(
      declined(
        'Which exceptions a library throws for expected failures is not known to any tool, and since every catch catches everything, a catch that converts can not be told from one that swallows.',
      ),
    ),
    'returned-failures-are-used': {
      coverage: 'partial',
      checks: ['no-unused-result', 'no-unused-vars'],
      gap: 'A call that drops a sentinel, such as null, as a statement is not reported.',
      proof: [...conformance('returned-failures-are-used'), ...conformance('returned-failures-are-used misses a dropped sentinel')],
      ...planned,
    },
    'failure-branches-act': {
      coverage: 'partial',
      checks: ['no-empty'],
      gap: 'Only a branch that is empty is reported, whatever it was taken for. One that holds only a comment passes, and so does one that returns success from a function that itself returns failures.',
      proof: [
        ...conformance('failure-branches-act'),
        ...conformance('failure-branches-act misses a branch that holds a comment or returns success'),
      ],
      ...planned,
    },
    'explicit-discards-give-a-reason': none,
    'sentinels-report-only-absence': noneBecause(
      "README.md, Errors, states an older convention, that null reports a function's one way to fail, which this clause no longer allows.",
    ),
    'sentinels-are-null-or-a-found-flag': none,

    // Persistence
    'each-project-table-has-an-id-type': none,
    'id-types-accept-only-uuidv7s': none,
    'ids-are-held-as-their-id-types': none,
    'only-the-shared-id-unit-of-code-uses-third-party-uuid-code': noneBecause(
      "dependency-cruiser's core-is-pure no longer keeps every library from the core. imports-reach-nothing-impure reports third-party UUID code in the core only where its modules reach randomness, the clock or another impure operation, as a generator's do, and not for being UUID code. An adapter, an orchestrator and a test may reference it, and TypeScript has no shared ID unit-of-code yet to exempt.",
    ),
    'enums-are-stored-as-their-values': none,
    'enum-columns-admit-only-their-enums-values': none,
    'every-project-table-has-a-uuid-id-primary-key': none,
    'id-columns-reject-other-uuid-versions': none,
    'ids-say-nothing-about-when-rows-were-made': none,
    'public-id-columns-are-unique-uuidv4s': none,
    'each-public-id-has-a-type': none,
    'public-id-types-accept-only-uuidv4s': none,
    'nullable-columns-hold-only-variant-data': none,
    'variant-data-columns-are-constrained-to-their-variants': none,
    'sql-text-comes-only-from-the-query-compiler': none,
    'queries-are-query-data': none,
    'queries-are-built-in-driven-adapter-code': none,
    'every-stored-value-comes-from-the-query': none,
    'queries-perform-no-impure-operation': none,
    'the-schema-supplies-no-values': none,
    'no-value-depends-on-session-settings': none,

    // Formatting
    'check-fails-on-unformatted-files': {
      coverage: 'full',
      checks: ['prettier-check'],
      proof: [...conformance('check-fails-on-unformatted-files'), verify("reports a shared task that no longer runs the baseline's own")],
      note: 'Prettier does not order imports, so their order is not a matter of formatting here.',
    },
    'formatter-settings-come-from-the-baseline': {
      coverage: 'full',
      checks: ['verify-prettier'],
      proof: [verify('reports a Prettier option that differs from the baseline')],
      note: null,
    },

    // Project
    'type-checker-runs-at-its-strictest': {
      coverage: 'partial',
      checks: ['verify-settings'],
      gap: "verify reads strict and the six other options it lists. An option strict turns on, such as strictNullChecks or noImplicitAny, that the project turns off by itself beside strict isn't reported.",
      proof: [
        verify('reports a strictness option that is turned off or left out'),
        ...conformance('type-checker-runs-at-its-strictest misses an option of strict turned off by itself'),
      ],
      ...planned,
    },
    'baseline-settings-are-not-weakened': {
      coverage: 'partial',
      checks: ['verify-settings', 'verify-prettier'],
      gap: "Only the settings verify lists are compared. A rule that comes from typescript-eslint's presets, such as @typescript-eslint/no-explicit-any, can be turned off; a limit can be raised, since only a rule's severity is read, but for the switch check's options; a dependency-cruiser rule can be pointed at other paths; and a tsconfig option outside the seven is free.",
      proof: [
        verify('reports a strictness option that is turned off or left out'),
        verify('reports a required rule that is weakened to a warning'),
        verify("reports a role's rule that a later block turned off"),
        verify('reports a banned syntax that a project dropped by replacing the list'),
        verify('reports a Prettier option that differs from the baseline'),
        verify('reports a dependency rule that is weakened or dropped'),
        ...conformance('baseline-settings-are-not-weakened misses a rule verify does not list'),
      ],
      ...planned,
    },
    'checks-are-not-suppressed': {
      coverage: 'partial',
      checks: ['ban-ts-comment'],
      gap: "Only @ts-ignore, @ts-nocheck and a @ts-expect-error with no description are reported. A @ts-expect-error with a description, an eslint-disable comment, a directory that tsconfig.json excludes or eslint.config.js ignores, and hand-written JavaScript aren't.",
      proof: [
        ...conformance('checks-are-not-suppressed'),
        ...conformance('checks-are-not-suppressed misses a described suppression and an ESLint directive'),
      ],
      ...planned,
    },
    'check-task-runs-every-baseline-check': {
      coverage: 'partial',
      checks: ['verify-shared-tasks'],
      gap: "verify reads which tasks check runs, and whether it ignores their failure. A check task that Task skips, through status, sources, platforms or if, still counts as running the baseline's.",
      proof: [
        verify("reports a shared task that no longer runs the baseline's own"),
        verify('reports an include that leaves out a shared task'),
        verify("reports an include that runs the baseline's tasks outside the project root"),
        gathered('reads what a project changed from the baseline through its real config files'),
      ],
      ...planned,
    },
    'every-third-party-dependency-is-listed': none,
    'at-most-one-listed-dependency-per-capability': none,
    'caches-live-under-the-cache-directory': {
      coverage: 'partial',
      checks: ['shared-task-caches'],
      gap: 'A tool the project runs outside the shared tasks, such as vitest, is not checked.',
      proof: [verify("reports a shared task that no longer runs the baseline's own")],
      ...declined('A check would need to know the cache files of every tool a project adds.'),
    },
    'gitignore-ignores-the-cache-directory': {
      coverage: 'full',
      checks: ['verify-gitignore'],
      proof: [verify('asks for a .gitignore when there is none'), verify('accepts the cache line with the trailing spaces Git ignores')],
      note: null,
    },

    // Testing
    'every-port-has-one-set-of-contract-tests': none,
    'fake-and-adapter-tests-run-the-contract-tests': none,
    'check-task-runs-mutation-testing-on-the-core': none,
    'core-tests-reference-only-the-core': noneBecause(
      'The dependency rules leave test files out, so a test of the core may import anything.',
    ),
    'every-port-has-one-fake': none,
    'only-driven-adapters-and-fakes-stand-in-for-ports': none,
    'fake-code-references-only-ports-values-and-fakes': {
      coverage: 'partial',
      checks: ['depcruise-fakes'],
      gap: "A fake may import any module under src/core/ and src/orchestrators/: the checks tell neither a decision from a value nor a port from the orchestrator it is declared with, so a fake that references decision code or an orchestrator isn't reported. Nor is one that imports a library.",
      proof: [...conformance('fake-code-references-only-ports-values-and-fakes')],
      ...planned,
    },
    'fake-code-performs-only-held-state': none,
    'only-test-code-references-fake-code': {
      coverage: 'full',
      checks: ['depcruise-only-tests-import-fakes-and-test-code'],
      proof: [...conformance('only-test-code-references-fake-code')],
      note: 'Test code a project ships, under src/testing/, counts as test code by its path.',
    },
    'orchestrator-test-case-calls-one-use-case-once': none,
    'no-mocking-libraries': {
      coverage: 'partial',
      checks: ['test-mocks'],
      gap: 'Only vi.spyOn and vi.mock are reported: a stub made of vi.fn functions given scripted return values, and a mocking library such as sinon or ts-mockito, are not.',
      proof: [...conformance('no-mocking-libraries'), ...conformance('no-mocking-libraries misses a stub made of vi.fn functions')],
      ...planned,
    },
    'no-hand-written-scripted-doubles': none,
  },
};

// The case each clause that varies by a trait is assessed for: TypeScript's value of the trait.
const cases: Readonly<Record<string, string>> = {
  'port-units-of-code-follow-interface-implementation': 'structural',
  'fields-are-declared-read-only': 'supported',
  'locals-are-declared-constant': 'supported',
  'core-types-have-factory-functions': 'private-constructors',
  'classes-extend-only-allowed-bases': 'supported',
  'field-access-runs-no-code': 'supported',
  'conversions-run-no-code': 'supported',
  'iteration-runs-no-code': 'supported',
  'no-positional-groups': 'tuples',
  'collection-types-are-immutable': 'read-only-types',
  'core-throws-nothing': 'needs-nothing',
  'orchestrator-code-throws-nothing': 'needs-nothing',
};

export const listingPath = 'rulebook-coverage.json';

// A null field is left out, as the rulebook's schema has it, and a clause that varies names its case first.
export const listingJson = (): string => {
  const clauses = Object.fromEntries(Object.entries(listing.clauses).map(([id, claim]) => [id, { case: cases[id] ?? null, ...claim }]));
  return `${JSON.stringify({ ...listing, clauses }, (_key, value: unknown) => (value === null ? undefined : value), 2)}\n`;
};
