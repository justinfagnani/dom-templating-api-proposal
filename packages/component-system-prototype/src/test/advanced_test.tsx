import {assert} from 'chai';
import type {ComponentProps} from '../component.js';
import {render, useState} from '../index.js';
import type { } from './jsx-types.d.ts';

// @ts-expect-error: required for the JSX transformer
import * as DOMTemplate from 'dom-templating-prototype';

/**
 * Strips expression comments from provided html string.
 */
const stripExpressionComments = (html: string) =>
  html.replace(/<!--\?node-part-->|<!--\??-->/g, '');

suite('Component System - Advanced Tests', () => {
  let container: HTMLElement;

  setup(() => {
    container = document.createElement('div');
  });

  suite('Multiple useState hooks', () => {
    test('component with multiple useState calls', async () => {
      let incrementCount: (() => void) | undefined;
      let incrementClicks: (() => void) | undefined;

      function MultiState() {
        const [count, setCount] = useState(0);
        const [clicks, setClicks] = useState(0);
        incrementCount = () => setCount((c: number) => c + 1);
        incrementClicks = () => setClicks((c: number) => c + 1);
        return (
          <div>
            <span>Count: {count}</span>
            <span>Clicks: {clicks}</span>
          </div>
        );
      }

      render(<MultiState />, container);
      assert.equal(
        stripExpressionComments(container.innerHTML),
        '<div><span>Count: 0</span><span>Clicks: 0</span></div>'
      );

      incrementCount!();
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.equal(
        stripExpressionComments(container.innerHTML),
        '<div><span>Count: 1</span><span>Clicks: 0</span></div>'
      );

      incrementClicks!();
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.equal(
        stripExpressionComments(container.innerHTML),
        '<div><span>Count: 1</span><span>Clicks: 1</span></div>'
      );
    });

    test('hooks maintain order across renders', async () => {
      let toggle: (() => void) | undefined;

      function OrderTest() {
        const [a, setA] = useState('A');
        const [b, setB] = useState('B');
        const [c, setC] = useState('C');

        toggle = () => {
          setA('X');
          setB('Y');
          setC('Z');
        };

        return (
          <div>
            {a}
            {b}
            {c}
          </div>
        );
      }

      render(<OrderTest />, container);
      assert.equal(
        stripExpressionComments(container.innerHTML),
        '<div>ABC</div>'
      );

      toggle!();
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.equal(
        stripExpressionComments(container.innerHTML),
        '<div>XYZ</div>'
      );
    });
  });

  suite('Component children', () => {
    test('component receives children prop', () => {
      function Wrapper({children}: ComponentProps) {
        return <div attr:class="wrapper">{children}</div>;
      }

      render(
        <Wrapper>
          <span>Child content</span>
        </Wrapper>,
        container
      );
      const wrapper = container.querySelector('.wrapper');
      assert.isNotNull(wrapper);
      assert.include(wrapper?.innerHTML, 'Child content');
    });

    test('component with multiple children', () => {
      function Container({children}: ComponentProps) {
        return <section>{children}</section>;
      }

      render(
        <Container>
          <h1>Title</h1>
          <p>Paragraph</p>
        </Container>,
        container
      );

      const section = container.querySelector('section');
      assert.isNotNull(section);
      const h1 = section?.querySelector('h1');
      const p = section?.querySelector('p');
      assert.equal(h1?.textContent, 'Title');
      assert.equal(p?.textContent, 'Paragraph');
    });
  });

  suite('Integration: TodoList App', () => {
    test('complete todo list with add/toggle/delete', async () => {
      let addTodo: ((text: string) => void) | undefined;
      let toggleTodo: ((id: number) => void) | undefined;
      let deleteTodo: ((id: number) => void) | undefined;

      interface Todo {
        id: number;
        text: string;
        completed: boolean;
      }

      function TodoItem({
        todo,
        onToggle,
        onDelete,
      }: {
        todo: Todo;
        onToggle: (id: number) => void;
        onDelete: (id: number) => void;
      }) {
        return (
          <li>
            <input
              type="checkbox"
              checked={todo.completed}
              on:change={() => onToggle(todo.id)}
            />
            <span
              attr:style={todo.completed ? 'text-decoration: line-through' : ''}
            >
              {todo.text}
            </span>
            <button on:click={() => onDelete(todo.id)}>Delete</button>
          </li>
        );
      }

      function TodoList() {
        const [todos, setTodos] = useState<Todo[]>([]);

        addTodo = (text: string) => {
          setTodos([...todos, {id: Date.now(), text, completed: false}]);
        };

        toggleTodo = (id: number) => {
          setTodos(
            todos.map((t) =>
              t.id === id ? {...t, completed: !t.completed} : t
            )
          );
        };

        deleteTodo = (id: number) => {
          setTodos(todos.filter((t) => t.id !== id));
        };

        return (
          <div>
            <ul>
              {todos.map((todo) => (
                <TodoItem
                  todo={todo}
                  onToggle={toggleTodo!}
                  onDelete={deleteTodo!}
                />
              ))}
            </ul>
          </div>
        );
      }

      render(<TodoList />, container);

      // Initially empty
      let items = container.querySelectorAll('li');
      assert.equal(items.length, 0);

      // Add first todo
      addTodo!('Buy milk');
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Check what actually rendered
      items = container.querySelectorAll('li');
      assert.equal(items.length, 1, 'Should have 1 todo item');
    });
  });
});
