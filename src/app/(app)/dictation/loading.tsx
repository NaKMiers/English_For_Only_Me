import { AppTopbar } from '@/components/common/AppTopbar'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { MangaPanel } from '@/components/common/MangaPanel'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          activeHref="/dictation"
          subtitle="Loading the listening module"
        />
      }
    >
      <div className="grid gap-5 p-3 sm:p-5">
        <MangaPanel
          eyebrow="Loading"
          title="Dictation Lab"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="border-manga-black bg-manga-pale-red h-52 rounded-none border-3" />
            <Skeleton className="border-manga-black bg-manga-white h-52 rounded-none border-3" />
          </div>
        </MangaPanel>
      </div>
    </MangaPageShell>
  )
}
