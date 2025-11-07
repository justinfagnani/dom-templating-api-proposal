function conditionalWithText() {
    const name = "World";
    return DOMTemplate.html `<div>Hello ${name ? DOMTemplate.html `<strong>${name}</strong>` : "Guest"}!</div>`;
}
