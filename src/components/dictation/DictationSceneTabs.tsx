'use client'

import { useState } from 'react'

import { DICTATION_SCENES, type DictationSceneKey } from '@/constants/dictation'
import { cn } from '@/lib/utils'
import type {
  DictationGlobalStatsRecord,
  DictationReviewItemApiRecord,
  DictationVideoApiRecord,
} from '@/modules/dictation/types'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { DictationLibraryScene } from './DictationLibraryScene'
import { DictationPracticeScene } from './DictationPracticeScene'
import { DictationReviewScene } from './DictationReviewScene'
import { DictationStatsScene } from './DictationStatsScene'

interface Props {
  globalStats?: DictationGlobalStatsRecord | null
  reviewItems?: DictationReviewItemApiRecord[]
  videos?: DictationVideoApiRecord[]
}

export function DictationSceneTabs({
  globalStats = null,
  reviewItems = [],
  videos = [],
}: Props) {
  const [scene, setScene] = useState<DictationSceneKey>('library')

  return (
    <Tabs
      value={scene}
      onValueChange={value => setScene(value as DictationSceneKey)}
      className="min-w-0 gap-0"
    >
      <div className="border-manga-black bg-manga-pale-red/75 border-b-3 p-3 sm:p-4">
        <TabsList
          variant="line"
          aria-label="Dictation scenes"
          className="flex !h-auto w-full min-w-0 flex-wrap justify-start gap-1 rounded-none p-0 sm:gap-2"
        >
          {DICTATION_SCENES.map(item => (
            <TabsTrigger
              key={item.key}
              value={item.key}
              className={cn(
                'border-manga-black bg-manga-white text-manga-black !h-auto min-h-11 flex-1 rounded-none border-3 px-2 py-2 font-sans text-xs font-black shadow-[2px_2px_0_var(--manga-black)] transition-all sm:flex-none sm:px-3 sm:text-sm sm:shadow-[3px_3px_0_var(--manga-black)]',
                'hover:bg-manga-paper-soft focus-visible:ring-manga-red/35 after:hidden',
                'data-active:bg-manga-red! data-active:text-manga-white! data-active:shadow-[5px_5px_0_var(--manga-black)]! data-active:-translate-x-[1px] data-active:-translate-y-[1px]'
              )}
            >
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent
        value="library"
        className="p-3 sm:p-5"
      >
        <DictationLibraryScene videos={videos} />
      </TabsContent>
      <TabsContent
        value="practice"
        className="p-3 sm:p-5"
      >
        <DictationPracticeScene />
      </TabsContent>
      <TabsContent
        value="stats"
        className="p-3 sm:p-5"
      >
        <DictationStatsScene
          globalStats={globalStats}
          reviewItems={reviewItems}
        />
      </TabsContent>
      <TabsContent
        value="review"
        className="p-3 sm:p-5"
      >
        <DictationReviewScene />
      </TabsContent>
    </Tabs>
  )
}
