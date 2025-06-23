# DOM Templating API Explainer

Author: [Justin Fagnani](https://github/justinfagnani)

DRAFT | Last update: 2025-06-22

> [!WARNING]
> This document is a work in progress.

## Introduction

Creating and updating trees of DOM nodes based on data is one of the most common
high-level operations performed in dynamic web applications, yet the web
platform has no ergonomic, declarative APIs for accomplishing this.

This repository proposes to add a high-level templating API to the DOM to allow
for the efficient creating and updating of DOM trees from data.

This proposal is based on the feature requests in
[webcomponents/1069](https://github.com/WICG/webcomponents/issues/1069) and
[webcomponents/1055](https://github.com/WICG/webcomponents/issues/1055) and the
template parts ideas in
[Template-Instantiation](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/Template-Instantiation.md).

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

A developer wants to create a complex tree of DOM elements from a set of data,
for example a product record on a shopping site. The data includes repeated
items, such as reviews, and optional items that will need to affect the output,
like whether the product has images. The resulting output has interactive
elements like buttons and inputs.

Two common plain-DOM ways of approaching this are to use string interpolation
and `innerHTML`, or to use `<template>` tags. Either approach has similar
problems for the developer:

- Finding nodes of interest: For many of the operations below, the developer has
  to find specific nodes to operate on.
- Adding event listeners: event listeners have to be imperatively added.  
- Setting properties: setting a property on an element needs to be done
  imperatively.
- Repeated fragments: This requires mapping over data and either cloning a
  sub-template or interpolating a string.
- Updating: To do DOM-stable updates, reference to nodes of interest are kept to
  be able to update their content individually when data changes.

### Case 2: Safe user-controlled value interpolation

A developer is using `.innerHTML` to create DOM from a mixture of
developer-controlled strings, trusted data sources, and user-controlled data.
Their system needs to be secure against XSS attacks, so they must escape all
user-controller data before intepolating into their trusted strings.

### Case 3: Reactivity

### Case 4: Server-side rendering

### Case 5: Userland template library

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

Template expressions only returns a description of DOM, not DOM itself. This is
so that template expressions can be re-evaluated efficiently to describe updates
to DOM, as well as initial DOM tree.

## Detailed Proposal

> [!WARNING]
> The detailed proposal is under construction

### Template processing and rendering model

Template rendering happens in distinct phases:

1. Template expression evaluation

   Templates are written as expressions using tagged template literals and the
   `DOMTemplate.html` template tag. Like all template literals, templates can
   contain expressions:
 
   ```ts
   DOMTemplate.html`<h1>Hello ${name}</h1>`;
   ```
 
   This expression captures the template strings and expression values into a
   `TemplateResult` instance.

2. Template preparation

   Templates are rendered to the DOM with the `Element.prototype.render()`
   method:

   ```ts
   document.body.render(DOMTemplate.html`<h1>Hello ${name}</h1>`);
   ```

   When a template is rendered to the DOM for the first time _globally_, it is
   prepared to create a `Template` object and associated `<template>` HTML
   element. The `Template` object contains information about the `TemplatePart`s
   created from the binding locations.

3. Template instantiation

   When a template is rendered to a specific _location_ for the first time, its
   `<template>` element and `TemplatePart`s are cloned to create a
   `TemplateInstance`, whose parts are set to their values from the initial
   `TemplateResult`. The `TemplateInstance` is cached for the rendering
   location, and its fragment is inserted into the DOM.

4. Template instance updating

   When a template is rendered to a location on subsequent times, the location's
   `TemplateInstance` is retrieved and its parts are set to the new values from
   the new `TemplateResult`.

5. Fine-grained template part updates

   With signal integration, when a signal bound to a template part changes, the
   part is individually updated, independently from the containing template.
   This update is scheduled and batched with other signal-based updates.

### Template Expressions

A template expression is a tagged template literal using one of the `html`,
`svg`, or `mathml` template tags available on the `DOMTemplate` namespace
object.

```ts
const {html} = DOMTemplate;

html`<h1>Hello</h1>`
```

Each of these template tags returns a `TemplateResult`.

```ts
(strings: TemplateStringsArray, ...value: Array<unknown>) => TemplateResult
```

`TemplateResult` is a class that holds a template expressions tag type, strings,
and values, and is used by `render()` and `ChildPart`s to create and update DOM.

#### Syntax

The syntax for templates is plain HTML, with two additions:
- Template literal expressions are allowed in text, attribute value, and
  "element" positions. These expressions create template parts and bindings to
  them.
- The special attribute name prefixes `.`, `@`, and `?` create property, event
  listener, and boolean attribute parts instead of plain attribute parts.

##### Well-formedness

Templates _should_ be well-formed HTML fragments. Since each template's strings
are parsed independently, each resulting template's content will be a complete
fragment. This means that if an element is opened withing a template, it must be
closed within the same template, or will be closed by the existing fragment
parsing algorithm.

> [!WARNING]
> 
> In the userland prototype of this system non-well-formed templates can have
> undefined behavior.
> 
> The prototype cannot detect when expressions have been re-ordered by the
> parser due to their containing nodes being moved.
>
> For example, this template:
> ```ts
> html`
>   <table>
>     <tr><td>${x}</td></tr>
>     <footer>${title}</footer>
>   </table>
> `
> ```
>
> will result in a DOM structure of:
> ```html
> <footer></footer>
> <table>
>   <tr><td></td></tr>
> </table>
> ```
> and this will cause the values to be bound in the wrong order because values
> are associated with parts by order.
>
> The native implementation might be able to order the template parts list by
> the order they appear in the template strings, not the DOM, and fix this
> issue, or it could possibly throw on non-well-formed templates.

##### Expressions

Within the template strings, standard JavaScript template literal embedded
expressions may be used. Expressions create bindings to DOM Parts, and must only
be placed at valid locations:

- Child/text, eg: `<div>${x}</div>`
- Attribute value, either unquoted (`<input value=${x}>`) or quoted
  (`<input value="${x} ${y}">`).
- In an opening tag, separate from attributes, like: `<div ${x}></div>`. This
  creates an "element binding".
  <!-- TODO (justinfagnani): find the spec name for this location -->

Aside from element bindings, hese locations are the mutable parts of the DOM.
Expressions cannot be used immutable parts like tag or attribute _names_.

Multiple expressions may appear in an attribute value if the value is quoted, or
if the expressions have no space between them.

There must be space between an unquoted attribute expression and any following
attribute name.

#### Binding types

##### Child/text bindings
##### Attribute bindings
##### Property bindings
##### Event listener bindings
##### Element bindings
##### Comment bindings

#### Property and event binding Syntax

This template API allows for binding to properties and events as well as
attributes.

This is critical because DOM elements have four main API surfaces that are used
declaratively from client-side template systems:
- Children
- Attributes
- Properties
- Events

The most popular client-side template systems in use today allow some degree of
setting items in each of these API surfaces declaratively.

Attributes, properties, and events can present an interesting problem for some
template systems. They are all key/value APIs, where an item has a name that we
would like to assign a value to, thus they form three separate namespaces.
Because they are APIs on elements, template syntaxes typically try to allow all
three namespaces in the attribute positions on elemnts.

##### Survey of template binding syntaxes

Some template systems try to merge these three separate namespaces into one, and
then figure out - either via runtime introspection, built-in configuration
lists - whether to set an attribute or property; or they might rely on event
handler properties for event listeners.

Other systems have explicit syntac to dismbiguate between the namespaces.

|           | Attribute | Property | Event      | Boolean Attribute |
|-----------|-----------|----------|------------|-------------------|
| React     | `foo={}`  | `foo={}` with an `in` check | `onfoo={}` | `foo={}`<br>Has list of boolean attributes          |
| Vue       | `v-bind:foo=""` or `:foo={}` | `:foo={}` with an `in` check<br>`:foo.prop={}`<br>`.foo={}` | `v-on:foo={}` | `foo={}`<br>truthy or falsey values determine presence|
| Angular | `[attr.foo]=""` | `[foo]=""` | `(foo)=""` | `[attr.foo]=""`<br>truthy or falsey values determine presence |
| Lit | `foo={}` | `.foo={}` | `@foo={}` | `?foo={}` |
| Imperative DOM API | `setAttribute('foo')` | `.foo=` | `addEventListener('foo')` | `toggleAttribute('foo')` |

##### Disambiguating with sigils

Since plain HTML doesn't have a way to set properties or add arbitrary event
listeners on elements[^1], the DOM Template API's syntax will need some addition
to support properties and events.

The goals of this proposal for additional syntax:
- Explicit: There shouldn't be confusion or guessing as to whether a binding is
  to an attribute, property or event.
- Simple: The additional syntax should be easy to type.
- Intuitive: The syntax should evoke the intention.
- Safe: Low chance of collision with real attribute names.

In this proposal we suggest using single-character prefixes for properties and
events as in Vue's shorthand versions and Lit. In addition, we suggest the `?`
prefix for boolean attributes.

```ts
html`<button @click=${handleClick}></button>`
```

> [!NOTE]
> These sigils do not require HTML parser changes, since they are valid,
> parseable attribute names. They are also extremely unlikely to conflict with
> any real-world attribute names because they are _invalid_ to use with DOM APIs
> like `setAttribute()`.

[^1]: HTML does have some facility for event handler attributes,
but these are generally discourage and don't have access to the lexical scope
of the template expression.

##### Why can't directives be used for property and event bindings?

Because directives can customize the behavior of a binding, they could be used
to set a property or add an event handler instead of setting an attribute for
attribute bindings. This could look something like:

```ts
html`<button click=${event(handleClick)}></button>`
```

This isn't a very feasible or great idea, for several reasons:

1. Elements cannot have duplicate attribute names, so it wouldn't be possible to
   set an attribute and add an event handler on the same element if the
   attribute and event shared the same name. Maybe the parser could be modified
   so allow this, since the DOM wouldn't be constructed with the attribute
   present, but that might be a large than necessary change to the parser.
2. It's more verbose. Conciseness balanced with clarity are extremely important
   for templates, and a directive approach is more characters and harder to
   read.
   
   Compare:
   ```ts
   <button click=${event(handleClick)}>
   ```
   to
   ```ts
   <button @click=${handleClick}>
   ```
3. It's worse for performance. Every property and event binding will require a
   directive, which have some memory and CPU time overhead. The directives will
   have to have disconnect handlers to clean up in case the directive is
   dynamically switched out, which is additional overhead.
4. It's more dynamic than we want. Ideally most bindings are very static and
   always binding to the same API point - a specific attribute, property, or
   event. This makes reasoning about a template easier for humans and for static
   analyzers like type-checkers. The directive approach is much more dynamic and
   instead of being able to know what a binding is bound to, a lot will be left
   up to how specific directives behave.


> [!NOTE]
> #### A refresher on tagged template literals
> 
> Tagged template literals have a important property that makes this proposal
> possible. A template tag function receives a _template strings array_ as its
> first argument, that is the same object for every invocation of the tagged
> template literal expression.
> 
> ```ts
> // A template tag function that simply returns the strings array
> const tag = (strings) => string;
> 
> // A function that evaluates returns the result of tag
> const run = (x) => tag`abc ${x} def`;
> 
> run(1) === run(2); // true
> ```
> 
> This behavior lets us use a template expression's template strings array as both
> a cache key to stored prepared `<template>` elements against, and as a DOM
> template instance key to use to tell if we're re-rendering the same template to
> the DOM.

### Rendering

A template expression is side-effect free. In order to create or update DOM we
must render it with the `Element.prototype.render()` method:

```ts
interface Element {
  render(value: unknown): void;
}
```

`render()` looks up a ChildPart for the element, called the "root part", from
a cache. If a root part is not found for the element, the element is cleared and
a new root ChildPart is created, attached to the element, and cached.

The value passed to `render()` is then assigned to the root ChildPart by calling
`ChildPart.prototype.setValue()`.

Aside from creating and caching a ChildPart, the work of rendering a new
template or updating an existing one is done by ChildPart. Like a child
expression and `ChildPart.prototype.setValue()`, `render()` takes any renderable
value[^2].

[^2]: A renderable value is any value that's valid for a child/text
expression, such as a TemplateResult, string, number, array. See the ChildPart
section.

### Template Preparation

When a template expression is rendered for this first time, it is prepared to
create a `Template` object and `<template>` element.

The template strings are parsed with something similar to the fragment parsing
algorithm. Each template string is given to the parser, and at the end of each
string except the last, either a Part is created or an error is thrown.

The type of Part created is determined by the syntactic position at the end of
the string, or a the end of the current attribute value.

#### By example

##### ChildPart
```ts
html`a ${x} b`
// or
html`<div> a ${x} b </div>`
```

##### SingleAttributePart
```ts
html`<div foo=${x}></div>`
// or
html`<div foo="${x}"></div>`
```

##### MultiAttributePart
```ts
html`<div foo=${x}${y}></div>`
// or
html`<div foo="${x}${y}"></div>`
// or
html`<div foo="a ${x} b"></div>`
```

##### SinglePropertyPart
```ts
html`<div .foo=${x}></div>`
// or
html`<div .foo="${x}"></div>`
```

##### MultiPropertyPart
```ts
html`<div .foo=${x}${y}></div>`
// or
html`<div .foo="${x}${y}"></div>`
// or
html`<div .foo="a ${x} b"></div>`
```

##### BooleanAttributePart
```ts
html`<div ?foo=${x}></div>`
// or
html`<div ?foo="${x}"></div>`
```

##### EventPart
```ts
html`<div @foo=${x}></div>`
// or
html`<div @foo="${x}"></div>`
```

##### ElementPart
```ts
html`<div ${x}></div>`
```

##### CommentPart
```ts
html`<!-- a ${x} -->`
```

##### Part creation logic

- If the position is text, create and attach a ChildPart
- Else if the position is attribute value, then:
  - Continue to parse template strings until the end of the attribute value
    (ending quote or whitespace)
  - If the binding controls the whole attribute value (the last character of the
    preceding string starts the attribute value and the first character of the
    next string ends the attribute value) then
    - If the attribute name starts with a `.`, create and attach a
      SinglePropertyPart.
    - Else if the attribute name start with a `@`, create and attach a
      EventPart.
    - Else if the attribute name start with a `?`, create and attach a
      BooleanAttributePart.
    - Else create and attach a SingleAttributePart.
  - Else if the binding is an interpolation with static string portions of the
    attribute value, or has multiple bindings in the attribtue value, then
    - If the attribute name starts with a `.`, create and attach a
      MultiPropertyPart.
    - If the attribute name starts with `@` or `?`, throw.
    - Else create and attach a MultiAttributePart.
- Else if the position is attribute name
  - If the next string starts with whitespace or tag end, create an attach an
    ElementPart
  - Else throw
- Else if the position is content text, create and attach a ContentPart
- Else throw

Parts are attached by giving them references to anchor nodes and pushing them
onto a `parts` array. Any time an attribute-like part is attached, its attribute
name and value are removed from the template DOM.

The resulting DOM is parsed into the content fragment of a `<template>`.

A `Template` object is then constructed with references to the `<template>`
element and the `parts` array.

### Template instantiation

_TODO_

### Template instance updating

_TODO_

### Fine-grained template part updates

_TODO_

### API

_TODO_

#### `DOMTemplate`

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

##### `DOMTemplate.html`

A template literal tag for defining templates in the HTML namespace.

##### `DOMTemplate.svg`

A template literal tag for defining templates in the SVG namespace.

##### `DOMTemplate.html`

A template literal tag for defining templates in the MathML namespace.

##### `DOMTemplate.nothing`

A sentinel value that signifies that "nothing" should be rendered to a part.
`nothing` behaves the same as nullish values for child binding, but it will
remove an attribute when used anywhere in an attribute binding.

##### `DOMTemplate.noChange`

A sentinel value that signifies that the currently rendered value in the DOM
should no change. This is useful for conditionally skipping work, and in cases
where a directive imperatively updates a part.

#### `TemplateResult`

`TemplateResult` is a class that captures the template type, static strings and
values from a template expression:

```ts
class TemplateResult {
  readonly kind: 'html' | 'svg' | 'mathml';
  readonly strings: TemplateStringsArray;
  readonly values: Array<unknown>;
}
```

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
- [JavaScript Signals standard proposal](https://github.com/tc39/proposal-signals)
- [webcomponents/1069](https://github.com/WICG/webcomponents/issues/1069)
- [webcomponents/777](https://github.com/WICG/webcomponents/issues/777)
- [webcomponents/1055](https://github.com/WICG/webcomponents/issues/1055)
- [webcomponents/1019](https://github.com/WICG/webcomponents/issues/1019)
- [webcomponents/1010](https://github.com/WICG/webcomponents/issues/1010)
- [webcomponents/1012](https://github.com/WICG/webcomponents/issues/1012)
