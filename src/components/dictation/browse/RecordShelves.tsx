import { Disc3, Medal, Music, Sparkles, type LucideIcon } from 'lucide-react'
import Link from 'next/link'

import { format } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import { cn } from '@/lib/utils'

import type { ShelvedTopic, TopicShelf } from './listeningJourney'
import { getTopicTileImageUrl } from './topicThumbnailUrl'

/** One topic as a record: what the shelves need to draw it. */
export interface RecordTopic {
  href: string
  id: string
  levelRange: string | null
  /** The "Uncategorized" bucket: a plain label, no thumbnail. */
  muted?: boolean
  thumbnailUrl: string | null
  title: string
  total: number
}

interface Props {
  labels: Messages['dictation']
  shelves: Record<TopicShelf, ShelvedTopic<RecordTopic>[]>
}

const SHELVES: { icon: LucideIcon; key: TopicShelf; tone: string }[] = [
  { icon: Disc3, key: 'playing', tone: 'text-accent-blue' },
  { icon: Sparkles, key: 'new', tone: 'text-accent-purple' },
  { icon: Medal, key: 'gold', tone: 'text-accent-orange' },
]

// Vinyl grooves: fixed illustration colours, the same in both themes.
const GROOVES =
  'repeating-radial-gradient(circle at center, #2a2027 0 1.5px, #171215 1.5px 3.5px)'
const GOLD_GROOVES =
  'repeating-radial-gradient(circle at center, #f2c14e 0 1.5px, #d49a12 1.5px 3.5px)'

function Record({
  item,
  labels,
}: {
  item: ShelvedTopic<RecordTopic>
  labels: Messages['dictation']
}) {
  const t = labels.journey
  const { done, shelf, topic, total } = item
  const percent = total > 0 ? Math.round((done / total) * 100) : 0
  const gold = shelf === 'gold'
  const image = topic.muted ? null : getTopicTileImageUrl(topic.thumbnailUrl)
  const initial = topic.title.trim().charAt(0).toUpperCase() || '?'

  return (
    <li className="w-32 shrink-0 sm:w-36">
      <Link
        aria-label={format(t.recordLabel, { done, title: topic.title, total })}
        className="record-link soft-press hover-pop group hover:bg-surface/80 grid justify-items-center gap-2.5 rounded-[22px] p-2 text-center"
        href={topic.href}
      >
        {/* The ring around the record fills with the topic's progress. */}
        <span
          aria-hidden="true"
          className={cn(
            'grid size-28 place-items-center rounded-full p-[5px] shadow-sm transition-shadow group-hover:shadow-md sm:size-32',
            gold && 'ring-accent-orange/30 ring-4'
          )}
          style={{
            background: `conic-gradient(${
              gold ? 'var(--accent-orange)' : 'var(--accent-blue)'
            } ${percent}%, var(--line) 0)`,
          }}
        >
          <span
            className={cn(
              'record-disc grid size-full place-items-center rounded-full',
              shelf === 'playing' && 'record-turning'
            )}
            style={{ background: gold ? GOLD_GROOVES : GROOVES }}
          >
            <span
              className={cn(
                'grid size-12 place-items-center overflow-hidden rounded-full border-2 font-sans text-lg font-semibold sm:size-14',
                gold
                  ? 'border-pastel-lemon bg-pastel-lemon text-accent-orange'
                  : 'border-pastel-sky bg-pastel-sky text-accent-blue'
              )}
            >
              {image ? (
                // A plain lazy img, like the topic tiles: res.cloudinary.com
                // is not in images.remotePatterns.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="size-full object-cover"
                  decoding="async"
                  height={64}
                  loading="lazy"
                  src={image}
                  width={64}
                />
              ) : topic.muted ? (
                <Music className="size-5" />
              ) : (
                initial
              )}
            </span>
          </span>
        </span>
        <span className="grid w-full gap-0.5">
          <span className="line-clamp-2 font-sans text-sm leading-snug font-medium">
            {topic.title}
          </span>
          <span className="text-ink-soft text-xs tabular-nums">
            {format(t.recordProgress, { done, total })}
            {topic.levelRange ? ` · ${topic.levelRange}` : ''}
          </span>
        </span>
      </Link>
    </li>
  )
}

/**
 * The topics as records on three shelves: the ones on the turntable (started,
 * closest to gold first), the new ones, and the gold records the learner has
 * finished. Each record's ring fills as its videos are done, so the page
 * shows at a glance how much has been listened to. Empty shelves are left out.
 */
export function RecordShelves({ labels, shelves }: Props) {
  const t = labels.journey

  return (
    <div className="grid gap-4">
      {SHELVES.map(({ icon: Icon, key, tone }) => {
        const items = shelves[key]

        if (items.length === 0) return null

        return (
          <section
            aria-labelledby={`shelf-${key}`}
            className={cn(
              'rounded-panel grid gap-3 p-3 sm:p-4',
              key === 'gold'
                ? 'from-pastel-lemon/70 to-pastel-cream/40 bg-linear-120'
                : 'bg-tint-soft'
            )}
            key={key}
          >
            <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Icon
                aria-hidden="true"
                className={cn('size-5 shrink-0', tone)}
              />
              <h3
                className="font-sans text-base font-medium"
                id={`shelf-${key}`}
              >
                {t.shelves[key]}
              </h3>
              <span className="bg-surface text-ink-soft rounded-full px-2.5 py-0.5 text-xs tabular-nums">
                {items.length}
              </span>
              <span className="text-ink-soft text-xs">{t.shelfHint[key]}</span>
            </header>
            {/* The shelf: records stand side by side and wrap. */}
            <ul className="motion-stagger flex flex-wrap gap-x-2 gap-y-3">
              {items.map(item => (
                <Record
                  item={item}
                  key={item.topic.id}
                  labels={labels}
                />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
