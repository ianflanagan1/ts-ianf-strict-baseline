# @ianflanagan1/ts-baseline

One place for the static checks every TypeScript project of mine shares, so each project depends on them rather than copying them:

| Export                                         | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@ianflanagan1/ts-baseline/eslint`             | `baseline(tsconfigRootDir)`, an ESLint flat config: typescript-eslint's strict type-checked rules, exhaustive switches with no default arm, bans on enums, default or optional parameters and class inheritance, the rules for each [role](#roles), React hooks and a11y rules for `.tsx`, test-only bans on module mocks and fake timers, and the baseline's own [rules](#rules). Also `bannedSyntax`, for a project that adds its own `no-restricted-syntax` entries. |
| `@ianflanagan1/ts-baseline/tsconfig.json`      | A strict tsconfig base for Node running TypeScript directly: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `erasableSyntaxOnly` and the rest.                                                                                                                                                                                                                                                                             |
| `@ianflanagan1/ts-baseline/prettier`           | The Prettier config.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `@ianflanagan1/ts-baseline/dependency-cruiser` | dependency-cruiser rules for a project's `extends`: what each [role](#roles) may import, a ban on dependency-injection containers, and `no-circular`.                                                                                                                                                                                                                                                                                                                   |
| `Taskfile.baseline.yml`                        | The `check`, `format` and `lint-file` tasks, for a project's Taskfile to include, so their commands arrive as a version bump.                                                                                                                                                                                                                                                                                                                                           |
| `ts-baseline rulebook`                         | Prints how the baseline enforces each clause of the [code rulebook](https://github.com/ianflanagan1/code-rulebook), as the coverage listing the rulebook checks.                                                                                                                                                                                                                                                                                                        |
| `ts-baseline verify [<dir>]`                   | Checks that a project still follows the baseline, and exits 1 with what to change when it doesn't.                                                                                                                                                                                                                                                                                                                                                                      |

## Roles

A module's path decides its role, in both the ESLint and the dependency-cruiser configs:

| Role            | Path                    | May import                                                         | May perform effects           |
| --------------- | ----------------------- | ------------------------------------------------------------------ | ----------------------------- |
| Core            | `src/core/`             | The core                                                           | None                          |
| Orchestrator    | `src/orchestrators/`    | The core, other orchestrators and libraries, but no Node built-ins | None: only through ports      |
| Driving adapter | `src/adapters/driving/` | Anything but driven adapters and `src/main.ts`                     | All but reading configuration |
| Driven adapter  | `src/adapters/driven/`  | The core and other driven adapters                                 | All but reading configuration |
| Entrypoint      | `src/main.ts`           | Anything; nothing imports it                                       | All                           |

A module under `src/` in none of these directories has no role, and ESLint reports it. Tests (`*.test.ts`) have no role, and may do anything. Functions in adapters and the entrypoint are at most 50 lines. Nothing may import a dependency-injection container: `src/main.ts` constructs each adapter and orchestrator, passes them in and starts a driving adapter.

A driving adapter, such as an HTTP server or a command line, calls an orchestrator directly. A port is an interface an orchestrator declares, which a driven adapter implements, named for what the domain needs from it (`Orders`, `Clock`), not for the vendor or technology behind it (`PostgresOrders`, `RedisCache`). Nothing checks the naming.

Everywhere, `let` and `var` are banned, so every local is `const`, no function reassigns a parameter (`no-param-reassign`), and a private field that is never reassigned is `readonly` (`prefer-readonly`).

## Use

```sh
pnpm add --save-dev @ianflanagan1/ts-baseline eslint prettier typescript
```

`eslint.config.js`:

```js
// @ts-check
import { defineConfig } from 'eslint/config';
import { baseline } from '@ianflanagan1/ts-baseline/eslint';

export default defineConfig(baseline(import.meta.dirname), {
  // the project's own blocks: ignores, import restrictions for its core
});
```

`tsconfig.json`: `{ "extends": "@ianflanagan1/ts-baseline/tsconfig.json" }`. `.prettierrc.json`: `"@ianflanagan1/ts-baseline/prettier"`. `.dependency-cruiser.js`: `export default { extends: '@ianflanagan1/ts-baseline/dependency-cruiser' }`, plus the project's own rules; a rule with a baseline rule's name changes only the fields it sets.

`Taskfile.yml`:

```yaml
includes:
  baseline:
    taskfile: ./node_modules/@ianflanagan1/ts-baseline/Taskfile.baseline.yml
    optional: true # setup installs it

tasks:
  setup:
    cmds:
      - pnpm install --frozen-lockfile
  check:
    cmds:
      - task: baseline:check # runs ts-baseline verify, so the project fails its own check when it drifts
  format:
    cmds:
      - task: baseline:format
  lint-file:
    cmds:
      - task: baseline:lint-file
