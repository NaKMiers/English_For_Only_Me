'use client'

import { useId, useMemo } from 'react'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toPublicSection } from '@/modules/ielts/publicView'
import type { IeltsSection } from '@/modules/ielts/schema'

import { PassagePane } from '../runner/PassagePane'
import { TaskVisual } from '../visual/TaskVisual'
import {
  IeltsAnswerContext,
  type IeltsAnswerContextValue,
} from '../widgets/answerContext'
import { GroupBlock } from '../widgets/GroupBlock'
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
  const switchId = useId()

  return (
    <Label
      className="flex items-center gap-2 font-sans text-xs font-black"
      htmlFor={switchId}
    >
      <Switch
        checked={checked}
        id={switchId}
        onCheckedChange={onCheckedChange}
      />
      Show answers
    </Label>
  )
}

/**
 * Live preview with the learner widgets. `showAnswers` fills every widget
 * with the first accepted answer, so a wrong key or a missing slot shows up
 * before publishing.
 */
export function SectionPreview({
  section,
  showAnswers,
}: {
  section: IeltsSection
  showAnswers: boolean
}) {
  const publicSection = useMemo(
    () => toPublicSection(section, { includeTranscript: true }),
    [section]
  )
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

  return (
    <div className="grid gap-4">
      {section.reading ? (
        <PassagePane
          highlight={null}
          material={section.reading}
          partLabel={section.title}
        />
      ) : null}
      {section.listening ? (
        <ol className="font-body grid gap-1 text-sm leading-[1.6]">
          {section.listening.lines.map((line, index) => (
            <li key={index}>
              <span className="text-muted-foreground font-sans text-xs tabular-nums">
                {index}
              </span>{' '}
              <strong className="font-sans">{line.speaker}:</strong> {line.text}
            </li>
          ))}
        </ol>
      ) : null}
      {section.writing ? (
        <div className="font-body grid gap-3 text-[16px] leading-[1.7]">
          <WritingPrompt text={section.writing.prompt} />
          {section.writing.visual ? (
            <TaskVisual
              className="border-manga-black rounded-control border-2"
              visual={section.writing.visual}
            />
          ) : null}
        </div>
      ) : null}
      <IeltsAnswerContext.Provider value={context}>
        <div className="grid gap-6 text-[16px] leading-[1.7]">
          {publicSection.groups.map(group => (
            <GroupBlock
              group={group}
              key={group.id}
            />
          ))}
        </div>
      </IeltsAnswerContext.Provider>
    </div>
  )
}
