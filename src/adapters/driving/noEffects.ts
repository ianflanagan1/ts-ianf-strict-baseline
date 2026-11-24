import { AST_NODE_TYPES, ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import { isGlobal } from './scope.ts';

const createRule = ESLintUtils.RuleCreator((name) => `https://github.com/ianflanagan1/ts-ianf-strict-baseline#${name}`);

type Effect = { readonly does: string; readonly fix: string };

const clock: Effect = { does: 'reads the clock', fix: 'take the time from a clock port' };
const randomness: Effect = { does: 'is random', fix: 'take the value from a port' };
const network: Effect = { does: 'uses the network', fix: 'reach it through a port' };
const storage: Effect = { does: 'reads and writes storage', fix: 'reach it through a port' };

// The globals that reach outside the program, and what each does. Browser globals such as `window` and `document`
// are left out: they also hold much that is pure.
const effectGlobals: Readonly<Record<string, Effect>> = {
  setTimeout: clock,
  setInterval: clock,
  setImmediate: clock,
  queueMicrotask: clock,
  requestAnimationFrame: clock,
  performance: clock,
  crypto: randomness,
  fetch: network,
  XMLHttpRequest: network,
  WebSocket: network,
  EventSource: network,
  localStorage: storage,
  sessionStorage: storage,
  indexedDB: storage,
  process: { does: 'controls the process and reads its configuration', fix: 'take what you need through a port' },
  console: { does: 'uses the console', fix: 'write through a port' },
  globalThis: { does: 'reaches every global', fix: 'take what you need through a port' },
};

// The members of pure globals that aren't pure.
const effectMembers: Readonly<Record<string, Readonly<Record<string, Effect>>>> = {
  Date: { now: clock },
  Math: { random: randomness },
};

// Whether a reference reads the value of a global, rather than of the code's own binding. A `typeof` in a type names
// the global's type, and runs nothing.
function readsGlobalValue(reference: TSESLint.Scope.Reference): boolean {
  const inType = reference.identifier.parent.type === AST_NODE_TYPES.TSTypeQuery;
  const global = reference.resolved === null || reference.resolved.defs.length === 0;
  return reference.isValueReference && !inType && global;
}

export const noEffects = createRule({
  name: 'no-effects',
  meta: {
    type: 'problem',
    docs: { description: 'Disallow the globals that perform effects, so the core and orchestrators reach the outside only through ports' },
    messages: {
      effect: '`{{name}}` {{does}}; {{fix}}.',
      moduleState:
        'A module-level `{{kind}}` is global state, shared by every caller. Declare it `const`, or keep the state in a value the caller holds.',
    },
    schema: [],
    defaultOptions: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const report = (node: TSESTree.Node, name: string, effect: Effect): void => {
      context.report({ node, messageId: 'effect', data: { name, does: effect.does, fix: effect.fix } });
    };
    return {
      'Program:exit'() {
        for (const scope of sourceCode.scopeManager?.scopes ?? []) {
          for (const reference of scope.references) {
            const name = reference.identifier.type === AST_NODE_TYPES.Identifier ? reference.identifier.name : '';
            const effect = effectGlobals[name];
            if (effect !== undefined && readsGlobalValue(reference)) {
              report(reference.identifier, name, effect);
            }
          }
        }
      },
      'NewExpression[callee.type="Identifier"][callee.name="Date"]'(node: TSESTree.NewExpression) {
        if (node.arguments.length === 0 && isGlobal(sourceCode, node, 'Date')) {
          report(node, 'new Date()', clock);
        }
      },
      'MemberExpression[object.type="Identifier"][property.type="Identifier"]'(node: TSESTree.MemberExpression) {
        if (node.object.type !== AST_NODE_TYPES.Identifier || node.property.type !== AST_NODE_TYPES.Identifier) {
          return;
        }
        const effect = effectMembers[node.object.name]?.[node.property.name];
        if (effect !== undefined && isGlobal(sourceCode, node, node.object.name)) {
          report(node, `${node.object.name}.${node.property.name}`, effect);
        }
      },
      ':matches(Program, Program > ExportNamedDeclaration) > VariableDeclaration[kind!="const"]'(node: TSESTree.VariableDeclaration) {
        context.report({ node, messageId: 'moduleState', data: { kind: node.kind } });
      },
    };
  },
});
