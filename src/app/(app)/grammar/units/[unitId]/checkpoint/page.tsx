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
      ? `Checkpoint Unit ${unit.order}: ${CHECKPOINT_SIZE} câu từ cả 5 bài. Đúng ${passMark} câu trở lên để mở unit tiếp theo.`
      : `Test vượt cấp: ${CHECKPOINT_SIZE} câu của Unit ${unit.order}. Đúng ${passMark} câu trở lên để bỏ qua unit này và các unit trước.`

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
