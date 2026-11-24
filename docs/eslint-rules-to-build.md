# ESLint rules to build

Every ESLint rule of its own that ts-ianf-strict-baseline still needs, so that each can be built and tested alone. `src/rulebook/eslintRulesToBuild.test.ts` keeps the list in step with the listing and with the rules that exist.

## Keeping the list

- **A new rule or requirement goes here first.** When a clause needs a rule the baseline doesn't have, or what a planned rule must do changes, add or change its entry in the same change. Don't build the rule in that change.
- **One rule to a session, test-first.** Turn the entry's fixtures into modules under `src/fixtures/conformance` and cases in the rule's own test, write the conformance test named for the clause, see it fail, then write the rule in `src/adapters/driving/`, add it to the plugin in `src/adapters/driving/eslint.ts`, turn it on there, and add it to the rules `verify` requires in `src/core/findProblems.ts`.
- **Then record it.** Update the clause's claim in `src/core/listing.ts`, run `task rulebook-coverage`, and delete the entry here. The test fails while an entry names a rule that exists, or a clause the listing covers in full. A conformance test named `… misses …` that pins the gap the rule closes fails too, and goes in the same change.
- **Only ESLint rules.** A setting or rule of a tool the baseline already has, a `no-restricted-syntax` selector among them, a dependency-cruiser rule, a `verify` step or a new tool isn't listed here.

## An entry

The heading is the rule's name, as the plugin registers it. Each entry has these lines:

- **Clauses:** the rulebook clauses it enforces, each in backticks.
- **Reports:** what it must report.
- **Allows:** what it must not report.
- **Fixtures:** the code to prove it with: the clauses' violations, and the code it must pass.
- **Why no existing tool:** why tsc, the rules of ESLint and typescript-eslint, `no-restricted-syntax` and dependency-cruiser don't reach it.
- **Needs first:** what must exist or be decided before it can be built, if anything.
- **Specified in:** another document that already says what the rule must do. An entry with this line may leave out the four lines it replaces.

A rule that applies to some roles is turned on for their paths by a block of `roleBlocks`, as `no-effects` is, until the role classifier gives it roles.

## Ready to build

### no-loop-until-stopped

- **Clauses:** `orchestrator-code-runs-no-loop-until-stopped`
- **Reports:** in modules under `src/orchestrators/`, `while (true)`, `for (;;)`, `do … while (true)`, and a loop whose condition calls, or awaits a call to, anything but a function declared under `src/core/`, such as a port's method.
- **Allows:** a `for…of` over a collection; a loop whose condition tests a value a function under `src/core/` returned, such as reading pages until the last.
- **Fixtures:** the clause's violations, and an orchestrator that reads pages until the core says it has them all. A loop over pieces of work that could each fail alone isn't in the code, and stays the gap.
- **Why no existing tool:** `no-restricted-syntax` reports `while (true)` by its shape, and can't tell a condition that calls a port from one that calls the core, which takes the declaration behind the call.

### no-port-returns-interface

- **Clauses:** `port-methods-return-no-interfaces`
- **Reports:** a method, or a property with a function type, of an interface declared under `src/orchestrators/`, whose declared return type is or holds an interface, or a type alias whose members are all methods: by itself, or inside a `Promise`, a nullable form, a list or a Result.
- **Allows:** a class, whose methods derive values; a union of core types; scalars; a `Promise` of nothing; an error class.
- **Fixtures:** the clause's violations, and a port whose methods return a `Promise` of a core class and of a Result.
- **Why no existing tool:** no rule of ESLint or typescript-eslint reads what kind of type a method returns by where the method is declared.
- **Specified in:** code-rulebook `docs/plans.md`, "Changes and call order", which names the rule.

### entrypoint-catch-all

- **Clauses:** `entrypoint-catches-what-escapes`
- **Reports:** a `src/main.ts` or `src/main.tsx` whose top-level code, apart from imports and declarations of functions and types, isn't one `try` statement, or whose `catch` doesn't set `process.exitCode` to a number other than zero; and a `catch` inside that `try` that doesn't throw again, so that the program goes on after a failure.
- **Allows:** imports and declarations of functions and types before the `try`; a call of one `async` function whose `.catch` handler sets the exit code, in place of the `try`.
- **Fixtures:** the clause's second and third violations, and the entrypoint README.md's Errors section gives. Whether the code turns a failure its `run` function returns into a failing exit code isn't in the `try`, and stays the gap.
- **Why no existing tool:** no rule reads the shape of a module's top-level code.
- **Specified in:** code-rulebook `TO-IMPLEMENT.md`, "Errors: catching and throwing by role".

### no-ignored-failure-branch

