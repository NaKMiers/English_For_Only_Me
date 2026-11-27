'use client'

import {
  AudioLines,
  LoaderCircle,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react'
import { useRef, useState } from 'react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useMessages } from '@/i18n/client'
import { format, plural } from '@/i18n/format'
import { cn } from '@/lib/utils'
import { LISTENING_VOICES } from '@/modules/ielts/constants'
import type {
  IeltsChartVisual,
  IeltsListeningMaterial,
  IeltsQuestionGroup,
  IeltsReadingMaterial,
  IeltsSection,
  IeltsSectionInput,
  IeltsVisual,
  IeltsWritingMaterial,
} from '@/modules/ielts/schema'
import { uploadIeltsFileApi } from '@/requests/ieltsAdminApi'

import { AdminAudioPlayer } from './AdminAudioPlayer'
import { apiErrorText } from './apiErrorText'
import {
  AddButton,
  AreaField,
  Disclosure,
  EntryPager,
  INNER_BOX_CLASS,
  ListField,
  MetaChip,
  NumberField,
  removeAt,
  replaceAt,
  RowActions,
  TextField,
} from './fields'
import { GroupEditor, newGroup } from './GroupEditor'
import { ImageUploadField } from './ImageUploadField'
import { ExamButton, ExamIconButton } from '@/components/ielts/ui'

interface Props {
  /** Number the first new question of this section should get. */
  nextNumber: number
  onChange: (input: IeltsSectionInput) => void
  onGenerateAudio?: () => void
  audioBusy?: boolean
  section: IeltsSection
  value: IeltsSectionInput
}

/** Compact sticker buttons for the audio row, a size down from ActionButton. */
const AUDIO_BUTTON_CLASS = 'min-h-9 border px-3'

/** Script lines shown per page; a full part runs to 40-60 lines. */
const LINE_PAGE_SIZE = 8

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/** First words of a block, for a closed row's summary. */
function snippet(text: string, empty: string) {
  const clean = text.trim().replace(/\s+/g, ' ')

  return clean
    ? clean.length > 90
      ? `${clean.slice(0, 90)}...`
      : clean
    : empty
}

function formatDuration(seconds: number) {
  const whole = Math.round(seconds)

  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

function ListeningForm({
  audioBusy,
  material,
  onChange,
  onGenerateAudio,
}: {
  audioBusy?: boolean
  material: IeltsListeningMaterial
  onChange: (material: IeltsListeningMaterial) => void
  onGenerateAudio?: () => void
}) {
  const t = useMessages()
  const copy = t.ieltsEditor.form
  const counts = t.ieltsEditor.counts
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const pageCount = Math.max(
    1,
    Math.ceil(material.lines.length / LINE_PAGE_SIZE)
  )
  // Deleting the last line of the last page falls back a page.
  const safePage = Math.min(page, pageCount - 1)
  const pageStart = safePage * LINE_PAGE_SIZE
  const visibleLines = material.lines.slice(
    pageStart,
    pageStart + LINE_PAGE_SIZE
  )
  const pager = (
    <EntryPager
      label={copy.line}
      onPageChange={setPage}
      page={safePage}
      pageSize={LINE_PAGE_SIZE}
      total={material.lines.length}
    />
  )

  const upload = async (file: File) => {
    setUploading(true)
    setError('')

    try {
      const result = await uploadIeltsFileApi('audio', file)

      // A manual mp3 has no line offsets (OV-7).
      onChange({
        ...material,
        audio: {
          url: result.url,
          publicId: result.publicId,
          durationSec: result.durationSec,
          lineOffsetsSec: [],
        },
      })
    } catch (caught) {
      setError(apiErrorText(caught, t, t.ieltsEditor.upload.failed))
    } finally {
      setUploading(false)
    }
  }

  const speakers = new Set(material.lines.map(line => line.speaker)).size

  return (
    <>
      <Disclosure
        defaultOpen={!material.audio?.url || !material.context}
        meta={
          material.audio?.url ? (
            <>
              <MetaChip tone="ok">
                {formatDuration(material.audio.durationSec)}
              </MetaChip>
              {material.audio.lineOffsetsSec.length
                ? copy.timings
                : copy.noTimings}
            </>
          ) : (
            <MetaChip tone="warn">{copy.noAudio}</MetaChip>
          )
        }
        title={copy.contextAudio}
        variant="block"
      >
        <AreaField
          label={copy.context}
          onChange={context => onChange({ ...material, context })}
          rows={2}
          value={material.context}
        />
        <div className={cn(INNER_BOX_CLASS, 'grid gap-2 p-2')}>
          {material.audio?.url ? (
            <AdminAudioPlayer
              audio={material.audio}
              key={material.audio.url}
              lines={material.lines}
            />
          ) : (
            <p className="border-line/40 text-ink-soft rounded-tag flex min-h-10 items-center gap-2 border border-dashed px-3 text-sm font-normal">
              <AudioLines
                aria-hidden="true"
                className="size-4 shrink-0"
              />
              {copy.noAudioYet}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {onGenerateAudio ? (
              <ExamButton
                className={AUDIO_BUTTON_CLASS}
                disabled={audioBusy || material.lines.length === 0}
                icon={
                  audioBusy ? (
                    <LoaderCircle
                      aria-hidden="true"
                      className="size-4 animate-spin"
                    />
                  ) : (
                    <Sparkles
                      aria-hidden="true"
                      className="size-4"
                    />
                  )
                }
                onClick={onGenerateAudio}
                tone={material.audio ? 'paper' : 'ink'}
                type="button"
              >
                {audioBusy
                  ? t.ieltsEditor.genStatus.generating
                  : material.audio
                    ? copy.regenerate
                    : copy.generateAudio}
              </ExamButton>
            ) : null}
            {/* File input behind an sr-only trigger: documented raw exception. */}
            <input
              accept="audio/*"
              className="sr-only"
              onChange={event => {
                const file = event.target.files?.[0]

                if (file) void upload(file)
                event.target.value = ''
              }}
              ref={fileRef}
              tabIndex={-1}
              type="file"
            />
            <ExamButton
              className={AUDIO_BUTTON_CLASS}
              disabled={uploading}
              icon={
                uploading ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 animate-spin"
                  />
                ) : (
                  <Upload
                    aria-hidden="true"
                    className="size-4"
                  />
                )
              }
              onClick={() => fileRef.current?.click()}
              tone="paper"
              type="button"
            >
              {uploading
                ? t.ieltsEditor.upload.uploading
                : material.audio
                  ? copy.replaceMp3
                  : copy.uploadMp3}
            </ExamButton>
            {material.audio ? (
              <ExamIconButton
                className="hover:bg-brand hover:text-surface text-brand ml-auto size-9 border"
                label={copy.removeAudio}
                onClick={() => onChange({ ...material, audio: null })}
                type="button"
              >
                <Trash2
                  aria-hidden="true"
                  className="size-4"
                />
              </ExamIconButton>
            ) : null}
          </div>
          {error ? (
            <p
              className="text-brand text-xs font-semibold"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>
      </Disclosure>
      <Disclosure
        defaultOpen={material.lines.length === 0}
        meta={format(copy.scriptMeta, {
          lines: plural(counts.line, material.lines.length),
          speakers: plural(counts.speaker, speakers),
        })}
        title={copy.script}
        variant="block"
      >
        {pager}
        <ol className="grid gap-2">
          {visibleLines.map((line, offset) => {
            const index = pageStart + offset
            const setLine = (next: Partial<typeof line>) =>
              onChange({
                ...material,
                lines: replaceAt(material.lines, index, { ...line, ...next }),
              })

            return (
              <li
                className={cn(
                  INNER_BOX_CLASS,
                  '@container grid min-w-0 gap-2 p-2'
                )}
                key={index}
              >
                <div className="flex min-w-0 items-end gap-2">
                  <MetaChip className="mb-2 tabular-nums">{index}</MetaChip>
                  <div className="grid min-w-0 flex-1 gap-2 @xs:grid-cols-2">
                    <TextField
                      label={copy.speaker}
                      onChange={speaker => setLine({ speaker })}
                      value={line.speaker}
                    />
                    <div className="grid gap-1">
                      <span className="font-sans text-xs font-semibold">
                        {copy.voice}
                      </span>
                      <Select
                        onValueChange={voice =>
                          setLine({ voice: String(voice ?? line.voice) })
                        }
                        value={line.voice}
                      >
                        <SelectTrigger
                          aria-label={format(copy.voiceFor, { index })}
                          className="w-full data-[size=default]:min-h-10 data-[size=default]:py-1.5"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LISTENING_VOICES.map(voice => (
                            <SelectItem
                              key={voice.id}
                              value={voice.id}
                            >
                              {voice.id} ({copy.voiceHints[voice.hint]})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <RowActions
                    label={format(copy.removeLine, { index })}
                    onRemove={() =>
                      onChange({
                        ...material,
                        lines: removeAt(material.lines, index),
                      })
                    }
                  />
                </div>
                <AreaField
                  label={format(copy.lineText, { index })}
                  onChange={text => setLine({ text })}
                  rows={2}
                  value={line.text}
                />
              </li>
            )
          })}
        </ol>
        <AddButton
          onClick={() => {
            const last = material.lines.at(-1)

            // Jump to the page the new line lands on.
            setPage(Math.floor(material.lines.length / LINE_PAGE_SIZE))
            onChange({
              ...material,
              lines: [
                ...material.lines,
                {
                  speaker: last?.speaker ?? 'Speaker',
                  voice: last?.voice ?? 'alloy',
                  text: '',
                },
              ],
            })
          }}
        >
          {copy.addLine}
        </AddButton>
      </Disclosure>
    </>
  )
}

function ReadingForm({
  material,
  onChange,
}: {
  material: IeltsReadingMaterial
  onChange: (material: IeltsReadingMaterial) => void
}) {
  const t = useMessages()
  const copy = t.ieltsEditor.form
  const words = material.paragraphs
    .map(paragraph => countWords(paragraph.text))
    .reduce((sum, count) => sum + count, 0)

  return (
    <Disclosure
      defaultOpen={material.paragraphs.length === 0}
      meta={
        <>
          <MetaChip tone={words >= 700 && words <= 1000 ? 'ok' : 'warn'}>
            {plural(t.ieltsEditor.counts.word, words)}
          </MetaChip>
          {format(copy.passageMeta, {
            paragraphs: plural(
              t.ieltsEditor.counts.paragraph,
              material.paragraphs.length
            ),
          })}
        </>
      }
      title={copy.passage}
      variant="block"
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <TextField
          label={copy.passageTitle}
          onChange={title => onChange({ ...material, title })}
          value={material.title}
        />
        <TextField
          label={copy.subtitle}
          onChange={subtitle => onChange({ ...material, subtitle })}
          value={material.subtitle}
        />
      </div>
      <ol className="grid gap-2">
        {material.paragraphs.map((paragraph, index) => (
          <li key={index}>
            <Disclosure
              actions={
                <RowActions
                  label={format(copy.removeParagraph, { index })}
                  onRemove={() =>
                    onChange({
                      ...material,
                      paragraphs: removeAt(material.paragraphs, index),
                    })
                  }
                />
              }
              defaultOpen={!paragraph.text}
              meta={
                <>
                  <span className="tabular-nums">
                    {format(copy.wordsShort, {
                      count: countWords(paragraph.text),
                    })}
                  </span>
                  <span className="truncate">
                    {snippet(paragraph.text, copy.empty)}
                  </span>
                </>
              }
              title={
                <span className="flex items-center gap-1.5">
                  <MetaChip className="tabular-nums">{index}</MetaChip>
                  {paragraph.label
                    ? format(copy.paragraph, { label: paragraph.label })
                    : null}
                </span>
              }
            >
              <div className="grid gap-2 @md:grid-cols-[6rem_minmax(0,1fr)] @md:items-start">
                <TextField
                  label={copy.label}
                  onChange={label =>
                    onChange({
                      ...material,
                      paragraphs: replaceAt(material.paragraphs, index, {
                        ...paragraph,
                        label,
                      }),
                    })
                  }
                  value={paragraph.label}
                />
                <AreaField
                  label={copy.text}
                  onChange={text =>
                    onChange({
                      ...material,
                      paragraphs: replaceAt(material.paragraphs, index, {
                        ...paragraph,
                        text,
                      }),
                    })
                  }
                  rows={6}
                  value={paragraph.text}
                />
              </div>
            </Disclosure>
          </li>
        ))}
      </ol>
      <AddButton
        onClick={() =>
          onChange({
            ...material,
            paragraphs: [
              ...material.paragraphs,
              {
                label: material.paragraphs.every(item => item.label)
                  ? String.fromCharCode(65 + material.paragraphs.length)
                  : '',
                text: '',
              },
            ],
          })
        }
      >
        {copy.addParagraph}
      </AddButton>
    </Disclosure>
  )
}

/** Labels come from `ieltsEditor.visual.kinds`, in this order. */
const VISUAL_KINDS = ['none', 'line', 'bar', 'pie', 'table', 'image'] as const

const EMPTY_CHART: IeltsChartVisual = {
  kind: 'line',
  title: '',
  xLabel: '',
  yLabel: '',
  unit: '',
  categories: [],
  series: [],
}

function VisualForm({
  onChange,
  visual,
}: {
  onChange: (visual: IeltsVisual | null) => void
  visual: IeltsVisual | null
}) {
  const t = useMessages()
  const copy = t.ieltsEditor.visual
  const kind = visual?.kind ?? 'none'

  return (
    <Disclosure
      defaultOpen={!visual}
      meta={copy.kinds[kind]}
      title={copy.title}
      variant="block"
    >
      <div className="grid gap-1">
        <span className="font-sans text-xs font-semibold">{copy.title}</span>
        <Select
          onValueChange={value => {
            const next = String(value ?? 'none')

            if (next === 'none') onChange(null)
            else if (next === 'image')
              onChange({ kind: 'image', imageUrl: '', alt: '' })
            else
              onChange({
                ...(visual && visual.kind !== 'image' ? visual : EMPTY_CHART),
                kind: next as IeltsChartVisual['kind'],
              })
          }}
          value={kind}
        >
          <SelectTrigger
            aria-label={copy.type}
            size="sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VISUAL_KINDS.map(value => (
              <SelectItem
                key={value}
                value={value}
              >
                {copy.kinds[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {visual?.kind === 'image' ? (
        <>
          <ImageUploadField
            label={copy.imageUrl}
            onChange={imageUrl => onChange({ ...visual, imageUrl })}
            value={visual.imageUrl}
          />
          <TextField
            label={copy.imageAlt}
            onChange={alt => onChange({ ...visual, alt })}
            value={visual.alt}
          />
        </>
      ) : null}
      {visual && visual.kind !== 'image' ? (
        <>
          <TextField
            label={copy.visualTitle}
            onChange={title => onChange({ ...visual, title })}
            value={visual.title}
          />
          <div className="grid gap-2 sm:grid-cols-3">
            <TextField
              label={copy.xLabel}
              onChange={xLabel => onChange({ ...visual, xLabel })}
              value={visual.xLabel}
            />
            <TextField
              label={copy.yLabel}
              onChange={yLabel => onChange({ ...visual, yLabel })}
              value={visual.yLabel}
            />
            <TextField
              label={copy.unit}
              onChange={unit => onChange({ ...visual, unit })}
              value={visual.unit}
            />
          </div>
          <ListField
            label={visual.kind === 'pie' ? copy.slices : copy.categories}
            onChange={categories => onChange({ ...visual, categories })}
            separator=","
            value={visual.categories}
          />
          <ol className="grid gap-2">
            {visual.series.map((series, index) => (
              <li
                className="flex flex-wrap items-end gap-2"
                key={index}
              >
                <TextField
                  className="w-40"
                  label={
                    visual.kind === 'pie' ? copy.chartName : copy.seriesName
                  }
                  onChange={name =>
                    onChange({
                      ...visual,
                      series: replaceAt(visual.series, index, {
                        ...series,
                        name,
                      }),
                    })
                  }
                  value={series.name}
                />
                <TextField
                  className="min-w-48 flex-1"
                  label={copy.values}
                  onChange={text =>
                    onChange({
                      ...visual,
                      series: replaceAt(visual.series, index, {
                        ...series,
                        values: text
                          .split(',')
                          .map(item => Number(item.trim()))
                          .filter(Number.isFinite),
                      }),
                    })
                  }
                  value={series.values.join(', ')}
                />
                <RowActions
                  label={format(copy.removeSeries, { name: series.name })}
                  onRemove={() =>
                    onChange({
                      ...visual,
                      series: removeAt(visual.series, index),
                    })
                  }
                />
              </li>
            ))}
          </ol>
          <AddButton
            onClick={() =>
              onChange({
                ...visual,
                series: [...visual.series, { name: '', values: [] }],
              })
            }
          >
            {copy.addSeries}
          </AddButton>
        </>
      ) : null}
    </Disclosure>
  )
}

function WritingForm({
  material,
  onChange,
}: {
  material: IeltsWritingMaterial
  onChange: (material: IeltsWritingMaterial) => void
}) {
  const t = useMessages()
  const copy = t.ieltsEditor.form
  const sampleWords = countWords(material.sampleAnswer)

  return (
    <>
      <Disclosure
        defaultOpen
        meta={format(copy.taskMeta, {
          words: plural(t.ieltsEditor.counts.word, countWords(material.prompt)),
          min: material.minWords,
        })}
        title={copy.task}
        variant="block"
      >
        <AreaField
          hint={copy.promptHint}
          label={copy.prompt}
          onChange={prompt => onChange({ ...material, prompt })}
          rows={6}
          value={material.prompt}
        />
        <NumberField
          className="w-40"
          label={copy.minWords}
          max={400}
          min={50}
          onChange={minWords => onChange({ ...material, minWords })}
          value={material.minWords}
        />
      </Disclosure>
      {material.task === 1 ? (
        <VisualForm
          onChange={visual => onChange({ ...material, visual })}
          visual={material.visual}
        />
      ) : null}
      <Disclosure
        defaultOpen={!material.sampleAnswer}
        meta={
          <>
            <MetaChip tone={sampleWords >= material.minWords ? 'ok' : 'warn'}>
              {plural(t.ieltsEditor.counts.word, sampleWords)}
            </MetaChip>
            {copy.sampleMeta}
          </>
        }
        title={copy.sampleAnswer}
        variant="block"
      >
        <AreaField
          label={copy.sampleAnswer}
          onChange={sampleAnswer => onChange({ ...material, sampleAnswer })}
          rows={10}
          value={material.sampleAnswer}
        />
      </Disclosure>
    </>
  )
}

/** The editable content of one section, by skill. */
export function SectionForm({
  audioBusy,
  nextNumber,
  onChange,
  onGenerateAudio,
  section,
  value,
}: Props) {
  const t = useMessages()
  const copy = t.ieltsEditor.form
  const setGroups = (groups: IeltsQuestionGroup[]) =>
    onChange({ ...value, groups })
  const lastNumber =
    value.groups.flatMap(group => group.questions).at(-1)?.number ??
    nextNumber - 1

  const questionCount = value.groups.flatMap(group => group.questions).length

  return (
    <div className="grid gap-3">
      <TextField
        label={copy.sectionTitle}
        onChange={title => onChange({ ...value, title })}
        value={value.title}
      />
      {section.skill === 'listening' && value.listening ? (
        <ListeningForm
          audioBusy={audioBusy}
          material={value.listening}
          onChange={listening => onChange({ ...value, listening })}
          onGenerateAudio={onGenerateAudio}
        />
      ) : null}
      {section.skill === 'reading' && value.reading ? (
        <ReadingForm
          material={value.reading}
          onChange={reading => onChange({ ...value, reading })}
        />
      ) : null}
      {section.skill === 'writing' && value.writing ? (
        <WritingForm
          material={value.writing}
          onChange={writing => onChange({ ...value, writing })}
        />
      ) : null}
      {section.skill !== 'writing' ? (
        <Disclosure
          defaultOpen
          meta={format(copy.questionsMeta, {
            questions: plural(t.ieltsEditor.counts.question, questionCount),
            groups: plural(t.ieltsEditor.counts.group, value.groups.length),
          })}
          title={copy.questions}
          variant="block"
        >
          <ol className="grid gap-2">
            {value.groups.map((group, index) => (
              <li key={group.id}>
                <GroupEditor
                  group={group}
                  index={index}
                  onChange={next =>
                    setGroups(replaceAt(value.groups, index, next))
                  }
                  onRemove={() => setGroups(removeAt(value.groups, index))}
                />
              </li>
            ))}
          </ol>
          <AddButton
            onClick={() =>
              setGroups([...value.groups, newGroup(lastNumber + 1)])
            }
          >
            {copy.addGroup}
          </AddButton>
        </Disclosure>
      ) : null}
    </div>
  )
}
