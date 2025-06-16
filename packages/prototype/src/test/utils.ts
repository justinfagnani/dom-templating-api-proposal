/**
 * Strips expression comments from provided html string.
 */
export const stripExpressionComments = (html: string) =>
  html.replace(/<!--\?node-part-->|<!--\??-->/g, '');

/**
 * Strips expression markers from provided html string.
 */
export const stripExpressionMarkers = (html: string) =>
  html.replace(/<!--\?node-part-->|<!--\??-->|node-part/g, '');

export const stripComments = (html: string) =>
  html.replaceAll(/<!--.*-->/g, '');
