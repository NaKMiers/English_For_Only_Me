import type { IeltsQuestionGroup, IeltsSection } from '../schema'
import type { IeltsDrillItem } from './attemptRecords'

/*
 * A drill borrows question groups from several tests. Each item becomes its
 * own one-group section (keeping the original material so evidence block
 * indexes still point at the right paragraph or line), renumbered 1..N in
 * drill order so answers and keys never collide across tests.
 */

function renumberText(value: string, map: Map<number, number>) {
  return value.replace(/\{\{\s*q(\d{1,2})\s*\}\}/g, (match, raw) => {
    const next = map.get(Number(raw))

    return next ? `{{q${next}}}` : match
  })
}

export function renumberGroup(
  group: IeltsQuestionGroup,
  numberMap: { drillNo: number; originalNo: number }[]
): IeltsQuestionGroup {
  const map = new Map(numberMap.map(row => [row.originalNo, row.drillNo]))
  const numbers = group.questions.map(
    question => map.get(question.number) ?? question.number
  )

  return {
    ...group,
    from: Math.min(...numbers),
    to: Math.max(...numbers),
    body: renumberText(group.body, map),
    questions: group.questions.map((question, index) => ({
      ...question,
      number: numbers[index],
      prompt: renumberText(question.prompt, map),
    })),
  }
}

export function buildDrillSections(
  items: IeltsDrillItem[],
  sectionFor: (item: IeltsDrillItem) => IeltsSection | null
): IeltsSection[] {
  const sections: IeltsSection[] = []

  items.forEach((item, index) => {
    const section = sectionFor(item)
    const group = section?.groups.find(entry => entry.id === item.groupId)

    if (!section || !group) return

    sections.push({
      ...section,
      order: index + 1,
      groups: [renumberGroup(group, item.numberMap)],
    })
  })

  return sections
}

/** Renumbering plan for a list of groups: 1..N in the given order. */
export function planDrillNumbers(
  groups: IeltsQuestionGroup[]
): { drillNo: number; originalNo: number }[][] {
  let next = 1

  return groups.map(group =>
    group.questions.map(question => ({
      drillNo: next++,
      originalNo: question.number,
    }))
  )
}
