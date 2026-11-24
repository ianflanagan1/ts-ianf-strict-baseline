import { readFileSync, realpathSync, statSync } from 'node:fs';
import { isBuiltin } from 'node:module';
import path from 'node:path';

// Where a specifier leads: a host module, a file, or nowhere this resolver can find.
export type Resolution = { readonly kind: 'host' } | { readonly kind: 'file'; readonly file: string } | { readonly kind: 'unresolved' };

// How a module asks for another, which picks the conditions of a package's exports, as Node picks them.
export type Loader = 'import' | 'require';

// A package.json, as far as resolution reads it.
export type Manifest = { readonly dir: string; readonly fields: Readonly<Record<string, unknown>> };

const conditions: Readonly<Record<Loader, ReadonlyArray<string>>> = {
  import: ['node', 'import', 'module-sync', 'default'],
  require: ['node', 'require', 'module-sync', 'default'],
};

// The extensions Node's CommonJS loader tries, and those of TypeScript a first-party package may ship.
const extensions = ['.js', '.json', '.mjs', '.cjs', '.ts', '.mts', '.cts'];

const unresolved: Resolution = { kind: 'unresolved' };

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFile = (file: string): boolean => statSync(file, { throwIfNoEntry: false })?.isFile() ?? false;

const manifests = new Map<string, Manifest | null>();

// The package.json in `dir`, read once a run.
function manifestIn(dir: string): Manifest | null {
  const cached = manifests.get(dir);
  if (cached !== undefined) {
    return cached;
  }
  const file = path.join(dir, 'package.json');
  const fields: unknown = isFile(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
  const manifest = isRecord(fields) ? { dir, fields } : null;
  manifests.set(dir, manifest);
  return manifest;
}

// The nearest package.json at or above `dir` that `accepts`.
function nearestManifest(dir: string, accepts: (manifest: Manifest) => boolean): Manifest | null {
  const manifest = manifestIn(dir);
  if (manifest !== null && accepts(manifest)) {
    return manifest;
  }
  const parent = path.dirname(dir);
  return parent === dir ? null : nearestManifest(parent, accepts);
}

// The package a file belongs to: the nearest package.json above it that names one.
export function packageOf(file: string): Manifest | null {
  return nearestManifest(path.dirname(file), (manifest) => typeof manifest.fields.name === 'string');
}

// Whether Node loads a file as an ES module, by its extension or its package's type.
export function isEsModule(file: string): boolean {
  const extension = path.extname(file);
  if (extension === '.mjs' || extension === '.mts' || extension === '.cjs' || extension === '.cts') {
    return extension === '.mjs' || extension === '.mts';
  }
  return nearestManifest(path.dirname(file), () => true)?.fields.type === 'module';
}

// The file `base` names, as it is or with an extension, or the index in the directory it names.
function probe(base: string): Resolution {
  const candidates = [
    base,
    ...extensions.map((extension) => `${base}${extension}`),
    ...extensions.map((e) => path.join(base, `index${e}`)),
  ];
  const file = candidates.find(isFile);
  return file === undefined ? unresolved : { kind: 'file', file: realpathSync(file) };
}

// A target of a package's exports, with `star` in place of each `*`, chosen by the loader's conditions.
function exportTarget(target: unknown, star: string, loader: Loader): string | null {
  if (typeof target === 'string') {
    return target.startsWith('./') ? target.replaceAll('*', star) : null;
  }
  const options = Array.isArray(target)
    ? target
    : isRecord(target)
      ? Object.entries(target)
          .filter(([condition]) => conditions[loader].includes(condition))
          .map(([, value]) => value)
      : [];
  return options.map((option: unknown) => exportTarget(option, star, loader)).find((found) => found !== null) ?? null;
}

// The target a subpath (`.` or `./name`) of a package's exports maps to, exactly or through a `*` pattern.
function exportsEntry(exportsField: unknown, subpath: string, loader: Loader): string | null {
  const subpaths = isRecord(exportsField) && Object.keys(exportsField).some((key) => key.startsWith('.'));
  if (!subpaths) {
    return subpath === '.' ? exportTarget(exportsField, '', loader) : null;
  }
  const exact = exportsField[subpath];
  if (exact !== undefined) {
    return exportTarget(exact, '', loader);
  }
  // Node prefers the pattern with the longest prefix.
  const pattern = Object.keys(exportsField)
    .filter((key) => {
      const [prefix = '', suffix = ''] = key.split('*');
      return key.includes('*') && subpath.startsWith(prefix) && subpath.endsWith(suffix) && subpath.length >= key.length - 1;
    })
    .sort((a, b) => b.indexOf('*') - a.indexOf('*'))[0];
  if (pattern === undefined) {
    return null;
  }
  const [prefix = '', suffix = ''] = pattern.split('*');
  return exportTarget(exportsField[pattern], subpath.slice(prefix.length, subpath.length - suffix.length), loader);
}

// A file of the package in `manifest`, by its exports when it has them, else by its main field or path.
function packageFile(manifest: Manifest, subpath: string, loader: Loader): Resolution {
  const { dir, fields } = manifest;
  if (fields.exports !== undefined) {
    const target = exportsEntry(fields.exports, subpath === '' ? '.' : `./${subpath}`, loader);
    return target === null || !isFile(path.join(dir, target)) ? unresolved : { kind: 'file', file: realpathSync(path.join(dir, target)) };
  }
  if (subpath !== '') {
    return probe(path.join(dir, subpath));
  }
  const main = typeof fields.main === 'string' ? probe(path.join(dir, fields.main)) : unresolved;
  return main.kind === 'unresolved' ? probe(path.join(dir, 'index')) : main;
}

// The package named `name` in the node_modules of `dir` or of a directory above it.
function installedPackage(name: string, dir: string): Manifest | null {
  const manifest = manifestIn(path.join(dir, 'node_modules', name));
  const parent = path.dirname(dir);
  return manifest !== null || parent === dir ? manifest : installedPackage(name, parent);
}

// Where `specifier`, written in `from` and loaded by `loader`, leads, as Node resolves it for a program on Node.
// Symbolic links are followed, so that a package's own dependencies are found from where it is installed.
export function resolveModule(specifier: string, from: string, loader: Loader): Resolution {
  if (isBuiltin(specifier)) {
    return { kind: 'host' };
  }
  if (specifier.startsWith('.') || path.isAbsolute(specifier)) {
    return probe(path.resolve(path.dirname(from), specifier));
  }
  const parts = specifier.split('/');
  const nameParts = specifier.startsWith('@') ? 2 : 1;
  const manifest = installedPackage(parts.slice(0, nameParts).join('/'), path.dirname(from));
  return manifest === null ? unresolved : packageFile(manifest, parts.slice(nameParts).join('/'), loader);
}
