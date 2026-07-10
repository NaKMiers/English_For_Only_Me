import type { Metadata } from 'next'
import Link from 'next/link'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { Input } from '@/components/ui/input'
import { PageTag } from '@/components/ui/PageTag'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import {
  createSectionAction,
  createTopicAction,
  deleteSectionAction,
  deleteTopicAction,
} from '@/modules/dictation/content/adminActions'
import {
  listSectionsForTopic,
  listTopics,
} from '@/modules/dictation/content/contentRepository'
import type {
  DictationSectionApiRecord,
  DictationTopicApiRecord,
} from '@/modules/dictation/types'

export const metadata: Metadata = { title: 'Admin · Topics' }
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const inputClass = 'border-manga-black border-3 bg-manga-white px-3 py-2'
const submitClass =
  'border-manga-black bg-manga-paper-soft hover:bg-manga-pale-red inline-flex min-h-11 items-center border-3 px-4 font-sans text-sm font-black shadow-[3px_3px_0_var(--manga-black)]'
const dangerClass =
  'border-manga-black bg-manga-white hover:bg-manga-pale-red inline-flex min-h-9 items-center border-2 px-3 font-sans text-xs font-black uppercase'

function TopicBlock({
  topic,
  sections,
}: {
  topic: DictationTopicApiRecord
  sections: DictationSectionApiRecord[]
}) {
  return (
    <div className="border-manga-black bg-manga-white grid gap-3 border-3 p-4 shadow-[4px_4px_0_var(--manga-black)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link
            href={`/dictation/${topic.slug}`}
            className="text-manga-red font-sans text-lg font-black hover:underline"
          >
            {topic.title}
          </Link>
          {topic.hasVideoMedia && <PageTag tone="yellow">Video</PageTag>}
          <span className="text-manga-ink-soft text-xs">/{topic.slug}</span>
        </div>
        <form action={deleteTopicAction}>
          <input
            type="hidden"
            name="id"
            value={topic.id}
          />
          <button
            type="submit"
            className={dangerClass}
          >
            Delete topic
          </button>
        </form>
      </div>

      <div className="grid gap-2">
        {sections.length === 0 ? (
          <p className="text-manga-ink-soft text-sm">No sections yet.</p>
        ) : (
          <ul className="grid gap-1">
            {sections.map(section => (
              <li
                key={section.id}
                className="border-manga-black bg-manga-paper-soft flex items-center justify-between gap-2 border-2 px-3 py-2"
              >
                <span className="font-sans text-sm font-black">
                  {section.title}
                </span>
                <form action={deleteSectionAction}>
                  <input
                    type="hidden"
                    name="id"
                    value={section.id}
                  />
                  <button
                    type="submit"
                    className={dangerClass}
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form
          action={createSectionAction}
          className="flex flex-wrap gap-2"
        >
          <input
            type="hidden"
            name="topicId"
            value={topic.id}
          />
          <Input
            name="title"
            placeholder="New section title"
            required
            className={`${inputClass} flex-1`}
          />
          <button
            type="submit"
            className={submitClass}
          >
            Add section
          </button>
        </form>
      </div>
    </div>
  )
}

export default async function AdminTopicsPage() {
  let topics: DictationTopicApiRecord[] = []
  let sectionsByTopic: DictationSectionApiRecord[][] = []

  if (hasMongoDbUri()) {
    await connectDatabase()
    topics = await listTopics()
    sectionsByTopic = await Promise.all(
      topics.map(topic => listSectionsForTopic(topic.id))
    )
  }

  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          subtitle="Admin · Topics"
          authControl={<AuthControl />}
        />
      }
    >
      <section className="grid gap-5 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-sans text-[clamp(1.6rem,4vw,2.4rem)] leading-none font-black uppercase">
            Topics
          </h1>
          <Link
            href="/admin"
            className="text-manga-red text-sm font-black hover:underline"
          >
            ← Admin
          </Link>
        </header>

        <form
          action={createTopicAction}
          className="border-manga-black bg-manga-white grid gap-3 border-3 p-4 shadow-[4px_4px_0_var(--manga-black)]"
        >
          <h2 className="font-sans text-base font-black uppercase">
            New topic
          </h2>
          <Input
            name="title"
            placeholder="Title (e.g. Short Stories)"
            required
            className={inputClass}
          />
          <Input
            name="description"
            placeholder="Description (optional)"
            className={inputClass}
          />
          <div className="flex flex-wrap items-center gap-4">
            <Input
              name="order"
              type="number"
              placeholder="Order"
              defaultValue={0}
              className={`${inputClass} w-28`}
            />
            <label className="flex items-center gap-2 font-sans text-sm font-black">
              <input
                type="checkbox"
                name="hasVideoMedia"
                className="size-4"
              />
              Video badge
            </label>
            <button
              type="submit"
              className={submitClass}
            >
              Create topic
            </button>
          </div>
        </form>

        <div className="grid gap-4">
          {topics.length === 0 ? (
            <p className="text-manga-ink-soft text-sm">
              No topics yet. Create one above.
            </p>
          ) : (
            topics.map((topic, i) => (
              <TopicBlock
                key={topic.id}
                topic={topic}
                sections={sectionsByTopic[i] ?? []}
              />
            ))
          )}
        </div>
      </section>
    </MangaPageShell>
  )
}
