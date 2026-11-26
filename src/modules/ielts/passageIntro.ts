/**
 * The paper's line under a reading passage heading, from the part's
 * questions: "You should spend about 20 minutes on Questions 1-13, which
 * are based on Reading Passage 1." Undefined when the part has no questions.
 */
export function passageIntro(section: {
  order: number
  groups: { from: number; to: number }[]
}): string | undefined {
  if (!section.groups.length) return undefined

  const from = Math.min(...section.groups.map(group => group.from))
  const to = Math.max(...section.groups.map(group => group.to))

  return `You should spend about 20 minutes on Questions ${from}-${to}, which are based on Reading Passage ${section.order}.`
}
