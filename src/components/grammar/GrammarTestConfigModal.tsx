'use client'

import { useCallback, useEffect, useState } from 'react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { MangaButton } from '@/components/ui/MangaButton'
import {
  GRAMMAR_CEFR_LEVELS,
  GRAMMAR_COMPLEXITY_LEVELS,
  GRAMMAR_FAMILIES,
  GRAMMAR_FAMILY_LABELS,
  GRAMMAR_L1_RISKS,
  GRAMMAR_TEST_DEFAULT_QUESTIONS,
  GRAMMAR_TEST_QUESTION_COUNTS,
} from '@/modules/grammar/constants'
import type {
  GrammarTestConfig,
  GrammarTestScope,
} from '@/modules/grammar/test/types'
import type {
  GrammarCefrLevel,
  GrammarComplexity,
  GrammarFamily,
  GrammarL1Risk,
} from '@/modules/grammar/types'

import { SenseiPortrait } from './cast/SenseiPortrait'
import { SpeechBubble } from './comic/SpeechBubble'

const CONFIG_KEY = 'grammar:test:lastConfig'

const SCOPE_LABELS: Record<GrammarTestScope, string> = {
  all: 'Everything',
  due: 'Due now',
  learning: 'Still learning',
  mastered: 'Rules I have beaten',
  untouched: 'Never attempted',
}

const SCOPE_HINTS: Record<GrammarTestScope, string> = {
  all: 'Every rule with drills written, wherever you are with it.',
  due: 'Only what the ladder says is due today.',
  learning: 'Rules already on the ladder and not yet mastered.',
  mastered: 'Check whether you really did beat them.',
  untouched: 'Rules I have never seen you attempt.',
}

const DEFAULT_CONFIG: GrammarTestConfig = {
  cefrLevels: [],
  complexities: [],
  families: [],
  l1Risks: [],
  questionCount: GRAMMAR_TEST_DEFAULT_QUESTIONS,
  scope: 'all',
}

/**
 * Read the last-used configuration.
 *
 * localStorage rather than server state: a learner drilling conditionals all
 * week should not re-pick six filters every time, and getting it wrong costs a
 * mis-prefilled form, not data. Parsed defensively because the shape can change
 * between deploys while an old value is still sitting in the browser.
 */
function loadConfig(): GrammarTestConfig {
  try {
    const raw = window.localStorage.getItem(CONFIG_KEY)

    if (!raw) return DEFAULT_CONFIG

    const parsed = JSON.parse(raw) as Partial<GrammarTestConfig>

    return {
      cefrLevels: Array.isArray(parsed.cefrLevels) ? parsed.cefrLevels : [],
      complexities: Array.isArray(parsed.complexities)
        ? parsed.complexities
        : [],
      families: Array.isArray(parsed.families) ? parsed.families : [],
      l1Risks: Array.isArray(parsed.l1Risks) ? parsed.l1Risks : [],
      questionCount:
        typeof parsed.questionCount === 'number'
          ? parsed.questionCount
          : GRAMMAR_TEST_DEFAULT_QUESTIONS,
      scope: parsed.scope ?? 'all',
    }
  } catch {
    return DEFAULT_CONFIG
  }
}

