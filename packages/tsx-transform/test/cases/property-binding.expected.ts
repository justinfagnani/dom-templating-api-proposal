function propertyBinding() {
    const value = "test";
    return DOMTemplate.html `<div .foo=${value}></div>`;
}
