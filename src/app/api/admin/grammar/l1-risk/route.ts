import { NextResponse } from 'next/server'

import {
  loadGrammarContent,
  writeGrammarContentAtomically,
} from '@/modules/grammar/seed/loadGrammarContent'
import { toGrammarApiError } from '@/modules/grammar/services/grammarApiErrors'
import {
  isL1RiskToolEnabled,
  parseL1RiskObservedRequest,
  type GrammarApiErrorDecision,
} from '@/modules/grammar/services/grammarRouteDecisions'
import { applyL1RiskPatch } from '@/modules/grammar/taxonomy/applyL1RiskPatch'

export const runtime = 'nodejs'

function jsonError(decision: GrammarApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

/**
 * Record the builder's own judgment of how hard one grammar point really is.
 *
 * Writes `l1RiskObserved` into the committed taxonomy file and nothing else. No
 * database, and no git: the app writes the file, the human reads the diff and
 * commits it. Making the commit here would mean a route deciding what enters
 * version control, which is the one place a mistake cannot be inspected before
 * it lands.
 *
 * Development only, and hard 404 otherwise - see `isL1RiskToolEnabled`.
 */
export async function POST(request: Request) {
  if (!isL1RiskToolEnabled())
    return NextResponse.json({ message: 'Not found.' }, { status: 404 })

  try {
    const body: unknown = await request.json()
    const parsed = parseL1RiskObservedRequest(body)

    if (!parsed.ok) return jsonError(parsed)

    const points = loadGrammarContent()
    const previous = points.find(point => point.slug === parsed.data.slug)
    const result = applyL1RiskPatch(points, parsed.data)

    if (!result.ok)
      return NextResponse.json(
        { issues: result.issues, message: 'Judgment was rejected.' },
        { status: 400 }
      )

    writeGrammarContentAtomically(result.points)

    // The only new codepath where a bad outcome could pass unnoticed: the write
    // succeeds, the wrong row changed, and nothing on screen says so.
    console.info(
      `l1RiskObserved ${parsed.data.slug}: ${previous?.l1RiskObserved ?? 'unjudged'} -> ${parsed.data.l1RiskObserved ?? 'unjudged'} (authored l1Risk ${previous?.l1Risk})`
    )

    return NextResponse.json({
      judgedCount: result.points.filter(point => point.l1RiskObserved != null)
        .length,
      slug: parsed.data.slug,
      total: result.points.length,
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
