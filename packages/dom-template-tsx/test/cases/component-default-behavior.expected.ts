import { MyComponent } from './my-component';
const t = DOMTemplate.html `${jsxComponent(MyComponent, {
    foo: 'bar'
})}`;
