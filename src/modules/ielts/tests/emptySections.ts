import {
  IELTS_SECTION_KEYS,
  type IeltsGenStatus,
  type IeltsSectionKey,
  type IeltsSkill,
} from '../constants'
import type { IeltsSection } from '../schema'

export function sectionKeyParts(key: IeltsSectionKey): {
  skill: IeltsSkill
  order: number
} {
  const [skill, order] = key.split('-')

  return { skill: skill as IeltsSkill, order: Number(order) }
}

function defaultTitle(skill: IeltsSkill, order: number) {
  if (skill === 'listening') return `Part ${order}`
  if (skill === 'reading') return `Reading Passage ${order}`

  return `Writing Task ${order}`
}

/** A blank section for a new draft: the shape the editor fills in. */
export function emptySection(
  key: IeltsSectionKey,
  genStatus: IeltsGenStatus = 'manual'
): IeltsSection {
  const { order, skill } = sectionKeyParts(key)

  return {
    key,
    skill,
    order,
    title: defaultTitle(skill, order),
    revision: 0,
    genStatus,
    genStartedAt: null,
    genError: '',
    listening:
      skill === 'listening' ? { context: '', lines: [], audio: null } : null,
    reading:
      skill === 'reading' ? { title: '', subtitle: '', paragraphs: [] } : null,
    writing:
      skill === 'writing'
        ? {
            task: order === 1 ? 1 : 2,
            prompt: '',
            minWords: order === 1 ? 150 : 250,
            visual: null,
            sampleAnswer: '',
          }
        : null,
    groups: [],
  }
}

export function emptySections(genStatus: IeltsGenStatus = 'manual') {
  return IELTS_SECTION_KEYS.map(key => emptySection(key, genStatus))
}

/** kebab-case slug from a title, max 60 chars. */
export function slugify(title: string) {
  return (
    title
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/g, '') || 'ielts-test'
  )
}
