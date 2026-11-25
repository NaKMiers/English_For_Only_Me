import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { disconnect } from 'mongoose'

import { CACHE_TAGS } from '@/lib/db/cacheTags'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { createSignedUploadParams } from '@/lib/cloudinary/uploadAudio'
import { IeltsTestModel } from '@/models/ielts/IeltsTestModel'
import { checkTest } from '@/modules/ielts/consistency/checkTest'
import { ieltsTestSchema, type IeltsQuestionGroup } from '@/modules/ielts/schema'

import { requestContentRevalidation } from './lib/requestContentRevalidation'

/* One-off: make ielts-1-test-1 listening-1 match the original paper layout. */

const IMAGE_DIR = process.argv[2]
const SLUG = 'ielts-1-test-1'
const KEY = 'listening-1'

async function upload(name: string) {
  const signed = createSignedUploadParams('image')
  const form = new FormData()
  const bytes = await readFile(path.join(IMAGE_DIR, `${name}.png`))

  form.set('file', new Blob([bytes], { type: 'image/png' }), `${name}.png`)
  form.set('api_key', signed.apiKey)
  for (const [key, value] of Object.entries(signed.params)) form.set(key, value)

  const response = await fetch(signed.uploadUrl, { method: 'POST', body: form })
  const payload = (await response.json()) as { secure_url?: string }

  if (!response.ok || !payload.secure_url)
    throw new Error(`Upload of ${name} failed`)

  return payload.secure_url
}

const PICTURE_INSTRUCTION = 'Choose the correct letter, A, B, C or D.'

const OPTION_TEXTS: Record<string, string[]> = {
  'l1-g1': [
    'A soft case with two buckles at the front',
    'A box-type case with a handle',
    'A soft case with one buckle at the front',
    'A box-type case with a clasp',
  ],
  'l1-g2': [
    'Sagi at the bottom left, scratch to its right',
    'Sagi at the bottom right, scratch just above it',
    'Sagi at the bottom left, scratch directly above it',
    'Sagi at the bottom right, scratch on the left',
  ],
  'l1-g4': [
    'Standing on the platform, briefcase on the floor beside her',
    'Walking along the platform, no briefcase',
    'Walking past a briefcase on the platform',
    'Standing on the platform, no briefcase beside her',
  ],
  'l1-g5': ['About 4.25', 'About 5.25', '5.30', 'About 5.55'],
}

const PICTURES: Record<string, string> = {
  'l1-g1': 'q1',
  'l1-g2': 'q2',
  'l1-g4': 'q4',
  'l1-g5': 'q5',
}

const EXAMPLE = [
  '*(Example)*',
  'What has the woman lost? **A**',
  'A. a briefcase',
  'B. a suitcase',
  'C. a handbag',
  'D. a wallet',
].join('\n\n')

const FORM_BODY = [
  'Name: Mary {{q6}}',
  'Address: Flat 2, {{q7}}',
  '{{q8}} Road, Canterbury',
  'Telephone: {{q9}}',
  'Estimated value of lost item: £{{q10}}',
].join('\n\n')

async function main() {
  if (!IMAGE_DIR) throw new Error('Pass the folder holding q1/q2/q4/q5.png')

  await connectDatabase()

  const doc = await IeltsTestModel.findOne({ slug: SLUG }).sort({ version: -1 })
  if (!doc) throw new Error(`${SLUG} not found`)

  const test = ieltsTestSchema.parse(doc.toObject())
  const section = test.sections.find(item => item.key === KEY)
  if (!section) throw new Error(`${KEY} not found`)

  const urls: Record<string, string> = {}
  for (const [id, name] of Object.entries(PICTURES)) {
    urls[id] = await upload(name)
    console.info(`uploaded ${name}: ${urls[id]}`)
  }

  section.groups = section.groups.map((group): IeltsQuestionGroup => {
    if (urls[group.id])
      return {
        ...group,
        instruction: PICTURE_INSTRUCTION,
        imageUrl: urls[group.id],
        options: group.options.map((option, index) => ({
          ...option,
          text: OPTION_TEXTS[group.id][index],
        })),
        questions:
          group.id === 'l1-g4'
            ? group.questions.map(question => ({ ...question, answers: ['A'] }))
            : group.questions,
      }

    if (group.id === 'l1-g3') return { ...group, body: EXAMPLE }

    if (group.id === 'l1-g6')
      return {
        ...group,
        type: 'form-completion',
        title: 'PERSONAL DETAILS FORM',
        body: FORM_BODY,
      }

    return group
  })
  section.revision += 1

  const report = checkTest(test)
  if (report.errors.length) {
    console.error(report.errors)
    throw new Error('Patched test fails the consistency check')
  }

  await IeltsTestModel.updateOne(
    { _id: doc._id, 'sections.key': KEY },
    { $set: { 'sections.$': section } }
  )
  console.info(`Patched ${SLUG} ${KEY} (revision ${section.revision}).`)
  await requestContentRevalidation([CACHE_TAGS.ieltsContent])
  await disconnect()
}

main().catch(async error => {
  console.error(error)
  await disconnect()
  process.exit(1)
})
