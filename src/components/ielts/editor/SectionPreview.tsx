'use client'

import { useId, useMemo, useState } from 'react'

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

/**
 * Live preview with the learner widgets. "Hiện đáp án" fills every widget
 * with the first accepted answer, so a wrong key or a missing slot shows up
 * before publishing.
 */
export function SectionPreview({ section }: { section: IeltsSection }) {
  const [showAnswers, setShowAnswers] = useState(true)
  const switchId = useId()
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
      <Label
        className="flex items-center gap-2 font-sans text-xs font-bold"
        htmlFor={switchId}
      >
        <Switch
          checked={showAnswers}
          id={switchId}
          onCheckedChange={setShowAnswers}
        />
        Hiện đáp án
      </Label>
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
              <span className="text-ex-muted font-sans text-xs tabular-nums">
                {index}
              </span>{' '}
              <strong className="font-sans">{line.speaker}:</strong> {line.text}
            </li>
          ))}
        </ol>
      ) : null}
      {section.writing ? (
        <div className="font-body grid gap-3 text-[16px] leading-[1.7]">
          <p className="whitespace-pre-line">{section.writing.prompt}</p>
          {section.writing.visual ? (
            <TaskVisual
              className="border-ex-line rounded-lg border"
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
