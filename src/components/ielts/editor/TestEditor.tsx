'use client'

import {
  ChevronLeft,
  ChevronRight,
  Columns2,
  Eye,
  PenLine,
  Save,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

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
  type IeltsConsistencyReport,
} from '@/modules/ielts/consistency/checkTest'
import { IELTS_SKILL_LABELS } from '@/modules/ielts/constants'
import type { IeltsSection, IeltsSectionInput } from '@/modules/ielts/schema'
import type { IeltsAdminTest } from '@/modules/ielts/tests/testService'
import {
  archiveIeltsTestApi,
  deleteIeltsTestApi,
  generateIeltsAudioApi,
  generateIeltsSectionApi,
  IeltsAdminApiError,
  type IeltsGenerateStep,
  readIeltsTestApi,
  publishIeltsTestApi,
  saveIeltsMetaApi,
  saveIeltsSectionApi,
  unarchiveIeltsTestApi,
} from '@/requests/ieltsAdminApi'

import { AssistMenu } from './AssistMenu'
import { ChecksPanel, IssueList } from './ChecksPanel'
import { EditorHeader } from './EditorHeader'
import { countLabel, Disclosure, MetaChip } from './fields'
import { GenerationLog } from './GenerationLog'
import { SectionForm } from './SectionForm'
import { isDone, SectionPicker, statusOf } from './SectionPicker'
import { SectionPreview } from './SectionPreview'
import { TestDetailsDialog, type TestMeta } from './TestDetailsDialog'
import { ExamButton, ExamIconButton, segmentClass } from '@/components/ielts/ui'

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

type Pane = 'edit' | 'split' | 'preview'

const PANES: { value: Pane; label: string; Icon: typeof Eye }[] = [
  { value: 'edit', label: 'Edit', Icon: PenLine },
  { value: 'split', label: 'Split', Icon: Columns2 },
  { value: 'preview', label: 'Preview', Icon: Eye },
]

function metaOf(test: IeltsAdminTest): TestMeta {
  return {
    title: test.title,
    series: test.series,
    track: test.track,
    targetBand: test.targetBand,
    tags: test.tags,
    description: test.description,
  }
}

/**
 * One header card (test info, checks, actions, section strip) over a
 * workspace: the section editor and the learner preview side by side from
 * 1280px, each scrolling on its own under a fixed toolbar, or one at a time
 * (Edit / Split / Preview). Test details, the full check report and the AI
 * log open in dialogs. Each section saves on its own with a revision guard;
 * Ctrl/Cmd+S saves the open one.
 */
