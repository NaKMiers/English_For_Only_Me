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
import {
  AddButton,
  AreaField,
  countLabel,
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

/** Compact sticker buttons for the audio row, a size down from MangaButton. */
const AUDIO_BUTTON_CLASS =
  'min-h-9 border-2 px-3 shadow-[2px_2px_0_var(--manga-black)]'

/** Script lines shown per page; a full part runs to 40-60 lines. */
const LINE_PAGE_SIZE = 8

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/** First words of a block, for a closed row's summary. */
function snippet(text: string, empty = 'Empty') {
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
      label="Line"
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
      setError(caught instanceof Error ? caught.message : 'Upload failed.')
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
                ? 'per-line timings'
                : 'no per-line timings'}
            </>
          ) : (
            <MetaChip tone="warn">No audio</MetaChip>
          )
        }
        title="Context & audio"
        variant="block"
      >
        <AreaField
          label="Context (who speaks, where)"
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
            <p className="border-manga-black/40 text-manga-ink-soft rounded-tag flex min-h-10 items-center gap-2 border-2 border-dashed px-3 text-sm font-semibold">
              <AudioLines
                aria-hidden="true"
                className="size-4 shrink-0"
              />
              No audio yet. Generate it from the script or upload an mp3.
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
                  ? 'Generating...'
                  : material.audio
                    ? 'Regenerate'
                    : 'Generate audio'}
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
                ? 'Uploading...'
                : material.audio
                  ? 'Replace mp3'
                  : 'Upload mp3'}
            </ExamButton>
            {material.audio ? (
              <ExamIconButton
                className="hover:bg-manga-red hover:text-manga-white text-manga-red ml-auto size-9 border-2 shadow-[2px_2px_0_var(--manga-black)]"
                label="Remove audio"
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
              className="text-manga-red text-xs font-semibold"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>
      </Disclosure>
      <Disclosure
        defaultOpen={material.lines.length === 0}
        meta={`${countLabel(material.lines.length, 'line')} · ${countLabel(speakers, 'speaker')} · first line is 0`}
        title="Script"
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
                      label="Speaker"
                      onChange={speaker => setLine({ speaker })}
                      value={line.speaker}
                    />
                    <div className="grid gap-1">
                      <span className="font-sans text-xs font-black">
                        Voice
                      </span>
                      <Select
                        onValueChange={voice =>
                          setLine({ voice: String(voice ?? line.voice) })
                        }
                        value={line.voice}
                      >
                        <SelectTrigger
                          aria-label={`Voice for line ${index}`}
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
                              {voice.id} ({voice.hint})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <RowActions
                    label={`Remove line ${index}`}
                    onRemove={() =>
                      onChange({
                        ...material,
                        lines: removeAt(material.lines, index),
                      })
                    }
                  />
                </div>
                <AreaField
                  label={`Line ${index} text`}
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
          Add line
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
  const words = material.paragraphs
    .map(paragraph => countWords(paragraph.text))
    .reduce((sum, count) => sum + count, 0)

  return (
    <Disclosure
      defaultOpen={material.paragraphs.length === 0}
      meta={
        <>
          <MetaChip tone={words >= 700 && words <= 1000 ? 'ok' : 'warn'}>
            {words} words
          </MetaChip>
          {countLabel(material.paragraphs.length, 'paragraph')} · aim for
          700-1000 words
        </>
      }
      title="Passage"
      variant="block"
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <TextField
          label="Passage title"
          onChange={title => onChange({ ...material, title })}
          value={material.title}
        />
        <TextField
          label="Subtitle"
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
                  label={`Remove paragraph ${index}`}
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
                    {countWords(paragraph.text)}w
                  </span>
                  <span className="truncate">{snippet(paragraph.text)}</span>
                </>
              }
              title={
                <span className="flex items-center gap-1.5">
                  <MetaChip className="tabular-nums">{index}</MetaChip>
                  {paragraph.label ? `Paragraph ${paragraph.label}` : null}
                </span>
              }
            >
              <div className="grid gap-2 @md:grid-cols-[6rem_minmax(0,1fr)] @md:items-start">
                <TextField
                  label="Label"
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
                  label="Text"
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
        Add paragraph
      </AddButton>
    </Disclosure>
  )
}

const VISUAL_LABELS = {
  none: 'None',
  line: 'Line graph',
  bar: 'Bar chart',
  pie: 'Pie chart',
  table: 'Table',
  image: 'Image (process, map)',
} as const

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
  const kind = visual?.kind ?? 'none'

  return (
    <Disclosure
      defaultOpen={!visual}
      meta={VISUAL_LABELS[kind]}
      title="Task 1 visual"
      variant="block"
    >
      <div className="grid gap-1">
        <span className="font-sans text-xs font-black">Task 1 visual</span>
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
            aria-label="Visual type"
            size="sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(VISUAL_LABELS).map(([value, label]) => (
              <SelectItem
                key={value}
                value={value}
              >
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {visual?.kind === 'image' ? (
        <>
          <ImageUploadField
            label="Image URL"
            onChange={imageUrl => onChange({ ...visual, imageUrl })}
            value={visual.imageUrl}
          />
          <TextField
            label="Image description (alt, also used for AI grading)"
            onChange={alt => onChange({ ...visual, alt })}
            value={visual.alt}
          />
        </>
      ) : null}
      {visual && visual.kind !== 'image' ? (
        <>
          <TextField
            label="Visual title"
            onChange={title => onChange({ ...visual, title })}
            value={visual.title}
          />
          <div className="grid gap-2 sm:grid-cols-3">
            <TextField
              label="X-axis label"
              onChange={xLabel => onChange({ ...visual, xLabel })}
              value={visual.xLabel}
            />
            <TextField
              label="Y-axis label"
              onChange={yLabel => onChange({ ...visual, yLabel })}
              value={visual.yLabel}
            />
            <TextField
              label="Unit"
              onChange={unit => onChange({ ...visual, unit })}
              value={visual.unit}
            />
          </div>
          <ListField
            label={visual.kind === 'pie' ? 'Slices' : 'X-axis categories'}
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
                  label={visual.kind === 'pie' ? 'Chart name' : 'Series name'}
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
                  label="Values (separated by ,)"
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
                  label={`Remove series ${series.name}`}
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
            Add data series
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
  const sampleWords = countWords(material.sampleAnswer)

  return (
    <>
      <Disclosure
        defaultOpen
        meta={`${countWords(material.prompt)} words · min ${material.minWords} in the answer`}
        title="Task"
        variant="block"
      >
        <AreaField
          label="Prompt"
          onChange={prompt => onChange({ ...material, prompt })}
          rows={6}
          value={material.prompt}
        />
        <NumberField
          className="w-40"
          label="Minimum words"
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
              {sampleWords} words
            </MetaChip>
            learners see it after submitting
          </>
        }
        title="Sample answer"
        variant="block"
      >
        <AreaField
          label="Sample answer"
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
  const setGroups = (groups: IeltsQuestionGroup[]) =>
    onChange({ ...value, groups })
  const lastNumber =
    value.groups.flatMap(group => group.questions).at(-1)?.number ??
    nextNumber - 1

  const questionCount = value.groups.flatMap(group => group.questions).length

  return (
    <div className="grid gap-3">
      <TextField
        label="Section title"
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
          meta={`${countLabel(questionCount, 'question')} in ${countLabel(value.groups.length, 'group')}`}
          title="Questions"
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
            Add question group
          </AddButton>
        </Disclosure>
      ) : null}
    </div>
  )
}
