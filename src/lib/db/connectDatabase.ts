import 'server-only'

import mongoose, { type ConnectOptions, type Mongoose } from 'mongoose'

import { getMongoDbUri } from '@/constants/environments'

interface MongooseCache {
  connection: Mongoose | null
  promise: Promise<Mongoose> | null
}

const globalForMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache
}

const mongooseCache = globalForMongoose.mongooseCache ?? {
  connection: null,
  promise: null,
}

globalForMongoose.mongooseCache = mongooseCache

/**
 * Connection options tuned for serverless functions.
 *
 * Production skips autoIndex/autoCreate: on every cold start mongoose would
 * otherwise send a createIndex per declared index before the first query
 * resolves. Indexes are built by the owner-run `bun run db:sync-indexes`
 * instead. Development keeps building indexes so schema changes show up.
 */
export function getConnectOptions(nodeEnv = process.env.NODE_ENV) {
  const options: ConnectOptions = {
    bufferCommands: false,
    maxIdleTimeMS: 60_000,
    maxPoolSize: 10,
    // Applies to every operation, not only the first connect. Long enough to
    // wait through an Atlas primary election (up to about 12 s) instead of
    // failing writes during routine maintenance.
    serverSelectionTimeoutMS: 15_000,
  }

  if (nodeEnv === 'production') {
    options.autoCreate = false
    options.autoIndex = false
  }

  return options
}

/**
 * For owner-run scripts that must write no schema side effects of their own
 * in ANY environment (db:sync-indexes, whose dry run promises to write
 * nothing). Outside production autoCreate would otherwise create every
 * missing collection a model is compiled for as soon as the connection opens.
 */
export function getManualSchemaConnectOptions(
  nodeEnv = process.env.NODE_ENV
): ConnectOptions {
  return { ...getConnectOptions(nodeEnv), autoCreate: false, autoIndex: false }
}

export async function connectDatabase() {
  if (mongooseCache.connection) return mongooseCache.connection

  if (!mongooseCache.promise)
    mongooseCache.promise = mongoose.connect(
      getMongoDbUri(),
      getConnectOptions()
    )

  try {
    mongooseCache.connection = await mongooseCache.promise
    return mongooseCache.connection
  } catch (error) {
    mongooseCache.promise = null
    throw error
  }
}
