'use client'

import { useId, useMemo, useState } from 'react'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import { passageIntro } from '@/modules/ielts/passageIntro'
import { toPublicSection } from '@/modules/ielts/publicView'
import type { IeltsSection } from '@/modules/ielts/schema'
import { sharedGroupHeaders } from '@/modules/ielts/sharedGroupHeaders'

import { ListeningPart } from '../runner/ListeningPane'
import { PassagePane } from '../runner/PassagePane'
import { TaskVisual } from '../visual/TaskVisual'
import {
  IeltsAnswerContext,
  type IeltsAnswerContextValue,
} from '../widgets/answerContext'
import { GroupBlock } from '../widgets/GroupBlock'
import { SampleAnswerPanel } from '../widgets/SampleAnswerPanel'
import { WritingPrompt } from '../widgets/WritingPrompt'

/**
 * The "Show answers" toggle. It lives in the preview pane's header, so the
 * editor owns the state and hands it to `SectionPreview`.
 */
export function ShowAnswersSwitch({
  checked,
  onCheckedChange,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  const t = useMessages()
  const switchId = useId()

  return (
    <Label
      className="flex items-center gap-2 font-sans text-xs font-semibold"
      htmlFor={switchId}
    >
      <Switch
        checked={checked}
        id={switchId}
        onCheckedChange={onCheckedChange}
      />
      {t.ieltsEditor.preview.showAnswers}
    </Label>
  )
}

/**
 * Live preview with the learner widgets, laid out as the test page shows the
 * part (same exam styling, headings, audioscript, sample answer and question
 * list), so the editor sees what the learner sees. `showAnswers` fills every
 * widget with the first accepted answer, so a wrong key or a missing slot
 * shows up before publishing. Audioscript lines carry their index, which
 * evidence `blockIndex` refers to.
 */
export function SectionPreview({
  section,
  showAnswers,
}: {
  section: IeltsSection
  showAnswers: boolean
}) {
  const t = useMessages()
  const [scriptOpen, setScriptOpen] = useState(true)
  const publicSection = useMemo(
    () =>
      toPublicSection(section, {
        includeSampleAnswer: true,
        includeTranscript: true,
      }),
    [section]
  )
  const groupHeaders = sharedGroupHeaders(publicSection.groups)
  const context = useMemo<IeltsAnswerContextValue>(() => {
    const answers: IeltsAnswerContextValue['answers'] = {}

    if (showAnswers)
      for (const group of section.groups) {
        if (group.type === 'multiple-choice-multi') {
          answers[String(group.from)] = group.correctKeys
          continue
        }

        for (const question of group.questions)
          answers[String(question.number)] = question.answers[0] ?? ''
      }

    return {
      answers,
      readOnly: true,
      review: null,
      setAnswer: () => undefined,
      currentNumber: null,
      onFocusQuestion: () => undefined,
      onShowEvidence: null,
    }
  }, [section, showAnswers])
  const writing = publicSection.writing

  return (
    <div className="ielts-exam grid gap-6">
      {section.reading ? (
        <PassagePane
          heading={format(t.ieltsEditor.preview.passage, {
            number: section.order,
          })}
          highlight={null}
          intro={passageIntro(section)}
          material={section.reading}
          partLabel={section.title}
        />
      ) : null}
      {publicSection.listening ? (
        <ListeningPart
          highlight={null}
          lineNumbers
          onShowTranscriptChange={setScriptOpen}
          section={publicSection}
          showTranscript={scriptOpen}
        />
      ) : null}
      {writing ? (
        <div className="font-body grid w-full gap-4 text-[17px] leading-[1.7]">
          <h2 className="text-muted-foreground font-sans text-lg leading-none font-semibold tracking-wide">
            {format(t.ieltsEditor.preview.task, { number: writing.task })}
          </h2>
          <WritingPrompt text={writing.prompt} />
          {writing.visual ? (
            <TaskVisual
              className="p-0"
              visual={writing.visual}
            />
          ) : null}
          {writing.sampleAnswer ? (
            <SampleAnswerPanel text={writing.sampleAnswer} />
          ) : null}
        </div>
      ) : null}
      {publicSection.groups.length ? (
        <IeltsAnswerContext.Provider value={context}>
          <div className="text-ink border-exam-line grid w-full gap-7 border-t pt-5 text-[16px] leading-[1.6]">
            {publicSection.groups.map((group, index) => (
              <GroupBlock
                group={group}
                header={groupHeaders[index]}
                key={group.id}
                sectionTitle={publicSection.title}
              />
            ))}
          </div>
        </IeltsAnswerContext.Provider>
      ) : null}
    </div>
  )
}
