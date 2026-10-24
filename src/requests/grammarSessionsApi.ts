import type { OutboxEnqueueInput, OutboxItem } from '@/lib/sync/outbox'
import {
  GRAMMAR_SESSIONS_URL,
  type GrammarSessionMode,
} from '@/modules/grammar/constants'

export interface GrammarSessionRequestBody {
  answers: { cardId: string; answer: unknown }[]
  idempotencyKey: string
  mode: GrammarSessionMode
  targetId: string
}

/**
 * Every grammar session shares one outbox lane: sessions land in the order
 * they were finished, so a lesson always reaches the server before the
 * checkpoint it unlocked.
 */
export const GRAMMAR_OUTBOX_LANE = 'grammar'

/**
 * One finished session as an outbox write. The outbox stores it before
 * sending, retries it with the same id (the route dedupes on it), and replays
 * it on the next load when the tab closes or the network drops first.
 */
export function buildGrammarSessionWrite(
  body: GrammarSessionRequestBody
): OutboxEnqueueInput {
  return {
    body,
    id: body.idempotencyKey,
    lane: GRAMMAR_OUTBOX_LANE,
    method: 'POST',
    url: GRAMMAR_SESSIONS_URL,
  }
}

/** Whether any grammar session is still waiting to reach the server. */
export function hasPendingGrammarSessions(items: OutboxItem[]) {
  return items.some(item => item.lane === GRAMMAR_OUTBOX_LANE)
}
