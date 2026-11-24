import { readFileSync } from 'node:fs';
import path from 'node:path';
import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { moduleFacts, type Dependency, type ModuleFacts } from './moduleFacts.ts';
import { isEsModule, packageOf, resolveModule } from './resolveModule.ts';

const createRule = ESLintUtils.RuleCreator((name) => `https://github.com/ianflanagan1/ts-ianf-strict-baseline#${name}`);

// The first operation that isn't pure found from an import, and the modules that lead to it, the last with the line
// where it happens.
type Finding = { readonly operation: string; readonly path: ReadonlyArray<string> };

// A walk of the modules one import loads: those already read, the path from the import to the module being read, and
// the directory paths outside any package are shown from.
type Walk = { readonly seen: Set<string>; readonly trail: ReadonlyArray<string>; readonly cwd: string };

// What each module does, and what each module the core imports reaches, read once a run. A module of a package is
// keyed by the package's name and version and where it is installed, which the lock file decides.
const factsByFile = new Map<string, ModuleFacts>();
const verdicts = new Map<string, Finding | null>();

function factsOf(file: string): ModuleFacts {
  const cached = factsByFile.get(file);
  if (cached !== undefined) {
    return cached;
  }
  const facts = moduleFacts(readFileSync(file, 'utf8'), file, isEsModule(file));
  factsByFile.set(file, facts);
  return facts;
}

// How a module is named in a path, and in the cache: by its package's name and version and its path inside the
// package, or by its path from `cwd` when it is in no package.
function shownAs(file: string, cwd: string): string {
  const manifest = packageOf(file);
  const name = manifest?.fields.name;
  const version = manifest?.fields.version;
  return manifest !== null && typeof name === 'string' && typeof version === 'string'
    ? `${name}@${version}/${path.relative(manifest.dir, file)}`
    : path.relative(cwd, file);
}

// The trail with the line of its last module added.
const at = (trail: ReadonlyArray<string>, line: number): ReadonlyArray<string> => [...trail.slice(0, -1), `${trail.at(-1) ?? ''}:${line}`];

// What a module's dependency reaches: a host module, an import nothing can follow, or what its own module reaches.
function follow(dependency: Dependency, from: string, walk: Walk): Finding | null {
  const target = resolveModule(dependency.specifier, from, dependency.loader);
  switch (target.kind) {
    case 'host':
      return { operation: `the host module \`${dependency.specifier}\``, path: at(walk.trail, dependency.line) };
    case 'unresolved':
      return { operation: `\`${dependency.specifier}\`, which can't be resolved`, path: at(walk.trail, dependency.line) };
    case 'file':
      // A JSON module is data, and runs nothing.
      return path.extname(target.file) === '.json' ? null : reach(target.file, walk);
  }
}

// The first operation that isn't pure that loading `file` or calling into it can reach: its own, else the first its
// dependencies reach, in the order it loads them. A module already read on this walk adds nothing new.
function reach(file: string, walk: Walk): Finding | null {
  if (walk.seen.has(file)) {
    return null;
  }
  walk.seen.add(file);
  const facts = factsOf(file);
  const trail = [...walk.trail, shownAs(file, walk.cwd)];
  const own = facts.operations[0];
  if (own !== undefined) {
    return { operation: own.what, path: at(trail, own.line) };
  }
  for (const dependency of facts.dependencies) {
    const found = follow(dependency, file, { ...walk, trail });
    if (found !== null) {
      return found;
    }
  }
  return null;
}

// What the module in `file`, which the core imports, reaches, read once a run.
function verdictFor(file: string, cwd: string): Finding | null {
  const key = `${shownAs(file, cwd)} ${path.dirname(file)}`;
  const cached = verdicts.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const verdict = path.extname(file) === '.json' ? null : reach(file, { seen: new Set(), trail: [], cwd });
  verdicts.set(key, verdict);
  return verdict;
}

const shellFix = 'Take the value as an argument instead, or move the code that needs it to the shell.';

export const importsReachNothingImpure = createRule({
  name: 'imports-reach-nothing-impure',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow an import in the core of a host module, or of code that does anything impure when it loads or when it is called, at any depth',
    },
    messages: {
      impure: `\`{{specifier}}\` reaches {{operation}}, by {{path}}. ${shellFix}`,
      hostModule: `\`{{specifier}}\` is a host module, which reaches outside the program. ${shellFix}`,
      unresolved:
        "`{{specifier}}` can't be resolved, so nothing shows that it is pure. Install it, or move the code that needs it to the shell.",
      computedImport:
        "An `import()` of a name the code computes can't be followed, so nothing shows that what it loads is pure. Import the module by its name, or move the code to the shell.",
    },
    schema: [],
    defaultOptions: [],
  },
  create(context) {
    const check = (source: TSESTree.Node): void => {
      if (source.type !== AST_NODE_TYPES.Literal || typeof source.value !== 'string') {
        context.report({ node: source, messageId: 'computedImport' });
        return;
      }
      const specifier = source.value;
      // The project's own modules: the core's are checked where they are, and the rest are dependency-cruiser's.
      if (specifier.startsWith('.') || path.isAbsolute(specifier)) {
        return;
      }
      const target = resolveModule(specifier, context.filename, 'import');
      if (target.kind !== 'file') {
        context.report({ node: source, messageId: target.kind === 'host' ? 'hostModule' : 'unresolved', data: { specifier } });
        return;
      }
      const finding = verdictFor(target.file, context.cwd);
      if (finding !== null) {
        context.report({
          node: source,
          messageId: 'impure',
          data: { specifier, operation: finding.operation, path: finding.path.join(' → ') },
        });
      }
    };
    return {
      ImportDeclaration(node) {
        if (node.importKind !== 'type') {
          check(node.source);
        }
      },
      ExportAllDeclaration(node) {
        if (node.exportKind !== 'type') {
          check(node.source);
        }
      },
      ExportNamedDeclaration(node) {
        if (node.source !== null && node.exportKind !== 'type') {
          check(node.source);
        }
      },
      ImportExpression(node) {
        check(node.source);
      },
    };
  },
});
