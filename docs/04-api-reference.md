# API Reference

This document is the contract-level reference for the HTTP API of "English For
Only Me", an IELTS practice app built on Next.js 16 App Router. Route Handlers
live under `src/app/api/**/route.ts` and are grouped by module: Google
sign-in (`/api/auth`), dictation (`/api/dictation`), vocabulary
(`/api/vocab`), grammar (`/api/grammar`), IELTS practice (`/api/ielts`), and
admin tooling (`/api/admin/**`). Handlers delegate parsing and gating to pure
decision helpers (`src/modules/dictation/services/*RouteDecisions.ts`,
`src/modules/vocabulary/services/vocabularyRouteDecisions.ts`,
`src/modules/grammar/session/parseSessionRequest.ts`,
`src/modules/ielts/attempts/attemptRouteDecisions.ts`,
`src/modules/ielts/tests/testRouteDecisions.ts`) and return learner-facing
error text from the EN/VI message catalogue (`src/i18n/**`). Google sign-in is
required: every per-user route needs a session and answers `401` without one
(there is no guest mode). Per-user writes from the browser go through a client
outbox (`src/lib/sync/outbox.ts`) with ordered lanes and idempotency keys, so several routes are built to be replayed
safely. Status codes and shapes below are taken from the route and helper code,
not assumed.

## 1. Conventions

### Runtime and module plumbing

Every route sets `export const runtime = 'nodejs'` (Mongoose, cookies, crypto
and provider SDKs need Node). Routes that call Qwen set
`export const maxDuration = 300`
(`src/app/api/ielts/attempts/[attemptId]/check/route.ts`,
`.../grade/route.ts`, `src/app/api/admin/ielts/assist/route.ts`,
`.../sections/[key]/audio/route.ts`, `.../sections/[key]/generate/route.ts`).

Each module has its own error plumbing:

| Module              | Error helper                                                                                              | Missing `MONGODB_URI`                                                      | Catalogue keys (`src/i18n/messages/en/*.ts`) |
| ------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------- |
| Dictation           | per-route `jsonError` + `getAccessErrorMessage` (`src/modules/dictation/services/videoRouteDecisions.ts`) | `500`, `MISSING_MONGODB_MESSAGE` (English) via `getMissingMongoResponse()` | `dictation.api.*`, `common.errors.*`         |
| YouTube import      | `authErrorResponse` (`src/lib/auth/authErrorMessage.ts`)                                                  | `500`, `MISSING_MONGODB_MESSAGE`                                           | `admin.api.*`                                |
| Vocabulary          | `toVocabApiError` (`src/modules/vocabulary/services/vocabApiErrors.ts`)                                   | `500`, `vocabulary.api.missingMongo` via `getMissingVocabMongoResponse(t)` | `vocabulary.api.*`, `common.errors.*`        |
| Grammar             | local `jsonError(status, message)` + `authErrorResponse`                                                  | `503`, `grammar.api.notConfigured`                                         | `grammar.api.*`                              |
| IELTS learner/admin | `src/modules/ielts/http.ts` (`ieltsDecisionError`, `ieltsRouteFailure`, `ieltsDecisionResponse`)          | `503`, `MISSING_MONGODB_MESSAGE` via `ieltsMissingMongo()`                 | `ielts.apiErrors.*`, `ieltsEditor.api.*`     |
| Revalidate          | `decideRevalidateRequest` (`src/lib/db/revalidateRequest.ts`)                                             | n/a (no database)                                                          | none (English only)                          |

### Success response shape

There is no single envelope. Each route returns a resource-named JSON object
via `NextResponse.json(...)`, for example `{ videos }`, `{ session }`,
`{ attempt, mode, nextSegmentId, progress, session }`, `{ test }`,
`{ entries }`. Grammar and IELTS start routes return a bare result object (see
their sections).

- `200` for reads, updates, idempotent replays, and resumes.
- `201` for inserts: new dictation video, new transcript, new dictation
  session, new dictation attempt, YouTube import, new IELTS attempt
  (`mode: 'created'`), new IELTS draft test.
- `410` only for the retired `POST /api/admin/ielts/tests/[testId]/new-version`.

### Error response shape

Errors are always `{ "message": string }` with an HTTP status. A few IELTS
admin errors add fields (`report` on a blocked publish, `attemptCount` on a
blocked delete). The dictation decision type is:

```
interface ApiErrorDecision {
  status: 400 | 401 | 403 | 404 | 409 | 500 | 503
  body: { message: string }
}
```

(`src/modules/dictation/services/videoRouteDecisions.ts`). Vocabulary uses
`VocabApiErrorDecision` (adds `429`), IELTS uses `IeltsApiError` (adds `422`,
`429`) from `src/modules/ielts/attempts/attemptRouteDecisions.ts`.

Learner-facing text is localized. Each handler reads the request's catalogue
with `getMessages()` (`src/i18n/server.ts`, locale from the locale cookie) and
picks a key, for example `t.dictation.api.videoNotFound`. Not every message is
localized:

- zod/decision-helper failures in dictation (`'Session start payload is
invalid.'`, `'Segment id is invalid.'`, first zod issue text, segment guard
  messages in `segmentRouteDecisions.ts`) and `MISSING_MONGODB_MESSAGE` stay
  English;
- IELTS errors built with `ieltsMessageError(status, key)` carry an English
  body plus a `messageKey`, and `ieltsDecisionError` re-renders them from
  `t.ielts.apiErrors`; errors built with `ieltsError(status, message)` (zod
  failures, invalid JSON) stay English;
- `src/requests/**` helpers treat an empty or missing `message` as "show your
  own translated fallback" (see section 9).

Common statuses across modules:

| Status | Meaning                                                                                                                                             |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `400`  | invalid JSON (`SyntaxError`), zod failure, invalid id param (dictation), out-of-range query                                                         |
| `401`  | `UnauthenticatedError` from `requireUser`/`requireAdmin` (no session) -> `common.errors.unauthorized`, "Please sign in to continue."                |
| `403`  | `ForbiddenError` from `requireAdmin` -> `common.errors.forbidden`; IELTS practice-only features on a mock attempt                                   |
| `404`  | resource missing or not owned by the user; IELTS invalid ObjectId params also map to `404`                                                          |
| `409`  | duplicate key (`code 11000`), stale revision/guard, `OutboxOwnerMismatchError` (queued for another learner), invalid state transition               |
| `410`  | retired endpoint                                                                                                                                    |
| `422`  | IELTS publish blocked by the consistency report                                                                                                     |
| `429`  | IELTS writing grading daily limit                                                                                                                   |
| `500`  | unexpected error (logged), dictation/vocab missing Mongo                                                                                            |
| `503`  | Qwen (`DASHSCOPE_API_KEY`) not configured or failed (dictation translate, IELTS), grammar/IELTS missing Mongo, grammar idempotency claim still busy |

Dictation routes map any thrown error with numeric `status` 401/403/409 through
`getAccessErrorMessage` (`401 -> common.errors.unauthorized`,
`409 -> dictation.api.ownerMismatch`, else `common.errors.forbidden`). Grammar,
IELTS and YouTube import use `authErrorResponse`
(`src/lib/auth/authErrorMessage.ts`), which matches the four auth error classes
exactly and maps them to `400` (`InvalidOwnerKeyError`, `common.errors.invalidRequest`),
`401` (`UnauthenticatedError`), `403` (`ForbiddenError`) and `409`
(`OutboxOwnerMismatchError`). Dictation route error mappers and
`toVocabApiError` check `InvalidOwnerKeyError` first and answer `400`
(`common.errors.invalidRequest`). `toVocabApiError` maps 401/403 to `common.errors.*`, a
`MissingVietnameseMeaningError` to `vocabulary.api.needsMeaning`, and any other
409 to the error's own (English) message.

### Auth and current-user resolution

Helpers live in `src/lib/auth/currentUser.ts` (shared by every module). Roles come from the
`ADMIN_EMAILS` allowlist (`resolveRole` in `src/lib/auth/roles.ts`), recomputed
in the Auth.js `jwt` callback (`src/lib/auth/auth.ts`). `/api/*` is excluded
from the proxy matcher (`src/proxy.ts`), which only gates pages, so each route
handler is its own gate.

| Helper              | Returns                                | Throws                                                                                       | Used by                                          |
| ------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `getOptionalUser()` | `CurrentUser \| null` (React `cache`d) | never                                                                                        | `/api/admin/revalidate`, `setFavoriteAction`     |
| `requireUser()`     | `CurrentUser`                          | `UnauthenticatedError` (401); `InvalidOwnerKeyError` (400); `OutboxOwnerMismatchError` (409) | every per-user route handler, and `requireAdmin` |
| `requireAdmin()`    | `CurrentUser`                          | the `requireUser` errors, or `ForbiddenError` (403) when `role !== 'admin'`                  | every admin route                                |
| `requirePageUser()` | `CurrentUser`                          | redirects to `/auth/login?callbackUrl=...` instead of throwing                               | Server Components (not route handlers)           |

`requireUser()` details:

- No session -> `UnauthenticatedError` (`401`, `common.errors.unauthorized`,
  "Please sign in to continue."). There is no guest identity or guest cookie.
- The session id must pass `assertOwnerKey` (`src/lib/auth/ownerKey.ts`,
  pattern `^[a-f0-9]{24}$`, an ObjectId) before any query is scoped to it,
  else `InvalidOwnerKeyError` (`400`).
