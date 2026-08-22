'use client'

import { useCallback, useState } from 'react'

import { MangaButton } from '@/components/ui/MangaButton'
import type {
  GrammarTestConfig,
  GrammarTestStartResult,
} from '@/modules/grammar/test/types'

import { SenseiPortrait } from './cast/SenseiPortrait'
import { ComicPanel } from './comic/ComicPanel'
import { SpeechBubble } from './comic/SpeechBubble'
import { GrammarTestConfigModal } from './GrammarTestConfigModal'
import { GrammarTestModal } from './GrammarTestModal'

/**
 * The way into a test.
 *
 * ```
 *   idle ──Test Me──> config ──Start──> running ──Submit──> report ──> idle
 *     ^                 |                                              |
 *     +──── cancel ─────+                        abandon ──────────────+
 * ```
 *
 * ALWAYS VISIBLE, for every learner state. That is the whole correction to what
 * this replaced: the placement test rendered only when `learningCount === 0 &&
 * untouchedCount > 0`, so answering a single drill anywhere in the module made
 * it disappear permanently. A test you cannot re-take is a test you cannot use.
 */
export function GrammarTestLauncher({
  untouchedCount,
}: {
  untouchedCount: number
}) {
  const [phase, setPhase] = useState<'config' | 'idle' | 'running'>('idle')
  const [started, setStarted] = useState<GrammarTestStartResult | null>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const start = useCallback(async (config: GrammarTestConfig) => {
    setPending(true)
    setMessage(null)

    try {
      const response = await fetch('/api/grammar/test/start', {
        body: JSON.stringify(config),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null)

        // The modal stays open on failure. Every error here is something the
        // learner can act on by changing the configuration or waiting, so
        // closing it would throw away the choices they just made.
        setMessage(
          (body as { message?: string } | null)?.message ??
            'Could not build a test.'
        )
        return
      }

      setStarted((await response.json()) as GrammarTestStartResult)
      setPhase('running')
    } finally {
      setPending(false)
    }
  }, [])

  const close = useCallback(() => {
    setStarted(null)
    setMessage(null)
    setPhase('idle')
  }, [])

  if (phase === 'config')
    return (
      <GrammarTestConfigModal
        message={message}
        onCancel={close}
        onStart={config => void start(config)}
        pending={pending}
      />
    )

  if (phase === 'running' && started)
    return (
      <GrammarTestModal
        notice={started.notice}
        onClose={close}
        questions={started.questions}
        sessionId={started.sessionId}
      />
    )

  return (
    <ComicPanel caption="Test yourself">
      <div className="flex items-start gap-3">
        <SenseiPortrait expression="wary" />
        <div className="grid min-w-0 gap-2">
          <h2 className="font-sans text-2xl leading-none font-black uppercase">
            Find out what you are wrong about
          </h2>
          <SpeechBubble speaker="Sensei">
            {untouchedCount > 0
              ? `${untouchedCount} rules I have never seen you attempt. Name your ground and how many questions, and I will write them.`
              : 'Name your ground and how many questions, and I will write them. Fresh questions every time.'}
          </SpeechBubble>
          <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
            Get one wrong and that rule drops to the bottom of the review
            ladder, due immediately. Get one right and nothing moves - a test
            finds gaps, it does not hand out progress. So take one whenever you
            like.
          </p>
          <div className="flex">
            <MangaButton
              onClick={() => setPhase('config')}
              tone="ink"
              type="button"
            >
              Test Me
            </MangaButton>
          </div>
        </div>
      </div>
    </ComicPanel>
  )
}
