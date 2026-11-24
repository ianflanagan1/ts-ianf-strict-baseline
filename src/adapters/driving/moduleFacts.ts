import path from 'node:path';
import { AST_NODE_TYPES, TSESLint, type TSESTree } from '@typescript-eslint/utils';
import tseslint from 'typescript-eslint';
import type { Loader } from './resolveModule.ts';

// What one module does that isn't pure, at the line where it does it.
type Operation = { readonly what: string; readonly line: number };

// A module one module loads, by the specifier it is written with.
export type Dependency = { readonly specifier: string; readonly loader: Loader; readonly line: number };

export type ModuleFacts = { readonly operations: ReadonlyArray<Operation>; readonly dependencies: ReadonlyArray<Dependency> };

type Sink = { readonly operations: Operation[]; readonly dependencies: Dependency[] };

// The globals that only compute: ECMAScript's own, apart from those that read the clock, the locale, the
// environment, memory or other threads (Date, Intl, WeakRef, FinalizationRegistry, SharedArrayBuffer, Atomics) and
// those that run text as code (eval, Function). A member of one is checked by itself where it isn't pure.
const intrinsics = new Set([
  ...['Array', 'ArrayBuffer', 'BigInt', 'BigInt64Array', 'BigUint64Array', 'Boolean', 'DataView', 'Iterator', 'JSON', 'Map', 'Math'],
  ...['Number', 'Object', 'Promise', 'Proxy', 'Reflect', 'RegExp', 'Set', 'String', 'Symbol', 'WeakMap', 'WeakSet'],
  ...['Error', 'AggregateError', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError'],
  ...['Float16Array', 'Float32Array', 'Float64Array', 'Int8Array', 'Int16Array', 'Int32Array'],
  ...['Uint8Array', 'Uint8ClampedArray', 'Uint16Array', 'Uint32Array'],
  ...['Infinity', 'NaN', 'undefined', 'isFinite', 'isNaN', 'parseFloat', 'parseInt'],
  ...['encodeURI', 'encodeURIComponent', 'decodeURI', 'decodeURIComponent'],
]);

// The methods that change the collection they are called on.
const changers = new Set([
  'set',
  'add',
  'delete',
  'clear',
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse',
  'fill',
  'copyWithin',
]);

// The functions that change the object passed as their first argument.
const definers: Readonly<Record<string, ReadonlyArray<string>>> = {
  Object: ['assign', 'defineProperty', 'defineProperties', 'setPrototypeOf'],
  Reflect: ['set', 'defineProperty', 'deleteProperty', 'setPrototypeOf'],
};

// The string methods that a regular expression with each flag can be given and keep no state between calls: with
// `g`, each resets lastIndex before it starts; with `y`, only split, which copies the expression, and search, which
// puts lastIndex back.
const statelessUses: Readonly<Record<'g' | 'y', ReadonlyArray<string>>> = {
  g: ['replace', 'replaceAll', 'match', 'matchAll', 'split', 'search'],
  y: ['split', 'search'],
};

const nameOf = (node: TSESTree.Node): string | null => (node.type === AST_NODE_TYPES.Identifier ? node.name : null);

// The name of the member `node` calls, as `sort` in `list.sort()`, or null.
function calledMember(node: TSESTree.CallExpression): string | null {
  return node.callee.type === AST_NODE_TYPES.MemberExpression && !node.callee.computed ? nameOf(node.callee.property) : null;
}

// The text of a string literal, or of a template literal with nothing in it to compute, or null.
function literalText(node: TSESTree.Node): string | null {
  if (node.type === AST_NODE_TYPES.Literal) {
    return typeof node.value === 'string' ? node.value : null;
  }
  return node.type === AST_NODE_TYPES.TemplateLiteral && node.expressions.length === 0 ? (node.quasis[0]?.value.cooked ?? null) : null;
}

// The outermost member expression `node` is the object of, as `a.b.c` is for `a`.
function chainTop(node: TSESTree.Node): TSESTree.Node {
  const parent = node.parent;
  return parent?.type === AST_NODE_TYPES.MemberExpression && parent.object === node ? chainTop(parent) : node;
}

// Whether `node` is the first argument of a function that changes it, such as Object.assign.
function isDefinedOn(node: TSESTree.Node): boolean {
  const call = node.parent;
  if (call?.type !== AST_NODE_TYPES.CallExpression || call.arguments[0] !== node || call.callee.type !== AST_NODE_TYPES.MemberExpression) {
    return false;
  }
  const owner = nameOf(call.callee.object);
  const member = calledMember(call);
  return owner !== null && member !== null && (definers[owner]?.includes(member) ?? false);
}

// Whether `top`, the outermost member expression of a value, is assigned or deleted through, or is a method of it
// that changes it, called.
function isWrittenThrough(top: TSESTree.Node, parent: TSESTree.Node): boolean {
  const assigned = parent.type === AST_NODE_TYPES.AssignmentExpression && parent.left === top;
  const deleted = parent.type === AST_NODE_TYPES.UnaryExpression && parent.operator === 'delete';
  const called = parent.type === AST_NODE_TYPES.CallExpression && parent.callee === top && changers.has(calledMember(parent) ?? '');
  return assigned || deleted || called || parent.type === AST_NODE_TYPES.UpdateExpression;
}

// Whether the value `node` reads is changed where it is read: assigned or deleted through a member of it, given to
// a method of it that changes it, or given to a function that changes it.
function isChanged(node: TSESTree.Node): boolean {
  const top = chainTop(node);
  const parent = top.parent;
  if (top === node || parent === undefined) {
    return isDefinedOn(node);
  }
  return isWrittenThrough(top, parent) || isDefinedOn(top);
}

// Whether code in `scope` runs after the module has loaded: in a function, unless the function is called where it
// is written.
function runsLater(scope: TSESLint.Scope.Scope, moduleScope: TSESLint.Scope.Scope): boolean {
  const variableScope = scope.variableScope;
  if (variableScope === moduleScope) {
    return false;
  }
  const block = variableScope.block;
  const isFunction = block.type === AST_NODE_TYPES.FunctionExpression || block.type === AST_NODE_TYPES.ArrowFunctionExpression;
  const calledHere = isFunction && block.parent.type === AST_NODE_TYPES.CallExpression && block.parent.callee === block;
  return !calledHere || variableScope.upper === null || runsLater(variableScope.upper, moduleScope);
}

// What a reference to the global `require` does: load the module a literal names, or something no one can follow.
function requireFact(identifier: TSESTree.Node, sink: Sink): string | null {
  const call = identifier.parent;
  if (call?.type !== AST_NODE_TYPES.CallExpression || call.callee !== identifier) {
    return '`require` used other than to call it with a module’s name';
  }
  const specifier = call.arguments[0] === undefined ? null : literalText(call.arguments[0]);
  if (specifier === null) {
    return 'a `require` of a name it computes';
  }
  sink.dependencies.push({ specifier, loader: 'require', line: call.loc.start.line });
  return null;
}

// What a reference to `module` or `exports` does: export, or something no one can follow.
function moduleFact(identifier: TSESTree.Identifier | TSESTree.JSXIdentifier): string | null {
  const parent = identifier.parent;
  const exportsMember =
    parent.type === AST_NODE_TYPES.MemberExpression && parent.object === identifier && nameOf(parent.property) === 'exports';
  const typeTest = parent.type === AST_NODE_TYPES.UnaryExpression && parent.operator === 'typeof';
  return identifier.name === 'exports' || exportsMember || typeTest ? null : '`module` used other than for `module.exports`';
}

// What a reference to one of the intrinsics does that isn't pure: change it, or call Math.random.
function intrinsicFact(identifier: TSESTree.Identifier | TSESTree.JSXIdentifier): string | null {
  if (isChanged(identifier)) {
    return `a change to the built-in \`${identifier.name}\``;
  }
  const parent = identifier.parent;
  const random = identifier.name === 'Math' && parent.type === AST_NODE_TYPES.MemberExpression && nameOf(parent.property) === 'random';
  return random ? '`Math.random`' : null;
}

// What a reference to a global does that isn't pure, or null when it only computes.
function globalFact(reference: TSESLint.Scope.Reference, sink: Sink): string | null {
  const identifier = reference.identifier;
  const name = identifier.name;
  if (reference.isWrite()) {
    return `an assignment to the global \`${name}\``;
  }
  if (name === 'require') {
    return requireFact(identifier, sink);
  }
  if (name === 'module' || name === 'exports') {
    return moduleFact(identifier);
  }
  return intrinsics.has(name) ? intrinsicFact(identifier) : `the global \`${name}\``;
}

// The flags of the regular expression `init` builds, from a literal or a call of RegExp with literal flags, or null.
function regExpFlags(init: TSESTree.Node): string | null {
  if (init.type === AST_NODE_TYPES.Literal) {
    return 'regex' in init ? init.regex.flags : null;
  }
  const built =
    (init.type === AST_NODE_TYPES.NewExpression || init.type === AST_NODE_TYPES.CallExpression) && nameOf(init.callee) === 'RegExp';
  const flags = built ? init.arguments[1] : undefined;
  return flags === undefined ? null : literalText(flags);
}

// The flag of a regular expression that keeps state between calls, `y` before `g`, that `init` builds, or null.
function statefulFlag(init: TSESTree.Node | null): 'g' | 'y' | null {
  const flags = init === null ? '' : (regExpFlags(init) ?? '');
  return flags.includes('y') ? 'y' : flags.includes('g') ? 'g' : null;
}

// Whether a reference to a module-scope regular expression with `flag` lets its state leak between calls: used in
// a function other than by a string method that resets it, or, while the module loads, handed on to other code.
function leaksState(reference: TSESLint.Scope.Reference, flag: 'g' | 'y', moduleScope: TSESLint.Scope.Scope): boolean {
  const identifier = reference.identifier;
  const call = identifier.parent;
  const stateless =
    call.type === AST_NODE_TYPES.CallExpression &&
    call.arguments[0] === identifier &&
    statelessUses[flag].includes(calledMember(call) ?? '');
  const usedInPlace = call.type === AST_NODE_TYPES.MemberExpression && call.object === identifier;
  return !stateless && (runsLater(reference.from, moduleScope) || !usedInPlace);
}

// The declarator that gives a module-scope binding its value, or null when something else declares it.
function declaratorOf(variable: TSESLint.Scope.Variable): TSESTree.VariableDeclarator | null {
  const definition = variable.defs[0]?.node;
  return definition?.type === AST_NODE_TYPES.VariableDeclarator ? definition : null;
}

// What code that runs after loading does to a module-scope binding: writes it, changes the value it holds, or uses a
// regular expression it holds in a way that keeps state between calls, which exporting it hands to other code.
function moduleStateFacts(variable: TSESLint.Scope.Variable, moduleScope: TSESLint.Scope.Scope): ReadonlyArray<Operation> {
  const declarator = declaratorOf(variable);
  const flag = statefulFlag(declarator?.init ?? null);
  const pattern = `the module-scope regular expression \`${variable.name}\`, whose \`${flag ?? ''}\` flag keeps \`lastIndex\` between calls`;
  const exported = declarator !== null && flag !== null && declarator.parent.parent.type === AST_NODE_TYPES.ExportNamedDeclaration;
  const exportedPattern = exported ? [{ what: pattern, line: declarator.loc.start.line }] : [];
  const uses = variable.references
    .filter((reference) => reference.init !== true)
    .flatMap((reference): ReadonlyArray<Operation> => {
      const line = reference.identifier.loc.start.line;
      if (runsLater(reference.from, moduleScope) && (reference.isWrite() || isChanged(reference.identifier))) {
        return [{ what: `a function's write to the module-scope \`${variable.name}\``, line }];
      }
      return flag !== null && leaksState(reference, flag, moduleScope) ? [{ what: pattern, line }] : [];
    });
  return [...exportedPattern, ...uses];
}

// Whether a reference reads a global's value, rather than a binding the module declares, or names only a type.
const readsGlobal = (reference: TSESLint.Scope.Reference): boolean =>
  reference.isValueReference && (reference.resolved === null || reference.resolved.defs.length === 0);

// What a module's bindings and globals show, once its scopes are known.
function scopeFacts(scopeManager: TSESLint.Scope.ScopeManager, sink: Sink): void {
  const globalScope = scopeManager.globalScope;
  const moduleScope = scopeManager.scopes.find((scope) => scope.type === TSESLint.Scope.ScopeType.module) ?? globalScope;
  if (moduleScope === null) {
    return;
  }
  for (const reference of scopeManager.scopes.flatMap((scope) => scope.references).filter(readsGlobal)) {
    const what = globalFact(reference, sink);
    if (what !== null) {
      sink.operations.push({ what, line: reference.identifier.loc.start.line });
    }
  }
  for (const variable of moduleScope.variables.filter((v) => v.defs.length > 0)) {
    sink.operations.push(...moduleStateFacts(variable, moduleScope));
  }
}

// The listeners that find the modules a module loads, and the computed names it loads by.
function loadListeners(sink: Sink): TSESLint.RuleListener {
  const loads = (source: TSESTree.Node, loader: Loader): void => {
    const specifier = literalText(source);
    if (specifier === null) {
      sink.operations.push({ what: 'an `import()` of a name it computes', line: source.loc.start.line });
    } else {
      sink.dependencies.push({ specifier, loader, line: source.loc.start.line });
    }
  };
  return {
    ImportDeclaration(node) {
      if (node.importKind !== 'type') {
        loads(node.source, 'import');
      }
    },
    ExportAllDeclaration(node) {
      if (node.exportKind !== 'type') {
        loads(node.source, 'import');
      }
    },
    ExportNamedDeclaration(node) {
      if (node.source !== null && node.exportKind !== 'type') {
        loads(node.source, 'import');
      }
    },
    ImportExpression(node) {
      loads(node.source, 'import');
    },
  };
}

// A rule that reports nothing, and writes what each module it is run on does into `sink`.
function collector(sink: Sink): TSESLint.RuleModule<never> {
  return {
    meta: { type: 'problem', messages: {}, schema: [], defaultOptions: [] },
    create(context) {
      const operation = (what: string, node: TSESTree.Node): void => {
        sink.operations.push({ what, line: node.loc.start.line });
      };
      return {
        ...loadListeners(sink),
        MetaProperty(node) {
          if (node.meta.name === 'import') {
            operation('`import.meta`, which says where the module is installed', node);
          }
        },
        CallExpression(node) {
          const member = calledMember(node) ?? '';
          if (member === 'localeCompare' || member.startsWith('toLocale')) {
            operation(`\`${member}()\`, whose result depends on the runtime's locale data`, node);
          }
        },
        'Program:exit'() {
          if (context.sourceCode.scopeManager !== null) {
            scopeFacts(context.sourceCode.scopeManager, sink);
          }
        },
      };
    },
  };
}

const linter = new TSESLint.Linter({ configType: 'flat' });

// The facts of a module's code, parsed as an ES module or as CommonJS. Null when it doesn't parse that way.
function parsedFacts(text: string, extension: string, esModule: boolean): ModuleFacts | null {
  const sink: Sink = { operations: [], dependencies: [] };
  const messages = linter.verify(
    text,
    [
      {
        files: ['**/*'],
        // A comment in the module's code configures nothing: no /* global */ declares away a global it reads.
        linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'off' },
        languageOptions: { parser: tseslint.parser, sourceType: esModule ? 'module' : 'commonjs', ecmaVersion: 'latest' },
        plugins: { reach: { rules: { facts: collector(sink) } } },
        rules: { 'reach/facts': 'error' },
      },
    ],
    // The name only picks the parser's dialect; the module's own path would fall under ESLint's default ignores.
    { filename: `module${extension}` },
  );
  const operations = [...sink.operations].sort((a, b) => a.line - b.line);
  return messages.some((message) => message.fatal === true) ? null : { operations, dependencies: sink.dependencies };
}

// What the module in `file`, whose code is `text`, does that isn't pure, and the modules it loads. A module that
// doesn't parse as what its package says it is is tried as the other, as Node does for a .js file.
export function moduleFacts(text: string, file: string, esModule: boolean): ModuleFacts {
  const extension = path.extname(file);
  const facts = parsedFacts(text, extension, esModule) ?? parsedFacts(text, extension, !esModule);
  return facts ?? { operations: [{ what: 'code it can’t parse', line: 1 }], dependencies: [] };
}
