/**
 * A map of nodes to their queued tasks.
 */
const tasksForNode = new WeakMap<Node, Array<TaskFunction>>();

/**
 * A queue of Nodes with pending tasks.
 *
 * This queue must be kept ordered in breadth-first DOM traversal order so that
 * tasks are run in top-down tree order.
 */
const pendingNodeQueue: Array<Node> = [];

export type TaskFunction = () => void;

let isTaskRunning = false;
let isAsyncBatchPending = false;

/**
 * Queues a DOM task to run in the current batch of tasks.
 *
 * If there is not yet a batch of tasks running, it will run the task
 * immediately. If there is a batch of tasks running, it will queue the task to
 * run in DOM order after the current task completes.
 */
export const postDOMTask = (node: Node, task: TaskFunction): void => {
  if (isTaskRunning === true) {
    queueTask(node, task);
  } else {
    runTask(task);
  }
};

/**
 * Queues a DOM task to run in a future microtask.
 */
export const postDomTaskAsync = (node: Node, task: TaskFunction) => {
  queueTask(node, task);
  if (isAsyncBatchPending === false) {
    isAsyncBatchPending = true;
    queueMicrotask(runAsyncTasks);
  }
};

const queueTask = (node: Node, task: TaskFunction): void => {
  let tasks = tasksForNode.get(node);
  if (tasks === undefined) {
    tasksForNode.set(node, (tasks = []));

    // Insert the node into the queue in breadth-first order:
    //
    // We know the node is not already in the queue. Assume that the common case
    // is that the node should be at the end of the queue.
    let i = pendingNodeQueue.length - 1;
    for (; i >= 0; i--) {
      const otherNode = pendingNodeQueue[i];
      const resultMask = node.compareDocumentPosition(otherNode);
      if (
        resultMask & Node.DOCUMENT_POSITION_CONTAINS ||
        resultMask & Node.DOCUMENT_POSITION_PRECEDING
      ) {
        // otherNode is an ancestor of or precedes the task node, so we can
        // insert it after the other node in the queue.
        pendingNodeQueue.splice(i + 1, 0, node);
      }
    }
    if (i === -1) {
      if (node.isConnected) {
        // This node should go first
        pendingNodeQueue.unshift(node);
      } else {
        // This node is not connected, so we can just add it to the end of the
        // queue
        pendingNodeQueue.push(node);
      }
    }
  }
  tasks.push(task);
};

const runTask = (task: TaskFunction): void => {
  isTaskRunning = true;
  let thrownError: unknown;
  try {
    task();
  } catch (e) {
    thrownError = e;
  } finally {
    while (pendingNodeQueue.length > 0) {
      const nextNode = pendingNodeQueue.shift()!;
      try {
        runTasks(nextNode);
      } catch (e) {
        console.error('Error running queued task:', e);
      }
    }
    isTaskRunning = false;
  }
  if (thrownError !== undefined) {
    throw thrownError;
  }
};

const runTasks = (node: Node): void => {
  const tasks = tasksForNode.get(node);
  if (tasks === undefined) {
    return;
  }
  let task: TaskFunction | undefined;
  while ((task = tasks.shift()) !== undefined) {
    try {
      task();
    } catch (e) {
      console.error('Error running queued task:', e);
    }
  }
  tasksForNode.delete(node);
};

const runAsyncTasks = (): void => {
  let node: Node | undefined;
  while ((node = pendingNodeQueue.shift()) !== undefined) {
    runTasks(node);
  }
  // We set this to false after all tasks have been processed so that any
  // calls to `queueDomTaskAsync` while we're processing tasks will run
  // in the same microtask batch.
  isAsyncBatchPending = false;
};
