# 07 - Authentication, Infrastructure, Configuration, and Testing

This document explains how "English For Only Me" (Next.js 16, Auth.js v5 /
next-auth 5.0.0-beta.31, Mongoose 9) handles sign-in, roles, guest identity and
its merge into an account, the owner-key data-isolation contract, its external
service integrations (Google OAuth, YouTube Data API, OpenAI structured outputs
and text-to-speech, Cloudinary image and audio uploads, MongoDB, and the
vocabulary dictionary/translation providers), signed recall task tokens, the
shared-content cache and its revalidation, the client write outbox, environment
configuration, and the test setup. Every claim below is grounded in a specific
file so an AI agent can reason about auth, authorization, integration fallbacks
and limits, env keys, and the test harness without reading the whole tree.
IELTS grading and generation domain logic lives in `docs/09-ielts.md`; this doc
covers only how they call OpenAI and Cloudinary. Package versions: `next`
16.2.10, `next-auth` 5.0.0-beta.31, `mongoose` ^9.7.3, `zod` ^4.4.3, `vitest`
^4.1.9, `playwright` ^1.61.1 (`package.json`).

---

## 1. Authentication Architecture (Auth.js v5)

### 1.1 The edge/Node config split

Auth is deliberately split into two files so the proxy (the Next.js 16 name for
middleware) can run on the edge runtime, which cannot load Mongoose.

- `src/lib/auth/auth.config.ts` - the edge-safe `authConfig`. It imports only
  `@/constants/environments` and `./roles` (no Mongoose, no `server-only`
  module). It defines the Google provider plus the `authorized`, `jwt`, and
  `session` callbacks. It is typed `satisfies NextAuthConfig`.
- `src/lib/auth/auth.ts` - the full Node-runtime instance. It spreads
  `authConfig`, sets `session: { strategy: 'jwt' }`, and overrides the `jwt`
  callback with a DB-touching version that provisions the Mongoose user and
  folds guest data into it (`foldGuestIntoUser`). It exports
  `{ handlers, auth, signIn, signOut }`.
- `src/proxy.ts` builds its own NextAuth instance from `authConfig` alone
  (`export default auth`) with `matcher: ['/admin/:path*']`, so no Mongoose
  code is ever pulled into the edge bundle.

```mermaid
graph TD
  A[auth.config.ts<br/>edge-safe]:::edge --> B[proxy.ts<br/>NextAuth authConfig]
  A --> C[auth.ts<br/>NextAuth full]
  C --> D[handlers<br/>api/auth/...nextauth/route.ts]
  C --> E[auth / signIn / signOut<br/>server components + services]
  C -. provisionUserOnSignIn<br/>foldGuestIntoUser .-> F[(MongoDB via Mongoose)]
  B -. authorized callback only .-> G[/admin guard, no DB/]
  classDef edge fill:#eef,stroke:#333;
```

`src/app/api/auth/[...nextauth]/route.ts` re-exports `{ GET, POST }` from
`handlers` in `auth.ts`, exposing the Auth.js HTTP routes (sign-in, callback,
sign-out, etc.).

### 1.2 Provider, session strategy, callbacks

- Provider: `Google({ clientId, clientSecret })` in `auth.config.ts`, reading
  `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` via `getOptionalServerEnv(...)`
  and defaulting to `''` when absent (so importing the config never throws when
  Google is unconfigured).
- Session strategy: JWT (`session: { strategy: 'jwt' }` in `auth.ts`). There is
  no database session table and no Auth.js adapter. `src/models/UserModel.ts`
  explains why: a Mongo adapter would peer-require `mongodb ^6`, but the
  project ships `mongodb 7` via `mongoose 9`, so the app manages the User with
  Mongoose directly and keeps one ODM/driver.
- `authorized` callback (edge, `auth.config.ts`): returns `true` for any path
  not starting with `/admin`; for `/admin` it requires
  `auth?.user?.role === 'admin'`. Everything else is public browsing by design;
  per-user APIs enforce their own auth (see 1.6).
- `jwt` callback (edge version, `auth.config.ts`): stamps
  `token.role = resolveRole(token.email)` on every pass.
- `jwt` callback (Node override, `auth.ts`): on sign-in (`user.email` present)
  it calls `provisionUserOnSignIn(...)` (passing `token.sub` as `googleSub`),
  sets `token.uid` to the Mongo ObjectId, then awaits `foldGuestIntoUser(id)`
  (see 1.5). It always ends by refreshing `token.role` from the allowlist.
- `session` callback (edge, `auth.config.ts`): copies `token.uid` into
  `session.user.id` (falling back to the existing id) and recomputes
  `session.user.role` from `token.email`.

### 1.3 How role and id reach the session

The token carries `uid` (Mongo ObjectId string) and `role`; the session
callback lifts them onto `session.user`. TypeScript learns these fields by
module augmentation in `src/types/next-auth.d.ts`:

- `declare module 'next-auth'` extends `Session.user` with `id: string`,
  `role: UserRole`, and optional `name`, `email`, `image`.
- `declare module 'next-auth/jwt'` extends `JWT` with optional `uid?: string`
  and `role?: UserRole`.

`UserRole` is imported from `@/lib/auth/roles`.

### 1.4 User provisioning

`src/lib/auth/userProvisioning.ts` (`provisionUserOnSignIn`, `server-only`)
calls `connectDatabase()`, lower-cases/trims the email, then
`UserModel.findOneAndUpdate` with `upsert: true` and
`returnDocument: 'after'`, `$set`-ing `name`, `image`, `googleSub`, and
`lastLoginAt`, and `$setOnInsert`-ing `email`. It returns
`{ id: String(user._id) }`. That ObjectId is the canonical owner id for every
user-scoped collection; catalog content (videos, transcripts, segments) is
global and not tied to it. `role` is intentionally NOT persisted (derived from
`ADMIN_EMAILS` at token time).

### 1.5 Guest identity and guest-data merge

`src/lib/auth/guestUser.ts` (`server-only`) implements cookie-based anonymous
identity so practice never requires login:

