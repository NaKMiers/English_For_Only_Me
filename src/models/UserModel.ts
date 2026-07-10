import 'server-only'

import {
  models,
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from 'mongoose'

/**
 * App user, provisioned on first Google sign-in (Auth.js v5, JWT sessions).
 * We manage this with Mongoose rather than an Auth.js adapter so the whole app
 * shares one ODM and one MongoDB driver (see system-update-plan: adapter would
 * peer-require mongodb ^6 while the project ships mongodb 7 via mongoose 9).
 *
 * `role` is NOT stored as source of truth — it is derived from ADMIN_EMAILS at
 * token time. We persist only durable identity + a login timestamp.
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
  },
  {
    timestamps: true,
  }
)

export type UserDocument = InferSchemaType<typeof UserSchema>

export const UserModel =
  (models.User as Model<UserDocument> | undefined) ??
  model<UserDocument>('User', UserSchema)
