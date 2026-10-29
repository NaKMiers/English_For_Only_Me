import 'server-only'

import {
  models,
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from 'mongoose'

import { OWNER_KEY_PATTERN } from '@/lib/auth/ownerKey'
import {
  IELTS_ATTEMPT_MODES,
  IELTS_ATTEMPT_STATUSES,
  IELTS_SKILLS,
  IELTS_TRACKS,
} from '@/modules/ielts/constants'

/*
 * One learner's attempt at one skill (or one part of it). All per-learner
 * IELTS state lives here, keyed by ownerId; test documents stay shared.
 *
 *            start (idempotent)
 *                 |
 *                 v
 *   +------- in_progress -------+
 *   | PUT answers (seq guard,   |  past deadline + grace, on any read
 *   | deadline in the filter)   v
 *   |                        expired --(L/R: score saved answers)--+
 *   | submit (idempotent)       | (writing: -> submitted)          |
 *   v                           v                                  v
 * submitted --(L/R: score inline)--------------------------------> scored
 *   | writing: grade route per task (done | failed, retry)
 *   +--(both tasks done)--> scored
 */

const ScopeSchema = new Schema(
  {
    kind: { type: String, enum: ['skill', 'part'], required: true },
    part: { type: Number, default: null },
  },
  { _id: false }
)

const DrillItemSchema = new Schema(
  {
    testId: { type: Schema.Types.ObjectId, required: true },
    testSlug: { type: String, required: true },
    version: { type: Number, required: true },
    sectionKey: { type: String, required: true },
    groupId: { type: String, required: true },
    numberMap: {
      type: [
        new Schema({ drillNo: Number, originalNo: Number }, { _id: false }),
      ],
      default: [],
    },
  },
  { _id: false }
)

const GradingSchema = new Schema(
  {
    task: { type: Number, enum: [1, 2], required: true },
    at: { type: Date, required: true },
  },
  { _id: false }
)

const IeltsAttemptSchema = new Schema(
  {
    ownerId: {
      type: String,
      required: true,
      trim: true,
      match: OWNER_KEY_PATTERN,
    },
    idempotencyKey: { type: String, required: true, trim: true },
    testId: { type: Schema.Types.ObjectId, default: null },
    testSlug: { type: String, default: '' },
    testVersion: { type: Number, default: 0 },
    testTitle: { type: String, default: '' },
    track: { type: String, enum: IELTS_TRACKS, default: 'academic' },
    skill: { type: String, enum: IELTS_SKILLS, required: true },
    mode: { type: String, enum: IELTS_ATTEMPT_MODES, required: true },
    scope: { type: ScopeSchema, required: true },
    items: { type: [DrillItemSchema], default: [] },
    sessionId: { type: String, default: null },
    status: {
      type: String,
      enum: IELTS_ATTEMPT_STATUSES,
      default: 'in_progress',
    },
    startedAt: { type: Date, required: true },
    deadlineAt: { type: Date, default: null },
    audioEvents: { type: [Schema.Types.Mixed], default: [] },
    /** `{ "<number>": string | string[] }`, writing `{ "1": essay, "2": essay }`. */
    answers: { type: Schema.Types.Mixed, default: {} },
    savedSeq: { type: Number, default: 0 },
    submittedAt: { type: Date, default: null },
    scoredAt: { type: Date, default: null },
    result: { type: Schema.Types.Mixed, default: null },
    answerKeySnapshot: { type: Schema.Types.Mixed, default: null },
    writingFeedback: { type: Schema.Types.Mixed, default: null },
    writingBand: { type: Number, default: null },
    gradings: { type: [GradingSchema], default: [] },
  },
  { timestamps: true, minimize: false }
)

IeltsAttemptSchema.index({ ownerId: 1, idempotencyKey: 1 }, { unique: true })
IeltsAttemptSchema.index({
  ownerId: 1,
  testId: 1,
  skill: 1,
  'scope.kind': 1,
  startedAt: -1,
})
IeltsAttemptSchema.index({ ownerId: 1, status: 1, mode: 1 })
IeltsAttemptSchema.index({ ownerId: 1, 'gradings.at': 1 })

export type IeltsAttemptDocument = InferSchemaType<typeof IeltsAttemptSchema>

export const IeltsAttemptModel =
  (models.IeltsAttempt as Model<IeltsAttemptDocument> | undefined) ??
  model<IeltsAttemptDocument>('IeltsAttempt', IeltsAttemptSchema)
