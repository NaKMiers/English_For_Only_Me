'use client'

import { Upload } from 'lucide-react'
import { useId, useRef, useState } from 'react'

import { uploadIeltsFileApi } from '@/requests/ieltsAdminApi'

import { TextField } from './fields'
import { ExamButton } from '@/components/ielts/ui'

/** URL field plus a direct-to-Cloudinary image upload (admin signed). */
export function ImageUploadField({
  label,
  onChange,
  value,
}: {
  label: string
  onChange: (url: string) => void
  value: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const upload = async (file: File) => {
    setBusy(true)
    setError('')

    try {
      onChange((await uploadIeltsFileApi('image', file)).url)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <TextField
          className="min-w-48 flex-1"
          label={label}
          onChange={onChange}
          value={value}
        />
        {/* File input behind an sr-only trigger: documented raw exception. */}
        <input
          accept="image/*"
          className="sr-only"
          id={inputId}
          onChange={event => {
            const file = event.target.files?.[0]

            if (file) void upload(file)
            event.target.value = ''
          }}
          ref={inputRef}
          type="file"
        />
        <ExamButton
          disabled={busy}
          icon={
            <Upload
              aria-hidden="true"
              className="size-4"
            />
          }
          onClick={() => inputRef.current?.click()}
          tone="paper"
          type="button"
        >
          {busy ? 'Uploading...' : 'Upload image'}
        </ExamButton>
      </div>
      {error ? (
        <p
          className="text-manga-red text-xs font-semibold"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
