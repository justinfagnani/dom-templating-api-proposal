function mapExpression() {
  const items = ['a', 'b', 'c'];
  return <ul>{items.map(item => <li>{item}</li>)}</ul>;
}