- It reads the `x-outbox-owner` request header (`OUTBOX_OWNER_HEADER`) and
  calls `assertOutboxOwnerMatchesUser` (`src/lib/auth/clientOwnerKey.ts`): no
  header passes (server actions and plain fetches carry none); otherwise the
  header must equal `toClientOwnerKey(user.id)` (first 24 hex chars of a
  SHA-256 of the id). Anything else, including the old `anonymous` value,
  throws `OutboxOwnerMismatchError` (`409`), so a write queued in a tab before
  a sign-out or an account switch never lands on another learner.
- Every query is scoped to the returned `user.id`, never a client-supplied id.

Order of checks: most per-user routes parse the URL id, query or JSON body
first and call `requireUser()` afterwards (see the per-route sections and
section 10), so a malformed request from a signed-out caller gets `400` (or
`404` for an invalid IELTS `attemptId`) before the `401`.

### Client outbox contract

Most per-user writes are not sent with a plain `fetch`. The UI applies the
change, then enqueues it on the tab's shared outbox (`getClientOutbox` in
`src/lib/sync/clientOutbox.ts`, wrapping `createOutbox` in
`src/lib/sync/outbox.ts`):

- Items are persisted to `localStorage` key `efom.outbox.v1.<owner>.<tabId>`
  and replayed after a reload; orphaned queues of closed tabs are adopted.
- Every request carries `content-type: application/json`,
  `idempotency-key: <item.id>` and `x-outbox-owner: <owner>`. No route reads
  the `idempotency-key` header: routes dedupe on an `idempotencyKey` field in
  the body, and callers set the outbox `id` to that same value.
- Lanes run in parallel; items within a lane are sent one at a time, in order.
  A `mergeKey` replaces the newest queued item with the same key (last write
  wins), and that caller resolves with `{ superseded: true }`.
- `2xx` -> settled ok. Network failure -> retried forever with backoff.
  `5xx`/`429`/`408` -> retried up to `MAX_SERVER_ERROR_ATTEMPTS` (20), then
  failed. `401` (the session ended) -> hold: the item is kept, every lane
  pauses, and `onUnauthorized` (`handleUnauthorized` in
  `src/lib/sync/clientOutbox.ts`) releases the stored queue and redirects the
  tab to `/auth/login?callbackUrl=<current page>`. After the same account signs
  back in the owner key is the same, so the queue replays; another account
  never sees it. Other `4xx` (including `409` owner mismatch) -> settled
  failed (the UI rolls back). Replayed items expire after 7 days, or 12 hours
  for `mergeKey` (set-state) items.
- The owner is the server-rendered client owner key, `toClientOwnerKey` in
  `src/app/(app)/layout.tsx`; there is no anonymous owner.

Because the outbox may resend, every outbox route is either deduped on a key or
a "set desired state" write:

| Lane                    | Defined in                                        | Writes (method, route)                                                                                                                                                                | Replay safety                                                              |
| ----------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `dictation:<sessionId>` | `src/modules/dictation/practice/practiceSync.ts`  | `POST .../sessions/[sessionId]/attempts` (id = `idempotencyKey`); `PATCH .../sessions/[sessionId]` cursor (`mergeKey: 'cursor'`), preferences (`mergeKey: 'preferences'`), completion | attempt dedupe per user; PATCH sets state; `completedAt` kept on replay    |
| `vocab:items`           | `src/components/vocabulary/vocabItemWrites.ts`    | `POST /api/vocab/items` (`mergeKey: item:<vocabEntryId>`)                                                                                                                             | sets status; repeat `shouldLearn` on a learning item is a no-op            |
| `vocab:recall`          | `src/components/vocabulary/vocabRecallSession.ts` | `POST /api/vocab/recall/answer` (id = `idempotencyKey`)                                                                                                                               | unique `{ userId, idempotencyKey }` claim                                  |
| `grammar`               | `src/requests/grammarSessionsApi.ts`              | `POST /api/grammar/sessions` (id = `idempotencyKey`)                                                                                                                                  | claim-then-write on `{ userId, idempotencyKey }`, stored response replayed |
| `ielts:<attemptId>`     | `src/requests/ieltsApi.ts`                        | `PUT .../answers` (`mergeKey: attempt:<id>`), `POST .../submit` (id `submit-<attemptId>`)                                                                                             | `seq` guard; submitted attempt returns stored result                       |

### Cache invalidation

Shared catalog content is cached under tags in `src/lib/db/cacheTags.ts`
(`dictation-catalog`, `grammar-content`, `ielts-content`). Dictation admin
writes call `revalidateDictationCatalog()` and IELTS writes to non-draft tests
call `expireCacheTags([CACHE_TAGS.ieltsContent])`
(`src/lib/db/revalidateCatalog.ts`, hard expiry `{ expire: 0 }`). Scripts use
`POST /api/admin/revalidate` (section 8).

## 2. Endpoint summary

Auth column: `public` = no auth call; `user` = `requireUser()` (a signed-in
account, `401` without a session, data scoped to `user.id`); `admin` =
`requireAdmin()`; `admin or secret` = admin session or `x-revalidate-secret`.

| Method           | Path                                                      | Purpose                                          | Auth            | Client (`src/requests` or outbox)                                                                   |
| ---------------- | --------------------------------------------------------- | ------------------------------------------------ | --------------- | --------------------------------------------------------------------------------------------------- |
| GET, POST        | `/api/auth/[...nextauth]`                                 | Auth.js Google sign-in/out, callback, session    | public          | Auth.js `signIn` / `signOut`                                                                        |
| GET              | `/api/dictation/videos`                                   | List non-archived catalog videos                 | public          | `listDictationVideosApi`                                                                            |
| POST             | `/api/dictation/videos`                                   | Create a catalog video                           | admin           | `createDictationVideoApi`                                                                           |
| GET              | `/api/dictation/videos/[videoId]`                         | Admin detail: video, tracks, active segments     | admin           | `getDictationVideoDetailApi`                                                                        |
| PATCH            | `/api/dictation/videos/[videoId]`                         | Update video default language                    | admin           | `updateDictationVideoApi`                                                                           |
| DELETE           | `/api/dictation/videos/[videoId]`                         | Archive (soft-delete) a video                    | admin           | `archiveDictationVideoApi`                                                                          |
| POST             | `/api/dictation/transcripts`                              | Attach primary or translation transcript         | admin           | `attachDictationTranscriptApi`, `attachDictationTranslationTrackApi`                                |
| DELETE           | `/api/dictation/transcripts/[transcriptId]`               | Delete a non-active transcript track             | admin           | `deleteDictationTranscriptApi`                                                                      |
| PATCH            | `/api/dictation/segments/[segmentId]`                     | Edit/split/merge, hints, translation override    | admin           | `setDictationSegmentHintsApi`, `resetDictationSegmentHintsApi`, `setDictationSegmentTranslationApi` |
| POST             | `/api/dictation/segments/[segmentId]/translate`           | AI translation suggestion for one segment        | admin           | `translateDictationSegmentApi`                                                                      |
| POST             | `/api/dictation/sessions`                                 | Start or resume a practice session               | user            | `startOrResumeDictationSessionApi`                                                                  |
| GET              | `/api/dictation/sessions/translations`                    | One language's caption cues and overrides        | public          | `getDictationTranslationTrackApi`                                                                   |
| GET              | `/api/dictation/sessions/[sessionId]`                     | Read one owned session                           | user            | (none)                                                                                              |
| PATCH            | `/api/dictation/sessions/[sessionId]`                     | Cursor, preferences, status                      | user            | outbox lane `dictation:<sessionId>`                                                                 |
| POST             | `/api/dictation/sessions/[sessionId]/attempts`            | Record a dictation attempt                       | user            | outbox lane `dictation:<sessionId>`                                                                 |
| GET, POST, PATCH | `/api/dictation/review-items`                             | List / recompute / complete-dismiss review items | user            | (none)                                                                                              |
| POST             | `/api/dictation/debriefs`                                 | Generate or return an AI debrief                 | user            | `createDictationDebriefApi`                                                                         |
| POST             | `/api/dictation/imports/youtube`                          | Import a YouTube video by URL                    | admin           | `importYouTubeVideoApi`                                                                             |
| POST             | `/api/vocab/entries/lookup`                               | Find/create, enrich and return one entry         | user            | `lookupVocabEntryApi`                                                                               |
| POST             | `/api/vocab/occurrences`                                  | Record a "met this word" event                   | user            | `recordVocabOccurrenceApi`                                                                          |
| GET              | `/api/vocab/search`                                       | Prefix-search cached entries                     | user            | `searchVocabApi`                                                                                    |
| GET              | `/api/vocab/explore`                                      | Unclassified common words                        | user            | `getExploreVocabApi`                                                                                |
| POST             | `/api/vocab/items`                                        | Set `shouldLearn` / `alreadyKnow`                | user            | outbox lane `vocab:items`                                                                           |
| POST             | `/api/vocab/items/batch`                                  | Legacy batch status update                       | user            | (none; kept for old bundles)                                                                        |
| GET              | `/api/vocab/recall/due`                                   | Page of signed recall tasks                      | user            | `getDueVocabRecallApi`                                                                              |
| POST             | `/api/vocab/recall/answer`                                | Server-grade a signed recall answer              | user            | outbox lane `vocab:recall`                                                                          |
| GET              | `/api/vocab/stats`                                        | Vocabulary stats and daily growth                | user            | `getVocabStatsApi`                                                                                  |
| POST             | `/api/grammar/sessions`                                   | Record one finished grammar session              | user            | outbox lane `grammar` (`buildGrammarSessionWrite`)                                                  |
| POST             | `/api/ielts/attempts`                                     | Start or resume an IELTS attempt                 | user            | `startIeltsAttemptApi`                                                                              |
| GET, DELETE      | `/api/ielts/attempts/[attemptId]`                         | Read (finalizing if due) / delete an attempt     | user            | `readIeltsAttemptApi`, `deleteIeltsAttemptApi`                                                      |
| PUT              | `/api/ielts/attempts/[attemptId]/answers`                 | Autosave answers snapshot                        | user            | outbox lane `ielts:<attemptId>` (`buildIeltsAnswersWrite`)                                          |
| POST             | `/api/ielts/attempts/[attemptId]/submit`                  | Submit and score                                 | user            | outbox lane `ielts:<attemptId>` (`buildIeltsSubmitWrite`)                                           |
| POST             | `/api/ielts/attempts/[attemptId]/audio-events`            | Listening mock audio clock event                 | user            | `postIeltsAudioEventApi`                                                                            |
| POST             | `/api/ielts/attempts/[attemptId]/check`                   | Practice check: one part, or one writing task    | user            | `checkIeltsPartApi`, `checkIeltsTaskApi`                                                            |
| GET              | `/api/ielts/attempts/[attemptId]/evidence`                | Guided-mode evidence for one question            | user            | `readIeltsEvidenceApi`                                                                              |
| POST             | `/api/ielts/attempts/[attemptId]/grade`                   | AI grading of one writing task after submit      | user            | `gradeIeltsWritingApi`                                                                              |
| POST             | `/api/ielts/drills`                                       | Start a question-type drill                      | user            | `startIeltsDrillApi`                                                                                |
| GET, POST        | `/api/admin/vocab/enrich`                                 | Inspect / run vocab enrichment queue             | admin           | `getVocabAdminQueueApi`, `enrichVocabularyAdminApi`                                                 |
| GET, POST        | `/api/admin/ielts/tests`                                  | List tests / create a draft                      | admin           | `listIeltsTestsApi`, `createIeltsTestApi`                                                           |
| GET, PUT, DELETE | `/api/admin/ielts/tests/[testId]`                         | Read / save metadata / delete a test             | admin           | `readIeltsTestApi`, `saveIeltsMetaApi`, `deleteIeltsTestApi`                                        |
| POST             | `/api/admin/ielts/tests/[testId]/publish`                 | Publish a draft                                  | admin           | `publishIeltsTestApi`                                                                               |
| POST             | `/api/admin/ielts/tests/[testId]/archive`                 | Archive a published test                         | admin           | `archiveIeltsTestApi`                                                                               |
| POST             | `/api/admin/ielts/tests/[testId]/unarchive`               | Re-publish an archived test                      | admin           | `unarchiveIeltsTestApi`                                                                             |
| POST             | `/api/admin/ielts/tests/[testId]/new-version`             | Retired, always `410`                            | public          | (none)                                                                                              |
| GET, PUT         | `/api/admin/ielts/tests/[testId]/vocab`                   | Read / replace the test's word list              | admin           | `readIeltsTestVocabApi`, `saveIeltsTestVocabApi`                                                    |
| PUT              | `/api/admin/ielts/tests/[testId]/sections/[key]`          | Save one draft section                           | admin           | `saveIeltsSectionApi`                                                                               |
| POST             | `/api/admin/ielts/tests/[testId]/sections/[key]/generate` | One AI generation step for a section             | admin           | `generateIeltsSectionApi`                                                                           |
| POST             | `/api/admin/ielts/tests/[testId]/sections/[key]/audio`    | TTS audio for a listening part                   | admin           | `generateIeltsAudioApi`                                                                             |
| POST             | `/api/admin/ielts/assist`                                 | AI proposal for a section (not saved)            | admin           | `assistIeltsSectionApi`                                                                             |
| POST             | `/api/admin/ielts/uploads/sign`                           | Signed Cloudinary upload params                  | admin           | `uploadIeltsFileApi`                                                                                |
| POST             | `/api/admin/revalidate`                                   | Expire shared-content cache tags                 | admin or secret | (none; `curl` from scripts)                                                                         |

