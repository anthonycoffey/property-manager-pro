// Converts a pixel value to a rem value.
// Assumes a base font size of 16px for the HTML element.
export function pxToRem(value: number): string {
  return `${value / 16}rem`;
}
