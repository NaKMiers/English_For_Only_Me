# 07 - Authentication, Infrastructure, Configuration, and Testing

This document explains how "English For Only Me" (Next.js 16, Auth.js v5 /
next-auth 5.0.0-beta.31, Mongoose 9) handles sign-in, roles, guest identity,
its external service integrations (Google OAuth, YouTube Data API, OpenAI,
Cloudinary, MongoDB, and the vocabulary dictionary/translation providers),
signed recall task tokens, environment configuration, and the test setup. Every
claim below is grounded in a specific file so an AI agent can reason about auth,
authorization, integration fallbacks, env keys, and the test harness without
reading the whole tree. Package versions: `next` 16.2.10, `next-auth`
5.0.0-beta.31, `mongoose` ^9.7.3, `vitest` ^4.1.9, `playwright` ^1.61.1
(`package.json`).

---

## 1. Authentication Architecture (Auth.js v5)

### 1.1 The edge/Node config split

Auth is deliberately split into two files so the proxy (middleware) can run on
the edge runtime, which cannot load Mongoose.

- `src/lib/auth/auth.config.ts` - the edge-safe `authConfig`. It imports only
  `@/constants/environments` and `./roles` (no Mongoose, no `server-only`
  module). It defines the Google provider plus the `authorized`, `jwt`, and
  `session` callbacks. It is typed `satisfies NextAuthConfig`.
- `src/lib/auth/auth.ts` - the full Node-runtime instance. It spreads
  `authConfig`, sets `session: { strategy: 'jwt' }`, and overrides the `jwt`
  callback with a DB-touching version that provisions the Mongoose user and
  merges guest data. It exports `{ handlers, auth, signIn, signOut }`.

The file header of `auth.config.ts` states the reason explicitly: the DB-
touching provisioning "lives in `auth.ts` (Node only)" because the config
"imports ONLY environments + roles (no Mongoose), so it can run in
`middleware.ts` on the edge runtime." `src/proxy.ts` builds its NextAuth
instance from `authConfig` alone, so no Mongoose code is ever pulled into the
edge bundle.

```mermaid
graph TD
  A[auth.config.ts edge-safe]:::edge --> B[proxy.ts NextAuth authConfig]
  A --> C[auth.ts NextAuth full]
  C --> D[handlers -> api/auth/route.ts]
  C --> E[auth / signIn / signOut -> server components + services]
  C -. provisionUserOnSignIn + mergeGuestData .-> F[(MongoDB via Mongoose)]
  B -. authorized callback only .-> G[/admin guard, no DB/]
  classDef edge fill:#eef,stroke:#333;
```

`src/app/api/auth/[...nextauth]/route.ts` is a two-line re-export of
`{ GET, POST }` from `handlers` in `auth.ts`, exposing the Auth.js HTTP routes
(sign-in, callback, sign-out, etc.).

### 1.2 Provider, session strategy, callbacks

- Provider: `Google({ clientId, clientSecret })` in `auth.config.ts`, reading
  `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` via
  `getOptionalServerEnv(...)` and defaulting to `''` when absent (so importing
  the config never throws when Google is unconfigured).
- Session strategy: JWT (`session: { strategy: 'jwt' }` in `auth.ts`). There is
  no database session table and no Auth.js adapter. `UserModel.ts` explains why:
  a Mongo adapter would peer-require `mongodb ^6`, but the project ships
  `mongodb 7` via `mongoose 9`, so the app manages the User with Mongoose
  directly and keeps one ODM/driver.
- `authorized` callback (edge, in `auth.config.ts`): returns `true` for any path
  not starting with `/admin`; for `/admin` it requires
  `auth?.user?.role === 'admin'`. Everything else is public browsing by design;
  per-user APIs enforce their own auth (see 1.6).
- `jwt` callback (edge version in `auth.config.ts`): stamps
  `token.role = resolveRole(token.email)` on every pass.
- `jwt` callback (Node override in `auth.ts`): on initial sign-in (`user.email`
  present) it calls `provisionUserOnSignIn(...)`, sets `token.uid` to the Mongo
  ObjectId, then best-effort merges guest data (see 1.5). It always ends by
  refreshing `token.role` from the allowlist.
