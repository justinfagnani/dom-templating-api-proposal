# DOM Templating Proposal

The repo contains a proposal for a DOM templating API.

See the [main explainer document](./EXPLAINER.md) and the [DOM Scheduler
API](./DOM-SCHEDULER.md) documents for more details.

## Packages

- [`dom-templating-prototype`](./packages/dom-templating-prototype/README.md): A
  prototype of the templating API implemented in JavaScript
- [`dom-scheduler-prototype`](./packages/dom-scheduler-prototype/): A prototype
  of the DOM scheduler API implemented in JavaScript
- [`dom-template-tsx`](./packages/dom-template-tsx/README.md): TypeScript
  transformer to convert JSX to the DOM templating API proposal
- [`hook-framework-demo`](./packages/hook-framework-demo/README.md): A simple
  React-like functional framework with hooks, built on top of the template and
  scheduler APIs and the JSX transform.

### Planned Packages

- Examples
  - A Solid-like Signals-based demo framework
- Utilities:
  - A DOM morphing function that applies a template by morphing existing DOM
  - Directives: repeat, cache, guard, etc.
- SSR
  - Server rendering library prototype
  - Client-side hydration library prototype
- A web component base class prototype
- Benchmarks.
  - Benchmarks that can run against any implementation of the DOM Templating
    API, and comparable benchmarks for userland libraries like lit-html, React,
    etc.
