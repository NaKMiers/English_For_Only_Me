import 'server-only'

import mongoose, { type Mongoose } from 'mongoose'

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

export async function connectDatabase() {
  if (mongooseCache.connection) return mongooseCache.connection

  if (!mongooseCache.promise)
    mongooseCache.promise = mongoose.connect(getMongoDbUri(), {
      bufferCommands: false,
    })

  try {
    mongooseCache.connection = await mongooseCache.promise
    return mongooseCache.connection
  } catch (error) {
    mongooseCache.promise = null
    throw error
  }
}
