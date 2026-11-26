import type { IeltsReadingMaterial } from './schema'

// A standfirst is one short line with no full stop, as the paper prints it
// under the title: "The Romans ... to build tunnels in their territories".
const MAX_STANDFIRST = 300
const ENDS_SENTENCE = /[.!?…]["'”’)]?$/

/**
 * The passage's standfirst and where its body starts. Some passages keep it
 * in `subtitle`; others stored it as the first paragraph, which then shows as
 * body text. That paragraph counts only when it has no letter, is short,
 * does not end like a sentence and more paragraphs follow.
 */
export function passageStandfirst(material: IeltsReadingMaterial): {
  standfirst: string
  bodyStart: number
} {
  const subtitle = material.subtitle.trim()

  if (subtitle) return { standfirst: subtitle, bodyStart: 0 }

  const [first] = material.paragraphs
  const text = first?.text.trim() ?? ''

  if (
    first &&
    !first.label &&
    material.paragraphs.length > 1 &&
    text.length > 0 &&
    text.length <= MAX_STANDFIRST &&
    !ENDS_SENTENCE.test(text)
  )
    return { standfirst: text, bodyStart: 1 }

  return { standfirst: '', bodyStart: 0 }
}
