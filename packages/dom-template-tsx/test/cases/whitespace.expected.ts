function WithWhitespace(props: {
    name: string;
    age: number;
}) {
    return (DOMTemplate.html `<div><span>${props.name}</span>, ${props.age} years old</div>`);
}
