import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import type { FullConfig } from 'playwright/test'
import { encode } from 'next-auth/jwt'

import {
  E2E_LEARNER,
  E2E_OFFLINE_USER_ID,
  E2E_STORAGE_STATE,
} from './e2eLearner'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])
// Auth.js's own default session lifetime.
const SESSION_MAX_AGE_S = 30 * 24 * 60 * 60

function writeStorageState(state: object) {
  mkdirSync(dirname(E2E_STORAGE_STATE), { recursive: true })
  writeFileSync(E2E_STORAGE_STATE, JSON.stringify(state, null, 2))
}

/** The test learner's id, upserted through the real sign-in provisioning. */
function provisionLearner() {
  if (!process.env.MONGODB_URI) return E2E_OFFLINE_USER_ID

  const output = execFileSync(
    process.execPath,
    [
      '--conditions=react-server',
      '--import',
      'tsx',
      'src/e2e/provisionE2eUser.ts',
    ],
    { encoding: 'utf8', env: process.env, stdio: ['ignore', 'pipe', 'inherit'] }
  )

  return (JSON.parse(output) as { id: string }).id
}

/**
 * Signs the browser in without Google: upserts the seeded learner, mints an
 * Auth.js session JWT for it with the server's AUTH_SECRET, and stores it as
 * the session cookie for every project that uses the storage state. No
 * test-only route ships in the app. Refuses any host but this machine, and
 * never prints the secret or the token.
 */
export default async function globalSetup(config: FullConfig) {
  // Next loads .env for the dev server; the minted token must use the same
  // secret. Values already exported in the shell win.
  try {
    process.loadEnvFile('.env')
  } catch {
    // No .env: rely on the environment.
  }

  const baseURL =
    config.projects[0]?.use.baseURL ??
    process.env.PLAYWRIGHT_BASE_URL ??
    'http://127.0.0.1:3000'
  const url = new URL(baseURL)

  if (!LOCAL_HOSTS.has(url.hostname))
    throw new Error(
      `Refusing to mint a session for ${url.hostname}: e2e sign-in only runs against localhost.`
    )

  // Without a target server every e2e test skips itself.
  if (!process.env.PLAYWRIGHT_BASE_URL) {
    writeStorageState({ cookies: [], origins: [] })
    return
  }

  const secret = process.env.AUTH_SECRET?.trim()

  if (!secret)
    throw new Error('AUTH_SECRET is not set: cannot mint the e2e session.')

  const userId = provisionLearner()
  const secure = url.protocol === 'https:'
  const cookieName = `${secure ? '__Secure-' : ''}authjs.session-token`
  const value = await encode({
    maxAge: SESSION_MAX_AGE_S,
    salt: cookieName,
    secret,
    token: {
      email: E2E_LEARNER.email,
      name: E2E_LEARNER.name,
      role: 'user',
      sub: userId,
      uid: userId,
    },
  })

  writeStorageState({
    cookies: [
      {
        domain: url.hostname,
        expires: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_S,
        httpOnly: true,
        name: cookieName,
        path: '/',
        sameSite: 'Lax',
        secure,
        value,
      },
    ],
    origins: [],
  })
}