## 3. Auth

### GET, POST /api/auth/[...nextauth]

File: `src/app/api/auth/[...nextauth]/route.ts` re-exports Auth.js `handlers`
(`export const { GET, POST } = handlers`) from `src/lib/auth/auth.ts` (JWT
session strategy). The `jwt` callback provisions the Mongoose user on sign-in
(`provisionUserOnSignIn`), sets `token.uid` to its ObjectId, and stamps
`token.role = resolveRole(token.email)`. Google is the only way in: there is no
guest identity and no `/api/guest` route (it no longer exists and answers
`404`). A caller without a session gets `401` from every per-user route (see
"Auth and current-user resolution" in section 1); pages redirect to
`/auth/login` through the proxy and `requirePageUser()`.

### Server action setFavoriteAction

Not an HTTP route, but it follows the same rule.
`setFavoriteAction` (`src/modules/dictation/content/favoriteActions.ts`) uses
`getOptionalUser()` and, when the session has ended, returns
`{ favorited: null, needsAuth: true }` instead of throwing so the client
(`src/components/dictation/browse/FavoriteButton.tsx`) can send the learner to
the login page. A malformed id still throws.

## 4. Dictation

Decision helpers: `src/modules/dictation/services/*RouteDecisions.ts`. Record
mappers: `src/modules/dictation/services/dictation*Records.ts`. All dictation
routes run `getMissingMongoResponse()` first (`500`). Learner-facing keys live
in `src/i18n/messages/en/dictation.ts` under `dictation.api`.

### Videos

Files: `src/app/api/dictation/videos/route.ts`,
`src/app/api/dictation/videos/[videoId]/route.ts`. Schema:
`src/modules/dictation/schemas/videoPayloadSchema.ts`.

