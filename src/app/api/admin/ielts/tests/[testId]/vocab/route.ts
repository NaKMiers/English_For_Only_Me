import { NextResponse } from 'next/server'

import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { IeltsTestModel } from '@/models/ielts/IeltsTestModel'
import { requireAdmin } from '@/modules/dictation/services/getCurrentUser'
import {
  ieltsDecisionError,
  ieltsJsonError,
  ieltsMissingMongo,
  ieltsRouteFailure,
  readJsonBody,
} from '@/modules/ielts/http'
import { parseTestId } from '@/modules/ielts/tests/testRouteDecisions'
import {
  listIeltsTestVocabForAdmin,
  saveIeltsTestVocab,
} from '@/modules/ielts/vocab/testVocabService'
import { parseSaveTestVocab } from '@/modules/ielts/vocab/testVocabRules'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ testId: string }>
}

async function readSlug(testId: string) {
  const doc = await IeltsTestModel.findById(testId, { slug: 1 }).lean()

  return doc?.slug ?? null
}

/** The words shown under the skill cards of this test, in order. */
export async function GET(_request: Request, context: RouteContext) {
  const t = await getMessages()
  const missing = ieltsMissingMongo()

  if (missing) return missing

  const id = parseTestId((await context.params).testId)

  if (!id.ok) return ieltsDecisionError(id)

  try {
    await requireAdmin()
    await connectDatabase()

    const slug = await readSlug(id.data)

    if (!slug) return ieltsJsonError(404, t.ieltsEditor.api.testNotFound)

    return NextResponse.json({
      entries: await listIeltsTestVocabForAdmin(slug),
    })
  } catch (error) {
    return ieltsRouteFailure(error, 'ielts admin vocab read failed')
  }
}

/** Replace the whole list (the editor always sends every word, in order). */
export async function PUT(request: Request, context: RouteContext) {
  const t = await getMessages()
  const missing = ieltsMissingMongo()

  if (missing) return missing

  const id = parseTestId((await context.params).testId)

  if (!id.ok) return ieltsDecisionError(id)

  const body = await readJsonBody(request)

  if (!body.ok) return ieltsDecisionError(body)

  const parsed = parseSaveTestVocab(body.data)

  if (!parsed.ok) return ieltsDecisionError(parsed)

  try {
    const admin = await requireAdmin()

    await connectDatabase()

    const slug = await readSlug(id.data)

    if (!slug) return ieltsJsonError(404, t.ieltsEditor.api.testNotFound)

    return NextResponse.json({
      entries: await saveIeltsTestVocab({
        entryIds: parsed.data.entryIds,
        slug,
        updatedBy: admin.id,
      }),
    })
  } catch (error) {
    return ieltsRouteFailure(error, 'ielts admin vocab save failed')
  }
}
