import {assert} from 'chai';
import {html, render} from '../index.js';
import {Directive, makeDirective} from '../lib/directive.js';
import {noChange, nothing} from '../lib/sentinels.js';
import {TemplatePart} from '../lib/template-part.js';
import type {TemplateResult} from '../lib/template-result.js';
import {stripExpressionComments, stripExpressionMarkers} from './utils.js';
import type {ElementPart} from '../lib/element-part.js';
import type {SingleAttributePart} from '../lib/attribute-part.js';

suite('directives', () => {
  let container: HTMLDivElement;

  setup(() => {
    container = document.createElement('div');
    container.id = 'container';
  });

  const assertRender = (r: TemplateResult, expected: string) => {
    const part = render(r, container);
    assert.equal(stripExpressionComments(container.innerHTML), expected);
    return part;
  };

  const assertContent = (expected: string) => {
    assert.equal(stripExpressionComments(container.innerHTML), expected);
  };

  // A non-stateful directive that mutates the value it receives.
  class TestDirective extends Directive {
    update(v: string) {
      return `TEST:${v}`;
    }
  }
  const testDirective = makeDirective(TestDirective);

  // A stateful directive
  class CountDirective extends Directive {
    count = 0;
    update(id: string, log?: string[]) {
      const v = `${id}:${++this.count}`;
      log?.push(v);
      return v;
    }
  }
  const count = makeDirective(CountDirective);

  class PassthroughDirective extends Directive {
    update(v: unknown) {
      return v;
    }
  }
  const passthrough = makeDirective(PassthroughDirective);

  suite('initial directive rendering', () => {
    test('directives render on ChildParts', () => {
      render(html`<div>${testDirective('A')}</div>`, container);
      assertContent('<div>TEST:A</div>');
    });

    test('directives render on SingleAttributeParts', () => {
      render(html`<div foo=${testDirective('A')}></div>`, container);
      assertContent('<div foo="TEST:A"></div>');
    });

    test('directives render on MultiAttributeParts', () => {
      render(
        html`<div foo="${testDirective('A')}:${testDirective('B')}"></div>`,
        container
      );
      assertContent('<div foo="TEST:A:TEST:B"></div>');
    });

    test('directives render on SinglePropertyParts', () => {
      render(html`<div .id=${testDirective('A')}></div>`, container);
      assertContent('<div id="TEST:A"></div>');
    });

    test('directives render on MultiPropertyParts', () => {
      render(
        html`<div .id="${testDirective('A')}:${testDirective('B')}"></div>`,
        container
      );
      assertContent('<div id="TEST:A:TEST:B"></div>');
    });

    test('directives render on BooleanAttributeParts', () => {
      render(html`<div ?foo=${passthrough(true)}></div>`, container);
      assertContent('<div foo=""></div>');
      render(html`<div ?foo=${passthrough(false)}></div>`, container);
      assertContent('<div></div>');
    });

    test('directives render on EventParts', () => {
      let receivedEvent = false;
      render(
        html`<div @click=${passthrough(() => (receivedEvent = true))}></div>`,
        container
      );
      assertContent('<div></div>');
      const div = container.querySelector('div')!;
      div.click();
      assert.isOk(receivedEvent, 'Event handler was not called');
    });

    test('renders directives on ElementParts', () => {
      const log: string[] = [];
      assertRender(html`<div ${count('x', log)}></div>`, `<div></div>`);
      assert.deepEqual(log, ['x:1']);

      log.length = 0;
      assertRender(
        // Purposefully adds a self-closing tag slash
        html`<div a=${'a'} ${count('x', log)}/></div>`,
        `<div a="a"></div>`
      );
      assert.deepEqual(log, ['x:1']);

      log.length = 0;
      assertRender(
        // prettier-ignore
        html`<div ${count('x', log)} a=${'a'}>${'A'}</div>${'B'}`,
        `<div a="a">A</div>B`
      );
      assert.deepEqual(log, ['x:1']);

      log.length = 0;
      assertRender(
        html`<div a=${'a'} ${count('x', log)} b=${'b'}></div>`,
        `<div a="a" b="b"></div>`
      );
      assert.deepEqual(log, ['x:1']);

      log.length = 0;
      assertRender(
        html`<div ${count('x', log)} ${count('y', log)}></div>`,
        `<div></div>`
      );
      assert.deepEqual(log, ['x:1', 'y:1']);

      log.length = 0;
      const template = html`<div
        ${count('x', log)}
        a=${'a'}
        ${count('y', log)}
      ></div>`;
      assertRender(template, `<div a="a"></div>`);
      assert.deepEqual(log, ['x:1', 'y:1']);
      log.length = 0;
      assertRender(template, `<div a="a"></div>`);
      assert.deepEqual(log, ['x:2', 'y:2']);
    });

    test.skip('directives render on CommentParts', () => {
      render(html`<!-- ${testDirective('A')} -->`, container);
      console.log(container.innerHTML);
      assertContent('');
      const comment = container.childNodes.item(1) as Comment;
      assert.equal(comment.data, 'TEST:A');
    });
  });

  suite('directive updates', () => {
    test('directives update on ChildParts', () => {
      const go = () => html`<div>${count('A')}</div>`;
      render(go(), container);
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<div>A:1</div>'
      );
      render(go(), container);
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<div>A:2</div>'
      );
    });

    test('directives update on SingleAttributeParts', () => {
      const go = () => html`<div foo=${count('A')}></div>`;
      render(go(), container);
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<div foo="A:1"></div>'
      );
      render(go(), container);
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<div foo="A:2"></div>'
      );
    });

    test('directives update on MultiAttributeParts', () => {
      const go = () => html`<div foo="a:${count('A')}:b:${count('B')}"></div>`;
      render(go(), container);
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<div foo="a:A:1:b:B:1"></div>'
      );
      render(go(), container);
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<div foo="a:A:2:b:B:2"></div>'
      );
    });
  });

  suite('events', () => {
    class FireEventDirective extends Directive {
      override update() {
        (this.part as ElementPart | SingleAttributePart).element.dispatchEvent(
          new CustomEvent('test-event', {
            bubbles: true,
          })
        );
        return nothing;
      }
    }
    const fireEvent = makeDirective(FireEventDirective);

    test('renders directives on EventParts', () => {
      const handle = makeDirective(
        class extends Directive {
          count = 0;
          update(value: string) {
            return (e: Event) => {
              (e.target as any).__clicked = `${value}:${++this.count}`;
            };
          }
        }
      );
      const template = (value: string) =>
        html`<div @click=${handle(value)}></div>`;
      render(template('A'), container);
      assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');
      (container.firstElementChild as HTMLDivElement).click();
      assert.strictEqual((container.firstElementChild as any).__clicked, 'A:1');
      (container.firstElementChild as HTMLDivElement).click();
      assert.strictEqual((container.firstElementChild as any).__clicked, 'A:2');
      render(template('B'), container);
      (container.firstElementChild as HTMLDivElement).click();
      assert.strictEqual((container.firstElementChild as any).__clicked, 'B:3');
      (container.firstElementChild as HTMLDivElement).click();
      assert.strictEqual((container.firstElementChild as any).__clicked, 'B:4');
    });

    test('event listeners can see events fired in attribute directives', () => {
      let event = undefined;
      const listener = (e: Event) => {
        event = e;
      };
      render(
        html`<div @test-event=${listener} b=${fireEvent()}></div>`,
        container
      );
      assert.isOk(event);
    });

    test('event listeners can see events fired in element directives', () => {
      let event = undefined;
      const listener = (e: Event) => {
        event = e;
      };
      render(
        html`<div @test-event=${listener} ${fireEvent()}></div>`,
        container
      );
      assert.isOk(event);
    });
  });

  suite('nested directives', () => {
    const aNothingDirective = makeDirective(
      class extends Directive {
        update(bool: boolean, v: unknown) {
          return bool ? v : nothing;
        }
      }
    );

    let bDirectiveCount = 0;
    const bDirective = makeDirective(
      class extends Directive {
        count = 0;
        constructor(part: TemplatePart, index: number) {
          super(part, index);
          bDirectiveCount++;
        }
        update(v: unknown) {
          return `[B:${this.count++}:${v}]`;
        }
      }
    );

    test('nested directives in ChildPart', () => {
      bDirectiveCount = 0;
      const template = (bool: boolean, v: unknown) =>
        html`<div>${aNothingDirective(bool, bDirective(v))}</div>`;
      assertRender(template(true, 'X'), `<div>[B:0:X]</div>`);
      assertRender(template(true, 'Y'), `<div>[B:1:Y]</div>`);
      assertRender(template(false, 'X'), `<div></div>`);
      assertRender(template(true, 'X'), `<div>[B:0:X]</div>`);
      assert.equal(bDirectiveCount, 2);
    });

    test('nested directives in AttributePart', () => {
      bDirectiveCount = 0;
      const template = (bool: boolean, v: unknown) =>
        html`<div a=${aNothingDirective(bool, bDirective(v))}></div>`;
      assertRender(template(true, 'X'), `<div a="[B:0:X]"></div>`);
      assertRender(template(true, 'Y'), `<div a="[B:1:Y]"></div>`);
      assertRender(template(false, 'X'), `<div></div>`);
      assertRender(template(true, 'X'), `<div a="[B:0:X]"></div>`);
      assert.equal(bDirectiveCount, 2);
    });

    suite('nested directives whose parent returns `noChange`', () => {
      const aNoChangeDirective = makeDirective(
        class extends Directive {
          update(bool: boolean, v: unknown) {
            return bool ? v : noChange;
          }
        }
      );

      test('nested directives in ChildPart', () => {
        bDirectiveCount = 0;
        const template = (bool: boolean, v: unknown) =>
          html`<div>${aNoChangeDirective(bool, bDirective(v))}</div>`;
        assertRender(template(true, 'X'), `<div>[B:0:X]</div>`);
        assertRender(template(true, 'Y'), `<div>[B:1:Y]</div>`);
        assertRender(template(false, 'X'), `<div>[B:1:Y]</div>`);
        assertRender(template(true, 'X'), `<div>[B:2:X]</div>`);
        assertRender(template(false, 'Y'), `<div>[B:2:X]</div>`);
        assert.equal(bDirectiveCount, 1);
      });

      test('nested directives in AttributePart', () => {
        bDirectiveCount = 0;
        const template = (bool: boolean, v: unknown) =>
          html`<div a=${aNoChangeDirective(bool, bDirective(v))}></div>`;
        assertRender(template(true, 'X'), `<div a="[B:0:X]"></div>`);
        assertRender(template(true, 'Y'), `<div a="[B:1:Y]"></div>`);
        assertRender(template(false, 'X'), `<div a="[B:1:Y]"></div>`);
        assertRender(template(true, 'X'), `<div a="[B:2:X]"></div>`);
        assertRender(template(false, 'Y'), `<div a="[B:2:X]"></div>`);
        assert.equal(bDirectiveCount, 1);
      });
    });
  });

  suite('async directives', () => {
    class ADirective extends Directive {
      value: unknown;
      promise!: Promise<unknown>;

      override update(promise: Promise<unknown>) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        // aDirectiveInst = this;
        if (promise !== this.promise) {
          this.promise = promise;
          promise.then((value) => {
            this.setValue((this.value = value));
          });
        }
        return this.value ?? 'initial';
      }
    }
    const aDirective = makeDirective(ADirective);
    // let aDirectiveInst!: ADirective;

    // const bDirective = makeDirective(
    //   class extends Directive {
    //     count = 0;
    //     update(v: unknown) {
    //       return `[B:${this.count++}:${v}]`;
    //     }
    //   }
    // );

    const syncAsyncDirective = makeDirective(
      class extends Directive {
        update(x: string) {
          this.part.setValue(x);
          return noChange;
        }
      }
    );

    test('directives on child parts can call setValue', () => {
      assertRender(
        html`<div>${syncAsyncDirective('test')}</div>`,
        '<div>test</div>'
      );
    });

    test('directives on single-attribute parts can call setValue', () => {
      assertRender(
        html`<div foo=${syncAsyncDirective('test')}></div>`,
        '<div foo="test"></div>'
      );
    });

    test('directives on multi-attribute parts can call setValue', () => {
      assertRender(
        html`<div foo="${syncAsyncDirective('test')}-foo"></div>`,
        '<div foo="test-foo"></div>'
      );
    });

    test('async directives in ChildPart', async () => {
      const template = (promise: Promise<unknown>) =>
        html`<div>${aDirective(promise)}</div>`;
      let promise = Promise.resolve('resolved1');

      assertRender(template(promise), `<div>initial</div>`);
      await promise;

      assertContent(`<div>resolved1</div>`);
      promise = Promise.resolve('resolved2');

      assertRender(template(promise), `<div>resolved1</div>`);
      await promise;

      assertContent(`<div>resolved2</div>`);
    });

    // test('async directives change to disconnected in ChildPart', async () => {
    //   const template = (promise: Promise<unknown>) =>
    //     html`<div>${aDirective(promise)}</div>`;
    //   const promise = Promise.resolve('resolved1');
    //   const part = assertRender(template(promise), `<div>initial</div>`);
    //   assert.isTrue(aDirectiveInst.isConnected);
    //   part.setConnected(false);
    //   assertContent(`<div>initial</div>`);
    //   await promise;
    //   assert.isFalse(aDirectiveInst.isConnected);
    //   assertContent(`<div>resolved1</div>`);
    //   part.setConnected(true);
    //   assert.isTrue(aDirectiveInst.isConnected);
    //   assertContent(`<div>resolved1</div>`);
    // });

    // test('async directives render while disconnected in ChildPart', async () => {
    //   const template = (v: unknown) => html`<div>${v}</div>`;
    //   const promise = Promise.resolve('resolved1');
    //   const part = assertRender(template('initial'), `<div>initial</div>`);
    //   part.setConnected(false);
    //   assertRender(template(aDirective(promise)), `<div>initial</div>`);
    //   assert.isFalse(aDirectiveInst.isConnected);
    //   await promise;
    //   assertContent(`<div>resolved1</div>`);
    //   assert.isFalse(aDirectiveInst.isConnected);
    //   part.setConnected(true);
    //   assert.isTrue(aDirectiveInst.isConnected);
    //   assertRender(template(aDirective(promise)), `<div>resolved1</div>`);
    // });

    // test('async directives while disconnected in ChildPart clears its value', async () => {
    //   const log: string[] = [];
    //   const template = (promise: Promise<unknown>) =>
    //     html`<div>${aDirective(promise)}</div>`;
    //   // Async render a TemplateResult containing a AsyncDirective
    //   let promise: Promise<unknown> = Promise.resolve(
    //     html`${disconnectingDirective(log, 'dd', 'dd')}`
    //   );
    //   const part = assertRender(template(promise), `<div>initial</div>`);
    //   await promise;
    //   assertContent(`<div>dd</div>`);
    //   // Eneuque an async clear of the TemplateResult+AsyncDirective
    //   promise = Promise.resolve(nothing);
    //   assertRender(template(promise), `<div>dd</div>`);
    //   assert.deepEqual(log, []);
    //   // Disconnect the tree before the clear is committed
    //   part.setConnected(false);
    //   assert.isFalse(aDirectiveInst.isConnected);
    //   assert.deepEqual(log, ['disconnected-dd']);
    //   await promise;
    //   assert.deepEqual(log, ['disconnected-dd']);
    //   assertContent(`<div></div>`);
    //   // Re-connect the tree, which should clear the part but not reconnect
    //   // the AsyncDirective that was cleared
    //   part.setConnected(true);
    //   assert.isTrue(aDirectiveInst.isConnected);
    //   assertRender(template(promise), `<div></div>`);
    //   assert.deepEqual(log, ['disconnected-dd']);
    // });

    // test('async nested directives in ChildPart', async () => {
    //   const template = (promise: Promise<unknown>) =>
    //     html`<div>${aDirective(promise)}</div>`;
    //   let promise = Promise.resolve(bDirective('X'));
    //   assertRender(template(promise), `<div>initial</div>`);
    //   await promise;
    //   assertContent(`<div>[B:0:X]</div>`);
    //   assertRender(template(promise), `<div>[B:1:X]</div>`);
    //   promise = Promise.resolve(bDirective('Y'));
    //   assertRender(template(promise), `<div>[B:2:X]</div>`);
    //   await promise;
    //   assertContent(`<div>[B:3:Y]</div>`);
    // });

    // test('async directives in AttributePart', async () => {
    //   const template = (promise: Promise<unknown>) =>
    //     html`<div a="${'**'}${aDirective(promise)}${'##'}"></div>`;
    //   let promise = Promise.resolve('resolved1');
    //   assertRender(template(promise), `<div a="**initial##"></div>`);
    //   await promise;
    //   assertContent(`<div a="**resolved1##"></div>`);
    //   promise = Promise.resolve('resolved2');
    //   assertRender(template(promise), `<div a="**resolved1##"></div>`);
    //   await promise;
    //   assertContent(`<div a="**resolved2##"></div>`);
    // });

    // test('async directives while disconnected in AttributePart', async () => {
    //   const template = (promise: Promise<unknown>) =>
    //     html`<div a="${'**'}${aDirective(promise)}${'##'}"></div>`;
    //   const promise = Promise.resolve('resolved1');
    //   const part = assertRender(
    //     template(promise),
    //     `<div a="**initial##"></div>`
    //   );
    //   part.setConnected(false);
    //   assert.isFalse(aDirectiveInst.isConnected);
    //   await promise;
    //   assertContent(`<div a="**resolved1##"></div>`);
    //   part.setConnected(true);
    //   assert.isTrue(aDirectiveInst.isConnected);
    //   assertContent(`<div a="**resolved1##"></div>`);
    // });

    // test('async nested directives in AttributePart', async () => {
    //   const template = (promise: Promise<unknown>) =>
    //     html`<div a="${'**'}${aDirective(promise)}${'##'}"></div>`;
    //   let promise = Promise.resolve(bDirective('X'));
    //   assertRender(template(promise), `<div a="**initial##"></div>`);
    //   await promise;
    //   assertContent(`<div a="**[B:0:X]##"></div>`);
    //   promise = Promise.resolve(bDirective('Y'));
    //   assertRender(template(promise), `<div a="**[B:1:X]##"></div>`);
    //   await promise;
    //   assertContent(`<div a="**[B:2:Y]##"></div>`);
    // });

    // const disconnectingDirective = directive(
    //   class extends AsyncDirective {
    //     log!: Array<string>;
    //     id!: string;

    //     render(log: Array<string>, id = '', value?: unknown, bool = true) {
    //       this.log = log;
    //       this.id = id;
    //       return bool ? value : nothing;
    //     }

    //     override disconnected() {
    //       this.log.push('disconnected' + (this.id ? `-${this.id}` : ''));
    //     }
    //     override reconnected() {
    //       this.log.push('reconnected' + (this.id ? `-${this.id}` : ''));
    //     }
    //   }
    // );

    // const passthroughDirective = directive(
    //   class extends Directive {
    //     render(value: unknown, bool = true) {
    //       return bool ? value : nothing;
    //     }
    //   }
    // );

    // test('directives can be disconnected from ChildParts', () => {
    //   const log: Array<string> = [];
    //   const go = (x: boolean) =>
    //     render(html`${x ? disconnectingDirective(log) : nothing}`, container);
    //   go(true);
    //   assert.isEmpty(log);
    //   go(false);
    //   assert.deepEqual(log, ['disconnected']);
    // });

    // test('directives are disconnected when their template is', () => {
    //   const log: Array<string> = [];
    //   const go = (x: boolean) =>
    //     render(x ? html`${disconnectingDirective(log)}` : nothing, container);
    //   go(true);
    //   assert.isEmpty(log);
    //   go(false);
    //   assert.deepEqual(log, ['disconnected']);
    // });

    // test('directives are disconnected when their nested template is', () => {
    //   const log: Array<string> = [];
    //   const go = (x: boolean) =>
    //     render(
    //       x ? html`${html`${disconnectingDirective(log)}`}` : nothing,
    //       container
    //     );
    //   go(true);
    //   assert.isEmpty(log);
    //   go(false);
    //   assert.deepEqual(log, ['disconnected']);
    // });

    // test('directives in different subtrees can be disconnected in separate renders', () => {
    //   const log: Array<string> = [];
    //   const go = (left: boolean, right: boolean) =>
    //     render(
    //       html`
    //         ${html`${html`${
    //           left ? disconnectingDirective(log, 'left') : nothing
    //         }`}`}
    //         ${html`${html`${
    //           right ? disconnectingDirective(log, 'right') : nothing
    //         }`}`}
    //       `,
    //       container
    //     );
    //   go(true, true);
    //   assert.isEmpty(log);
    //   go(true, false);
    //   assert.deepEqual(log, ['disconnected-right']);
    //   log.length = 0;
    //   go(false, false);
    //   assert.deepEqual(log, ['disconnected-left']);
    //   log.length = 0;
    //   go(true, true);
    //   assert.isEmpty(log);
    //   go(false, true);
    //   assert.deepEqual(log, ['disconnected-left']);
    //   log.length = 0;
    //   go(false, false);
    //   assert.deepEqual(log, ['disconnected-right']);
    // });

    // test('directives returned from other directives can be disconnected', () => {
    //   const log: Array<string> = [];
    //   const go = (clearAll: boolean, left: boolean, right: boolean) =>
    //     render(
    //       clearAll
    //         ? nothing
    //         : html`
    //         ${html`${html`${passthroughDirective(
    //           disconnectingDirective(log, 'left'),
    //           left
    //         )}`}`}
    //         ${html`${html`${passthroughDirective(
    //           disconnectingDirective(log, 'right'),
    //           right
    //         )}`}`}
    //       `,
    //       container
    //     );
    //   go(false, true, true);
    //   assert.isEmpty(log);
    //   go(true, true, true);
    //   assert.deepEqual(log, ['disconnected-left', 'disconnected-right']);
    //   log.length = 0;
    //   go(false, true, true);
    //   assert.isEmpty(log);
    //   go(false, true, false);
    //   assert.deepEqual(log, ['disconnected-right']);
    //   log.length = 0;
    //   go(false, false, false);
    //   assert.deepEqual(log, ['disconnected-left']);
    //   log.length = 0;
    //   go(false, true, true);
    //   assert.isEmpty(log);
    //   go(false, false, true);
    //   assert.deepEqual(log, ['disconnected-left']);
    //   log.length = 0;
    //   go(false, false, false);
    //   assert.deepEqual(log, ['disconnected-right']);
    // });

    // test('directives returned from other AsyncDirectives can be disconnected', () => {
    //   const log: Array<string> = [];
    //   const go = (
    //     clearAll: boolean,
    //     leftOuter: boolean,
    //     leftInner: boolean,
    //     rightOuter: boolean,
    //     rightInner: boolean
    //   ) =>
    //     render(
    //       clearAll
    //         ? nothing
    //         : html`
    //         ${html`${html`${
    //           leftOuter
    //             ? disconnectingDirective(
    //                 log,
    //                 'left-outer',
    //                 disconnectingDirective(log, 'left-inner'),
    //                 leftInner
    //               )
    //             : nothing
    //         }`}`}
    //         ${html`${html`${
    //           rightOuter
    //             ? disconnectingDirective(
    //                 log,
    //                 'right-outer',
    //                 disconnectingDirective(log, 'right-inner'),
    //                 rightInner
    //               )
    //             : nothing
    //         }`}`}
    //       `,
    //       container
    //     );
    //   go(false, true, true, true, true);
    //   assert.isEmpty(log);
    //   go(true, true, true, true, true);
    //   assert.deepEqual(log, [
    //     'disconnected-left-outer',
    //     'disconnected-left-inner',
    //     'disconnected-right-outer',
    //     'disconnected-right-inner',
    //   ]);
    //   log.length = 0;
    //   go(false, true, true, true, true);
    //   assert.isEmpty(log);
    //   go(false, false, true, true, true);
    //   assert.deepEqual(log, [
    //     'disconnected-left-outer',
    //     'disconnected-left-inner',
    //   ]);
    //   log.length = 0;
    //   go(false, true, true, true, true);
    //   assert.isEmpty(log);
    //   go(false, true, true, false, true);
    //   assert.deepEqual(log, [
    //     'disconnected-right-outer',
    //     'disconnected-right-inner',
    //   ]);
    //   log.length = 0;
    //   go(false, true, true, true, true);
    //   assert.isEmpty(log);
    //   go(false, true, false, true, true);
    //   assert.deepEqual(log, ['disconnected-left-inner']);
    //   log.length = 0;
    //   go(false, true, false, true, false);
    //   assert.deepEqual(log, ['disconnected-right-inner']);
    // });

    // test('directives can be disconnected from AttributeParts', () => {
    //   const log: Array<string> = [];
    //   const go = (x: boolean) =>
    //     render(
    //       x ? html`<div foo=${disconnectingDirective(log)}></div>` : nothing,
    //       container
    //     );
    //   go(true);
    //   assert.isEmpty(log);
    //   go(false);
    //   assert.deepEqual(log, ['disconnected']);
    // });

    // test('deeply nested directives can be disconnected from AttributeParts', () => {
    //   const log: Array<string> = [];
    //   const go = (x: boolean) =>
    //     render(
    //       x
    //         ? html`${html`<div foo=${disconnectingDirective(log)}></div>`}`
    //         : nothing,
    //       container
    //     );
    //   go(true);
    //   assert.isEmpty(log);
    //   go(false);
    //   assert.deepEqual(log, ['disconnected']);
    // });

    // test('directives can be disconnected from iterables', () => {
    //   const log: Array<string> = [];
    //   const go = (items: string[] | undefined) =>
    //     render(
    //       items
    //         ? items.map(
    //             (item) =>
    //               html`<div foo=${disconnectingDirective(log, item)}></div>`
    //           )
    //         : nothing,
    //       container
    //     );
    //   go(['0', '1', '2', '3']);
    //   assert.isEmpty(log);
    //   go(['0', '2']);
    //   assert.deepEqual(log, ['disconnected-2', 'disconnected-3']);
    //   log.length = 0;
    //   go(undefined);
    //   assert.deepEqual(log, ['disconnected-0', 'disconnected-2']);
    // });

    // test('directives can be disconnected from repeat', () => {
    //   const log: Array<string> = [];
    //   const go = (items: string[] | undefined) =>
    //     render(
    //       items
    //         ? repeat(
    //             items,
    //             (item) => item,
    //             (item) =>
    //               html`<div foo=${disconnectingDirective(log, item)}></div>`
    //           )
    //         : nothing,
    //       container
    //     );
    //   go(['0', '1', '2', '3']);
    //   assert.isEmpty(log);
    //   go(['0', '2']);
    //   assert.deepEqual(log, ['disconnected-1', 'disconnected-3']);
    //   log.length = 0;
    //   go(undefined);
    //   assert.deepEqual(log, ['disconnected-0', 'disconnected-2']);
    // });

    // test('directives in ChildParts can be reconnected', () => {
    //   const log: Array<string> = [];
    //   const go = (left: boolean, right: boolean) => {
    //     return render(
    //       html`
    //         ${html`${html`${
    //           left ? disconnectingDirective(log, 'left') : nothing
    //         }`}`}
    //         ${html`${html`${
    //           right ? disconnectingDirective(log, 'right') : nothing
    //         }`}`}
    //       `,
    //       container
    //     );
    //   };
    //   const part = go(true, true);
    //   assert.isEmpty(log);
    //   part.setConnected(false);
    //   assert.deepEqual(log, ['disconnected-left', 'disconnected-right']);
    //   log.length = 0;
    //   part.setConnected(true);
    //   assert.deepEqual(log, ['reconnected-left', 'reconnected-right']);
    //   log.length = 0;
    //   go(true, false);
    //   assert.deepEqual(log, ['disconnected-right']);
    //   log.length = 0;
    //   part.setConnected(false);
    //   assert.deepEqual(log, ['disconnected-left']);
    //   log.length = 0;
    //   part.setConnected(true);
    //   assert.deepEqual(log, ['reconnected-left']);
    // });

    // test('directives in AttributeParts can be reconnected', () => {
    //   const log: Array<string> = [];
    //   const go = (left: boolean, right: boolean) => {
    //     return render(
    //       html`
    //         ${html`${html`<div a=${
    //           left ? disconnectingDirective(log, 'left') : nothing
    //         }></div>`}`}
    //         ${html`${html`<div a=${
    //           right ? disconnectingDirective(log, 'right') : nothing
    //         }></div>`}`}
    //       `,
    //       container
    //     );
    //   };
    //   const part = go(true, true);
    //   assert.isEmpty(log);
    //   part.setConnected(false);
    //   assert.deepEqual(log, ['disconnected-left', 'disconnected-right']);
    //   log.length = 0;
    //   part.setConnected(true);
    //   assert.deepEqual(log, ['reconnected-left', 'reconnected-right']);
    //   log.length = 0;
    //   go(true, false);
    //   assert.deepEqual(log, ['disconnected-right']);
    //   log.length = 0;
    //   part.setConnected(false);
    //   assert.deepEqual(log, ['disconnected-left']);
    //   log.length = 0;
    //   part.setConnected(true);
    //   assert.deepEqual(log, ['reconnected-left']);
    // });

    // test('directives in iterables can be reconnected', () => {
    //   const log: Array<string> = [];
    //   const go = (left: unknown[], right: unknown[]) => {
    //     return render(
    //       html`
    //         ${html`${html`${left.map(
    //           (i) =>
    //             html`<div>${disconnectingDirective(log, `left-${i}`)}</div>`
    //         )}`}`}
    //         ${html`${html`${right.map(
    //           (i) =>
    //             html`<div>${disconnectingDirective(log, `right-${i}`)}</div>`
    //         )}`}`}
    //       `,
    //       container
    //     );
    //   };
    //   const part = go([0, 1], [0, 1]);
    //   assert.isEmpty(log);
    //   part.setConnected(false);
    //   assert.deepEqual(log, [
    //     'disconnected-left-0',
    //     'disconnected-left-1',
    //     'disconnected-right-0',
    //     'disconnected-right-1',
    //   ]);
    //   log.length = 0;
    //   part.setConnected(true);
    //   assert.deepEqual(log, [
    //     'reconnected-left-0',
    //     'reconnected-left-1',
    //     'reconnected-right-0',
    //     'reconnected-right-1',
    //   ]);
    //   log.length = 0;
    //   go([0], []);
    //   assert.deepEqual(log, [
    //     'disconnected-left-1',
    //     'disconnected-right-0',
    //     'disconnected-right-1',
    //   ]);
    //   log.length = 0;
    //   part.setConnected(false);
    //   assert.deepEqual(log, ['disconnected-left-0']);
    //   log.length = 0;
    //   part.setConnected(true);
    //   assert.deepEqual(log, ['reconnected-left-0']);
    // });

    // test('directives in repeat can be reconnected', () => {
    //   const log: Array<string> = [];
    //   const go = (left: unknown[], right: unknown[]) => {
    //     return render(
    //       html`
    //         ${html`${html`${repeat(
    //           left,
    //           (i) =>
    //             html`<div>${disconnectingDirective(log, `left-${i}`)}</div>`
    //         )}`}`}
    //         ${html`${html`${repeat(
    //           right,
    //           (i) =>
    //             html`<div>${disconnectingDirective(log, `right-${i}`)}</div>`
    //         )}`}`}
    //       `,
    //       container
    //     );
    //   };
    //   const part = go([0, 1], [0, 1]);
    //   assert.isEmpty(log);
    //   part.setConnected(false);
    //   assert.deepEqual(log, [
    //     'disconnected-left-0',
    //     'disconnected-left-1',
    //     'disconnected-right-0',
    //     'disconnected-right-1',
    //   ]);
    //   log.length = 0;
    //   part.setConnected(true);
    //   assert.deepEqual(log, [
    //     'reconnected-left-0',
    //     'reconnected-left-1',
    //     'reconnected-right-0',
    //     'reconnected-right-1',
    //   ]);
    //   log.length = 0;
    //   go([0], []);
    //   assert.deepEqual(log, [
    //     'disconnected-left-1',
    //     'disconnected-right-0',
    //     'disconnected-right-1',
    //   ]);
    //   log.length = 0;
    //   part.setConnected(false);
    //   assert.deepEqual(log, ['disconnected-left-0']);
    //   log.length = 0;
    //   part.setConnected(true);
    //   assert.deepEqual(log, ['reconnected-left-0']);
    // });
  });
});
