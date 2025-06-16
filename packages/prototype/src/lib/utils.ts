// https://tc39.github.io/ecma262/#sec-typeof-operator
export type Primitive =
  | null
  | undefined
  | boolean
  | number
  | string
  | symbol
  | bigint;

export const isPrimitive = (value: unknown): value is Primitive =>
  value === null || (typeof value != 'object' && typeof value != 'function');

export const isIterable = (value: unknown): value is Iterable<unknown> =>
  Array.isArray(value) ||
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  typeof (value as any)?.[Symbol.iterator] === 'function';

// Creates a dynamic marker. We never have to search for these in the DOM.
export const createMarker = () => document.createComment('?node-part');
