// Shared JSX type definitions for browser tests

declare global {
  namespace JSX {
    // Helper types for extracting attribute/event names from prefixed keys
    type AttributeKey<K> = K extends `attr:${infer Name}` ? Name : never;
    type EventKey<K> = K extends `on:${infer Name}` ? Name : never;

    // Map event names to their handler types
    type EventHandlers = {
      [K in keyof HTMLElementEventMap as `on:${K}`]?: (event: HTMLElementEventMap[K]) => void;
    };

    // Specific typed attributes with known values
    type TypedAttributes = {
      // TODO: pull these from MDN or similar.

      'attr:dir'?: 'ltr' | 'rtl' | 'auto';
      'attr:variant'?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
      'attr:size'?: 'small' | 'medium' | 'large';
    };

    // Attributes are an open set, it's legal to set any attribute on any
    // element. Use a separate type for the catch-all to avoid conflicts.
    type ArbitraryAttributes = {
      [key: `attr:${string}`]: string | number | boolean;
    };

    type HTMLAttributes = TypedAttributes & ArbitraryAttributes;

    // Base element type supporting all three binding modes
    type ElementAttributes = HTMLAttributes & EventHandlers;

    type IntrinsicElements = {
      [K in keyof HTMLElementTagNameMap]: Partial<HTMLElementTagNameMap[K]> & ElementAttributes;
    };
  }
}

export {};
