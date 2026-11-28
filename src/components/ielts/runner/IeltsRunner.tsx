'use client'

import { BookOpen, Lightbulb, ListChecks, X } from 'lucide-react'
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
import { useMessages } from '@/i18n/client'
import { format, plural } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import { cn } from '@/lib/utils'
import type { IeltsAttemptRecord } from '@/modules/ielts/attempts/attemptRecords'
import { IELTS_SKILL_LABELS } from '@/modules/ielts/constants'
import { passageIntro } from '@/modules/ielts/passageIntro'
import type { IeltsPublicSection } from '@/modules/ielts/publicView'
import { sharedGroupHeaders } from '@/modules/ielts/sharedGroupHeaders'
import {
  checkIeltsPartApi,
  ieltsErrorMessage,
  readIeltsEvidenceApi,
} from '@/requests/ieltsApi'

import {
  IeltsAnswerContext,
  type IeltsAnswerContextValue,
  type IeltsAnswerValue,
  type IeltsReviewMark,
} from '../widgets/answerContext'
import { GroupBlock } from '../widgets/GroupBlock'
import { CheckPartPanel } from './CheckPartPanel'
import { CheckButton, ResetPartButton } from './PracticeActions'
import { ListeningMaterial, ListeningPlayer } from './ListeningPane'
import { PassagePane, type IeltsHighlight } from './PassagePane'
import { QuestionNavigator } from './QuestionNavigator'
import { useResizableSplit } from './ResizableSplit'
import { buildQuestionIndex, countBlanks } from './questionIndex'
import { ExamButton } from '../ui'
import { IconButton } from '@/components/ui/IconButton'
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

/** The two panes a phone switches between. */
type PaneTab = 'material' | 'questions'

/** Alt+Q swaps panes; `code` so Option+Q on a Mac still matches. */
const PANE_SHORTCUT_CODE = 'KeyQ'

function partName(
  t: Messages['ielts'],
  skill: string,
  part: number,
  mode?: string
) {
  if (mode === 'drill') return format(t.parts.group, { part })

  return format(skill === 'listening' ? t.parts.part : t.parts.passage, {
    part,
  })
}