- **Clauses:** `failure-branches-act`
- **Reports:** a branch taken on a check that a call's result is a failure, which is a test that the `ok` of a Result is false, with a Result recognised as `no-unused-result` recognises one, or `=== null` on a result whose type includes `null`, when the branch is empty, holds only a comment, or returns a Result whose `ok` is true from a function whose own return type has a failure.
- **Allows:** a branch that does anything else, a substituted value among them.
- **Fixtures:** the clause's violations that TypeScript can write, `core/design/commentedFailureBranch.ts`, which a test pins as passing, and a branch that creates the record that wasn't found.
- **Why no existing tool:** `no-empty` reports a block with nothing in it, whatever it was taken for, and passes one that holds a comment.
- **Specified in:** code-rulebook `TO-IMPLEMENT.md`, "Errors: failures handled, discarded and reported".

### no-unexplained-discard

- **Clauses:** `explicit-discards-give-a-reason`
- **Reports:** `void` on a call whose result is a Result, a promise or a type that includes `null`, and a constant that `no-unused-vars` leaves alone for its underscore, set from such a call, with no comment on its line or the line above.
- **Allows:** either with a comment.
- **Fixtures:** the clause's second and third violations, and a commented discard of each kind.
- **Why no existing tool:** `no-unused-result` and `@typescript-eslint/no-floating-promises` accept every `void` as a deliberate discard, and `no-unused-vars` every name that starts with an underscore.
- **Specified in:** code-rulebook `TO-IMPLEMENT.md`, "Errors: failures handled, discarded and reported".

### no-unused-sentinel

- **Clauses:** `returned-failures-are-used`
- **Reports:** an expression statement that is a call whose return type includes `null`, or a promise of one that is awaited.
- **Allows:** the call under `void`, which `no-unexplained-discard` then asks a reason for; a call whose result is used.
- **Fixtures:** `core/design/dropsSentinel.ts`, which a test pins as passing, and a function that tests what the same call returned.
- **Why no existing tool:** `no-unused-result` recognises a Result by its shape, and a sentinel has none; `no-unused-expressions` passes every call.

### no-false-sentinel

- **Clauses:** `sentinels-are-null-or-a-found-flag`
- **Reports:** a function or method whose return type, declared or inferred, is a union of `false` with anything but `true`, inside a `Promise` included.
- **Allows:** a nullable return type; `boolean`; a method whose signature is declared outside the project.
- **Fixtures:** the clause's third violation as TypeScript writes it, `Order | false`, and a function that returns `Order | null`. A sentinel such as `-1` or `''` can't be told from a value, and stays the gap.
- **Why no existing tool:** `Order | false` is a valid type, so tsc accepts it.

### no-boolean-parameters-or-fields

- **Clauses:** `no-boolean-parameters`, `no-boolean-fields`
- **Reports:** a parameter of a function, method or constructor, a field of a class, and a property of an object type or interface under `src/core/` or `src/orchestrators/`, whose type is `boolean`, or a nullable or collection form of it, written or reached through an alias.
- **Allows:** a boolean return type; a property whose type is one boolean literal, as the `ok` of a Result is; a property of an object type alias in adapter and entrypoint code, which is a plain-data type; a signature declared outside the project that the function must match, such as a callback's.
- **Fixtures:** both clauses' violations, a predicate that returns `boolean`, a Result, and a plain-data type with a boolean property in a driven adapter.
- **Why no existing tool:** a `no-restricted-syntax` selector for the `boolean` keyword reports a return type and a callback's result too, and misses an alias; nothing restricts a type by the declaration it is written on.

### no-nullable-core-fields

- **Clauses:** `core-type-fields-are-not-nullable`
- **Reports:** under `src/core/`, a field of a class or a property of an object type whose type includes `null` or `undefined`, an optional field of a class, and a collection whose element type includes either, written or reached through an alias.
- **Allows:** a nullable parameter of a factory method; a nullable return type; fields outside `src/core/`.
- **Fixtures:** the clause's violations that TypeScript can write, among them `core/design/nullableField.ts` and `core/design/optionalClassField.ts`, which a test pins as passing, and a factory method that takes `string | null` and returns a failure for null.
- **Why no existing tool:** `no-restricted-syntax` bans an optional property wherever it is, and nothing restricts `null` in a type by where the type is declared.

### no-positional-groups

- **Clauses:** `no-positional-groups`
- **Reports:** a parameter, return or field type that is a tuple, or a nullable or collection form of one, written, inferred or reached through an alias; and a function declared to return a list that returns an array literal of fixed length.
- **Allows:** a property of an object type alias in adapter and entrypoint code, which is a plain-data type; a signature declared outside the project that the function must match, such as the parameter of a callback given to `Object.entries(…).map`; a list built by a call or a loop.
- **Fixtures:** the `tuples` case's violations that TypeScript can write, a function that returns a named type with two fields, and a callback over `Object.entries`.
- **Why no existing tool:** a tuple is a valid type, so tsc accepts it; a `no-restricted-syntax` selector reports one only where it is written, and can't exempt a plain-data type's property.

