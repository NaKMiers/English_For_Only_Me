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
  /** The part to open first (`?part=`); the attempt always covers every part. */
  startPart: number | null
  sections: IeltsPublicSection[]
  /** The test's next skill in exam order (L, R, W), or null after the last. */
  nextSkill: IeltsSkill | null
  /** The test's previous skill in exam order, or null before the first. */
  prevSkill: IeltsSkill | null
}

/**
 * Public sections for a runner page, or null when the test, skill or part
 * does not exist. Every part of the skill is included; `?part=` only picks
 * the part shown first. Mock never ships the listening transcript.
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

  const sections = sectionsInScope(test.sections, skill, null)

  if (!sections.length) return null

  const skillsInTest = new Set(test.sections.map(item => item.skill))
  const nextSkill =
    IELTS_SKILLS.slice(IELTS_SKILLS.indexOf(skill) + 1).find(item =>
      skillsInTest.has(item)
    ) ?? null
  const prevSkill =
    IELTS_SKILLS.slice(0, IELTS_SKILLS.indexOf(skill))
      .reverse()
      .find(item => skillsInTest.has(item)) ?? null

  return {
    nextSkill,
    prevSkill,
    testSlug: test.slug,
    testTitle: test.title,
    skill,
    startPart: part,
    sections: sections.map(section =>
      toPublicSection(section, { includeTranscript: mode === 'practice' })
    ),
  }
}
