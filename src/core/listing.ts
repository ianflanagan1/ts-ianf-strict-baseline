// How ts-baseline enforces each clause of the code rulebook (github.com/ianflanagan1/code-rulebook), as
// the coverage listing the rulebook checks. rulebook-coverage.json holds it, written by `ts-baseline rulebook`.

// COUPLED:coverage-listing-shape. = code-rulebook:schema/coverage.schema.json (fields, check kinds and coverage levels)
type Check =
  | { readonly kind: 'language' | 'custom'; readonly summary: string }
  | { readonly kind: 'tool'; readonly tool: string; readonly summary: string };

type Claim =
  | {
      readonly coverage: 'full';
      readonly checks: ReadonlyArray<string>;
      readonly proof: ReadonlyArray<string>;
      readonly note: string | null;
    }
  | {
      readonly coverage: 'partial';
      readonly checks: ReadonlyArray<string>;
      readonly gap: string;
      readonly proof: ReadonlyArray<string>;
    }
  | { readonly coverage: 'convention'; readonly where: string }
  | { readonly coverage: 'none' };

type Listing = {
  readonly language: 'typescript';
  readonly baseline: string;
  readonly roles: Readonly<Record<string, string>>;
  readonly checks: Readonly<Record<string, Check>>;
  readonly clauses: Readonly<Record<string, Claim>>;
};

const conformance = (test: string): ReadonlyArray<string> => [`src/rulebook/conformance.test.ts: ${test}`];

const verify = (test: string): string => `src/core/findProblems.test.ts: ${test}`;

const none: Claim = { coverage: 'none' };

const depcruise = (summary: string): Check => ({ kind: 'tool', tool: 'dependency-cruiser', summary });

const eslint = (summary: string): Check => ({ kind: 'tool', tool: 'eslint', summary });

const effectsGap =
  "A module-level const can hold a mutable object, browser globals such as window and document pass, and keeping state that changes across calls in an instance's fields (held-state) isn't detected.";

