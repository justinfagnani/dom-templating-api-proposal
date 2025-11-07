function expressionWithElements() {
    const name = "World";
    return DOMTemplate.html `<div>Hello <span>${name}</span>!</div>`;
}