### no-unknown-types

- **Clauses:** `unknown-types-stay-in-adapter-and-entrypoint-code`
- **Reports:** under `src/core/` and `src/orchestrators/`, a parameter, result, field or variable whose type, declared or inferred, is `unknown`, or a list, map, set or record whose element or key type is, written or reached through an alias.
- **Allows:** a type parameter, with or without a constraint; the binding of a `catch` clause, which TypeScript types `unknown` itself, and which the core needs to tell an expected failure from the rest; the same declarations in adapter and entrypoint code.
- **Fixtures:** the clause's violations that TypeScript can write, `orchestrators/portTakesCallback.ts`, whose port takes an unknown and which a test pins as passing, a generic function over its type parameter, and a driven adapter that narrows an unknown.
- **Why no existing tool:** a `no-restricted-syntax` selector for the `unknown` keyword reports it only where it is written, and misses a type the checker infers, such as the `Set<unknown>` that `new Set()` builds, or what a library's function returns to an orchestrator.

### no-untyped-collections

- **Clauses:** `collection-types-name-their-element-type`
- **Reports:** a collection built with no type arguments (`new Map()`, `new Set()`, `new WeakMap()`, `new WeakSet()`, `new Array()` or an empty array literal) whose element or key type the checker resolves as `any` or `unknown`, because nothing names it.
- **Allows:** a collection whose type arguments are written; one whose types come from an annotation, or from the declared type it is returned as or passed to; one built from typed values, such as `new Map(entries)`.
- **Fixtures:** the clause's TypeScript violation, a `new Set()` kept in a constant, a `new Map<string, number>()`, a `new Map()` assigned to a constant annotated `Map<string, number>`, and a `new Map()` returned from a function whose return type names its keys and values.
- **Why no existing tool:** tsc gives `new Map()` the type `Map<any, any>` with no error, since `noImplicitAny` reports declarations and not type arguments; `@typescript-eslint/no-explicit-any` reports only an `any` that is written; and the `no-unsafe-…` rules pass the map, even one kept in a constant and then returned as a map of a declared type.

### constructors-only-store

- **Clauses:** `constructors-only-store-their-arguments`, `field-initialisers-are-constants`
- **Reports:** a constructor whose body has any statement but `this.field = parameter;`, with the parameter unchanged; and a field initialiser that is anything but a literal or a constant the code declares.
- **Allows:** an empty body; a call to `super` with the parameters unchanged, in a class that extends one of JavaScript's errors.
- **Fixtures:** both clauses' violations that TypeScript can write, a class whose constructor stores each parameter, and an error class that passes its message to `super`.
- **Why no existing tool:** `no-restricted-syntax` reports a statement in a constructor by its shape, and can't tell that what an assignment stores is a parameter, unchanged.

### factory-functions

- **Clauses:** `core-types-have-factory-functions`, `core-types-are-built-only-by-their-factory-functions`, `sentinels-report-only-absence`, `each-project-table-has-an-id-type`
- **Reports:** for each class under `src/core/`: a constructor that isn't `private`, or no declared constructor; no `static` method whose return type is the class, or a Result that holds it; a `static` method that returns the class or `null`, which reports a broken invariant as absence; and no `declare private readonly brand: never;`, without which an object literal, a spread copy or another class with the same fields type-checks as the class.
- **Allows:** unions, interfaces and object types, which have no constructor to hide; a factory method whose return type is a Result of the class and a failure.
- **Fixtures:** the first clause's violations in its `private-constructors` case; a class with no brand, with an object literal and a spread copy typed as it; two ID classes with the same fields and no brand, one passed for the other; a factory method that returns `Email | null`; and a class with a private constructor, the brand and one factory method that returns a Result. A constructor call from outside the class is tsc's to reject, and with the brand so are the literal and the copy.
- **Why no existing tool:** tsc reports a call to a private constructor from outside its class, and not a class whose constructor is public, that has no factory method, or that structural typing lets a literal stand in for.
- **Specified in:** code-rulebook `docs/plans.md`, "Factory-method shape (PHP)", which says ts-ianf-strict-baseline needs the same as an ESLint rule, and "Candidates from existing tools" under "Construction of core types", for the literal.

### one-construction-site

- **Clauses:** `one-factory-function-calls-each-constructor`
- **Specified in:** code-rulebook `docs/plans.md`, "One construction site", which gives TypeScript's rule.

### sealed-variants-in-one-module

