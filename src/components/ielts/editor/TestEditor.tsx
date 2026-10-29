'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useRef, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  checkSection,
  checkTest,
  type IeltsConsistencyIssue,
  type IeltsConsistencyReport,
} from '@/modules/ielts/consistency/checkTest'
import {
  IELTS_SKILL_LABELS,
  IELTS_TRACKS,
  type IeltsGenStatus,
} from '@/modules/ielts/constants'
import type { IeltsSection, IeltsSectionInput } from '@/modules/ielts/schema'
import type { IeltsAdminTest } from '@/modules/ielts/tests/testService'
import {
  archiveIeltsTestApi,
  deleteIeltsDraftApi,
  generateIeltsAudioApi,
  generateIeltsSectionApi,
  IeltsAdminApiError,
  type IeltsGenerateStep,
  newIeltsVersionApi,
  readIeltsTestApi,
  publishIeltsTestApi,
  saveIeltsMetaApi,
  saveIeltsSectionApi,
} from '@/requests/ieltsAdminApi'

import { AssistMenu } from './AssistMenu'
import { AreaField, ListField, NumberField, TextField } from './fields'
import { GenerationLog } from './GenerationLog'
import { SectionForm } from './SectionForm'
import { SectionPreview } from './SectionPreview'
import { ExamButton, ExamCard } from '@/components/ielts/ui'

const GEN_LABELS: Record<IeltsGenStatus, string> = {
  pending: 'Chờ',
  generating: 'Đang tạo...',
  needsRepair: 'Cần sửa lỗi',
  ready: 'Sẵn sàng',
  failed: 'Lỗi',
  manual: 'Soạn tay',
}

function toInput(section: IeltsSection): IeltsSectionInput {
  return {
    title: section.title,
    listening: section.listening,
    reading: section.reading,
    writing: section.writing,
    groups: section.groups,
  }
}

/** First question number for a new group: after the earlier parts. */
function nextNumberFor(sections: IeltsSection[], section: IeltsSection) {
  const before = sections
    .filter(item => item.skill === section.skill && item.order < section.order)
    .flatMap(item => item.groups.flatMap(group => group.questions))
    .map(question => question.number)

  return before.length ? Math.max(...before) + 1 : 1
}

function IssueList({ issues }: { issues: IeltsConsistencyIssue[] }) {
  if (!issues.length) return null

  return (
    <ul className="grid gap-1 text-sm">
      {issues.slice(0, 30).map((issue, index) => (
        <li key={index}>
          <code className="font-sans text-xs font-bold">{issue.rule}</code>{' '}
          <span className="text-ex-muted">{issue.path}</span>: {issue.message}
        </li>
      ))}
      {issues.length > 30 ? <li>... và {issues.length - 30} lỗi nữa</li> : null}
    </ul>
  )
}

/**
 * Three columns: sections and publish (left), the section form (centre),
 * the learner preview (right; a tab under 1280px). Each section saves on
 * its own with a revision guard.
 */
