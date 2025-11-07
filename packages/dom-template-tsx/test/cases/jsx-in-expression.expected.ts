function jsxInExpression() {
    const show = true;
    return DOMTemplate.html `<div>${show ? DOMTemplate.html `<span>Yes</span>` : DOMTemplate.html `<span>No</span>`}</div>`;
}
