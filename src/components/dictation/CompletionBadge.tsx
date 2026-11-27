'use client'

import { Medal } from 'lucide-react'

import { PageTag } from '@/components/ui/PageTag'
import { useMessages } from '@/i18n/client'
import { getCompletionBadgeTier } from '@/modules/dictation/completionBadges'

/** Small tiered badge for how many times the current user has completed a video. */
export function CompletionBadge({
  completions,
  className,
}: {
  completions: number
  className?: string
}) {
  const t = useMessages()
  const tier = getCompletionBadgeTier(completions)
  if (!tier) return null

  return (
    <PageTag
      tone={tier}
      className={className}
    >
      <span className="flex items-center gap-1">
        <Medal
          aria-hidden="true"
          className="size-3"
        />
        {t.dictation.badges[tier]}
      </span>
    </PageTag>
  )
}
