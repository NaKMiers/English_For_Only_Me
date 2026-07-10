'use server'

import { revalidatePath } from 'next/cache'

import { connectDatabase } from '@/lib/db/connectDatabase'
import {
  isDictationLevel,
  type DictationLevel,
} from '@/modules/dictation/levels'
import { requireAdmin } from '@/modules/dictation/services/getCurrentUser'

import {
  assignVideos,
  createSection,
  createTopic,
  deleteSection,
  deleteTopic,
  deleteVideo,
  reorderSections,
  reorderTopics,
  reorderVideos,
  updateSection,
  updateTopic,
} from './adminContentRepository'

// Every action re-checks the admin role server-side (never trust the client),
// even though the (admin) layout + proxy already gate the pages.
async function guardAdmin() {
  await requireAdmin()
  await connectDatabase()
}

function revalidateBrowse() {
  revalidatePath('/dictation')
  revalidatePath('/dictation/no-topic')
  revalidatePath('/admin/topics')
  revalidatePath('/admin/videos')
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim()
}

export async function createTopicAction(formData: FormData) {
  await guardAdmin()

  const title = str(formData, 'title')
  if (!title) return

  await createTopic({
    title,
    description: str(formData, 'description') || null,
    thumbnailUrl: str(formData, 'thumbnailUrl') || null,
    hasVideoMedia: formData.get('hasVideoMedia') === 'on',
    // order omitted - new topics append; ordering is via drag-to-reorder.
  })

  revalidateBrowse()
}

export async function updateTopicAction(formData: FormData) {
  await guardAdmin()

  const id = str(formData, 'id')
  if (!id) return

  await updateTopic(id, {
    title: str(formData, 'title'),
    description: str(formData, 'description') || null,
    thumbnailUrl: str(formData, 'thumbnailUrl') || null,
    hasVideoMedia: formData.get('hasVideoMedia') === 'on',
    // order omitted - managed by drag-to-reorder.
  })

  revalidateBrowse()
}

export async function deleteTopicAction(formData: FormData) {
  await guardAdmin()

  const id = str(formData, 'id')
  if (!id) return

  const result = await deleteTopic(id)
  if (result.ok) revalidateBrowse()
}

export async function createSectionAction(formData: FormData) {
  await guardAdmin()

  const topicId = str(formData, 'topicId')
  const title = str(formData, 'title')
  if (!topicId || !title) return

  await createSection(topicId, title)
  revalidateBrowse()
}

/** Reorder topics by their id order (drag-to-reorder). */
export async function reorderTopicsAction(ids: string[]) {
  await guardAdmin()
  await reorderTopics(ids)
  revalidateBrowse()
}

/** Reorder a topic's sections by their id order (drag-to-reorder). */
export async function reorderSectionsAction(ids: string[]) {
  await guardAdmin()
  await reorderSections(ids)
  revalidateBrowse()
}

export async function updateSectionAction(formData: FormData) {
  await guardAdmin()

  const id = str(formData, 'id')
  const title = str(formData, 'title')
  if (!id || !title) return

  await updateSection(id, { title })
  revalidateBrowse()
}

export async function deleteSectionAction(formData: FormData) {
  await guardAdmin()

  const id = str(formData, 'id')
  if (!id) return

  const result = await deleteSection(id)
  if (result.ok) revalidateBrowse()
}

export async function deleteVideoAction(formData: FormData) {
  await guardAdmin()

  const id = str(formData, 'id')
  if (!id) return

  await deleteVideo(id)
  revalidateBrowse()
}

/** Reorder videos by their id order (drag-to-reorder). */
export async function reorderVideosAction(ids: string[]) {
  await guardAdmin()
  await reorderVideos(ids)
  revalidateBrowse()
}

/** Remove a video from its section (unassign only - never deletes the video). */
export async function removeVideoFromSectionAction(formData: FormData) {
  await guardAdmin()

  const videoId = str(formData, 'videoId')
  if (!videoId) return

  await assignVideos([videoId], { sectionId: null })
  revalidateBrowse()
}

/**
 * Move one video to a topic + section (drag-and-drop). Sets only topic/section -
 * never the level. Either may be null (no topic / ungrouped).
 */
export async function moveVideoAction(input: {
  videoId: string
  topicId: string | null
  sectionId: string | null
}) {
  await guardAdmin()

  if (!input.videoId) return { ok: false as const }

  await assignVideos([input.videoId], {
    topicId: input.topicId,
    sectionId: input.sectionId,
  })
  revalidateBrowse()

  return { ok: true as const }
}

/** Update a single video's level in place (never touches topic/section). */
export async function updateVideoLevelAction(
  videoId: string,
  level: DictationLevel | null
) {
  await guardAdmin()

  if (!videoId) return
  if (level !== null && !isDictationLevel(level)) return

  await assignVideos([videoId], { level })
  revalidateBrowse()
}

export interface AssignVideosInput {
  videoIds: string[]
  topicId: string | null
  sectionId: string | null
  level: DictationLevel | null
}

/** Assign one or many videos (typed - called from the client video table). */
export async function assignVideosAction(input: AssignVideosInput) {
  await guardAdmin()

  const result = await assignVideos(input.videoIds, {
    topicId: input.topicId,
    sectionId: input.sectionId,
    level: input.level,
  })

  revalidateBrowse()
  return result
}