function toggle<T>(list: T[], value: T) {
  return list.includes(value)
    ? list.filter(entry => entry !== value)
    : [...list, value]
}

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      aria-pressed={active}
      className={`border-manga-black min-h-11 border-3 px-3 font-sans text-xs leading-tight font-black uppercase transition-shadow ${
        active
          ? 'bg-manga-black text-manga-white shadow-none'
          : 'bg-manga-white text-manga-black shadow-[3px_3px_0_var(--manga-black)]'
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
}

function Field({
  children,
  hint,
  label,
}: {
  children: React.ReactNode
  hint?: string
  label: string
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="font-sans text-xs leading-none font-black tracking-[0.12em] uppercase">
        {label}
      </legend>
      {hint ? (
        <p className="text-manga-ink-soft text-xs leading-5 font-semibold">
          {hint}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  )
}

/**
 * Choose what the test asks about.
 *
 * Every filter is multi-select and EMPTY MEANS EVERYTHING, which is stated in
 * the UI rather than left to be inferred - the alternative is a learner
 * selecting nothing and wondering why they got a test about articles. Nothing
 * here touches the network: the whole config is one POST when Start is pressed.
 */
export function GrammarTestConfigModal({
  message,
  onCancel,
  onStart,
  pending,
}: {
  message: string | null
  onCancel: () => void
  onStart: (config: GrammarTestConfig) => void
  pending: boolean
}) {
  // Lazy initializer rather than an effect: this modal only ever mounts after a
  // click, so there is no server render to guard against, and reading storage
  // during the first render avoids a second one with different values.
  const [config, setConfig] = useState<GrammarTestConfig>(() =>
    typeof window === 'undefined' ? DEFAULT_CONFIG : loadConfig()
  )

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !pending) onCancel()
    }

    window.addEventListener('keydown', onKey)

    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel, pending])

  const start = useCallback(() => {
    try {
      window.localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
    } catch {
      // Storage disabled. The test still runs; only the convenience is lost.
    }

    onStart(config)
  }, [config, onStart])

  return (
    <MangaPanel
      eyebrow="New test"
      title="What should I test you on?"
    >
      <div className="flex items-start gap-3">
        <SenseiPortrait expression="wary" />
        <SpeechBubble speaker="Sensei">
          Pick your ground. Leave a row untouched and I will use all of it. A
          wrong answer sends that rule back to the bottom of the ladder - a
          right one proves nothing, so answer honestly.
        </SpeechBubble>
      </div>

      <Field label="Questions">
        {GRAMMAR_TEST_QUESTION_COUNTS.map(count => (
          <Chip
            active={config.questionCount === count}
            key={count}
            onClick={() =>
              setConfig(previous => ({ ...previous, questionCount: count }))
            }
          >
            {count}
          </Chip>
        ))}
      </Field>

      <Field
        hint={SCOPE_HINTS[config.scope]}
        label="Range"
      >
        {(Object.keys(SCOPE_LABELS) as GrammarTestScope[]).map(scope => (
          <Chip
            active={config.scope === scope}
            key={scope}
            onClick={() => setConfig(previous => ({ ...previous, scope }))}
          >
            {SCOPE_LABELS[scope]}
          </Chip>
        ))}
      </Field>

      <Field
        hint="Empty means every level."
        label="Level"
      >
        {GRAMMAR_CEFR_LEVELS.map(level => (
          <Chip
            active={config.cefrLevels.includes(level)}
            key={level}
            onClick={() =>
              setConfig(previous => ({
                ...previous,
                cefrLevels: toggle<GrammarCefrLevel>(
                  previous.cefrLevels,
                  level
                ),
              }))
            }
          >
            {level}
          </Chip>
        ))}
      </Field>

      <Field
        hint="Empty means every difficulty. 5 is the hardest."
        label="Difficulty"
      >
        {GRAMMAR_COMPLEXITY_LEVELS.map(complexity => (
          <Chip
            active={config.complexities.includes(complexity)}
            key={complexity}
            onClick={() =>
              setConfig(previous => ({
                ...previous,
                complexities: toggle<GrammarComplexity>(
                  previous.complexities,
                  complexity
                ),
              }))
            }
          >
            {complexity}
          </Chip>
        ))}
      </Field>

      <Field
        hint="How hard Vietnamese makes the rule. Empty means all three."
        label="Interference"
      >
        {GRAMMAR_L1_RISKS.map(risk => (
          <Chip
            active={config.l1Risks.includes(risk)}
            key={risk}
            onClick={() =>
              setConfig(previous => ({
                ...previous,
                l1Risks: toggle<GrammarL1Risk>(previous.l1Risks, risk),
              }))
            }
          >
            {risk}
          </Chip>
        ))}
      </Field>

      <Field
        hint="Empty means every family."
        label="Family"
      >
        {GRAMMAR_FAMILIES.map(family => (
          <Chip
            active={config.families.includes(family)}
            key={family}
            onClick={() =>
              setConfig(previous => ({
                ...previous,
                families: toggle<GrammarFamily>(previous.families, family),
              }))
            }
          >
            {GRAMMAR_FAMILY_LABELS[family]}
          </Chip>
        ))}
      </Field>

      {message ? (
        <p
          className="border-manga-black bg-manga-pale-red text-manga-black border-3 p-3 text-sm leading-6 font-semibold"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <MangaButton
          disabled={pending}
          onClick={start}
          tone="ink"
          type="button"
        >
          {pending ? 'Writing questions...' : 'Start Test'}
        </MangaButton>
        <MangaButton
          disabled={pending}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </MangaButton>
      </div>
    </MangaPanel>
  )
}
