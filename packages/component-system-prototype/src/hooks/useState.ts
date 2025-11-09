/**
 * useState hook implementation
 */

import {getCurrentInstance} from './context.js';

/**
 * A state setter function that accepts either a new value or an updater function.
 */
export type SetStateAction<T> = T | ((prevState: T) => T);

/**
 * Internal state hook structure.
 */
interface StateHook<T> {
  value: T;
}

/**
 * Hook that provides state management in function components.
 *
 * @param initialValue The initial state value
 * @returns A tuple of [currentState, setState]
 *
 * @example
 * ```tsx
 * function Counter() {
 *   const [count, setCount] = useState(0);
 *   return (
 *     <div>
 *       <p>Count: {count}</p>
 *       <button on:click={() => setCount(count + 1)}>Increment</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useState<T>(initialValue: T): [T, (action: SetStateAction<T>) => void] {
  // Get the current component instance
  const instance = getCurrentInstance();

  if (!instance) {
    throw new Error('useState can only be called inside a component function');
  }

  // Get the index for this hook
  const hookIndex = instance.nextHookIndex();

  // Get or create the hook state
  let hook = instance.getHook(hookIndex) as StateHook<T> | undefined;
  if (hook === undefined) {
    // First render - initialize the hook
    hook = {value: initialValue};
    instance.setHook(hookIndex, hook);
  }

  // Create the setState function
  const setState = (action: SetStateAction<T>) => {
    // Calculate the new value
    const newValue =
      typeof action === 'function' ? (action as (prevState: T) => T)(hook!.value) : action;

    // Only update if the value changed
    if (newValue !== hook!.value) {
      hook!.value = newValue;
      // Trigger re-render
      instance.scheduleUpdate();
    }
  };

  return [hook.value, setState];
}
