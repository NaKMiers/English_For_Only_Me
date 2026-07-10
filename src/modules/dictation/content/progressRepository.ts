import 'server-only'

import { DictationSessionModel } from '@/models/dictation/DictationSessionModel'

/**
 * Video ids the user has completed at least once (E1 progress). A video counts
 * as done when the user has a session with status 'completed'. Per-user data is
 * keyed by ownerId (= the authenticated user's id since Chunk 1).
 */
export async function listCompletedVideoIdsForUser(
  userId: string
): Promise<string[]> {
  const ids = await DictationSessionModel.find({
    ownerId: userId,
    status: 'completed',
  }).distinct('videoId')

  return ids.map(id => String(id))
}
