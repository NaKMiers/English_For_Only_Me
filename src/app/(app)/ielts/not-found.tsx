import { RouteError } from '@/components/common/RouteError'
import { getMessages } from '@/i18n/server'

/** A missing test: the shared RouteError look, with the way back. */
export default async function IeltsNotFound() {
  const t = await getMessages()

  return (
    <RouteError
      body={t.ielts.boundary.notFoundBody}
      homeHref="/ielts"
      homeLabel={t.ielts.boundary.backToIelts}
      tag={t.common.modules.ielts.title}
      title={t.ielts.boundary.notFoundTitle}
    />
  )
}