```

New projects start from [ts-template](https://github.com/ianflanagan1/ts-template), which already does all of this.

## What `verify` checks

It reads the project's effective config, after `extends` and overrides, rather than its files' text, so it catches a rule turned off three blocks down as well as a missing file:

- the tsconfig turns on every strictness option the base does;
- the ESLint config applied to a `.ts` file has `no-unused-result`, `switch-exhaustiveness-check` (with `considerDefaultExhaustiveForUnions` and `allowDefaultCaseForExhaustiveSwitch` both `false`), `no-floating-promises`, `only-throw-error`, `no-unnecessary-condition`, `prefer-readonly`, `no-param-reassign` and every banned syntax as errors;
- the ESLint config applied to a file in each role has that role's rules as errors: `no-effects` in the core and the orchestrators, `no-configuration` everywhere but the entrypoint, and `max-lines-per-function` in adapters and the entrypoint;
- Prettier resolves to the same options;
- the dependency-cruiser config, after `extends`, has `core-is-pure`, `orchestrators-import-no-adapter`, `orchestrators-are-pure`, `driving-adapters-import-no-driven-adapter`, `driven-adapters-import-only-core-and-driven-adapters`, `entrypoint-is-not-imported`, `no-container` and `no-circular` as errors;
- `devbox.json` pins go-task and defines no scripts;
- the `Taskfile.yml` has `setup`, `check`, `format` and `lint-file` tasks, includes this package's `Taskfile.baseline.yml` (found by following the path, so any namespace works) without `dir` or excluding any of them, and has its own `check`, `format` and `lint-file` each run the baseline's, through `cmds` or `deps` and not with `ignore_error`;
- `package.json` pins `packageManager` and has dependency-cruiser, knip, vitest and this package;
- there's a lockfile and a knip config.

## Rules

### no-unused-result

Reports an expression statement whose value is a Result, so an expected failure can't be dropped by calling a function and ignoring what it returns. A Result is recognised by shape, so the rule needs nothing from the code it checks: every member of the type has a boolean-literal `ok` and either a `value` or an `error`. Discard one deliberately with `void`.

### no-effects

On in the core and the orchestrators. Reports the globals that reach outside the program: timers, `performance`, `crypto`, `fetch` and the other network globals, storage, `process`, `console` and `globalThis`. Also `new Date()` with no arguments, `Date.now()`, `Math.random()`, and a module-level `let` or `var`, which is state every caller shares. A binding the code declares with the same name isn't reported. Browser globals such as `window` and `document` are left out, since they also hold much that is pure.

### no-configuration

On everywhere but the entrypoint and tests. Reports `process.env`, `process.argv`, `import.meta.env`, and `env`, `argv` or `parseArgs` imported from Node, so only `src/main.ts` reads configuration and passes the values in.

## The code rulebook

The [code rulebook](https://github.com/ianflanagan1/code-rulebook) states the rules every language shares, split into clauses. `src/core/listing.ts` records which of the baseline's checks enforce each clause and the tests that prove it. `rulebook-coverage.json` holds that listing, and a test fails when the file is out of date or names a test that doesn't exist. The `rulebook` task, which `check` runs, checks the listing with `check-listing` from the code-rulebook release `RULEBOOK_RELEASE` pins: it fails on a clause that applies to TypeScript and isn't assessed, a role that isn't mapped, or a claim of full or partial coverage without proof. It runs through Go, which devbox pins for that alone.

code-rulebook is a private repository, so the task needs Git access to it. Locally, have Git fetch it over SSH: `git config --global url."git@github.com:ianflanagan1/code-rulebook".insteadOf "https://github.com/ianflanagan1/code-rulebook"`. In CI, give the job a token that can read it.

`src/rulebook/conformance.test.ts` is the proof. It runs dependency-cruiser and ESLint, with this package's configs, over `src/fixtures/conformance`, which has a module for each violation the rulebook describes. Each test is named for its clause. The tests named `… misses …` pin down gaps the listing records, so closing a gap fails its test until the listing changes too.

When a check changes what it enforces, or the baseline moves to a new rulebook release:

1. Bump `RULEBOOK_RELEASE` in `Taskfile.yml`, if moving.
2. Assess each clause the `rulebook` task reports. Where an existing check reaches, add the violation to `src/fixtures/conformance` and a test named for its clause. Where catching it needs a check the baseline doesn't have, such as a new ESLint rule, record the coverage the existing checks give and write down what the missing check must do; it is built separately.
3. Update the claim in `src/core/listing.ts`.
4. `devbox run -- task rulebook-coverage`, then `check`.

## Development

```sh
devbox run -- task setup
devbox run -- task check   # build, then the shared check: formatting, types, lint, dependency rules, knip, verify on itself, tests
```

The package includes its own `Taskfile.baseline.yml` and extends its own `dependency-cruiser.js`, as a project does through `node_modules`. Its code sits in the roles' directories, as a project's does, so its own configs add nothing to the baseline's. dependency-cruiser loads `extends` by path rather than through package exports, which is why that file sits at the package root. `src/core/findProblems.ts` decides from plain values; `src/orchestrators/verify.ts` gathers a project's facts through a port and asks the core; `src/adapters/driven/gatherFacts.ts` reads the project through ESLint's, TypeScript's and Prettier's own config resolution; `src/adapters/driving/` holds the ESLint config, its rules and the command line; and `src/main.ts` wires them together.

Release with `github release . <patch|minor|major>` ([repo-tools](https://github.com/ianflanagan1/repo-tools)): `.github/workflows/publish.yml` publishes the tag's version to npm through the `publish` task, with provenance and no token. The first version, and npm's trust in the workflow, come from `npmjs publish .`. `prepack` builds `dist/` before each publish.
