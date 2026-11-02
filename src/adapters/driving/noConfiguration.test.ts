import { afterAll, describe, it } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noConfiguration } from './noConfiguration.ts';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run('no-configuration', noConfiguration, {
  valid: [
    { name: 'the rest of process is not configuration', code: `process.exitCode = 1;` },
    { name: 'a local named process is not the global', code: `function f(process: { env: string }) { return process.env; }` },
    { name: 'the rest of node:util is not configuration', code: `import { inspect } from 'node:util';` },
  ],
  invalid: [
    {
      name: 'an environment variable is reported',
      code: `const url = process.env.DATABASE_URL;`,
      errors: [{ messageId: 'configuration', data: { name: 'process.env' } }],
    },
    {
      name: 'the arguments are reported',
      code: `const args = process.argv.slice(2);`,
      errors: [{ messageId: 'configuration', data: { name: 'process.argv' } }],
    },
    {
      name: "a bundler's environment is reported",
      code: `const mode = import.meta.env.MODE;`,
      errors: [{ messageId: 'configuration', data: { name: 'import.meta.env' } }],
    },
    {
      name: 'the environment imported from node:process is reported',
      code: `import { env } from 'node:process';`,
      errors: [{ messageId: 'configuration', data: { name: 'process.env' } }],
    },
    {
      name: 'parsing the arguments is reported',
      code: `import { parseArgs } from 'node:util';`,
      errors: [{ messageId: 'configuration', data: { name: 'parseArgs' } }],
    },
  ],
});
