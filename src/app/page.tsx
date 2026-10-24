import { HomeStudyDesk } from '@/components/home/HomeStudyDesk'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { getOptionalUser } from '@/modules/dictation/services/getCurrentUser'
import { getGlobalStatsForUser } from '@/modules/dictation/stats/globalStatsService'
import { grammarCourse } from '@/modules/grammar/course'
import { buildGrammarPath } from '@/modules/grammar/path/buildGrammarPath'
import { getGrammarProgressForActor } from '@/modules/grammar/services/grammarProgressService'
import { getVocabStatsForUser } from '@/modules/vocabulary/stats/vocabStatsService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function Home() {
  if (!hasMongoDbUri()) return <HomeStudyDesk />

  // Stats are per-user; anonymous visitors see the desk without personal stats.
  // Auth is a local JWT decode, so it goes first and spares anonymous visitors
  // the connection handshake entirely.
  const user = await getOptionalUser()
  if (!user) return <HomeStudyDesk />

  await connectDatabase()

  const [dictationStats, vocabStats, grammarProgress] = await Promise.all([
    getGlobalStatsForUser(user.id),
    getVocabStatsForUser({ userId: user.id }),
    getGrammarProgressForActor(user.id),
  ])
  const grammarPath = buildGrammarPath({
    course: grammarCourse,
    now: new Date(),
    ...grammarProgress,
  })
  const next = grammarPath.next

  return (
    <HomeStudyDesk
      dictationStats={dictationStats}
      grammarToday={{
        dueCount: grammarPath.totals.dueCount,
        nextTitle: 'title' in next ? next.title : null,
      }}
      vocabStats={vocabStats}
    />
  )
}
