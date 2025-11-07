function eventBinding() {
    const handleClick = () => console.log('clicked');
    return DOMTemplate.html `<button @click=${handleClick}>Click me</button>`;
}
