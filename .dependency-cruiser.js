// @ts-check
// The verify core decides from plain values, so it imports nothing but itself and the banned-syntax list. src/cli.ts
// is the entrypoint and src/verify/gatherFacts.ts the driven adapter that reads a project's files; the rest are
// orchestrators.

/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  extends: './dependency-cruiser.js',
  forbidden: [
    {
      name: 'core-is-pure',
      from: { path: '^src/(verify/findProblems|bannedSyntax)\\.ts$' },
      to: { pathNot: '^src/(verify/findProblems|bannedSyntax)\\.ts$' },
    },
    {
      name: 'orchestrators-are-pure',
      from: { path: '^src/', pathNot: ['^src/(cli|verify/gatherFacts)\\.ts$', '\\.test\\.tsx?$'] },
      to: { dependencyTypes: ['core'] },
    },
  ],
  options: {
    exclude: { path: ['node_modules', '\\.devbox', 'fixtures', 'dist'] },
  },
};
