/*
 * Highlights are stored as character offsets into a scope's text, not as DOM
 * ranges: React may replace the text nodes (switching parts remounts the
 * passage), and offsets survive that while a Range would go stale.
 */

function textNodes(scope: Node) {
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []

  for (let node = walker.nextNode(); node; node = walker.nextNode())
    nodes.push(node as Text)

  return nodes
}

/** Character offset of a DOM boundary point within the scope's text. */
export function offsetWithin(scope: Node, node: Node, offset: number) {
  const range = document.createRange()

  range.selectNodeContents(scope)
  range.setEnd(node, offset)

  return range.toString().length
}

/** A DOM Range covering [start, end) of the scope's text, or null. */
export function rangeFromOffsets(scope: Node, start: number, end: number) {
  let position = 0
  let startPoint: [Text, number] | null = null

  for (const node of textNodes(scope)) {
    const next = position + node.data.length

    if (!startPoint && start < next) startPoint = [node, start - position]

    if (startPoint && end <= next) {
      const range = document.createRange()

      range.setStart(...startPoint)
      range.setEnd(node, end - position)

      return range
    }

    position = next
  }

  return null
}
