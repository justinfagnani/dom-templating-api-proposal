# dom-template-tsx

A TypeScript transformer that converts JSX syntax to the [DOM Templating API
proposal](https://github.com/justinfagnani/dom-templating-api-proposal).

## Features

- **JSX to Tagged Templates**: Transforms JSX elements into `DOMTemplate.html`
  tagged template literals
- **Components**: Supports component references by transforming to directives
  calls
- **Explicit Binding Types**: Property bindings are default, with prefixes for
  attribute (`attr:`), and event (`on:`) bindings

## How It Works

The transformer processes JSX at compile time and converts it to
`DOMTemplate.html` tagged template literals with appropriate binding syntax.

### Element Transformation

Regular HTML elements are transformed into template strings with special binding
prefixes:

- **Property bindings** (default): `<div foo={value}>` → `<div .foo=${value}>`
- **Attribute bindings**: `<div attr:id={value}>` → `<div id=${value}>`
- **Event bindings**: `<button on:click={handler}>` → `<button
  @click=${handler}>`

### Component Transformation

Component references (capitalized names) are transformed into `component()`
directive calls:

```tsx
// Input JSX
<MyComponent foo={bar} />

// Transformed output
DOMTemplate.html`${component(MyComponent, { foo: bar })}`
```

When components have children, they're passed as a third argument:

```tsx
// Input JSX
<MyComponent foo={bar}>
  <span>Hello</span>
</MyComponent>

// Transformed output
DOMTemplate.html`${component(MyComponent, { foo: bar }, DOMTemplate.html`<span>Hello</span>`)}`
```

## Examples

### Basic Element

```tsx
// Input
const name = "World";
const el = <div>Hello {name}</div>;

// Output
const name = "World";
const el = DOMTemplate.html`<div>Hello ${name}</div>`;
```

### Property Binding

```tsx
// Input
function propertyBinding() {
  const value = "test";
  return <div foo={value}></div>;
}

// Output
function propertyBinding() {
  const value = "test";
  return DOMTemplate.html`<div .foo=${value}></div>`;
}
```

### Attribute Binding

```tsx
// Input
function attributeBinding() {
  const id = "my-id";
  return <div attr:id={id}></div>;
}

// Output
function attributeBinding() {
  const id = "my-id";
  return DOMTemplate.html`<div id=${id}></div>`;
}
```

### Event Binding

```tsx
// Input
function eventBinding() {
  const handleClick = () => console.log('clicked');
  return <button on:click={handleClick}>Click me</button>;
}

// Output
function eventBinding() {
  const handleClick = () => console.log('clicked');
  return DOMTemplate.html`<button @click=${handleClick}>Click me</button>`;
}
```

### Components

```tsx
// Input
import { MyComponent } from './my-component';

const foo = 'bar';
const t = <MyComponent foo={foo} bar="baz"></MyComponent>;

// Output
import { component } from 'dom-templating-prototype/directives';
import { MyComponent } from './my-component';

const foo = 'bar';
const t = DOMTemplate.html`${component(MyComponent, {
  foo: foo,
  bar: "baz"
})}`;
```

## Installation

> [!WARNING] This package isn't published yet!

```bash
npm install dom-template-tsx
```

You'll also need `ts-patch` to apply the TypeScript transformer:

```bash
npm install -D ts-patch
```

## Usage

### 1. Configure tsconfig.json

Add the transformer plugin to your TypeScript configuration:

```json
{
  "compilerOptions": {
    "jsx": "react-native",
    "verbatimModuleSyntax": true,
    "plugins": [
      {
        "transform": "dom-template-tsx"
      }
    ]
  }
}
```

**Important**: 
- Set `"jsx": "react-native"` to preserve JSX for the transformer
- Set `"verbatimModuleSyntax": true` to prevent import removal

### 2. Patch TypeScript

Run ts-patch to enable the transformer:

```bash
npx ts-patch install
```

### 3. Write JSX

You can now write JSX that will be transformed to DOM templates:

```tsx
import * as DOMTemplate from 'dom-templating-prototype';

function App() {
  const count = 0;
  return (
    <div>
      <h1>Counter: {count}</h1>
      <button on:click={() => console.log('clicked')}>
        Increment
      </button>
    </div>
  );
}
```

### 4. JSX Type Definitions

For proper TypeScript support, you'll need JSX type definitions. Create a
`jsx-types.d.ts` file:

```typescript
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
```

## Build & Test

```bash
# Build the transformer
npm run build

# Run tests
npm test

# Run browser tests
npm run test:browser

# Update test snapshots
npm run test:update-snapshots
```

## License

See the LICENSE file in the repository root.
