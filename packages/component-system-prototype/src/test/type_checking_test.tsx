import type {} from './jsx-types.d.ts';
import {assert} from 'chai';
import * as DOMTemplate from 'dom-templating-prototype';
import {render} from '../index.js';
import type {TemplateResult} from 'dom-templating-prototype/lib/template-result.js';

/**
 * Type checking tests - verifies that TypeScript correctly type-checks
 * component props and children at compile time.
 */

suite('Component System - Type Checking', () => {
  let container: HTMLElement;

  setup(() => {
    container = document.createElement('div');
  });

  suite('Props type checking', () => {
    test('component with required props - correct usage', () => {
      function Greeting(props: {name: string}) {
        return <div>Hello {props.name}</div>;
      }

      // This should compile fine
      const result = <Greeting name="Alice" />;
      render(result, container);
      assert.include(container.textContent, 'Alice');
    });

    test('component with required props - missing prop should error', () => {
      function Greeting(props: {name: string}) {
        return <div>Hello {props.name}</div>;
      }

      // This test verifies TypeScript catches the error at compile time
      // @ts-expect-error - name is required
      const _result = <Greeting />;
      // Don't render - this is a compile-time type check only
    });

    test('component with required props - wrong type should error', () => {
      function Greeting(props: {name: string}) {
        return <div>Hello {props.name}</div>;
      }

      // @ts-expect-error - name should be string, not number
      const _result = <Greeting name={123} />;
      // Don't render - this is a compile-time type check only
    });

    test('component with optional props - can omit', () => {
      function Greeting(props?: {name?: string}) {
        return <div>Hello {props?.name || 'World'}</div>;
      }

      // Both should compile fine
      const result1 = <Greeting />;
      const result2 = <Greeting name="Alice" />;
      render(result1, container);
      assert.include(container.textContent, 'World');
      render(result2, container);
      assert.include(container.textContent, 'Alice');
    });

    test('component with extra props should error', () => {
      function Greeting(props: {name: string}) {
        return <div>Hello {props.name}</div>;
      }

      // @ts-expect-error - age is not a valid prop
      const _result = <Greeting name="Alice" age={30} />;
      // Don't render - this is a compile-time type check only
    });

    test('component with multiple required props', () => {
      function UserCard(props: {
        name: string;
        age: string | number;
        email: string;
      }) {
        return (
          <div>
            {props.name}, {props.age}, {props.email}
          </div>
        );
      }

      // Correct usage
      const result = <UserCard name="Bob" age={30} email="bob@example.com" />;
      render(result, container);
      assert.include(container.textContent, 'Bob');

      // @ts-expect-error - missing email
      const _result2 = <UserCard name="Bob" age={30} />;

      // @ts-expect-error - wrong type for age
      const _result3 = (
        <UserCard name="Bob" age="thirty" email="bob@example.com" />
      );
      // Don't render - these are compile-time type checks only
    });

    test('component with union type props', () => {
      function Status(props: {status: 'success' | 'error' | 'pending'}) {
        return <div>{props.status}</div>;
      }

      // Valid values
      const result1 = <Status status="success" />;
      render(result1, container);
      assert.equal(container.textContent, 'success');

      // @ts-expect-error - invalid status value
      const _result4 = <Status status="completed" />;
      // Don't render - this is a compile-time type check only
    });

    test('component with complex object props', () => {
      interface User {
        id: number;
        name: string;
        email: string;
      }

      function UserProfile(props: {user: User}) {
        return <div>{props.user.name}</div>;
      }

      const user: User = {id: 1, name: 'Alice', email: 'alice@example.com'};
      const result = <UserProfile user={user} />;
      render(result, container);
      assert.include(container.textContent, 'Alice');

      // @ts-expect-error - missing required user properties
      const _result2 = <UserProfile user={{id: 1, name: 'Bob'}} />;
      // Don't render - this is a compile-time type check only
    });
  });

  suite('Children type checking', () => {
    test('component that accepts children', () => {
      function Card(props: {title: string; children?: TemplateResult}) {
        return (
          <div>
            <h3>{props.title}</h3>
            <div>{props.children}</div>
          </div>
        );
      }

      // With children
      const result1 = (
        <Card title="My Card">
          <p>Content</p>
        </Card>
      );
      render(result1, container);
      assert.include(container.textContent, 'Content');

      // Without children (should also work)
      const result2 = <Card title="Empty Card" />;
      render(result2, container);
    });

    test('component with children validates type', () => {
      function Wrapper({children}: {children?: TemplateResult}) {
        return <div attr:class="wrapper">{children}</div>;
      }

      // Should work with children
      const result = (
        <Wrapper>
          <span>Child content</span>
        </Wrapper>
      );
      render(result, container);
      assert.include(container.innerHTML, 'Child content');

      // Should work without children (children are always optional in JSX)
      const result2 = <Wrapper />;
      render(result2, container);
    });

    test('component with typed children through props', () => {
      interface ListProps {
        items: string[];
        renderItem: (item: string) => ReturnType<typeof DOMTemplate.html>;
      }

      function List(props: ListProps) {
        return (
          <ul>
            {props.items.map((item) => (
              <li>{props.renderItem(item)}</li>
            ))}
          </ul>
        );
      }

      const result = (
        <List
          items={['a', 'b', 'c']}
          renderItem={(item) => <strong>${item}</strong>}
        />
      );
      render(result, container);
      const items = container.querySelectorAll('li');
      assert.equal(items.length, 3);

      const _result2 = (
        <List
          items={['a', 'b', 'c']}
          // @ts-expect-error - renderItem should accept string, not number
          renderItem={(item: number) => <>{item}</>}
        />
      );
      void _result2; // Intentionally unused - compile-time type check only
    });
  });

  suite('Generic components', () => {
    test('component with generic props', () => {
      function GenericList<T>(props: {
        items: T[];
        renderItem: (item: T) => ReturnType<typeof DOMTemplate.html>;
      }) {
        return (
          <ul>
            {props.items.map((item) => (
              <li>{props.renderItem(item)}</li>
            ))}
          </ul>
        );
      }

      // TypeScript should infer T from items
      const result = (
        <GenericList
          items={[1, 2, 3]}
          renderItem={(item) => <>Number: {item * 2}</>}
        />
      );
      render(result, container);
      assert.include(container.textContent, 'Number: 6');
    });
  });

  suite('Component composition', () => {
    test('nested components type check', () => {
      function Button(props: {label: string; onClick: () => void}) {
        return <button on:click={props.onClick}>{props.label}</button>;
      }

      function Form(props: {onSubmit: () => void}) {
        return (
          <div>
            <Button label="Submit" onClick={props.onSubmit} />
          </div>
        );
      }

      let submitted = false;
      const result = <Form onSubmit={() => (submitted = true)} />;
      render(result, container);
      const button = container.querySelector('button');
      button?.click();
      assert.isTrue(submitted);

      const _result2 = (
        <Form onSubmit={() => {}}>
          {/* @ts-expect-error - wrong prop type for Button */}
          <Button label={123} onClick={() => {}} />
        </Form>
      );
      void _result2; // Intentionally unused - compile-time type check only
    });
  });
});
