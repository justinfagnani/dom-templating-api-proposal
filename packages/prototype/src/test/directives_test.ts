import {assert} from 'chai';
import {html, render} from '../index.js';
import {noChange, nothing} from '../lib/sentinels.js';
import type {TemplateResult} from '../lib/template-result.js';
import {Directive, makeDirective} from '../lib/directive.js';
import {TemplatePart} from '../lib/template-part.js';
import {ChildPart} from '../lib/child-part.js';

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

  suite('simple directives', () => {
    test('renders directives on ChildParts', () => {
      render(html`<div>${testDirective('A')}</div>`, container);
      assertContent('<div>TEST:A</div>');
    });

    test('renders directives on SingleAttributeParts', () => {
      render(html`<div foo=${testDirective('A')}></div>`, container);
      assertContent('<div foo="TEST:A"></div>');
    });

    test('renders directives on MultiAttributeParts', () => {
      render(
        html`<div foo="${testDirective('A')}:${testDirective('B')}"></div>`,
        container
      );
      assertContent('<div foo="TEST:A:TEST:B"></div>');
    });

    test('renders directives on SinglePropertyParts', () => {
      render(html`<div .id=${testDirective('A')}></div>`, container);
      assertContent('<div id="TEST:A"></div>');
    });

    test('renders directives on MultiPropertyParts', () => {
      render(
        html`<div .id="${testDirective('A')}:${testDirective('B')}"></div>`,
        container
      );
      assertContent('<div id="TEST:A:TEST:B"></div>');
    });
  });

  test('renders directives on SingleAttributeParts', () => {
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

  test('renders directives on MultiAttributeParts', () => {
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

  //   suite('ChildPart invariants for parentNode, startNode, endNode', () => {
  //     // Let's us get a reference to a directive instance
  //     let currentDirective: CheckNodePropertiesBehavior;

  //     class CheckNodePropertiesBehavior extends Directive {
  //       part?: ChildPart;

  //       render(_parentId?: string, _done?: (err?: unknown) => void) {
  //         return nothing;
  //       }

  //       override update(
  //         part: ChildPart,
  //         [parentId, done]: DirectiveParameters<this>
  //       ) {
  //         this.part = part;
  //         // eslint-disable-next-line
  //         currentDirective = this;
  //         try {
  //           const {parentNode, startNode, endNode} = part;

  //           if (endNode !== null) {
  //             assert.notEqual(startNode, null);
  //           }

  //           if (startNode === null) {
  //             // The part covers all children in `parentNode`.
  //             assert.equal(parentNode.childNodes.length, 0);
  //             assert.equal(endNode, null);
  //           } else if (endNode === null) {
  //             // The part covers all siblings following `startNode`.
  //             assert.equal(startNode.nextSibling, null);
  //           } else {
  //             // The part covers all siblings between `startNode` and `endNode`.
  //             assert.equal<Node | null>(startNode.nextSibling, endNode);
  //           }

  //           if (parentId !== undefined) {
  //             assert.equal((parentNode as HTMLElement).id, parentId);
  //           }
  //           done?.();
  //         } catch (e) {
  //           if (done === undefined) {
  //             throw e;
  //           } else {
  //             done(e);
  //           }
  //         }

  //         return nothing;
  //       }
  //     }
  //     const checkPart = directive(CheckNodePropertiesBehavior);

  //     test('when the directive is the only child', () => {
  //       const makeTemplate = (content: unknown) => html`<div>${content}</div>`;

  //       // Render twice so that `update` is called.
  //       render(makeTemplate(checkPart()), container);
  //       render(makeTemplate(checkPart()), container);
  //     });

  //     test('when the directive is the last child', () => {
  //       const makeTemplate = (content: unknown) =>
  //         html`<div>Earlier sibling. ${content}</div>`;

  //       // Render twice so that `update` is called.
  //       render(makeTemplate(checkPart()), container);
  //       render(makeTemplate(checkPart()), container);
  //     });

  //     test('when the directive is not the last child', () => {
  //       const makeTemplate = (content: unknown) =>
  //         html`<div>Earlier sibling. ${content} Later sibling.</div>`;

  //       // Render twice so that `update` is called.
  //       render(makeTemplate(checkPart()), container);
  //       render(makeTemplate(checkPart()), container);
  //     });

  //     test(`part's parentNode is the logical DOM parent`, async () => {
  //       let resolve: () => void;
  //       let reject: (e: unknown) => void;
  //       // This Promise settles when then until() directive calls the directive
  //       // in asyncCheckDiv.
  //       const asyncCheckDivRendered = new Promise<void>((res, rej) => {
  //         resolve = res;
  //         reject = rej;
  //       });
  //       const asyncCheckDiv = Promise.resolve(
  //         checkPart('div', (e?: unknown) =>
  //           e === undefined ? resolve() : reject(e)
  //         )
  //       );
  //       const makeTemplate = () =>
  //         html`
  //           ${checkPart('container')}
  //           <div id="div">
  //             ${checkPart('div')}
  //             ${html`x ${checkPart('div')} x`}
  //             ${html`x ${html`x ${checkPart('div')} x`} x`}
  //             ${html`x ${html`x ${[checkPart('div'), checkPart('div')]} x`} x`}
  //             ${html`x ${html`x ${[
  //               [checkPart('div'), checkPart('div')],
  //             ]} x`} x`}
  //             ${html`x ${html`x ${[
  //               [repeat([checkPart('div'), checkPart('div')], (v) => v)],
  //             ]} x`} x`}
  //             ${until(asyncCheckDiv)}
  //           </div>
  //         `;

  //       render(makeTemplate(), container);
  //       await asyncCheckDivRendered;
  //     });

  //     test(`when the parentNode is null`, async () => {
  //       const template = () => html`${checkPart('container')}`;

  //       // Render the template to instantiate the directive
  //       render(template(), container);

  //       // Manually clear the container to detach the directive
  //       container.innerHTML = '';

  //       // Check that we can access parentNode
  //       assert.equal(currentDirective.part!.parentNode, undefined);
  //     });

  //     test(`part's parentNode is correct when rendered into a document fragment`, async () => {
  //       const fragment = document.createDocumentFragment();
  //       (fragment as unknown as {id: string}).id = 'fragment';
  //       const makeTemplate = () => html`${checkPart('fragment')}`;

  //       // Render twice so that `update` is called.
  //       render(makeTemplate(), fragment);
  //       render(makeTemplate(), fragment);
  //     });
  //   });

  test('directives are stateful', () => {
    const go = (v: string) => {
      render(html`<div>${passthrough(count(v))}</div>`, container);
    };
    go('A');
    assertContent('<div>A:1</div>');
    go('A');
    assertContent('<div>A:2</div>');
    go('B');
    assertContent('<div>B:3</div>');
  });

  test('directives can update', () => {
    let receivedPart!: TemplatePart;
    let receivedValue: unknown;

    class TestUpdateDirective extends Directive {
      constructor(part: TemplatePart, index: number) {
        super(part, index);
        receivedPart = part;
      }

      override update(v: unknown) {
        receivedValue = v;
        return v;
      }
    }
    const update = makeDirective(TestUpdateDirective);
    const go = (v: boolean) => {
      render(html`<div>${update(v)}</div>`, container);
    };
    go(true);
    assertContent('<div>true</div>');
    assert.ok(receivedPart);
    assert.instanceOf(receivedPart, ChildPart);
    assert.equal(receivedValue, true);
  });

  //   test('renders directives on EventParts', () => {
  //     const handle = directive(
  //       class extends Directive {
  //         count = 0;
  //         render(value: string) {
  //           return (e: Event) => {
  //             (e.target as any).__clicked = `${value}:${++this.count}`;
  //           };
  //         }
  //       }
  //     );
  //     const template = (value: string) =>
  //       html`<div @click=${handle(value)}></div>`;
  //     render(template('A'), container);
  //     assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');
  //     (container.firstElementChild as HTMLDivElement).click();
  //     assert.strictEqual((container.firstElementChild as any).__clicked, 'A:1');
  //     (container.firstElementChild as HTMLDivElement).click();
  //     assert.strictEqual((container.firstElementChild as any).__clicked, 'A:2');
  //     render(template('B'), container);
  //     (container.firstElementChild as HTMLDivElement).click();
  //     assert.strictEqual((container.firstElementChild as any).__clicked, 'B:3');
  //     (container.firstElementChild as HTMLDivElement).click();
  //     assert.strictEqual((container.firstElementChild as any).__clicked, 'B:4');
  //   });

  //   test('event listeners can see events fired in attribute directives', () => {
  //     let event = undefined;
  //     const listener = (e: Event) => {
  //       event = e;
  //     };
  //     render(
  //       html`<div @test-event=${listener} b=${fireEvent()}></div>`,
  //       container
  //     );
  //     assert.isOk(event);
  //   });

  //   test('event listeners can see events fired in element directives', () => {
  //     let event = undefined;
  //     const listener = (e: Event) => {
  //       event = e;
  //     };
  //     render(
  //       html`<div @test-event=${listener} ${fireEvent()}></div>`,
  //       container
  //     );
  //     assert.isOk(event);
  //   });

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

  test('EventPart attributes must consist of one value and no extra text', () => {
    const listener = () => {};

    render(html`<div @click=${listener}></div>`, container);
    render(html`<div @click="${listener}"></div>`, container);

    assert.throws(() => {
      render(html`<div @click="EXTRA_TEXT${listener}"></div>`, container);
    });
    assert.throws(() => {
      render(html`<div @click="${listener}EXTRA_TEXT"></div>`, container);
    });
    assert.throws(() => {
      render(html`<div @click="${listener}${listener}"></div>`, container);
    });
    assert.throws(() => {
      render(
        html`<div @click="${listener}EXTRA_TEXT${listener}"></div>`,
        container
      );
    });
  });

  //     test('Expressions inside template throw in dev mode', () => {
  //       // top level
  //       assert.throws(() => {
  //         render(html`<template>${'test'}</template>`, container);
  //       });

  //       // inside template result
  //       assert.throws(() => {
  //         render(html`<div><template>${'test'}</template></div>`, container);
  //       });

  //       // child part deep inside
  //       assert.throws(() => {
  //         render(
  //           html`<template>
  //           <div><div><div><div>${'test'}</div></div></div></div>
  //           </template>`,
  //           container
  //         );
  //       });

  //       // attr part deep inside
  //       assert.throws(() => {
  //         render(
  //           html`<template>
  //           <div><div><div><div class="${'test'}"></div></div></div></div>
  //           </template>`,
  //           container
  //         );
  //       });

  //       // element part deep inside
  //       assert.throws(() => {
  //         render(
  //           html`<template>
  //           <div><div><div><div ${'test'}></div></div></div></div>
  //           </template>`,
  //           container
  //         );
  //       });

  //       // attr on element a-ok
  //       render(
  //         html`<template id=${'test'}>
  //         <div>Static content is ok</div>
  //           </template>`,
  //         container
  //       );
  //     });

  //     skipTestIfCompiled('Duplicate attributes throw', () => {
  //       assert.throws(() => {
  //         render(
  //           html`<input ?disabled=${true} ?disabled=${false} fooAttribute=${'potato'}>`,
  //           container
  //         );
  //       }, `Detected duplicate attribute bindings. This occurs if your template has duplicate attributes on an element tag. For example "<input ?disabled=\${true} ?disabled=\${false}>" contains a duplicate "disabled" attribute. The error was detected in the following template: \n\`<input ?disabled=\${...} ?disabled=\${...} fooAttribute=\${...}>\``);
  //     });

  //     test('Matching attribute bindings across elements should not throw', () => {
  //       assert.doesNotThrow(() => {
  //         render(
  //           html`<input ?disabled=${true}><input ?disabled=${false}>`,
  //           container
  //         );
  //       });
  //     });

  //     test('Expressions inside nested templates throw in dev mode', () => {
  //       // top level
  //       assert.throws(() => {
  //         render(
  //           html`<template><template>${'test'}</template></template>`,
  //           container
  //         );
  //       });

  //       // inside template result
  //       assert.throws(() => {
  //         render(
  //           html`<template><div><template>${'test'}</template></template></div>`,
  //           container
  //         );
  //       });

  //       // child part deep inside
  //       assert.throws(() => {
  //         render(
  //           html`<template><template>
  //           <div><div><div><div>${'test'}</div></div></div></div>
  //           </template></template>`,
  //           container
  //         );
  //       });

  //       // attr part deep inside
  //       assert.throws(() => {
  //         render(
  //           html`<template><template>
  //           <div><div><div><div class="${'test'}"></div></div></div></div>
  //           </template></template>`,
  //           container
  //         );
  //       });

  //       // attr part deep inside
  //       assert.throws(() => {
  //         render(
  //           html`<template><template>
  //           <div><div><div><div ${'test'}></div></div></div></div>
  //           </template></template>`,
  //           container
  //         );
  //       });

  //       // attr on element a-ok
  //       render(
  //         html`<template id=${'test'}><template>
  //         <div>Static content is ok</div>
  //           </template></template>`,
  //         container
  //       );
  //     });
  //   }

  //   test('directives have access to renderOptions', () => {
  //     const hostEl = document.createElement('input');
  //     hostEl.value = 'host';

  //     class HostDirective extends Directive {
  //       host?: HTMLInputElement;

  //       render(v: string) {
  //         return `${(this.host as HTMLInputElement)?.value}:${v}`;
  //       }

  //       override update(part: Part, props: [v: string]) {
  //         this.host ??= part.options!.host as HTMLInputElement;
  //         return this.render(...props);
  //       }
  //     }
  //     const hostDirective = directive(HostDirective);

  //     render(
  //       html`<div attr=${hostDirective('attr')}>${hostDirective('node')}</div>`,
  //       container,
  //       {host: hostEl}
  //     );
  //     assertContent('<div attr="host:attr">host:node</div>');
  //   });

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

/**
 * Strips expression comments from provided html string.
 */
export const stripExpressionComments = (html: string) =>
  html.replace(/<!--\?lit\$[0-9]+\$-->|<!--\??-->/g, '');

/**
 * Strips expression markers from provided html string.
 */
export const stripExpressionMarkers = (html: string) =>
  html.replace(/<!--\?lit\$[0-9]+\$-->|<!--\??-->|lit\$[0-9]+\$/g, '');

export const stripComments = (html: string) =>
  html.replaceAll(/<!--.*-->/g, '');
