import { component } from 'dom-templating/directives';
import { MyComponent } from './my-component';
const t = DOMTemplate.html `${component(MyComponent)}`;
