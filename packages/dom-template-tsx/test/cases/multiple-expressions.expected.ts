function multipleExpressions() {
    const greeting = "Hello";
    const name = "World";
    return DOMTemplate.html `<div>${greeting}${name}</div>`;
}
