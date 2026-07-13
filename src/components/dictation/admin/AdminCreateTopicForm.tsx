'use client'

import { useActionState } from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MangaButton } from '@/components/ui/MangaButton'
import { createTopicAction } from '@/modules/dictation/content/adminActions'

import { AdminTopicThumbnailFields } from './AdminTopicThumbnailFields'

const input =
  'border-manga-black min-h-11 rounded-none border-3 bg-manga-white px-3 py-2 font-sans text-base font-black'

export function AdminCreateTopicForm() {
  // formResetKey remounts the thumbnail field after a successful create so
  // its preview (React state, not a native input) clears along with the form.
  const [formResetKey, action] = useActionState(async (key: number, formData: FormData) => {
    await createTopicAction(formData)
    return key + 1
  }, 0)

  return (
    <form
      action={action}
      encType="multipart/form-data"
      className="border-manga-black bg-manga-white grid gap-3 border-3 p-4 shadow-[4px_4px_0_var(--manga-black)]"
    >
      <h2 className="font-sans text-base font-black uppercase">New topic</h2>
      <div className="grid gap-3 md:grid-cols-[auto_1fr]">
        <AdminTopicThumbnailFields
          key={formResetKey}
          title="new topic"
        />
        <div className="grid gap-3">
          <Input
            name="title"
            placeholder="Title (e.g. Short Stories)"
            required
            className={input}
          />
          <Input
            name="description"
            placeholder="Description (optional)"
            className={input}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Label className="font-sans text-sm font-black">
          <Checkbox
            name="hasVideoMedia"
            value="on"
            defaultChecked
          />
          Video badge
        </Label>
        <MangaButton
          type="submit"
          tone="primary"
        >
          Create topic
        </MangaButton>
      </div>
    </form>
  )
}
