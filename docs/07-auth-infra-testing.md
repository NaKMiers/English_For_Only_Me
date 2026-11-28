# 07 - Authentication, Infrastructure, Configuration, and Testing

This document explains how "English For Only Me" (Next.js 16, Auth.js v5 /
next-auth 5.0.0-beta.31, Mongoose 9) handles the required Google sign-in (every
page is gated; there is no guest mode), roles, the owner-key data-isolation
contract, its external
service integrations (Google OAuth, YouTube Data API, Qwen structured outputs
and text-to-speech on Alibaba Cloud Model Studio, Cloudinary image and audio uploads, MongoDB, and the
vocabulary dictionary/translation providers), signed recall task tokens, the
shared-content cache and its revalidation, the client write outbox, environment
configuration, and the test setup. Every claim below is grounded in a specific
file so an AI agent can reason about auth, authorization, integration fallbacks
and limits, env keys, and the test harness without reading the whole tree.
IELTS grading and generation domain logic lives in `docs/09-ielts.md`; this doc
covers only how they call Qwen and Cloudinary. Package versions: `next`
16.2.10, `next-auth` 5.0.0-beta.31, `mongoose` ^9.7.3, `zod` ^4.4.3, `vitest`
^4.1.9, `playwright` ^1.61.1 (`package.json`).

---

## 1. Authentication Architecture (Auth.js v5)

### 1.1 The proxy / Node config split

Sign-in with Google is required for every page. Auth is split into two files
so the proxy (the Next.js 16 name for middleware) can gate each navigation
without loading Mongoose.

- `src/lib/auth/auth.config.ts` - the DB-free `authConfig`. It imports only
  `@/constants/environments`, `./callbackUrl` and `./roles` (no Mongoose, no
  `server-only` module). It defines the Google provider, `pages`
  (`{ signIn: '/auth/login', error: '/auth/login' }`, so the Auth.js default
  pages never show) and the `authorized` (`authorizePage`), `jwt` and
  `session` callbacks. It is typed `satisfies NextAuthConfig`.
- `src/lib/auth/auth.ts` - the full Node-runtime instance. It spreads
  `authConfig`, sets `session: { strategy: 'jwt' }`, and overrides the `jwt`
  callback with a DB-touching version that provisions the Mongoose user and
  stamps its id and role. It exports `{ handlers, auth, signIn, signOut }`.
- `src/proxy.ts` builds its own NextAuth instance from `authConfig` alone
  (`export default auth`). Its matcher is
  `'/((?!api|_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)'`: every path
  except API routes, Next build output and public files (any last segment with
  an extension). The proxy runs on the Node runtime but only decodes the
  session JWT; it never touches the database, because it runs on every
  navigation and prefetch.
