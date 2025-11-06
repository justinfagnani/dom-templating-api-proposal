/**
 * A trivial TypeScript transformer that adds a leading comment to all source files.
 */

import * as ts from 'typescript';

/**
 * Creates a TypeScript transformer that adds a comment at the beginning of each file.
 */
export function createTransformer(
  _program?: ts.Program
): ts.TransformerFactory<ts.SourceFile> {
  return (_context: ts.TransformationContext) => {
    return (sourceFile: ts.SourceFile): ts.SourceFile => {
      // Create a new statement with the comment
      const statement = ts.factory.createEmptyStatement();
      const commentedStatement = ts.addSyntheticLeadingComment(
        statement,
        ts.SyntaxKind.MultiLineCommentTrivia,
        ' Transformed by tsx-transform ',
        true
      );

      // Add the commented statement at the beginning
      const statements = [commentedStatement, ...sourceFile.statements];

      return ts.factory.updateSourceFile(sourceFile, statements);
    };
  };
}

/**
 * Transforms a source file by applying the transformer.
 * This is a helper function for testing.
 */
export function transformSource(source: string): string {
  const sourceFile = ts.createSourceFile(
    'test.ts',
    source,
    ts.ScriptTarget.Latest,
    true
  );

  const result = ts.transform(sourceFile, [createTransformer()]);
  const transformedSourceFile = result.transformed[0];

  const printer = ts.createPrinter({newLine: ts.NewLineKind.LineFeed});
  const output = printer.printFile(transformedSourceFile as ts.SourceFile);

  result.dispose();

  return output;
}
