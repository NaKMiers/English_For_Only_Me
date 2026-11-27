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
import { useMessages } from '@/i18n/client'
import type { IeltsSection, IeltsSectionInput } from '@/modules/ielts/schema'
import {
  assistIeltsSectionApi,
  type IeltsAssistAction,
  type IeltsAssistProposal,
} from '@/requests/ieltsAdminApi'

import { apiErrorText } from './apiErrorText'
import { AreaField } from './fields'
import { ExamButton } from '@/components/ielts/ui'

/** Label and help text come from `ieltsEditor.assist.actions[action]`. */
const ACTIONS: {
  action: IeltsAssistAction
  Icon: typeof Sparkles
}[] = [
  { action: 'draft-questions', Icon: FileQuestion },
  { action: 'paraphrase-distractors', Icon: Shuffle },
  { action: 'suggest-evidence', Icon: Quote },
  { action: 'check-answers', Icon: ListChecks },
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
  const t = useMessages()
  const copy = t.ieltsEditor.assist
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
      setError(apiErrorText(caught, t, copy.failed))
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
          className="border-line bg-surface hover:bg-tint-soft rounded-control soft-press inline-flex min-h-10 items-center gap-1.5 border px-3 font-sans text-sm font-semibold disabled:opacity-55"
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
                <DropdownMenuLabel>{copy.menuLabel}</DropdownMenuLabel>
                {ACTIONS.map(item => (
                  <DropdownMenuItem
                    key={item.action}
                    onClick={() => openAssist(item.action)}
                  >
                    <item.Icon aria-hidden="true" />
                    {copy.actions[item.action].label}
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
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription>{copy.description}</DialogDescription>
          </DialogHeader>
          {/* Option list (aria-pressed): documented raw exception. */}
          <div className="grid gap-2">
            {ACTIONS.map(item => (
              <button
                aria-pressed={action === item.action}
                className={
                  action === item.action
                    ? 'border-line bg-brand rounded-control text-surface border p-2 text-left'
                    : 'border-line hover:bg-tint-soft rounded-control bg-surface border p-2 text-left'
                }
                key={item.action}
                onClick={() => setAction(item.action)}
                type="button"
              >
                <span className="block font-sans text-sm font-semibold">
                  {copy.actions[item.action].label}
                </span>
                <span className="block text-xs">
                  {copy.actions[item.action].help}
                </span>
              </button>
            ))}
          </div>
          <AreaField
            label={copy.instructions}
            onChange={setInstruction}
            rows={2}
            value={instruction}
          />
          {error ? (
            <p
              className="text-brand text-sm font-semibold"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          {proposal ? (
            <div className="border-line rounded-control bg-surface grid gap-2 border p-3 text-sm">
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
              {busy ? copy.working : copy.run}
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
                {copy.use}
              </ExamButton>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
