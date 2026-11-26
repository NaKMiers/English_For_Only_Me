/**
 * A sample answer as the page shows it: an optional title, stored as a
 * first line "# Southwest Airport: Current Layout and Redevelopment Plan",
 * then the paragraphs, split on blank lines.
 */
export function splitSampleAnswer(text: string): {
  title: string
  paragraphs: string[]
} {
  const blocks = text
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .filter(Boolean)
  const heading = /^#\s+(.+)$/.exec(blocks[0] ?? '')

  return heading
    ? { title: heading[1]!.trim(), paragraphs: blocks.slice(1) }
    : { title: '', paragraphs: blocks }
}
