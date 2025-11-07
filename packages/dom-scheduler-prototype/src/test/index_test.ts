import {postDOMTask} from '../index.js';
import {assert} from 'chai';

suite('queueDOMTask', () => {
  let container: HTMLDivElement;

  setup(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  teardown(() => {
    document.body.removeChild(container);
    container = undefined as unknown as HTMLDivElement;
  });

  test('should run the task immediately if no other task is running', () => {
    let taskRan = false;
    const task = () => {
      taskRan = true;
    };

    postDOMTask(document.body, task);
    assert.isTrue(taskRan, 'Task should have run immediately');
  });

  test('should throw if the task throws', () => {
    const task = () => {
      throw new Error('Task error');
    };

    assert.throws(
      () => {
        postDOMTask(document.body, task);
      },
      'Task error',
      'Should throw the error from the task'
    );
  });

  test('should queue tasks if another task is running', () => {
    let nestedTaskRan = false;
    const nestedTask = () => {
      nestedTaskRan = true;
    };

    // Run an outer task that runs a nested task
    postDOMTask(document.body, () => {
      postDOMTask(document.body, nestedTask);
      assert.isFalse(nestedTaskRan, 'Task should not have run immediately');
    });

    // The nested task should be queued and run after the first task completes
    assert.isTrue(
      nestedTaskRan,
      'Queued task should have run after the first task'
    );
  });

  test('should run nested tasks on the same node in FIFO order', () => {
    let firstTaskRan = false;
    let secondTaskRan = false;

    const firstTask = () => {
      firstTaskRan = true;
    };
    const secondTask = () => {
      secondTaskRan = true;
    };

    postDOMTask(document.body, () => {
      postDOMTask(document.body, firstTask);
      postDOMTask(document.body, secondTask);
    });

    // Both tasks should run in order
    assert.isTrue(firstTaskRan, 'First task should have run');
    assert.isTrue(secondTaskRan, 'Second task should have run after first');
  });

  test('runs nested tasks in DOM order for siblings', () => {
    let calls: string[] = [];

    const el1 = container.appendChild(document.createElement('div'));
    const task1a = () => {
      calls.push('task1a');
    };
    const task1b = () => {
      calls.push('task1b');
    };

    const el2 = container.appendChild(document.createElement('div'));
    const task2a = () => {
      calls.push('task2a');
    };
    const task2b = () => {
      calls.push('task2b');
    };

    postDOMTask(document.body, () => {
      // Queue the tasks out of tree order
      postDOMTask(el2, task2a);
      postDOMTask(el1, task1a);
      postDOMTask(el2, task2b);
      postDOMTask(el1, task1b);
    });
    assert.deepEqual(
      calls,
      ['task1a', 'task1b', 'task2a', 'task2b'],
      'Tasks should run in DOM order'
    );
  });

  test('runs nested tasks in DOM order for contained elements', () => {
    let calls: string[] = [];

    const el1 = container.appendChild(document.createElement('div'));
    const task1 = () => {
      calls.push('task1');
    };

    const el2 = el1.appendChild(document.createElement('div'));
    const task2 = () => {
      calls.push('task2');
    };

    postDOMTask(document.body, () => {
      // Queue the tasks out of tree order
      postDOMTask(el2, task2);
      postDOMTask(el1, task1);
    });
    assert.deepEqual(
      calls,
      ['task1', 'task2'],
      'Tasks should run in DOM order'
    );
  });

  // TODO: Tests that have tree-mutations in them!
  test('')
});
