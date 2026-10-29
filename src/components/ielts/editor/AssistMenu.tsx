'use client'

import {
  ChevronDown,
  FileQuestion,
  ListChecks,
  Quote,
  Shuffle,
  Sparkles,
  WandSparkles,
} from 'lucide-react'
import { useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { IeltsSection, IeltsSectionInput } from '@/modules/ielts/schema'
import {
  assistIeltsSectionApi,
  type IeltsAssistAction,
  type IeltsAssistProposal,
} from '@/requests/ieltsAdminApi'

import { AreaField } from './fields'
import { ExamButton } from '@/components/ielts/ui'

const ACTIONS: {
  action: IeltsAssistAction
  label: string
  help: string
  Icon: typeof Sparkles
}[] = [
  {
    action: 'draft-questions',
    label: 'Draft questions from the text',
    help: 'Keeps the passage or script; AI adds question groups with answers and evidence.',
    Icon: FileQuestion,
  },
  {
    action: 'paraphrase-distractors',
    label: 'Make it harder',
    help: 'Rewords the questions and adds distractors without changing the answers.',
    Icon: Shuffle,
  },
  {
    action: 'suggest-evidence',
    label: 'Suggest evidence and explanations',
    help: 'Fills in verbatim quotes and explanations where questions lack them.',
    Icon: Quote,
  },
  {
    action: 'check-answers',
    label: 'Check answers',
    help: 'AI takes the test and flags questions with doubtful answers. Changes nothing.',
    Icon: ListChecks,
  },
]

/**
 * Every AI action on a section behind one "AI" menu: the generation step
 * (draft, questions or auto-fix), then the assist actions. An assist action
 * opens a dialog where the AI returns a proposal for the whole section, and
 * nothing changes until "Use proposal" puts it into the unsaved draft (still
 * reviewed and saved by hand). Writing tasks only get the generation step.
 */
export function AssistMenu({
  disabled,
  generateLabel,
  onApply,
  onGenerate,
  section,
  testId,
  value,
}: {
  disabled: boolean
  generateLabel: string
  onApply: (input: IeltsSectionInput) => void
  onGenerate: () => void
  section: IeltsSection
  testId: string
  value: IeltsSectionInput
}) {
  const [open, setOpen] = useState(false)
  const [action, setAction] = useState<IeltsAssistAction>('draft-questions')
  const [instruction, setInstruction] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [proposal, setProposal] = useState<IeltsAssistProposal | null>(null)

  const canAssist = section.skill !== 'writing'

  const run = async () => {
    setBusy(true)
    setError('')
    setProposal(null)

    try {
      const result = await assistIeltsSectionApi({
        action,
        testId,
        key: section.key,
        section: value,
        instruction,
      })

      setProposal(result.proposal)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'AI request failed.')
    } finally {
      setBusy(false)
    }
  }

  const openAssist = (next: IeltsAssistAction) => {
    setAction(next)
    setProposal(null)
    setError('')
    setOpen(true)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="border-manga-black bg-manga-white hover:bg-manga-pale-red rounded-control sticker-press inline-flex min-h-10 items-center gap-1.5 border-2 px-3 font-sans text-sm font-black shadow-[2px_2px_0_var(--manga-black)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-55"
          disabled={disabled}
        >
          <Sparkles
            aria-hidden="true"
            className="size-4"
          />
          AI
          <ChevronDown
            aria-hidden="true"
            className="size-3.5"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-72"
        >
          <DropdownMenuItem onClick={onGenerate}>
            <WandSparkles aria-hidden="true" />
            {generateLabel}
          </DropdownMenuItem>
          {canAssist ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  Assist (review before use)
                </DropdownMenuLabel>
                {ACTIONS.map(item => (
                  <DropdownMenuItem
                    key={item.action}
                    onClick={() => openAssist(item.action)}
                  >
                    <item.Icon aria-hidden="true" />
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog
        onOpenChange={setOpen}
        open={open}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>AI editing assist</DialogTitle>
            <DialogDescription>
              AI only proposes. Review it before you save.
            </DialogDescription>
          </DialogHeader>
          {/* Option list (aria-pressed): documented raw exception. */}
          <div className="grid gap-2">
            {ACTIONS.map(item => (
              <button
                aria-pressed={action === item.action}
                className={
                  action === item.action
                    ? 'border-manga-black bg-manga-red rounded-control text-manga-white border-2 p-2 text-left'
                    : 'border-manga-black hover:bg-manga-pale-red rounded-control bg-manga-white border-2 p-2 text-left'
                }
                key={item.action}
                onClick={() => setAction(item.action)}
                type="button"
              >
                <span className="block font-sans text-sm font-black">
                  {item.label}
                </span>
                <span className="block text-xs">{item.help}</span>
              </button>
            ))}
          </div>
          <AreaField
            label="Extra instructions (optional)"
            onChange={setInstruction}
            rows={2}
            value={instruction}
          />
          {error ? (
            <p
              className="text-manga-red text-sm font-semibold"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          {proposal ? (
            <div className="border-manga-black rounded-control bg-manga-white grid gap-2 border-2 p-3 text-sm">
              <p className="font-semibold">{proposal.summary}</p>
              {proposal.notes.length ? (
                <ul className="list-disc pl-5">
                  {proposal.notes.map((note, index) => (
                    <li key={index}>{note}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <ExamButton
              disabled={busy}
              onClick={() => void run()}
              tone="paper"
              type="button"
            >
              {busy ? 'AI working...' : 'Run'}
            </ExamButton>
            {proposal?.section ? (
              <ExamButton
                onClick={() => {
                  onApply(proposal.section!)
                  setOpen(false)
                  setProposal(null)
                }}
                tone="ink"
                type="button"
              >
                Use proposal
              </ExamButton>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
