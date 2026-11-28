import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { GrammarPlayerPage } from '@/components/grammar/player/GrammarPlayerPage'
import { format } from '@/i18n/format'
import { getMessages } from '@/i18n/server'
import { CHECKPOINT_SIZE, PASS_ACCURACY } from '@/modules/grammar/constants'
import { grammarCourse } from '@/modules/grammar/course'
import { createRng, randomSeed } from '@/modules/grammar/rng'
import { buildPlayerJourney } from '@/modules/grammar/path/playerJourney'
import { loadGrammarPageData } from '@/modules/grammar/services/grammarPageData'
import { buildCheckpointSet } from '@/modules/grammar/session/buildPracticeSet'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).grammar.meta.checkpoint }
}

interface Props {
  params: Promise<{ unitId: string }>
}

export default async function GrammarCheckpointPage({ params }: Props) {
  const unit = grammarCourse.getUnit((await params).unitId)

  if (!unit) notFound()

  const { canSave, path } = await loadGrammarPageData()
  const node = path.units.find(item => item.id === unit.id)

  if (!node || node.state === 'complete') redirect('/grammar')

  const t = await getMessages()
  const passMark = Math.ceil(CHECKPOINT_SIZE * PASS_ACCURACY)
  const values = { order: unit.order, passMark, size: CHECKPOINT_SIZE }
  // A checkpoint taken before the unit's lessons are done is a test-out:
  // passing it skips this unit and every earlier one.
  const intro = format(
    node.checkpoint === 'open'
      ? t.grammar.sessions.checkpointIntro
      : t.grammar.sessions.testOutIntro,
    values
  )

  return (
    <GrammarPlayerPage
      journey={buildPlayerJourney(path, 'checkpoint', unit.id)}
      canSave={canSave}
      cards={buildCheckpointSet(grammarCourse, unit, createRng(randomSeed()))}
      intro={intro}
      mode="checkpoint"
      targetId={unit.id}
      title={format(t.grammar.sessions.checkpointTitle, {
        order: unit.order,
        title: unit.title,
      })}
    />
  )
}
