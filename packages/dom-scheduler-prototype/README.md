# dom-scheduler-prototype

A tree-aware task scheduler for the DOM

## Overview

This is a prototype implementation of the tree-aware DOM scheduler idea proposed
in [WICG/webcomponents#1055](https://github.com/WICG/webcomponents/issues/1055).

This scheduler allows enquing tasks associated with a DOM node and runs queued
tasks in _breadth-first tree order_. This ensures that tasks are run top-down
through the DOM tree, even if tasks are scheduled concurrently at different
levels of the tree. Top-down ordering prevents things like shearing and
double-rendering.

Tasks are executed synchronously for root tasks (a task that was not enqueued
from another running task), and asynchronously for nested tasks. This allows
for nested tasks structures that run to completion by the time the outermost
`postDOMTask` call completes. This is important for being able to have
synchronous DOM updates from code external to a task (ie, code external to a
component) and batcing from within a task (ie, code internal to a component
tree).

To batch multiple external task calls, either create a sync root task and then
perform operations that invoke taskss within it, or call `postDOMTaskAsync`,
which will queue a task, but execute it in a future microtask so taht other 
`postDOMTaskAsync` calls can be batched with it. `postDOMTaskAsync` is
useful for integrating with external observale data sources like Signals.

## Example

Given this DOM tree:
```html
<body>
  <div id="foo">
    <div id="bar"></div>
  </div>
  <div id="baz"></div>
</body>

```

And these task calls:
```ts
import {postDOMTask, postDOMTaskAsync} from 'dom-tree-scheduler';

postDOMTask(document.body, () => {
  // This is a root task and runs immediately.
  console.log('body A');

  postDOMTask(document.body.querySelector('#baz'), () => {
    // This is a nested task and runs after its parent has completed, in
    // bread-first order with other enqueued tasks.
    console.log('baz');
  });

  postDOMTask(document.body.querySelector('#bar'), () => {
    console.log('bar');
  });

  postDOMTask(document.body.querySelector('#foo'), () => {
    console.log('foo');
  });

  console.log('body B');
});
```

The console logs
```
body A
body B
foo
bar
baz
```
