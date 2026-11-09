'use client'

import { BookOpen, Lightbulb, ListChecks } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { IeltsAttemptRecord } from '@/modules/ielts/attempts/attemptRecords'
import { IELTS_SKILL_LABELS } from '@/modules/ielts/constants'
import type { IeltsPublicSection } from '@/modules/ielts/publicView'
import { checkIeltsPartApi, readIeltsEvidenceApi } from '@/requests/ieltsApi'

import {
  IeltsAnswerContext,
  type IeltsAnswerContextValue,
  type IeltsAnswerValue,
  type IeltsReviewMark,
  questionBlockId,
  questionControlId,
} from '../widgets/answerContext'
import { GroupBlock } from '../widgets/GroupBlock'
import { CheckPartPanel } from './CheckPartPanel'
import { ListeningMaterial, ListeningPlayer } from './ListeningPane'
import { PassagePane, type IeltsHighlight } from './PassagePane'
import { QuestionNavigator } from './QuestionNavigator'
import {
  buildQuestionIndex,
  countBlanks,
  type IeltsQuestionEntry,
} from './questionIndex'
import { ExamButton } from '../ui'
import { RunnerToolbar, ToolbarToggle } from './RunnerToolbar'
import { TextHighlighter } from './TextHighlighter'
import { useAttemptAnswers } from './useAttemptAnswers'
import { useMockDeadline } from './useMockDeadline'

interface Props {
  attempt: IeltsAttemptRecord
  backHref: string
  /** The test's next and previous skills, at either end of the bottom bar. */
  next?: { href: string; label: string } | null
  prev?: { href: string; label: string } | null
  /** Part to show first, from the test page's part links. */
  startPart?: number | null
  sections: IeltsPublicSection[]
  testTitle: string
}

const MODE_LABELS = { practice: 'Practice', mock: 'Mock', drill: 'Drill' }

/** The two panes a phone switches between. */
type PaneTab = 'material' | 'questions'

/** Alt+Q swaps panes; `code` so Option+Q on a Mac still matches. */
const PANE_SHORTCUT_CODE = 'KeyQ'

function partName(skill: string, part: number, mode?: string) {
  if (mode === 'drill') return `Group ${part}`

  return skill === 'listening' ? `Part ${part}` : `Passage ${part}`
}

function focusQuestion(number: number) {
  window.setTimeout(() => {
    const control = document.getElementById(questionControlId(number))
    const block = document.getElementById(questionBlockId(number))

    ;(block ?? control)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    control?.focus({ preventScroll: true })
  }, 0)
}

/**
 * Listening and Reading runner (practice, mock, drill). Focus mode: manga
 * chrome on the toolbar, navigator and widgets; the passage and questions
 * sit on plain paper. Split pane from 1024px; below it, reading switches
 * between two tabs and listening is one column under a pinned audio bar.
 */
