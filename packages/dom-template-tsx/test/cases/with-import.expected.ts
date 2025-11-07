import * as DOMTemplate from 'dom-templating-polyfill';
function withImport() {
    const name = "World";
    return DOMTemplate.html `<div>Hello ${name}</div>`;
}