| Item                                                           | Value / behavior                                                                                                               |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Cookie `dictationGuestId` (`GUEST_COOKIE_NAME`)                | 1-year max-age, `httpOnly`, `sameSite: 'lax'`, `secure` only in production, path `/`                                           |
| Guest id format                                                | `guest_` + de-hyphenated `crypto.randomUUID()` (32 hex); `isGuestId` tests the `guest_` prefix                                 |
| `getGuestId()`                                                 | Reads the cookie, never writes - safe in Server Components                                                                     |
| `getOrCreateGuestId()`                                         | Mints and writes the cookie when absent - Route Handlers / Server Functions only                                               |
| `clearGuestCookie()`                                           | Deletes both `dictationGuestId` and `dictationGuestMergeOwner`                                                                 |
| Cookie `dictationGuestMergeOwner` (`GUEST_MERGE_OWNER_COOKIE`) | Exists only while a merge is unfinished; holds the account id that merge was for (`getGuestMergeOwner` / `setGuestMergeOwner`) |

Minting endpoint: `POST /api/guest` (`src/app/api/guest/route.ts`,
`runtime = 'nodejs'`) calls `requirePracticeActor()` and returns only
`{ isGuest }` - never the id, which lives only in the httpOnly cookie. The
client outbox calls it once before a first-time visitor's first write so
several queued writes all land under one guest id (see section 5). An
`OutboxOwnerMismatchError` maps to a 409 with the localized
`common.errors.ownerMismatch` message.

Merge on sign-in: `foldGuestIntoUser(userId)` (`src/lib/auth/guestMerge.ts`,
`server-only`) reads the guest cookie and the pending-merge owner, then asks
the pure `guestMergeStep({ guestId, pendingFor, userId })`:

| Step      | When                                       | Effect                                                                                  |
| --------- | ------------------------------------------ | --------------------------------------------------------------------------------------- |
| `none`    | No guest cookie                            | Nothing                                                                                 |
| `abandon` | A merge is pending for a different account | `clearGuestCookie()`; leftovers are never handed to the next person on a shared browser |
| `merge`   | Otherwise                                  | Runs four merges in sequence, each wrapped so one failure does not skip the others      |

The four merges are `mergeGuestDataIntoUser`
(`src/modules/dictation/services/mergeGuestData.ts`), `mergeGrammarGuestData`
(`src/modules/grammar/services/mergeGrammarGuestData.ts`),
`mergeIeltsGuestData` (`src/modules/ielts/services/mergeIeltsGuestData.ts`), and
`mergeVocabGuestData` (`src/modules/vocabulary/services/mergeVocabGuestData.ts`).
All succeed: `clearGuestCookie()`. Any fails: the guest cookie stays and
`setGuestMergeOwner(userId)` tags it, so only this account's next sign-in
retries (re-running a merge whose rows already moved is a no-op). The whole
function is wrapped in a try/catch that logs: a merge failure never blocks
login.

Merge specifics (each bails out unless the source is a guest id different from
the target):

- Dictation: first dismisses guest active review items that collide with an
  active twin the user already has (partial unique index), then
  `updateMany({ userId: guestId }, { $set: { userId } })` in parallel across
  `DictationSessionModel`, `DictationAttemptModel`, `DictationReviewItemModel`,
  and `DictationDebriefModel`, and logs the moved count as an audit trail.
  Favorites are excluded (favoriting requires login, and their
  `{ userId, videoId }` unique index could collide).
- Grammar: reads both progress sets and applies a pure plan
  (`src/modules/grammar/progress/planGrammarGuestMerge.ts`).
- IELTS: `IeltsAttemptModel.updateMany({ ownerId: guestId }, ...)`; on a
  duplicate-key error it falls back to one-by-one moves so only the clashing
  attempt stays with the guest.

```mermaid
sequenceDiagram
  participant U as Browser (guest cookie)
  participant G as Google
  participant J as jwt callback<br/>(auth.ts, Node)
  participant DB as MongoDB
  U->>G: signIn('google')
  G-->>J: profile { email, name, image }
  J->>DB: provisionUserOnSignIn (upsert User)
  DB-->>J: ObjectId -> token.uid
  J->>J: guestMergeStep(guestId, pendingFor, uid)
  alt merge
    J->>DB: dictation, grammar, IELTS merges
    alt all merged
      J->>U: clearGuestCookie()
    else a merge failed
      J->>U: setGuestMergeOwner(uid)<br/>retry on its next sign-in
    end
  else abandon (pending for another account)
    J->>U: clearGuestCookie()
  end
  J->>J: token.role = resolveRole(email)
```

### 1.6 Identity resolvers and route protection

`src/modules/dictation/services/getCurrentUser.ts` (`server-only`) is the
shared identity seam. It defines `UnauthenticatedError` (status 401) and
`ForbiddenError` (status 403), and these resolvers:

| Resolver                 | Returns                               | Notes                                                                                                                                                                                                                                                                    |
| ------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `getOptionalUser()`      | `CurrentUser` or `null`               | Wrapped in React `cache()` so the JWT is decoded once per request                                                                                                                                                                                                        |
| `requireUser()`          | `CurrentUser`                         | Throws `UnauthenticatedError`. Callers scope every per-user query to the returned id, never a client-supplied id                                                                                                                                                         |
| `requirePracticeActor()` | `{ id, isGuest }`                     | Signed-in user or a minted guest (`getOrCreateGuestId`); writes a cookie, so Route Handlers / Server Functions only. Runs `assertOwnerKey` on the id and `assertOutboxOwnerMatchesActor` against the `x-outbox-owner` header (see 1.7); its only throws are those guards |
| `getPracticeActorId()`   | user id, existing guest id, or `null` | Read-only, for Server Components; never writes a cookie                                                                                                                                                                                                                  |
| `requireAdmin()`         | `CurrentUser`                         | `requireUser()` then `ForbiddenError` if `role !== 'admin'`                                                                                                                                                                                                              |