export function TestEditor({
  initial,
  seriesOptions,
}: {
  initial: IeltsAdminTest
  seriesOptions: string[]
}) {
  const router = useRouter()
  const [test, setTest] = useState(initial)
  const [selectedKey, setSelectedKey] = useState(initial.sections[0]?.key)
  const [drafts, setDrafts] = useState<Record<string, IeltsSectionInput>>({})
  const [meta, setMeta] = useState(() => metaOf(initial))
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [publishReport, setPublishReport] =
    useState<IeltsConsistencyReport | null>(null)
  const [confirmWarnings, setConfirmWarnings] = useState(false)
  const [pane, setPane] = useState<Pane>('split')
  const [dialog, setDialog] = useState<'details' | 'checks' | 'log' | null>(
    null
  )
  const stopLoopRef = useRef(false)
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
    setMessage(
      caught instanceof Error ? caught.message : 'Something went wrong.'
    )

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
      setMessage('Saved.')
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
      setDialog(null)
      setMessage('Test details saved.')
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
   * "Generate missing sections": one request per step, section by section,
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
      setMessage('Audio generated.')
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
      setMessage('Published.')
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

  const unarchive = async () => {
    setBusy('unarchive')

    try {
      adopt((await unarchiveIeltsTestApi(test.id)).test)
    } catch (caught) {
      fail(caught)
    } finally {
      setBusy(null)
    }
  }

  const remove = async () => {
    if (!window.confirm("Delete this test? This can't be undone.")) return

    setBusy('delete')

    try {
      try {
        await deleteIeltsTestApi(test.id)
      } catch (caught) {
        const count =
          caught instanceof IeltsAdminApiError ? caught.attemptCount : null

        // Old reviews read this test: deleting it takes them along.
        if (
          !count ||
          !window.confirm(
            `${count} attempts use this test and will be deleted with it (reviews included). Delete anyway?`
          )
        )
          throw caught

        await deleteIeltsTestApi(test.id, true)
      }

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
  const sectionIndex = section ? test.sections.indexOf(section) : -1
  const prevSection = test.sections[sectionIndex - 1]
  const nextSection = test.sections[sectionIndex + 1]
  const canSave = dirty && busy === null

  // Ctrl/Cmd+S saves the open section instead of the browser's "save page".
  const saveRef = useRef(saveSection)
  useEffect(() => {
    saveRef.current = saveSection
  })
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's')
        return

      event.preventDefault()
      if (canSave) void saveRef.current()
    }

    window.addEventListener('keydown', onKey)

    return () => window.removeEventListener('keydown', onKey)
  }, [canSave])

  const generateStep: IeltsGenerateStep | null = section
    ? section.genStatus === 'needsRepair'
      ? 'repair'
      : section.skill === 'listening'
        ? section.listening?.lines.length
          ? 'questions'
          : 'script'
        : 'draft'
    : null
  const generateLabel =
    generateStep === 'repair'
      ? 'Auto-fix with AI'
      : generateStep === 'questions'
        ? 'Generate questions'
        : generateStep === 'script'
          ? 'Generate script with AI'
          : 'Generate with AI'
  const sectionStatus = section
    ? statusOf(section, busy === `gen:${section.key}`)
    : null
  const showEditor = pane !== 'preview'
  const showPreview = pane !== 'edit'

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3 sm:p-4 xl:overflow-hidden">
      <EditorHeader
        busy={busy}
        onArchive={() => void archive()}
        onDelete={() => void remove()}
        onEditDetails={() => {
          // Reopening drops edits from a cancelled dialog.
          setMeta(metaOf(test))
          setDialog('details')
        }}
        onGenerateMissing={() => void generateMissing()}
        onOpenChecks={() => setDialog('checks')}
        onOpenLog={() => setDialog('log')}
        onPublish={() => void publish(false)}
        onStop={() => {
          stopLoopRef.current = true
        }}
        onUnarchive={() => void unarchive()}
        pendingCount={pendingCount}
        picker={
          <SectionPicker
            busyKey={busy?.startsWith('gen:') ? busy.slice(4) : undefined}
            dirtyKeys={Object.keys(drafts)}
            onSelect={setSelectedKey}
            sections={test.sections}
            selectedKey={selectedKey}
          />
        }
        report={testReport}
        test={test}
      />

      {message ? (
        <div
          className="border-manga-black bg-manga-pale-red rounded-control flex shrink-0 items-center gap-2 border-2 py-1 pr-1 pl-3"
          role="status"
        >
          <p className="min-w-0 flex-1 text-sm font-semibold">{message}</p>
          <ExamIconButton
            className="size-8 border-2 shadow-none"
            label="Dismiss"
            onClick={() => setMessage('')}
            type="button"
          >
            <X
              aria-hidden="true"
              className="size-4"
            />
          </ExamIconButton>
        </div>
      ) : null}

      {section && draft ? (
        <div
          className={cn(
            'grid min-w-0 gap-4 xl:min-h-0 xl:flex-1 xl:grid-rows-[minmax(0,1fr)]',
            showEditor && showPreview && 'xl:grid-cols-2'
          )}
        >
          {showEditor ? (
            <section
              aria-label="Edit section"
              className="border-manga-black bg-manga-white rounded-panel grid min-w-0 content-start border-3 shadow-[4px_4px_0_var(--manga-black)] xl:min-h-0 xl:grid-rows-[auto_minmax(0,1fr)] xl:overflow-hidden"
            >
              <div className="border-manga-black bg-manga-white rounded-t-panel sticky top-0 z-20 flex min-w-0 flex-wrap items-center gap-2 border-b-2 px-2 py-2 sm:px-3">
                <ExamIconButton
                  className="size-9"
                  disabled={!prevSection}
                  label="Previous section"
                  onClick={() => prevSection && setSelectedKey(prevSection.key)}
                  type="button"
                >
                  <ChevronLeft
                    aria-hidden="true"
                    className="size-4"
                  />
                </ExamIconButton>
                <ExamIconButton
                  className="size-9"
                  disabled={!nextSection}
                  label="Next section"
                  onClick={() => nextSection && setSelectedKey(nextSection.key)}
                  type="button"
                >
                  <ChevronRight
                    aria-hidden="true"
                    className="size-4"
                  />
                </ExamIconButton>
                <div className="grid min-w-0 flex-1 gap-1 pl-1">
                  <h2 className="font-sans text-lg leading-none font-black uppercase">
                    {IELTS_SKILL_LABELS[section.skill]} {section.order}
                  </h2>
                  <div className="flex flex-wrap items-center gap-1">
                    {sectionStatus ? (
                      <MetaChip
                        tone={
                          isDone(section)
                            ? 'ok'
                            : section.genStatus === 'failed' ||
                                section.genStatus === 'needsRepair'
                              ? 'red'
                              : 'warn'
                        }
                      >
                        <sectionStatus.Icon
                          aria-hidden="true"
                          className={cn(
                            busy === `gen:${section.key}` && 'animate-spin'
                          )}
                        />
                        {sectionStatus.label}
                      </MetaChip>
                    ) : null}
                    <MetaChip className="tabular-nums">
                      rev {section.revision}
                    </MetaChip>
                    {dirty ? <MetaChip tone="pale">Unsaved</MetaChip> : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 max-sm:w-full">
                  <ViewSwitch
                    onChange={setPane}
                    value={pane}
                  />
                  <AssistMenu
                    disabled={busy !== null}
                    generateLabel={generateLabel}
                    onApply={input =>
                      setDrafts(current => ({
                        ...current,
                        [section.key]: input,
                      }))
                    }
                    onGenerate={() =>
                      generateStep &&
                      void generateOne(section.key, generateStep)
                    }
                    section={section}
                    testId={test.id}
                    value={draft}
                  />
                  <ExamButton
                    className="min-h-10 px-3"
                    disabled={!canSave}
                    icon={
                      <Save
                        aria-hidden="true"
                        className="size-4"
                      />
                    }
                    onClick={() => void saveSection()}
                    title="Save section (Ctrl+S)"
                    tone="ink"
                    type="button"
                  >
                    {busy === 'save' ? 'Saving...' : dirty ? 'Save' : 'Saved'}
                  </ExamButton>
                </div>
              </div>

              <div className="grid min-w-0 content-start gap-3 p-3 sm:p-4 xl:overflow-y-auto">
                {section.genError ? (
                  <p
                    className="border-manga-red text-manga-red rounded-control border-2 px-3 py-2 text-sm font-semibold"
                    role="alert"
                  >
                    {section.genError}
                  </p>
                ) : null}
                {test.status === 'published' ? (
                  <p
                    className="border-manga-black rounded-control border-2 bg-yellow-100 px-3 py-2 text-sm font-semibold"
                    role="note"
                  >
                    This test is live: learners see each saved change right
                    away, past results included.
                  </p>
                ) : null}
                {sectionIssues &&
                (sectionIssues.errors.length ||
                  sectionIssues.warnings.length) ? (
                  <Disclosure
                    defaultOpen={sectionIssues.errors.length > 0}
                    key={section.key}
                    meta={
                      <>
                        {sectionIssues.errors.length ? (
                          <MetaChip tone="red">
                            {countLabel(sectionIssues.errors.length, 'error')}
                          </MetaChip>
                        ) : null}
                        {sectionIssues.warnings.length ? (
                          <MetaChip tone="warn">
                            {countLabel(
                              sectionIssues.warnings.length,
                              'warning'
                            )}
                          </MetaChip>
                        ) : null}
                      </>
                    }
                    title="Section check"
                  >
                    <ChecksPanel report={sectionIssues} />
                  </Disclosure>
                ) : null}
                <SectionForm
                  audioBusy={busy === `audio:${section.key}`}
                  key={section.key}
                  nextNumber={nextNumberFor(test.sections, section)}
                  onChange={input =>
                    setDrafts(current => ({
                      ...current,
                      [section.key]: input,
                    }))
                  }
                  onGenerateAudio={
                    dirty ? undefined : () => void generateAudio()
                  }
                  section={section}
                  value={draft}
                />
              </div>
            </section>
          ) : null}

          {showPreview ? (
            <section
              aria-label="Preview"
              className="border-manga-black bg-manga-white rounded-panel grid min-w-0 content-start border-3 shadow-[4px_4px_0_var(--manga-black)] xl:min-h-0 xl:grid-rows-[auto_minmax(0,1fr)] xl:overflow-hidden"
            >
              <div className="border-manga-black flex min-w-0 flex-wrap items-center justify-between gap-2 border-b-2 px-3 py-2">
                <h2 className="flex items-center gap-2 font-sans text-sm font-black uppercase">
                  <Eye
                    aria-hidden="true"
                    className="size-4"
                  />
                  Learner preview
                  {dirty ? <MetaChip tone="pale">Live draft</MetaChip> : null}
                </h2>
                {showEditor ? null : (
                  <ViewSwitch
                    onChange={setPane}
                    value={pane}
                  />
                )}
              </div>
              <div className="min-w-0 p-3 sm:p-4 xl:overflow-y-auto">
                {previewSection ? (
                  <SectionPreview section={previewSection} />
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      ) : (
        <p className="text-muted-foreground p-4 text-sm font-semibold">
          This test has no sections.
        </p>
      )}

      <TestDetailsDialog
        busy={busy === 'meta'}
        meta={meta}
        onChange={setMeta}
        onOpenChange={open => setDialog(open ? 'details' : null)}
        onSave={() => void saveMeta()}
        open={dialog === 'details'}
        seriesOptions={seriesOptions}
      />

      <Dialog
        onOpenChange={open => setDialog(open ? 'checks' : null)}
        open={dialog === 'checks'}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Test checks</DialogTitle>
            <DialogDescription>
              Errors block publishing; warnings ask first. Pick an issue to open
              its section.
            </DialogDescription>
          </DialogHeader>
          <ChecksPanel
            onJump={key => {
              const target = test.sections.find(item => item.key === key)

              if (target) setSelectedKey(target.key)
              setPane(current => (current === 'preview' ? 'split' : current))
              setDialog(null)
            }}
            report={testReport}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={open => setDialog(open ? 'log' : null)}
        open={dialog === 'log'}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>AI log</DialogTitle>
            <DialogDescription>
              Every AI request on this test, newest first.
            </DialogDescription>
          </DialogHeader>
          <GenerationLog rows={test.generationLog} />
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={setConfirmWarnings}
        open={confirmWarnings}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Publish with warnings?</DialogTitle>
            <DialogDescription>
              No blocking errors, but the warnings below remain.
            </DialogDescription>
          </DialogHeader>
          <IssueList issues={publishReport?.warnings ?? []} />
          <DialogFooter>
            <ExamButton
              onClick={() => setConfirmWarnings(false)}
              tone="paper"
              type="button"
            >
              Cancel
            </ExamButton>
            <ExamButton
              onClick={() => void publish(true)}
              tone="ink"
              type="button"
            >
              Publish anyway
            </ExamButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Edit / Split / Preview: which panes the workspace shows. */
function ViewSwitch({
  onChange,
  value,
}: {
  onChange: (pane: Pane) => void
  value: Pane
}) {
  return (
    <div
      aria-label="Workspace view"
      className="flex gap-1"
      role="group"
    >
      {PANES.map(item => (
        // Segmented toggle (aria-pressed): documented raw exception.
        <button
          aria-label={item.label}
          aria-pressed={value === item.value}
          className={segmentClass(
            value === item.value,
            'inline-flex min-h-9 items-center gap-1 px-2 text-xs'
          )}
          key={item.value}
          onClick={() => onChange(item.value)}
          title={item.label}
          type="button"
        >
          <item.Icon
            aria-hidden="true"
            className="size-3.5"
          />
          <span className="hidden 2xl:inline">{item.label}</span>
        </button>
      ))}
    </div>
  )
}
