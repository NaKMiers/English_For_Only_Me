'use client'

import { useRouter } from 'next/navigation'
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
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
import { ExamButton, segmentClass } from '../ui'
import { RunnerToolbar } from './RunnerToolbar'
import { useAttemptAnswers } from './useAttemptAnswers'
import { useMockDeadline } from './useMockDeadline'

interface Props {
  attempt: IeltsAttemptRecord
  backHref: string
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
export function IeltsRunner({ attempt, backHref, sections, testTitle }: Props) {
  const router = useRouter()
  const isMock = attempt.mode === 'mock'
  const isPractice = attempt.mode === 'practice'
  const open = attempt.status === 'in_progress'
  const [submitting, setSubmitting] = useState(false)
  const locked = !open || submitting
  // Filled in below once `finish` exists; the hook calls it on a late save.
  const finishRef = useRef<() => void>(() => undefined)
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
  const [currentPart, setCurrentPart] = useState(parts[0] ?? 1)
  const [currentNumber, setCurrentNumber] = useState<number | null>(
    index[0]?.number ?? null
  )
  const [mobileTab, setMobileTab] = useState<'material' | 'questions'>(
    'material'
  )
  const [guided, setGuided] = useState(false)
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
    <div className="flex flex-wrap items-center gap-3">
      <Label className="text-manga-black flex items-center gap-2 text-xs font-semibold">
        <Switch
          checked={guided}
          onCheckedChange={setGuided}
        />
        Guided
      </Label>
      {attempt.skill === 'listening' ? (
        <Label className="text-manga-black flex items-center gap-2 text-xs font-semibold">
          <Switch
            checked={showTranscript}
            onCheckedChange={setShowTranscript}
          />
          Transcript
        </Label>
      ) : null}
    </div>
  ) : null

  return (
    <IeltsAnswerContext.Provider value={context}>
      <div className="flex h-full min-h-0 flex-col">
        <RunnerToolbar
          backHref={backHref}
          modeLabel={MODE_LABELS[attempt.mode]}
          onBack={isMock && open ? () => setExitOpen(true) : undefined}
          onSubmit={requestSubmit}
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

        {/* Segmented toggle (aria-pressed): the documented raw-button exception. */}
        <div
          aria-label="Choose panel"
          className="border-manga-black bg-manga-white sticky top-0 flex shrink-0 gap-2 border-b-2 px-3 py-2 lg:hidden"
          role="group"
        >
          {(
            [
              ['material', attempt.skill === 'listening' ? 'Audio' : 'Passage'],
              ['questions', `Questions ${answeredCount}/${total}`],
            ] as const
          ).map(([value, label]) => (
            <button
              aria-pressed={mobileTab === value}
              className={segmentClass(mobileTab === value, 'min-h-10 flex-1')}
              key={value}
              onClick={() => setMobileTab(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[55fr_45fr]">
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
            {parts.length > 1 ? (
              <div
                aria-label="Choose section"
                className="mb-4 flex flex-wrap gap-2"
                role="group"
              >
                {parts.map(part => (
                  <button
                    aria-pressed={part === currentPart}
                    className={segmentClass(part === currentPart, 'min-h-9')}
                    key={part}
                    onClick={() => setCurrentPart(part)}
                    type="button"
                  >
                    {partName(attempt.skill, part, attempt.mode)}
                  </button>
                ))}
              </div>
            ) : null}
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

        <QuestionNavigator
          answers={answers}
          currentNumber={currentNumber}
          index={index}
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