- `session` callback (edge, in `auth.config.ts`): copies `token.uid` into
  `session.user.id` (falling back to the existing id) and recomputes
  `session.user.role` from `token.email`.

### 1.3 How role and id reach the session

The token carries `uid` (Mongo ObjectId string) and `role`; the session
callback lifts them onto `session.user`. TypeScript is taught these fields by
module augmentation in `src/types/next-auth.d.ts`:

- `declare module 'next-auth'` extends `Session.user` with
  `id: string`, `role: UserRole`, and optional `name`, `email`, `image`.
- `declare module 'next-auth/jwt'` extends `JWT` with optional
  `uid?: string` and `role?: UserRole`.

`UserRole` is imported from `@/lib/auth/roles`.

### 1.4 User provisioning

`src/lib/auth/userProvisioning.ts` (`provisionUserOnSignIn`) is a `server-only`
module. It calls `connectDatabase()`, lower-cases/trims the email, then
`UserModel.findOneAndUpdate` with `upsert: true`, `$set`-ing `name`, `image`,
`googleSub`, and `lastLoginAt`, and `$setOnInsert`-ing `email`. It returns
`{ id: String(user._id) }`. That ObjectId is the canonical `userId` for every
user-scoped collection (favorites, sessions, attempts, review items, debriefs,
stats); catalog content (videos, transcripts, segments) is global and not tied
to it. `UserModel.ts` stores only durable identity plus `lastLoginAt`; `role` is
intentionally NOT persisted (derived from `ADMIN_EMAILS` at token time). The
schema enforces `email` unique/lowercase/trim and indexes `googleSub`.

### 1.5 Guest identity and guest-data merge

`src/lib/auth/guestUser.ts` (a `server-only` module) implements cookie-based
anonymous identity so practice never requires login:

- Cookie `dictationGuestId` (`GUEST_COOKIE_NAME`), 1-year max-age, `httpOnly`,
  `sameSite: 'lax'`, `secure` only in production, path `/`.
- Guest ids are `guest_` + a de-hyphenated `crypto.randomUUID()`. `isGuestId`
  tests the `guest_` prefix.
- `getGuestId()` reads the cookie (never writes) - safe in Server Components.
- `getOrCreateGuestId()` mints and writes a cookie when absent - only valid in
  Route Handlers or Server Functions.
- `clearGuestCookie()` deletes the cookie after a merge.

On first sign-in, the Node `jwt` callback in `auth.ts` reads the guest id and,
if present, calls `mergeGuestDataIntoUser(guestId, id)` then `clearGuestCookie()`.
This is wrapped in try/catch so a merge failure logs but never blocks login.

`src/modules/dictation/services/mergeGuestData.ts` (`mergeGuestDataIntoUser`)
reassigns guest rows to the real user via `updateMany({ userId: guestId },
{ $set: { userId } })` across `DictationSessionModel`, `DictationAttemptModel`,
`DictationReviewItemModel`, and `DictationDebriefModel` (in parallel). It bails
out early if the id is not a guest id or equals the target. Only collision-safe
collections are merged: attempts are safe because their unique index is
`{ userId, sessionId, idempotencyKey }` over guest-owned session ObjectIds.
Favorites are deliberately excluded because favoriting requires login (a guest
never creates any) and their `{ userId, videoId }` unique index could otherwise
collide.

```mermaid
sequenceDiagram
  participant U as User (had guest cookie)
  participant G as Google
  participant J as jwt callback (auth.ts, Node)
  participant DB as MongoDB
  U->>G: signIn('google')
  G-->>J: profile { email, name, image }
  J->>DB: provisionUserOnSignIn (upsert User)
  DB-->>J: ObjectId -> token.uid
  J->>J: getGuestId() from cookie
  alt guest cookie present
    J->>DB: mergeGuestDataIntoUser (reassign sessions/attempts/reviews/debriefs)
    J->>U: clearGuestCookie()
  end
  J->>J: token.role = resolveRole(email)
```

### 1.6 getCurrentUser vs getOptionalUser and route protection

`src/modules/dictation/services/getCurrentUser.ts` (`server-only`) is the shared
identity seam. It defines error classes `UnauthenticatedError` (status 401) and
`ForbiddenError` (status 403), and these resolvers:

- `getOptionalUser()` - reads `auth()`; returns a `CurrentUser` or `null` when
  anonymous (public browsing). No throw.
- `requireUser()` - `getOptionalUser()` or throws `UnauthenticatedError`. The
  "R3 seam": callers scope every per-user query to the returned id, never a
  client-supplied id.
- `requirePracticeActor()` - returns the signed-in user id or mints a guest id
  (`getOrCreateGuestId`); writes a cookie, so Route Handlers / Server Functions
  only. Never throws.
- `getPracticeActorId()` - read-only variant for Server Components: user id, an
  existing guest id, or `null`. Never writes a cookie.
- `requireAdmin()` - `requireUser()` then throws `ForbiddenError` if
  `role !== 'admin'`.

Route protection is defense in depth, matching `.agents/rules/api-security.md`
("Admin APIs must verify authorization in the route handler or a shared
server-side helper even when middleware/proxy also protects them"; "Do not trust
client-sent userId, role..."; "Prefer server-derived identity"):

1. Edge proxy: `src/proxy.ts` matcher `['/admin/:path*']` runs the `authorized`
   callback, requiring the admin role before `/admin/*` renders.
2. Admin layout re-check: `src/app/admin/layout.tsx` (`runtime = 'nodejs'`,
   `dynamic = 'force-dynamic'`) calls `getOptionalUser()`; redirects anonymous
   users to `/api/auth/signin?callbackUrl=/admin` and non-admins to `/dictation`.
3. Per-route service re-checks: admin route handlers and server actions
   (for example `src/modules/dictation/content/adminActions.ts`,
   `src/app/api/dictation/imports/youtube/route.ts`, the transcript/segment/
   video API routes) call `requireAdmin()` / `requireUser()` themselves.

### 1.7 Signed recall task tokens

`src/modules/vocabulary/recall/recallTaskToken.ts` (`server-only`) issues
tamper-proof tokens so a vocabulary recall task can be graded without trusting
the client to send back the correct answer. Design:

- Format: `base64url(JSON payload).base64url(HMAC-SHA256 signature)`.
  `createVocabRecallTaskToken(payload, now)` stamps
  `expiresAt = now + VOCAB_RECALL_TASK_TOKEN_TTL_MS` (30 minutes, from
  `src/modules/vocabulary/constants.ts`) onto the payload, encodes it, and
  appends an HMAC over the encoded payload.
- Payload (`VocabRecallTaskTokenPayload`) carries `correctAnswer`,
  `correctOptionId`, `entryId`, `itemId`, `recallStage`, `taskId`, `type`,
  `userId`, and `expiresAt`. The correct answer travels inside the signed blob,
  never in a client-writable field.
- Signing secret cascade (`getSigningSecret`): `AUTH_SECRET` ->
  `NEXTAUTH_SECRET` -> the literal dev fallback
  `'development-vocab-recall-task-secret'`, so signing never throws in a
  no-secret dev setup while production reuses the Auth.js secret.
- `verifyVocabRecallTaskToken({ token, userId, now })` splits the token,
  recomputes the HMAC, and compares with `crypto.timingSafeEqual` (after a
  length guard) to resist timing attacks. It then parses the payload and returns
  `null` unless `payload.userId === userId` and `payload.expiresAt >= now`. Any
  parse error also yields `null`. Binding to `userId` stops one user replaying
  another user's task token.

---

## 2. Roles and Authorization

`src/lib/auth/roles.ts` defines `UserRole = 'admin' | 'user'` and derives role
from the `ADMIN_EMAILS` allowlist - it is never trusted from the client:

- `resolveRole(email)` returns `'user'` for empty email, otherwise `'admin'` if
  `getAdminEmails()` contains the trimmed lower-cased email, else `'user'`.
- `isAdminEmail(email)` is `resolveRole(email) === 'admin'`.

`getAdminEmails()` (`src/constants/environments.ts`) parses `ADMIN_EMAILS` as a
comma-separated list into a normalized lower-cased `Set<string>` (empty set when
unset). Because role is recomputed on every token/session pass and never stored,
adding or removing an admin email takes effect on the next token refresh without
a DB migration. In the UI, `AuthControl.tsx` passes `isAdmin={user.role ===
'admin'}` into `UserMenu.tsx`, which only renders the "Admin" link and badge for
admins.

---

## 3. External Integrations

All integration code lives under `src/lib/*` behind helper functions (per
`api-security.md`: "provider-specific code behind a helper"). Each degrades
gracefully when its key is absent.

### 3.1 Google OAuth

- Env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET` (JWT signing),
  plus `ADMIN_EMAILS`. Redirect URI documented in `.env.example`:
  `<origin>/api/auth/callback/google`.
- Helper `hasGoogleAuth()` returns true only when both client id and secret are
  set. `AuthControl.tsx` returns `null` (renders nothing) when
  `!hasGoogleAuth()`, so the app still runs in a no-auth dev setup. Provider
  construction falls back to `''` credentials rather than throwing.

### 3.2 YouTube Data API

- Env: `YOUTUBE_API_KEY` (optional).
- `src/lib/youtube/extractYouTubeId.ts` - pure parser (`extractYouTubeId`) that
  validates/normalizes a URL to an 11-char video id, accepting `watch`,
  `youtu.be`, `shorts`, `embed`, `live`, and `youtube-nocookie` embed URLs, and
  returns a discriminated `{ ok: true, videoId, normalizedUrl }` or
  `{ ok: false, message }`. No network, no key.
- `src/lib/youtube/getYouTubeVideoMetadata.ts` - calls
  `GET https://www.googleapis.com/youtube/v3/videos` (`part=snippet,
contentDetails,status`, `cache: 'no-store'`) via an injectable `fetcher`.
  Graceful degradation: with no key it returns `{ state: 'apiKeyMissing' }` and
  the video is saved as a URL-only draft (transcript can be added manually).
  Other states: `notFound` (404 or empty items), `failed` (unreadable body,
  missing title, network error), and `ready` with mapped metadata plus an
  optional non-embeddable `warning`. `parseIso8601DurationSeconds` and
  `mapYouTubeVideosListResponse` are pure and unit-testable.

### 3.3 OpenAI

- Env: `OPENAI_API_KEY` (optional), `OPENAI_DEBRIEF_MODEL` (default
  `gpt-5.4-nano` via `getOpenAiDebriefModel()`). `OPENAI_TRANSLATION_MODEL` is
  still declared in `.env`/`.env.example` but is legacy: it is NOT in `ENV_KEYS`
  and no source module reads it. Vocabulary translation now uses the MyMemory
  provider (see 3.6), and vocabulary enrichment does not call OpenAI at all.
  OpenAI is used only for the dictation debrief.
- `src/lib/ai/openAiClientCore.ts` - provider-agnostic core
  (`requestOpenAiStructuredOutput`). Posts to
  `https://api.openai.com/v1/responses` with a strict `json_schema` format,
  `max_output_tokens: 1400`, `cache: 'no-store'`, and an injectable `fetcher`.
  Graceful degradation: with a null `apiKey` it returns
  `{ ok: false, message: 'OpenAI provider is not configured.' }`; it also
  returns `ok: false` for non-200 responses, incomplete status, empty text, or
  thrown errors ("OpenAI debrief provider is unavailable.").
- `src/lib/ai/openAiClient.ts` (`server-only`) - thin wrapper
  (`requestOpenAiDebriefStructuredOutput`) that injects
  `getOpenAiApiKey()` and `getOpenAiDebriefModel()` into the core. AI-powered
  features surface an "unavailable" state to the UI rather than failing hard.

### 3.4 Cloudinary

- Env: `CLOUDINARY_URL` (required by its helper - `getCloudinaryUrl()` uses
  `getRequiredServerEnv`, so upload throws if unset). Server-only; used by admin
  topic-thumbnail uploads.
- `src/lib/cloudinary/uploadImage.ts` (`server-only`) - `getImageFile` pulls a
  non-empty `File` from `FormData`; `uploadImageToCloudinary` validates MIME
  (`image/`) and 5MB max, parses the `cloudinary://key:secret@cloud` URL, builds
  a SHA-1 signed upload (folder `english-for-only-me/topic-thumbnails`), POSTs to
  `https://api.cloudinary.com/v1_1/<cloud>/image/upload`, and returns the
  `secure_url`. Throws clear messages on wrong protocol, oversized/non-image
  files, or a failed upload. (No silent no-key fallback - thumbnail upload is an
  admin-only action.)

### 3.5 MongoDB (Mongoose)

- Env: `MONGODB_URI` (required by `getMongoDbUri()`; `hasMongoDbUri()` is the
  optional check).
- `src/lib/db/connectDatabase.ts` (`server-only`) - cached Mongoose connection
  on `globalThis.mongooseCache` to survive hot-reload / serverless reuse. It
  memoizes the connect promise, sets `bufferCommands: false`, and clears the
  cached promise on failure so a later call can retry.

### 3.6 Vocabulary dictionary and translation providers

The vocabulary feature enriches seeded terms by calling free public APIs. No
provider needs an API key. Code lives under
`src/modules/vocabulary/providers/*`; the enrichment orchestrator is
`src/modules/vocabulary/enrichment/enrichmentService.ts`.

Provider contract (`providers/types.ts`): every dictionary adapter is a
`VocabProviderAdapter` (`(VocabProviderInput) => Promise<VocabProviderResult>`).
`VocabProviderResult` is a discriminated union with statuses `ready` (carries a
`NormalizedProviderPayload`), `notFound`, `rateLimited` (optional `retryAfter`),
`timeout`, `malformed` (carries `message`), and `emptyUsefulData`. Input accepts
an injectable `fetcher` (so adapters are unit-tested with a mock), `language`,
`term`, `now`, and `timeoutMs`.

Shared HTTP layer (`providers/providerUtils.ts`): `fetchProviderJson` runs the
request behind an `AbortController` that aborts after
`input.timeoutMs ?? VOCAB_LOOKUP_TIMEOUT_MS` (8000 ms, from
`src/modules/vocabulary/constants.ts`). It maps HTTP status to result:
`404 -> notFound`, `429 -> rateLimited` (parsing the `retry-after` header via
`getRetryAfter`), other non-2xx -> `malformed`, an `AbortError` -> `timeout`,
and any other throw -> `malformed`. `hasUsefulPayload` gates a normalized
payload: an adapter downgrades a parsed-but-empty result to `emptyUsefulData`
unless it has at least one definition, phonetic, audio url, synonym, or related
word.

| Provider (`VocabProviderName`) | File | External API | Role | Key |
| ------------------------------ | ---- | ------------ | ---- | --- |
| `dictionaryapi.dev` | `providers/dictionaryApiDev.ts` | `GET https://api.dictionaryapi.dev/api/v2/entries/<lang>/<term>` | Primary dictionary lookup; parses phonetics, audio urls, definitions, examples, synonyms/antonyms, license, and `sourceUrls` | none |
| `freedictionaryapi.com` | `providers/freeDictionaryApi.ts` | `GET https://freedictionaryapi.com/api/v1/entries/<lang>/<term>` | Fallback dictionary lookup; parses `entries[].senses`, pronunciations, `forms` -> related words, per-source license/attribution (no audio urls) | none |
| `mymemory.translated.net` | `providers/myMemoryTranslate.ts` | `GET https://api.mymemory.translated.net/get?langpair=en\|vi&mt=1&q=<text>` | Vietnamese translation, not a dictionary adapter | none |

Dictionary fallback chain: `getDefaultVocabProviders()` (`providers/index.ts`)
returns `[fetchDictionaryApiDevEntry, fetchFreeDictionaryApiEntry]` in order.
`runProviders` (enrichment service) calls each in turn and stops at the first
`ready`; if none is ready it collects every non-ready result for error
reporting.

Translation (`myMemoryTranslate.ts`): `translateTextToVietnamese` is a separate
helper (not part of the adapter chain). It trims the query to a 480-byte
provider limit (`trimToProviderLimit`, UTF-8 aware), runs behind the same
8000 ms `AbortController`, and returns `null` on any non-ok response, malformed
JSON, empty/echoed translation, timeout, or thrown error - never a partial
result. The provider name is exported as `MY_MEMORY_PROVIDER`.

Enrichment orchestration (`enrichment/enrichmentService.ts`, `server-only`):

- Lease-based locking: `acquireEnrichmentLease` / `acquireNextEnrichmentLease`
  do a `findOneAndUpdate` that flips an eligible entry to `enriching`, stamps a
  random `enrichmentLockId`, increments `enrichmentAttempts`, and sets a lease
  that expires after `VOCAB_ENRICHMENT_LEASE_MS` (60000 ms). Eligible entries
  are `seeded`/`pending`, `ready`-but-missing-Vietnamese, `failed` past
  `nextRetryAt`, or `enriching` with an expired lease (so a crashed worker's
  lock self-heals). All writes back are guarded on the matching `lockId`.
- After a `ready` dictionary result, `persistReadyResult` merges definitions,
  examples, phonetics, audio, synonyms/antonyms, related words, and source
  attributions into the entry, then calls `buildVietnameseMeanings`, which uses
  `translateTextToVietnamese` when no Vietnamese meaning exists yet. An entry is
  only marked `ready` if it has a Vietnamese meaning; otherwise it is set back
  to `failed` with a `missingVietnameseMeaning` provider error and a
  `nextRetryAt` one hour out.
- `persistFailedResult` records up to the last 20 provider errors, sets
  `notFound` when every provider returned `notFound`, else `failed` with a
  `nextRetryAt` (honoring a provider `retryAfter` when present).
- `enrichVocabEntryIfNeeded(entryId)` enriches one entry; the admin batch path
  `enrichNextVocabularyEntries({ limit })` clamps `limit` to 1..10 and runs up
  to two workers in parallel, returning an `AdminEnrichResult` tally.
  `getVocabAdminQueueSummary` counts pending/ready/failed/notFound/stale-lease
  entries.

Admin enrich route: `src/app/api/admin/vocab/enrich/route.ts`
(`runtime = 'nodejs'`). Both `GET` (queue summary) and `POST` (run a batch)
first call `getMissingVocabMongoResponse()` (503 when `MONGODB_URI` is unset),
then `requireAdmin()` and `connectDatabase()`. `POST` validates the body with
`parseAdminEnrichRequest` and maps a bad JSON body to a 400. All errors funnel
through `toVocabApiError`.

---

## 4. Environment Variables

Central access is `src/constants/environments.ts` via `ENV_KEYS`,
`getOptionalServerEnv`, and `getRequiredServerEnv` (which throws
`MissingEnvironmentError`). All keys are server-only; none is `NEXT_PUBLIC_*`
(per `api-security.md`). Every key below is declared (values not shown) in
`.env` and `.env.example`. `ENV_KEYS` maps a camelCase alias to each raw key.

| Key                        | Required?                     | Purpose                                                | Default                                                |
| -------------------------- | ----------------------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| `MONGODB_URI`              | Required (for DB features)    | Mongoose connection string                             | none (`getMongoDbUri` throws if unset)                 |
| `AUTH_SECRET`              | Required for sign-in          | Auth.js JWT signing secret; also signs recall tokens   | none (recall token falls back to a dev literal)        |
| `GOOGLE_CLIENT_ID`         | Required for Google auth      | OAuth client id                                        | `''` fallback in provider                              |
| `GOOGLE_CLIENT_SECRET`     | Required for Google auth      | OAuth client secret                                    | `''` fallback in provider                              |
| `ADMIN_EMAILS`             | Optional                      | Comma-separated admin allowlist                        | empty set (no admins)                                  |
| `YOUTUBE_API_KEY`          | Optional                      | YouTube Data API metadata import                       | none -> URL-only drafts                                |
| `OPENAI_API_KEY`           | Optional                      | OpenAI dictation debrief calls                         | none -> AI unavailable state                           |
| `OPENAI_DEBRIEF_MODEL`     | Optional                      | Model id for AI debrief                                | `gpt-5.4-nano`                                         |
| `OPENAI_TRANSLATION_MODEL` | Legacy / unused               | Declared in env files but read by no code (see below)  | not applicable                                         |
| `CLOUDINARY_URL`           | Required for thumbnail upload | `cloudinary://` credentials                            | none (`getCloudinaryUrl` throws if unset)              |
| `IELTS_GOAL`               | Optional                      | Prompt/goal string for AI debrief                      | `IELTS Listening Band 7+`                              |
| `SITE_URL`                 | Optional                      | Canonical origin for SEO/sitemap/OG, no trailing slash | falls back to `AUTH_URL`, then `http://localhost:3000` |

Notes:

- The vocabulary dictionary/translation providers (3.6) need no env keys.
- `OPENAI_TRANSLATION_MODEL` is present in `.env`/`.env.example` for historical
  reasons only; it is not in `ENV_KEYS` and no source module reads it. Do not
  rely on it - vocabulary translation goes through the keyless MyMemory
  provider.
- `NEXTAUTH_SECRET` is not in `ENV_KEYS` either, but `recallTaskToken.ts` reads
  it via `getOptionalServerEnv('NEXTAUTH_SECRET')` as a fallback after
  `AUTH_SECRET` (see 1.7).
- `getSiteUrl()` strips trailing slashes and cascades `SITE_URL` -> `AUTH_URL`
  -> `http://localhost:3000`.
- `getAdminEmails()` normalizes and lower-cases the list into a `Set`.
- There is no committed `.env.development`; the vocab seed script references it
  only via `--env-file-if-exists` (a no-op when absent). Secret values are not
  reproduced here.

---

## 5. Testing

### 5.1 Frameworks

- Unit/component: Vitest 4 with `@vitejs/plugin-react`, jsdom environment, and
  Testing Library (`@testing-library/react`, `@testing-library/jest-dom`,
  `@testing-library/dom`). Config: `vitest.config.mts`.
- E2E: Playwright (`playwright.config.ts`). The dependency is the `playwright`
  package (`^1.61.1`), so tests and the config import from `playwright/test`
  (not `@playwright/test`). Config: `testDir: './src'`,
  `testMatch: '**/*.e2e.ts'`, `fullyParallel: true`, a single Chromium project,
  base URL `PLAYWRIGHT_BASE_URL` or `http://127.0.0.1:3000`; on CI it sets
  `forbidOnly`, `retries: 2`, and a single worker. There is no `bun`/`package.json`
  script for Playwright; run it directly (for example `bunx playwright test`).

### 5.2 Vitest setup and the server-only stub

`vitest.config.mts` sets `environment: 'jsdom'`, `globals: true`,
`setupFiles: ['./src/test/setup.ts']`, and inlines `next-auth` and
`@auth/core` deps. Critically it aliases both `server-only` and `client-only`
to `src/test/serverOnlyStub.ts`. Those npm guard packages throw when imported
outside their intended environment; the stub is an empty module
(`export {}`) so server modules (auth, DB, integration helpers, services) can be
unit-tested directly under jsdom without the guard aborting the import.

Setup files:

- `src/test/setup.ts` - imports `@testing-library/jest-dom/vitest`, runs
  `cleanup()` after each test, and globally mocks `@/components/common/AuthControl`
  to render `null` (it is an async server component that reads the JWT session
  and cannot render under the synchronous test renderer).
- `src/test/setupDom.ts` - a `setupDom()` helper that installs a fresh JSDOM
  `window`/`document`/`navigator` and a set of DOM globals
  (`HTMLElement`, `Event`, `KeyboardEvent`, `MutationObserver`, etc.) plus
  `attachEvent`/`detachEvent` shims, registering a one-time `afterEach` cleanup.
  It is imported by component tests that need an explicit DOM (for example
  `DictationImportForm.test.tsx`, `GuidedAnswerInput.test.tsx`,
  `useYoutubeDictationPlayer.test.tsx`).
- `src/test/jsdom.d.ts` - a minimal ambient type declaration for the `jsdom`
  module.

### 5.3 Count, naming, and style

- `find src -name '*.test.ts*' | wc -l` => 74 co-located test files.
- `find src -name '*.e2e.ts' | wc -l` => 1 Playwright smoke file
  (`src/modules/vocabulary/vocabularyCore.e2e.ts`). It `test.skip`s itself unless
  both `PLAYWRIGHT_BASE_URL` and `MONGODB_URI` are set, because it needs a running
  app and a real vocabulary database. The flow searches a term, saves it to the
  learn list, answers one recall task, and asserts the stats/queue update.
- New vocabulary unit tests since the last docs pass:
  `src/modules/vocabulary/providers/dictionaryApiDev.test.ts` and
  `src/modules/vocabulary/providers/freeDictionaryApi.test.ts` (adapter parsing
  with a mock `fetcher`), alongside existing
  `src/modules/vocabulary/services/vocabularyRouteDecisions.test.ts`,
  `recall/recallScheduler.test.ts`, `stats/vocabStats.test.ts`,
  `normalizeVocabTerm.test.ts`, `seed/seedVocabulary.test.ts`, and
  `services/vocabWordListService.test.ts`. There is no dedicated unit test yet
  for `myMemoryTranslate`, `providerUtils`, `enrichmentService`, or
  `recallTaskToken`.
- Naming convention (per `.agents/rules/testing-quality.md`): unit tests sit
  next to source as `*.test.ts` / `*.test.tsx`; Playwright e2e as `*.e2e.ts`.
- Heavy use of pure decision-function unit tests: the rules direct extracting
  validation and pure decision logic out of route handlers so it can be tested
  "without a full database/auth environment." Examples in this doc's scope:
  `extractYouTubeId`, `parseIso8601DurationSeconds`,
  `mapYouTubeVideosListResponse`, `requestOpenAiStructuredOutput` (injectable
  `fetcher`), `resolveRole`/`isAdminEmail`, `normalizeVocabTerm`,
  vocabulary provider adapters, vocabulary route-decision helpers, recall
  scheduling, and `backfillContentHierarchy` (which accepts an injected
  `BackfillVideoModel` so it runs with a mock instead of a live DB).

### 5.4 Quality gates

From `package.json` scripts and `.agents/rules/testing-quality.md` (preferred
runtime is Bun because the repo has `bun.lock`):

| Gate   | Command                                       | Notes                                                   |
| ------ | --------------------------------------------- | ------------------------------------------------------- |
| Lint   | `bun run lint` (`eslint`)                     | TS/React changes must pass                              |
| Format | `bun run format:check` (`prettier . --check`) | Prettier, no-semi single-quote house style              |
| Build  | `bun run build` (`next build`)                | Run for App Router / metadata / build-sensitive changes |
| Test   | `bun test` / `bun run test` (`vitest run`)    | Watch via `test:watch`                                  |

Additional expectations: API/security changes verify both success and unhappy
paths; broaden the verification set when changes affect auth, data, routing, or
AI; never weaken lint/type rules to land code; do not hide errors with empty
catches (the guest-merge catch in `auth.ts` logs before swallowing, by design).

---

## 6. Operational Scripts

`scripts/backfillContentHierarchy.ts` (npm script `backfill:content`) files
pre-hierarchy dictation videos into the no-topic / ungrouped state. It runs
under Node (not Bun - the mongodb driver needs `node:v8` snapshot APIs Bun
lacks) via `tsx` with `--conditions=react-server`, which resolves `server-only`
imports to their no-op stub. It connects Mongoose directly, delegates to
`backfillContentHierarchy` in `src/modules/dictation/content/backfill.ts`, and
defaults to a DRY RUN unless `--apply` is passed. The core function is
idempotent: it matches videos missing any of `topicId`/`sectionId`/`level` and
`$set`s them to `null`; a second run matches zero. The model is injected
(`BackfillVideoModel` interface) so the logic is unit-testable without a live
database.

`scripts/seedVocabulary.ts` (script `vocab:seed`) downloads the official NGSL
stats CSV through `src/modules/vocabulary/seed/seedVocabulary.ts`, parses the top
1000 ranked terms, connects through `connectDatabase()`, and upserts seeded
`VocabEntry` shells. It runs with
`node --conditions=react-server --env-file-if-exists=.env.development --import tsx`
for the same `server-only` compatibility reason as the backfill script (the
`--env-file-if-exists` flag is a no-op since no `.env.development` is committed).

`scripts/backfillVocabularyVietnameseMeanings.ts` (script `vocab:backfill-vi`)
fills in missing Vietnamese meanings for existing entries. It connects via
`connectDatabase()`, selects entries matching `VOCAB_MISSING_VI_MEANING_FILTER`
(or all when `--overwrite` is passed), and reuses `enrichVocabEntryIfNeeded` plus
`translateTextToVietnamese` (3.6). Batch size comes from a numeric argv, the
`VOCAB_VI_BACKFILL_LIMIT` env var, or a default of 25. It runs with the same
`node --conditions=react-server --env-file-if-exists=.env --import tsx` wrapper.

`scripts/resegmentAllTranscripts.ts` (script `resegment`) rebuilds dictation
transcript segments and runs under the same Node/`tsx` wrapper.
