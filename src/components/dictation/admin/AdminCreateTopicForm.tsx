'use client'

import { useActionState } from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ActionButton } from '@/components/ui/ActionButton'
import { useMessages } from '@/i18n/client'
import { createTopicAction } from '@/modules/dictation/content/adminActions'

import { AdminTopicThumbnailFields } from './AdminTopicThumbnailFields'

const input =
  'border-line min-h-11 rounded-control border bg-surface px-3 py-2 font-sans text-base font-semibold'

export function AdminCreateTopicForm() {
  const t = useMessages()
  // formResetKey remounts the thumbnail field after a successful create so
  // its preview (React state, not a native input) clears along with the form.
  const [formResetKey, action] = useActionState(
    async (key: number, formData: FormData) => {
      await createTopicAction(formData)
      return key + 1
    },
    0
  )

  return (
    <form
      action={action}
      encType="multipart/form-data"
      className="border-line bg-surface rounded-panel grid gap-3 border p-4"
    >
      <h2 className="font-sans text-base font-semibold">
        {t.admin.createTopic.heading}
      </h2>
      <div className="grid gap-3 md:grid-cols-[auto_1fr]">
        <AdminTopicThumbnailFields
          key={formResetKey}
          title={t.admin.createTopic.thumbnailTarget}
        />
        <div className="grid gap-3">
          <Input
            name="title"
            placeholder={t.admin.createTopic.titlePlaceholder}
            required
            className={input}
          />
          <Input
            name="description"
            placeholder={t.admin.createTopic.descriptionPlaceholder}
            className={input}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Label className="font-sans text-sm font-semibold">
          <Checkbox
            name="hasVideoMedia"
            value="on"
            defaultChecked
          />
          {t.admin.createTopic.videoBadge}
        </Label>
        <ActionButton
          type="submit"
          tone="primary"
        >
          {t.admin.createTopic.submit}
        </ActionButton>
      </div>
    </form>
  )
}
