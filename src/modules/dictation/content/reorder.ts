/**
 * Move `draggedId` to the position of `beforeId` within `ids`, returning the new
 * order. Returns the input unchanged when the move is a no-op or the target is
 * missing. Pure — drives drag-to-reorder for topics and sections.
 */
export function reorderIds(
  ids: string[],
  draggedId: string,
  beforeId: string
): string[] {
  if (draggedId === beforeId) return ids

  const without = ids.filter(id => id !== draggedId)
  const targetIndex = without.indexOf(beforeId)
  if (targetIndex === -1) return ids

  without.splice(targetIndex, 0, draggedId)
  return without
}
