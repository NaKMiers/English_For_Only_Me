import 'server-only'

import { createHmac, timingSafeEqual } from 'crypto'

import { ENV_KEYS, getOptionalServerEnv } from '@/constants/environments'
import { VOCAB_RECALL_TASK_TOKEN_TTL_MS } from '@/modules/vocabulary/constants'
import type { VocabRecallTaskType } from '@/modules/vocabulary/types'

export interface VocabRecallTaskTokenPayload {
  correctAnswer: string
  correctOptionId: string | null
  entryId: string
  expiresAt: number
  itemId: string
  recallStage: number
  taskId: string
  type: VocabRecallTaskType
  userId: string
}

function getSigningSecret() {
  return (
    getOptionalServerEnv(ENV_KEYS.authSecret) ??
    getOptionalServerEnv('NEXTAUTH_SECRET') ??
    'development-vocab-recall-task-secret'
  )
}

function toBase64Url(value: string) {
  return Buffer.from(value).toString('base64url')
}

function fromBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function signPayload(encodedPayload: string) {
  return createHmac('sha256', getSigningSecret())
    .update(encodedPayload)
    .digest('base64url')
}

export function createVocabRecallTaskToken(
  payload: Omit<VocabRecallTaskTokenPayload, 'expiresAt'>,
  now = new Date()
) {
  const fullPayload: VocabRecallTaskTokenPayload = {
    ...payload,
    expiresAt: now.getTime() + VOCAB_RECALL_TASK_TOKEN_TTL_MS,
  }
  const encodedPayload = toBase64Url(JSON.stringify(fullPayload))
  const signature = signPayload(encodedPayload)

  return `${encodedPayload}.${signature}`
}

export function verifyVocabRecallTaskToken({
  now = new Date(),
  token,
  userId,
}: {
  now?: Date
  token: string
  userId: string
}) {
  const [encodedPayload, signature] = token.split('.')

  if (!encodedPayload || !signature) return null

  const expected = signPayload(encodedPayload)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  )
    return null

  try {
    const payload = JSON.parse(
      fromBase64Url(encodedPayload)
    ) as VocabRecallTaskTokenPayload

    if (payload.userId !== userId) return null
    if (payload.expiresAt < now.getTime()) return null

    return payload
  } catch {
    return null
  }
}
