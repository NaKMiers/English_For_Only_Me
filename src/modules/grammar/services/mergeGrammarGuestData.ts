import 'server-only'

import { isGuestId } from '@/lib/auth/guestUser'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { GrammarCardMissModel } from '@/models/grammar/GrammarCardMissModel'
import { GrammarLessonProgressModel } from '@/models/grammar/GrammarLessonProgressModel'
import { GrammarSessionModel } from '@/models/grammar/GrammarSessionModel'
import { GrammarUnitProgressModel } from '@/models/grammar/GrammarUnitProgressModel'
import { planGrammarGuestMerge } from '@/modules/grammar/progress/planGrammarGuestMerge'

import { getGrammarProgressForActor } from './grammarProgressService'

/**
 * Fold a guest's grammar progress into the account on first sign-in. Called
 * next to the dictation merge in auth.ts, inside the same best-effort
 * try/catch: a failure here must never block login.
 */
export async function mergeGrammarGuestData(guestId: string, userId: string) {
  if (!isGuestId(guestId) || guestId === userId) return

  await connectDatabase()

  const [guest, user] = await Promise.all([
    getGrammarProgressForActor(guestId),
    getGrammarProgressForActor(userId),
  ])
  const plan = planGrammarGuestMerge(
    {
      lessons: guest.lessonProgress,
      misses: guest.misses,
      units: guest.unitProgress,
    },
    {
      lessons: user.lessonProgress,
      misses: user.misses,
      units: user.unitProgress,
    }
  )

  const upsert = <T extends object>(filter: object, row: T) => ({
    updateOne: { filter, update: { $set: { ...row, userId } }, upsert: true },
  })

  await Promise.all([
    plan.lessons.length > 0
      ? GrammarLessonProgressModel.bulkWrite(
          plan.lessons.map(row =>
            upsert({ lessonId: row.lessonId, userId }, row)
          )
        )
      : null,
    plan.units.length > 0
      ? GrammarUnitProgressModel.bulkWrite(
          plan.units.map(row => upsert({ unitId: row.unitId, userId }, row))
        )
      : null,
    plan.misses.length > 0
      ? GrammarCardMissModel.bulkWrite(
          plan.misses.map(row => upsert({ cardId: row.cardId, userId }, row))
        )
      : null,
  ])

  await Promise.all([
    GrammarLessonProgressModel.deleteMany({ userId: guestId }),
    GrammarUnitProgressModel.deleteMany({ userId: guestId }),
    GrammarCardMissModel.deleteMany({ userId: guestId }),
    GrammarSessionModel.deleteMany({ userId: guestId }),
  ])

  const moved = plan.lessons.length + plan.units.length + plan.misses.length

  if (moved > 0)
    console.info(
      `Merged guest grammar ${guestId} -> user ${userId}: ` +
        `${plan.lessons.length} lessons, ${plan.units.length} units, ` +
        `${plan.misses.length} misses`
    )
}
