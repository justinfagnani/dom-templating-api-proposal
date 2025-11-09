function mixedAttributes() {
  const value = "test";
  const id = "my-id";
  const handleClick = () => console.log('clicked');
  return <button prop:foo={value} id={id} on:click={handleClick}>Click</button>;
}
