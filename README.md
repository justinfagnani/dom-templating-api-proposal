# DOM Templating Proposal

The repo contains a proposal for a DOM templating API.

See the [explainer document](./EXPLAINER.md) and the
[DOM Scheduler API](./DOM-SCHEDULER.md) documents for more details.

## Packages

- `dom-templating-prototype`: A prototype of the templating API implemented in JavaScript
- `dom-scheduler-prototype`: A prototype of the DOM scheduler API implemented in JavaScript

### Planned Packages

- Examples
- A TypeScript transformer to compile JSX to DOM templates
- A simple Preact-like demonstration framework that uses the JSX transform and
  attaches components to templates with stateful directives.
- Utilities:
  - A DOM morphing function that applies a template by morphing existing DOM
  - Directives: repeat, cache, guard, etc.
- SSR library prototype
- Client-side hydration library prototype
- A web component base class prototype
- Benchmarks. Benchmarks that can run against any implementation of the DOM
  Templating API, and comparable benchmarks for userland libraries like
  lit-html, React, etc.
