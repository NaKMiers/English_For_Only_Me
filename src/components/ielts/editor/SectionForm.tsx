'use client'

import { Upload } from 'lucide-react'
import { useRef, useState } from 'react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

import {
  AddButton,
  AreaField,
  ListField,
  NumberField,
  removeAt,
  replaceAt,
  RowActions,
  TextField,
} from './fields'
import { GroupEditor, newGroup } from './GroupEditor'
import { ImageUploadField } from './ImageUploadField'
import { ExamButton } from '@/components/ielts/ui'

interface Props {
  /** Number the first new question of this section should get. */
  nextNumber: number
  onChange: (input: IeltsSectionInput) => void
  onGenerateAudio?: () => void
  audioBusy?: boolean
  section: IeltsSection
  value: IeltsSectionInput
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

  return (
    <div className="grid gap-3">
      <AreaField
        label="Bối cảnh (ai nói gì, ở đâu)"
        onChange={context => onChange({ ...material, context })}
        rows={2}
        value={material.context}
      />
      <div className="border-ex-line grid gap-2 rounded-lg border bg-white p-3">
        <p className="font-sans text-xs font-bold">Audio</p>
        {material.audio?.url ? (
          <>
            {/* Admin preview of the generated or uploaded file. */}
            <audio
              className="w-full"
              controls
              preload="none"
              src={material.audio.url}
            />
            <p className="text-xs font-semibold">
              {Math.round(material.audio.durationSec)} giây ·{' '}
              {material.audio.lineOffsetsSec.length
                ? 'có mốc thời gian từng dòng'
                : 'không có mốc từng dòng'}
            </p>
          </>
        ) : (
          <p className="text-sm font-semibold">Chưa có audio.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {onGenerateAudio ? (
            <ExamButton
              disabled={audioBusy || material.lines.length === 0}
              onClick={onGenerateAudio}
              tone="ink"
              type="button"
            >
              {audioBusy ? 'Đang tạo audio...' : 'Tạo audio bằng AI'}
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
            disabled={uploading}
            icon={
              <Upload
                aria-hidden="true"
                className="size-4"
              />
            }
            onClick={() => fileRef.current?.click()}
            tone="paper"
            type="button"
          >
            {uploading ? 'Đang tải...' : 'Tải mp3 lên'}
          </ExamButton>
          {material.audio ? (
            <ExamButton
              onClick={() => onChange({ ...material, audio: null })}
              tone="paper"
              type="button"
            >
              Bỏ audio
            </ExamButton>
          ) : null}
        </div>
        {error ? (
          <p
            className="text-ex-wrong text-xs font-semibold"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <p className="font-sans text-xs font-bold">
          Kịch bản ({material.lines.length} dòng, dòng đầu là 0)
        </p>
        <ol className="grid gap-2">
          {material.lines.map((line, index) => (
            <li
              className="grid gap-2 sm:grid-cols-[2rem_8rem_8rem_1fr_auto] sm:items-end"
              key={index}
            >
              <span className="font-sans text-xs font-bold tabular-nums">
                {index}
              </span>
              <TextField
                label="Người nói"
                onChange={speaker =>
                  onChange({
                    ...material,
                    lines: replaceAt(material.lines, index, {
                      ...line,
                      speaker,
                    }),
                  })
                }
                value={line.speaker}
              />
              <div className="grid gap-1">
                <span className="font-sans text-xs font-bold">Giọng</span>
                <Select
                  onValueChange={voice =>
                    onChange({
                      ...material,
                      lines: replaceAt(material.lines, index, {
                        ...line,
                        voice: String(voice ?? line.voice),
                      }),
                    })
                  }
                  value={line.voice}
                >
                  <SelectTrigger
                    aria-label={`Giọng dòng ${index}`}
                    size="sm"
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
              <TextField
                label="Lời thoại"
                onChange={text =>
                  onChange({
                    ...material,
                    lines: replaceAt(material.lines, index, { ...line, text }),
                  })
                }
                value={line.text}
              />
              <RowActions
                label={`Xoá dòng ${index}`}
                onRemove={() =>
                  onChange({
                    ...material,
                    lines: removeAt(material.lines, index),
                  })
                }
              />
            </li>
          ))}
        </ol>
        <AddButton
          onClick={() => {
            const last = material.lines.at(-1)

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
          Thêm dòng
        </AddButton>
      </div>
    </div>
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
    .map(paragraph => paragraph.text.trim().split(/\s+/).filter(Boolean).length)
    .reduce((sum, count) => sum + count, 0)

  return (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <TextField
          label="Tiêu đề bài đọc"
          onChange={title => onChange({ ...material, title })}
          value={material.title}
        />
        <TextField
          label="Phụ đề"
          onChange={subtitle => onChange({ ...material, subtitle })}
          value={material.subtitle}
        />
      </div>
      <p className="font-sans text-xs font-bold">
        Đoạn văn ({words} từ, nên 700-1000; đoạn đầu là 0)
      </p>
      <ol className="grid gap-3">
        {material.paragraphs.map((paragraph, index) => (
          <li
            className="grid gap-2 sm:grid-cols-[2rem_4rem_1fr_auto] sm:items-start"
            key={index}
          >
            <span className="pt-6 font-sans text-xs font-bold tabular-nums">
              {index}
            </span>
            <TextField
              label="Nhãn"
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
              label="Nội dung"
              onChange={text =>
                onChange({
                  ...material,
                  paragraphs: replaceAt(material.paragraphs, index, {
                    ...paragraph,
                    text,
                  }),
                })
              }
              rows={5}
              value={paragraph.text}
            />
            <div className="pt-5">
              <RowActions
                label={`Xoá đoạn ${index}`}
                onRemove={() =>
                  onChange({
                    ...material,
                    paragraphs: removeAt(material.paragraphs, index),
                  })
                }
              />
            </div>
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
        Thêm đoạn
      </AddButton>
    </div>
  )
}

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
    <div className="border-ex-line grid gap-3 rounded-lg border bg-white p-3">
      <div className="grid gap-1">
        <span className="font-sans text-xs font-bold">Hình Task 1</span>
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
            aria-label="Loại hình"
            size="sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Không có</SelectItem>
            <SelectItem value="line">Line graph</SelectItem>
            <SelectItem value="bar">Bar chart</SelectItem>
            <SelectItem value="pie">Pie chart</SelectItem>
            <SelectItem value="table">Table</SelectItem>
            <SelectItem value="image">Ảnh (process, map)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {visual?.kind === 'image' ? (
        <>
          <ImageUploadField
            label="URL ảnh"
            onChange={imageUrl => onChange({ ...visual, imageUrl })}
            value={visual.imageUrl}
          />
          <TextField
            label="Mô tả ảnh (alt, cũng dùng cho AI chấm)"
            onChange={alt => onChange({ ...visual, alt })}
            value={visual.alt}
          />
        </>
      ) : null}
      {visual && visual.kind !== 'image' ? (
        <>
          <TextField
            label="Tiêu đề hình"
            onChange={title => onChange({ ...visual, title })}
            value={visual.title}
          />
          <div className="grid gap-2 sm:grid-cols-3">
            <TextField
              label="Nhãn trục X"
              onChange={xLabel => onChange({ ...visual, xLabel })}
              value={visual.xLabel}
            />
            <TextField
              label="Nhãn trục Y"
              onChange={yLabel => onChange({ ...visual, yLabel })}
              value={visual.yLabel}
            />
            <TextField
              label="Đơn vị"
              onChange={unit => onChange({ ...visual, unit })}
              value={visual.unit}
            />
          </div>
          <ListField
            label={
              visual.kind === 'pie' ? 'Các phần (lát bánh)' : 'Các mốc trục X'
            }
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
                  label={visual.kind === 'pie' ? 'Tên biểu đồ' : 'Tên dãy'}
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
                  label="Giá trị (cách nhau bởi ,)"
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
                  label={`Xoá dãy ${series.name}`}
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
            Thêm dãy số liệu
          </AddButton>
        </>
      ) : null}
    </div>
  )
}

function WritingForm({
  material,
  onChange,
}: {
  material: IeltsWritingMaterial
  onChange: (material: IeltsWritingMaterial) => void
}) {
  return (
    <div className="grid gap-3">
      <AreaField
        label="Đề bài"
        onChange={prompt => onChange({ ...material, prompt })}
        rows={8}
        value={material.prompt}
      />
      <NumberField
        className="w-40"
        label="Số từ tối thiểu"
        max={400}
        min={50}
        onChange={minWords => onChange({ ...material, minWords })}
        value={material.minWords}
      />
      {material.task === 1 ? (
        <VisualForm
          onChange={visual => onChange({ ...material, visual })}
          visual={material.visual}
        />
      ) : null}
      <AreaField
        label="Bài mẫu (học viên xem sau khi nộp)"
        onChange={sampleAnswer => onChange({ ...material, sampleAnswer })}
        rows={10}
        value={material.sampleAnswer}
      />
    </div>
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

  return (
    <div className="grid gap-4">
      <TextField
        label="Tiêu đề phần"
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
        <div className="grid gap-3">
          <p className="font-sans text-sm font-bold">
            Nhóm câu hỏi (
            {value.groups.flatMap(group => group.questions).length} câu)
          </p>
          {value.groups.map((group, index) => (
            <GroupEditor
              group={group}
              index={index}
              key={group.id}
              onChange={next => setGroups(replaceAt(value.groups, index, next))}
              onRemove={() => setGroups(removeAt(value.groups, index))}
            />
          ))}
          <AddButton
            onClick={() =>
              setGroups([...value.groups, newGroup(lastNumber + 1)])
            }
          >
            Thêm nhóm câu
          </AddButton>
        </div>
      ) : null}
    </div>
  )
}