| Endpoint                                 | Auth / order                         | Request                                                                                                                                                                                                       | Success                                                                                                            | Errors                                                                                                                             |
| ---------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/dictation/videos`              | public                               | none                                                                                                                                                                                                          | `200 { videos }`, non-archived, sorted `{ order: 1, createdAt: -1 }`, limit 50                                     | `500` (`videosLoadFailed`)                                                                                                         |
| `POST /api/dictation/videos`             | `requireAdmin` before parsing        | `createDictationVideoPayloadSchema` (strict): `youtubeUrl` (URL, max 2048), optional `title` (1-240, default "Untitled dictation video"), optional `transcriptStatus` (`none \| manualNeeded \| manualAdded`) | `201 { video }`; `status: 'needsTranscript'`, `order` = non-archived count                                         | `400` invalid JSON (`invalidJson`) / first zod issue; `401`/`403`; `409` duplicate (`videoDuplicate`); `500` (`videoCreateFailed`) |
| `GET /api/dictation/videos/[videoId]`    | 24-hex id check, then `requireAdmin` | none                                                                                                                                                                                                          | `200 { video, tracks, segments }`: all transcript tracks sorted by language, active-transcript segments by `order` | `400` (`invalidVideoId`); `401`/`403`; `404` (`videoNotFound`); `500` (`videoUpdateFailed`)                                        |
| `PATCH /api/dictation/videos/[videoId]`  | id check, `requireAdmin`, then body  | `updateDictationVideoPayloadSchema` (strict): `defaultLanguage` (2-12, valid tag), normalized by `normalizeTranslationLanguage`                                                                               | `200 { video }`                                                                                                    | `400`; `401`/`403`; `404` (`videoNotFound`); `500` (`videoUpdateFailed`)                                                           |
| `DELETE /api/dictation/videos/[videoId]` | id check, `requireAdmin`             | none                                                                                                                                                                                                          | `200 { video }` after `$set: { status: 'archived' }`                                                               | `400`; `401`/`403`; `404`; `500` (`videoDeleteFailed`)                                                                             |

All writes call `revalidateDictationCatalog()`.

### Transcripts

Files: `src/app/api/dictation/transcripts/route.ts`,
`src/app/api/dictation/transcripts/[transcriptId]/route.ts`. Decisions:
`transcriptRouteDecisions.ts` (POST), `parseTranscriptIdParam` in
`segmentRouteDecisions.ts` (DELETE). Schema:
`src/modules/dictation/schemas/transcriptPayloadSchema.ts`.

#### POST /api/dictation/transcripts

- Auth: admin, called after the body is parsed (a malformed body gets `400`
  before the admin check).
- Body: `transcriptPayloadSchema` (strict): `videoId` (24-hex), `language`
  (2-12, default `en`), `role` (`primary | translation`, default `primary`),
  optional `sourceType` (`manualText | manualTimedText | captionFile`),
  `rawText` (trimmed, 20 to 500000). `parseTranscriptRequest` runs
  `normalizeTranscriptSource`; `qualityStatus === 'blocked'` -> `400`
  "Transcript source does not contain usable English text." (English).
- Video must be non-archived, else `404` (`videoNotFound`).
- `role: 'translation'`: same `sourceHash` returns the existing track (`200`);
  otherwise deletes older inactive same-language tracks and creates an
  `isActive: false` track (`201`). No segments, no `activeTranscriptId` change.
- `role: 'primary'`: an existing transcript with the same `sourceHash` is
  re-activated (`200`), else a new active transcript is created (`201`). Both
  paths set the video to `transcriptStatus: 'manualAdded'`,
  `status: 'transcriptReady'`, prune older same-language transcripts and their
  segments (`pruneSupersededTranscripts`), then build segments server-side
  (`buildDictationSegments` + `persistRebuiltSegments` in
  `src/modules/dictation/services/rebuildTranscriptSegments.ts`). The rebuild is
  destructive: it recreates every segment, prunes review items on old segment
  ids, updates counts, and marks the video `ready`.
- Success: `{ transcript, videoId }`.
- Errors: `400`; `401`/`403`; `404`; `409` duplicate (`transcriptDuplicate`);
  `500` (`transcriptSaveFailed`).
- Client: `attachDictationTranscriptApi`, `attachDictationTranslationTrackApi`
  (forces `role: 'translation'`).

#### DELETE /api/dictation/transcripts/[transcriptId]

- Id: `parseTranscriptIdParam` (24-hex, else `400` "Transcript id is invalid.").
- Auth: admin.
- `404` (`transcriptNotFound`); `409` (`transcriptActiveDelete`) when it is the
  video's active transcript; otherwise `deleteOne()`.
- Success `200`: `{ deleted: true, transcriptId }`. `500`
  (`transcriptDeleteFailed`).

### Segments

#### PATCH /api/dictation/segments/[segmentId]

File: `src/app/api/dictation/segments/[segmentId]/route.ts`. Schema:
`segmentEditSchema` in `src/modules/dictation/services/segmentRouteDecisions.ts`
(discriminated union on `action`). Segments are only built inside
`POST /api/dictation/transcripts`; there is no build route.

- Id: `parseSegmentIdParam` (`400` "Segment id is invalid.").
- Order: body parsed (`400` "Segment edit payload is invalid."), then
  `requireAdmin`, then the segment graph is loaded (`404` `segmentNotFound`).

| `action`                     | Extra fields                                           | Guard                                                                    | Effect                                                                             | Response                      |
| ---------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ----------------------------- |
| `acceptWarning`              | none                                                   | edit guard                                                               | `warningAccepted = true`                                                           | `{ segment }`                 |
| `edit`                       | `text` (2-3000), nullable `startMs`/`endMs` (int >= 0) | edit guard; `startMs >= endMs` -> `400`                                  | `editSegment` recomputes normalized text and flags                                 | `{ segment }`                 |
| `split`                      | `splitAt` (int >= 1)                                   | edit guard                                                               | shifts later `order` +1, inserts right half, updates counts                        | `{ segment, createdSegment }` |
| `mergePrevious`, `mergeNext` | none                                                   | edit guard; no neighbor -> `409` (`noAdjacentSegment`)                   | keeps the earlier segment, deletes the other, shifts `order` -1, updates counts    | `{ segment }` (the kept one)  |
| `setHints`                   | `hints`: up to 64 strings, each 1-80                   | build guard                                                              | `filterHintsToSentence` keeps only words in the sentence; `hintsOverridden = true` | `{ segment }`                 |
| `resetHints`                 | none                                                   | build guard                                                              | `hints = []`, `hintsOverridden = false`                                            | `{ segment }`                 |
| `setTranslation`             | `language` (2-20), `text` (max 3000; empty clears)     | build guard; primary language -> `400` (`primaryLanguageNotOverridable`) | writes `translations[language]` (Mixed field, `markModified`)                      | `{ segment }`                 |

Guards (`segmentRouteDecisions.ts`, English messages): the build guard returns
`404` for a missing transcript/video and `409` when the transcript is blocked or
no longer the video's active transcript. The edit guard adds `409` when
`segment.transcriptSourceHash !== transcript.sourceHash`. Metadata actions
(hints, translation) deliberately skip the source-hash check.

Segment records (`toDictationSegmentRecord`) now include `hints`,
`hintsOverridden`, and `translations` (a plain `{ [language]: text }`).
Errors: `401`/`403`; `500` (`segmentEditFailed`).

#### POST /api/dictation/segments/[segmentId]/translate

File: `src/app/api/dictation/segments/[segmentId]/translate/route.ts`.

| Item   | Contract                                                                                                                                                                                   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Auth   | admin, after body parsing                                                                                                                                                                  |
| Body   | local `translateRequestSchema` (strict): `language` (2-20). Invalid -> `400` (`targetLanguageRequired`)                                                                                    |
| Logic  | loads the segment and video `defaultLanguage`; same as primary -> `400` (`primaryLanguageNotTranslatable`); calls `translateSegmentText` (`src/lib/ai/qwenTranslate.ts`). Nothing is saved |
| `200`  | `{ translation: string }`                                                                                                                                                                  |
| Errors | `400` bad id (`invalidSegmentId`) / JSON / body; `401`/`403`; `404` (`segmentNotFound`); `503` with the provider message when translation fails; `500` (`segmentTranslateFailed`)          |
| Client | `translateDictationSegmentApi` (admin reviews, then saves via `setTranslation`)                                                                                                            |

### Sessions

Files: `src/app/api/dictation/sessions/route.ts`,
`src/app/api/dictation/sessions/[sessionId]/route.ts`,
`src/app/api/dictation/sessions/translations/route.ts`. Decisions and schemas:
`src/modules/dictation/services/sessionRouteDecisions.ts`.

#### POST /api/dictation/sessions

- Auth: user; the body is parsed first (`400`), then `requireUser()`.
- Body: `sessionStartSchema` (strict): `videoId` (24-hex). Invalid -> `400`
  "Session start payload is invalid."
- Guard (`getSessionStartGuardDecision`, localized): `404` `videoNotFound`;
  `409` `transcriptRequired` (no active transcript); `409` `segmentsRequired`
  (no first segment).
- Resume: the newest `active` session for `{ userId, videoId }` gets
  `lastActiveAt` bumped and any other active sessions for that pair are set to
  `abandoned`. Returns `200 { mode: 'resume', session }`.
- Start: creates a session at the first segment (`playbackSpeed: 1`,
  `showShortcuts: true`, `isVideoHidden: false`) -> `201 { mode: 'start',
session }`. A concurrent start that loses the partial-unique index
  (`isDuplicateKeyError`) returns the winner as `200 { mode: 'resume' }`.
- The shared video document is not modified by starting practice.
- Errors: `400`; `409` owner mismatch; `500` (`sessionStartFailed`).
- Client: `startOrResumeDictationSessionApi` (throws an `Error` with `status`
  so the practice shell can retry 5xx/429/408).

#### GET /api/dictation/sessions/translations

- Auth: public (no session needed; translation tracks are shared catalog content).
- Query: `parseTranslationTrackRequest`
  (`src/modules/dictation/practice/translationTrackRequest.ts`): `videoId`
  (24-hex) and `language` (valid tag, normalized). Invalid -> `400` "A video id
  and a language code are required." (English). The language becomes a
  projection path, so only plain tags pass.
- Logic: `loadTranslationTrack`
  (`src/modules/dictation/practice/practiceTranslations.ts`) returns null when
  the language is the video's default or no transcript with cues exists.
- `200`: `{ track: { cues, language, overrides } }` (`PracticeTranslationTrack`
  in `src/modules/dictation/practice/types.ts`; `overrides` maps segmentId to
  text).
- Errors: `404` (`translationNotFound`); `500` (`translationLoadFailed`).
- Client: `getDictationTranslationTrackApi`.

#### GET /api/dictation/sessions/[sessionId]

- Id: `parseSessionIdParam` (`400` "Session id is invalid.").
- Auth: user, after the id check; query scoped to `{ _id, userId: user.id }`.
- `200 { session }`; `404` (`sessionNotFound`); `500`.

#### PATCH /api/dictation/sessions/[sessionId]

- Body: `sessionPatchSchema` (strict, all optional): `currentSegmentId`
  (24-hex, nullable), `currentSegmentOrder` (int >= 0), `playbackSpeed`
  (0.25-2), `showShortcuts`, `isVideoHidden`, `status`
  (`active | completed | abandoned`). Invalid -> `400` "Session update payload
  is invalid."
- `404` (`sessionNotFound`) unless owned. A `currentSegmentId` must belong to
  the session's transcript and video, else `409` (`segmentNotInSession`).
- `status` uses `resolveSessionCompletedAt`
  (`src/modules/dictation/practice/sessionCompletion.ts`): completing stamps
  `completedAt` once (a replayed completion keeps the original time); any other
  status clears it. `lastActiveAt` is always bumped.
- `200 { session }`; `500` (`sessionUpdateFailed`).
- Client: outbox writes from `practiceSync.ts` (`buildCursorWrite`,
  `buildPreferencesWrite`, `buildCompletionWrite`); path from
  `getDictationSessionApiPath`.

### Attempts

#### POST /api/dictation/sessions/[sessionId]/attempts

File: `src/app/api/dictation/sessions/[sessionId]/attempts/route.ts`. Schema:
`attemptPayloadSchema` in
`src/modules/dictation/services/attemptRouteDecisions.ts`.

| Field              | Rule                              |
| ------------------ | --------------------------------- |
| `action`           | `check \| reveal \| skip`         |
| `idempotencyKey`   | trimmed, 8-120                    |
| `segmentId`        | 24-hex                            |
| `replayCountDelta` | optional int 0-500                |
| `timeSpentMs`      | optional int 0 to 6 h             |
| `typedAnswer`      | optional, max 5000 (default `''`) |

Invalid -> `400` "Attempt payload is invalid." Flow:

1. Replay check: `findOne({ userId, idempotencyKey })` across all of the
   user's sessions (oldest wins). A hit returns `200` with
   `mode: 'idempotent'` via `respondWithReplay`: the cursor is untouched, but
   review items for that segment are recomputed (the only chance if the first
   delivery failed after saving). The session in the response is the one the
   request targets; missing -> `404` (`sessionNotFound`).
2. Session must be owned (`404`) and not `abandoned`
   (`canRecordAttemptForSession` in
   `src/modules/dictation/practice/attemptCursor.ts`; `409`
   `sessionNotActive`). Completed sessions still accept attempts.
3. Any segment of the session's transcript and video is accepted (the browser
   grades locally and may be ahead of the server cursor); otherwise `404`
   (`segmentNotFound`).
4. `buildDictationCorrection` grades; the attempt is saved. A duplicate-key
   race on `{ userId, sessionId, idempotencyKey }` answers with the winner as
   a replay.
5. Cursor (`resolveAttemptCursor`): a passed `check` or a `skip` moves to the
   segment after the attempted one, or completes the session when there is
   none; any other attempt moves the cursor to the attempted segment. A
   non-active session keeps its cursor. Shared segment and video documents are
   never written; per-learner progress is derived from attempts
   (`src/modules/dictation/practice/segmentProgressService.ts`).
6. `recomputeReviewItemsForSegment` runs for the user.

Success `201`:
`{ attempt, mode: 'create', nextSegmentId: string | null, progress, session }`
where `progress` is a `SegmentProgressRow`
(`src/modules/dictation/practice/segmentProgress.ts`). Errors: `400`; `404`;
`409` (`sessionNotActive`, owner mismatch); `500` (`attemptSaveFailed`).
Client: outbox `buildAttemptWrite` (`practiceSync.ts`), path
`getDictationAttemptsApiPath` (`src/requests/dictationAttemptsApi.ts`).

### Review items

File: `src/app/api/dictation/review-items/route.ts`. Decisions:
`reviewItemRouteDecisions.ts`. Service:
`src/modules/dictation/review/reviewItemService.ts`. Auth: user (`requireUser()`
after the query or body is parsed).

| Method  | Input                                                                                                           | Success                                                | Errors                              |
| ------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------- |
| `GET`   | query `limit` (1-50, default 20), optional `videoId` (24-hex); `400` "Review item filters are invalid."         | `200 { reviewItems }` (`listDueReviewItemsForUser`)    | `500` (`reviewUpdateFailed`)        |
| `POST`  | body strict `{ videoId }`; `400` "Review recompute payload is invalid."                                         | `200 { reviewItems }` (`recomputeReviewItemsForVideo`) | `400` JSON; `500`                   |
| `PATCH` | body strict `{ action: 'complete' \| 'dismiss', reviewItemId }`; `400` "Review item update payload is invalid." | `200 { reviewItem }` (`markReviewItemForUser`)         | `404` (`reviewItemNotFound`); `500` |

No `src/requests` helper; review items are read server-side.

### Debriefs

File: `src/app/api/dictation/debriefs/route.ts`. Decisions:
`src/modules/dictation/ai/debriefDecisions.ts`. Service:
`src/modules/dictation/ai/debriefService.ts`.

- Auth: user, after the body is parsed. Body `debriefPayloadSchema` (strict): `videoId`, optional
  `notes` (max 2000). Invalid -> `400` "Debrief payload is invalid."
- `200 { debrief, mode: 'cache' | 'created' }`.
- When the service returns `ok: false`, the route keeps its status but replaces
  the English reason: `404` -> `videoNotFound`, `409` -> `debriefIncomplete`,
  `503` -> `debriefUnavailable`. `500` (`debriefFailed`).
- Client: `createDictationDebriefApi`.

### YouTube import

File: `src/app/api/dictation/imports/youtube/route.ts`. Decisions:
`youtubeImportDecisions.ts`. Schema:
`src/modules/dictation/schemas/youtubeImportPayloadSchema.ts`. Messages:
`admin.api.*` (`src/i18n/messages/en/admin.ts`).

- Auth: admin, before parsing.
- Body: strict `{ youtubeUrl }` (URL, max 2048). `parseYouTubeImportRequest`
  returns a `code` (`invalidUrl` or the extractor's code) that the route maps to
  `t.admin.api[code]` with status `400`.
- Existing video: any row whose `youtubeVideoId`, `youtubeUrl` or `sourceUrl`
  matches (archived rows included) returns `200 { alreadyExists: true, video,
warning: null }` without touching it.
- New video: `getYouTubeVideoMetadata` -> `notFound` `404` (`videoNotFound`),
  `failed` `500` (`metadataFailed`), `apiKeyMissing` (placeholder title,
  `importStatus: 'metadataWarning'`), `ready` (`metadataReady` or
  `metadataReadyEmbedBlocked`). Upserts on `youtubeVideoId` with
  `status: 'needsTranscript'` and `defaultLanguage: DEFAULT_DICTATION_LANGUAGE`.
- `201 { alreadyExists: false, video, warning }`.
- Errors: `400`; `401`/`403`/`409` via `authErrorResponse`; `409` duplicate
  (`alreadyImported`); `500` (`importFailed`, or missing Mongo).
- Client: `importYouTubeVideoApi`.

## 5. Vocabulary

Files: `src/app/api/vocab/**/route.ts`. Schemas and parsers:
`src/modules/vocabulary/services/vocabularyRouteDecisions.ts` (each `parseXxx`
takes the request's catalogue `t` and returns `{ ok: true, data }` or a `400`
with a `vocabulary.api.*` message). Limits: `src/modules/vocabulary/constants.ts`.
Every route: `getMissingVocabMongoResponse(t)` (`500`), query or body parse (`400`), then
`requireUser()` (`401` without a session; `GET /api/vocab/stats` has no input, so
it gates first), `SyntaxError`
-> `400` (`invalidJson`), anything else through `toVocabApiError` (`500`
`vocabulary.api.failed`).

### POST /api/vocab/entries/lookup

- Body: `lookupEntrySchema` (strict): `term` (trimmed 1-80); optional
  `occurrence` with `reason` (`manualSearch | dictionaryLookup | explore |
