import type { IeltsConsistencyReport } from '@/modules/ielts/consistency/checkTest'
import { IELTS_API_PATHS } from '@/modules/ielts/constants'
import type { IeltsSectionInput, IeltsTestMeta } from '@/modules/ielts/schema'
import type {
  IeltsAdminTest,
  IeltsAdminTestRow,
} from '@/modules/ielts/tests/testService'

export class IeltsAdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly report: IeltsConsistencyReport | null = null,
    /** Attempts that block deleting an archived version (409). */
    readonly attemptCount: number | null = null
  ) {
    super(message)
    this.name = 'IeltsAdminApiError'
  }
}

async function send<T>(
  url: string,
  init: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const { json, ...rest } = init
  const response = await fetch(url, {
    cache: 'no-store',
    ...rest,
    ...(json === undefined
      ? {}
      : {
          body: JSON.stringify(json),
          headers: { 'content-type': 'application/json' },
        }),
  })
  const body = (await response.json().catch(() => ({}))) as {
    message?: string
    report?: IeltsConsistencyReport
    attemptCount?: number
  }

  if (!response.ok)
    throw new IeltsAdminApiError(
      body.message ?? `Request failed (${response.status}).`,
      response.status,
      body.report ?? null,
      body.attemptCount ?? null
    )

  return body as T
}

export const listIeltsTestsApi = () =>
  send<{ tests: IeltsAdminTestRow[] }>(IELTS_API_PATHS.adminTests)

export const createIeltsTestApi = (
  input:
    | {
        mode: 'manual'
        title: string
        track: 'academic' | 'general'
        targetBand: number
      }
    | {
        mode: 'generate'
        title: string
        track: 'academic' | 'general'
        targetBand: number
        topics: string[]
      }
) =>
  send<{ test: IeltsAdminTest }>(IELTS_API_PATHS.adminTests, {
    method: 'POST',
    json: input,
  })

export const readIeltsTestApi = (testId: string) =>
  send<{ test: IeltsAdminTest }>(IELTS_API_PATHS.adminTest(testId))

export const saveIeltsMetaApi = (
  testId: string,
  meta: IeltsTestMeta,
  metaRevision: number
) =>
  send<{ test: IeltsAdminTest }>(IELTS_API_PATHS.adminTest(testId), {
    method: 'PUT',
    json: { meta, metaRevision },
  })

/** Delete a draft or archived version (`withAttempts` also deletes its attempts). */
export const deleteIeltsTestApi = (testId: string, withAttempts = false) =>
  send<{ deleted: true; attemptsDeleted: number }>(
    `${IELTS_API_PATHS.adminTest(testId)}${withAttempts ? '?withAttempts=1' : ''}`,
    { method: 'DELETE' }
  )

export const saveIeltsSectionApi = (
  testId: string,
  key: string,
  section: IeltsSectionInput,
  revision: number
) =>
  send<{ test: IeltsAdminTest }>(IELTS_API_PATHS.adminSection(testId, key), {
    method: 'PUT',
    json: { section, revision },
  })

export const publishIeltsTestApi = (testId: string, confirmWarnings = false) =>
  send<{ test: IeltsAdminTest; report: IeltsConsistencyReport }>(
    IELTS_API_PATHS.adminPublish(testId),
    { method: 'POST', json: { confirmWarnings } }
  )

export const archiveIeltsTestApi = (testId: string) =>
  send<{ test: IeltsAdminTest }>(
    `${IELTS_API_PATHS.adminTest(testId)}/archive`,
    {
      method: 'POST',
    }
  )

/** Put an archived test back on the catalogue (409 while another is live). */
export const unarchiveIeltsTestApi = (testId: string) =>
  send<{ test: IeltsAdminTest }>(
    `${IELTS_API_PATHS.adminTest(testId)}/unarchive`,
    { method: 'POST' }
  )

export type IeltsGenerateStep = 'draft' | 'repair' | 'script' | 'questions'

export const generateIeltsSectionApi = (
  testId: string,
  key: string,
  step: IeltsGenerateStep,
  revision: number
) =>
  send<{ test: IeltsAdminTest; message: string }>(
    IELTS_API_PATHS.adminGenerate(testId, key),
    { method: 'POST', json: { step, revision } }
  )

export const generateIeltsAudioApi = (
  testId: string,
  key: string,
  revision: number
) =>
  send<{ test: IeltsAdminTest }>(IELTS_API_PATHS.adminAudio(testId, key), {
    method: 'POST',
    json: { revision },
  })

export type IeltsAssistAction =
  | 'draft-questions'
  | 'paraphrase-distractors'
  | 'suggest-evidence'
  | 'check-answers'

export interface IeltsAssistProposal {
  summary: string
  section: IeltsSectionInput | null
  notes: string[]
}

export const assistIeltsSectionApi = (input: {
  action: IeltsAssistAction
  testId: string
  key: string
  section: IeltsSectionInput
  instruction: string
}) =>
  send<{ proposal: IeltsAssistProposal }>(IELTS_API_PATHS.adminAssist, {
    method: 'POST',
    json: input,
  })

export interface IeltsSignedUpload {
  apiKey: string
  cloudName: string
  resourceType: 'video' | 'image'
  uploadUrl: string
  params: Record<string, string>
}

/** Sign, then upload straight from the browser to Cloudinary. */
export async function uploadIeltsFileApi(
  kind: 'audio' | 'image',
  file: File
): Promise<{ url: string; publicId: string; durationSec: number }> {
  const signed = await send<IeltsSignedUpload>(
    IELTS_API_PATHS.adminUploadSign,
    {
      method: 'POST',
      json: { kind },
    }
  )
  const form = new FormData()

  form.set('file', file)
  form.set('api_key', signed.apiKey)

  for (const [key, value] of Object.entries(signed.params)) form.set(key, value)

  const response = await fetch(signed.uploadUrl, { method: 'POST', body: form })
  const payload = (await response.json().catch(() => ({}))) as {
    secure_url?: string
    public_id?: string
    duration?: number
    eager?: { secure_url?: string }[]
    error?: { message?: string }
  }

  if (!response.ok || !payload.secure_url)
    throw new IeltsAdminApiError(
      payload.error?.message ?? 'Upload failed.',
      response.status
    )

  return {
    url:
      kind === 'audio'
        ? (payload.eager?.find(item => item.secure_url)?.secure_url ??
          payload.secure_url)
        : payload.secure_url,
    publicId: payload.public_id ?? '',
    durationSec: Number(payload.duration ?? 0),
  }
}
