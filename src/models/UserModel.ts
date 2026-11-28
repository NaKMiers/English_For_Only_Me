import 'server-only'

import {
  models,
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from 'mongoose'

export const USER_STATUSES = ['active', 'locked'] as const

export type UserStatus = (typeof USER_STATUSES)[number]

/**
 * App user, provisioned on first Google sign-in (Auth.js v5, JWT sessions).
 * We manage this with Mongoose rather than an Auth.js adapter so the whole app
 * shares one ODM and one MongoDB driver (see system-update-plan: adapter would
 * peer-require mongodb ^6 while the project ships mongodb 7 via mongoose 9).
 *
 * `role` is NOT stored as source of truth - it is derived from ADMIN_EMAILS at
 * token time. We persist durable identity, a login timestamp and the admin's
 * lock (`status`, see src/lib/auth/accountStatus.ts).
 */
const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    googleSub: {
      type: String,
      default: null,
      index: true,
    },
    name: {
      type: String,
      default: null,
      trim: true,
    },
    image: {
      type: String,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    /** `locked`: an admin shut the account; sign-in and sessions refuse it. */
    status: {
      type: String,
      enum: USER_STATUSES,
      default: 'active',
    },
    lockedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

export type UserDocument = InferSchemaType<typeof UserSchema>

export const UserModel =
  (models.User as Model<UserDocument> | undefined) ??
  model<UserDocument>('User', UserSchema)
