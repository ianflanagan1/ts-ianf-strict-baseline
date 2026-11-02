import type { TSESLint, TSESTree } from '@typescript-eslint/utils';

// Whether `name`, used at `node`, is the global of that name rather than a binding the code declares. A global from
// TypeScript's lib, such as `Date`, is a variable without definitions.
export function isGlobal(sourceCode: Readonly<TSESLint.SourceCode>, node: TSESTree.Node, name: string): boolean {
  return isGlobalFrom(sourceCode.getScope(node), name);
}

// Whether `name` is a global, looking from `scope` outwards.
function isGlobalFrom(scope: TSESLint.Scope.Scope | null, name: string): boolean {
  if (scope === null) {
    return true;
  }
  const variable = scope.set.get(name);
  return variable === undefined ? isGlobalFrom(scope.upper, name) : variable.defs.length === 0;
}
