# hook-framework-demo

A React-like functional, hook-based component framework built on top of the DOM
templating API and scheduler API proposals. This demo shows how a React-style
framework can be implemented using the proposed native DOM templating
primitives as a compile target.

This framework implements a familiar React-style API:

```tsx
import {render, useState} from 'hook-framework-demo';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button on:click={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

function App() {
  return (
    <div>
      <h1>Counter Demo</h1>
      <Counter />
    </div>
  );
}

render(<App />, document.body);
```

## How It Works

This demo framework implements functional components that return a template API
`TemplateResult`. The framework then renders that result to the DOM.

To use it, we configure the TSX transform to use this package's `component()`
directive, which is responsible for instantiating and mounting the component to
the DOM, drive its render lifecycle, and track hooks.

Component updates are scheduled with dom-scheduler-prototype so that concurrent
updates are always rendered in tree-order.

### Compiled output

The counter component example above is transformed to this<sup>\*</sup>:

```ts
import {render, useState, component} from 'hook-framework-demo';

function Counter() {
  const [count, setCount] = useState(0);
  return DOMTemplate.html`
    <div>
      <p>Count: ${count}</p>
      <button @click=${() => setCount(count + 1)}>Increment</button>
    </div>
  `;
}

function App() {
  return DOMTemplate.html`
    <div>
      <h1>Counter Demo</h1>
      ${component(Counter)}
    </div>
  `;
}

render(DOMTemplate.html`${component(App)}`, document.body);
```

<sup>\*</sup> whitespace added for readability

A few interesting notes:

- The `render()` function is from
  `dom-templating-prototype` (a ponyfill for the proposed `Element.render()`
  API).
- The framework code is self-contained in the `component()` directive.
- This simple demo framework doesn't need direct cross-component coordination,
  but this is possible by introspecting `TemplateResult`s, keeping
  a stack, etc.
- A standard template API opens the door for interesting interop opportunities.
  A single project can use components from different frameworks by using their
  respective component directives. This is even possible within a single
  template by writing `DOMTemplate.html` literals directly (or with a
  sufficiently clever TSX compiler).

## Usage

### Components

Components are functions that return `TemplateResult`s. They are re-rendered
either when their containing template re-renders, or when a `useState()` setter
is called.

### JSX

Based on the `dom-template-tsx` transform, component templates can be written
in JSX. This flavor of JSX supports:

- Components: written with capital-letter starting "tag names": `<App/>`
- Attribute bindings: `<MyComponent foo={x}/>`
- Property bindings: `<MyComponent prop:foo={x}/>`
- Event bindings: `<MyComponent on:foo={x}/>`
- Children: `<MyComponent><p>Hi</p></MyComponent>`

### Hooks

Components can use the `useState()` hook for internal state. It works similarly
to React's.

`useState()` changes are flushed to the DOM via a DOM task. This means that if
they occur during another DOM task, they will be enququed and run after the
current task. If they occur outside of another task, they will be run
synchronously.

To batch multiple state setters, you can run them in a outer task manually:

```ts
// This will result in one re-render:
postTask(refNode, () => {
  setFoo(2);
  setBar(3);
});
```

### Examples

#### Simple Component

```tsx
import {render, html} from 'hook-framework-demo';

function Greeting(props?: {name?: string}) {
  return <div>Hello, {props?.name}!</div>;
}

// Render to the DOM
render(<Greeting name="World" />, document.body);
```

#### Component with State

```tsx
import {render, useState} from 'hook-framework-demo';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button on:click={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

render(<Counter />, document.body);
```

#### Nested Components

```tsx
function TodoItem(props?: {text?: string; done?: boolean}) {
  return (
    <li style={{textDecoration: props?.done ? 'line-through' : 'none'}}>
      {props?.text}
    </li>
  );
}

function TodoList() {
  const [todos] = useState([
    {text: 'Learn DOM Templates', done: true},
    {text: 'Build a framework', done: false},
  ]);

  return (
    <ul>
      {todos.map((todo) => (
        <TodoItem text={todo.text} done={todo.done} />
      ))}
    </ul>
  );
}
```

#### Conditional Rendering

```tsx
function LoginStatus() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <div>
      {isLoggedIn ? (
        <button on:click={() => setIsLoggedIn(false)}>Logout</button>
      ) : (
        <button on:click={() => setIsLoggedIn(true)}>Login</button>
      )}
    </div>
  );
}
```

## API Reference

### `render(template, container)`

Renders a template result into a DOM container.

- `template`: A TemplateResult (typically JSX)
- `container`: The DOM element to render into

### `useState<T>(initialValue: T): [T, (newValue: T) => void]`

A hook for managing component state. Returns a tuple with the current value and
a setter function.

- `initialValue`: The initial state value
- Returns: `[currentValue, setValue]`

When `setValue` is called, the component is scheduled for re-render using the
DOM scheduler API.

### `html` and `svg`

Template tag functions for creating template results when not using JSX.

```tsx
import {html} from 'hook-framework-demo';

const template = html`<div>Hello</div>`;
```

## JSX Setup

To use JSX with this framework, you need to use a transform-supporting
TypeScript command (like `ts-patch`) and configure TypeScript to use the
`dom-template-tsx` transform:

**tsconfig.json:**

```json
{
  "compilerOptions": {
    "jsx": "react",
    "jsxFactory": "DOMTemplate.html",
    "jsxFragmentFactory": "DOMTemplate.Fragment",
    "plugins": [
      {
        "transform": "dom-template-tsx",
        "componentFunctionName": "component",
        "componentModule": "hook-framework-demo"
      }
    ]
  }
}
```

**In your TSX files:**

```tsx
// @ts-expect-error: required for the JSX transformer
import * as DOMTemplate from 'dom-templating-prototype';

// Your components here
```

## Building

```bash
npm run build
```

## Testing

```bash
npm test
```

## Limitations

- Currently only implements the `useState()` hook
- No `useEffect()`, `useMemo()`, `useCallback()`, or other common hooks yet
- No way to write element bindings in our JSX syntax
- No support for JSX spread bindings
- This is a demo only!

## Future Possibilities

- Additional hooks (useEffect especially, to show lifecycle integration)
- Signals support with scheduler integration
- Context API to show cross-component communication
- Suspense-like patterns

## Related Packages

- [`dom-templating-prototype`](../dom-templating-prototype) - The underlying DOM
  templating API
- [`dom-template-tsx`](../dom-template-tsx) - JSX to template literal
  transformer
- [`dom-scheduler-prototype`](../dom-scheduler-prototype) - DOM scheduler API
  for batching updates
