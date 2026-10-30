'use client'

import { FilePenLine, LoaderCircle, Plus, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'

import { cn } from '@/lib/utils'
import {
  IELTS_SECTION_KEYS,
  IELTS_SKILL_LABELS,
  IELTS_TRACKS,
  type IeltsSkill,
  type IeltsTrack,
} from '@/modules/ielts/constants'
import { createIeltsTestApi } from '@/requests/ieltsAdminApi'

import { AreaField, BandField, TextField } from './fields'
import { ExamButton, ExamCard, segmentClass } from '@/components/ielts/ui'

type Mode = 'manual' | 'generate'

const MODES = [
  {
    hint: 'A blank draft you fill in section by section.',
    icon: FilePenLine,
    label: 'Manual',
    value: 'manual',
  },
  {
    hint: 'AI writes every section from your topics.',
    icon: Sparkles,
    label: 'Generate with AI',
    value: 'generate',
  },
] as const

const SECTION_COUNT = IELTS_SECTION_KEYS.length

/** `listening-2` -> skill + part, for the section plan. */
function splitKey(key: string) {
  const [skill, part] = key.split('-')

  return { part, skill: skill as IeltsSkill }
}

/**
 * "Manual" (blank draft, the default) or "Generate with AI" (pending
 * sections). In AI mode the plan shows which topic lands on which section, in
 * the order AI fills them.
 */
export function CreateTestPanel({ className }: { className?: string }) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('manual')
  const [title, setTitle] = useState('')
  const [track, setTrack] = useState<IeltsTrack>('academic')
  const [targetBand, setTargetBand] = useState(6.5)
  const [topics, setTopics] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const topicList = topics
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, SECTION_COUNT)

  const create = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')

    try {
      const { test } =
        mode === 'manual'
          ? await createIeltsTestApi({
              mode,
              title: title || 'New test',
              track,
              targetBand,
            })
          : await createIeltsTestApi({
              mode,
              title,
              track,
              targetBand,
              topics: topicList,
            })

      router.push(`/admin/ielts/${test.id}`)
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Couldn't create the test."
      )
      setBusy(false)
    }
  }

  return (
    <ExamCard
      className={className}
      eyebrow="Create test"
      title="New test"
    >
      <form
        className="grid gap-4"
        onSubmit={event => void create(event)}
      >
        <div
          aria-label="How to build it"
          className="grid gap-2"
          role="group"
        >
          {MODES.map(({ hint, icon: Icon, label, value }) => {
            const active = mode === value

            return (
              // Segmented toggle (aria-pressed): documented raw exception.
              <button
                aria-pressed={active}
                className={segmentClass(
                  active,
                  'flex items-center gap-3 p-3 text-left'
                )}
                key={value}
                onClick={() => setMode(value)}
                type="button"
              >
                <span
                  className={cn(
                    'rounded-tag grid size-9 shrink-0 place-items-center border-2',
                    active
                      ? 'border-manga-white bg-manga-red text-manga-white'
                      : 'border-manga-black bg-manga-paper-soft'
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className="size-4"
                  />
                </span>
                <span className="grid min-w-0 gap-0.5">
                  <span>{label}</span>
                  <span
                    className={cn(
                      'font-body text-xs font-semibold',
                      active ? 'text-manga-white/75' : 'text-muted-foreground'
                    )}
                  >
                    {hint}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        <TextField
          label="Test title"
          onChange={setTitle}
          placeholder={
            mode === 'generate' ? 'Leave blank to auto-name' : 'New test'
          }
          value={title}
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1">
            <span className="font-sans text-xs font-black">Track</span>
            <div className="flex gap-1.5">
              {IELTS_TRACKS.map(value => (
                // Segmented toggle (aria-pressed): documented raw exception.
                <button
                  aria-pressed={track === value}
                  className={segmentClass(
                    track === value,
                    'min-h-10 flex-1 px-2 capitalize'
                  )}
                  key={value}
                  onClick={() => setTrack(value)}
                  type="button"
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <BandField
            onChange={setTargetBand}
            value={targetBand}
          />
        </div>

        {mode === 'generate' ? (
          <>
            <AreaField
              hint={`${topicList.length}/${SECTION_COUNT} topics. One per line, in section order. Leave blank and AI picks.`}
              label="Suggested topics"
              onChange={setTopics}
              rows={4}
              value={topics}
            />
            <div className="grid gap-1.5">
              <span className="font-sans text-xs font-black">Section plan</span>
              <ol className="border-manga-black/25 rounded-control grid gap-1 border-2 border-dashed p-2">
                {IELTS_SECTION_KEYS.map((key, index) => {
                  const { part, skill } = splitKey(key)
                  const topic = topicList[index]

                  return (
                    <li
                      className="flex min-w-0 items-center gap-2 text-xs"
                      key={key}
                    >
                      <span className="bg-manga-black text-manga-white rounded-tag w-24 shrink-0 px-1.5 py-0.5 font-sans font-black">
                        {IELTS_SKILL_LABELS[skill]} {part}
                      </span>
                      <span
                        className={cn(
                          'min-w-0 truncate font-semibold',
                          !topic && 'text-muted-foreground italic'
                        )}
                        title={topic}
                      >
                        {topic || 'AI picks'}
                      </span>
                    </li>
                  )
                })}
              </ol>
            </div>
          </>
        ) : (
          <p className="bg-manga-paper-soft rounded-control text-muted-foreground p-3 text-xs font-semibold">
            Starts with {SECTION_COUNT} empty sections (4 Listening, 3 Reading,
            2 Writing). Open the editor to write or generate each one.
          </p>
        )}

        {error ? (
          <p
            className="text-manga-red text-sm font-semibold"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {/* When the panel scrolls inside a one-screen page, the button stays
            pinned to its bottom edge. */}
        <div className="border-manga-black/25 bg-manga-white sticky -bottom-4 -mb-4 grid gap-2 border-t-2 border-dashed pt-4 pb-4">
          <p className="text-muted-foreground text-xs font-semibold">
            {SECTION_COUNT} sections ·{' '}
            {track === 'academic' ? 'Academic' : 'General'} · Band{' '}
            {targetBand.toFixed(1)}
          </p>
          <ExamButton
            className="w-full"
            disabled={busy}
            icon={
              busy ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
              ) : (
                <Plus
                  aria-hidden="true"
                  className="size-4"
                />
              )
            }
            tone="ink"
            type="submit"
          >
            {busy ? 'Creating...' : 'Create draft'}
          </ExamButton>
        </div>
      </form>
    </ExamCard>
  )
}
