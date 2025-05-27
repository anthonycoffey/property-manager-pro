// Returns a CSS font-family string with common fallbacks.
export function setFont(fontFamily: string): string {
  return `${fontFamily}, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`;
}

// Specific function for Inter, if needed elsewhere, though setFont can be used directly
export function getInterFont(): string {
  return setFont("Inter");
}