- **Clauses:** `sealed-variants-share-their-unit-of-code`
- **Reports:** a type alias that is a union of object types or classes with a common discriminant, one of whose members is declared in another module, or is itself such a union declared in another module.
- **Allows:** a union whose every variant its own module declares; a union of string literals; a nullable form, such as `Order | null`. A union written inline in a signature declares no family, and isn't reported.
- **Fixtures:** the clause's violation, and `core/design/shape.ts` and `core/cycle/union.ts`, whose variants are their own.
- **Why no existing tool:** tsc accepts a union of any types, and dependency-cruiser sees the import and not what it is used for.

### no-match-on-open-interface

- **Clauses:** `open-interfaces-are-not-matched-by-implementation`
- **Reports:** an `instanceof` test, in a condition or a `switch (true)` arm, of a value whose type is an interface the project declares, or a type alias whose members are all methods, against a class.
- **Allows:** a test of a value whose type is a union, which is a closed family; a test of a value of unknown type, or of an `Error`, against an error class, which is a match on a failure's type.
- **Fixtures:** the clause's violations, a `catch` that tests what it caught against an error class, and an `instanceof` test of a union of two classes.
- **Why no existing tool:** tsc checks that an `instanceof` test can be true, not whether the family is open.

### no-computed-member-access

- **Clauses:** `nothing-is-called-by-a-computed-name`, `visibility-is-not-bypassed`
- **Reports:** element access with a key that isn't a literal, on a value whose type declares its members: a class, an interface, an object type, a module namespace or `globalThis`; and a call or `new` whose callee is an element access by a string key, whatever the object's type, such as `handlers[kind]()`.
- **Allows:** an index into an array or a tuple; a read by key from a type with only an index signature, such as a `Record<string, number>`; a function taken from a list by its index and called.
- **Fixtures:** both clauses' TypeScript violations, `core/design/elementAccessByConstant.ts`, which a test pins as passing, and one function for each allowance. A function read from a `Record` into a constant and then called escapes it, and stays the gap.
- **Why no existing tool:** `@typescript-eslint/dot-notation` reports only a key written as a string literal, and a `no-restricted-syntax` selector for a computed callee can't tell a list's index from a name.
- **Specified in:** code-rulebook `docs/plans.md`, "Escape hatches", which names the candidates.

### no-identity-comparison

- **Clauses:** `references-are-not-compared-by-identity`, `collections-are-not-keyed-by-instance`
- **Reports:** outside `src/adapters/`: `===` and `!==` where both operands' types are objects; `includes`, `indexOf` and `lastIndexOf` on a list whose element type is an object; a `switch` whose subject's type is an object; `new Map` and `new WeakMap` whose key type is an object; and `new Set` and `new WeakSet` whose element type is one.
- **Allows:** either operand being `null` or `undefined`, as in `order === null`; numbers, strings, booleans, bigints and unions of literals, which `===` compares by value; `switch (true)`, whose subject is a boolean.
- **Fixtures:** both clauses' TypeScript violations, and one function for each case it allows.
- **Why no existing tool:** `@typescript-eslint/no-unnecessary-condition` reports a comparison that is always true or false, not one between objects, and `no-restricted-syntax` can't see an operand's type.

### no-miswired-adapters

- **Clauses:** `driving-adapter-code-calls-no-driven-adapter`, `driven-adapter-code-calls-no-orchestrator`
- **Reports:** in `src/main.ts` and `src/main.tsx`, an argument whose type is declared under `src/adapters/driven/`, or a function that captures a value of one, passed to a constructor or function declared under `src/adapters/driving/`; and one whose type is declared under `src/orchestrators/` passed to a constructor or function declared under `src/adapters/driven/`.
- **Allows:** an orchestrator passed to a driving adapter; a driven adapter passed to an orchestrator or to another driven adapter; values of core types and scalars passed anywhere.
- **Fixtures:** both clauses' violations, wired in an entrypoint, and an entrypoint that passes a store to an orchestrator and the orchestrator to a server. A system adapter given to a driving adapter that may not call it waits on TypeScript's shared code, and stays the gap.
- **Why no existing tool:** dependency-cruiser reports an import, and an adapter that declares an interface of its own imports nothing: interface implementation is structural, so only the entrypoint's call shows what the adapter was given.

### one-use-case-call-per-test

- **Clauses:** `orchestrator-test-case-calls-one-use-case-once`
- **Reports:** a test case, the function given to `it` or `test`, in a test file under `src/orchestrators/` that makes no call, or more than one, to an exported function or a method of a class declared in a module under `src/orchestrators/` that isn't a test, or makes one inside a loop.
- **Allows:** any number of calls on fakes and on the core; `it.each`, whose every row is a test case.
- **Fixtures:** the clause's violations, and a test that sets a fake, calls once and checks the fake. A call made through a helper function isn't counted, and stays the gap.
- **Why no existing tool:** nothing counts a test's calls by what they are calls to.
- **Specified in:** code-rulebook `TO-IMPLEMENT.md`, "Testing: fakes, contract tests, single calls and mutation testing".

