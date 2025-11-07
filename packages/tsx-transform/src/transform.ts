/**
 * TypeScript transformer that converts JSX to DOMTemplate.html tagged templates.
 */

import * as ts from 'typescript';

/**
 * Converts a JSX child node to an HTML string.
 */
function jsxChildToHtml(child: ts.JsxChild): string {
  if (ts.isJsxText(child)) {
    // Return the text content, preserving it as-is
    return child.text;
  }

  if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
    // Recursively process nested JSX elements
    return jsxToHtml(child);
  }

  // For now, ignore other node types like JsxExpression
  // We'll handle those later when we add support for interpolation
  return '';
}

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

    // Process all children
    let childrenHtml = '';
    for (const child of node.children) {
      childrenHtml += jsxChildToHtml(child);
    }

    return `<${openingTagName}>${childrenHtml}</${closingTagName}>`;
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
      // Transform JSX elements
      return ts.visitNode(sourceFile, visitor) as ts.SourceFile;
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
