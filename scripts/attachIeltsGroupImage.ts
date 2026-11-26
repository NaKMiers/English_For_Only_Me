import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { disconnect } from 'mongoose'

import { CACHE_TAGS } from '@/lib/db/cacheTags'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { createSignedUploadParams } from '@/lib/cloudinary/uploadAudio'
import { IeltsTestModel } from '@/models/ielts/IeltsTestModel'
import { checkTest } from '@/modules/ielts/consistency/checkTest'
import { ieltsTestSchema } from '@/modules/ielts/schema'

import { requestContentRevalidation } from './lib/requestContentRevalidation'

/*
 * Attach a picture (diagram, map, chart) to one question group of a test:
 * uploads the file to Cloudinary, sets the group's `imageUrl` on the newest
 * version of the test, bumps the section revision and re-runs the
 * consistency check before writing.
 *
 *   bun run ielts:attach-image -- <slug> <sectionKey> <firstQuestion> <file>
 *   bun run ielts:attach-image -- ielts-16-test-4 reading-1 1 ./qanat.png
 */

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
}

async function upload(file: string) {
  const type = MIME[path.extname(file).toLowerCase()]

  if (!type) throw new Error(`Unsupported image type: ${file}`)

  const signed = createSignedUploadParams('image')
  const form = new FormData()
  const bytes = await readFile(file)

  form.set('file', new Blob([bytes], { type }), path.basename(file))
  form.set('api_key', signed.apiKey)
  for (const [key, value] of Object.entries(signed.params)) form.set(key, value)

  const response = await fetch(signed.uploadUrl, { method: 'POST', body: form })
  const payload = (await response.json()) as { secure_url?: string }

  if (!response.ok || !payload.secure_url)
    throw new Error(`Upload of ${file} failed (${response.status})`)

  return payload.secure_url
}

async function main() {
  const [slug, sectionKey, fromArg, file] = process.argv.slice(2)
  const from = Number(fromArg)

  if (!slug || !sectionKey || !Number.isInteger(from) || !file)
    throw new Error(
      'Usage: attachIeltsGroupImage <slug> <sectionKey> <firstQuestion> <file>'
    )

  await connectDatabase()

  const doc = await IeltsTestModel.findOne({ slug }).sort({ version: -1 })
  if (!doc) throw new Error(`${slug} not found`)

  const test = ieltsTestSchema.parse(doc.toObject())
  const section = test.sections.find(item => item.key === sectionKey)
  if (!section) throw new Error(`${slug} has no section ${sectionKey}`)

  const group = section.groups.find(item => item.from === from)
  if (!group)
    throw new Error(`${sectionKey} has no group starting at question ${from}`)

  const imageUrl = await upload(file)

  console.info(`uploaded ${path.basename(file)}: ${imageUrl}`)

  group.imageUrl = imageUrl
  section.revision += 1

  const report = checkTest(test)
  if (report.errors.length) {
    console.error(report.errors)
    throw new Error('Patched test fails the consistency check')
  }

  await IeltsTestModel.updateOne(
    { _id: doc._id, 'sections.key': section.key },
    { $set: { 'sections.$': section } }
  )
  console.info(
    `Attached to ${slug} ${sectionKey} Q${group.from}-${group.to} (version ${doc.get('version')}, revision ${section.revision}).`
  )
  await requestContentRevalidation([CACHE_TAGS.ieltsContent])
  await disconnect()
}

main().catch(async error => {
  console.error(error)
  await disconnect()
  process.exit(1)
})
