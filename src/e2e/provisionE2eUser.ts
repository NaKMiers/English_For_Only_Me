import { disconnect } from 'mongoose'

import { provisionUserOnSignIn } from '@/lib/auth/userProvisioning'
import { GrammarCardMissModel } from '@/models/grammar/GrammarCardMissModel'
import { GrammarLessonProgressModel } from '@/models/grammar/GrammarLessonProgressModel'
import { GrammarSessionModel } from '@/models/grammar/GrammarSessionModel'
import { GrammarUnitProgressModel } from '@/models/grammar/GrammarUnitProgressModel'

import { E2E_LEARNER } from './e2eLearner'

/**
 * Run by the Playwright global setup in a child process (the user model is
 * server-only, so it needs `--conditions=react-server`). Upserts the seeded
 * test learner through the real sign-in provisioning, resets that learner's
 * grammar progress so "a new learner" flows stay new on every run, and prints
 * only the user id as JSON. Touches no other account's rows.
 */
async function main() {
  const { id } = await provisionUserOnSignIn({
    email: E2E_LEARNER.email,
    name: E2E_LEARNER.name,
  })

  await Promise.all([
    GrammarLessonProgressModel.deleteMany({ userId: id }),
    GrammarUnitProgressModel.deleteMany({ userId: id }),
    GrammarCardMissModel.deleteMany({ userId: id }),
    GrammarSessionModel.deleteMany({ userId: id }),
  ])

  process.stdout.write(JSON.stringify({ id }))
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => void disconnect())
