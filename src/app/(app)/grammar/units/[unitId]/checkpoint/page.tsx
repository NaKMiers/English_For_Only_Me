import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { GrammarPlayerPage } from '@/components/grammar/player/GrammarPlayerPage'
import { CHECKPOINT_SIZE, PASS_ACCURACY } from '@/modules/grammar/constants'
import { grammarCourse } from '@/modules/grammar/course'
import { createRng, randomSeed } from '@/modules/grammar/rng'
import { loadGrammarPageData } from '@/modules/grammar/services/grammarPageData'
import { buildCheckpointSet } from '@/modules/grammar/session/buildPracticeSet'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const metadata: Metadata = { title: 'Grammar: checkpoint' }

interface Props {
  params: Promise<{ unitId: string }>
}

export default async function GrammarCheckpointPage({ params }: Props) {
  const unit = grammarCourse.getUnit((await params).unitId)

  if (!unit) notFound()

  const { canSave, path } = await loadGrammarPageData()
  const node = path.units.find(item => item.id === unit.id)

  if (!node || node.state === 'complete') redirect('/grammar')

  const passMark = Math.ceil(CHECKPOINT_SIZE * PASS_ACCURACY)
  // A checkpoint taken before the unit's lessons are done is a test-out:
  // passing it skips this unit and every earlier one.
  const intro =
    node.checkpoint === 'open'
      ? `Unit ${unit.order} checkpoint: ${CHECKPOINT_SIZE} questions from all 5 lessons. Get ${passMark} or more right to unlock the next unit.`
      : `Test-out: ${CHECKPOINT_SIZE} questions from Unit ${unit.order}. Get ${passMark} or more right to skip this unit and every unit before it.`

  return (
    <GrammarPlayerPage
      canSave={canSave}
      cards={buildCheckpointSet(grammarCourse, unit, createRng(randomSeed()))}
      intro={intro}
      mode="checkpoint"
      targetId={unit.id}
      title={`Unit ${unit.order}: ${unit.title}`}
    />
  )
}
