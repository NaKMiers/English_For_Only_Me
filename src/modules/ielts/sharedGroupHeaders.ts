import type { IeltsQuestionGroup } from './schema'

type HeaderGroup = Pick<
  IeltsQuestionGroup,
  'from' | 'to' | 'type' | 'instruction'
>

/** The "Questions 25-30" header a group shows, or null when it shows none. */
export type GroupHeaderRange = { from: number; to: number } | null

const flat = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase()

const joins = (previous: HeaderGroup, group: HeaderGroup) =>
  group.type === 'multiple-choice' &&
  previous.type === 'multiple-choice' &&
  previous.to + 1 === group.from &&
  flat(previous.instruction) === flat(group.instruction)

/**
 * The paper prints one header over a run of one-question multiple choice
 * ("Questions 25-30 / Choose the correct letter, A, B or C."), but each of
 * those questions is stored as its own group. Neighbouring single-choice
 * groups with the same instruction share the first group's header, which
 * spans the whole run; the others show no header.
 */
export function sharedGroupHeaders(groups: HeaderGroup[]): GroupHeaderRange[] {
  const headers: GroupHeaderRange[] = []
  let lead = -1

  groups.forEach((group, index) => {
    const previous = groups[index - 1]

    if (previous && lead >= 0 && joins(previous, group)) {
      headers[lead] = { from: headers[lead]!.from, to: group.to }
      headers.push(null)
      return
    }

    lead = index
    headers.push({ from: group.from, to: group.to })
  })

  return headers
}
