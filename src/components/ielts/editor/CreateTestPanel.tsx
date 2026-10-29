'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { cn } from '@/lib/utils'
import { createIeltsTestApi } from '@/requests/ieltsAdminApi'

import { AreaField, NumberField, TextField } from './fields'
import { ExamButton, ExamCard } from '@/components/ielts/ui'

/** "Tạo đề tay" (blank draft) or "Tạo đề bằng AI" (pending sections). */
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
              title: title || 'Đề mới',
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
      setError(caught instanceof Error ? caught.message : 'Không tạo được đề.')
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
        'border-ex-line min-h-10 flex-1 rounded-lg border px-3 font-sans text-sm font-bold',
        current === value ? 'bg-ex-accent text-white' : 'bg-white'
      )}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  )

  return (
    <ExamCard
      eyebrow="Tạo đề"
      title="Đề mới"
    >
      <div className="flex gap-2">
        {toggle('generate', mode, () => setMode('generate'), 'Tạo đề bằng AI')}
        {toggle('manual', mode, () => setMode('manual'), 'Tạo đề tay')}
      </div>
      <TextField
        label={mode === 'generate' ? 'Tên đề (để trống để tự đặt)' : 'Tên đề'}
        onChange={setTitle}
        value={title}
      />
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-end gap-2">
          {toggle('academic', track, () => setTrack('academic'), 'Academic')}
          {toggle('general', track, () => setTrack('general'), 'General')}
        </div>
        <NumberField
          label="Band mục tiêu"
          max={9}
          min={4}
          onChange={setTargetBand}
          step={0.5}
          value={targetBand}
        />
      </div>
      {mode === 'generate' ? (
        <AreaField
          hint="Mỗi dòng một chủ đề, rải lần lượt cho 9 phần. Để trống thì AI tự chọn chủ đề."
          label="Chủ đề gợi ý"
          onChange={setTopics}
          rows={4}
          value={topics}
        />
      ) : null}
      {error ? (
        <p
          className="text-ex-wrong text-sm font-semibold"
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
        {busy ? 'Đang tạo...' : 'Tạo bản nháp'}
      </ExamButton>
    </ExamCard>
  )
}
