/**
 * TypeScript transformer for DOM templating
 */

export {createTransformer, transformSource} from './transform';

// Default export for use with ts-patch
import {createTransformer} from './transform';
export default createTransformer;
