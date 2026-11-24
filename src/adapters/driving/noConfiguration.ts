import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { isGlobal } from './scope.ts';

const createRule = ESLintUtils.RuleCreator((name) => `https://github.com/ianflanagan1/ts-ianf-strict-baseline#${name}`);

// The members of `process` that hold the program's configuration.
const configurationMembers: ReadonlySet<string> = new Set(['env', 'argv']);

export const noConfiguration = createRule({
  name: 'no-configuration',
  meta: {
    type: 'problem',
    docs: { description: 'Disallow reading configuration, so only the entrypoint reads it and passes the values in' },
    messages: {
      configuration: '`{{name}}` reads configuration, which only the entrypoint does; read it in src/main.ts and pass the value in.',
    },
    schema: [],
    defaultOptions: [],
  },
  create(context) {
    const report = (node: TSESTree.Node, name: string): void => {
      context.report({ node, messageId: 'configuration', data: { name } });
    };
    return {
      'MemberExpression[object.type="Identifier"][object.name="process"][property.type="Identifier"]'(node: TSESTree.MemberExpression) {
        if (
          node.property.type === AST_NODE_TYPES.Identifier &&
          configurationMembers.has(node.property.name) &&
          isGlobal(context.sourceCode, node, 'process')
        ) {
          report(node, `process.${node.property.name}`);
        }
      },
      'MemberExpression[object.type="MetaProperty"][property.type="Identifier"][property.name="env"]'(node: TSESTree.MemberExpression) {
        report(node, 'import.meta.env');
      },
      'ImportDeclaration[source.value=/^(node:)?util$/] > ImportSpecifier[imported.name="parseArgs"]'(node: TSESTree.ImportSpecifier) {
        report(node, 'parseArgs');
      },
      'ImportDeclaration[source.value=/^(node:)?process$/] > ImportSpecifier[imported.name=/^(env|argv)$/]'(
        node: TSESTree.ImportSpecifier,
      ) {
        report(node, node.imported.type === AST_NODE_TYPES.Identifier ? `process.${node.imported.name}` : 'process');
      },
    };
  },
});
