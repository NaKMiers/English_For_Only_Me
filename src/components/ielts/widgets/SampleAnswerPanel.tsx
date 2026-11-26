'use client'

import { ChevronDown } from 'lucide-react'

import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

import { SampleAnswerBody } from './SampleAnswerBody'

/**
 * The model answer under a writing task, closed until opened, as Jumpinto
 * shows it. Shared by the runner and the admin preview.
 */
export function SampleAnswerPanel({
  defaultOpen = false,
  text,
}: {
  defaultOpen?: boolean
  text: string
}) {
  return (
    <Collapsible
      className="border-exam-line border-t"
      defaultOpen={defaultOpen}
    >
      <CollapsibleTrigger className="group/sample flex min-h-11 w-full items-center justify-between gap-2 font-sans text-sm font-black focus-visible:underline focus-visible:ring-0">
        Sample Writing Answer
        <ChevronDown
          aria-hidden="true"
          className="size-4 transition-transform group-data-[panel-open]/sample:rotate-180"
        />
      </CollapsibleTrigger>
      <CollapsiblePanel className="grid gap-3 pt-1 pb-4 text-[14px] leading-[1.6]">
        <SampleAnswerBody text={text} />
      </CollapsiblePanel>
    </Collapsible>
  )
}
