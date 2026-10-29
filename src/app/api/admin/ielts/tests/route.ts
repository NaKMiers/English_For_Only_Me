import { NextResponse } from 'next/server'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { requireAdmin } from '@/modules/dictation/services/getCurrentUser'
import {
  ieltsDecisionError,
  ieltsMissingMongo,
  ieltsRouteFailure,
  readJsonBody,
} from '@/modules/ielts/http'
import { parseCreateTest } from '@/modules/ielts/tests/testRouteDecisions'
import { createTest, listAdminTests } from '@/modules/ielts/tests/testService'

export const runtime = 'nodejs'

export async function GET() {
  const missing = ieltsMissingMongo()

  if (missing) return missing

  try {
    await requireAdmin()
    await connectDatabase()

    return NextResponse.json({ tests: await listAdminTests() })
  } catch (error) {
    return ieltsRouteFailure(error, 'ielts admin list failed')
  }
}

/** New draft: blank sections (manual) or pending sections (generate). */
export async function POST(request: Request) {
  const missing = ieltsMissingMongo()

  if (missing) return missing

  const body = await readJsonBody(request)

  if (!body.ok) return ieltsDecisionError(body)

  const parsed = parseCreateTest(body.data)

  if (!parsed.ok) return ieltsDecisionError(parsed)

  try {
    const admin = await requireAdmin()

    await connectDatabase()

    const test = await createTest(parsed.data, admin.email ?? admin.id)

    return NextResponse.json({ test }, { status: 201 })
  } catch (error) {
    return ieltsRouteFailure(error, 'ielts admin create failed')
  }
}
