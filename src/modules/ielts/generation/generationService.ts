import 'server-only'

import {
  getOpenAiApiKey,
  getOpenAiIeltsGenerationModel,
} from '@/constants/environments'
import { requestOpenAiStructuredOutput } from '@/lib/ai/openAiClientCore'
import { IeltsTestModel } from '@/models/ielts/IeltsTestModel'

import {
  ieltsError,
  type IeltsDecision,
} from '../attempts/attemptRouteDecisions'
import { IELTS_GENERATION_LOG_LIMIT, type IeltsSectionKey } from '../constants'
import type { IeltsSection } from '../schema'
import { toAdminTest, type IeltsAdminTest } from '../tests/testService'
import { effectiveGenStatus, toIeltsTestRecord } from '../tests/testRecords'
import { withTimeout } from '../writing/runExaminer'
import type { IeltsJobKind } from './aiSchemas'
import {
  type IeltsMessage,
  type IeltsPromptContext,
  listeningQuestionsMessages,
  listeningScriptMessages,
  readingSectionMessages,
  writingTaskMessages,
} from './prompts'
import { type IeltsRequester, runSectionJob } from './runSectionJob'

export type IeltsGenerateStep = 'draft' | 'repair' | 'script' | 'questions'

interface PendingRepair {
  kind: IeltsJobKind
  rawText: string
  issues: string[]
}

type LeanDoc = Record<string, unknown>

/** OpenAI with a per-request abort and low reasoning effort. */
export function openAiRequester(fetcher: typeof fetch = fetch): IeltsRequester {
  return ({ maxOutputTokens, messages, schema, schemaName }) =>
    requestOpenAiStructuredOutput({
      apiKey: getOpenAiApiKey(),
      fetcher: withTimeout(fetcher),
      input: messages,
      maxOutputTokens,
      model: getOpenAiIeltsGenerationModel(),
      reasoningEffort: 'low',
      schema,
      schemaName,
    })
}

function kindFor(
  section: IeltsSection,
  step: IeltsGenerateStep
): IeltsJobKind | null {
  if (section.skill === 'reading')
    return step === 'draft' ? 'reading-section' : null
  if (section.skill === 'writing')
    return step === 'draft' ? 'writing-task' : null
  if (step === 'draft' || step === 'script') return 'listening-script'
  if (step === 'questions') return 'listening-questions'

  return null
}

export function messagesFor(
  kind: IeltsJobKind,
  context: IeltsPromptContext,
  section: IeltsSection
): IeltsMessage[] {
  if (kind === 'reading-section') return readingSectionMessages(context)
  if (kind === 'listening-script') return listeningScriptMessages(context)
  if (kind === 'listening-questions')
    return listeningQuestionsMessages(context, section.listening?.lines ?? [])

  return writingTaskMessages(context)
}

function promptContext(
  doc: LeanDoc,
  section: IeltsSection
): IeltsPromptContext {
  const record = toIeltsTestRecord(doc)
  const plan = (doc.plan as Record<string, string> | null) ?? null

  return {
    key: section.key,
    track: record.track,
    targetBand: record.targetBand,
    topic: plan?.[section.key] ?? null,
    otherTitles: record.sections
      .filter(item => item.key !== section.key)
      .map(item => item.reading?.title || item.listening?.context || '')
      .filter(Boolean),
  }
}

/**
 * One generation step for one draft section (one OpenAI request):
 *
 *   claim (revision guard, genStatus generating) -> run -> write result with
 *   the claimed revision -> ready | needsRepair | failed, plus a log row.
 *
 * A manual save racing the job bumps the revision, so the job's write
 * matches nothing and the manual edit wins.
 */
