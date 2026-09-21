/** Splits a leader's message into paragraphs (they are separated by a blank line). */
export function messageParagraphs(text: string | undefined): string[] {
  return (text ?? '')
    .split(/\r?\n\s*\r?\n|\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
