function WithWhitespace(props: {name: string; age: number}) {
  return (
    <div>
      <span>{props.name}</span>, {props.age} years old
    </div>
  );
}
