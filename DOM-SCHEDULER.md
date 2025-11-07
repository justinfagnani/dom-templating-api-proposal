# DOM Scheduler API Explainer

Author: [Justin Fagnani](https://github/justinfagnani)

DRAFT | Last update: 2025-11-06

> [!WARNING]
> This document is a work in progress. This proposal draft is not finished and
> not ready for review.

## Introduction

When performing multiple DOM updates across a document, it's important to batch
and order the updates for both performance and correctness.

Batching DOM writes helps reduce read-write-read interleaving that can cause
invalidation and re-layout, and ordering updates in tree order helps prevent
_tearing_ (where an update writes partially out-of-date state to the DOM) and
_double-rendering_ (where a child renders before its parent, which causes the
child to render again).

Tree-aware scheduling is different from the [Prioritized Task Scheduling
API](https://wicg.github.io/scheduling-apis/) because it is aware of the DOM
tree and because the overall DOM update is often performed _synchronously_.

This kind of scheduling is most often either centralized by frameworks, which
prefer to have total knowledge of all DOM updates, or distributed but emergently
coordinated (i.e., via the microtask queue) in common web components libraries.

This proposal introduces a _Tree-aware DOM Task Scheduling API_ to allow
batched, tree-order, synchronous DOM updates from multiple actors.

The main API is a `postDOMTask()` method on the `Scheduler` interface:

```ts
interface Scheduler {
  postDOMTask(node: Node, callback: () => void): boolean;
}
```

This method:
1. Adds the callback to a queue of tasks for the node.
2. Adds the node to a tree-ordered queue of nodes that have pending tasks.
3. If a task is not currently running, executes tasks on the queue until the
   queue is empty.
4. Returns `true` if the callback was executed during the `postDOMTask` call,
   `false` if the callback was only enqueued.

## Problems to solve

### Web component updates cannot currently be batched, synchronous, and interoperable

- **Batching:** Web components often derive their internal DOM from externally
  mutable state: attributes, properties, etc. When that state changes, the web
  component will update its DOM, including setting new state on sub-components.
  This may include setting multiple update-triggering properties on
  sub-components. In order to not re-render the sub-component N times for N
  updated properties, the sub-component needs to batch its updates. This
  requires the sub-component's update to happen after the parent is finished, or
  for the sub-component to otherwise know that the parent is done setting
  properties.
- **Synchronous updates:** Web components ideally should update their internal
  DOM synchronously when state changes so that external code can accurately
  measure the element, so slots are rendered and events have the right paths,
  etc.
- **Interoperability**: A web component should be "plain" in that it doesn't
  require a bespoke API for setting properties in a batch, or require that other
  elements it's used with use the same userland scheduler API.

Currently it is not possible to meet all three goals. Web component helper
libraries like Lit and FAST choose batching and interoperability over
synchronous updates and add update tasks to the microtask queue. Multiple
property updates to an element are flushed to the DOM in a microtask for
batching, and sub-components that use the same technique are also batched and
have their updates naturally run in top-down tree order.

### Cross-tree simultaneous updates can cause tearing and double-rendering

If a parent and child component (general components, not web components
specific) both receive an invalidation event (ie, a reactive data change), then
it's important that the parent component respond to the change first.

As part of its update, the parent may send new derived data to the child. If the
child updates first, it may render a combination of new (from the reactive data
change) and old (stale derived data from the parent) data, something called
"tearing". Then when the parent updates, it will send new derived data to the
child, causing the child to render again.

### Inline control-flow and side-effects require that expressions are run in order

Most template systems, especially JavaScript-based ones like React/JSX's or
Lit's, try to preserve sequential execution of expressions, including control
flow. Because changes in control flow results might invalidate or skip
subsequent expressions, all expressions within a template must be run in
breadth-first tree traversal order.

## Design

```ts
interface Scheduler {
  /**
   * Add a DOM task to the scheduler
   */
  postDOMTask(node: Node, callback: () => void): boolean;
  isDOMTaskPending(): boolean;
}
```

### Ordering

For the reasons discussed in [Problems to solve](#problems-to-solve), tasks
must run in breadth-first tree-order. Two critical details of this are:

1. When are new tasks added to the Scheduler during task execution run?
2. What happens when the DOM is mutated in a way that changes tree ordering?

#### Adding new tasks

In typical task scheduling for one update pass on a DOM tree, new tasks are
added for children of the current task's nodes, and these come after the current
node in tree-order, so they will be executed in order by exhausting the task
queue (as long as the pending nodes are inserted into the queue in the correct
order).

It's possible for tasks to be posted for an ancestor or preceding sibling or
cousin node, however. These tasks aren't naturally executed in order by running
through the queue. There are some options for how to handle this situation:

1. Throw. This situation possibly results in double-rendering, so it should be
   discouraged. Such tasks would have to be posted outside of the current task
   execution.
2. Finish executing all later-ordered tasks, then start executing the queue
   again from the first-in-tree-order node. This requires a bit more complex
   bookkeeping, but is doable. It does run a risk of infinite iteration, so we
   may want to limit how many times the queue can restart in a single top-level
   task run.
3. Always pick the first-in-tree-order node as the next node to run tasks for.
   This is a simple approach (if updating the queue is efficient enough). The
   downside is that it can risk starvation of later in the tree nodes, but that
   is the same or similar risk as starvation in option 2.

The prototype in `dom-scheduler-prototype` chooses option 3.

### Timing

As mentioned in [Problems to solve](#problems-to-solve), one of the problems in
the web components ecosystem is that it's currently impossible to have updates
that are batched, synchronous, and interoperable.

So we would like to have tasks be able to run synchronously. But we also require
batching, so we don't always want a task to execute immediately. We need to be
able to post a task and continue to collect state changes while the task is
pending, then flush all the state changes when the task executes.

To solve this, we differentiate between a `postDOMTask()` call that's run
nested inside a DOM task callback, from one that is run at the top-level, outside
of a DOM task.

Nested tasks are simply added to the DOM task queue that is already being
executed. Top-level calls are added to the queue, which is then executed
immediately. Any nested tasks added during the execution of the top-level task
will be executed in order, before the top-level `postDOMTask()` call completes.

This is similar to how `requestAnimationFrame()` handles nested calls.

### Prioritization (Open Question)

It is sometimes desirable to handle updates to different subtrees on different
priorities. For example, a visually hidden subtree may render at a lower
priority that doesn't block the microtask or current animation frame. A parent
component may batch its rendering on animation frame or macro task timing,
and want to pause its subtree updates until it renders too.

Some of this timing control is admittable within the simple proposed API
already, by not posting a task immediately, for instance. But some things, like
deferring entire subtree task execution, are not possible with this API when
components within the subtree post their own tasks.

We may want something that selectively enables and disables task execution for a
subtree, like:

```ts
interface Scheduler {
  disableDOMTasks(node): Promise<void>;
  enableDOMTasks(node): Promise<void>;
}
```

or 

```ts
interface Scheduler {
  deferDOMTasks(node, signal: AbortSignal): Promise<void>;
}
```

Once tasks are deferred for a subtree, there may be cases when higher-priority
updates are needed by sub-components, making deferral just a _suggestion_ to
cooperating components in the subtree. The React team's sierpinski triangle
concurrent rendering demo is an example of this.

One solution might be to allow tasks to be posted with a priority, similar to
`Scheduler.postTask()`, and for parent components to be able to set the current
priority level for a subtree.
