'use client'

import { Sparkles } from 'lucide-react'
import { useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { IeltsSection, IeltsSectionInput } from '@/modules/ielts/schema'
import {
  assistIeltsSectionApi,
  type IeltsAssistAction,
  type IeltsAssistProposal,
} from '@/requests/ieltsAdminApi'

import { AreaField } from './fields'
import { ExamButton } from '@/components/ielts/ui'

const ACTIONS: { action: IeltsAssistAction; label: string; help: string }[] = [
  {
    action: 'draft-questions',
    label: 'Soạn câu hỏi từ nội dung',
    help: 'Giữ bài đọc hoặc kịch bản, AI viết thêm nhóm câu hỏi với đáp án và bằng chứng.',
  },
  {
    action: 'paraphrase-distractors',
    label: 'Viết lại cho khó hơn',
    help: 'Diễn đạt lại câu hỏi và thêm lựa chọn gây nhiễu, không đổi đáp án.',
  },
  {
    action: 'suggest-evidence',
    label: 'Gợi ý bằng chứng và giải thích',
    help: 'Điền trích dẫn nguyên văn và giải thích cho các câu còn thiếu.',
  },
  {
    action: 'check-answers',
    label: 'Soát đáp án',
    help: 'AI tự làm đề và chỉ ra câu có đáp án đáng ngờ. Không sửa gì.',
  },
]

/**
 * AI-assisted editing: the admin picks an action, the AI returns a proposal
 * for the whole section, and nothing changes until "Dùng đề xuất" puts it
 * into the unsaved draft (still reviewed and saved by hand).
 */
export function AssistMenu({
  disabled,
  onApply,
  section,
  testId,
  value,
}: {
  disabled: boolean
  onApply: (input: IeltsSectionInput) => void
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

  if (section.skill === 'writing') return null

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
      setError(caught instanceof Error ? caught.message : 'AI lỗi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <ExamButton
        disabled={disabled}
        icon={
          <Sparkles
            aria-hidden="true"
            className="size-4"
          />
        }
        onClick={() => setOpen(true)}
        tone="paper"
        type="button"
      >
        AI hỗ trợ
      </ExamButton>
      <Dialog
        onOpenChange={setOpen}
        open={open}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>AI hỗ trợ soạn</DialogTitle>
            <DialogDescription>
              AI chỉ đề xuất. Bạn xem lại rồi mới lưu.
            </DialogDescription>
          </DialogHeader>
          {/* Option list (aria-pressed): documented raw exception. */}
          <div className="grid gap-2">
            {ACTIONS.map(item => (
              <button
                aria-pressed={action === item.action}
                className={
                  action === item.action
                    ? 'border-ex-line bg-ex-accent rounded-lg border p-2 text-left text-white'
                    : 'border-ex-line hover:bg-ex-soft rounded-lg border bg-white p-2 text-left'
                }
                key={item.action}
                onClick={() => setAction(item.action)}
                type="button"
              >
                <span className="block font-sans text-sm font-bold">
                  {item.label}
                </span>
                <span className="block text-xs">{item.help}</span>
              </button>
            ))}
          </div>
          <AreaField
            label="Yêu cầu thêm (tuỳ chọn)"
            onChange={setInstruction}
            rows={2}
            value={instruction}
          />
          {error ? (
            <p
              className="text-ex-wrong text-sm font-semibold"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          {proposal ? (
            <div className="border-ex-line grid gap-2 rounded-lg border bg-white p-3 text-sm">
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
              {busy ? 'AI đang làm...' : 'Chạy'}
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
                Dùng đề xuất
              </ExamButton>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