Route protection is defense in depth, matching `.agents/rules/api-security.md`
("Admin APIs must verify authorization in the route handler or a shared
server-side helper even when middleware/proxy also protects them"; "Prefer
server-derived identity"):

1. Edge proxy: `src/proxy.ts` matcher `['/admin/:path*']` runs the `authorized`
   callback, requiring the admin role before `/admin/*` renders.
2. Admin layout re-check: `src/app/admin/layout.tsx` (`runtime = 'nodejs'`,
   `dynamic = 'force-dynamic'`) calls `getOptionalUser()`; redirects anonymous
   users to `/api/auth/signin?callbackUrl=/admin` and non-admins to
   `/dictation`.
3. Per-route re-checks: admin route handlers and server actions call
   `requireAdmin()` / `requireUser()` themselves (for example
   `src/modules/dictation/content/adminActions.ts`,
   `src/app/api/admin/ielts/uploads/sign/route.ts`,
   `src/app/api/admin/vocab/enrich/route.ts`). The `/api/admin/*` routes are
   not under the proxy matcher, so this step is their only gate.

Localized auth errors: `authErrorResponse(error, messages)`
(`src/lib/auth/authErrorMessage.ts`) maps `UnauthenticatedError` (401),
`ForbiddenError` (403), and `OutboxOwnerMismatchError` (409) to
`common.errors.{unauthorized,forbidden,ownerMismatch}` in the request's
language, returning `null` for any other error. The errors keep an English
`message` for logs. Used by `src/modules/ielts/http.ts`,
`src/app/api/grammar/sessions/route.ts`, and
`src/app/api/dictation/imports/youtube/route.ts`.

### 1.7 Owner keys and data isolation

Two modules enforce that per-user rows can never be written or read under an
ambiguous owner.

- `src/lib/auth/ownerKey.ts` - `OWNER_KEY_PATTERN` is
  `/^([a-f0-9]{24}|guest_[a-f0-9]{32})$/`: an owner is exactly a Mongo
  ObjectId hex string or a guest id, never null/empty/other.
  `isValidOwnerKey`, `assertOwnerKey` (throws `InvalidOwnerKeyError`, status
  400). `requirePracticeActor` applies it at the write boundary.
- `src/lib/auth/clientOwnerKey.ts` (`server-only`) - `toClientOwnerKey(id)` is
  the first 24 hex chars of `sha256(id)`. The raw guest id is a bearer
  credential, so only this hash is rendered into HTML:
  `src/app/(app)/layout.tsx` passes it (and `isGuest`) to
  `OutboxOwnerProvider`. `outboxOwnerMatchesActor(header, actor)` is `true`
  when the `x-outbox-owner` header is absent (server actions, older tabs),
  matches only a guest when it is `anonymous`, and otherwise must equal the
  actor's hash. A mismatch (a tab left open across a sign-in or sign-out)
  throws `OutboxOwnerMismatchError` (409), which the outbox settles as failed
  so the UI rolls back.

### 1.8 Signed recall task tokens

`src/modules/vocabulary/recall/recallTaskToken.ts` (`server-only`) issues
tamper-proof tokens so a vocabulary recall task can be graded without trusting
the client to send back the correct answer:

- Format: `base64url(JSON payload).base64url(HMAC-SHA256 signature)`.
  `createVocabRecallTaskToken(payload, now)` stamps
  `expiresAt = now + VOCAB_RECALL_TASK_TOKEN_TTL_MS` (30 minutes,
  `src/modules/vocabulary/constants.ts`).
- Payload carries `correctAnswer`, `correctOptionId`, `entryId`, `itemId`,
  `recallStage`, `taskId`, `type`, `userId`, and `expiresAt`.
- Signing secret cascade: `AUTH_SECRET` -> `NEXTAUTH_SECRET` -> the literal dev
  fallback `'development-vocab-recall-task-secret'`.
- `verifyVocabRecallTaskToken({ token, userId, now })` recomputes the HMAC,
  compares with `crypto.timingSafeEqual` (after a length guard), and returns
  `null` unless `payload.userId === userId` and `payload.expiresAt >= now`; any
  parse error also yields `null`.

---

## 2. Roles and Authorization

`src/lib/auth/roles.ts` defines `UserRole = 'admin' | 'user'` and derives role
from the `ADMIN_EMAILS` allowlist - it is never trusted from the client:

- `resolveRole(email)` returns `'user'` for empty email, otherwise `'admin'` if
  `getAdminEmails()` contains the trimmed lower-cased email, else `'user'`.
- `isAdminEmail(email)` is `resolveRole(email) === 'admin'`.

`getAdminEmails()` (`src/constants/environments.ts`) parses `ADMIN_EMAILS` as a
comma-separated list into a lower-cased `Set<string>` (empty when unset).
Because role is recomputed on every token/session pass and never stored, an
allowlist change takes effect on the next token refresh without a migration.
`src/components/common/AuthControl.tsx` renders nothing when `!hasGoogleAuth()`.

---

## 3. External Integrations

All integration code lives under `src/lib/*` (or a module's provider folder)
behind helper functions, per `api-security.md` ("Keep provider-specific code
behind a helper"). Each takes an injectable `fetcher` where it calls the
network, so it is unit-testable without one.

### 3.1 Google OAuth

- Env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET` (JWT signing),
  plus `ADMIN_EMAILS`. Callback path: `/api/auth/callback/google` (Auth.js
  convention under `src/app/api/auth/[...nextauth]/route.ts`).
- `hasGoogleAuth()` is true only when both client id and secret are set.
  Provider construction falls back to `''` credentials rather than throwing.

### 3.2 YouTube Data API

- Env: `YOUTUBE_API_KEY` (optional).
- `src/lib/youtube/extractYouTubeId.ts` - pure parser. Accepts `youtu.be`,
  `youtube.com` (and subdomains) `/watch?v=`, `/shorts/`, `/embed/`, `/live/`,
  and `youtube-nocookie.com/embed/`, validates an 11-char id, and returns
  `{ ok: true, videoId, normalizedUrl }` (`https://www.youtube.com/watch?v=<id>`)
  or `{ ok: false, code, message }` where `code` is `invalidUrl` or
  `unsupportedUrl` so a route can localize it (`message` stays English).
- `src/lib/youtube/getYouTubeVideoMetadata.ts` - calls
  `GET https://www.googleapis.com/youtube/v3/videos`
  (`part=snippet,contentDetails,status`). States: `apiKeyMissing` (video saved
  as a URL-only draft), `notFound`, `failed`, and `ready` with mapped metadata.

### 3.3 OpenAI

Env: `OPENAI_API_KEY` (optional; without it every OpenAI feature reports
"not configured") plus the per-feature model keys in section 6.

Core client `src/lib/ai/openAiClientCore.ts`
(`requestOpenAiStructuredOutput`) posts to `https://api.openai.com/v1/responses`
with `text.format = { type: 'json_schema', strict: true, name, schema }`,
`cache: 'no-store'`, an optional `reasoning.effort` (`minimal | low | medium |
high`, omitted when unset), and `max_output_tokens` (default 1400; callers
raise it explicitly because reasoning tokens count against it). It never
throws; results:

| Outcome                  | Result                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| No API key               | `{ ok: false, message: 'OpenAI provider is not configured.' }`                                          |
| Non-2xx                  | `ok: false` with the provider's `error.message`                                                         |
| `status` not `completed` | `ok: false`, message names the status, `incomplete_details.reason`, and the `max_output_tokens` ceiling |
| Empty text               | `ok: false`                                                                                             |
| Thrown error             | `ok: false`, "OpenAI debrief provider is unavailable."                                                  |
| Success                  | `{ ok: true, text, rawOutput, usage: { inputTokens, outputTokens } or null }`                           |

Strict schema adapter `src/lib/ai/openAiStrictSchema.ts`
(`toOpenAiStrictSchema(zodSchema)`): converts a Zod schema with
`z.toJSONSchema`, drops keywords strict mode rejects (`minLength`,
`maxLength`, `pattern`, `format`, `minimum`, `maximum`, `exclusive*`,
`minItems`, `maxItems`, `default`, `examples`, `$schema`, `$id`), rewrites
`oneOf` to `anyOf`, and forces every object to `required: <all keys>` plus
`additionalProperties: false`. It throws on records (object
`additionalProperties`) and on optional fields (use `.nullable()`). The Zod
schema stays the authority: callers re-parse the response with it, so dropped
limits are still enforced.

Callers:

| Helper / caller                          | File                                                                                                                         | Model getter (default)                                              | Request limits                                                                                                                                                                        | Gate                                                                |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Dictation debrief                        | `src/lib/ai/openAiClient.ts` -> `src/modules/dictation/ai/debriefService.ts`                                                 | `getOpenAiDebriefModel()` (`gpt-5.4-nano`)                          | default 1400 tokens                                                                                                                                                                   | On failure stores a failed debrief (`failureReason`, retry caveats) |
| Segment translation                      | `src/lib/ai/openAiTranslate.ts` (`translateSegmentText`) via `src/app/api/dictation/segments/[segmentId]/translate/route.ts` | `getOpenAiTranslationModel()` (falls back to the debrief model)     | default 1400 tokens; system prompt treats the sentence as data only                                                                                                                   | `requireAdmin()`; provider failure -> 503                           |
| IELTS writing grading and practice check | `src/modules/ielts/writing/runExaminer.ts`, `gradeWritingService.ts`                                                         | `getOpenAiIeltsGradingModel()` (falls back to the generation model) | 6000 tokens, `reasoningEffort: 'low'`, 240 s abort (`withTimeout`)                                                                                                                    | Signed-in only (guests 401), 503 without key, daily cap 429         |
| IELTS section generation and assist      | `src/modules/ielts/generation/generationService.ts` (`openAiRequester`), `assistService.ts`                                  | `getOpenAiIeltsGenerationModel()` (`gpt-5.4`)                       | `IELTS_JOB_MAX_TOKENS` in `aiSchemas.ts` (reading 16000, listening script 8000, listening questions 8000, writing task 6000, assist 8000; x1.25 on a repair), low effort, 240 s abort | Admin routes                                                        |
| IELTS listening audio (TTS)              | `src/lib/ai/openAiSpeech.ts` via `src/modules/ielts/audio/audioService.ts`                                                   | `getOpenAiTtsModel()` (`gpt-4o-mini-tts`)                           | 4 lines in parallel, one 240 s budget for the whole part                                                                                                                              | Admin route; 503 without key                                        |

The IELTS AI route handlers (`src/app/api/ielts/attempts/[attemptId]/{grade,check}/route.ts`,
`src/app/api/admin/ielts/assist/route.ts`,
`src/app/api/admin/ielts/tests/[testId]/sections/[key]/{generate,audio}/route.ts`)
all export `maxDuration = 300`, above the 240 s per-request abort.

Text-to-speech `synthesizeSpeechPcm` (`src/lib/ai/openAiSpeech.ts`) posts to
`https://api.openai.com/v1/audio/speech` with `response_format: 'pcm'` (raw
24 kHz, 16-bit, mono, little endian, so lines join without decoding), optional
`instructions`, and an `AbortSignal`. It never throws: `{ ok: true, pcm }` or
`{ ok: false, message }` ("Speech request timed out." on `TimeoutError`).

IELTS writing daily cap: `getIeltsWritingDailyLimit()` (`IELTS_WRITING_DAILY_LIMIT`,
default 10, positive integers only) caps successful gradings per owner per UTC
day. `countGradingsToday` in `gradeWritingService.ts` counts `gradings.at`
entries on the owner's attempts plus rows in `IeltsGradingLedgerModel`
(`src/models/ielts/IeltsGradingLedgerModel.ts`: `{ ownerId, at }`, indexed
`{ ownerId, at }`, TTL index expiring rows after 2 days). When a learner
deletes an attempt, `src/modules/ielts/attempts/attemptService.ts` copies that
attempt's gradings from today into the ledger first, so deleting cannot reset
the cap. Failed runs are not counted. Domain details (prompts, bands, claim and
stale-grading logic) are in `docs/09-ielts.md`.

### 3.4 Cloudinary

- Env: `CLOUDINARY_URL` (`cloudinary://key:secret@cloud`). `getCloudinaryUrl()`
  uses `getRequiredServerEnv`, so every upload throws if it is unset. All
  helpers are `server-only`.
- `src/lib/cloudinary/cloudinaryConfig.ts` - `parseCloudinaryUrl` (rejects a
  non-`cloudinary:` protocol), `getCloudinaryConfig()`, and `createSignature`
  (SHA-1 over sorted `key=value` pairs joined with `&`, plus the secret).
- `src/lib/cloudinary/uploadImage.ts` - `getImageFile(formData, key)` and
  `uploadImageToCloudinary(file)`: requires an `image/*` MIME type and at most
  5 MB, uploads to folder `english-for-only-me/topic-thumbnails` via
  `.../image/upload`, returns `secure_url`. Used by admin topic thumbnails in
  `src/modules/dictation/content/adminActions.ts`.
- `src/lib/cloudinary/uploadAudio.ts`:
  - `uploadAudioBuffer(buffer, { folder, publicId, fetcher, signal })` -
    server-to-Cloudinary upload of a generated WAV to `.../video/upload`
    (Cloudinary stores audio as `resource_type: video`) with `overwrite: true`
    and a synchronous eager `f_mp3`. Returns the mp3 `url` (what learners
    stream), `publicId`, and `durationSec`; throws when the upload fails or no
    mp3 comes back. `audioService.ts` then HEAD-checks the mp3 before saving it.
  - `createSignedUploadParams(kind: 'audio' | 'image')` - signed parameters for
    a direct browser upload: folder `ielts/audio` (eager mp3) or
    `ielts/images`, a fresh timestamp, and the signature, plus `apiKey`,
    `cloudName`, `resourceType`, and `uploadUrl`. The secret never leaves the
    server. Served by `POST /api/admin/ielts/uploads/sign`
    (`src/app/api/admin/ielts/uploads/sign/route.ts`, zod-validated
    `{ kind }`, `requireAdmin()`), and reused by
    `scripts/attachIeltsGroupImage.ts`.

### 3.5 MongoDB (Mongoose)

- Env: `MONGODB_URI` (required by `getMongoDbUri()`; `hasMongoDbUri()` is the
  optional check).
- `src/lib/db/connectDatabase.ts` (`server-only`) - cached connection on
  `globalThis.mongooseCache` (survives hot reload and warm serverless reuse);
  the connect promise is memoized and cleared on failure so a later call can
  retry.
- `getConnectOptions(nodeEnv)`: `bufferCommands: false`,
  `maxIdleTimeMS: 60000`, `maxPoolSize: 10`, `serverSelectionTimeoutMS: 15000`
  (long enough to ride out an Atlas primary election). In production it also
  sets `autoCreate: false` and `autoIndex: false`, so indexes are built by the
  owner-run `bun run db:sync-indexes` (`scripts/syncIndexes.ts`) instead of on
  every cold start.
- `getManualSchemaConnectOptions()` - the same options with
  `autoCreate`/`autoIndex` off in every environment, for scripts that must
  write no schema side effects (`db:sync-indexes`).
- `connectDatabaseWhen(value)` - awaits `value` and connects only when it is
  truthy (for example a practice actor id), so an anonymous visitor served
  from the catalog cache never waits on a connection handshake.

### 3.6 Vocabulary dictionary and translation providers

The vocabulary feature enriches seeded terms with free public APIs. Code lives
under `src/modules/vocabulary/providers/*`; the orchestrator is
`src/modules/vocabulary/enrichment/enrichmentService.ts`.

- Contract (`providers/types.ts`): each dictionary adapter is a
  `VocabProviderAdapter` returning a `VocabProviderResult` union: `ready`,
  `notFound`, `rateLimited` (optional `retryAfter`), `timeout`, `malformed`,
  `emptyUsefulData`.
- Shared HTTP (`providers/providerUtils.ts`): `fetchProviderJson` aborts after
  `VOCAB_LOOKUP_TIMEOUT_MS` (8000 ms) and maps `404 -> notFound`,
  `429 -> rateLimited`, other non-2xx -> `malformed`, abort -> `timeout`.

| Provider                  | File                             | External API                                                                | Role                                    | Env                                                                   |
| ------------------------- | -------------------------------- | --------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------- |
| `dictionaryapi.dev`       | `providers/dictionaryApiDev.ts`  | `GET https://api.dictionaryapi.dev/api/v2/entries/<lang>/<term>`            | Primary dictionary lookup               | none                                                                  |
| `freedictionaryapi.com`   | `providers/freeDictionaryApi.ts` | `GET https://freedictionaryapi.com/api/v1/entries/<lang>/<term>`            | Fallback dictionary lookup              | none                                                                  |
| `mymemory.translated.net` | `providers/myMemoryTranslate.ts` | `GET https://api.mymemory.translated.net/get?langpair=en\|vi&mt=1&q=<text>` | Vietnamese translation (not an adapter) | optional `MYMEMORY_EMAIL`, sent as `de` to raise the free daily quota |

`getDefaultVocabProviders()` (`providers/index.ts`) returns the two dictionary
adapters in order; enrichment stops at the first `ready`.
`translateTextToVietnamese` trims the query to 480 UTF-8 bytes and returns
`null` on any failure. Enrichment uses lease-based locking
(`VOCAB_ENRICHMENT_LEASE_MS` 60000 ms) so a crashed worker's lock self-heals;
the admin batch `enrichNextVocabularyEntries({ limit })` clamps `limit` to
1..10 and runs up to two workers. Admin route:
`src/app/api/admin/vocab/enrich/route.ts` (`GET` queue summary, `POST` batch;
503 without `MONGODB_URI`, then `requireAdmin()`).

---

## 4. Shared-Content Cache and Revalidation

Shared catalog reads go through the Next data cache; nothing per-user is cached
under these tags.

| Tag (`CACHE_TAGS`, `src/lib/db/cacheTags.ts`) | Time-based safety net (`CACHE_REVALIDATE_SECONDS`) | Readers                                           |
| --------------------------------------------- | -------------------------------------------------- | ------------------------------------------------- |
| `dictation-catalog`                           | 300 s                                              | `src/modules/dictation/content/catalogReaders.ts` |
| `grammar-content`                             | 3600 s                                             | none in `src` today; scripts may still expire it  |
| `ielts-content`                               | 3600 s                                             | `src/modules/ielts/tests/testReaders.ts`          |

`createCatalogReader({ key, load, revive, tag })` (`src/lib/db/catalogCache.ts`,
`server-only`) wraps a loader in `unstable_cache` keyed by
`[key, 'v' + CATALOG_CACHE_VERSION]` (currently 2; bump it when a cached
record's shape changes, because the data cache survives deploys). The loader
connects to the database itself (a hit never does) and must read no cookies or
headers. Its result is JSON round-tripped with `toJsonSafe`
(`src/lib/db/jsonRecords.ts`) on both miss and hit, then `revive` restores
dates (`reviveDates` / `reviveDatesInList`). React `cache()` on top dedupes
calls within one request.

Invalidation paths:

| Writer                   | Mechanism                                                                                                                                                 | File                                                                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Server actions           | `updateTag(tag)` (read-your-own-writes)                                                                                                                   | `src/modules/dictation/content/adminActions.ts`                                                                                      |
| Route handlers           | `expireCacheTags(tags)` = `revalidateTag(tag, { expire: 0 })`, a hard expiry so the next read is a blocking miss; `revalidateDictationCatalog()` shortcut | `src/lib/db/revalidateCatalog.ts`, used by the dictation video/transcript/import routes and `src/modules/ielts/tests/testService.ts` |
| Scripts / outside writes | `POST /api/admin/revalidate`                                                                                                                              | `src/app/api/admin/revalidate/route.ts`                                                                                              |

`POST /api/admin/revalidate` (`runtime = 'nodejs'`) accepts a signed-in admin
OR the `REVALIDATE_SECRET` in the `x-revalidate-secret` header. The pure
`decideRevalidateRequest` (`src/lib/db/revalidateRequest.ts`) authorizes first
(so unauthenticated callers learn nothing about tags), then validates
`{ tags: [...] }` against the known tag list (1..3 entries, deduped):

| Case                                                     | Status                       |
| -------------------------------------------------------- | ---------------------------- |
| No valid secret, signed-in non-admin, no secret sent     | 403                          |
| No valid secret otherwise (anonymous, or a wrong secret) | 401                          |
| Authorized, bad body                                     | 400                          |
| Authorized, valid                                        | 200 `{ revalidated: [...] }` |

`isRevalidateSecretValid` SHA-256-hashes both sides before `timingSafeEqual`,
so it leaks neither the secret nor its length; an unset `REVALIDATE_SECRET`
disables the secret path. Scripts call `requestContentRevalidation(tags)`
(`scripts/lib/requestContentRevalidation.ts`), which POSTs to
`${getSiteUrl()}/api/admin/revalidate`, is a logged no-op without the secret,
and never throws. `bun run content:revalidate [-- <tag> ...]`
(`scripts/revalidateContent.ts`) expires all or named tags by hand.

---

## 5. Client Outbox (client-first writes)

`src/lib/sync/outbox.ts` (framework-agnostic core) and
`src/lib/sync/clientOutbox.ts` (`'use client'` browser wiring) let the UI apply
a change immediately and deliver the write in the background.

```mermaid
graph LR
  UI[Component] -->|enqueue| L[Lane queue<br/>ordered, one in flight]
  L -->|persist| S[(localStorage<br/>efom.outbox.v1.owner.tabId)]
  L -->|fetch with<br/>idempotency-key<br/>x-outbox-owner| API[Route handler]
  API -->|2xx| OK[drop, resolve ok]
  API -->|network| R[keep, backoff, retry]
  API -->|5xx / 429 / 408| R2[retry up to 20,<br/>then failed]
  API -->|other 4xx| F[drop, resolve failed<br/>caller rolls back]
```

Core behavior (`outbox.ts`):

- `createOutbox({ owner, storage, tabId, fetchImpl, adoptOwners, adoptItems, ... })`
  returns `enqueue`, `pendingCount`, `pendingItems`, `subscribe`, `whenIdle`,
  `flushWithKeepalive`, `markReleased`, `resume`, `release`, `dispose`.
- Lanes run in parallel; items in one lane are ordered with one in flight. A
  `mergeKey` replaces the newest queued (not in-flight) item in the same lane
  (last write wins).
- Every request carries `idempotency-key: <item id>` and
  `x-outbox-owner: <owner>` (`OUTBOX_OWNER_HEADER`). Multi-tab safety comes
  from the server: attempt routes dedupe on the idempotency key; other writes
  set a desired state rather than toggle.
- Limits: retry backoff 1 s base to 30 s max; `MAX_SERVER_ERROR_ATTEMPTS = 20`
  for 5xx/429/408 (network failures retry forever); replayed items older than
  7 days are dropped, and set-state items (with a `mergeKey`) older than 12
  hours; keepalive flush budget 60000 bytes; tab lease 150 s.
- Each tab writes only its own storage key with a heartbeat. A starting tab
  adopts queues other tabs of the same owner left behind (released on
  `pagehide`, or heartbeat older than the lease).

Browser wiring (`clientOutbox.ts`):

- `getClientOutbox(ownerKey, { isGuest })` keeps one shared outbox per tab.
  `ownerKey` is the server-rendered hash from `toClientOwnerKey` (see 1.7), or
  `null` -> owner `anonymous` (`ANONYMOUS_OUTBOX_OWNER`). On the server it
  never caches (a module cache would be shared across learners).
- For the `anonymous` owner, every send first awaits
  `ensureGuestIdentity()`, a single shared `POST /api/guest`
  (`GUEST_IDENTITY_PATH`) so parallel first writes cannot mint two guest ids;
  a failed mint is not cached.
- When the owner changes without a reload, the previous outbox is retired. A
  first-time visitor who just became a guest is the same learner, so the
  anonymous queue (in memory and in storage) is adopted; any other previous
  owner keeps its stored queue for later.
- Tab ids live in `sessionStorage` (`efom.outbox.tab`) so a reload keeps its
  queue; a duplicated tab whose id another live page still claims
  (`efom.outbox.tab-claim.<id>`, TTL 2 min, refreshed every 20 s) mints a new
  one.
- `pagehide` flushes with keepalive (including in-flight items) and marks the
  queue released; `visibilitychange` to hidden flushes only waiting items;
  `pageshow` from the back-forward cache resumes.
- `useOutboxPendingCount(outbox)` feeds a "saving" hint via
  `useSyncExternalStore`.

---

## 6. Environment Variables

Central access is `src/constants/environments.ts` via `ENV_KEYS`,
`getOptionalServerEnv` (trims; empty -> `null`), and `getRequiredServerEnv`
(throws `MissingEnvironmentError`). All keys are server-only; none is
`NEXT_PUBLIC_*` (per `api-security.md`). Values are never reproduced here.

| Key                             | Required?                | Purpose                                                               | Default when unset                                                           |
| ------------------------------- | ------------------------ | --------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `MONGODB_URI`                   | Required for DB features | Mongoose connection string                                            | none (`getMongoDbUri` throws)                                                |
| `AUTH_SECRET`                   | Required for sign-in     | Auth.js JWT secret; also signs recall tokens                          | recall token falls back to `NEXTAUTH_SECRET`, then a dev literal             |
| `GOOGLE_CLIENT_ID`              | Required for Google auth | OAuth client id                                                       | `''` in provider; sign-in UI hidden                                          |
| `GOOGLE_CLIENT_SECRET`          | Required for Google auth | OAuth client secret                                                   | `''` in provider; sign-in UI hidden                                          |
| `ADMIN_EMAILS`                  | Optional                 | Comma-separated admin allowlist                                       | empty set (no admins)                                                        |
| `YOUTUBE_API_KEY`               | Optional                 | YouTube Data API metadata import                                      | URL-only drafts                                                              |
| `OPENAI_API_KEY`                | Optional                 | All OpenAI calls (debrief, translation, IELTS grading/generation/TTS) | features report "not configured" (IELTS grading, check and audio return 503) |
| `OPENAI_DEBRIEF_MODEL`          | Optional                 | Dictation debrief model                                               | `gpt-5.4-nano`                                                               |
| `OPENAI_TRANSLATION_MODEL`      | Optional                 | Dictation segment translation model                                   | the debrief model                                                            |
| `OPENAI_IELTS_GENERATION_MODEL` | Optional                 | IELTS section generation and assist                                   | `gpt-5.4`                                                                    |
| `OPENAI_IELTS_GRADING_MODEL`    | Optional                 | IELTS writing grading and practice check                              | the generation model                                                         |
| `OPENAI_TTS_MODEL`              | Optional                 | IELTS listening text-to-speech                                        | `gpt-4o-mini-tts`                                                            |
| `IELTS_WRITING_DAILY_LIMIT`     | Optional                 | Successful writing gradings per owner per UTC day                     | 10 (non-positive or non-integer values ignored)                              |
| `IELTS_GOAL`                    | Optional                 | Goal string for the dictation AI debrief                              | `IELTS Listening Band 7+`                                                    |
| `CLOUDINARY_URL`                | Required for uploads     | `cloudinary://` credentials (thumbnails, IELTS audio/images)          | none (`getCloudinaryUrl` throws)                                             |
| `MYMEMORY_EMAIL`                | Optional                 | Raises the MyMemory free translation quota                            | anonymous per-IP quota                                                       |
| `REVALIDATE_SECRET`             | Optional                 | Secret for `POST /api/admin/revalidate` from scripts                  | secret path disabled (admins only)                                           |
| `SITE_URL`                      | Optional                 | Canonical origin for SEO and the script revalidation target           | `AUTH_URL`, then `http://localhost:3000`                                     |

Keys read outside `ENV_KEYS`: `NEXTAUTH_SECRET` (recall token fallback),
`AUTH_URL` (`getSiteUrl` fallback), `PLAYWRIGHT_BASE_URL` and `CI`
(`playwright.config.ts` and e2e skips), and `NODE_ENV` (cookie `secure` flag,
connection options). Operational scripts load `.env` through
`node --env-file-if-exists=.env` (`package.json`).

---

## 7. Testing

### 7.1 Frameworks

- Unit/component: Vitest 4 with `@vitejs/plugin-react`, jsdom, and Testing
  Library (`@testing-library/react`, `@testing-library/jest-dom`,
  `@testing-library/dom`). Config: `vitest.config.mts`.
- E2E: Playwright (`playwright.config.ts`). The dependency is the `playwright`
  package, so tests import from `playwright/test`. Config: `testDir: './src'`,
  `testMatch: '**/*.e2e.ts'`, `fullyParallel: true`, `reporter: 'html'`,
  `trace: 'on-first-retry'`, one `chromium` project (Desktop Chrome), base URL
  `PLAYWRIGHT_BASE_URL` or `http://127.0.0.1:3000`; on CI `forbidOnly`,
  `retries: 2`, one worker. The config has no `webServer`, so start the app
  first.

### 7.2 Vitest setup and the server-only stub

`vitest.config.mts` sets `environment: 'jsdom'`, `globals: true`,
`setupFiles: ['./src/test/setup.ts']`, `resolve.tsconfigPaths: true`, and
inlines `next-auth` and `@auth/core`. It aliases both `server-only` and
`client-only` to `src/test/serverOnlyStub.ts` (an empty `export {}`), so server
modules (auth, DB, integration helpers, services) can be unit-tested under
jsdom without the guard aborting the import.

- `src/test/setup.ts` - imports `@testing-library/jest-dom/vitest`, runs
  `cleanup()` after each test, and globally mocks
  `@/components/common/AuthControl` to render `null` (an async server
  component that cannot render under the synchronous test renderer).
- `src/test/setupDom.ts` - `setupDom()` installs a fresh JSDOM `window`,
  `document`, `navigator`, and common DOM globals, with a one-time `afterEach`
  cleanup, for component tests that need an explicit DOM.
- `src/test/jsdom.d.ts` - minimal ambient types for `jsdom`.

The config has no `include`/`exclude`, so Vitest's defaults apply and
`.claude/` is not excluded: a run at the repo root also collects the copies in
`.claude/worktrees/**` (verified: `bunx vitest list --filesOnly` lists 764
files, 569 of them under `.claude/`, 195 under `src/`). Exclude them
explicitly.

### 7.3 Commands

| Task                           | Command                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| Unit tests, this checkout only | `bun run test -- --exclude '.claude/**'`                                             |
| All collected unit tests       | `bun run test` (`vitest run`)                                                        |
| Watch                          | `bun run test:watch` (`vitest`)                                                      |
| One file                       | `bun run test -- src/lib/db/revalidateRequest.test.ts`                               |
| E2E                            | `bun run dev`, then `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 bunx playwright test` |

Use `bun run test`, not `bun test`: the bare form starts Bun's built-in test
runner, which ignores `vitest.config.mts` (no jsdom, no `server-only` alias).
There is no `package.json` script for Playwright.

### 7.4 Test inventory and style

- `find src -name '*.test.ts*' | wc -l` => 195 co-located unit test files.
- E2E files (each `test.skip`s itself unless its env is set):

| File                                           | Needs                                | Flow                                                                                                                             |
| ---------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/cornerRoles.e2e.ts`                   | `PLAYWRIGHT_BASE_URL`                | Computed styles jsdom cannot check: desktop board radius and shadow, phone full-screen board with hidden rail, night rail colors |
| `src/modules/grammar/grammarPath.e2e.ts`       | `PLAYWRIGHT_BASE_URL`, `MONGODB_URI` | A first-time guest finishes lesson 1 and unlocks lesson 2                                                                        |
| `src/modules/vocabulary/vocabularyCore.e2e.ts` | `PLAYWRIGHT_BASE_URL`, `MONGODB_URI` | Search a term, add it to learning, answer a recall task, see stats update                                                        |

- Unit tests in this doc's scope include `src/lib/auth/{roles,guestMerge,ownerKey,clientOwnerKey,userProvisioning}.test.ts`,
  `src/lib/ai/{openAiClientCore,openAiStrictSchema,openAiTranslate}.test.ts`,
  `src/lib/db/{catalogCache,connectDatabase,jsonRecords,revalidateCatalog,revalidateRequest}.test.ts`,
  `src/lib/sync/{outbox,clientOutbox}.test.ts`, and
  `src/lib/youtube/{extractYouTubeId,getYouTubeVideoMetadata}.test.ts`. There
  are no unit tests for `src/lib/ai/openAiSpeech.ts` or `src/lib/cloudinary/*`.
- Naming (`.agents/rules/testing-quality.md`): unit tests sit next to source as
  `*.test.ts` / `*.test.tsx`; Playwright as `*.e2e.ts`.
- Pure decision functions are extracted from route handlers so they test
  "without a full database/auth environment" (for example `guestMergeStep`,
  `decideRevalidateRequest`, `outboxOwnerMatchesActor`, `extractYouTubeId`),
  and network helpers take an injectable `fetcher`.

### 7.5 Quality gates

From `package.json` and `.agents/rules/testing-quality.md` (Bun is preferred
because the repo has `bun.lock`):

| Gate   | Command                                       | Notes                                           |
| ------ | --------------------------------------------- | ----------------------------------------------- |
| Lint   | `bun run lint` (`eslint`)                     | TS/React changes must pass                      |
| Format | `bun run format:check` (`prettier . --check`) | Prettier house style                            |
| Build  | `bun run build` (`next build`)                | App Router / metadata / build-sensitive changes |
| Test   | `bun run test -- --exclude '.claude/**'`      | See 7.3                                         |

API/security changes verify both success and unhappy paths; broaden
verification when changes affect auth, data, routing, or AI; never weaken
lint/type rules to land code; do not hide errors with empty catches (the guest
merge catches in `guestMerge.ts` log before swallowing, by design).

---

## 8. Operational Scripts

Every DB script runs as
`node --conditions=react-server --env-file-if-exists=.env --import tsx <script>`
(`package.json`): the mongodb driver needs Node, and `--conditions=react-server`
resolves `server-only` imports to their no-op build. `grammar:check` omits the
env file.

| Script                                            | File                                                                                                               | Purpose                                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `db:sync-indexes`                                 | `scripts/syncIndexes.ts`                                                                                           | Build indexes explicitly (production connections skip `autoIndex`)                                    |
| `content:revalidate`                              | `scripts/revalidateContent.ts`                                                                                     | Expire cache tags on the deployed site (section 4)                                                    |
| `vocab:seed`, `vocab:seed-family`, `vocab:enrich` | `scripts/seedVocabulary.ts`, `seedVocabularyFamily.ts`, `enrichVocabularyBatch.ts`                                 | Seed and enrich vocabulary                                                                            |
| `resegment`, `dictation:reset-segment-progress`   | `scripts/resegmentAllTranscripts.ts`, `resetSharedSegmentProgress.ts`                                              | Dictation maintenance                                                                                 |
| `grammar:check`, `grammar:drop-legacy`            | `scripts/checkGrammarUnits.ts`, `dropLegacyGrammar.ts`                                                             | Grammar content checks and cleanup                                                                    |
| `ielts:*`                                         | `scripts/seedIeltsSample.ts`, `attachIeltsGroupImage.ts`, `evalIeltsGeneration.ts`, and other `scripts/*Ielts*.ts` | IELTS content edits; content writers end with `requestContentRevalidation([CACHE_TAGS.ieltsContent])` |
