import 'server-only'

import { hasMongoDbUri } from '@/constants/environments'

import { IELTS_PART_COUNTS, IELTS_SKILLS, type IeltsSkill } from '../constants'
import { type IeltsPublicSection, toPublicSection } from '../publicView'
import { sectionsInScope } from '../scoring/answerKey'
import { readPublishedIeltsTest } from '../tests/testReaders'

export interface IeltsRunnerPageData {
  testSlug: string
  testTitle: string
  skill: IeltsSkill
  part: number | null
  sections: IeltsPublicSection[]
}

/**
 * Public sections for a runner page, or null when the test, skill or part
 * does not exist. Mock never ships the listening transcript.
 */
export async function loadRunnerPageData({
  mode,
  partParam,
  skillParam,
  slug,
}: {
  mode: 'practice' | 'mock'
  partParam: string | string[] | undefined
  skillParam: string
  slug: string
}): Promise<IeltsRunnerPageData | null> {
  if (!hasMongoDbUri() || !/^[a-z0-9-]{1,80}$/.test(slug)) return null

  if (!IELTS_SKILLS.includes(skillParam as IeltsSkill)) return null

  const skill = skillParam as IeltsSkill
  const rawPart = Array.isArray(partParam) ? partParam[0] : partParam
  const part = rawPart ? Number(rawPart) : null

  if (
    part !== null &&
    (!Number.isInteger(part) || part < 1 || part > IELTS_PART_COUNTS[skill])
  )
    return null

  const test = await readPublishedIeltsTest(slug)

  if (!test) return null

  const sections = sectionsInScope(test.sections, skill, part)

  if (!sections.length) return null

  return {
    testSlug: test.slug,
    testTitle: test.title,
    skill,
    part,
    sections: sections.map(section =>
      toPublicSection(section, { includeTranscript: mode === 'practice' })
    ),
  }
}
