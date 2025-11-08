import { component } from 'dom-templating/directives';
import { MyComponent } from './my-component';
const foo = 'bar';
const t = DOMTemplate.html `${component(MyComponent, {
    foo: foo,
    bar: "baz"
})}`;
