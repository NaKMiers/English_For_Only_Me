'use server'

import { revalidatePath } from 'next/cache'

import { connectDatabase } from '@/lib/db/connectDatabase'
import type { DictationLevel } from '@/modules/dictation/levels'
import { requireAdmin } from '@/modules/dictation/services/getCurrentUser'

import {
  assignVideos,
  createSection,
  createTopic,
  deleteSection,
  deleteTopic,
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
    order: Number(str(formData, 'order')) || 0,
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
    order: Number(str(formData, 'order')) || 0,
  })

  revalidateBrowse()
}

export async function deleteTopicAction(formData: FormData) {
  await guardAdmin()

  const id = str(formData, 'id')
  if (!id) return

  await deleteTopic(id)
  revalidateBrowse()
}

export async function createSectionAction(formData: FormData) {
  await guardAdmin()

  const topicId = str(formData, 'topicId')
  const title = str(formData, 'title')
  if (!topicId || !title) return

  await createSection(topicId, title, Number(str(formData, 'order')) || 0)
  revalidateBrowse()
}

export async function deleteSectionAction(formData: FormData) {
  await guardAdmin()

  const id = str(formData, 'id')
  if (!id) return

  await deleteSection(id)
  revalidateBrowse()
}

export interface AssignVideosInput {
  videoIds: string[]
  topicId: string | null
  sectionId: string | null
  level: DictationLevel | null
}

/** Assign one or many videos (typed — called from the client video table). */
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