clickedInAnswer | missedWord | aiDebrief`, default `dictionaryLookup`),
  `selectedText` (max 500), `contextSentence` (max 3000), nullable 24-hex
  `videoId` / `segmentId` / `attemptId`. Invalid -> `400` (`invalidLookup`).
- Flow: `isEnglishTermCandidate` (`src/modules/vocabulary/normalizeVocabTerm.ts`)
  rejects non-English input (`400` `notEnglish`) before any write;
  `findOrCreateVocabEntryShell` (`400` `invalidTerm` on null);
  `enrichVocabEntryIfNeeded`. An entry with no definitions is not an English
  word: the shell is deleted unless a user already saved it, and the route
  returns `404` (`noDictionaryEntry`, with `{term}`). Only then is the
  occurrence recorded, after the response via `after()`.
- `200`: `VocabEntryWithUserStateRecord` (`{ entry, userItem }`). `404`
  (`entryNotFound`) if the record vanished.

### POST /api/vocab/occurrences

- Body: `occurrenceRecordSchema` (strict): `vocabEntryId` (24-hex) and a
  required `occurrence` (same shape as above). Invalid -> `400`
  (`invalidOccurrence`).
- `404` (`entryNotFound`) when the entry does not exist; else
  `recordVocabOccurrence`. `200 { ok: true }`.
- Client: `recordVocabOccurrenceApi` (fire-and-forget, `keepalive: true`, not
  queued in the outbox).

### GET /api/vocab/search

- Query: `q` (trimmed 1-80), `limit` (1-25, default 12). Invalid -> `400`
  (`invalidSearch`).
- `200 { entries }` from `searchVocabEntries` (prefix search over cached
  entries; never enriches).

### GET /api/vocab/explore

- Query: `limit` (1-50, default 20). Invalid -> `400` (`invalidExplore`).
- `200 { entries }` from `listExploreVocabEntriesForUser`
  (`src/modules/vocabulary/explore/exploreService.ts`).

### POST /api/vocab/items

- Body: `itemStatusSchema` (strict): `vocabEntryId` (24-hex), `status`
  (`shouldLearn | alreadyKnow`), `source`
  (`search | explore | dictionary | manual | ielts`, default `manual`), optional
  `occurrenceReason`. Invalid -> `400` (`invalidItem`).
- Logic: `setUserVocabItemStatus`
  (`src/modules/vocabulary/services/userVocabItemService.ts`). The entry must
  exist and carry a Vietnamese meaning (`VOCAB_REQUIRES_VI_MEANING_FILTER`),
  else `MissingVietnameseMeaningError` -> `409` (`needsMeaning`). A
  `shouldLearn` on an item already `learning` returns it unchanged (replay
  safe). Otherwise upserts the learning or known state.
- `200 { item }`. `404` (`entryNotFound`) only if the upsert returned null.
- Client: outbox lane `vocab:items` (`enqueueVocabItemStatus`).

### POST /api/vocab/items/batch

Legacy route "kept for tabs still on the previous bundle".

- Body: `itemStatusBatchSchema` (strict): `updates` (1 to
  `VOCAB_ITEM_STATUS_BATCH_MAX` = 100 of the single-item shape). Invalid -> `400`
  (`invalidItemBatch`).
- `200 { results: Array<{ vocabEntryId, item, error? }> }`
  (`setUserVocabItemStatusBatch`); per-item failures are reported inline with
  the English error message.

### GET /api/vocab/recall/due

- Query: `recallDueSchema`: `limit` (int >= 1, clamped to 50, default 20; an
  old bundle asking for more gets a page, not an error), `excludeListening`
  (`0 | 1 | false | true`), optional `cursor` (`v1.<dueBeforeMs>.<dueAtMs>.<updatedAtMs>.<itemId>`,
  `src/modules/vocabulary/recall/recallDueCursor.ts`). Invalid -> `400`
  (`invalidRecallQuery`).
- `200`: `VocabRecallDuePageRecord` `{ tasks, nextCursor }` from
  `listDueVocabRecallTasksForUser`
  (`src/modules/vocabulary/recall/recallTaskService.ts`). The keyset cursor
  only returns items due at the first page's `dueBefore`, so cards answered in
  the session do not come back.
- Client: `getDueVocabRecallApi({ cursor, excludeListening, limit })`.

### POST /api/vocab/recall/answer

- Body: `recallAnswerSchema` (strict): `token` (20-5000), `idempotencyKey`
  (8-160), nullable `selectedOptionId` (1-160), nullable `action`
  (`lookup | notSure | remember`). Invalid -> `400` (`invalidRecallAnswer`).
- Logic: `submitVocabRecallAnswerForUser`
  (`src/modules/vocabulary/recall/recallAnswerService.ts`) replays a stored
  attempt for the same `{ userId, idempotencyKey }`, otherwise verifies the
  signed token, claims the key, grades, and applies the seven-stage scheduler.
- `200 { attemptId, isCorrect, item }`. `409` (`staleRecallCard`) on a null
  result.
- Client: outbox lane `vocab:recall` (`enqueueVocabRecallAnswer`).

### GET /api/vocab/stats

- No params. `200 { stats }` from `getVocabStatsForUser`.

### Word list query (page, not a route)

The word list has no API route: the Server Component
`src/app/(app)/vocabulary/words/page.tsx` reads its search params through
`parseVocabWordListQuery` (`vocabularyRouteDecisions.ts`) and calls
`listVocabWordsForUser` directly. The parse never fails; each bad value falls
back on its own:

| Param     | Rule                                                                               | Fallback   |
| --------- | ---------------------------------------------------------------------------------- | ---------- |
| `page`    | integer 1-100000                                                                   | `1`        |
| `perPage` | integer 1-`VOCAB_WORD_LIST_MAX_PAGE_SIZE` (200)                                    | `50`       |
| `q`       | trimmed string, max 60 chars (longer falls back); passed as `search` (term prefix) | `''`       |
| `view`    | `learning \| dueToday \| alreadyKnow \| mastered \| knownTotal`                    | `learning` |

Array values use the first entry. Search semantics: `docs/05-modules.md`
(vocabulary, `vocabWordListService.ts`).

## 6. Grammar

### POST /api/grammar/sessions

File: `src/app/api/grammar/sessions/route.ts`. Schema: `sessionRequestSchema`
in `src/modules/grammar/session/parseSessionRequest.ts`. Service:
`recordGrammarSession` in
`src/modules/grammar/services/grammarProgressService.ts`. Messages:
`grammar.api.*` (`src/i18n/messages/en/grammar.ts`). Domain logic:
`docs/08-grammar.md`.

| Item   | Contract                                                                                                                                                                                                                            |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth   | user (`requireUser()`, after the body is parsed)                                                                                                                                                                                    |
| Body   | `answers` (1-20 of `{ cardId: 1-60 chars, answer: unknown }`), `idempotencyKey` (8-100), `mode` (`GRAMMAR_SESSION_MODES`: `lesson \| review \| checkpoint \| weak`), `targetId` (1-40)                                              |
| Logic  | claims `{ userId, idempotencyKey }` in `GrammarSessionModel` before reading; re-grades the raw first answers, applies stars, unlocks, ladder and misses (`planGrammarSessionWrite`), then stores the response on the claim          |
| `200`  | `GrammarSessionResult` (`src/modules/grammar/session/planGrammarSessionWrite.ts`): `mode, targetId, total, correctCount, accuracy, passed, stars, results, unlocked, testOut`. A replay of a finished key returns the stored result |
| `400`  | invalid JSON (`invalidJson`), schema failure (`invalidResult`), `stale` (content changed)                                                                                                                                           |
| `409`  | `locked`, `notDue`, `unitComplete` (`t.grammar.api.errors[code]`); owner mismatch via `authErrorResponse` (`common.errors.ownerMismatch`)                                                                                           |
| `503`  | missing Mongo (`notConfigured`); `busy` when the same key was claimed less than 60 s ago (retryable)                                                                                                                                |
| `500`  | `saveFailed` (the claim is released so a retry re-plans)                                                                                                                                                                            |
| Client | `buildGrammarSessionWrite` (`src/requests/grammarSessionsApi.ts`), lane `grammar`, outbox id = `idempotencyKey`                                                                                                                     |

## 7. IELTS learner

Files: `src/app/api/ielts/**/route.ts`. Plumbing: `src/modules/ielts/http.ts`
(order: Mongo -> JSON body -> zod -> `requireUser()` -> service). Schemas:
`src/modules/ielts/attempts/attemptRouteDecisions.ts`. Services:
`src/modules/ielts/attempts/attemptService.ts`,
`src/modules/ielts/writing/gradeWritingService.ts`,
`src/modules/ielts/drill/drillService.ts`. Messages: `ielts.apiErrors.*`
(`src/i18n/messages/en/ielts.ts`). Domain logic: `docs/09-ielts.md`.

Shared rules: missing Mongo -> `503`; invalid JSON -> `400` "Request body must
be valid JSON."; zod failure -> `400` with the first issue text; an invalid
`attemptId` (not an ObjectId) -> `404` (`attemptNotFound`); every attempt query
is scoped to `ownerId = user.id`; no session -> `401`
(`common.errors.unauthorized`), a session id that is not an ObjectId -> `400`,
and an owner mismatch -> `409` (`common.errors.ownerMismatch`), all via
`ieltsRouteFailure`. Because the user is resolved after parsing, a malformed
body or an invalid `attemptId` from a signed-out caller gets `400`/`404` first; uncaught errors ->
`500` (`ielts.apiErrors.generic`, or a route-specific key noted below).

Answer values (`answersSchema`): a record keyed by question number
(`^\d{1,2}$`, at most 40 keys) of either a string (max
`IELTS_ESSAY_MAX_LENGTH`) or up to 3 short strings (1-8 chars).
`validateAnswerLengths` then caps objective answers at
`IELTS_ANSWER_MAX_LENGTH` (`400` `answerTooLong`) and requires writing keys `1`
and `2` as text.

| Endpoint                                 | Body / query                                                                                                                                                                                                                                          | Success                                                                                                                                                                          | Errors                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/ielts/attempts`               | `startAttemptSchema` (strict): `testSlug` (`^[a-z0-9-]{1,80}$`), `skill` (`IELTS_SKILLS`), `mode` (`practice \| mock`), `scope` (`{kind:'skill'}` or `{kind:'part', part 1-4}`), `sessionId` (8-80, nullable, default null), `idempotencyKey` (8-120) | `201 { attempt, mode: 'created' }`; `200` with `mode: 'resumed'` (open attempt for the same test version, skill, mode and scope) or `'idempotent'` (same key)                    | `400` `tooFewParts`; `404` `testUnavailable`, `noSectionForPart`; `409` `mockNeedsAudio` (listening mock without audio), `staleStart` (key from an older test version)                                                                                                                                                    |
| `GET /api/ielts/attempts/[attemptId]`    | none                                                                                                                                                                                                                                                  | `200 { attempt }`; an in-progress attempt past deadline plus grace is expired and scored on read, and a half-scored submit is finalized                                          | `404` `attemptNotFound`                                                                                                                                                                                                                                                                                                   |
| `DELETE /api/ielts/attempts/[attemptId]` | none                                                                                                                                                                                                                                                  | `200 { deleted: true }`; today's gradings are copied to `IeltsGradingLedgerModel` first so the daily limit stays honest                                                          | `404`                                                                                                                                                                                                                                                                                                                     |
| `PUT .../[attemptId]/answers`            | `saveAnswersSchema` (strict): `answers`, `seq` (1-1000000)                                                                                                                                                                                            | `200 { applied: boolean, savedSeq }`; a stale `seq` or a non-in-progress attempt is `applied: false`, not an error                                                               | `404`; `400` lengths; `409` `timeUp` (past deadline plus grace)                                                                                                                                                                                                                                                           |
| `POST .../[attemptId]/submit`            | `submitAttemptSchema` (strict): `answers`, `seq`, `idempotencyKey` (8-120, used by the outbox id only)                                                                                                                                                | `200 { attempt }`; a newer in-time snapshot is written with the status flip, else the stored answers are submitted; an already submitted attempt returns its stored result       | `404`; `400` lengths; `409` `startAudioFirst` (listening mock never started); `500` `submitFailed`                                                                                                                                                                                                                        |
| `POST .../[attemptId]/audio-events`      | `audioEventSchema`: `{ kind: 'part-started', part 1-4 }` or `{ kind: 'interrupted' \| 'resumed', positionSec 0-3600 }`                                                                                                                                | `200 { attempt }` with a recomputed `deadlineAt`; ignored (returns the attempt) unless a listening mock in progress, for a repeated part start, or past `IELTS_MAX_AUDIO_EVENTS` | `404`; `409` `audioEventsChanged` after 3 optimistic retries                                                                                                                                                                                                                                                              |
| `POST .../[attemptId]/check`             | `checkPracticeSchema`: `{ answers, part 1-4 }` (Listening/Reading) or `{ task: 1 \| 2, essay }` (Writing)                                                                                                                                             | part: `200` `IeltsPartCheck` `{ part, raw, total, questions[] }` (nothing stored); task: `200 { feedback }` (only the grading count is stored)                                   | part: `403` `checkPracticeOnly`, `400` `writingPerTask`, `404` `partNotInAttempt`; task: `400` `onlyWritingAi` / `writeEssayFirst`, `403` `checkTaskPracticeOnly`, `409` `alreadySubmitted`, `404` `taskNotInAttempt`, `503` `aiNotConfigured`, `429` `gradingLimit`, `500` `couldNotGrade`; fallback `500` `checkFailed` |
| `GET .../[attemptId]/evidence?number=N`  | `number` 1-40 (`400` `questionNumberRange`)                                                                                                                                                                                                           | `200 { number, sectionKey, notGiven, evidence: { quote, blockIndex } \| null }`                                                                                                  | `403` `guidedPracticeOnly` (mock or drill); `404` `questionNotInAttempt`                                                                                                                                                                                                                                                  |
| `POST .../[attemptId]/grade`             | `gradeWritingSchema` (strict): `task` (1 or 2)                                                                                                                                                                                                        | `200 { attempt }`; a failed examiner run is stored as `writingFeedback.<task>.status: 'failed'` and still returns `200`; both tasks graded -> status `scored` with `writingBand` | `400` `onlyWritingGraded`; `409` `submitBeforeGrading`, `alreadyGrading`; `404` `taskNotInAttempt`, `taskContentMissing`; `503` `aiNotConfiguredCompare`; `429` `gradingLimit` (`getIeltsWritingDailyLimit()`, default 10 per UTC day); fallback `500` `gradeFailed`                                                      |
| `POST /api/ielts/drills`                 | `startDrillSchema` (strict): `skill` (`listening \| reading`), `type` (`IELTS_QUESTION_TYPES`), `idempotencyKey`                                                                                                                                      | `200 { attempt }` (a replayed key returns the stored drill)                                                                                                                      | `404` `noDrillGroups`                                                                                                                                                                                                                                                                                                     |