const listing: Listing = {
  language: 'typescript',
  baseline: '@ianflanagan1/ts-baseline',
  roles: {
    core: 'Modules under src/core/.',
    orchestrator: 'Modules under src/orchestrators/.',
    'driving-adapter': 'Modules under src/adapters/driving/.',
    'driven-adapter': 'Modules under src/adapters/driven/.',
    entrypoint: 'src/main.ts.',
  },
  checks: {
    'role-paths': {
      kind: 'custom',
      summary:
        "The ESLint and dependency-cruiser configs give each module under src/ one role by its path, and verify checks that a file of each role has its role's rules.",
    },
    'unplaced-modules': eslint(
      "no-restricted-syntax reports every module under src/ but tests that is in none of the roles' directories, which has no role.",
    ),
    'depcruise-core-is-pure': depcruise(
      'core-is-pure: a module under src/core/ imports nothing outside src/core/, including Node built-ins and libraries.',
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
    'depcruise-no-container': depcruise(
      'no-container: no module imports a dependency-injection container: inversify, tsyringe, typedi, awilix and others.',
    ),
    'depcruise-no-circular': depcruise('no-circular: no module depends on itself through others.'),
    'no-effects': {
      kind: 'custom',
      summary:
        'ESLint rule ts-baseline/no-effects, in the core and the orchestrators: no global that performs an effect (timers, crypto, fetch, storage, process, console, globalThis), no new Date() or Date.now(), no Math.random(), and no module-level let or var.',
    },
    'no-configuration': {
      kind: 'custom',
      summary:
        'ESLint rule ts-baseline/no-configuration, everywhere but src/main.ts and tests: no process.env, process.argv, import.meta.env or parseArgs.',
    },
    'max-lines-edges': eslint('max-lines-per-function limits functions in src/adapters/ and src/main.ts to 50 lines.'),
    complexity: eslint("complexity is at most 10 everywhere: a warning, which check's --max-warnings 0 makes fail."),
    'union-types': {
      kind: 'language',
      summary: 'A TypeScript union is closed: no other module can add a member, and the type checker rejects a value outside it.',
    },
    'banned-syntax': eslint(
      "no-restricted-syntax bans enums, default and optional parameters, let and var, and a class extending anything but JavaScript's own errors.",
    ),
    'switch-exhaustiveness': eslint(
      '@typescript-eslint/switch-exhaustiveness-check: a switch on a union names every member, and has no default arm once it does, with considerDefaultExhaustiveForUnions and allowDefaultCaseForExhaustiveSwitch off.',
    ),
    'no-param-reassign': eslint('no-param-reassign: no function assigns to one of its parameters, including from a closure.'),
    'prefer-readonly': eslint('@typescript-eslint/prefer-readonly: a private field that is never reassigned is declared readonly.'),
    'no-unused-result': { kind: 'custom', summary: 'ESLint rule ts-baseline/no-unused-result: no expression statement drops a Result.' },
    'no-unused-vars': eslint('@typescript-eslint/no-unused-vars: no variable is assigned and never read.'),
    'prettier-check': {
      kind: 'tool',
      tool: 'prettier',
      summary: "The shared check task runs prettier --check, and verify requires a project's check to run the shared one.",
    },
    'verify-prettier': {
      kind: 'custom',
      summary: 'verify reports a Prettier option that differs from @ianflanagan1/ts-baseline/prettier.',
    },
  },
  clauses: {
    'every-unit-has-one-role': {
      coverage: 'full',
      checks: ['role-paths', 'unplaced-modules'],
      proof: [...conformance('every-unit-has-one-role'), verify("reports a role's rule that a later block turned off")],
      note: null,
    },
    'dependency-units-keep-their-role': {
      coverage: 'partial',
      checks: ['depcruise-core-is-pure'],
      gap: "A dependency's modules get no role of their own: the core may use no library at all, but an orchestrator may import any library, whatever role its module plays.",
      proof: conformance('core-libraries-are-pure'),
    },
    'core-imports-only-core': {
      coverage: 'full',
      checks: ['depcruise-core-is-pure'],
      proof: conformance('core-imports-only-core'),
      note: null,
    },
    'core-performs-no-effects': {
      coverage: 'partial',
      checks: ['depcruise-core-is-pure', 'no-effects'],
      gap: effectsGap,
      proof: [...conformance('core-performs-no-effects'), ...conformance('core-performs-no-effects misses a mutable const')],
    },
    'core-libraries-are-pure': {
      coverage: 'full',
      checks: ['depcruise-core-is-pure'],
      proof: conformance('core-libraries-are-pure'),
      note: 'Stricter than the clause: the core may use no library at all.',
    },
    'core-receives-only-pure-values': none,
    'orchestrator-imports-no-adapter': {
      coverage: 'full',
      checks: ['depcruise-orchestrators-import-no-adapter', 'depcruise-entrypoint-is-not-imported'],
      proof: conformance('orchestrator-imports-no-adapter'),
      note: null,
    },
    'orchestrator-performs-no-effects': {
      coverage: 'partial',
      checks: ['depcruise-orchestrators-are-pure', 'no-effects'],
      gap: effectsGap,
      proof: conformance('orchestrator-performs-no-effects'),
    },
    'orchestrator-libraries-are-pure': none,
    'orchestrator-branches-only-on-core-results': none,
    'driving-adapter-imports-only-core-orchestrators-and-driving-adapters': {
      coverage: 'partial',
      checks: ['depcruise-driving-adapters', 'depcruise-entrypoint-is-not-imported'],
      gap: "A port is declared in the orchestrator's module, which a driving adapter may import, so a driving adapter that takes a port isn't caught.",
      proof: conformance('driving-adapter-imports-only-core-orchestrators-and-driving-adapters'),
    },
    'driven-adapter-imports-only-core-ports-and-driven-adapters': {
      coverage: 'full',
      checks: ['depcruise-driven-adapters'],
      proof: conformance('driven-adapter-imports-only-core-ports-and-driven-adapters'),
      note: null,
    },
    'driving-adapter-calls-no-driven-adapter': {
      coverage: 'partial',
      checks: ['depcruise-driving-adapters'],
      gap: 'A driving adapter that declares an interface and is given a driven adapter through it by src/main.ts is not caught; only importing one is.',
      proof: conformance('driving-adapter-imports-only-core-orchestrators-and-driving-adapters'),
    },
    'driven-adapter-calls-no-orchestrator': {
      coverage: 'partial',
      checks: ['depcruise-driven-adapters'],
      gap: 'A driven adapter that declares an interface and is given an orchestrator through it by src/main.ts is not caught; only importing one is.',
      proof: conformance('driven-adapter-imports-only-core-ports-and-driven-adapters'),
    },
    'adapter-size-is-limited': {
      coverage: 'full',
      checks: ['max-lines-edges', 'complexity'],
      proof: conformance('adapter-size-is-limited'),
      note: null,
    },
    'only-entrypoints-read-configuration': {
      coverage: 'full',
      checks: ['no-configuration'],
      proof: conformance('only-entrypoints-read-configuration'),
      note: null,
    },
    'entrypoint-size-is-limited': {
      coverage: 'full',
      checks: ['max-lines-edges'],
      proof: conformance('entrypoint-size-is-limited'),
      note: null,
    },
    'wired-without-a-container': {
      coverage: 'partial',
      checks: ['depcruise-no-container'],
      gap: 'Only the common container libraries are banned, not a service locator written in the project.',
      proof: conformance('wired-without-a-container'),
    },
    'entrypoint-calls-only-driving-adapters': none,
    'no-import-cycles': { coverage: 'full', checks: ['depcruise-no-circular'], proof: conformance('no-import-cycles'), note: null },
    'ports-declared-by-their-user': {
      coverage: 'full',
      checks: ['depcruise-orchestrators-import-no-adapter'],
      proof: conformance('orchestrator-imports-no-adapter'),
      note: "An orchestrator can't import an adapter, so it can't take an interface an adapter declares.",
    },
    'port-units-follow-typing': {
      coverage: 'partial',
      checks: ['depcruise-driven-adapters'],
      gap: 'A module of interfaces that other orchestrators import is an orchestrator like any other, so a ports module is not caught.',
      proof: conformance('driven-adapter-imports-only-core-ports-and-driven-adapters'),
    },
    'ports-named-in-domain-terms': { coverage: 'convention', where: 'README.md, Roles' },
    'applications-are-never-dependencies': none,
    'library-adapters-use-only-the-standard-library': none,
    'closed-families-are-sealed': {
      coverage: 'partial',
      checks: ['union-types', 'banned-syntax'],
      gap: 'A family modelled as an interface that classes implement is not recognised as one, so any module can add a variant.',
      proof: conformance('closed-families-are-sealed'),
    },
    'sealed-variants-share-their-unit': none,
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
      note: 'TypeScript needs no catch-all: it knows a switch that names every member returns.',
    },
    'open-interfaces-are-not-matched-by-type': none,
    'ports-are-open': none,
    'classes-extend-only-allowed-bases': {
      coverage: 'full',
      checks: ['banned-syntax'],
      proof: conformance('classes-extend-only-allowed-bases'),
      note: "JavaScript's own errors may be extended, so a thrown error can have a name of its own.",
    },
    'no-parameter-default-values': {
      coverage: 'full',
      checks: ['banned-syntax'],
      proof: conformance('no-parameter-default-values'),
      note: null,
    },
    'no-optional-parameters': { coverage: 'full', checks: ['banned-syntax'], proof: conformance('no-optional-parameters'), note: null },
    'constructors-only-store-their-arguments': none,
    'field-initialisers-are-constants': none,
    'invariant-types-are-closed': none,
    'closed-types-have-no-way-around-their-factories': none,
    'arguments-are-not-mutated': none,
    'fields-are-declared-read-only': {
      coverage: 'partial',
      checks: ['prefer-readonly'],
      gap: "Only a private field that is never reassigned is reported: a public or protected field, and a read-only field whose type lets its contents change, such as an array rather than a ReadonlyArray, aren't.",
      proof: conformance('fields-are-declared-read-only'),
    },
    'fields-are-assigned-only-at-construction': none,
    'field-collections-are-not-changed': none,
    'parameters-are-not-reassigned': {
      coverage: 'full',
      checks: ['no-param-reassign'],
      proof: conformance('parameters-are-not-reassigned'),
      note: null,
    },
    'locals-are-declared-constant': {
      coverage: 'full',
      checks: ['banned-syntax'],
      proof: conformance('locals-are-declared-constant'),
      note: 'let and var are banned outright, so every local is const.',
    },
    'returned-failures-are-used': {
      coverage: 'partial',
      checks: ['no-unused-result', 'no-unused-vars'],
      gap: 'A call that drops a sentinel, such as null, as a statement is not reported.',
      proof: [...conformance('returned-failures-are-used'), ...conformance('returned-failures-are-used misses a dropped sentinel')],
    },
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
  },
};

// The case each clause that varies by a trait is assessed for: TypeScript's value of the trait.
const cases: Readonly<Record<string, string>> = {
  'port-units-follow-typing': 'structural',
  'fields-are-declared-read-only': 'supported',
  'locals-are-declared-constant': 'supported',
};

export const listingPath = 'rulebook-coverage.json';

// A null field is left out, as the rulebook's schema has it, and a clause that varies names its case first.
export const listingJson = (): string => {
  const clauses = Object.fromEntries(Object.entries(listing.clauses).map(([id, claim]) => [id, { case: cases[id] ?? null, ...claim }]));
  return `${JSON.stringify({ ...listing, clauses }, (_key, value: unknown) => (value === null ? undefined : value), 2)}\n`;
};