- `src/lib/auth/actions.ts` - a `'use server'` module exporting
  `signInAction(formData)` (`signIn('google', { redirectTo })`, where
  `redirectTo` is the form's `callbackUrl` passed through `safeCallbackUrl`)
  and `signOutAction()` (`signOut({ redirectTo: '/auth/login' })`). Client
  components import them as action references: `src/components/auth/LoginCard.tsx`
  for sign-in, `src/components/common/AccountControl.tsx` (via `UserMenu`) for
  sign-out, so the NextAuth / Mongoose chain never reaches the browser bundle.

```mermaid
graph TD
  A[auth.config.ts<br/>DB-free]:::edge --> B[proxy.ts<br/>NextAuth authConfig<br/>every page gated]
  A --> C[auth.ts<br/>NextAuth full]
  C --> D[handlers<br/>api/auth/...nextauth/route.ts]
  C --> E[auth / signIn / signOut<br/>root layout, currentUser.ts]
  C --> H[actions.ts, use server<br/>signInAction / signOutAction]
  H --> I[LoginCard<br/>AccountControl]
  C -. provisionUserOnSignIn .-> F[(MongoDB via Mongoose)]
  B -. authorized callback only .-> G[/login redirect or admin check, no DB/]
  classDef edge fill:#eef,stroke:#333;
```

`src/app/api/auth/[...nextauth]/route.ts` re-exports `{ GET, POST }` from
`handlers` in `auth.ts`, exposing the Auth.js HTTP routes (sign-in, callback,
sign-out, etc.).

### 1.2 Provider, session strategy, callbacks

- Provider: `Google({ clientId, clientSecret })` in `auth.config.ts`, reading
  `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` via `getOptionalServerEnv(...)`
  and defaulting to `''` when absent (so importing the config never throws when
  Google is unconfigured; the login page then fails closed, see 1.5).
- Session strategy: JWT (`session: { strategy: 'jwt' }` in `auth.ts`). There is
  no database session table and no Auth.js adapter. `src/models/UserModel.ts`
  explains why: a Mongo adapter would peer-require `mongodb ^6`, but the
  project ships `mongodb 7` via `mongoose 9`, so the app manages the User with
  Mongoose directly and keeps one ODM/driver.
- `authorized` callback (`authorizePage`, `auth.config.ts`), the gate for every
  page the proxy matches:

  | Request                                     | Result                                                                                                                                        |
  | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
  | `/auth/login`                               | `true` (the only public page)                                                                                                                 |
  | No user in the token                        | `false`: Auth.js redirects to `pages.signIn` with `callbackUrl=<page>`                                                                        |
  | `/admin` or `/admin/*`, role `admin`        | `true`                                                                                                                                        |
  | `/admin` or `/admin/*`, signed-in non-admin | A `Response` redirect to `/dictation` (`NON_ADMIN_HOME`); returning `false` would bounce to the login page, which sends them back to `/admin` |
  | Any other page, signed in                   | `true`                                                                                                                                        |

  API routes are not matched; they check for themselves (see 1.6).

- `jwt` callback (DB-free version, `auth.config.ts`): stamps
  `token.role = resolveRole(token.email)` on every pass.
- `jwt` callback (Node override, `auth.ts`): on sign-in (`user.email` present)
  it calls `provisionUserOnSignIn(...)` (passing `token.sub` as `googleSub`)
  and sets `token.uid` to the Mongo ObjectId. It always ends by refreshing
  `token.role` from the allowlist. Nothing else happens at sign-in.
- `session` callback (`auth.config.ts`): copies `token.uid` into
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

### 1.5 Sign-in gate, login page and return path

Guest mode was removed on 2026-11-28: there is no anonymous identity, no guest
cookie and no merge at sign-in. Rows that guests left behind are dropped by
`bun run auth:drop-guest-data` (see section 8). The plan is
`docs/plans/google-login-required-2026-11-28.md`.

Gate layers, outermost first: the proxy (1.1, 1.2), then the page layouts and
`requirePageUser()` in each Server Component (1.6), then `requireUser()` in
every API route (1.6).

`src/lib/auth/callbackUrl.ts` holds the return-path rules:

- `LOGIN_PATH` is `/auth/login`; `DEFAULT_CALLBACK_URL` is `/`.
- `safeCallbackUrl(raw, origin?)` is the open-redirect guard. It returns a
  same-origin path (with its query and hash) or falls back to `/`. A plain
  path is accepted; an absolute URL is accepted only when it is on `origin`
  (Auth.js hands the proxy's redirect an absolute `callbackUrl`). Rejected:
  another origin, protocol-relative `//host` and `/\host`, control characters
  and backslashes, the login page itself, anything under `/api`, and garbage.
- `loginUrlFor(path)` builds `/auth/login?callbackUrl=<encoded path>` (just
  `/auth/login` when the path would be `/`).

The login page is `src/app/auth/login/page.tsx` (`force-dynamic`, `nodejs`
runtime, `noindex`) with the client `src/components/auth/LoginCard.tsx` and
`loginPageState.ts` (`noticeForError` maps Auth.js `?error=`: `AccessDenied` ->
access denied, `Configuration` -> not configured, any other code -> a generic
"try again"). The page reads this request's own origin from the forwarded
host headers, sanitises `callbackUrl` with `safeCallbackUrl`, and redirects an
already signed-in learner straight to it. It fails closed: when
`hasGoogleAuth()` is false it shows a "not configured" notice and no button,
and since the proxy sends everyone there, nobody can use the app until Google
OAuth is configured. The sign-in form posts `callbackUrl` to `signInAction`,
which sanitises it again.

`src/app/robots.ts` disallows `/` for every crawler. The sitemap route was
deleted with guest mode (every page is behind the sign-in).

### 1.6 Identity resolvers and route protection

`src/lib/auth/currentUser.ts` (`server-only`; moved from the
dictation module's `getCurrentUser.ts`) is the shared identity
seam. It defines `UnauthenticatedError` (status 401) and `ForbiddenError`
(status 403), and these resolvers:

| Resolver                     | Returns                 | Notes                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getOptionalUser()`          | `CurrentUser` or `null` | Wrapped in React `cache()` so the JWT is decoded once per request. `null` only on the login page in practice                                                                                                                                                                                                                                                                    |
| `requireUser()`              | `CurrentUser`           | For Route Handlers and server functions. Throws `UnauthenticatedError` (401) without a session, `InvalidOwnerKeyError` (400) when `session.user.id` is not a 24-hex ObjectId (`assertOwnerKey`), and `OutboxOwnerMismatchError` (409) when the `x-outbox-owner` header names another learner. Callers scope every per-user query to the returned id, never a client-supplied id |
| `requirePageUser(returnTo?)` | `CurrentUser`           | For Server Components: without a session it `redirect`s to `loginUrlFor(returnTo ?? '/')` instead of throwing                                                                                                                                                                                                                                                                   |
| `requireAdmin()`             | `CurrentUser`           | `requireUser()` then `ForbiddenError` if `role !== 'admin'`                                                                                                                                                                                                                                                                                                                     |

`requirePracticeActor`, `PracticeActor` and `getPracticeActorId` no longer
exist: there is one kind of caller, a signed-in user.

Route protection is defense in depth, matching `.agents/rules/api-security.md`
("Admin APIs must verify authorization in the route handler or a shared
server-side helper even when middleware/proxy also protects them"; "Prefer
server-derived identity"):

1. Proxy: `src/proxy.ts` runs `authorizePage` on every page (1.2). Signed-out
   visitors go to `/auth/login?callbackUrl=<page>`; `/admin/*` additionally
   needs the admin role.
2. Layout re-checks: `src/app/(app)/layout.tsx` calls `requirePageUser()` for
   every learner page; `src/app/admin/layout.tsx` (`runtime = 'nodejs'`,
   `dynamic = 'force-dynamic'`) calls `requirePageUser('/admin')` and redirects
   a non-admin to `/dictation`.
3. Per-route checks: every per-user API route calls `requireUser()` and every
   admin route handler or server action calls `requireAdmin()` itself (for
   example `src/modules/dictation/content/adminActions.ts`,
   `src/app/api/admin/ielts/uploads/sign/route.ts`,
   `src/app/api/admin/vocab/enrich/route.ts`). The proxy matcher excludes
   `/api`, so this step is the only gate for API routes; they answer 401
   rather than redirect.

Localized auth errors: `authErrorResponse(error, messages)`
(`src/lib/auth/authErrorMessage.ts`) maps `UnauthenticatedError` (401),
`InvalidOwnerKeyError` (400, `common.errors.invalidRequest`),
`ForbiddenError` (403), and `OutboxOwnerMismatchError` (409) to
`common.errors.{unauthorized,invalidRequest,forbidden,ownerMismatch}` in the
request's language, returning `null` for any other error. The errors keep an
English `message` for logs. Used by `src/modules/ielts/http.ts`,
`src/app/api/grammar/sessions/route.ts`, and
`src/app/api/dictation/imports/youtube/route.ts`.

### 1.7 Owner keys and data isolation

Two modules enforce that per-user rows can never be written or read under an
ambiguous owner.

- `src/lib/auth/ownerKey.ts` - `OWNER_KEY_PATTERN` is `/^[a-f0-9]{24}$/`: an
  owner is exactly a Mongo ObjectId hex string, never null, empty or any other
  shape. `isValidOwnerKey`, `assertOwnerKey` (throws `InvalidOwnerKeyError`,
  status 400). `requireUser` applies it to the session's id at the boundary.
- `src/lib/auth/clientOwnerKey.ts` (`server-only`) - `toClientOwnerKey(id)` is
  the first 24 hex chars of `sha256(id)`, so only a hash of the user id is
  rendered into HTML: `src/app/(app)/layout.tsx` passes it to
  `OutboxOwnerProvider`. `outboxOwnerMatchesUser(header, userId)` is `true`
  when the `x-outbox-owner` header is absent (server actions, plain fetches)
  and otherwise must equal `toClientOwnerKey(userId)`. The old `anonymous`
  header value is now a mismatch like any other. A mismatch (a tab left open
  across a sign-out and a sign-in as someone else) makes
  `assertOutboxOwnerMatchesUser` throw `OutboxOwnerMismatchError` (409), which
  the outbox settles as failed so the UI rolls back.

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
The UI reads the session once per root render: `readAccount()` in
`src/app/layout.tsx` calls `auth()` and hands `{ account }` (first name,
image, initial, `isAdmin = user.role === 'admin'`, or `null` without a
session, which only happens on the login page) to `AccountProvider`
(`src/components/common/AccountProvider.tsx`). `AccountControl`
(`src/components/common/AccountControl.tsx`, rendered by `AppTopbar` and at the
rail foot by `AppSidebar`) reads it with `useAccount()`: `UserMenu` (with
sign-out) when signed in, nothing otherwise. There is no sign-in button in the
app chrome; sign-in lives only on the login page (1.5). `isAdmin` only shapes
the menu; admin access is still enforced server-side (section 1.6).

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
- `hasGoogleAuth()` is true only when both client id and secret are set. It is
  read by the login page only: without it the page shows a "not configured"
  notice and no sign-in button (fail closed, see 1.5). Provider construction
  falls back to `''` credentials rather than throwing.

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

### 3.3 Qwen (Alibaba Cloud Model Studio)

Every AI feature runs on Qwen; there is no OpenAI code path. Env:
`DASHSCOPE_API_KEY` (optional; without it every AI feature reports "not
configured"), `DASHSCOPE_HOST` (optional origin, default
`https://dashscope-intl.aliyuncs.com`; `getQwenHost()` trims a trailing slash)
plus the per-feature model keys in section 6 (`src/constants/environments.ts`).

Core client `src/lib/ai/qwenClientCore.ts` (`requestQwenStructuredOutput`)
posts to `${getQwenCompatibleBaseUrl()}/responses`, i.e.
`<host>/compatible-mode/v1/responses` (Qwen's OpenAI-compatible Responses API),
with `text.format = { type: 'json_schema', strict: true, name, schema }`,
`store: false` on every call (Qwen keeps responses by default; learner text
must not stay), `cache: 'no-store'`, and `max_output_tokens` (default 1400;
callers raise it explicitly because reasoning tokens count against it).
Thinking: Qwen thinks by default, so a call without `reasoningEffort` sends
`enable_thinking: false`; a call with an effort (`low | medium | high`; Qwen
ignores `minimal`, so the type omits it) sends `reasoning.effort` and keeps
thinking on. `baseUrl` is injectable for tests. It never throws; results:

| Outcome                  | Result                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| No API key               | `{ ok: false, message: 'AI provider is not configured.' }`, no request sent                             |
| Non-2xx                  | `ok: false` with the provider's `error.message`, else "AI provider request failed."                     |
| `status` not `completed` | `ok: false`, message names the status, `incomplete_details.reason`, and the `max_output_tokens` ceiling |
| Empty text               | `ok: false`, "AI provider returned no text."                                                            |
| Thrown error             | `ok: false`, "AI provider is unavailable."                                                              |
| Success                  | `{ ok: true, text, rawOutput, usage: { inputTokens, outputTokens } or null }` (`AiUsage`)               |

Text is read from `output_text` when present, else from the first
`output[].content[].text` (Qwen returns only the latter).

Strict schema adapter `src/lib/ai/strictJsonSchema.ts`
(`toStrictJsonSchema(zodSchema)`): converts a Zod schema with
`z.toJSONSchema`, drops keywords strict mode rejects (`minLength`,
`maxLength`, `pattern`, `format`, `minimum`, `maximum`, `exclusive*`,
`minItems`, `maxItems`, `default`, `examples`, `$schema`, `$id`; exported for
tests as `STRICT_DROPPED_KEYWORDS`), rewrites `oneOf` to `anyOf`, and forces
every object to `required: <all keys>` plus `additionalProperties: false`. It
throws on records (object `additionalProperties`) and on optional fields (use
`.nullable()`). The Zod schema stays the authority: callers re-parse the
response with it, so dropped limits are still enforced. The real debrief,
translation, examiner and writing-task generation schemas were checked live
against Qwen on 2026-11-28.

Callers:

| Helper / caller                          | File                                                                                                                       | Model getter (default)                                            | Request limits                                                                                                                                                                                      | Gate                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Dictation debrief                        | `src/lib/ai/qwenDebriefClient.ts` -> `src/modules/dictation/ai/debriefService.ts`                                          | `getQwenDebriefModel()` (`qwen3.8-flash`)                         | default 1400 tokens, thinking off                                                                                                                                                                   | On failure stores a failed debrief (`failureReason`, retry caveats) |
| Segment translation                      | `src/lib/ai/qwenTranslate.ts` (`translateSegmentText`) via `src/app/api/dictation/segments/[segmentId]/translate/route.ts` | `getQwenTranslationModel()` (falls back to the debrief model)     | default 1400 tokens, thinking off; system prompt treats the sentence as data only                                                                                                                   | `requireAdmin()`; provider failure -> 503                           |
| IELTS writing grading and practice check | `src/modules/ielts/writing/runExaminer.ts`, `gradeWritingService.ts`                                                       | `getQwenIeltsGradingModel()` (falls back to the generation model) | 6000 tokens, `reasoningEffort: 'low'`, 240 s abort (`withTimeout`)                                                                                                                                  | Signed-in only (401), 503 without key, daily cap 429                |
| IELTS section generation and assist      | `src/modules/ielts/generation/generationService.ts` (`qwenRequester`), `assistService.ts`                                  | `getQwenIeltsGenerationModel()` (`qwen3.8-max`)                   | `IELTS_JOB_MAX_TOKENS` in `aiSchemas.ts` (reading 16000, listening script 8000, listening questions 8000, writing task 6000, assist 8000; x1.25 on a repair), `reasoningEffort: 'low'`, 240 s abort | Admin routes                                                        |
| IELTS listening audio (TTS)              | `src/lib/ai/qwenSpeech.ts` via `src/modules/ielts/audio/audioService.ts`                                                   | `getQwenTtsModel()` (`qwen-audio-3.1-tts-flash`)                  | 2 lines in parallel (each line is two requests; Qwen TTS allows 180 RPM, enforced per second), rate-limited requests retried after 1 s, 2 s, 4 s, one 240 s budget for the whole part               | Admin route; 503 without key                                        |

The IELTS AI route handlers (`src/app/api/ielts/attempts/[attemptId]/{grade,check}/route.ts`,
`src/app/api/admin/ielts/assist/route.ts`,
`src/app/api/admin/ielts/tests/[testId]/sections/[key]/{generate,audio}/route.ts`)
all export `maxDuration = 300`, above the 240 s per-request abort.

Text-to-speech `synthesizeSpeechPcm` (`src/lib/ai/qwenSpeech.ts`) is two
requests per line. It posts
`{ model, input: { text, voice, format: 'wav', sample_rate: 24000, instruction } }`
to `<host>/api/v1/services/audio/tts/SpeechSynthesizer` (DashScope native API,
not the compatible one). The answer carries no audio, only
`output.audio.url`; `normalizeAudioUrl` unescapes `&amp;`, forces `https`, and
refuses any host not ending in `.aliyuncs.com` (no SSRF). The WAV is then
downloaded without the API key, and `wavToPcm` (`src/lib/ai/wavToPcm.ts`, pure)
walks the RIFF chunks, requires 16-bit mono PCM at 24 kHz, and returns the
`data` chunk (to the end of the file if the size is a placeholder), so lines
join without decoding. It never throws: `{ ok: true, pcm }` or
`{ ok: false, message }` (provider `message`, "Speech provider returned no audio
URL.", "Speech download failed (N).", a WAV format message, or "Speech request
timed out." on `TimeoutError`). Voices are mapped from the logical ids stored in
tests by `qwenVoiceFor` (`src/modules/ielts/constants.ts`, see
`docs/09-ielts.md`).

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
  API -->|401| U[keep, pause every lane,<br/>onUnauthorized once]
  U --> LG[release queue,<br/>go to /auth/login]
  API -->|other 4xx| F[drop, resolve failed<br/>caller rolls back]
```

Core behavior (`outbox.ts`):

- `createOutbox({ owner, storage, tabId, fetchImpl, onSettled, onUnauthorized, ... })`
  returns `enqueue`, `pendingCount`, `pendingItems`, `subscribe`, `whenIdle`,
  `flushWithKeepalive`, `markReleased`, `resume`, `dispose`.
- Lanes run in parallel; items in one lane are ordered with one in flight. A
  `mergeKey` replaces the newest queued (not in-flight) item in the same lane
  (last write wins).
- Every request carries `idempotency-key: <item id>` and
  `x-outbox-owner: <owner>` (`OUTBOX_OWNER_HEADER`). Multi-tab safety comes
  from the server: attempt routes dedupe on the idempotency key; other writes
  set a desired state rather than toggle.
- A 401 (the session ended: expired, or signed out in another tab) is treated
  like a network failure for the item: it stays queued and stored, every lane
  pauses, and `onUnauthorized` fires once. The caller keeps waiting; nothing is
  sent until a new page load.
- Limits: retry backoff 1 s base to 30 s max; `MAX_SERVER_ERROR_ATTEMPTS = 20`
  for 5xx/429/408 (network failures retry forever); replayed items older than
  7 days are dropped, and set-state items (with a `mergeKey`) older than 12
  hours; keepalive flush budget 60000 bytes; tab lease 150 s.
- Each tab writes only its own storage key with a heartbeat. A starting tab
  adopts queues other tabs of the same owner left behind (released on
  `pagehide`, or heartbeat older than the lease). Adoption is only between tabs
  of one owner; there is no hand-off between owners.

Browser wiring (`clientOutbox.ts`):

- `getClientOutbox(ownerKey)` keeps one shared outbox per tab. `ownerKey` is
  the server-rendered hash from `toClientOwnerKey` (see 1.7); there is always
  one, because every `(app)` page has a session. On the server it never caches
  (a module cache would be shared across learners).
- When the owner changes without a reload (a sign-out and a sign-in as someone
  else), the previous outbox is disposed and keeps its stored queue for when
  that learner is back; it is never sent as the new one.
- On `onUnauthorized` (`handleUnauthorized`, once per outbox) the tab removes
  its `pagehide` listeners (a keepalive resend would only meet another 401),
  calls `markReleased()` so the stored queue is taken over at once by the next
  load, and `window.location.assign`s `loginUrlFor(<current path and query>)`.
  Signing back in as the same account gives the same owner key, so the queue
  replays; another account never sees it.
- Tab ids live in `sessionStorage` (`efom.outbox.tab`) so a reload keeps its
  queue; a duplicated tab whose id another live page still claims
  (`efom.outbox.tab-claim.<id>`, TTL 2 min, refreshed every 20 s) mints a new
  one.
- `pagehide` flushes with keepalive (including in-flight items) and marks the
  queue released; `visibilitychange` to hidden flushes only waiting items;
  `pageshow` from the back-forward cache resumes.

---

## 6. Environment Variables

Central access is `src/constants/environments.ts` via `ENV_KEYS`,
`getOptionalServerEnv` (trims; empty -> `null`), and `getRequiredServerEnv`
(throws `MissingEnvironmentError`). All keys are server-only; none is
`NEXT_PUBLIC_*` (per `api-security.md`). Values are never reproduced here.

| Key                           | Required?                | Purpose                                                                         | Default when unset                                                           |
| ----------------------------- | ------------------------ | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `MONGODB_URI`                 | Required for DB features | Mongoose connection string                                                      | none (`getMongoDbUri` throws)                                                |
| `AUTH_SECRET`                 | Required for sign-in     | Auth.js JWT secret; also signs recall tokens and the e2e session cookie         | recall token falls back to `NEXTAUTH_SECRET`, then a dev literal             |
| `GOOGLE_CLIENT_ID`            | Required for Google auth | OAuth client id                                                                 | `''` in provider; login page shows a notice, no button                       |
| `GOOGLE_CLIENT_SECRET`        | Required for Google auth | OAuth client secret                                                             | `''` in provider; login page shows a notice, no button                       |
| `ADMIN_EMAILS`                | Optional                 | Comma-separated admin allowlist                                                 | empty set (no admins)                                                        |
| `YOUTUBE_API_KEY`             | Optional                 | YouTube Data API metadata import                                                | URL-only drafts                                                              |
| `DASHSCOPE_API_KEY`           | Optional                 | Qwen key for every AI call (debrief, translation, IELTS grading/generation/TTS) | features report "not configured" (IELTS grading, check and audio return 503) |
| `DASHSCOPE_HOST`              | Optional                 | DashScope origin (the workspace API host can replace it)                        | `https://dashscope-intl.aliyuncs.com`                                        |
| `QWEN_DEBRIEF_MODEL`          | Optional                 | Dictation debrief model                                                         | `qwen3.8-flash`                                                              |
| `QWEN_TRANSLATION_MODEL`      | Optional                 | Dictation segment translation model                                             | the debrief model                                                            |
| `QWEN_IELTS_GENERATION_MODEL` | Optional                 | IELTS section generation and assist                                             | `qwen3.8-max`                                                                |
| `QWEN_IELTS_GRADING_MODEL`    | Optional                 | IELTS writing grading and practice check                                        | the generation model                                                         |
| `QWEN_TTS_MODEL`              | Optional                 | IELTS listening text-to-speech                                                  | `qwen-audio-3.1-tts-flash`                                                   |
| `IELTS_WRITING_DAILY_LIMIT`   | Optional                 | Successful writing gradings per owner per UTC day                               | 10 (non-positive or non-integer values ignored)                              |
| `IELTS_GOAL`                  | Optional                 | Goal string for the dictation AI debrief                                        | `IELTS Listening Band 7+`                                                    |
| `CLOUDINARY_URL`              | Required for uploads     | `cloudinary://` credentials (thumbnails, IELTS audio/images)                    | none (`getCloudinaryUrl` throws)                                             |
| `MYMEMORY_EMAIL`              | Optional                 | Raises the MyMemory free translation quota                                      | anonymous per-IP quota                                                       |
| `REVALIDATE_SECRET`           | Optional                 | Secret for `POST /api/admin/revalidate` from scripts                            | secret path disabled (admins only)                                           |
| `SITE_URL`                    | Optional                 | Canonical origin (dictation topic page URL, script revalidation target)         | `AUTH_URL`, then `http://localhost:3000`                                     |

Keys read outside `ENV_KEYS`: `NEXTAUTH_SECRET` (recall token fallback),
`AUTH_URL` (`getSiteUrl` fallback), `PLAYWRIGHT_BASE_URL` and `CI`
(`playwright.config.ts`, `src/e2e/globalSetup.ts` and e2e skips), and
`NODE_ENV` (connection options). Operational scripts load `.env` through
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
  `trace: 'on-first-retry'`, base URL `PLAYWRIGHT_BASE_URL` or
  `http://127.0.0.1:3000`; on CI `forbidOnly`, `retries: 2`, one worker. The
  config has no `webServer`, so start the app first. Because every page needs a
  session, it has a `globalSetup` and two Desktop Chrome projects (7.2):
  `signed-out` runs only `auth.e2e.ts` with no cookies, and `chromium` runs
  every other `*.e2e.ts` with `storageState: playwright/.auth/learner.json`.

### 7.2 Vitest setup and the server-only stub

`vitest.config.mts` sets `environment: 'jsdom'`, `globals: true`,
`setupFiles: ['./src/test/setup.ts']`, `resolve.tsconfigPaths: true`, and
inlines `next-auth` and `@auth/core`. It aliases both `server-only` and
`client-only` to `src/test/serverOnlyStub.ts` (an empty `export {}`), so server
modules (auth, DB, integration helpers, services) can be unit-tested under
jsdom without the guard aborting the import.

- `src/test/setup.ts` - imports `@testing-library/jest-dom/vitest`, runs
  `cleanup()` after each test, and globally mocks `@/lib/auth/actions`
  (`signInAction` / `signOutAction` resolve to `undefined`): the real module
  imports the NextAuth / Mongoose chain, which the test runtime does not turn
  into action references, so any component embedding `AppTopbar` (its
  `AccountControl`) or the login card can render. `src/lib/auth/actions.test.ts`
  unmocks it to test the real module.
- `src/test/landingBudget.ts` - `expectLandingBudget(container)`, the shared
  assertion for a module landing or session end: exactly one
  `[data-next-stop]` and one `bg-cta` element, at most 4 `dt` per
  `[data-stat-strip]`, every link or button inside `[data-journey-card]`
  carries `hover-pop`, and no `[data-stat-chip="static"]` does.
- `src/test/setupDom.ts` - `setupDom()` installs a fresh JSDOM `window`,
  `document`, `navigator`, and common DOM globals, with a one-time `afterEach`
  cleanup, for component tests that need an explicit DOM.
- `src/test/jsdom.d.ts` - minimal ambient types for `jsdom`.

The config has no `include`/`exclude`, so Vitest's defaults apply and
`.claude/` is not excluded: a run at the repo root also collects any copies
under `.claude/worktrees/**` (a repo-root `bunx vitest list --filesOnly` lists
233 files here, `--dir src` lists the 232 under `src/`, but a checkout with
worktrees lists hundreds more). Always scope the run with `--dir src` (or
`--exclude '.claude/**'`).

#### E2E sign-in without Google

`playwright.config.ts` points `globalSetup` at `src/e2e/globalSetup.ts`, which
signs the browser in without Google and ships no test-only route in the app:

1. It loads `.env` (values already exported win) and refuses any base URL whose
   host is not `localhost`, `127.0.0.1` or `[::1]`.
2. Without `PLAYWRIGHT_BASE_URL` it writes an empty storage state and returns
   (every e2e test skips itself anyway).
3. It requires `AUTH_SECRET`, then provisions the learner
   `e2e-learner@example.test` (`src/e2e/e2eLearner.ts`) by running
   `src/e2e/provisionE2eUser.ts` in a child process with
   `--conditions=react-server --import tsx`. That script calls the real
   `provisionUserOnSignIn`, resets only that learner's grammar progress rows
   (so "a new learner" flows stay new every run) and prints just the user id.
   Without `MONGODB_URI` it uses a fixed offline id instead.
4. It mints the Auth.js session JWT with `encode` from `next-auth/jwt`, signed
   with `AUTH_SECRET`, using the cookie name as the salt:
   `authjs.session-token`, or `__Secure-authjs.session-token` on https. The
   token carries `email`, `name`, `role: 'user'`, `sub` and `uid`, with a
   30-day lifetime.
5. It writes the cookie to `playwright/.auth/learner.json`
   (`E2E_STORAGE_STATE`, git-ignored with `playwright-report/`).

It never prints the secret or the token.

### 7.3 Commands

| Task                           | Command                                                                                                                                |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests, this checkout only | `bun run test -- --dir src` (or `bun run test -- --exclude '.claude/**'`)                                                              |
| All collected unit tests       | `bun run test` (`vitest run`)                                                                                                          |
| Watch                          | `bun run test:watch` (`vitest`)                                                                                                        |
| One file                       | `bun run test -- src/lib/db/revalidateRequest.test.ts`                                                                                 |
| E2E                            | `bun run dev`, then `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 bunx playwright test` (needs `AUTH_SECRET` and `MONGODB_URI` in `.env`) |

Use `bun run test`, not `bun test`: the bare form starts Bun's built-in test
runner, which ignores `vitest.config.mts` (no jsdom, no `server-only` alias).
There is no `package.json` script for Playwright.

### 7.4 Test inventory and style

- `find src -name '*.test.ts' -o -name '*.test.tsx' | wc -l` => 232 co-located
  unit test files.
- E2E files (each `test.skip`s itself unless its env is set; the signed-in ones
  run as the seeded learner from 7.2):

| File                                           | Needs                                | Flow                                                                                                                                                                                                                    |
| ---------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/cornerRoles.e2e.ts`                   | `PLAYWRIGHT_BASE_URL`                | Computed styles jsdom cannot check: desktop board radius and shadow, phone full-screen board with hidden rail, night rail colors                                                                                        |
| `src/app/auth.e2e.ts`                          | `PLAYWRIGHT_BASE_URL`                | `signed-out` project: every page answers 307 to `/auth/login` with its `callbackUrl`; deep link keeps the callback; an unsafe callback is dropped; per-user APIs answer 401 and `/api/guest` is gone; public files load |
| `src/app/authSignedIn.e2e.ts`                  | `PLAYWRIGHT_BASE_URL`                | Signed in: the login page redirects to a safe `callbackUrl` (an external one falls back to `/`); no sign-in control in the app                                                                                          |
| `src/modules/grammar/grammarPath.e2e.ts`       | `PLAYWRIGHT_BASE_URL`, `MONGODB_URI` | A new learner (progress reset by the global setup) finishes lesson 1 and unlocks lesson 2                                                                                                                               |
| `src/modules/vocabulary/vocabularyCore.e2e.ts` | `PLAYWRIGHT_BASE_URL`, `MONGODB_URI` | Search a term, add it to learning, answer a recall task, see stats update                                                                                                                                               |

- Unit tests in this doc's scope include
  `src/lib/auth/{roles,callbackUrl,auth.config,actions,currentUser,ownerKey,clientOwnerKey,userProvisioning}.test.ts`,
  `src/proxy.test.ts` (checks the matcher with `unstable_doesMiddlewareMatch`),
  `src/app/auth/login/page.test.tsx`, `src/components/auth/LoginCard.test.tsx`,
  route tests that expect 401 without a session
  (`src/app/api/grammar/sessions/route.test.ts`,
  `src/app/api/vocab/items/route.test.ts`,
  `src/app/api/ielts/attempts/[attemptId]/route.test.ts`,
  `src/app/api/dictation/sessions/[sessionId]/attempts/route.test.ts`),
  `scripts/lib/guestCleanup.test.ts`,
  `src/lib/ai/{qwenClientCore,strictJsonSchema,qwenTranslate,qwenSpeech,wavToPcm}.test.ts`,
  `src/lib/db/{catalogCache,connectDatabase,jsonRecords,revalidateCatalog,revalidateRequest}.test.ts`,
  `src/lib/sync/{outbox,clientOutbox}.test.ts`, and
  `src/lib/youtube/{extractYouTubeId,getYouTubeVideoMetadata}.test.ts`. There
  are no unit tests for `src/lib/cloudinary/*`.
- UI guard tests: `src/lib/styleGuards.test.ts` scans `src/components` and
  `src/app` (and `src` plus `docs` for the em dash) for corner roles, `bg-ink`
  on controls, raw Tailwind palette / `text-white` / `text-muted-foreground`,
  `font-bold` / `font-black` in learner components, `hover-lift`, and small
  touch targets (`SMALL_TOUCH`), plus `rounded-none` anywhere in `src`. The
  corner, ink, palette, weight and `hover-lift` guards keep a shrink-only
  baseline: a second test fails when a listed file is already clean. Landing
  and session-end component tests (for example
  `src/components/journey/JourneyCard.test.tsx`,
  `src/components/grammar/path/GrammarPath.test.tsx`) use
  `expectLandingBudget`; error boundaries are covered by
  `src/app/error.test.tsx` and `src/app/(app)/grammar/error.test.tsx`.
- Naming (`.agents/rules/testing-quality.md`): unit tests sit next to source as
  `*.test.ts` / `*.test.tsx`; Playwright as `*.e2e.ts`.
- Pure decision functions are extracted from route handlers so they test
  "without a full database/auth environment" (for example `authorizePage`,
  `safeCallbackUrl`, `decideRevalidateRequest`, `outboxOwnerMatchesUser`,
  `extractYouTubeId`),
  and network helpers take an injectable `fetcher`.

### 7.5 Quality gates

From `package.json` and `.agents/rules/testing-quality.md` (Bun is preferred
because the repo has `bun.lock`):

| Gate   | Command                                       | Notes                                           |
| ------ | --------------------------------------------- | ----------------------------------------------- |
| Lint   | `bun run lint` (`eslint`)                     | TS/React changes must pass                      |
| Format | `bun run format:check` (`prettier . --check`) | Prettier house style                            |
| Build  | `bun run build` (`next build`)                | App Router / metadata / build-sensitive changes |
| Test   | `bun run test -- --dir src`                   | See 7.3                                         |

API/security changes verify both success and unhappy paths; broaden
verification when changes affect auth, data, routing, or AI; never weaken
lint/type rules to land code; do not hide errors with empty catches (log
before swallowing).

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
| `auth:drop-guest-data`                            | `scripts/dropGuestData.ts`, `scripts/lib/guestCleanup.ts`                                                          | Delete the rows anonymous guests left behind (see below)                                              |
| `ielts:*`                                         | `scripts/seedIeltsSample.ts`, `attachIeltsGroupImage.ts`, `evalIeltsGeneration.ts`, and other `scripts/*Ielts*.ts` | IELTS content edits; content writers end with `requestContentRevalidation([CACHE_TAGS.ieltsContent])` |

`auth:drop-guest-data` is the one-off cleanup for guest mode, removed on
2026-11-28. It is a dry run by default: it prints the database name and, per
collection, how many rows have an owner id matching `^guest_` (the dictation,
grammar, vocabulary and IELTS per-user collections, named from their models).
`--apply --i-am-sure` deletes them and cannot be undone. The pure argument
parsing and plan live in `scripts/lib/guestCleanup.ts`. It has not been run in
production yet.
