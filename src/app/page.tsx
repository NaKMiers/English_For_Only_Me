import { HomeStudyDesk } from '@/components/home/HomeStudyDesk'
import { hasMongoDbUri } from '@/constants/environments'
import { getLocale, getMessages } from '@/i18n/server'
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
  const [locale, messages] = await Promise.all([getLocale(), getMessages()])
  const text = { locale, messages }

  if (!hasMongoDbUri()) return <HomeStudyDesk {...text} />

  // Stats are per-user; anonymous visitors see the desk without personal stats.
  // Auth is a local JWT decode, so it goes first and spares anonymous visitors
  // the connection handshake entirely.
  const user = await getOptionalUser()
  if (!user) return <HomeStudyDesk {...text} />

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
      {...text}
      dictationStats={dictationStats}
      grammarToday={{
        dueCount: grammarPath.totals.dueCount,
        nextTitle: 'title' in next ? next.title : null,
      }}
      userName={user.name}
      vocabStats={vocabStats}
    />
  )
}
