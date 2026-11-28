import { format, plural } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import type { PathNext } from '@/modules/grammar/path/buildGrammarPath'

/**
 * Where the path's next step lives and what to call it. Shared by the notes
 * page and the session end's fallback next stop. Pure.
 */
export function nextHref(next: PathNext) {
  switch (next.kind) {
    case 'lesson':
      return `/grammar/lessons/${next.lessonId}`
    case 'checkpoint':
      return `/grammar/units/${next.unitId}/checkpoint`
    case 'review':
      return `/grammar/lessons/${next.lessonId}/review`
    case 'weak':
      return '/grammar/practice'
    case 'done':
      return null
  }
}

export function nextLabel(
  t: Messages['grammar']['path']['next'],
  next: PathNext
) {
  switch (next.kind) {
    case 'lesson':
      return format(t.lesson, { title: next.title })
    case 'checkpoint':
      return format(t.checkpoint, { title: next.title })
    case 'review':
      return format(t.review, { title: next.title })
    case 'weak':
      return plural(t.weak, next.count)
    case 'done':
      return t.done
  }
}
