/**
 * Turn a topic title into a URL-safe slug: lowercase, non-alphanumerics to
 * single dashes, trimmed, capped at 100 chars. Falls back to "topic" when the
 * input has no usable characters.
 */
export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
    .replace(/-+$/g, '')

  return slug || 'topic'
}