Client: `src/requests/ieltsApi.ts`. Autosave and submit go through the outbox
on lane `ielts:<attemptId>` (`IELTS_OUTBOX_LANE_PREFIX` in
`src/modules/ielts/constants.ts`); everything else is a direct `fetch`. Paths
come from `IELTS_API_PATHS` in the same constants file.

## 8. Admin

Everything under `/api/admin/**` requires an admin session, except
`/api/admin/revalidate` (admin or shared secret) and the retired
`new-version` route.

### GET, POST /api/admin/vocab/enrich

File: `src/app/api/admin/vocab/enrich/route.ts`.

- `GET`: `requireAdmin` then `200 { queue }` (`getVocabAdminQueueSummary`).
- `POST`: body parsed first: `adminEnrichSchema` (strict) `limit` (int 1-10,
  default 5); invalid -> `400` "Vocabulary enrich payload is invalid."
  (English); invalid JSON -> `400` (`admin.api.invalidJson`). Then
  `requireAdmin`, `enrichNextVocabularyEntries({ limit })`, and
  `200 { result, queue }`.
- Errors go through `toVocabApiError` with the default English catalogue.
- Client: `getVocabAdminQueueApi`, `enrichVocabularyAdminApi`.

### IELTS authoring

Files: `src/app/api/admin/ielts/**/route.ts`. Schemas:
`src/modules/ielts/tests/testRouteDecisions.ts` (plus local zod schemas in the
audio, generate, assist and upload routes). Services:
`src/modules/ielts/tests/testService.ts`,
`src/modules/ielts/generation/generationService.ts`,
`src/modules/ielts/generation/assistService.ts`,
`src/modules/ielts/audio/audioService.ts`,
`src/modules/ielts/vocab/testVocabService.ts`. Messages:
`ieltsEditor.api.*` and `ieltsEditor.generation.*`
(`src/i18n/messages/en/ieltsEditor.ts`) plus `ielts.apiErrors.*`. Path
validation: `parseTestId` (not an ObjectId -> `404` `testNotFound`),
`parseSectionKey` (not in `IELTS_SECTION_KEYS` -> `404` `sectionNotFound`).
Zod failures here return `400` with `"<path>: <issue>"`. Writes are guarded by
revisions (`metaRevision`, per-section `revision`), so a stale editor tab or a
running AI job gets `409` instead of overwriting.

