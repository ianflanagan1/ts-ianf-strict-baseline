// @ts-check
// The package follows the roles it ships: src/core/, src/orchestrators/, src/adapters/driving/ (the ESLint config,
// its rules and the command line), src/adapters/driven/ (what reads a project's files) and src/main.ts.

/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  extends: './dependency-cruiser.js',
  forbidden: [],
  options: {
    exclude: { path: ['node_modules', '\\.devbox', 'fixtures', 'dist'] },
  },
};
