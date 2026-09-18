/** Lower-case ASCII slug. Arabic-only titles fall back to the supplied `fallback`. */
export function slugify(text: string, fallback = 'item'): string {
  const slug = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || fallback;
}

/** Returns `base`, `base-2`, `base-3`... until `exists` says the slug is free. */
export async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  let candidate = base;
  for (let n = 2; await exists(candidate); n += 1) candidate = `${base}-${n}`;
  return candidate;
}