/**
 * Listening and Reading runner (practice, mock, drill). Focus mode: manga
 * chrome on the toolbar, navigator and widgets; the passage and questions
 * sit on plain paper. Resizable split pane from 1024px; below it, reading switches
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
  const messages = useMessages()
  const t = messages.ielts
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
  const { answers, clearAnswers, saveState, setAnswer, submit } =
    useAttemptAnswers({
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
  // Flagged for a second look; kept for this sitting only.
  const [flagged, setFlagged] = useState<ReadonlySet<number>>(() => new Set())
  const toggleFlag = useCallback((number: number) => {
    setFlagged(current => {
      const next = new Set(current)

      if (!next.delete(number)) next.add(number)

      return next
    })
  }, [])
  const [currentNumber, setCurrentNumber] = useState<number | null>(
    () =>
      (index.find(entry => entry.part === currentPart) ?? index[0])?.number ??
      null
  )
  const [mobileTab, setMobileTab] = useState<PaneTab>('material')
  // Off by default: hints are opt-in so practice starts like the real test.
  const [guided, setGuided] = useState(false)
  const split = useResizableSplit({
    defaultPercent: 55,
    // Listening's grid has the audio bar row: the divider spans both rows.
    dividerClassName: isListening
      ? 'lg:col-start-2 lg:row-span-2 lg:row-start-1'
      : undefined,
    storageKey: 'ielts-runner-split',
  })
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
      ? format(t.runner.continueFrom, { number: next.number })
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
    setNotice(format(t.runner.submitFailed, { message: outcome.message }))
  }, [attempt.id, router, submit, t])

  useEffect(() => {
    finishRef.current = () => void finish()
  })

  const secondsLeft = useMockDeadline({
    deadlineAt: isMock && open ? deadlineAt : null,
    onExpire: () => {
      setNotice(t.runner.timeUpSubmitting)
      void finish()
    },
    onWarning: () => setNotice(t.runner.fiveMinutes),
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

  // In place: an evidence note beside its question, a check error under
  // the part it checked. The notice bar keeps exam-wide messages.
  const [evidenceNote, setEvidenceNote] =
    useState<IeltsAnswerContextValue['evidenceNote']>(null)
  const [checkErrors, setCheckErrors] = useState<Record<number, string>>({})

  const showEvidence = useCallback(
    async (number: number) => {
      setEvidenceNote(null)

      try {
        const result = await readIeltsEvidenceApi(attempt.id, number)
        const target = sections.find(item => item.key === result.sectionKey)

        if (!result.evidence) {
          setEvidenceNote({
            number,
            text: format(
              result.notGiven
                ? t.runner.evidenceNotGiven
                : t.runner.evidenceMissing,
              { number }
            ),
            tone: 'info',
          })
          return
        }

        if (target) setCurrentPart(target.order)

        setHighlight({ ...result.evidence, sectionKey: result.sectionKey })
        setMobileTab('material')

        if (attempt.skill === 'listening') setShowTranscript(true)
      } catch {
        setEvidenceNote({
          number,
          text: t.runner.evidenceFailed,
          tone: 'error',
        })
      }
    },
    [attempt.id, attempt.skill, sections, t]
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
      setCheckErrors(({ [part]: _cleared, ...rest }) => rest)

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
        setCheckErrors(current => ({
          ...current,
          [part]: format(t.runner.checkFailed, {
            message: ieltsErrorMessage(caught, t.runner.tryAgain),
          }),
        }))
      } finally {
        setCheckingPart(null)
      }
    },
    [answers, attempt.id, index, t]
  )

  const resetPart = (part: number) => {
    const entries = index.filter(entry => entry.part === part)
    const numbers = entries.flatMap(entry =>
      entry.setStart === null ? [entry.number] : [entry.number, entry.setStart]
    )

    clearAnswers(numbers)
    setFlagged(
      current =>
        new Set([...current].filter(number => !numbers.includes(number)))
    )
    setMarks(current =>
      Object.fromEntries(
        Object.entries(current).filter(
          ([number]) => !entries.some(entry => entry.number === Number(number))
        )
      )
    )
    setPartChecks(({ [part]: _dropped, ...rest }) => rest)
    setHighlight(null)
    setNotice(
      format(t.runner.partReset, {
        part: partName(t, attempt.skill, part, attempt.mode),
      })
    )
  }

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
      evidenceNote,
      flagged,
      onToggleFlag: locked ? null : toggleFlag,
    }),
    [
      evidenceNote,
      flagged,
      toggleFlag,
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
      heading={partName(t, attempt.skill, section.order, attempt.mode)}
      intro={attempt.mode === 'drill' ? undefined : passageIntro(section)}
      partLabel={`${testTitle} · ${partName(t, attempt.skill, section.order, attempt.mode)}`}
    />
  ) : null
  const currentPartName = partName(t, attempt.skill, currentPart, attempt.mode)
  const canCheck = isPractice && open && Boolean(section)
  const currentCheck = section ? (partChecks[section.order] ?? null) : null
  const groupHeaders = sharedGroupHeaders(section?.groups ?? [])
  const questions = (
    <div className="text-ink grid w-full gap-7 text-[16px] leading-[1.6]">
      {section?.groups.map((group, index) => (
        <GroupBlock
          group={group}
          header={groupHeaders[index]}
          key={group.id}
          sectionTitle={section.title}
        />
      ))}
      {/* Phones and tablets: the check closes the questions. From lg it
          sits at the right end of the footer instead. */}
      {canCheck && section ? (
        <CheckPartPanel
          check={partChecks[section.order] ?? null}
          className="lg:hidden"
          checking={checkingPart === section.order}
          error={checkErrors[section.order] ?? null}
          label={partName(t, attempt.skill, section.order, attempt.mode)}
          onCheck={() => void checkPart(section.order)}
        />
      ) : null}
    </div>
  )
  const questionsPaneClass =
    'border-line bg-exam-surface in-data-[theme=lightup]:bg-tint-soft/60 px-3 py-4 outline-none sm:px-3 lg:min-h-0 lg:overflow-y-auto'

  const toggles = isPractice ? (
    <div className="flex items-center gap-2">
      <ResetPartButton
        disabled={locked}
        name={currentPartName}
        onReset={() => resetPart(currentPart)}
      />
      <ToolbarToggle
        checked={guided}
        icon={<Lightbulb aria-hidden="true" />}
        label={t.runner.guided}
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
      aria-label={t.runner.choosePanel}
      className="border-line bg-tint rounded-control flex h-9 border p-0.5"
      role="group"
    >
      {(
        [
          ['material', t.runner.passage, BookOpen],
          ['questions', t.runner.questions, ListChecks],
        ] as const
      ).map(([value, label, Icon]) => {
        const active = mobileTab === value

        return (
          <button
            aria-keyshortcuts="Alt+Q"
            aria-pressed={active}
            className={cn(
              'rounded-tag flex min-w-0 flex-auto items-center justify-center gap-1.5 px-2 font-sans text-[13px] font-semibold transition-colors',
              active
                ? 'bg-cta text-cta-fg'
                : 'text-ink hover:bg-surface hover-pop'
            )}
            key={value}
            onClick={() => setMobileTab(value)}
            title={format(t.runner.switchPane, { label })}
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
                  active ? 'bg-surface/20' : 'bg-ink/10'
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
          modeLabel={t.modes[attempt.mode]}
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
            className="border-line text-ink bg-notice-soft flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2 text-sm"
            role="status"
          >
            {notice}
            <IconButton
              className="size-11 shrink-0 border-transparent bg-transparent"
              label={messages.common.actions.close}
              onClick={() => setNotice('')}
            >
              <X aria-hidden="true" />
            </IconButton>
          </p>
        ) : null}

        {isListening ? (
          // Listening: one column on a phone (the audio bar pinned on top,
          // the transcript and questions scrolling under it); from lg the
          // scroller dissolves (`contents`) into the usual two panes.
          <div
            className={cn(
              'grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)]',
              split.gridClassName,
              split.dragging && 'select-none'
            )}
            ref={stageRef}
            style={split.style}
          >
            <div className="border-line bg-tint border-b px-3 py-1.5 sm:px-3 lg:col-start-1 lg:row-start-1">
              <div className="w-full">
                <ListeningPlayer {...listeningProps} />
              </div>
            </div>
            {/* A direct child of the grid: it measures the grid to resize. */}
            {split.divider}
            <div
              className="relative min-h-0 overflow-y-auto lg:contents"
              ref={scrollerRef}
            >
              {material ? (
                <section
                  aria-label={t.runner.audio}
                  className="bg-exam-surface px-3 pt-4 pb-6 outline-none sm:px-3 lg:col-start-1 lg:row-start-2 lg:min-h-0 lg:overflow-y-auto"
                  ref={materialRef}
                  tabIndex={-1}
                >
                  {material}
                </section>
              ) : null}
              <section
                aria-label={t.runner.questions}
                className={cn(
                  questionsPaneClass,
                  'lg:col-start-3 lg:row-span-2 lg:row-start-1',
                  material && 'max-lg:border-t'
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
            className={cn(
              'grid min-h-0 flex-1',
              split.gridClassName,
              split.dragging && 'select-none'
            )}
            ref={stageRef}
            style={split.style}
          >
            <section
              aria-label={t.runner.readingPassage}
              className={cn(
                'bg-exam-surface min-h-0 overflow-y-auto px-3 py-4 outline-none sm:px-3 lg:block',
                mobileTab === 'material' ? 'block' : 'hidden'
              )}
              ref={materialRef}
              tabIndex={-1}
            >
              {material}
            </section>
            {split.divider}
            <section
              aria-label={t.runner.questions}
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
          action={
            canCheck && section ? (
              <CheckButton
                busy={checkingPart === section.order}
                label={format(t.runner.checkPart, { part: currentPartName })}
                onCheck={() => void checkPart(section.order)}
                score={
                  currentCheck
                    ? `${currentCheck.raw}/${currentCheck.total}`
                    : null
                }
              />
            ) : null
          }
          answers={answers}
          currentPart={currentPart}
          flagged={flagged}
          index={index}
          next={isPractice ? next : null}
          prev={isPractice ? prev : null}
          onPartChange={setCurrentPart}
          partLabel={part => partName(t, attempt.skill, part, attempt.mode)}
        />
      </div>

      <Dialog
        onOpenChange={next => (next ? null : setConfirmBlanks(null))}
        open={confirmBlanks !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {plural(t.runner.blanksTitle, confirmBlanks ?? 0)}
            </DialogTitle>
            <DialogDescription>{t.runner.blanksBody}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <ExamButton
              onClick={() => setConfirmBlanks(null)}
              tone="paper"
              type="button"
            >
              {t.runner.keepGoing}
            </ExamButton>
            <ExamButton
              onClick={() => void finish()}
              tone="ink"
              type="button"
            >
              {t.runner.submit}
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
            <DialogTitle>{t.runner.leaveTitle}</DialogTitle>
            <DialogDescription>{t.runner.leaveBody}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <ExamButton
              onClick={() => setExitOpen(false)}
              tone="paper"
              type="button"
            >
              {t.runner.stay}
            </ExamButton>
            <ExamButton
              href={backHref}
              tone="ink"
            >
              {t.runner.leave}
            </ExamButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </IeltsAnswerContext.Provider>
  )
}