## Waiting on a decision

### no-swallowing-catch

- **Clauses:** `driving-adapter-code-catches-everything-only-around-invocations`
- **Reports:** in modules under `src/adapters/driving/`, a `catch` clause, a `.catch` handler or a `then` rejection handler that doesn't throw again what it caught on every path where an `instanceof` test hasn't recognised it, except in the one function the project marks as its invocation catch-all.
- **Allows:** a catch that handles the errors it recognises and throws the rest again; the marked catch-all.
- **Fixtures:** the clause's violations, a controller that catches a parse error it tests for and throws the rest again, and a marked catch-all.
- **Why no existing tool:** every `catch` in TypeScript catches everything, so no selector tells a catch-all from a narrow catch; only what the handler does with what it caught does.
- **Needs first:** how a project marks its invocation catch-all, such as an option that names the function.
- **Specified in:** code-rulebook `TO-IMPLEMENT.md`, "Errors: catching and throwing by role".

### immutable-types

- **Clauses:** `values-have-immutable-types`, `collection-types-are-immutable`, `fields-are-declared-read-only`, `field-collections-are-not-changed`, `core-does-nothing-impure`, `orchestrator-code-performs-no-effects`
- **Reports:** under `src/core/` and `src/orchestrators/`, a parameter, result, field, local or module-level constant whose type, declared or inferred, or a type argument of it, is a collection that can be changed (`T[]`, `Array`, `Map`, `Set`), or a class or object type with a field that isn't `readonly`, `Date` among them. A field or a module-level constant can then hold only what tsc lets no code change, which closes the held state and the memoising constant that the two purity clauses' gaps name.
- **Allows:** `readonly T[]`, `ReadonlyArray`, `ReadonlyMap` and `ReadonlySet` of immutable types; scalars, unions of literals and functions; interfaces; error classes; the same declarations in adapter code.
- **Fixtures:** the two immutable-type clauses' violations that TypeScript can write, the field clauses' violations of a list, a map and an object a field holds, `core/mutableConst.ts`, which a test pins as passing, a core type with a `ReadonlyArray` field, and a driven adapter that holds a `Map`.
- **Why no existing tool:** `@typescript-eslint/prefer-readonly-parameter-types` reaches only parameters, and `@typescript-eslint/no-restricted-types` only the types it lists, where they are written.
- **Needs first:** whether eslint-plugin-functional is vetted and added: its `prefer-immutable-types` is the candidate `docs/plans.md` names. This rule is built only if it isn't.
- **Specified in:** code-rulebook `docs/plans.md`, "Immutable types".

### no-in-place-changes

