import 'server-only'

import { createHmac, timingSafeEqual } from 'crypto'

import { ENV_KEYS, getOptionalServerEnv } from '@/constants/environments'
import { VOCAB_RECALL_TASK_TOKEN_TTL_MS } from '@/modules/vocabulary/constants'
import type { VocabRecallTaskTokenPayload } from '@/modules/vocabulary/recall/recallTaskPayload'

export type { VocabRecallTaskTokenPayload }

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

/**
 * The owner is bound in the signature, not written into the readable payload,
 * so a token only verifies for the user it was minted for.
 */
function signPayload(encodedPayload: string, userId: string) {
  return createHmac('sha256', getSigningSecret())
    .update(`${userId}.${encodedPayload}`)
    .digest('base64url')
}

export function createVocabRecallTaskToken(
  payload: Omit<VocabRecallTaskTokenPayload, 'expiresAt'>,
  userId: string,
  now = new Date()
) {
  const fullPayload: VocabRecallTaskTokenPayload = {
    ...payload,
    expiresAt: now.getTime() + VOCAB_RECALL_TASK_TOKEN_TTL_MS,
  }
  const encodedPayload = toBase64Url(JSON.stringify(fullPayload))
  const signature = signPayload(encodedPayload, userId)

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

  const expected = signPayload(encodedPayload, userId)
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

    if (payload.expiresAt < now.getTime()) return null

    return payload
  } catch {
    return null
  }
}
