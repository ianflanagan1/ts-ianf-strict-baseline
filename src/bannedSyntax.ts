// Syntax the baseline bans, as `no-restricted-syntax` entries. A project that adds its own entries spreads these first,
// since its `no-restricted-syntax` replaces the baseline's rather than adding to it.
// JavaScript's own error classes, which a class may extend, since a thrown error with a name of its own can't be written
// any other way.
const builtInErrors = ['Error', 'AggregateError', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError'];

export const bannedSyntax: ReadonlyArray<{ readonly selector: string; readonly message: string }> = [
  { selector: 'TSEnumDeclaration', message: 'Use a union of string literals instead of an enum.' },
  { selector: ':function > AssignmentPattern', message: 'Do not declare default parameter values; every caller passes every argument.' },
  {
    selector: 'TSParameterProperty > AssignmentPattern',
    message: 'Do not declare default parameter values; every caller passes every argument.',
  },
  {
    selector:
      ':matches(:function, TSDeclareFunction, TSMethodSignature, TSFunctionType, TSEmptyBodyFunctionExpression) > Identifier[optional=true]',
    message: 'Do not declare optional parameters; every caller passes every argument.',
  },
  { selector: 'TSPropertySignature[optional=true]', message: 'Make every property required; use `| null` for an absent value.' },
  {
    selector: "VariableDeclaration[kind='let'], VariableDeclaration[kind='var']",
    message: 'Declare every local with const. A value that would change gets a new name, or comes from an expression or a function.',
  },
  {
    selector: `:matches(ClassDeclaration, ClassExpression)[superClass]:not([superClass.type='Identifier'][superClass.name=/^(${builtInErrors.join('|')})$/])`,
    message:
      "Don't extend a class: take what it shares as a collaborator in the constructor. Only JavaScript's own errors may be extended.",
  },
];