- **Clauses:** `built-values-are-not-changed`, `arguments-are-not-mutated`, `fields-are-assigned-only-at-construction`
- **Reports:** a call of a method that changes its receiver in place (`push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`, `fill` and `copyWithin` of an array, `set`, `add`, `delete` and `clear` of a `Map` or `Set`, the setters of a `Date`, and a method of the project's own class that assigns to its fields), `Object.assign` onto a value, `delete`, and an assignment to a field or element: of a parameter or anything reached from one, in every role; and of any value, outside `src/adapters/`.
- **Allows:** `toSorted`, `toReversed`, `toSpliced` and `with`, which return a new list; a constructor's assignment to a field of the object it is building; in adapter code, a change to a value the function didn't take as a parameter; a method whose signature is declared outside the project and requires the change; in `src/main.ts`, a method of a standard-library or third-party value the entrypoint built, until it passes the value on or starts it.
- **Fixtures:** the three clauses' violations that TypeScript can write, a function that returns a sorted copy, a class whose constructor stores its parameters, a driven adapter that fills a `Map` it holds, and an entrypoint that registers routes on a router before starting it.
- **Why no existing tool:** `no-param-reassign` with `props` reports an assignment to a parameter's field or element, and not a method that changes it; tsc rejects a change only where the type is read-only, which adapter code's types needn't be.
- **Needs first:** whether eslint-plugin-functional is vetted and added: its `immutable-data` is the candidate `docs/plans.md` names. This rule is built only if it isn't.
- **Specified in:** code-rulebook `docs/plans.md`, "Changes and call order".

### tested-type-guards

- **Clauses:** `no-cast-asserts-an-unchecked-type`
- **Reports:** a function declared with a type predicate (`value is Order`) or an assertion signature (`asserts value is Order`) that reaches `return true`, or for an assertion its end, on a path that never tests the parameter it names: with `typeof`, `instanceof`, `in`, a comparison, or a call that passes it to another guard.
- **Allows:** a guard whose every path to `return true` tests the parameter; a predicate tsc infers from a function's body, which it proves.
- **Fixtures:** the clause's violations of a type guard and of an assertion function that test nothing, and a guard that tests `typeof` and a field.
- **Why no existing tool:** tsc trusts a declared type predicate, and no rule of typescript-eslint reads a guard's body.
- **Needs first:** whether declared type predicates and assertion signatures are banned outright, a `no-restricted-syntax` setting that leaves the predicates tsc infers. This rule is built only if they aren't.

### one-fake-per-port

- **Clauses:** `every-port-has-one-fake`
- **Needs first:** where fakes live, and the affix a fake's name adds to its port's.
- **Specified in:** code-rulebook `TO-IMPLEMENT.md`, "Testing: fakes, contract tests, single calls and mutation testing", which says it needs the type checker to tell which port a fake implements.

### only-fakes-stand-in-for-ports

- **Clauses:** `only-driven-adapters-and-fakes-stand-in-for-ports`, `no-hand-written-scripted-doubles`
- **Reports:** an argument or assignment whose target type is a port, an interface declared under `src/orchestrators/`, and whose value is an object literal, an instance of a class a test file declares, or an instance of a class that extends or wraps a fake: anything whose type is declared neither under `src/adapters/driven/` nor in fake code.
- **Allows:** a driven adapter; the port's fake.
- **Fixtures:** the first clause's TypeScript violations, the second clause's three, `orchestrators/stubsPort.test.ts`, which a test pins as passing, and a test that builds the port's fake.
- **Why no existing tool:** dependency-cruiser reports imports, and an object literal that fits a port's shape imports nothing.
- **Needs first:** where fakes live.
- **Specified in:** code-rulebook `TO-IMPLEMENT.md`, "Testing: fakes, contract tests, single calls and mutation testing".

### contract-tests

- **Clauses:** `every-port-has-one-set-of-contract-tests`, `fake-and-adapter-tests-run-the-contract-tests`
- **Needs first:** where a port's contract tests live and what they are called, from the port's name, and how the tests of a fake and of a driven adapter are paired with the port they implement.
- **Specified in:** code-rulebook `TO-IMPLEMENT.md`, "Testing: fakes, contract tests, single calls and mutation testing".

## Waiting on the role classifier

### one-role

- **Clauses:** `every-declaration-has-one-role`, `a-unit-of-code-holds-one-role`, `every-type-has-one-shape`, `dependency-declarations-keep-their-role`
- **Needs first:** what `docs/plans.md` leaves to decide or to write for TypeScript under "Roles for each language" (how a service is known to implement a port, where a program starts, what test code is) and under "Still to decide" (how a first-party dependency's roles reach the project that uses it); and whether a step over the whole program can be an ESLint rule at all, since the shared `check` task runs ESLint with `--cache`, which keeps a module's reports until that module changes.
- **Specified in:** code-rulebook `docs/plans.md`, "Roles in each baseline", which gives its tests in order, its fixtures and what it reports. It is one step over the whole program, read from the type-aware parser's `Program`, and the rules below take each declaration's role from it.

### role-references

- **Clauses:** `driven-adapter-code-references-only-ports-and-values`, `driving-adapter-code-references-only-orchestrators-and-the-core`, `value-code-references-only-value-code`, `other-roles-reach-only-members`, `entrypoint-code-calls-only-driving-adapters-and-values`, `only-adapter-and-entrypoint-code-references-plain-data-types`, `error-types-of-other-roles-are-not-matched`, `port-units-of-code-follow-interface-implementation`
- **Reports:** a reference or a call from one declaration to another whose role the vocabulary's `may-reference` and `may-call` don't allow the first: decision code named from value or driven-adapter code; a port named from driving-adapter code; a port an orchestrator holds that its own module doesn't declare; a helper named from another role's code; a call from entrypoint code to an orchestrator, a driven adapter or decision code; a plain-data type named outside adapter and entrypoint code; and a `catch` or `instanceof` that names an error class that is another role's helper.
- **Allows:** every reference and call the vocabulary lists; entrypoint code referencing a helper to build it; a match on an error class that JavaScript or a third party declares; a driving adapter's reference to a system adapter the vocabulary says it also calls.
- **Fixtures:** the clauses' violations, the vocabulary's example for each allowed reference, `adapters/driving/importsPort.ts` and `adapters/driven/callsDecision.ts`, which tests pin as passing, and the fixtures dependency-cruiser's role rules pass and fail today, since this rule replaces them.
- **Why no existing tool:** dependency-cruiser takes a role from a module's path, so it can't tell a decision from a value, a port from its orchestrator or a helper from a member.
- **Needs first:** `one-role`.

### signature-types

- **Clauses:** `port-methods-take-and-return-signature-types`, `orchestrator-takes-and-returns-signature-types`, `decisions-driving-adapters-call-take-and-return-signature-types`, `factory-functions-take-signature-types`, `orchestrator-is-given-ports`, `the-core-takes-no-plain-data`
- **Reports:** a parameter or result that isn't a signature type, on a port's method, an orchestrator's use-case method, a decision function or method that driving-adapter code calls, and a parameter of a core type's factory method; and a constructor parameter of an orchestrator that is none of a port it declares, another orchestrator and a signature type.
- **Allows:** a core type; `number`, `bigint` and `string`; `boolean` as a result; a nullable or read-only list form of one; no result. A `Promise` of one as a result, which a port that reaches outside can't do without, though the vocabulary's signature-type term doesn't name it.
- **Fixtures:** the six clauses' violations that TypeScript can write, `orchestrators/portTakesCallback.ts`, which a test pins as passing, and a port, an orchestrator and a factory method that take and return core types and scalars.
- **Why no existing tool:** tsc knows a type, and not whether it is a core type or which role's code calls a method.
- **Needs first:** `one-role`, for which types are core types and which methods driving-adapter code calls.

### pure-arguments

- **Clauses:** `core-receives-only-pure-values`
- **Reports:** an argument to a function or method of the core, or to a core type's factory method, whose type is a port, an adapter or an orchestrator, or a function that captures or calls one; and a type argument that is one.
- **Allows:** core types, scalars, and functions over them.
- **Fixtures:** the clause's violations, and an orchestrator that passes the core what a port returned.
- **Why no existing tool:** dependency-cruiser stops the core importing a port, and not a caller passing one under a function type or an interface the core declares, which any adapter fits by its shape.
- **Needs first:** `one-role`.

### decision-results-only-reported

- **Clauses:** `driving-adapter-code-only-reports-what-a-decision-returns`
- **Reports:** in one function of driving-adapter code, a constant set from a call to decision code that is then passed to an orchestrator or to another call to decision code, or that a condition reads when the branch it guards calls an orchestrator.
- **Allows:** building the response, the output or the exit code from it.
- **Fixtures:** the clause's violations, and a controller that calls a decision and renders its result. A value that travels through a field or a helper function escapes it, and stays the gap.
- **Why no existing tool:** no tool follows a value from one call to another by the roles of the code called.
- **Needs first:** `one-role`, to tell decision code from value code.

### no-branch-on-port-result

- **Clauses:** `orchestrator-code-branches-only-on-decisions`
- **Reports:** in orchestrator code, a condition that reads a value a port's method returned, or one a core type's method derived from it, other than a test of whether the call failed: `=== null`, or a test of the `ok` of a Result.
- **Allows:** a condition on what decision code returned.
- **Fixtures:** the clause's violations, and an orchestrator that passes what it read to a decision and branches on the answer.
- **Why no existing tool:** no tool follows a value from a call to a condition by the role of the code called.
- **Needs first:** `one-role`, to tell a core type's method from a decision.

### no-sealed-ports

- **Clauses:** `no-port-is-sealed`
- **Reports:** a collaborator an orchestrator holds whose type only its own module can supply: a class with a `private`, `protected` or `#` member, which no other class fits by its shape; a union of classes or object types; and an interface with a member keyed by a `unique symbol` its module doesn't export.
- **Allows:** an interface, or a type alias whose members are all methods; another orchestrator, held by its class.
- **Fixtures:** the clause's violation, as a port declared as a class with a private field and as a union of two stores, and a port declared as an interface.
- **Why no existing tool:** tsc accepts any type as a parameter's, and nothing tells a collaborator an orchestrator holds from a value it is passed.
- **Needs first:** `one-role`, to tell a port from a core type, which is a class with a private constructor and is meant to be.

## Waiting on something else

### loop-shape

- **Clauses:** `loops-compute-no-value-an-operation-names`
- **Needs first:** TypeScript's shared collection operations, which the loops are replaced with.
- **Specified in:** code-rulebook `docs/plans.md`, "Loop-shape check".

### collection-callbacks

- **Clauses:** `collection-operations-take-pure-functions`, `folds-compute-no-value-a-narrower-operation-names`
- **Reports:** a function passed to a collection operation, which is one of the array methods the baseline lists or a shared collection operation, that calls a method of a port, an orchestrator or an adapter, awaits, performs a banned effect, or changes a list or map it captured; and a function passed to the shared `fold` whose body only appends, filters, adds, groups, keeps a least or greatest element, or sets a boolean.
- **Allows:** a pure function; a fold whose step reads the value so far, such as a running balance.
- **Fixtures:** both clauses' violations that TypeScript can write, and a fold that merges overlapping intervals. `forEach` and `reduce` are settings of `no-restricted-syntax`.
- **Why no existing tool:** `no-restricted-syntax` bans a method by its name, and not what a function passed to another does.
- **Needs first:** TypeScript's shared collection operations, among them the operation that runs an effect for each element concurrently, which `docs/plans.md` leaves to decide: without it this rule bans `Promise.all(orders.map(save))` and leaves nothing to write in its place.
- **Specified in:** code-rulebook `docs/plans.md`, "Collection operations", which names the candidates.

### no-own-collection-operations

- **Clauses:** `collection-operations-come-from-one-place`
- **Reports:** a generic function the project declares that takes a list or a map of its type parameter and a function over its elements; a class whose one field is a list or a map and whose methods take functions over its elements; and a function's name passed to an array method in place of a function literal, such as `map(parseInt)`.
- **Allows:** the shared collection operations' own code, by its full name; a generic function that takes no function; a function literal.
- **Fixtures:** the clause's violations of a project's own generic function, a class that wraps a list and `parseInt` passed to `map`, and a call of a shared operation with a function literal. A utility library and `reduce` are settings of dependency-cruiser and `no-restricted-syntax`.
- **Why no existing tool:** dependency-cruiser bans a library by its name, and nothing reports a declaration by the shape of its signature.
- **Needs first:** TypeScript's shared collection operations, where an operation a project lacks is added.
- **Specified in:** code-rulebook `docs/plans.md`, "Collection operations", which names the candidates.

### internal-values

- **Clauses:** `outside-facing-code-names-no-internal-type`, `external-driving-adapters-get-no-internal-values`, `external-driving-adapters-get-no-internal-values-from-decisions`, `external-driven-adapters-take-no-internal-values`, `only-decisions-and-internal-adapters-read-internal-values`
- **Needs first:** TypeScript's shared ID unit-of-code, and the baseline's capability list, which says whether an adapter is internal or external.
- **Specified in:** code-rulebook `docs/plans.md`, "Identity and the schema", the internal-values checks: a reference ban, a crossing check and a call-site check, which may be three rules.

### id-types

- **Clauses:** `ids-are-held-as-their-id-types`, `each-public-id-has-a-type`
- **Reports:** a field, parameter or result that holds a row's ID or public ID as a `string`, or as a third-party UUID type, and an ID field that is nullable.
- **Allows:** an ID type built on the shared ID unit-of-code.
- **Fixtures:** both clauses' violations that are in code and not in a schema.
- **Why no existing tool:** no tool knows which strings are IDs.
- **Needs first:** TypeScript's shared ID unit-of-code, and a way to tell which values are IDs, such as a field named `id` or ending `Id`.
- **Specified in:** code-rulebook `docs/plans.md`, "Identity and the schema", the static checks.

### no-id-ordering

- **Clauses:** `ids-say-nothing-about-when-rows-were-made`
- **Reports:** `<`, `<=`, `>` and `>=` where an operand is an ID type, or the text or bytes read from one; a function given to `toSorted`, or the key given to the shared `sortBy`, that orders by an ID alone; and, in query data, an order that names `id` alone or first, and a condition that compares `id` with `<` or `>`.
- **Allows:** a test that two IDs are equal; an order by a timestamp column and then by `id`, to break a tie.
- **Fixtures:** the clause's violations, a query ordered by `created_at` and then `id`, and a lookup by ID. Code that reads a time from an ID's bytes has no one shape, and stays the gap.
- **Why no existing tool:** tsc lets `<` compare any two strings, and no rule knows which values are IDs or which part of a query is its order.
- **Needs first:** TypeScript's shared ID unit-of-code, for which types are IDs, and the query-as-data release unit, for the form of an order and a condition.

### no-banned-dependency-features

- **Clauses:** `no-third-party-feature-performs-a-reserved-operation`
- **Reports:** a call of a function or method, and an option set in an object passed to one, that the baseline's dependency list bans for its release unit, found by the declaration behind the call and not by the name it has where it is called.
- **Allows:** every other feature of a listed release unit.
- **Fixtures:** the clause's violations, each against a release unit that a list made for the test bans a feature of, and a call of the same client without the banned option.
- **Why no existing tool:** `no-restricted-imports` bans a name where it is imported and `no-restricted-properties` a property of a named object; neither follows a method of an instance, or an option, to the release unit that declares it.
- **Needs first:** the baseline's dependency list, in the form code-rulebook's `docs/baselines.md` gives, with each entry's banned features.

### sources-from-system-adapters

- **Clauses:** `standard-library-and-third-party-code-takes-sources-from-the-system-adapters`
- **Reports:** a call or `new` of a function or class that the baseline's dependency list gives a source option for, without that option, or with a value that is neither a system adapter nor a function that asks one.
- **Allows:** a call that passes the system clock or the system random source, by itself or through a function.
- **Fixtures:** the clause's violations, and a token verifier given a clock that asks the system clock.
- **Why no existing tool:** nothing reports an option a call leaves out.
- **Needs first:** the baseline's dependency list, with each entry's sources, and TypeScript's shared code, which holds the system adapters.
