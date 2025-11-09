/**
 * Component system prototype built on the DOM templating API.
 *
 * Provides a Preact-like component framework with hooks support.
 */

// Re-export from dom-templating-prototype for convenience
export {html, svg, render} from 'dom-templating-prototype';

// Export component system
export {component, useState} from './component.js';