export async function generateSectionStep({
  key,
  now = new Date(),
  request = openAiRequester(),
  revision,
  step,
  testId,
}: {
  key: IeltsSectionKey
  now?: Date
  request?: IeltsRequester
  revision: number
  step: IeltsGenerateStep
  testId: string
}): Promise<IeltsDecision<{ test: IeltsAdminTest; message: string }>> {
  if (!getOpenAiApiKey())
    return ieltsError(503, 'Chưa cấu hình OPENAI_API_KEY.')

  const doc = (await IeltsTestModel.findById(testId).lean()) as LeanDoc | null

  if (!doc) return ieltsError(404, 'Test not found.')

  if (doc.status !== 'draft')
    return ieltsError(409, 'Only drafts can be generated.')

  const record = toIeltsTestRecord(doc)
  const section = record.sections.find(item => item.key === key)

  if (!section) return ieltsError(404, 'Section not found.')

  if (section.revision !== revision)
    return ieltsError(409, 'Section vừa được cập nhật ở nơi khác. Tải lại.')

  if (effectiveGenStatus(section, now) === 'generating')
    return ieltsError(409, 'Phần này đang được tạo.')

  const rawSection = ((doc.sections as LeanDoc[]) ?? []).find(
    item => item.key === key
  )
  const pending = (rawSection?.genPending as PendingRepair | null) ?? null
  const kind =
    step === 'repair' ? (pending?.kind ?? null) : kindFor(section, step)

  if (!kind)
    return ieltsError(
      400,
      step === 'repair' ? 'Nothing to repair.' : `Step ${step} does not apply.`
    )

  if (kind === 'listening-questions' && !section.listening?.lines.length)
    return ieltsError(400, 'Write or generate the script first.')

  const claimed = await IeltsTestModel.updateOne(
    {
      _id: testId,
      status: 'draft',
      sections: { $elemMatch: { key, revision } },
    },
    {
      $set: {
        'sections.$.genStatus': 'generating',
        'sections.$.genStartedAt': now,
        'sections.$.genError': '',
        'sections.$.revision': revision + 1,
      },
    }
  )

  if (claimed.matchedCount === 0)
    return ieltsError(409, 'Section vừa được cập nhật ở nơi khác. Tải lại.')

  const started = Date.now()
  const result = await runSectionJob({
    kind,
    messages: messagesFor(kind, promptContext(doc, section), section),
    request,
    section,
    repair: step === 'repair' && pending ? pending : null,
  })
  const claimedRevision = revision + 1
  const logRow = {
    at: new Date(),
    sectionKey: key,
    kind: step === 'repair' ? `${kind} (repair)` : kind,
    model: getOpenAiIeltsGenerationModel(),
    inputTokens: result.usage?.inputTokens ?? 0,
    outputTokens: result.usage?.outputTokens ?? 0,
    durationMs: Date.now() - started,
    outcome: result.outcome === 'ok' ? 'ok' : result.outcome,
    failedRules: [...new Set(result.failedRules)],
    error: result.error.slice(0, 900),
  }
  // A listening script alone is not a finished section: questions follow.
  const okStatus = kind === 'listening-script' ? 'pending' : 'ready'
  const sectionUpdate =
    result.outcome === 'ok' && result.input
      ? {
          'sections.$.title': result.input.title,
          'sections.$.listening': result.input.listening,
          'sections.$.reading': result.input.reading,
          'sections.$.writing': result.input.writing,
          'sections.$.groups': result.input.groups,
          'sections.$.genStatus': okStatus,
          'sections.$.genPending': null,
          'sections.$.genError': '',
        }
      : result.outcome === 'needsRepair'
        ? {
            'sections.$.genStatus': 'needsRepair',
            'sections.$.genPending': {
              kind,
              rawText: result.rawText,
              issues: result.issues,
            },
            'sections.$.genError': result.issues[0] ?? 'Output needs repair.',
          }
        : {
            'sections.$.genStatus': 'failed',
            'sections.$.genPending': null,
            'sections.$.genError': result.error || 'Generation failed.',
          }

  await IeltsTestModel.updateOne(
    {
      _id: testId,
      status: 'draft',
      sections: { $elemMatch: { key, revision: claimedRevision } },
    },
    {
      $set: {
        ...sectionUpdate,
        'sections.$.genStartedAt': null,
        'sections.$.revision': claimedRevision + 1,
        ...(doc.source === 'manual' ? { source: 'assisted' } : {}),
      },
    }
  )
  await IeltsTestModel.updateOne(
    { _id: testId },
    {
      $push: {
        generationLog: {
          $each: [logRow],
          $slice: -IELTS_GENERATION_LOG_LIMIT,
        },
      },
    }
  )

  const fresh = (await IeltsTestModel.findById(testId).lean()) as LeanDoc

  return {
    ok: true,
    data: {
      test: toAdminTest(fresh),
      message:
        result.outcome === 'ok'
          ? kind === 'listening-script'
            ? 'Đã tạo kịch bản. Bước tiếp: câu hỏi.'
            : 'Đã tạo xong.'
          : result.outcome === 'needsRepair'
            ? 'Cần sửa lỗi. Bấm "Sửa tự động".'
            : `Lỗi: ${result.error}`,
    },
  }
}
