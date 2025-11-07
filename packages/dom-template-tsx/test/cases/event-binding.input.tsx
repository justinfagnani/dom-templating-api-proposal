function eventBinding() {
  const handleClick = () => console.log('clicked');
  return <button on:click={handleClick}>Click me</button>;
}
