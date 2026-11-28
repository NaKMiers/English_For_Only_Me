import {
  SkeletonIeltsTest,
  SkeletonPageShell,
} from '@/components/common/PageSkeletons'
import { getMessages } from '@/i18n/server'

/** Same order as the test page: mode switch, three launchers, the words. */
export default async function Loading() {
  const t = await getMessages()

  return (
    <SkeletonPageShell
      activeHref="/ielts"
      page={{
        breadcrumb: [{ href: '/ielts', label: t.common.modules.ielts.title }],
        module: 'ielts',
        // The test's title lands with the data; a blank keeps the row height.
        // The page's subtitle line too, so the topbar keeps its height.
        subtitle: '\u00a0',
        title: '\u00a0',
      }}
      subtitle={t.ielts.shell.subtitle}
    >
      <SkeletonIeltsTest />
    </SkeletonPageShell>
  )
}
