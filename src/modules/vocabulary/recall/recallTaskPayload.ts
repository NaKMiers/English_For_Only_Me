import type {
  VocabRecallAnswerAction,
  VocabRecallTaskType,
} from '@/modules/vocabulary/types'

/**
 * The readable half of a recall task token. The payload is base64url JSON and
 * the signature is an HMAC over the owner's id plus the payload (see
 * recallTaskToken.ts, server-only). The browser decodes the payload to grade an
 * answer instantly; the server still verifies the signature and re-grades with
 * the same `gradeVocabRecallAnswer`, so the two verdicts cannot drift.
 *
 * The payload never carries the user id: it lands in SSR HTML and in the
 * outbox in localStorage, and a guest id is a bearer credential.
 */
export interface VocabRecallTaskTokenPayload {
  correctAnswer: string
  correctOptionId: string | null
  entryId: string
  expiresAt: number
  itemId: string
  recallStage: number
  taskId: string
  type: VocabRecallTaskType
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))

  return new TextDecoder().decode(bytes)
}

/** Read a token's payload without verifying it. Never trust it for writes. */
export function decodeVocabRecallTaskPayload(
  token: string
): VocabRecallTaskTokenPayload | null {
  const [encodedPayload] = token.split('.')

  if (!encodedPayload) return null

  try {
    return JSON.parse(
      decodeBase64Url(encodedPayload)
    ) as VocabRecallTaskTokenPayload
  } catch {
    return null
  }
}

export function gradeVocabRecallAnswer({
  action,
  correctOptionId,
  selectedOptionId,
}: {
  action?: VocabRecallAnswerAction | null
  correctOptionId: string | null
  selectedOptionId?: string | null
}) {
  if (!correctOptionId) return action === 'remember'

  return selectedOptionId === correctOptionId
}
