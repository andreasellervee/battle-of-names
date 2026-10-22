/** Avoid replacing text nodes every animation frame; external UI edits still work. */
export function setTextIfChanged(element: { textContent: string | null }, text: string) {
  if (element.textContent !== text) element.textContent = text;
}
