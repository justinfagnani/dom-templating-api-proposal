import { component } from 'dom-templating-prototype/directives';
import { MyComponent } from './my-component';
const t = DOMTemplate.html `${component(MyComponent, undefined, DOMTemplate.html `<h1>hello</h1>`)}`;
