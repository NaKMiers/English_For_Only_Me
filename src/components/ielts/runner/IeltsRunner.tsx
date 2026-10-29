'use client'

import {
  BookOpen,
  FileText,
  Headphones,
  Lightbulb,
  ListChecks,
} from 'lucide-react'
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
import { readIeltsEvidenceApi } from '@/requests/ieltsApi'

import {
  IeltsAnswerContext,
  type IeltsAnswerContextValue,
  questionBlockId,
  questionControlId,
} from '../widgets/answerContext'
import { GroupBlock } from '../widgets/GroupBlock'
import { ListeningPane } from './ListeningPane'
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
 * sit on plain paper. Split pane from 1024px, two tabs below.
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
  const [mobileTab, setMobileTab] = useState<'material' | 'questions'>(
    'material'
  )
  const [guided, setGuided] = useState(isPractice)
  // Practice opens with the transcript showing; mock never shows it.
  const [showTranscript, setShowTranscript] = useState(true)
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

  const context = useMemo<IeltsAnswerContextValue>(
    () => ({
      answers,
      readOnly: locked,
      review: null,
      setAnswer,
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
      guided,
      index,
      isPractice,
      locked,
      setAnswer,
      showEvidence,
    ]
  )

  const total = index.length
  const answeredCount = total - countBlanks(index, answers)
  const material: ReactNode =
    attempt.skill === 'listening' ? (
      <ListeningPane
        attempt={attempt}
        highlight={highlight}
        locked={locked}
        onAttemptChange={next => setDeadlineAt(next.deadlineAt)}
        onPartChange={setCurrentPart}
        onNotice={setNotice}
        sections={sections}
        showTranscript={isPractice && showTranscript}
        visiblePart={currentPart}
      />
    ) : section?.reading ? (
      <PassagePane
        highlight={highlight?.sectionKey === section.key ? highlight : null}
        material={section.reading}
        partLabel={`${testTitle} · ${partName(attempt.skill, section.order, attempt.mode)}`}
      />
    ) : null

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
      {attempt.skill === 'listening' ? (
        <ToolbarToggle
          checked={showTranscript}
          icon={<FileText aria-hidden="true" />}
          label="Transcript"
          onCheckedChange={setShowTranscript}
        />
      ) : null}
    </div>
  ) : null

  // Segmented toggle (aria-pressed): the documented raw-button exception.
  const panes = (
    <div
      aria-label="Choose panel"
      className="border-manga-black bg-manga-paper-soft rounded-control flex h-9 border-2 p-0.5"
      role="group"
    >
      {(
        [
          [
            'material',
            attempt.skill === 'listening' ? 'Audio' : 'Passage',
            attempt.skill === 'listening' ? Headphones : BookOpen,
          ],
          ['questions', 'Questions', ListChecks],
        ] as const
      ).map(([value, label, Icon]) => {
        const active = mobileTab === value

        return (
          <button
            aria-pressed={active}
            className={cn(
              'rounded-tag flex min-w-0 flex-auto items-center justify-center gap-1.5 px-2 font-sans text-[13px] font-black transition-colors',
              active
                ? 'bg-manga-black text-manga-white'
                : 'text-manga-black hover:bg-manga-white'
            )}
            key={value}
            onClick={() => setMobileTab(value)}
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
          panes={panes}
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

        <div
          className="grid min-h-0 flex-1 lg:grid-cols-[55fr_45fr]"
          ref={stageRef}
        >
          <section
            aria-label={
              attempt.skill === 'listening' ? 'Audio' : 'Reading passage'
            }
            className={cn(
              'bg-manga-white min-h-0 overflow-y-auto px-4 py-6 sm:px-8 lg:block',
              mobileTab === 'material' ? 'block' : 'hidden'
            )}
          >
            {material}
          </section>
          <section
            aria-label="Questions"
            className={cn(
              'border-manga-black bg-manga-pale-red/60 min-h-0 overflow-y-auto px-4 py-6 sm:px-8 lg:block lg:border-l-3',
              mobileTab === 'questions' ? 'block' : 'hidden'
            )}
          >
            <div className="text-manga-black mx-auto grid max-w-[70ch] gap-10 text-[16px] leading-[1.7]">
              {section?.groups.map(group => (
                <GroupBlock
                  group={group}
                  key={group.id}
                />
              ))}
            </div>
          </section>
        </div>

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