export function TestEditor({ initial }: { initial: IeltsAdminTest }) {
  const router = useRouter()
  const [test, setTest] = useState(initial)
  const [selectedKey, setSelectedKey] = useState(initial.sections[0]?.key)
  const [drafts, setDrafts] = useState<Record<string, IeltsSectionInput>>({})
  const [meta, setMeta] = useState({
    title: initial.title,
    track: initial.track,
    targetBand: initial.targetBand,
    tags: initial.tags,
    description: initial.description,
  })
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [publishReport, setPublishReport] =
    useState<IeltsConsistencyReport | null>(null)
  const [confirmWarnings, setConfirmWarnings] = useState(false)
  const [previewTab, setPreviewTab] = useState<'form' | 'preview'>('form')
  const stopLoopRef = useRef(false)
  const isDraft = test.status === 'draft'
  const section = test.sections.find(item => item.key === selectedKey)
  const draft = section ? (drafts[section.key] ?? toInput(section)) : null
  const dirty = section ? Boolean(drafts[section.key]) : false
  const previewSection = useMemo(
    () => (section && draft ? { ...section, ...draft } : null),
    [draft, section]
  )
  const sectionIssues = useMemo(
    () => (previewSection ? checkSection(previewSection) : null),
    [previewSection]
  )
  const testReport = useMemo(() => checkTest(test), [test])

  /**
   * After any failure the server may have moved on (a claimed generation
   * bumps the revision): re-read the test so the next save or step sends the
   * current revision. Unsaved drafts are kept.
   */
  const resync = () => {
    void readIeltsTestApi(test.id)
      .then(({ test: fresh }) => setTest(fresh))
      .catch(() => undefined)
  }

  const fail = (caught: unknown) => {
    setMessage(caught instanceof Error ? caught.message : 'Có lỗi xảy ra.')

    if (caught instanceof IeltsAdminApiError && caught.report)
      setPublishReport(caught.report)

    resync()
  }

  const adopt = useCallback((next: IeltsAdminTest, keys: string[] = []) => {
    setTest(next)
    setDrafts(current => {
      const copy = { ...current }

      for (const key of keys) delete copy[key]

      return copy
    })
  }, [])

  const saveSection = async () => {
    if (!section || !draft) return

    setBusy('save')
    setMessage('')

    try {
      const { test: next } = await saveIeltsSectionApi(
        test.id,
        section.key,
        draft,
        section.revision
      )

      adopt(next, [section.key])
      setMessage('Đã lưu.')
    } catch (caught) {
      fail(caught)
    } finally {
      setBusy(null)
    }
  }

  const saveMeta = async () => {
    setBusy('meta')
    setMessage('')

    try {
      const { test: next } = await saveIeltsMetaApi(
        test.id,
        meta,
        test.metaRevision
      )

      adopt(next)
      setMessage('Đã lưu thông tin đề.')
    } catch (caught) {
      fail(caught)
    } finally {
      setBusy(null)
    }
  }

  const runStep = useCallback(
    async (key: string, step: IeltsGenerateStep) => {
      const current = test.sections.find(item => item.key === key)

      if (!current) return null

      const { test: next, message: note } = await generateIeltsSectionApi(
        test.id,
        key,
        step,
        current.revision
      )

      adopt(next, [key])
      if (note) setMessage(note)

      return next
    },
    [adopt, test]
  )

  const generateOne = async (key: string, step: IeltsGenerateStep) => {
    setBusy(`gen:${key}`)
    setMessage('')

    try {
      await runStep(key, step)
    } catch (caught) {
      fail(caught)
    } finally {
      setBusy(null)
    }
  }

  /**
   * "Tạo tiếp phần còn thiếu": one request per step, section by section,
   * re-reading the test between calls. Closing the tab loses nothing; the
   * loop picks up where it stopped.
   */
  const generateMissing = async () => {
    stopLoopRef.current = false
    setMessage('')

    let current = test

    for (const key of test.sections.map(item => item.key)) {
      if (stopLoopRef.current) break

      const target = current.sections.find(item => item.key === key)

      // A ready listening part whose audio step failed earlier only needs audio.
      const audioOnly =
        target?.skill === 'listening' &&
        target.genStatus === 'ready' &&
        !target.listening?.audio

      if (
        !target ||
        (target.genStatus === 'ready' && !audioOnly) ||
        target.genStatus === 'manual'
      )
        continue

      setBusy(`gen:${key}`)

      try {
        const steps: IeltsGenerateStep[] = audioOnly
          ? []
          : target.genStatus === 'needsRepair'
            ? ['repair']
            : target.skill === 'listening'
              ? target.listening?.lines.length
                ? ['questions']
                : ['script', 'questions']
              : ['draft']

        for (const step of steps) {
          const next = await generateIeltsSectionApi(
            current.id,
            key,
            step,
            current.sections.find(item => item.key === key)?.revision ?? 0
          )

          current = next.test
          adopt(current, [key])

          const status = current.sections.find(
            item => item.key === key
          )?.genStatus

          if (status === 'needsRepair') {
            const repaired = await generateIeltsSectionApi(
              current.id,
              key,
              'repair',
              current.sections.find(item => item.key === key)?.revision ?? 0
            )

            current = repaired.test
            adopt(current, [key])
          }

          if (
            current.sections.find(item => item.key === key)?.genStatus ===
            'failed'
          )
            break
        }

        const after = current.sections.find(item => item.key === key)

        if (
          after?.skill === 'listening' &&
          after.genStatus === 'ready' &&
          !after.listening?.audio
        ) {
          const withAudio = await generateIeltsAudioApi(
            current.id,
            key,
            after.revision
          )

          current = withAudio.test
          adopt(current, [key])
        }
      } catch (caught) {
        fail(caught)
        break
      }
    }

    setBusy(null)
  }

  const generateAudio = async () => {
    if (!section) return

    setBusy(`audio:${section.key}`)
    setMessage('')

    try {
      const { test: next } = await generateIeltsAudioApi(
        test.id,
        section.key,
        section.revision
      )

      adopt(next, [section.key])
      setMessage('Đã tạo audio.')
    } catch (caught) {
      fail(caught)
    } finally {
      setBusy(null)
    }
  }

  const publish = async (confirm = false) => {
    setBusy('publish')
    setMessage('')
    setPublishReport(null)

    try {
      const { test: next } = await publishIeltsTestApi(test.id, confirm)

      adopt(next)
      setConfirmWarnings(false)
      setMessage('Đã xuất bản.')
    } catch (caught) {
      if (
        caught instanceof IeltsAdminApiError &&
        caught.report &&
        caught.report.errors.length === 0
      )
        setConfirmWarnings(true)

      fail(caught)
    } finally {
      setBusy(null)
    }
  }

  const newVersion = async () => {
    setBusy('version')

    try {
      const { test: next } = await newIeltsVersionApi(test.id)

      router.push(`/admin/ielts/${next.id}`)
    } catch (caught) {
      fail(caught)
      setBusy(null)
    }
  }

  const archive = async () => {
    setBusy('archive')

    try {
      adopt((await archiveIeltsTestApi(test.id)).test)
    } catch (caught) {
      fail(caught)
    } finally {
      setBusy(null)
    }
  }

  const remove = async () => {
    if (!window.confirm('Xoá bản nháp này? Không hoàn tác được.')) return

    setBusy('delete')

    try {
      await deleteIeltsDraftApi(test.id)
      router.push('/admin/ielts')
    } catch (caught) {
      fail(caught)
      setBusy(null)
    }
  }

  const pendingCount = test.sections.filter(
    item =>
      (item.genStatus !== 'ready' && item.genStatus !== 'manual') ||
      (item.skill === 'listening' &&
        item.genStatus === 'ready' &&
        !item.listening?.audio)
  ).length

  return (
    <div className="ielts-exam border-ex-line m-3 grid gap-4 rounded-2xl border p-4 sm:m-4 xl:grid-cols-[280px_minmax(0,1fr)_minmax(0,1fr)]">
      <aside className="grid content-start gap-4">
        <ExamCard
          eyebrow={`v${test.version} · ${test.status}`}
          title="Đề"
        >
          <TextField
            label="Tên đề"
            onChange={title => setMeta({ ...meta, title })}
            value={meta.title}
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1">
              <span className="font-sans text-xs font-bold">Loại</span>
              {/* Segmented toggle (aria-pressed): documented raw exception. */}
              <div className="flex gap-1">
                {IELTS_TRACKS.map(track => (
                  <button
                    aria-pressed={meta.track === track}
                    className={cn(
                      'border-ex-line min-h-9 flex-1 rounded-lg border font-sans text-xs font-bold',
                      meta.track === track
                        ? 'bg-ex-accent text-white'
                        : 'bg-white'
                    )}
                    disabled={!isDraft}
                    key={track}
                    onClick={() => setMeta({ ...meta, track })}
                    type="button"
                  >
                    {track === 'academic' ? 'AC' : 'GT'}
                  </button>
                ))}
              </div>
            </div>
            <NumberField
              label="Band mục tiêu"
              max={9}
              min={4}
              onChange={targetBand => setMeta({ ...meta, targetBand })}
              step={0.5}
              value={meta.targetBand}
            />
          </div>
          <ListField
            label="Tags"
            onChange={tags => setMeta({ ...meta, tags })}
            separator=","
            value={meta.tags}
          />
          <AreaField
            label="Mô tả"
            onChange={description => setMeta({ ...meta, description })}
            rows={2}
            value={meta.description}
          />
          {isDraft ? (
            <ExamButton
              disabled={busy !== null}
              onClick={() => void saveMeta()}
              tone="paper"
              type="button"
            >
              {busy === 'meta' ? 'Đang lưu...' : 'Lưu thông tin'}
            </ExamButton>
          ) : null}
        </ExamCard>

        <ExamCard title="Các phần">
          <ul className="grid gap-1.5">
            {test.sections.map(item => (
              <li key={item.key}>
                {/* Section picker (aria-pressed): documented raw exception. */}
                <button
                  aria-pressed={item.key === selectedKey}
                  className={cn(
                    'border-ex-line flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border px-2.5 text-left text-sm',
                    item.key === selectedKey
                      ? 'bg-ex-accent text-white'
                      : 'hover:bg-ex-soft bg-white'
                  )}
                  onClick={() => setSelectedKey(item.key)}
                  type="button"
                >
                  <span className="font-sans font-bold">
                    {IELTS_SKILL_LABELS[item.skill]} {item.order}
                    {drafts[item.key] ? ' *' : ''}
                  </span>
                  <span className="text-xs font-semibold">
                    {busy === `gen:${item.key}`
                      ? 'Đang tạo...'
                      : GEN_LABELS[item.genStatus]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {isDraft && pendingCount ? (
            <div className="flex flex-wrap gap-2">
              <ExamButton
                disabled={busy !== null}
                onClick={() => void generateMissing()}
                tone="ink"
                type="button"
              >
                Tạo tiếp phần còn thiếu ({pendingCount})
              </ExamButton>
              {busy?.startsWith('gen:') ? (
                <ExamButton
                  onClick={() => {
                    stopLoopRef.current = true
                  }}
                  tone="paper"
                  type="button"
                >
                  Dừng
                </ExamButton>
              ) : null}
            </div>
          ) : null}
        </ExamCard>

        <ExamCard
          className="xl:sticky xl:top-4"
          title="Xuất bản"
        >
          <p className="text-sm font-semibold">
            {testReport.errors.length} lỗi · {testReport.warnings.length} cảnh
            báo
          </p>
          {isDraft ? (
            <>
              <ExamButton
                disabled={busy !== null || testReport.errors.length > 0}
                onClick={() => void publish(false)}
                tone="ink"
                type="button"
              >
                {busy === 'publish' ? 'Đang xuất bản...' : 'Xuất bản'}
              </ExamButton>
              <ExamButton
                disabled={busy !== null}
                onClick={() => void remove()}
                tone="paper"
                type="button"
              >
                Xoá bản nháp
              </ExamButton>
            </>
          ) : (
            <>
              <ExamButton
                disabled={busy !== null}
                onClick={() => void newVersion()}
                tone="ink"
                type="button"
              >
                Tạo phiên bản mới để sửa
              </ExamButton>
              {test.status === 'published' ? (
                <ExamButton
                  disabled={busy !== null}
                  onClick={() => void archive()}
                  tone="paper"
                  type="button"
                >
                  Gỡ khỏi danh sách
                </ExamButton>
              ) : null}
            </>
          )}
          <details>
            <summary className="cursor-pointer font-sans text-xs font-bold">
              Chi tiết kiểm tra
            </summary>
            <div className="mt-2 grid gap-2">
              <IssueList issues={testReport.errors} />
              <IssueList issues={testReport.warnings} />
            </div>
          </details>
        </ExamCard>
      </aside>

      <section
        aria-label="Soạn phần"
        className={cn(
          'grid content-start gap-4',
          previewTab === 'preview' && 'hidden xl:grid'
        )}
      >
        <div className="flex flex-wrap items-center gap-2 xl:hidden">
          {/* Tab toggle (aria-pressed): documented raw exception. */}
          {(['form', 'preview'] as const).map(value => (
            <button
              aria-pressed={previewTab === value}
              className={cn(
                'border-ex-line min-h-9 rounded-lg border px-3 font-sans text-sm font-bold',
                previewTab === value ? 'bg-ex-accent text-white' : 'bg-white'
              )}
              key={value}
              onClick={() => setPreviewTab(value)}
              type="button"
            >
              {value === 'form' ? 'Soạn' : 'Xem trước'}
            </button>
          ))}
        </div>
        {message ? (
          <p
            className="border-ex-line bg-ex-soft rounded-lg border px-3 py-2 text-sm font-semibold"
            role="status"
          >
            {message}
          </p>
        ) : null}
        {section && draft ? (
          <ExamCard
            action={
              isDraft ? (
                <div className="flex flex-wrap gap-2">
                  <AssistMenu
                    disabled={busy !== null}
                    onApply={input =>
                      setDrafts(current => ({
                        ...current,
                        [section.key]: input,
                      }))
                    }
                    section={section}
                    testId={test.id}
                    value={draft}
                  />
                  <ExamButton
                    disabled={busy !== null}
                    onClick={() =>
                      void generateOne(
                        section.key,
                        section.genStatus === 'needsRepair'
                          ? 'repair'
                          : section.skill === 'listening'
                            ? section.listening?.lines.length
                              ? 'questions'
                              : 'script'
                            : 'draft'
                      )
                    }
                    tone="paper"
                    type="button"
                  >
                    {section.genStatus === 'needsRepair'
                      ? 'Sửa tự động'
                      : section.skill === 'listening' &&
                          section.listening?.lines.length
                        ? 'AI tạo câu hỏi'
                        : 'AI tạo phần này'}
                  </ExamButton>
                  <ExamButton
                    disabled={busy !== null || !dirty}
                    onClick={() => void saveSection()}
                    tone="ink"
                    type="button"
                  >
                    {busy === 'save'
                      ? 'Đang lưu...'
                      : dirty
                        ? 'Lưu phần'
                        : 'Đã lưu'}
                  </ExamButton>
                </div>
              ) : null
            }
            eyebrow={`${GEN_LABELS[section.genStatus]} · rev ${section.revision}`}
            title={`${IELTS_SKILL_LABELS[section.skill]} ${section.order}`}
          >
            {section.genError ? (
              <p
                className="text-ex-wrong text-sm font-semibold"
                role="alert"
              >
                {section.genError}
              </p>
            ) : null}
            <fieldset
              className="grid min-w-0 gap-4"
              disabled={!isDraft}
            >
              <SectionForm
                audioBusy={busy === `audio:${section.key}`}
                nextNumber={nextNumberFor(test.sections, section)}
                onChange={input =>
                  setDrafts(current => ({ ...current, [section.key]: input }))
                }
                onGenerateAudio={
                  isDraft && !dirty ? () => void generateAudio() : undefined
                }
                section={section}
                value={draft}
              />
            </fieldset>
            {sectionIssues &&
            (sectionIssues.errors.length || sectionIssues.warnings.length) ? (
              <details open>
                <summary className="cursor-pointer font-sans text-xs font-bold">
                  Kiểm tra phần này: {sectionIssues.errors.length} lỗi,{' '}
                  {sectionIssues.warnings.length} cảnh báo
                </summary>
                <div className="mt-2 grid gap-2">
                  <IssueList issues={sectionIssues.errors} />
                  <IssueList issues={sectionIssues.warnings} />
                </div>
              </details>
            ) : null}
          </ExamCard>
        ) : null}
        <GenerationLog rows={test.generationLog} />
      </section>

      <section
        aria-label="Xem trước"
        className={cn(
          'border-ex-line content-start rounded-xl border bg-white p-4',
          previewTab === 'form' ? 'hidden xl:grid' : 'grid'
        )}
      >
        {previewTab === 'preview' ? (
          <ExamButton
            className="mb-3 w-fit xl:hidden"
            onClick={() => setPreviewTab('form')}
            tone="paper"
            type="button"
          >
            Quay lại soạn
          </ExamButton>
        ) : null}
        {previewSection ? <SectionPreview section={previewSection} /> : null}
      </section>

      <Dialog
        onOpenChange={setConfirmWarnings}
        open={confirmWarnings}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Xuất bản với cảnh báo?</DialogTitle>
            <DialogDescription>
              Không có lỗi chặn, nhưng còn các cảnh báo dưới đây.
            </DialogDescription>
          </DialogHeader>
          <IssueList issues={publishReport?.warnings ?? []} />
          <DialogFooter>
            <ExamButton
              onClick={() => setConfirmWarnings(false)}
              tone="paper"
              type="button"
            >
              Huỷ
            </ExamButton>
            <ExamButton
              onClick={() => void publish(true)}
              tone="ink"
              type="button"
            >
              Vẫn xuất bản
            </ExamButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
