function mixedAttributes() {
    const value = "test";
    const id = "my-id";
    const handleClick = () => console.log('clicked');
    return DOMTemplate.html `<button .foo=${value} id=${id} @click=${handleClick}>Click</button>`;
}
