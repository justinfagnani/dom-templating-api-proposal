/**
 * Hook context management for tracking the current component instance
 */

/**
 * Interface for component instances that support hooks
 */
export interface ComponentInstance {
  /**
   * Gets the hook at the specified index
   */
  getHook(index: number): unknown;

  /**
   * Sets the hook at the specified index
   */
  setHook(index: number, value: unknown): void;

  /**
   * Returns the next hook index and increments it
   */
  nextHookIndex(): number;

  /**
   * Schedules an update for this component
   */
  scheduleUpdate(): void;
}

/**
 * Current component instance (set during render)
 */
let currentInstance: ComponentInstance | null = null;

/**
 * Gets the current component instance
 */
export function getCurrentInstance(): ComponentInstance | null {
  return currentInstance;
}

/**
 * Sets the current component instance
 */
export function setCurrentInstance(instance: ComponentInstance | null): void {
  currentInstance = instance;
}
