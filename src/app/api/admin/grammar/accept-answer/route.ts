import { NextResponse } from 'next/server'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { GrammarPointModel } from '@/models/grammar/GrammarPointModel'
import { requireAdmin } from '@/modules/dictation/services/getCurrentUser'
import { trimTerminalPunctuation } from '@/modules/grammar/grading/resolveGrammarAnswer'
import { toGrammarApiError } from '@/modules/grammar/services/grammarApiErrors'
import {
  getMissingGrammarMongoResponse,
  parseGrammarAcceptAnswerRequest,
  type GrammarApiErrorDecision,
} from '@/modules/grammar/services/grammarRouteDecisions'

export const runtime = 'nodejs'

function jsonError(decision: GrammarApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

/**
 * Append a wording to a drill's accepted answers.
 *
 * This is what makes accept-lists survivable. A static list will always reject
 * some valid phrasing, and a grader that rejects correct English stops being
 * trusted - which kills the whole production-drill layer. One click turns a
 * static list into a living one.
 *
 * The write lands in Mongo; `grammar:export` carries it back into the committed
 * JSON so it survives the next regeneration and lands in git.
 */
export async function POST(request: Request) {
  const missingMongo = getMissingGrammarMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  try {
    const body: unknown = await request.json()
    const parsed = parseGrammarAcceptAnswerRequest(body)

    if (!parsed.ok) return jsonError(parsed)

    await requireAdmin()

    await connectDatabase()

    const answer = trimTerminalPunctuation(parsed.data.answer)

    if (!answer)
      return jsonError({
        status: 400,
        body: { message: 'Answer is empty after trimming punctuation.' },
      })

    const updated = await GrammarPointModel.findOneAndUpdate(
      { slug: parsed.data.slug, 'drills.id': parsed.data.drillId },
      { $addToSet: { 'drills.$.acceptedAnswers': answer } },
      { new: true }
    )
      .select('slug drills')
      .lean()

    if (!updated)
      return jsonError({
        status: 404,
        body: { message: 'Grammar point or drill not found.' },
      })

    const drill = updated.drills?.find(
      candidate => candidate.id === parsed.data.drillId
    )

    return NextResponse.json({
      acceptedAnswers: drill?.acceptedAnswers ?? [],
      drillId: parsed.data.drillId,
      slug: updated.slug,
    })
  } catch (error) {
    if (error instanceof SyntaxError)
      return jsonError({
        status: 400,
        body: { message: 'Request body must be valid JSON.' },
      })

    return jsonError(toGrammarApiError(error))
  }
}
