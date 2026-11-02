// @ts-check
// The dependency rules every project shares. A project's .dependency-cruiser.js extends this file and adds its own
// rules; one with the same name changes only the fields it sets, so a project whose core lives elsewhere re-points
// `core-is-pure` and keeps its severity. dependency-cruiser loads `extends` by path, not through package exports,
// which is why this file sits at the package root.

/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  forbidden: [
    {
      name: 'core-is-pure',
      comment: 'The core does no I/O: no Node built-ins, no libraries, nothing else of ours.',
      severity: 'error',
      from: { path: '^src/core/' },
      to: { pathNot: '^src/core/' },
    },
    // The roles are by path, as in the ESLint baseline: src/core/ is the core, src/adapters/driving/ the driving
    // adapters, src/adapters/driven/ the driven adapters, src/main.ts the entrypoint and the rest of src/ the
    // orchestrators. Tests have no role.
    // COUPLED:ts-roles. = src/eslint.ts (the paths of each role)
    {
      name: 'orchestrators-import-no-adapter',
      comment: 'An orchestrator takes driven adapters through the ports it declares; src/main.ts passes them in.',
      severity: 'error',
      from: { path: '^src/', pathNot: ['^src/(core|adapters)/', '^src/main\\.tsx?$', '\\.test\\.tsx?$'] },
      to: { path: '^src/adapters/' },
    },
    {
      name: 'orchestrators-are-pure',
      comment: 'An orchestrator does no I/O itself: no Node built-ins. It reaches the outside through ports.',
      severity: 'error',
      from: { path: '^src/', pathNot: ['^src/(core|adapters)/', '^src/main\\.tsx?$', '\\.test\\.tsx?$'] },
      to: { dependencyTypes: ['core'] },
    },
    {
      name: 'driving-adapters-import-no-driven-adapter',
      comment: 'A driving adapter reaches outside dependencies only by calling an orchestrator.',
      severity: 'error',
      from: { path: '^src/adapters/driving/', pathNot: '\\.test\\.tsx?$' },
      to: { path: '^src/adapters/driven/' },
    },
    {
      name: 'driven-adapters-import-only-core-and-driven-adapters',
      comment: 'A driven adapter translates; it uses the core and other driven adapters, never an orchestrator or a driving adapter.',
      severity: 'error',
      from: { path: '^src/adapters/driven/', pathNot: '\\.test\\.tsx?$' },
      to: { path: '^src/', pathNot: '^src/(core|adapters/driven)/' },
    },
    {
      name: 'entrypoint-is-not-imported',
      comment: 'src/main.ts starts the program; nothing calls into it.',
      severity: 'error',
      from: { pathNot: '\\.test\\.tsx?$' },
      to: { path: '^src/main\\.tsx?$' },
    },
    {
      name: 'no-container',
      comment: 'src/main.ts constructs each adapter and orchestrator and passes it in, with no dependency-injection container.',
      severity: 'error',
      from: {},
      to: { path: '(^|node_modules/)(inversify|tsyringe|typedi|awilix|injection-js|brandi|@needle-di/core)(/|$)' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    // node_modules is not followed, but not excluded either: excluding it drops each edge into it, so the
    // core could import any library unseen.
    exclude: { path: ['\\.devbox'] },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['import', 'default'], extensions: ['.ts', '.js'] },
  },
};
