/** PostgreSQL text columns cannot hold NUL (\u0000) — such input can only be an attack or a bug. */
export function containsNul(value: unknown, depth = 0): boolean {
  if (typeof value === 'string') return value.includes('\u0000');
  if (depth > 12 || value === null || typeof value !== 'object') return false;
  const items = Array.isArray(value) ? value : Object.entries(value).flat();
  return items.some((item) => containsNul(item, depth + 1));
}
