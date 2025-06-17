# DOM Templating API Explainer

Author: [Justin Fagnani](https://github/justinfagnani)

DRAFT | Last update: 2025-06-17

> [!WARNING]
> This document is in progress.

## Introduction

Creating and updating trees of DOM nodes based on data is one of the most common
high-level operations performed in dynamic web applications, yet the web platform
has no ergonomic, declarative APIs for accomplishing this.

This repository proposes to add a high-level templating API to the DOM to allow
for the efficient creating and updating of DOM trees from data.

This proposal is based on the feature requests in
[webcomponents/1069](https://github.com/WICG/webcomponents/issues/1069) and
[webcomponents/1055](https://github.com/WICG/webcomponents/issues/1055) and
the template parts ideas in [Template-Instantiation](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/Template-Instantiation.md).

## Goals

- Allow developers to write declarative markup-based templates in JavaScript to
  efficiently create and update entire DOM subtrees with no external
  library dependencies.
- Work with today's standard JavaScript syntax and features.
- Avoid inventing new scripting-like features like expression languages or
  control flow constructs.
- Comparable or better performance to the best userland template libraries.
- Support both efficient template re-rendering and fine-grained DOM updates with
  signals, observables, etc.
- Allow templates to use the four main element API surfaces that can be
  expressed declaratively: children, attributes, properties, and event
  listeners.
- Support building templates by composition
- Extensibility: Allow for template behavior to be customized in controlled
  ways.
- Robustness against security attacks like XSS, gadgets, and trusted object
  forgery.
- Provide the groundwork for a future HTML-based template system, and for
  any future JSX-like JavaScript syntaxes.
- Be a suitable compile target for other template syntaxes like JSX, Mustache,
  Vue, Angular, Svelte, and more.
- Enable support for server-side rendering and hydration libraries.
- Support higher-order template utilities  in userland (i.e. DOM morphing)
- Support for scoped custom element registries.
- Batch and schedule DOM updates to happen in tree-order.
- Allow DOM updates to be synchronous

### Non-Goals

- Built-in DOM diffing. Diffing would add additional overhead compared to
  updating template instances. Diffing should be supportable in userland
  libraries however.
- New component abstractions. This proposal is just for templates. Components
  can either be handled by web components, userland component systems, or both.
  Hooks for component systems, like stateful directives, should be available.
- Change or fix other DOM APIs or HTML syntax. This proposal aims to add
  templates that describe DOM trees as the DOM allows today, with today's HTML
  parser. It does not try to change the DOM or HTML to be easier to write
  templates for. This includes things like the fact HTML doesn't have
  self-closing tags; that attributes, properties, and events can have
  overlapping names; or that some boolean attributes are "on" even if they have
  the value `"false"`.
- HTML-based templating. This proposal focuses only on a JavaScript templating
  API. While many people are interested in an HTML-based templating system,
  JavaScript is where most developers write their components and template code
  today, and HTML template system is largely a superset of a JavaScript API as
  it will require most of the same underlying infrastructure, but also
  expressions, control-flow, etc.

## Problems

> [!WARNING]
> In progress...

### Case 1: Complex DOM tree creation
- Finding nodes of interest
- Adding event listeners
- Setting properties
- Repeated fragments
- Performance

### Case 2: Safe user-controlled value interpolation
- Auto-escaping
- Trusted types

### Case 3: Reactivity

### Case 4: Fine-grained reactivity

### Case 5: Compile targets

## Proposal: The DOM Templating API

This proposal introduces the DOM Templating API - an API that lets developers
write HTML templates in JavaScript and efficiently apply them to the DOM. This
repository also covers two importantly adjacent proposals: DOM Parts and DOM
Scheduling.

> [!NOTE]
> This is an omnibus proposal that covers a full-featured templating API,
> DOM Parts, and a task scheduler.
>
> These should likely be three separate proposals, however the are very
> dependent on each other, and it's important to verify that the lower-level
> pieces are sufficiently capable for implementing the higher-level APIs on top
> of.
> 
> This omnibus approach is intended to help design and test the APIs so that
> they work well together. DOM Parts and scheduling details can then be
> upstreamed to their separate proposals.

## Overview

This proposed API consists of two main developer-facing features:
- The `DOMTemplate.html`, `.svg`, and `.mathml` template literal tags which lets
  a developer write HTML, SVG, and MathML templates in JavaScript. These
  templates support data binding to children/text, attributes, properties, event
  listeners, and elements.
- The `Element.prototype.render()` method which applies a template to a location
  in the DOM with minimal DOM mutations.

### Example:
```ts
const {html} = DOMTemplate;

// Define a "template function" - a function that evaluates a template
// expression and returns a TemplateResult:
const page = (title, body) => html`
  <h1>${title}</h1>
  <p>${body}></p>
`;

// Render the page once:
document.body.render(page('Hello Templates', 'abc'));

// Re-render the page with different data:
document.body.render(page('Hello Updates', 'def'));
```

There a few important things to note even in this very basic example:
- Templates are _expressions_. They do not return a string or DOM, but a
  description of the template and the values called a `TemplateResult`.
- The static strings can never change, and are used to make an HTML `<template>`
  element the first time they are rendered anywhere, without using the values.
- When a DOM template is rendered to a container for the first time, its
  associated `<template>` element is cloned, bindings are filled, and the
  resulting fragment is inserted into the container.
- On subsequent renders only the bindings are updated, not the static DOM.
- Values are written into bindings with XSS-safe APIs. Any markup-like text that
  they contain is escaped.

### Bindings

Template literal expressions create "bindings" which are updated separately from
the surrounding static strings. Static strings are trusted as
developer-authored, bound values as untrusted as they often will contain
user-controlled values.

Bindings can appear only in specific valid locations in the template markup:
- Top level
  ```js
  html`Hello: ${name}`
  ```
- As children of an element:
  ```js
  html`<div>Hello: ${name}</div>`
  ```
- In an attribute value:
  ```js
  html`<div class=${x}></div>`
  ```
- Inside an opening tag, separated from the tagname:
  ```js
  html`<div ${x}></div>`
  ```

Attribute bindings support multiple binding per attribute:
  ```js
  html`<div class="${x} ${y}"></div>`
  ```

Attribute bindings prefixed with a special sigil of `.`, `@`, or `?` create
property, event, or boolean attribute bindings respectively:
```js
html`<input .value=${x} @input=${handleInput} ?required=${required}>`
```

> [!NOTE]
> These sigils do not require HTML parser changes, since they are valid,
> parseable attribute names. They are also extremely unlikely to conflict with
> any real-world attribute names because they are _invalid_ to use with
> `setAttribute()`.

### Expressions, composition, and control-flow

Because templates are written using standard JavaScript tagged template
literals, bindings can be written using any current or future JavaScript
expressions.

Child bindings support several value types, including TemplateResults and
iterables of TemplateResults, which gives rise to template composition and
control flow.

Templates can be nested inside expressions:
```js
html`<div>${html`<span>Hi<span>`}</div>`
```

Because of this, templates can be used in control-flow expressions like
ternaries:

```js
html`
  <div>
    ${userIsLoggedIn
      ? html`<span>Welcome!<span>`
      : html`<span>Please log in</span>`
    }
  </div>
`
```

Since child bindings support iterables of TemplateResults, they also support
loops:

```js
html`
  <ul>
    ${items.map((item) => html`<li>${item.name}`)}
  </ul>
`
```

Because templates are expressions that return values, developers can use any
control-flow, functions, or data-structures that they want to.

### Rendering and Updates

Template expressions only returns a description of DOM, not DOM itself. This is
so that template expressions can be re-evaluated efficiently to describe updates
to DOM, as well as initial DOM tree.

When a template is rendered to the DOM for the first time _globally_, it is
prepared to create a `Template` object and associated `<template>` HTML element.
The `Template` object contains information about the `TemplatePart`s created
from the binding locations.

When a template is rendered to a specific _location_ for the first time, its
`<template>` element and `TemplatePart`s are cloned to create a
`TemplateInstance`, whose parts are set to their values from the initial
`TemplateResult`. The `TemplateInstance` is cached for the rendering location,
and its fragment is inserted into the DOM.

When a template is rendered to a location on subsequent times, the
location's `TemplateInstance` is retrieved and its parts are set to the new
values from the new `TemplateResult`.

## Detailed Proposal

> [!WARNING]
> The detailed proposal is under construction

### The `DOMTemplate` namespace object

`DOMTemplate` is a new global namespace object, that holds the template literal
tags used to author templates, and other utilities:

```ts
class DOMTemplate {
  static html: (strings, ...values) => TemplateResult;
  static svg: (strings, ...values) => TemplateResult;
  static mathml: (strings, ...values) => TemplateResult;
  static nothing: Symbol;
  static noChange: Symbol;
}
```

#### `DOMTemplate.html`

A template literal tag for defining templates in the HTML namespace.

#### `DOMTemplate.svg`

A template literal tag for defining templates in the SVG namespace.

#### `DOMTemplate.html`

A template literal tag for defining templates in the MathML namespace.

#### `DOMTemplate.nothing`

A sentinel value that signifies that "nothing" should be rendered to a part.
`nothing` behaves the same as nullish values for child binding, but it will
remove an attribute when used anywhere in an attribute binding.

#### `DOMTemplate.noChange`

A sentinel value that signifies that the currently rendered value in the DOM
should no change. This is useful for conditionally skipping work, and in cases
where a directive imperatively updates a part.

### Template Syntax

The syntax for templates is mostly just plain HTML. Templates must be
well-formed HTML fragments. Since each template's strings are parsed separately
as fragments, if an element is opened withing a template, it must be closed
within the same template.

Within the template strings, standard JavaScript template literal embedded
expressions may be used. Expressions create bindings to DOM Parts, and must only
be placed at valid locations. These locations are the mutable parts of the DOM:

- Child/text, ie: `<div>${x}</div>`
- Attribute value, ie: `<input value=${x}>`

Expressions cannot be used for tag or attribute _names_.

Expressions can also appear in opening tag, separate from attributes, like:
`<div ${x}></div>`. This creates an "element binding".

#### Binding Types

- Child/text bindings:
- Attribute bindings:
- Property bindings:
- Event listener bindings:
- Element bindings:

### `Element.prototype.render()`

_TODO_

### Creating `<template>`s from template results

#### 1. Generating HTML from template strings

For every DOM template, we must be able to generate the HTML used to define the
associated HTML `<template>` element, and attach the proper Template Parts to
nodes in the `<template>` element.

First, we must define the valid locations that an expression can occur in the
template strings. Expressions outside of these valid locations will cause an
exception during rendering.

- Text position. eg `${x}` or `<p>${x}</p>`
- Attribute value position. eg `<div foo=${x}>`, `<div foo=${x}${y}>`,
  `<divfoo="${x}">`, `<div foo="${x} ${y}">`
- Element position. eg `<div ${x}>`

We can define an internal _Parse Template Strings_ operation that returns a
`<template>` element with attached parts. When the parser encounters a break
between strings, it should create and attach a template part depending on the
syntactic location, or throw.

### Rendering

_TODO_

### API

_TODO_

#### `DOMTemplate`
#### `TemplateResult`
#### `Element.prototype.render()`
#### `Template`
#### `TemplateInstance`
#### `TemplatePart`
#### `ChildPart`
#### `AttributePart`
#### `PropertyPart`
#### `EventPart`
#### `ElementPart`
#### `CommentPart`
#### `Direcive`
#### `DirectiveResult`

```
class DirectiveResult {
  readonly directiveClass: C;
  readonly values: DirectiveParameters<InstanceType<C>>;
}
```


### Directives

Directives are stateful objects that can customize the behavior of a binding by
getting direct access to the binding's TemplatePart and therefore the underlying
DOM. Directives are an imperative hook to the declarative template system,
through which userland code can add new delarative abstractions.

A template author will typically use a directive by calling a directive function
in a binding expression.

For example, here's a template using an imagined library-defined `keyed()`
directive to clear and recreate DOM whenever the key changes, customizing the
DOM stability semantics of the system.

```ts
html`<div>${keyed(userId, html`<x-user userid=${userId}></x-user>`)}</div>`
```

Examples of the type of customization that a directive can do:
- Custom change detection. A directive can store previous values and check new
  values against them, or against the current state of the DOM.
- Subscriptions. A directive can subscribe to an observable resource (
  EventTarget, signal, etc.) and unsubscribe when the directive is disconnected.
- Modifying DOM. A directive can directly modify the DOM, in order to add
  custom DOM update behavior. For example, DOM-preserving list reording,
  general DOM morphing, keyed templates.
- Detaching DOM. Directives can detatch and store DOM for later reuse, like a
  cache directive.

A directive _class_ is a class that extends the `Directive` base class and
implements an `update()` method with custom parameters:

```ts
class MyDirective extends Directive {
  update(foo: string) {
    // ...
  }
}
```

The directive class is then turned into a directive _function_ with the
`makeDirective()` factory:

```ts
// myDirective() is a function with the same signature as MyDirective.update():
const myDirective = makeDirective(MyDirective);
```

`makeDirective()` returns a function with the same signature as the directive
class's `update()` method, but that _doesn't_ instantiate the class or invoke
its `update()` method. Instead, it returns a `DirectiveResult` object that
captures references to the directive class constructor and the arguments to the
directive.

Similar to how `TemplateResults` either update an existing template instance or
create a new one based on the identity of the template strings, A
`DirectiveResult` either updates an existing directive instance or creates a new
onw based on the identy of the directive class.

The indirection of directive functions that return `DirectiveResult`s that refer
to directive classes gives us two things:

- A simple function-invocation syntax for template authors, even for stateful
  directives.
- A simple way to write stateful directives. State on a directive is just a
  class field.

#### Invoking Directives

When a TemplatePart receives a `DirectiveResult` object to `setValue()`, it must
take some steps to either instantiate or update the directive instance.

Each part has an array of directive instances. It's an array because directives
can be nested, for example: `outerDirective(innerDirective(value))`. This style
of composition works when the outer directive works on generic values and passes
them through to the underlying part. [TODO]

#### Why do we need directives?

Directives serve a couple of important purposes in terms of the core template
system:

- They help keep the core system simpler by decoupling advanced and opinionated
  behaviors form the core so they can be implemented in userland extensions.
- They keep the syntax simpler by putting some binding-specific options into the
  JavaScript expression side of the template and out of the string literal
  side.

Without directives, the built-in system would need to account for more needs
around keying, caching, stable list-reordering, pinpoint DOM updates, and more.

### Other API Shapes Considered

Existing templating APIs tend to fall into one of three main categories:

1. Markup-based embedded expression DSLs like JSX or tagged template literals.
2. Markup-based external DSLs like Mutache, Angular, Vue, and Svelte.
3. HTML builder APIs, like _XXX_.

For a new DOM API, we argue an embedded DSL that uses tagged tempalte literals
is the best choice:

- Tagged template literals exist in JavaScript already. No new language features
  are required, unlike JSX.
- Embeded DSLs utilize JavaScript for expressions and control flow, making the
  proposal smaller compared to external DSLs that require specifying new
  expressions and control flow syntaxes and semantics.
- Markup-based DSLs are familiar to HTML authors and have a close association to
  the DOM that they create. They support the open-ended set of HTML elements.
- Expression-based APIs are extremely expressive and flexible and allow for
  higher-order utilities to be built that process DOM descriptions.

### Related Issues and proposals

- [Template-Instantiation](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/Template-Instantiation.md)
- [webcomponents/1069](https://github.com/WICG/webcomponents/issues/1069)
- [webcomponents/777](https://github.com/WICG/webcomponents/issues/777)
- [webcomponents/1055](https://github.com/WICG/webcomponents/issues/1055)
- [webcomponents/1019](https://github.com/WICG/webcomponents/issues/1019)
- [webcomponents/1010](https://github.com/WICG/webcomponents/issues/1010)
- [webcomponents/1012](https://github.com/WICG/webcomponents/issues/1012)
