import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  LoaderCircle,
  PenLine,
  VolumeX,
  Wrench,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { isSectionReady } from '@/modules/ielts/consistency/checkTest'
import {
  IELTS_SKILL_LABELS,
  IELTS_SKILLS,
  type IeltsGenStatus,
} from '@/modules/ielts/constants'
import type { IeltsSection } from '@/modules/ielts/schema'

export const GEN_LABELS: Record<IeltsGenStatus, string> = {
  pending: 'Pending',
  generating: 'Generating...',
  needsRepair: 'Needs repair',
  ready: 'Ready',
  failed: 'Failed',
  manual: 'Manual',
}

const STATUS_ICONS = {
  pending: CircleDashed,
  generating: LoaderCircle,
  needsRepair: Wrench,
  ready: CircleCheck,
  failed: CircleAlert,
  manual: PenLine,
} satisfies Record<IeltsGenStatus, unknown>

type SectionKey = IeltsSection['key']

interface Props {
  /** Section key with a generation request in flight, if any. */
  busyKey?: string
  className?: string
  /** Keys of sections with unsaved edits. */
  dirtyKeys: string[]
  onSelect: (key: SectionKey) => void
  sections: IeltsSection[]
  selectedKey?: SectionKey
}

/** Done means ready for learners: see `isSectionReady`. */
export const isDone = isSectionReady

export function statusOf(section: IeltsSection, busy: boolean) {
  if (busy) return { Icon: LoaderCircle, label: 'Generating...' }

  if (
    section.skill === 'listening' &&
    section.genStatus === 'ready' &&
    !section.listening?.audio
  )
    return { Icon: VolumeX, label: 'Ready, no audio yet' }

  return {
    Icon: STATUS_ICONS[section.genStatus],
    label: GEN_LABELS[section.genStatus],
  }
}

/**
 * One compact strip of every part, grouped by skill: a label with its done
 * count, then a small numbered tile per part carrying its status icon (full
 * status in the tooltip and accessible name) and a dot while it has unsaved
 * edits. On a phone each skill gets its own row behind a fixed-width
 * label, so the tiles line up.
 */
export function SectionPicker({
  busyKey,
  className,
  dirtyKeys,
  onSelect,
  sections,
  selectedKey,
}: Props) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 max-sm:flex-col max-sm:items-start',
        className
      )}
    >
      {IELTS_SKILLS.map(skill => {
        const parts = sections.filter(item => item.skill === skill)

        if (!parts.length) return null

        const done = parts.filter(isDone).length

        return (
          <section
            aria-label={IELTS_SKILL_LABELS[skill]}
            className="flex min-w-0 items-center gap-2"
            key={skill}
          >
            <h3 className="grid shrink-0 font-sans leading-none max-sm:w-20">
              <span className="text-xs font-black uppercase">
                {IELTS_SKILL_LABELS[skill]}
              </span>
              <span
                className={cn(
                  'text-[11px] font-black tabular-nums',
                  done === parts.length ? 'text-sky-800' : 'text-manga-ink-soft'
                )}
              >
                {done}/{parts.length}
              </span>
            </h3>
            <ul className="flex gap-1">
              {parts.map(item => {
                const selected = item.key === selectedKey
                const dirty = dirtyKeys.includes(item.key)
                const busy = busyKey === item.key
                const { Icon, label } = statusOf(item, busy)
                const name = `${IELTS_SKILL_LABELS[skill]} ${item.order}: ${label}${dirty ? ', unsaved' : ''}`

                return (
                  <li key={item.key}>
                    {/* Section picker (aria-pressed): documented raw exception. */}
                    <button
                      aria-label={name}
                      aria-pressed={selected}
                      className={cn(
                        'border-manga-black rounded-tag sticker-press relative grid size-9 place-items-center border-2 font-sans text-sm font-black',
                        selected
                          ? 'bg-manga-black text-manga-white translate-x-[2px] translate-y-[2px]'
                          : 'bg-manga-white hover:bg-manga-pale-red shadow-[2px_2px_0_var(--manga-black)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
                        !selected &&
                          isDone(item) &&
                          'bg-sky-50 hover:bg-sky-100',
                        !selected &&
                          (item.genStatus === 'failed' ||
                            item.genStatus === 'needsRepair') &&
                          'text-manga-red'
                      )}
                      onClick={() => onSelect(item.key)}
                      title={name}
                      type="button"
                    >
                      {item.order}
                      <Icon
                        aria-hidden="true"
                        className={cn(
                          'absolute top-0.5 right-0.5 size-2.5',
                          busy && 'animate-spin'
                        )}
                      />
                      {dirty ? (
                        <span
                          aria-hidden="true"
                          className={cn(
                            'absolute bottom-0.5 left-0.5 size-1.5 rounded-full',
                            selected ? 'bg-manga-white' : 'bg-manga-red'
                          )}
                        />
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
