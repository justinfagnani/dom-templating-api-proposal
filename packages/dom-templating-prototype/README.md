# dom-templating-prototype

This is a prototype of the DOM Templating API proposal. It's built in order to
help demonstrate, verify, and clarify concrete proposal behavior.

## Status

This is not a polyfill, and not intended to be used as such. If you need a
production-ready library with similar concepts, try lit-html.

Features implemented:

- [x] Basic templating
- [x] Directives
- [ ] Factor out a DOM Parts prototype
- [x] DOM Scheduler prototype
- [ ] Signals proposal integration

While the DOM Templating proposal introduces new global objects and new methods
on existing classes, this prototype will refrain from doing so to reduce the
risk of polutting the public web and cutting off some API names.

## Relationship to lit-html

Much of the code here has been initially copied and modified from Lit's lit-html
library, which has a very similar API to the proposal.

lit-html's implementation has a strong focus on performance and code size, which
can sometimes make the code harder to follow. Besides changes for API
differences, this prototype has been optimized for clarity and generality, with
much less focus on raw performance.

### Differences from lit-html

- Refactored code into several modules to make the code easier to navigate.
- Removed several render options:
  - `host`, which was used to get a `this` value for event listener bindings, is
    replaced by looking up the host of the root node of the element with the
    binding.
  - `createScope` which was used for scoped custom element registry integration.
    Since the newer scoped custom element registry API supports scoped
    registries separate from shadow roots, the intention to allow scopes to be
    associated directly with templates.
  - `isConnected`, which was used to drive the `disconnected()` and
    `reconnected()` callbacks of AsyncDirectives from custom element callbacks.
    A native template feature should not need this, and should be able to drive
    directive connection callbacks directly.
- Removed the debug mode. The debug mode checks in lit-html are generally
  useful, they were only compiled out of the production build to improve code
  size and perf.
- Removed debug log events. These were events that are fired when certain stages
  of the template rendering process were executed. They are useful for debugging
  perf and correctness issues, but clutter the code. A native feature should
  support performance observability eventually.
- Use classes over plain objects. lit-html uses plain objects for things like
  TemplateResults because the code is slightly more compact.
- Remove AsyncDirective. AsyncDirective was created to reduce the overhead from
  making all directives connection aware. We hope the native feature can
  implement connectivity uniformaly for all directives.
- Make TemplatePart cloneable. lit-html's template parts are described by plain
  objects holding the information needed to construct TemplateParts. The DOM
  Parts proposal has instead taken the approach that TemplateParts should be
  attached to a `<template>` and cloned along with them.
- Support bindings in `<template>`. Bindings in `<template>` elements were
  supported in lit-html 1.x and 2.x, but removed in 3.x to realize a small size
  and performance improvement, and because the semantics of such bindings aren't
  as useful as some deveopers expect. However in lit-html 3.x, some users find
  the rule against bindings in `<template>` to be confusing as well. The small
  code-size concern should not be an issue for a native implementation.
- Use `instanceof` checks. lit-html goes to some lengths to work even when
  objects are mixed between copies and different versions of the library (ie, a
  TemplateResult produced with a `html` tag from one version, passed to a
  `render()` function from another version). It does this by using special
  property names as brands. `instanceof` is clearer to read, and a native
  feature doesn't need to worry about this as much. If it's needed, we can add
  methods like `isTemplateResult()` to help with branding.
- Use more modern JS, like proviate class fields.
- API changes:
  - `TemplateInstance`s are created with `Template.clone()` now. In lit-html
  they are created with a constuctor call, then initialization with a `_clone()`
  method on the instance.
  - `setValue()` is added to `TemplatePart`
  - Add `CommentPart`. It's not that useful, but it's good for completeness.