| Endpoint                                                | Body / query                                                                                                                                                                                                                                             | Success                                                                                                                                                                                      | Errors                                                                                                                                                                                                                     |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/admin/ielts/tests`                            | none                                                                                                                                                                                                                                                     | `200 { tests }` (`listAdminTests`)                                                                                                                                                           | `401`/`403`                                                                                                                                                                                                                |
| `POST /api/admin/ielts/tests`                           | `createTestSchema` on `mode`: `manual` `{ title 1-160, track (IELTS_TRACKS), targetBand 4-9 }` or `generate` `{ title max 160, track, targetBand, topics: up to 9 strings 1-120 }`                                                                       | `201 { test }` (draft v1 with a unique slug; `manual` or `pending` sections; `createdBy` = admin email or id; empty generate title becomes "AI <Track> test <date>")                         | `400`                                                                                                                                                                                                                      |
| `GET /api/admin/ielts/tests/[testId]`                   | none                                                                                                                                                                                                                                                     | `200 { test }` (`readAdminTest`)                                                                                                                                                             | `404` (`ieltsEditor.api.testNotFound`)                                                                                                                                                                                     |
| `PUT /api/admin/ielts/tests/[testId]`                   | `saveMetaSchema`: `meta` (`ieltsTestMetaSchema`, strict, `src/modules/ielts/schema.ts`), `metaRevision` (int >= 0)                                                                                                                                       | `200 { test }`; non-draft writes expire `ielts-content`                                                                                                                                      | `404` `testNotFound`; `409` `sectionChanged` (revision moved)                                                                                                                                                              |
| `DELETE /api/admin/ielts/tests/[testId]?withAttempts=1` | optional `withAttempts=1`                                                                                                                                                                                                                                | `200 { deleted: true, attemptsDeleted }` (draft or archived only)                                                                                                                            | `404`; `409` `archiveBeforeDelete` (published); `409 { message, attemptCount }` (`ieltsEditor.api.attemptsUseTest`, pluralized) when an archived version has attempts and no `withAttempts`; `409` `statusChanged`         |
| `POST .../[testId]/publish`                             | optional body `publishSchema` `{ confirmWarnings: boolean = false }` (an unreadable body counts as `{}`)                                                                                                                                                 | `200 { test, report }`; archives the live version of the slug in the same transaction, expires `ielts-content`                                                                               | `404`; `409` `onlyDraftPublish`, `publishedElsewhere`; `422 { message, report }` with errors (`publishErrors`) or unconfirmed warnings (`publishWarnings`) from `checkTest` (`src/modules/ielts/consistency/checkTest.ts`) |
| `POST .../[testId]/archive`                             | none                                                                                                                                                                                                                                                     | `200 { test }`                                                                                                                                                                               | `409` `onlyPublishedArchive`                                                                                                                                                                                               |
| `POST .../[testId]/unarchive`                           | none                                                                                                                                                                                                                                                     | `200 { test }`                                                                                                                                                                               | `404`; `409` `onlyArchivedUnarchive`, `slugLive` (another version is live), `statusChanged`, `versionPublished`                                                                                                            |
| `POST .../[testId]/new-version`                         | ignored                                                                                                                                                                                                                                                  | none                                                                                                                                                                                         | always `410` (`ieltsEditor.api.editedInPlace`); no auth call, tests are edited in place                                                                                                                                    |
| `GET .../[testId]/vocab`                                | none                                                                                                                                                                                                                                                     | `200 { entries }` (`listIeltsTestVocabForAdmin(slug)`)                                                                                                                                       | `404` (`testNotFound`)                                                                                                                                                                                                     |
| `PUT .../[testId]/vocab`                                | `saveTestVocabSchema` (`src/modules/ielts/vocab/testVocabRules.ts`, strict): `entryIds` (24-hex, max `IELTS_TEST_VOCAB_MAX` = 150), full ordered list                                                                                                    | `200 { entries }` (replaces the list; `updatedBy` = admin id)                                                                                                                                | `400`; `404`                                                                                                                                                                                                               |
| `PUT .../[testId]/sections/[key]`                       | `saveSectionSchema`: `section` (`ieltsSectionInputSchema`), `revision` (int >= 0)                                                                                                                                                                        | `200 { test }`; marks the section `manual`                                                                                                                                                   | `400` `sectionMaterial`, `writingNoGroups`; `404`; `409` `sectionChanged`                                                                                                                                                  |
| `POST .../[testId]/sections/[key]/generate`             | local strict schema: `step` (`draft \| repair \| script \| questions`), `revision`; invalid -> `400` (`invalidGenerate`)                                                                                                                                 | `200 { test, message }` (`generateSectionStep`, one Qwen call)                                                                                                                               | `503` no API key; `404` test/section; `409` stale revision or already generating; `400` step not applicable, nothing to repair, script first (all `ieltsEditor.generation.*`)                                              |
| `POST .../[testId]/sections/[key]/audio`                | local strict schema `{ revision }`; invalid -> `400` (`revisionRequired`)                                                                                                                                                                                | `200 { test }` (TTS, uploads, stores `listening.audio`, bumps revision)                                                                                                                      | `400` `onlyListeningAudio`, `noScript`; `503` `aiNotConfigured`; `404`; `409` `sectionChanged`, `sectionChangedDuringAudio`; `500` `audioFailed`                                                                           |
| `POST /api/admin/ielts/assist`                          | local strict schema: `action` (`draft-questions \| paraphrase-distractors \| suggest-evidence \| check-answers`), `testId` (1-40, not used), `key` (`IELTS_SECTION_KEYS`), `section` (`ieltsSectionInputSchema`), `instruction` (max 1000, default `''`) | `200 { proposal }`; nothing is saved                                                                                                                                                         | `400` first issue or `invalidAssist`, writing sections (`assistSkills`), empty material (`materialFirst`); `503` `noApiKey`; `500` provider failure, bad JSON or bad shape. No Mongo pre-check                             |
| `POST /api/admin/ielts/uploads/sign`                    | strict `{ kind: 'audio' \| 'image' }`; invalid -> `400` (`uploadKind`)                                                                                                                                                                                   | `200 { apiKey, cloudName, resourceType, uploadUrl, params }` (`createSignedUploadParams` in `src/lib/cloudinary/uploadAudio.ts`; folder `ielts/audio` with eager `f_mp3`, or `ielts/images`) | `401`/`403`; `500`. No database access                                                                                                                                                                                     |

Client: `src/requests/ieltsAdminApi.ts`. Its `send` helper throws
`IeltsAdminApiError(message, status, report, attemptCount)` so the editor can
show a blocked publish report or the attempt count. `uploadIeltsFileApi` signs,
then posts the file straight to Cloudinary from the browser.

### POST /api/admin/revalidate

File: `src/app/api/admin/revalidate/route.ts`. Decision:
`decideRevalidateRequest` in `src/lib/db/revalidateRequest.ts`.

| Item     | Contract                                                                                                                                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Auth     | signed-in admin (`getOptionalUser()` + role), or header `x-revalidate-secret` matching `REVALIDATE_SECRET` (`getRevalidateSecret()`), compared with SHA-256 + `timingSafeEqual`. No configured secret disables the secret path |
| Body     | `{ tags: CacheTag[] }`, 1 to all of `dictation-catalog`, `grammar-content`, `ielts-content` (`CACHE_TAG_LIST` in `src/lib/db/cacheTags.ts`); unreadable JSON is treated as `null`                                              |
| `200`    | `{ revalidated: CacheTag[] }` (deduped) after `expireCacheTags(tags)`                                                                                                                                                          |
| `400`    | body invalid (message lists the allowed tags); checked only after authorization, so an unauthenticated caller learns nothing about tags                                                                                        |
| `401`    | no valid secret and not an admin, or a wrong secret from anyone                                                                                                                                                                |
| `403`    | signed-in non-admin without a secret                                                                                                                                                                                           |
| Messages | English only                                                                                                                                                                                                                   |

## 9. Client request layer (`src/requests`)

Direct `fetch` helpers read `body.message` on a non-2xx response. Since the
server message is already in the learner's language, most helpers return `''`
(or flag `fromServer: false`) when there is none, so the caller shows its own
translated fallback. Writes that must survive a reload are not here: they are
outbox items (section 1).

| Module                        | Exports                                                                                                                                                                                                                                                                                                                                                                          | Notes                                                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `dictationVideosApi.ts`       | `listDictationVideosApi`, `createDictationVideoApi`, `getDictationVideoDetailApi`, `updateDictationVideoApi`, `archiveDictationVideoApi`, `DICTATION_VIDEOS_API_PATH`                                                                                                                                                                                                            | `cache: 'no-store'`; English fallback "The dictation video request failed."; tests in `dictationVideosApi.test.ts`                 |
| `dictationTranscriptsApi.ts`  | `attachDictationTranscriptApi`, `attachDictationTranslationTrackApi`, `deleteDictationTranscriptApi`, `DICTATION_TRANSCRIPTS_API_PATH`                                                                                                                                                                                                                                           | translation helper forces `role: 'translation'`                                                                                    |
| `dictationHintsApi.ts`        | `setDictationSegmentHintsApi`, `resetDictationSegmentHintsApi`                                                                                                                                                                                                                                                                                                                   | `PATCH /api/dictation/segments/[id]` with `setHints` / `resetHints`; a non-JSON error surfaces `HTTP <status>` plus a body snippet |
| `dictationTranslationsApi.ts` | `setDictationSegmentTranslationApi`, `translateDictationSegmentApi`                                                                                                                                                                                                                                                                                                              | `setTranslation` PATCH and `POST .../translate`                                                                                    |
| `dictationSessionsApi.ts`     | `startOrResumeDictationSessionApi`, `getDictationTranslationTrackApi`, `getDictationSessionApiPath`, `DICTATION_SESSIONS_API_PATH`, `DICTATION_TRANSLATIONS_API_PATH`, type `DictationSessionPatchPayload`                                                                                                                                                                       | start error carries `status`; session PATCH goes through the outbox                                                                |
| `dictationAttemptsApi.ts`     | `getDictationAttemptsApiPath`, type `DictationAttemptPayload`                                                                                                                                                                                                                                                                                                                    | no fetch helper; attempts go through `buildAttemptWrite`                                                                           |
| `dictationDebriefsApi.ts`     | `createDictationDebriefApi`, `DICTATION_DEBRIEFS_API_PATH`                                                                                                                                                                                                                                                                                                                       | empty message -> caller fallback                                                                                                   |
| `dictationImportsApi.ts`      | `importYouTubeVideoApi`, `DICTATION_YOUTUBE_IMPORT_API_PATH`                                                                                                                                                                                                                                                                                                                     | response includes `alreadyExists`                                                                                                  |
| `vocabularyApi.ts`            | `lookupVocabEntryApi`, `recordVocabOccurrenceApi`, `searchVocabApi`, `getExploreVocabApi`, `getDueVocabRecallApi`, `getVocabStatsApi`, `getVocabAdminQueueApi`, `enrichVocabularyAdminApi`, `VocabRequestError`, `getVocabRequestErrorMessage`                                                                                                                                   | paths from `VOCAB_API_PATHS`; item status and recall answers go through the outbox; tests in `vocabularyApi.test.ts`               |
| `grammarSessionsApi.ts`       | `buildGrammarSessionWrite`, `hasPendingGrammarSessions`, `GRAMMAR_OUTBOX_LANE`, type `GrammarSessionRequestBody`                                                                                                                                                                                                                                                                 | outbox only, no fetch                                                                                                              |
| `ieltsApi.ts`                 | `startIeltsAttemptApi`, `startIeltsDrillApi`, `readIeltsAttemptApi`, `deleteIeltsAttemptApi`, `readIeltsEvidenceApi`, `postIeltsAudioEventApi`, `checkIeltsPartApi`, `checkIeltsTaskApi`, `gradeIeltsWritingApi`, `buildIeltsAnswersWrite`, `buildIeltsSubmitWrite`, `ieltsAttemptLane`, `IeltsApiError`, `ieltsErrorMessage`                                                    | `IeltsApiError` keeps `status`; message `''` when the server sent none                                                             |
| `ieltsAdminApi.ts`            | `listIeltsTestsApi`, `createIeltsTestApi`, `readIeltsTestApi`, `saveIeltsMetaApi`, `deleteIeltsTestApi`, `saveIeltsSectionApi`, `publishIeltsTestApi`, `archiveIeltsTestApi`, `unarchiveIeltsTestApi`, `readIeltsTestVocabApi`, `saveIeltsTestVocabApi`, `generateIeltsSectionApi`, `generateIeltsAudioApi`, `assistIeltsSectionApi`, `uploadIeltsFileApi`, `IeltsAdminApiError` | all `cache: 'no-store'`                                                                                                            |

No `src/requests` module exists for auth (Auth.js `signIn`/`signOut`), review
items, the session GET, the legacy vocab batch route, or
`/api/admin/revalidate`.

## 10. Gating summary

Enforcement is server-side only; the client role is never trusted.
`requireAdmin` recomputes the role from the session on every call, and every
per-user query is scoped to the server-resolved `user.id`, never a
client-supplied id.

| Gate            | Routes                                                                                                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| public          | `GET /api/dictation/videos`, `GET /api/dictation/sessions/translations`, `/api/auth/[...nextauth]`, `POST .../new-version` (always `410`)                              |
| user            | dictation sessions, attempts, review items, debriefs; all `/api/vocab/**`; `POST /api/grammar/sessions`; all `/api/ielts/**` (`401` without a session)                 |
| admin           | dictation video writes and detail, transcripts, segment PATCH and translate, YouTube import; `/api/admin/vocab/enrich`; all `/api/admin/ielts/**` except `new-version` |
| admin or secret | `POST /api/admin/revalidate`                                                                                                                                           |

Ordering caveat for callers: body-first routes (`POST /api/dictation/transcripts`,
`PATCH /api/dictation/segments/[segmentId]`, `POST .../translate`,
`POST /api/admin/vocab/enrich`, and every IELTS admin route with a body) return
`400` for a malformed body before the admin check. Admin-first routes
(`POST /api/dictation/videos`, the `[videoId]` routes,
`POST /api/dictation/imports/youtube`) return `401`/`403` regardless of body.
User routes are body-first as well: dictation sessions (start, GET, PATCH),
attempts, review items and debriefs, every `/api/vocab/**` route that takes
input, `POST /api/grammar/sessions` (JSON, then schema) and every `/api/ielts/**`
route (Mongo, id, JSON, schema) parse first and return `400` (or `404` for an
invalid `attemptId`) to a signed-out caller; only an input-free route such as
`GET /api/vocab/stats`, or a request that parses cleanly, reaches the `401`.