export function IeltsRunner({
  attempt,
  backHref,
  next = null,
  prev = null,
  sections,
  startPart = null,
  testTitle,
}: Props) {
  const router = useRouter()
  const isMock = attempt.mode === 'mock'
  const isPractice = attempt.mode === 'practice'
  const isListening = attempt.skill === 'listening'
  const open = attempt.status === 'in_progress'
  const [submitting, setSubmitting] = useState(false)
  const locked = !open || submitting
  // Filled in below once `finish` exists; the hook calls it on a late save.
  const finishRef = useRef<() => void>(() => undefined)
  // Passage, transcript and questions: where text can be highlighted.
  const stageRef = useRef<HTMLDivElement>(null)
  const { answers, saveState, setAnswer, submit } = useAttemptAnswers({
    attempt,
    enabled: !locked,
    onTimeUp: () => finishRef.current(),
  })
  const index = useMemo(() => buildQuestionIndex(sections), [sections])
  const parts = useMemo(
    () => [...new Set(sections.map(section => section.order))],
    [sections]
  )
  const [currentPart, setCurrentPart] = useState(
    startPart !== null && parts.includes(startPart)
      ? startPart
      : (parts[0] ?? 1)
  )
  const [currentNumber, setCurrentNumber] = useState<number | null>(
    () =>
      (index.find(entry => entry.part === currentPart) ?? index[0])?.number ??
      null
  )
  const [mobileTab, setMobileTab] = useState<PaneTab>('material')
  const [guided, setGuided] = useState(isPractice)
  // Practice opens with the transcript collapsed, so the questions sit right
  // under the audio; the learner (or "show evidence") expands it. Mock never
  // shows it.
  const [showTranscript, setShowTranscript] = useState(false)
  const [highlight, setHighlight] = useState<
    (IeltsHighlight & { sectionKey: string }) | null
  >(null)
  // Resume: say where the learner left off, once.
  const [notice, setNotice] = useState(() => {
    const answered = new Set(Object.keys(attempt.answers ?? {}).map(Number))
    const next = index.find(entry => !answered.has(entry.number))

    return open && answered.size && next
      ? `Continue from question ${next.number}`
      : ''
  })
  const [confirmBlanks, setConfirmBlanks] = useState<number | null>(null)
  const [exitOpen, setExitOpen] = useState(false)
  const [deadlineAt, setDeadlineAt] = useState(attempt.deadlineAt)
  const section =
    sections.find(item => item.order === currentPart) ?? sections[0]
  const skillLabel = IELTS_SKILL_LABELS[attempt.skill]

  const finish = useCallback(async () => {
    setSubmitting(true)
    setConfirmBlanks(null)

    const outcome = await submit()

    if (outcome.ok) {
      router.push(`/ielts/attempts/${attempt.id}`)
      return
    }

    setSubmitting(false)
    setNotice(`Could not submit: ${outcome.message}`)
  }, [attempt.id, router, submit])

  useEffect(() => {
    finishRef.current = () => void finish()
  })

  const secondsLeft = useMockDeadline({
    deadlineAt: isMock && open ? deadlineAt : null,
    onExpire: () => {
      setNotice('Time is up. Submitting...')
      void finish()
    },
    onWarning: () => setNotice('5 minutes remaining.'),
  })

  // Alt+Q (Option+Q on Mac) swaps between the material and the questions:
  // on a phone it flips the tab, on desktop (both panes showing) it moves
  // focus to the other pane. Matched on `code`, so it works while typing in
  // an answer box and whatever character the layout makes.
  const materialRef = useRef<HTMLElement>(null)
  const questionsRef = useRef<HTMLElement>(null)
  const pendingFocusRef = useRef<PaneTab | null>(null)
  // Listening below lg: the one column that holds both panes.
  const scrollerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.code !== PANE_SHORTCUT_CODE ||
        !event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.repeat
      )
        return

      event.preventDefault()

      const active = document.activeElement
      const target: PaneTab = questionsRef.current?.contains(active)
        ? 'material'
        : materialRef.current?.contains(active)
          ? 'questions'
          : mobileTab === 'material'
            ? 'questions'
            : 'material'
      const pane =
        target === 'material' ? materialRef.current : questionsRef.current

      setMobileTab(target)

      // Hidden on a phone until the tab flips: focus it after the render.
      if (!pane?.checkVisibility()) {
        pendingFocusRef.current = target
        return
      }

      pane.focus({ preventScroll: true })

      // Listening on a phone stacks both panes in one column: scroll to it.
      const scroller = scrollerRef.current

      if (scroller && getComputedStyle(scroller).display !== 'contents')
        scroller.scrollTo({ behavior: 'smooth', top: pane.offsetTop })
    }

    window.addEventListener('keydown', onKey)

    return () => window.removeEventListener('keydown', onKey)
  }, [mobileTab])

  useEffect(() => {
    if (pendingFocusRef.current !== mobileTab) return

    pendingFocusRef.current = null
    ;(mobileTab === 'material' ? materialRef : questionsRef).current?.focus({
      preventScroll: true,
    })
  }, [mobileTab])

  // A mock cannot be paused: warn before the tab closes.
  useEffect(() => {
    if (!isMock || locked) return

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }

    window.addEventListener('beforeunload', onBeforeUnload)

    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isMock, locked])

  const requestSubmit = () => {
    const blanks = countBlanks(index, answers)

    if (blanks > 0) setConfirmBlanks(blanks)
    else void finish()
  }

  const selectEntry = useCallback((entry: IeltsQuestionEntry) => {
    setCurrentPart(entry.part)
    setCurrentNumber(entry.number)
    setMobileTab('questions')
    focusQuestion(entry.setStart ?? entry.number)
  }, [])

  const showEvidence = useCallback(
    async (number: number) => {
      try {
        const result = await readIeltsEvidenceApi(attempt.id, number)
        const target = sections.find(item => item.key === result.sectionKey)

        if (!result.evidence) {
          setNotice(
            result.notGiven
              ? `Question ${number}: not in the text (NOT GIVEN).`
              : `Question ${number}: no evidence yet.`
          )
          return
        }

        if (target) setCurrentPart(target.order)

        setHighlight({ ...result.evidence, sectionKey: result.sectionKey })
        setMobileTab('material')

        if (attempt.skill === 'listening') setShowTranscript(true)
      } catch {
        setNotice('Could not load the evidence.')
      }
    },
    [attempt.id, attempt.skill, sections]
  )

  // Practice "check this part": the marks shown under each question, and
  // each checked part's score. Editing an answer drops the marks of its
  // group (a Choose TWO set shares one answer), so no mark goes stale.
  const [marks, setMarks] = useState<Record<number, IeltsReviewMark>>({})
  const [partChecks, setPartChecks] = useState<
    Record<number, { raw: number; total: number }>
  >({})
  const [checkingPart, setCheckingPart] = useState<number | null>(null)
  const groupNumbers = useMemo(() => {
    const map = new Map<number, number[]>()

    for (const item of sections)
      for (const group of item.groups) {
        const numbers = group.questions.map(question => question.number)

        for (const number of numbers) map.set(number, numbers)
      }

    return map
  }, [sections])

  const editAnswer = useCallback(
    (number: number, value: IeltsAnswerValue) => {
      setAnswer(number, value)
      setMarks(current => {
        const stale = (groupNumbers.get(number) ?? [number]).filter(
          item => item in current
        )

        if (!stale.length) return current

        const next = { ...current }

        for (const item of stale) delete next[item]

        return next
      })
    },
    [groupNumbers, setAnswer]
  )

  const checkPart = useCallback(
    async (part: number) => {
      const partAnswers = Object.fromEntries(
        index
          .filter(entry => entry.part === part && entry.number in answers)
          .map(entry => [entry.number, answers[String(entry.number)]])
      )

      setCheckingPart(part)

      try {
        const result = await checkIeltsPartApi(attempt.id, {
          answers: partAnswers,
          part,
        })

        setMarks(current => ({
          ...current,
          ...Object.fromEntries(
            result.questions.map(row => [
              row.number,
              { accepted: row.accepted, outcome: row.outcome },
            ])
          ),
        }))
        setPartChecks(current => ({
          ...current,
          [part]: { raw: result.raw, total: result.total },
        }))
      } catch (caught) {
        setNotice(
          `Could not check the answers: ${caught instanceof Error ? caught.message : 'try again.'}`
        )
      } finally {
        setCheckingPart(null)
      }
    },
    [answers, attempt.id, index]
  )

  const context = useMemo<IeltsAnswerContextValue>(
    () => ({
      answers,
      readOnly: locked,
      review: Object.keys(marks).length ? marks : null,
      setAnswer: editAnswer,
      currentNumber,
      onFocusQuestion: number => {
        setCurrentNumber(number)
        const entry = index.find(item => item.number === number)

        if (entry) setCurrentPart(entry.part)
      },
      onShowEvidence: isPractice && guided ? showEvidence : null,
    }),
    [
      answers,
      currentNumber,
      editAnswer,
      guided,
      index,
      isPractice,
      locked,
      marks,
      showEvidence,
    ]
  )

  const total = index.length
  const answeredCount = total - countBlanks(index, answers)
  const listeningProps = {
    attempt,
    highlight,
    locked,
    onAttemptChange: (next: IeltsAttemptRecord) =>
      setDeadlineAt(next.deadlineAt),
    onNotice: setNotice,
    onPartChange: setCurrentPart,
    onShowTranscriptChange: setShowTranscript,
    sections,
    showTranscript: isPractice && showTranscript,
    visiblePart: currentPart,
  }
  const material: ReactNode = isListening ? (
    <ListeningMaterial {...listeningProps} />
  ) : section?.reading ? (
    <PassagePane
      highlight={highlight?.sectionKey === section.key ? highlight : null}
      material={section.reading}
      partLabel={`${testTitle} · ${partName(attempt.skill, section.order, attempt.mode)}`}
    />
  ) : null
  const questions = (
    <div className="text-manga-black mx-auto grid max-w-[70ch] gap-10 text-[16px] leading-[1.7]">
      {section?.groups.map(group => (
        <GroupBlock
          group={group}
          key={group.id}
        />
      ))}
      {isPractice && open && section ? (
        <CheckPartPanel
          check={partChecks[section.order] ?? null}
          checking={checkingPart === section.order}
          label={partName(attempt.skill, section.order, attempt.mode)}
          onCheck={() => void checkPart(section.order)}
        />
      ) : null}
    </div>
  )
  const questionsPaneClass =
    'border-manga-black bg-manga-white in-data-[theme=lightup]:bg-manga-pale-red/60 px-4 py-6 outline-none sm:px-8 lg:min-h-0 lg:overflow-y-auto lg:border-l-3'

  const toggles = isPractice ? (
    <div className="flex items-center gap-2">
      <ToolbarToggle
        checked={guided}
        icon={<Lightbulb aria-hidden="true" />}
        label="Guided"
        onCheckedChange={checked => {
          setGuided(checked)
          // Guided off hides every hint, including the evidence highlight.
          if (!checked) setHighlight(null)
        }}
      />
    </div>
  ) : null

  // Reading only (listening is one column). Segmented toggle (aria-pressed):
  // the documented raw-button exception.
  const panes = (
    <div
      aria-label="Choose panel"
      className="border-manga-black bg-manga-paper-soft rounded-control flex h-9 border-2 p-0.5"
      role="group"
    >
      {(
        [
          ['material', 'Passage', BookOpen],
          ['questions', 'Questions', ListChecks],
        ] as const
      ).map(([value, label, Icon]) => {
        const active = mobileTab === value

        return (
          <button
            aria-keyshortcuts="Alt+Q"
            aria-pressed={active}
            className={cn(
              'rounded-tag flex min-w-0 flex-auto items-center justify-center gap-1.5 px-2 font-sans text-[13px] font-black transition-colors',
              active
                ? 'bg-manga-black text-manga-white'
                : 'text-manga-black hover:bg-manga-white'
            )}
            key={value}
            onClick={() => setMobileTab(value)}
            title={`${label} (Alt+Q to switch)`}
            type="button"
          >
            <Icon
              aria-hidden="true"
              className="size-4 shrink-0 max-sm:hidden"
            />
            <span className="truncate">{label}</span>
            {value === 'questions' ? (
              <span
                className={cn(
                  'rounded-tag shrink-0 px-1 text-[11px] leading-4 tabular-nums',
                  active ? 'bg-manga-white/20' : 'bg-manga-black/10'
                )}
              >
                {answeredCount}/{total}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )

  return (
    <IeltsAnswerContext.Provider value={context}>
      <div className="flex h-full min-h-0 flex-col">
        <RunnerToolbar
          backHref={backHref}
          modeLabel={MODE_LABELS[attempt.mode]}
          onBack={isMock && open ? () => setExitOpen(true) : undefined}
          onSubmit={requestSubmit}
          panes={isListening ? undefined : panes}
          saveState={open ? saveState : 'saved'}
          secondsLeft={secondsLeft}
          submitDisabled={!open}
          submitting={submitting}
          title={`${testTitle} · ${skillLabel}`}
          toggles={toggles}
        />

        {notice ? (
          <p
            className="border-manga-black text-manga-black flex shrink-0 items-center justify-between gap-3 border-b-2 bg-yellow-100 px-4 py-2 text-sm"
            role="status"
          >
            {notice}
            <button
              className="text-manga-red text-xs font-semibold underline"
              onClick={() => setNotice('')}
              type="button"
            >
              Close
            </button>
          </p>
        ) : null}

        {isListening ? (
          // Listening: one column on a phone (the audio bar pinned on top,
          // the transcript and questions scrolling under it); from lg the
          // scroller dissolves (`contents`) into the usual two panes.
          <div
            className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[55fr_45fr]"
            ref={stageRef}
          >
            <div className="border-manga-black bg-manga-paper-soft border-b-2 px-4 py-1.5 sm:px-8 lg:col-start-1 lg:row-start-1">
              <div className="mx-auto max-w-[68ch]">
                <ListeningPlayer {...listeningProps} />
              </div>
            </div>
            <div
              className="relative min-h-0 overflow-y-auto lg:contents"
              ref={scrollerRef}
            >
              {material ? (
                <section
                  aria-label="Audio"
                  className="bg-manga-white px-4 pt-4 pb-6 outline-none sm:px-8 lg:col-start-1 lg:row-start-2 lg:min-h-0 lg:overflow-y-auto"
                  ref={materialRef}
                  tabIndex={-1}
                >
                  {material}
                </section>
              ) : null}
              <section
                aria-label="Questions"
                className={cn(
                  questionsPaneClass,
                  'lg:col-start-2 lg:row-span-2 lg:row-start-1',
                  material && 'max-lg:border-t-2'
                )}
                ref={questionsRef}
                tabIndex={-1}
              >
                {questions}
              </section>
            </div>
          </div>
        ) : (
          <div
            className="grid min-h-0 flex-1 lg:grid-cols-[55fr_45fr]"
            ref={stageRef}
          >
            <section
              aria-label="Reading passage"
              className={cn(
                'bg-manga-white min-h-0 overflow-y-auto px-4 py-6 outline-none sm:px-8 lg:block',
                mobileTab === 'material' ? 'block' : 'hidden'
              )}
              ref={materialRef}
              tabIndex={-1}
            >
              {material}
            </section>
            <section
              aria-label="Questions"
              className={cn(
                questionsPaneClass,
                'min-h-0 overflow-y-auto lg:block',
                mobileTab === 'questions' ? 'block' : 'hidden'
              )}
              ref={questionsRef}
              tabIndex={-1}
            >
              {questions}
            </section>
          </div>
        )}

        <TextHighlighter rootRef={stageRef} />

        <QuestionNavigator
          answers={answers}
          currentNumber={currentNumber}
          currentPart={currentPart}
          index={index}
          next={isPractice ? next : null}
          prev={isPractice ? prev : null}
          onPartChange={setCurrentPart}
          onSelect={selectEntry}
          partLabel={part => partName(attempt.skill, part, attempt.mode)}
        />
      </div>

      <Dialog
        onOpenChange={next => (next ? null : setConfirmBlanks(null))}
        open={confirmBlanks !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmBlanks} questions are blank. Submit?
            </DialogTitle>
            <DialogDescription>
              Blank questions are marked wrong.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <ExamButton
              onClick={() => setConfirmBlanks(null)}
              tone="paper"
              type="button"
            >
              Keep going
            </ExamButton>
            <ExamButton
              onClick={() => void finish()}
              tone="ink"
              type="button"
            >
              Submit
            </ExamButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={setExitOpen}
        open={exitOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave the mock test?</DialogTitle>
            <DialogDescription>
              The timer keeps running. Come back from the IELTS page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <ExamButton
              onClick={() => setExitOpen(false)}
              tone="paper"
              type="button"
            >
              Stay
            </ExamButton>
            <ExamButton
              href={backHref}
              tone="ink"
            >
              Leave
            </ExamButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </IeltsAnswerContext.Provider>
  )
}
