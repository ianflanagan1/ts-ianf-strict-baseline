import { afterAll, describe, it } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noEffects } from './noEffects.ts';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

const effects = {
  clock: ['reads the clock', 'take the time from a clock port'],
  randomness: ['is random', 'take the value from a port'],
  network: ['uses the network', 'reach it through a port'],
  process: ['controls the process and reads its configuration', 'take what you need through a port'],
  console: ['uses the console', 'write through a port'],
  globals: ['reaches every global', 'take what you need through a port'],
} as const;

const effect = (name: string, kind: keyof typeof effects) => {
  const [does, fix] = effects[kind];
  return [{ messageId: 'effect' as const, data: { name, does, fix } }];
};

ruleTester.run('no-effects', noEffects, {
  valid: [
    { name: 'parsing a date is pure', code: `const d = new Date('2026-01-01');` },
    { name: 'Math other than random is pure', code: `const n = Math.max(1, 2);` },
    {
      name: 'a parameter named like a global is not the global',
      code: `function f(console: { log(s: string): void }) { console.log('x'); }`,
    },
    { name: 'a local Date shadows the global', code: `function f(Date: { now(): number }) { return Date.now(); }` },
    { name: 'a type named after a global is not a use of it', code: `type P = typeof process;` },
    { name: 'a module-level const is not state', code: `export const limit = 3;` },
    { name: 'a let inside a function is local', code: `export function f() { let n = 0; n += 1; return n; }` },
  ],
  invalid: [
    { name: 'the current time is reported', code: `const d = new Date();`, errors: effect('new Date()', 'clock') },
    { name: 'Date.now is reported', code: `const t = Date.now();`, errors: effect('Date.now', 'clock') },
    { name: 'Math.random is reported', code: `const r = Math.random();`, errors: effect('Math.random', 'randomness') },
    { name: 'crypto is reported', code: `const id = crypto.randomUUID();`, errors: effect('crypto', 'randomness') },
    { name: 'fetch is reported', code: `void fetch('https://example.com');`, errors: effect('fetch', 'network') },
    { name: 'a timer is reported', code: `setTimeout(() => undefined, 1);`, errors: effect('setTimeout', 'clock') },
    { name: 'process is reported', code: `process.exitCode = 1;`, errors: effect('process', 'process') },
    { name: 'the console is reported', code: `console.log('x');`, errors: effect('console', 'console') },
    { name: 'globalThis is reported', code: `const f = globalThis.fetch;`, errors: effect('globalThis', 'globals') },
    { name: 'a module-level let is reported', code: `let calls = 0;`, errors: [{ messageId: 'moduleState', data: { kind: 'let' } }] },
    {
      name: 'an exported module-level var is reported',
      code: `export var calls = 0;`,
      errors: [{ messageId: 'moduleState', data: { kind: 'var' } }],
    },
  ],
});
