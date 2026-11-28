import { cookies } from 'next/headers'

import { nextHref } from '@/components/grammar/path/pathNext'
import { HomeStudyDesk } from '@/components/home/HomeStudyDesk'
import { HOME_VIEW_COOKIE, parseHomeView } from '@/components/home/homeView'
import { hasMongoDbUri } from '@/constants/environments'
import { getLocale, getMessages } from '@/i18n/server'
import { requirePageUser } from '@/lib/auth/currentUser'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { getGlobalStatsForUser } from '@/modules/dictation/stats/globalStatsService'
import { grammarCourse } from '@/modules/grammar/course'
import { buildGrammarPath } from '@/modules/grammar/path/buildGrammarPath'
import { getGrammarProgressForActor } from '@/modules/grammar/services/grammarProgressService'
import { getVocabStatsForUser } from '@/modules/vocabulary/stats/vocabStatsService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function Home() {
  // Home sits outside the (app) layout, so it checks the session itself.
  const [user, locale, messages, cookieStore] = await Promise.all([
    requirePageUser(),
    getLocale(),
    getMessages(),
    cookies(),
  ])
  const text = {
    locale,
    messages,
    view: parseHomeView(cookieStore.get(HOME_VIEW_COOKIE)?.value),
  }

  if (!hasMongoDbUri())
    return (
      <HomeStudyDesk
        {...text}
        userName={user.name}
      />
    )

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
        dueHref: grammarPath.review ? nextHref(grammarPath.review) : null,
        dueTitle: grammarPath.review?.title ?? null,
        nextHref: nextHref(next),
        nextTitle: 'title' in next ? next.title : null,
      }}
      userName={user.name}
      vocabStats={vocabStats}
    />
  )
}
