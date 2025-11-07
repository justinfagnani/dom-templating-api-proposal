function mapExpression() {
    const items = ['a', 'b', 'c'];
    return DOMTemplate.html `<ul>${items.map(item => DOMTemplate.html `<li>${item}</li>`)}</ul>`;
}
