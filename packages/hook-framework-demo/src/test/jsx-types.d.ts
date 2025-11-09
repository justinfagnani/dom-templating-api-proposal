// Shared JSX type definitions for browser tests

declare global {
  namespace JSX {
    // Helper types for extracting property/event names from prefixed keys
    type PropertyKey<K> = K extends `prop:${infer Name}` ? Name : never;
    type EventKey<K> = K extends `on:${infer Name}` ? Name : never;

    // Map event names to their handler types
    type EventHandlers = {
      [K in keyof HTMLElementEventMap as `on:${K}`]?: (event: HTMLElementEventMap[K]) => void;
    };

    // Property bindings with prop: prefix - map to actual element properties
    type PropertyBindings = {
      [key: `prop:${string}`]: any;
    };

    // Specific typed attributes with known values
    type TypedAttributes = {
      // TODO: pull these from MDN or similar.

      dir?: 'ltr' | 'rtl' | 'auto';
      variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
      size?: 'small' | 'medium' | 'large';
    };

    // Attributes are an open set, it's legal to set any attribute on any
    // element. Use a separate type for the catch-all to avoid conflicts.
    // While attributes themselves are strings, JSX expression values can be any type.
    type ArbitraryAttributes = {
      [key: string]: any;
    };

    type HTMLAttributes = TypedAttributes & ArbitraryAttributes;

    // Base element type supporting all three binding modes
    type ElementAttributes = HTMLAttributes & PropertyBindings & EventHandlers;

    // Since properties now require prop: prefix, we don't include element properties
    // in the unprefixed attribute set to avoid type conflicts
    type IntrinsicElements = {
      [K in keyof HTMLElementTagNameMap]: ElementAttributes;
    };
  }
}

export {};
