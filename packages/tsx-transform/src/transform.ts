/**
 * TypeScript transformer that converts JSX to DOMTemplate.html tagged templates.
 */

import * as ts from 'typescript';

/**
 * Converts a JSX element to an HTML string for use in a template literal.
 */
function jsxToHtml(node: ts.JsxElement | ts.JsxSelfClosingElement): string {
  if (ts.isJsxSelfClosingElement(node)) {
    const tagName = node.tagName.getText();
    return `<${tagName}></${tagName}>`;
  }

  if (ts.isJsxElement(node)) {
    const openingTagName = node.openingElement.tagName.getText();
    const closingTagName = node.closingElement.tagName.getText();

    // For now, handle simple cases with no children or attributes
    return `<${openingTagName}></${closingTagName}>`;
  }

  return '';
}

/**
 * Creates a TypeScript transformer that converts JSX to DOMTemplate.html tagged templates.
 */
export function createTransformer(
  _program?: ts.Program
): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => {
    const visitor = (node: ts.Node): ts.Node => {
      // Transform JSX elements to DOMTemplate.html`` tagged template literals
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const htmlString = jsxToHtml(node);

        // Create DOMTemplate.html`<div></div>`
        const taggedTemplate = ts.factory.createTaggedTemplateExpression(
          ts.factory.createPropertyAccessExpression(
            ts.factory.createIdentifier('DOMTemplate'),
            ts.factory.createIdentifier('html')
          ),
          undefined, // no type arguments
          ts.factory.createNoSubstitutionTemplateLiteral(htmlString)
        );

        return taggedTemplate;
      }

      // Continue visiting child nodes
      return ts.visitEachChild(node, visitor, context);
    };

    return (sourceFile: ts.SourceFile): ts.SourceFile => {
      // First, transform JSX elements
      const visited = ts.visitNode(sourceFile, visitor) as ts.SourceFile;

      // Then add the leading comment
      const statement = ts.factory.createEmptyStatement();
      const commentedStatement = ts.addSyntheticLeadingComment(
        statement,
        ts.SyntaxKind.MultiLineCommentTrivia,
        ' Transformed by tsx-transform ',
        true
      );

      // Add the commented statement at the beginning
      const statements = [commentedStatement, ...visited.statements];

      return ts.factory.updateSourceFile(visited, statements);
    };
  };
}

/**
 * Transforms a source file by applying the transformer.
 * This is a helper function for testing.
 */
export function transformSource(source: string): string {
  const sourceFile = ts.createSourceFile(
    'test.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  const result = ts.transform(sourceFile, [createTransformer()]);
  const transformedSourceFile = result.transformed[0];

  const printer = ts.createPrinter({newLine: ts.NewLineKind.LineFeed});
  const output = printer.printFile(transformedSourceFile as ts.SourceFile);

  result.dispose();

  return output;
}
