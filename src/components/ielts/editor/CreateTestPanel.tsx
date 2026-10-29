'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { cn } from '@/lib/utils'
import { createIeltsTestApi } from '@/requests/ieltsAdminApi'

import { AreaField, BandField, TextField } from './fields'
import { ExamButton, ExamCard } from '@/components/ielts/ui'

/** "Manual" (blank draft) or "Generate with AI" (pending sections). */
export function CreateTestPanel() {
  const router = useRouter()
  const [mode, setMode] = useState<'manual' | 'generate'>('generate')
  const [title, setTitle] = useState('')
  const [track, setTrack] = useState<'academic' | 'general'>('academic')
  const [targetBand, setTargetBand] = useState(6.5)
  const [topics, setTopics] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const create = async () => {
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
              topics: topics
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean)
                .slice(0, 9),
            })

      router.push(`/admin/ielts/${test.id}`)
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Couldn't create the test."
      )
      setBusy(false)
    }
  }

  const toggle = (
    value: string,
    current: string,
    onClick: () => void,
    label: string
  ) => (
    // Segmented toggle (aria-pressed): documented raw-button exception.
    <button
      aria-pressed={current === value}
      className={cn(
        'border-manga-black rounded-control min-h-10 flex-1 border-2 px-3 font-sans text-sm font-black',
        current === value ? 'bg-manga-red text-manga-white' : 'bg-manga-white'
      )}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  )

  return (
    <ExamCard
      eyebrow="Create test"
      title="New test"
    >
      <div className="flex gap-2">
        {toggle(
          'generate',
          mode,
          () => setMode('generate'),
          'Generate with AI'
        )}
        {toggle('manual', mode, () => setMode('manual'), 'Manual')}
      </div>
      <TextField
        label={
          mode === 'generate'
            ? 'Test title (leave blank to auto-name)'
            : 'Test title'
        }
        onChange={setTitle}
        value={title}
      />
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-end gap-2">
          {toggle('academic', track, () => setTrack('academic'), 'Academic')}
          {toggle('general', track, () => setTrack('general'), 'General')}
        </div>
        <BandField
          onChange={setTargetBand}
          value={targetBand}
        />
      </div>
      {mode === 'generate' ? (
        <AreaField
          hint="One topic per line, spread across the 9 sections in order. Leave blank and AI picks the topics."
          label="Suggested topics"
          onChange={setTopics}
          rows={4}
          value={topics}
        />
      ) : null}
      {error ? (
        <p
          className="text-manga-red text-sm font-semibold"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <ExamButton
        disabled={busy}
        onClick={() => void create()}
        tone="ink"
        type="button"
      >
        {busy ? 'Creating...' : 'Create draft'}
      </ExamButton>
    </ExamCard>
  )
}
