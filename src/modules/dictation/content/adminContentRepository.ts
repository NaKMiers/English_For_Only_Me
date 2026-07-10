import 'server-only'

import { DictationSectionModel } from '@/models/dictation/DictationSectionModel'
import { DictationTopicModel } from '@/models/dictation/DictationTopicModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import type { DictationLevel } from '@/modules/dictation/levels'

import { slugify } from './slugify'

export interface TopicInput {
  title: string
  description?: string | null
  thumbnailUrl?: string | null
  hasVideoMedia?: boolean
  order?: number
}

/**
 * Generate a slug unique across topics, appending -2, -3, ... on collision.
 * `excludeId` skips the topic being renamed so it can keep an equivalent slug.
 */
async function uniqueTopicSlug(
  title: string,
  excludeId?: string
): Promise<string> {
  const base = slugify(title)
  let candidate = base

  for (let n = 2; ; n += 1) {
    const clash = await DictationTopicModel.exists({
      slug: candidate,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
    if (!clash) return candidate
    candidate = `${base}-${n}`
  }
}

export async function createTopic(input: TopicInput) {
  const slug = await uniqueTopicSlug(input.title)
  // Append at the end; order is otherwise managed by drag-to-reorder.
  const order = input.order ?? (await DictationTopicModel.countDocuments())

  const topic = await DictationTopicModel.create({
    slug,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    thumbnailUrl: input.thumbnailUrl?.trim() || null,
    hasVideoMedia: input.hasVideoMedia ?? false,
    order,
  })

  return String(topic._id)
}

/** Set each topic's order to its index in the given id list (drag reorder). */
export async function reorderTopics(ids: string[]) {
  if (ids.length === 0) return

  await DictationTopicModel.bulkWrite(
    ids.map((id, index) => ({
      updateOne: { filter: { _id: id }, update: { $set: { order: index } } },
    }))
  )
}

/** Set each section's order to its index in the given id list (drag reorder). */
export async function reorderSections(ids: string[]) {
  if (ids.length === 0) return

  await DictationSectionModel.bulkWrite(
    ids.map((id, index) => ({
      updateOne: { filter: { _id: id }, update: { $set: { order: index } } },
    }))
  )
}

export async function updateTopic(id: string, patch: Partial<TopicInput>) {
  const update: Record<string, unknown> = {}

  if (patch.title !== undefined) {
    update.title = patch.title.trim()
    // Keep the slug in sync with the title (regenerated, uniqued). Changes the
    // public URL — acceptable pre-launch; revisit if URLs must be stable.
    update.slug = await uniqueTopicSlug(patch.title, id)
  }
  if (patch.description !== undefined)
    update.description = patch.description?.trim() || null
  if (patch.thumbnailUrl !== undefined)
    update.thumbnailUrl = patch.thumbnailUrl?.trim() || null
  if (patch.hasVideoMedia !== undefined)
    update.hasVideoMedia = patch.hasVideoMedia
  if (patch.order !== undefined) update.order = patch.order

  await DictationTopicModel.updateOne({ _id: id }, { $set: update })
}

/**
 * Delete a topic and cascade: its videos fall back to no-topic/ungrouped and its
 * sections are removed. Videos are never deleted — only unfiled.
 */
export async function deleteTopic(id: string) {
  await DictationVideoModel.updateMany(
    { topicId: id },
    { $set: { topicId: null, sectionId: null } }
  )
  await DictationSectionModel.deleteMany({ topicId: id })
  await DictationTopicModel.deleteOne({ _id: id })
}

export async function createSection(
  topicId: string,
  title: string,
  order?: number
) {
  // Append at the end of the topic's sections when no explicit order given.
  const finalOrder =
    order ?? (await DictationSectionModel.countDocuments({ topicId }))
  const section = await DictationSectionModel.create({
    topicId,
    title: title.trim(),
    order: finalOrder,
  })

  return String(section._id)
}

export async function updateSection(
  id: string,
  patch: { title?: string; order?: number }
) {
  const update: Record<string, unknown> = {}
  if (patch.title !== undefined) update.title = patch.title.trim()
  if (patch.order !== undefined) update.order = patch.order

  await DictationSectionModel.updateOne({ _id: id }, { $set: update })
}

/** Delete a section; its videos fall back to the topic's Ungrouped bucket. */
export async function deleteSection(id: string) {
  await DictationVideoModel.updateMany(
    { sectionId: id },
    { $set: { sectionId: null } }
  )
  await DictationSectionModel.deleteOne({ _id: id })
}

/** Archive a video so it disappears from admin and app browse surfaces. */
export async function deleteVideo(id: string) {
  await DictationVideoModel.updateOne(
    { _id: id, status: { $ne: 'archived' } },
    { $set: { status: 'archived' } }
  )
}

/** Set each video's display order to its index in the given id list. */
export async function reorderVideos(ids: string[]) {
  if (ids.length === 0) return

  await DictationVideoModel.bulkWrite(
    ids.map((id, index) => ({
      updateOne: { filter: { _id: id }, update: { $set: { order: index } } },
    }))
  )
}

export interface VideoAssignment {
  topicId?: string | null
  sectionId?: string | null
  level?: DictationLevel | null
}

/**
 * Assign one or many videos to a topic/section/level (E3 bulk-assign). Only the
 * provided fields are set; passing null clears that field.
 */
export async function assignVideos(
  videoIds: string[],
  assignment: VideoAssignment
) {
  if (videoIds.length === 0) return { modified: 0 }

  const update: Record<string, unknown> = {}
  if (assignment.topicId !== undefined) update.topicId = assignment.topicId
  if (assignment.sectionId !== undefined)
    update.sectionId = assignment.sectionId
  if (assignment.level !== undefined) update.level = assignment.level

  if (Object.keys(update).length === 0) return { modified: 0 }

  const result = await DictationVideoModel.updateMany(
    { _id: { $in: videoIds } },
    { $set: update }
  )

  return { modified: result.modifiedCount ?? 0 }
}
