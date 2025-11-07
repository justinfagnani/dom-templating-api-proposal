function conditionalWithText() {
  const name = "World";
  return <div>Hello {name ? <strong>{name}</strong> : "Guest"}!</div>;
}
