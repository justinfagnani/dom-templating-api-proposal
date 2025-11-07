/**
 * TypeScript transformer that converts JSX to DOMTemplate.html tagged templates.
 */

import * as ts from 'typescript';

/**
 * Represents a template with string parts and expression substitutions.
 */
interface TemplateData {
  parts: string[];
  expressions: ts.Expression[];
}

/**
 * Converts a JSX child node to template data.
 */
function jsxChildToTemplate(
  child: ts.JsxChild,
  visitor: (node: ts.Node) => ts.Node
): TemplateData {
  if (ts.isJsxText(child)) {
    // Return the text content as a single part
    return {parts: [child.text], expressions: []};
  }

  if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
    // Recursively process nested JSX elements
    return jsxToTemplate(child, visitor);
  }

  if (ts.isJsxExpression(child)) {
    // Handle JSX expressions like {name}
    if (child.expression) {
      // Visit the expression to transform any JSX inside it
      const visitedExpression = ts.visitNode(child.expression, visitor) as ts.Expression;
      // Expression creates a gap between two parts
      return {parts: ['', ''], expressions: [visitedExpression]};
    }
  }

  // Empty template for unknown child types
  return {parts: [''], expressions: []};
}

/**
 * Merges multiple template data objects into one.
 */
function mergeTemplates(templates: TemplateData[]): TemplateData {
  if (templates.length === 0) {
    return {parts: [''], expressions: []};
  }

  if (templates.length === 1) {
    return templates[0];
  }

  const result: TemplateData = {parts: [], expressions: []};

  for (let i = 0; i < templates.length; i++) {
    const template = templates[i];

    if (i === 0) {
      // First template: add all parts and expressions
      result.parts.push(...template.parts);
      result.expressions.push(...template.expressions);
    } else {
      // Subsequent templates: merge the first part with the last part
      const lastPart = result.parts.pop() || '';
      const firstPart = template.parts[0] || '';
      result.parts.push(lastPart + firstPart);

      // Add remaining parts and all expressions
      result.parts.push(...template.parts.slice(1));
      result.expressions.push(...template.expressions);
    }
  }

  return result;
}

/**
 * Processes a JSX attribute and returns template data for it.
 */
function processAttribute(
  attr: ts.JsxAttribute | ts.JsxSpreadAttribute,
  visitor: (node: ts.Node) => ts.Node
): TemplateData {
  // For now, we'll skip spread attributes
  if (ts.isJsxSpreadAttribute(attr)) {
    return {parts: [''], expressions: []};
  }

  const name = attr.name.getText();
  let attributeName = name;
  let prefix = '';

  // Check for special prefixes
  if (name.startsWith('attr:')) {
    // attr:foo={bar} -> foo=${bar}
    attributeName = name.substring(5);
  } else if (name.startsWith('on:')) {
    // on:click={handler} -> @click=${handler}
    attributeName = name.substring(3);
    prefix = '@';
  } else {
    // foo={bar} -> .foo=${bar}
    prefix = '.';
  }

  // Handle the attribute value
  if (!attr.initializer) {
    // Boolean attribute like <div foo />
    return {parts: [` ${prefix}${attributeName}`], expressions: []};
  }

  if (ts.isStringLiteral(attr.initializer)) {
    // String literal like <div foo="bar" />
    const value = attr.initializer.text;
    return {parts: [` ${prefix}${attributeName}="${value}"`], expressions: []};
  }

  if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
    // Expression like <div foo={bar} />
    // Visit the expression to transform any JSX inside it
    const visitedExpression = ts.visitNode(attr.initializer.expression, visitor) as ts.Expression;
    return {
      parts: [` ${prefix}${attributeName}=`, ''],
      expressions: [visitedExpression],
    };
  }

  return {parts: [''], expressions: []};
}

/**
 * Processes all attributes on a JSX opening element.
 */
function processAttributes(
  attributes: ts.NodeArray<ts.JsxAttributeLike>,
  visitor: (node: ts.Node) => ts.Node
): TemplateData {
  const attrTemplates = Array.from(attributes).map((attr) => processAttribute(attr, visitor));
  return mergeTemplates(attrTemplates);
}

/**
 * Converts a JSX element to template data.
 */
function jsxToTemplate(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  visitor: (node: ts.Node) => ts.Node
): TemplateData {
  if (ts.isJsxSelfClosingElement(node)) {
    const tagName = node.tagName.getText();
    const attrsTemplate = processAttributes(node.attributes.properties, visitor);

    // Merge tag name with attributes: <tagName attrs></ tagName>
    const openingTag = mergeTemplates([
      {parts: [`<${tagName}`], expressions: []},
      attrsTemplate,
      {parts: [`></${tagName}>`], expressions: []},
    ]);

    return openingTag;
  }

  if (ts.isJsxElement(node)) {
    const openingTagName = node.openingElement.tagName.getText();
    const closingTagName = node.closingElement.tagName.getText();
    const attrsTemplate = processAttributes(node.openingElement.attributes.properties, visitor);

    // Process all children
    const childTemplates = node.children.map((child) => jsxChildToTemplate(child, visitor));
    const childrenTemplate = mergeTemplates(childTemplates);

    // Build: <tagName attrs> children </tagName>
    const result = mergeTemplates([
      {parts: [`<${openingTagName}`], expressions: []},
      attrsTemplate,
      {parts: [`>`], expressions: []},
      childrenTemplate,
      {parts: [`</${closingTagName}>`], expressions: []},
    ]);

    return result;
  }

  return {parts: [''], expressions: []};
}

/**
 * Creates a template literal from template data.
 */
function createTemplateLiteral(data: TemplateData): ts.TemplateLiteral {
  // If no expressions, create a simple template literal
  if (data.expressions.length === 0) {
    return ts.factory.createNoSubstitutionTemplateLiteral(data.parts[0] || '');
  }

  // Create a template expression with substitutions
  const head = ts.factory.createTemplateHead(data.parts[0] || '');
  const spans: ts.TemplateSpan[] = [];

  for (let i = 0; i < data.expressions.length; i++) {
    const expression = data.expressions[i];
    const isLast = i === data.expressions.length - 1;
    const text = data.parts[i + 1] || '';

    if (isLast) {
      spans.push(ts.factory.createTemplateSpan(expression, ts.factory.createTemplateTail(text)));
    } else {
      spans.push(ts.factory.createTemplateSpan(expression, ts.factory.createTemplateMiddle(text)));
    }
  }

  return ts.factory.createTemplateExpression(head, spans);
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
        const templateData = jsxToTemplate(node, visitor);
        const templateLiteral = createTemplateLiteral(templateData);

        // Create DOMTemplate.html`...`
        const taggedTemplate = ts.factory.createTaggedTemplateExpression(
          ts.factory.createPropertyAccessExpression(
            ts.factory.createIdentifier('DOMTemplate'),
            ts.factory.createIdentifier('html')
          ),
          undefined, // no type arguments
          templateLiteral
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
