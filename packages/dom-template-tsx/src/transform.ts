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
 * Returns true if the JSX tag name represents a component (starts with an uppercase letter).
 */
function isComponent(tagName: ts.JsxTagNameExpression): boolean {
  const name = tagName.getText();
  return name[0] >= 'A' && name[0] <= 'Z';
}

/**
 * Processes JSX attributes into an object literal for component props.
 */
function processAttributesToProps(
  attributes: ts.NodeArray<ts.JsxAttributeLike>,
  visitor: (node: ts.Node) => ts.Node
): ts.ObjectLiteralExpression | undefined {
  const properties: ts.ObjectLiteralElementLike[] = [];

  for (const attr of attributes) {
    if (ts.isJsxAttribute(attr)) {
      const name = attr.name.getText();
      const propName = ts.factory.createIdentifier(name);
      let propValue: ts.Expression;

      if (!attr.initializer) {
        // Boolean attribute: <MyComponent disabled />
        propValue = ts.factory.createTrue();
      } else if (ts.isStringLiteral(attr.initializer)) {
        // String literal: <MyComponent foo="bar" />
        propValue = ts.factory.createStringLiteral(attr.initializer.text);
      } else if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
        // Expression: <MyComponent foo={bar} />
        propValue = ts.visitNode(attr.initializer.expression, visitor) as ts.Expression;
      } else {
        continue;
      }
      properties.push(ts.factory.createPropertyAssignment(propName, propValue));
    }
    // Note: JsxSpreadAttribute is not handled yet.
  }

  if (properties.length === 0) {
    return undefined;
  }

  return ts.factory.createObjectLiteralExpression(properties, true);
}

/**
 * Converts a JSX element to template data.
 */
function jsxToTemplate(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  visitor: (node: ts.Node) => ts.Node
): TemplateData {
  const tagNameExpr = ts.isJsxSelfClosingElement(node)
    ? node.tagName
    : node.openingElement.tagName;
  const attributes = ts.isJsxSelfClosingElement(node)
    ? node.attributes
    : node.openingElement.attributes;

  if (isComponent(tagNameExpr)) {
    const componentIdentifier = ts.factory.createIdentifier(tagNameExpr.getText());
    const propsObject = processAttributesToProps(attributes.properties, visitor);

    const componentArgs: ts.Expression[] = [componentIdentifier];
    if (propsObject) {
      componentArgs.push(propsObject);
    }

    if (ts.isJsxElement(node) && node.children.length > 0) {
      if (!propsObject) {
        componentArgs.push(ts.factory.createIdentifier('undefined'));
      }
      const childTemplates = node.children.map((child) =>
        jsxChildToTemplate(child, visitor)
      );
      const childrenTemplateData = mergeTemplates(childTemplates);
      const templateLiteral = createTemplateLiteral(childrenTemplateData);
      const childrenTemplate = ts.factory.createTaggedTemplateExpression(
        ts.factory.createPropertyAccessExpression(
          ts.factory.createIdentifier('DOMTemplate'),
          ts.factory.createIdentifier('html')
        ),
        undefined,
        templateLiteral
      );
      componentArgs.push(childrenTemplate);
    }

    const componentDirective = ts.factory.createIdentifier('component');
    const callExpression = ts.factory.createCallExpression(
      componentDirective,
      undefined,
      componentArgs
    );
    return {parts: ['', ''], expressions: [callExpression]};
  }

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
    let usesComponentDirective = false;
    const visitor = (node: ts.Node): ts.Node => {
      // Transform JSX elements to DOMTemplate.html`` tagged template literals
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tagNameExpr = ts.isJsxSelfClosingElement(node)
          ? node.tagName
          : node.openingElement.tagName;
        if (isComponent(tagNameExpr)) {
          usesComponentDirective = true;
        }
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
      const transformedSourceFile = ts.visitNode(
        sourceFile,
        visitor
      ) as ts.SourceFile;

      if (usesComponentDirective) {
        const statements = [...transformedSourceFile.statements];
        const importSpecifier = ts.factory.createImportSpecifier(
          false,
          undefined,
          ts.factory.createIdentifier('component')
        );
        const namedBindings = ts.factory.createNamedImports([importSpecifier]);
        const importClause = ts.factory.createImportClause(
          false,
          undefined,
          namedBindings
        );
        const importDeclaration = ts.factory.createImportDeclaration(
          undefined,
          importClause,
          ts.factory.createStringLiteral('dom-templating/directives', true),
          undefined
        );

        // Find and remove the `DomTemplate` import if it's a single-element import
        const domTemplateImportIndex = statements.findIndex(
          (st) =>
            ts.isImportDeclaration(st) &&
            st.moduleSpecifier.getText(sourceFile) ===
              `'dom-templating'` &&
            st.importClause?.namedBindings &&
            ts.isNamedImports(st.importClause.namedBindings) &&
            st.importClause.namedBindings.elements.length === 1 &&
            st.importClause.namedBindings.elements[0].name.getText(
              sourceFile
            ) === 'DomTemplate'
        );

        if (domTemplateImportIndex !== -1) {
          statements.splice(domTemplateImportIndex, 1);
        }

        return ts.factory.updateSourceFile(transformedSourceFile, [
          importDeclaration,
          ...statements,
        ]);
      }
      return transformedSourceFile;
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
