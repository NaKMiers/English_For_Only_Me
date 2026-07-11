# API Reference

This document is the contract-level reference for the HTTP API of "English For
Only Me", a dictation-based IELTS practice app built on Next.js 16 App Router.
Every dictation endpoint lives under the base path `/api/dictation` and is a
Route Handler (`src/app/api/dictation/**/route.ts`) that delegates parsing and
gating to pure "route decision" helpers in
`src/modules/dictation/services/*RouteDecisions.ts` (plus schema files in
`src/modules/dictation/schemas/`). Authentication (Google via Auth.js) is served
under `/api/auth/[...nextauth]`. This reference is grounded in the actual route
and helper code; status codes and shapes below are taken from those files, not
assumed.

## 1. Conventions

### Base path and runtime

- All dictation endpoints are under `/api/dictation`. Auth endpoints are under
  `/api/auth`.
- Every dictation route sets `export const runtime = 'nodejs'` (Mongoose and
  cookies require the Node runtime, not edge).

### Success response shape

There is no single envelope. Each route returns a resource-named JSON object via
`NextResponse.json(...)`. Examples:

- List: `{ "videos": [...] }`, `{ "reviewItems": [...] }`,
  `{ "segments": [...], "transcriptId": "..." }`.
- Single: `{ "video": {...} }`, `{ "session": {...} }`,
  `{ "transcript": {...}, "videoId": "..." }`.
- Mutations may add sibling fields, for example attempts return
  `{ "attempt": {...}, "mode": "create" | "idempotent", "nextSegmentId": string | null, "session": {...} }`.

Success status codes:

- `200` for reads and in-place updates (default `NextResponse.json`).
- `201` for creations that insert a new row (new video, new transcript, new
  segment build, new session, new attempt, YouTube import). Idempotent replays
  and "resume" paths return `200` instead (see attempts and sessions below).

### Error response shape

Errors are always `{ "message": string }` with an HTTP status. Routes build a
typed `ApiErrorDecision` (defined in
`src/modules/dictation/services/videoRouteDecisions.ts`):

```
interface ApiErrorDecision {
  status: 400 | 401 | 403 | 404 | 409 | 500 | 503
  body: { message: string }
}
```

A local `jsonError(decision)` helper (repeated in each route file) emits it as
`NextResponse.json(decision.body, { status: decision.status })`. Common status
codes across routes:

- `400` invalid JSON body (`error instanceof SyntaxError` -> "Request body must
  be valid JSON."), or zod validation failure (message taken from the first zod
  issue or a fixed fallback), or an invalid id path param.
- `401` unauthenticated (thrown by `requireUser` / `requireAdmin` as
  `UnauthenticatedError`, message "Authentication required").
- `403` authenticated but not admin (thrown by `requireAdmin` as
  `ForbiddenError`, message "Admin access required").
- `404` resource not found (or not owned by the actor).
- `409` conflict: duplicate key (Mongo error `code === 11000`), stale/guarded
  state, or an operation that is not currently valid (for example submitting an
  attempt to a non-active session).
- `500` unexpected error, or `MissingEnvironmentError` when `MONGODB_URI` is not
  configured (message `MISSING_MONGODB_MESSAGE`).

Every route calls `getMissingMongoResponse()` first; when `MONGODB_URI` is
absent it short-circuits with a `500` and `MISSING_MONGODB_MESSAGE` before any
work.

Note on auth-error mapping: `requireAdmin` / `requireUser` throw objects that
carry a numeric `status` (401 or 403). Each route's `toXxxError` helper detects
`error.status === 401 || 403` and surfaces it as JSON with that status instead
of letting it become a `500`.

### Auth and current-user resolution

Auth helpers live in `src/modules/dictation/services/getCurrentUser.ts` and
`src/lib/auth/`. Roles are derived from an allowlist, never trusted from the
client (`src/lib/auth/roles.ts`: `resolveRole(email)` returns `admin` only when
the email is in `ADMIN_EMAILS`, case-insensitive).

Resolution helpers:

- `getOptionalUser()` -> `CurrentUser | null`. Reads the Auth.js session
  (`auth()`); returns null when anonymous. Never throws.
- `requireUser()` -> `CurrentUser`. Throws `UnauthenticatedError` (401) when
  anonymous.
- `requireAdmin()` -> `CurrentUser`. Calls `requireUser`, then throws
  `ForbiddenError` (403) when `role !== 'admin'`. Used by all admin write
  routes.
- `requirePracticeActor()` -> `PracticeActor` (`{ id, isGuest }`). Returns the
  signed-in user id when present, otherwise mints/reads a guest id. Never
  throws - anonymous practice is always allowed. Writes the guest cookie when
  minting, so it is only safe in Route Handlers / Server Functions.
- `getPracticeActorId()` -> `string | null`. Read-only variant for Server
  Components; never writes a cookie.

Guest identity (`src/lib/auth/guestUser.ts`):

- Anonymous practice data is scoped to a stable random id stored in an
  httpOnly, sameSite=lax cookie named `dictationGuestId` (one-year max age).
- Guest ids are prefixed `guest_` (`isGuestId` checks this prefix). The guest id
  is used as the `userId` on that actor's sessions, attempts, review items, and
  debriefs - exactly like a real user id.
- `getOrCreateGuestId()` mints and persists a fresh id when none exists;
  `getGuestId()` only reads; `clearGuestCookie()` deletes it after a merge.

Session strategy is JWT (`src/lib/auth/auth.ts`). On sign-in the `jwt` callback
upserts the Mongoose user (`provisionUserOnSignIn`) to get the canonical
ObjectId (`token.uid`) and stamps `token.role = resolveRole(token.email)`.

### Guest-to-user data merge on sign-in

Implemented in `src/modules/dictation/services/mergeGuestData.ts`
(`mergeGuestDataIntoUser(guestId, userId)`) and invoked from the Auth.js `jwt`
callback in `src/lib/auth/auth.ts` on first sign-in:

- No-op unless `isGuestId(guestId)` and `guestId !== userId`.
- Reassigns ownership by running `updateMany({ userId: guestId }, { $set: {
  userId } })` on sessions, attempts, review items, and debriefs.
- Favorites are intentionally excluded (favoriting requires login, so a guest
  never creates any; their `{ userId, videoId }` unique index would risk a merge
  collision).
- Best-effort: wrapped in try/catch in the callback so a failure never blocks
  login. On success the guest cookie is cleared via `clearGuestCookie()`.

### Idempotency keys on attempts

Attempt submission (`POST /sessions/[sessionId]/attempts`) requires an
`idempotencyKey` string (8-120 chars, validated by zod). The route looks up any
existing attempt matching `{ userId, sessionId, idempotencyKey }` before
inserting. `resolveAttemptSubmissionMode`
(`attemptRouteDecisions.ts`) returns `mode: 'idempotent'` and echoes the stored
attempt (HTTP `200`) when a match exists, or `mode: 'create'` (HTTP `201`) for a
fresh insert. The underlying `DictationAttemptModel` unique index is
`{ userId, sessionId, idempotencyKey }`, which also makes the guest merge
collision-safe (guest sessionIds are unique ObjectIds).

## 2. Endpoint summary

| Method | Path | Purpose | Auth | Client helper (`src/requests`) |
| --- | --- | --- | --- | --- |
| GET, POST | `/api/auth/[...nextauth]` | Auth.js sign-in/out, callback, session | public | (Auth.js `signIn`/`signOut`; no `requests` module) |
| GET | `/api/dictation/videos` | List non-archived catalog videos | public | `listDictationVideosApi` |
| POST | `/api/dictation/videos` | Create a catalog video | admin | `createDictationVideoApi` |
| PATCH | `/api/dictation/videos/[videoId]` | Update video default language | admin | `updateDictationVideoApi` |
| DELETE | `/api/dictation/videos/[videoId]` | Archive (soft-delete) a video | admin | `archiveDictationVideoApi` |
| POST | `/api/dictation/transcripts` | Attach primary or translation transcript | admin | `attachDictationTranscriptApi`, `attachDictationTranslationTrackApi` |
| DELETE | `/api/dictation/transcripts/[transcriptId]` | Delete a non-active transcript track | admin | `deleteDictationTranscriptApi` |
| GET | `/api/dictation/transcripts/[transcriptId]/segments` | List a transcript's segments | admin | (none) |
| POST | `/api/dictation/transcripts/[transcriptId]/segments` | (Re)build segments from transcript | admin | `buildDictationSegmentsApi` |
| PATCH | `/api/dictation/segments/[segmentId]` | Edit/split/merge/accept-warning a segment | admin | (none) |
| POST | `/api/dictation/sessions` | Start or resume a practice session | user or guest | `startOrResumeDictationSessionApi` |
| GET | `/api/dictation/sessions/[sessionId]` | Read one owned session | user or guest | (none) |
| PATCH | `/api/dictation/sessions/[sessionId]` | Update session cursor/settings/status | user or guest | `updateDictationSessionApi` |
| POST | `/api/dictation/sessions/[sessionId]/attempts` | Submit a dictation attempt | user or guest | `submitDictationAttemptApi` |
| GET | `/api/dictation/review-items` | List due review items | user or guest | (none) |
| POST | `/api/dictation/review-items` | Recompute review items for a video | user or guest | (none) |
| PATCH | `/api/dictation/review-items` | Complete/dismiss a review item | user or guest | (none) |
| POST | `/api/dictation/debriefs` | Generate/return an AI debrief | user or guest | `createDictationDebriefApi` |
| GET | `/api/dictation/stats` | Global or per-video stats | user or guest | `getDictationGlobalStatsApi`, `getDictationVideoStatsApi` |
| POST | `/api/dictation/imports/youtube` | Import a YouTube video by URL | admin | `importYouTubeVideoApi` |

"user or guest" means `requirePracticeActor()`: no login required; data is scoped
to the signed-in user id or the guest cookie id. "(none)" means there is no typed
wrapper in `src/requests`; those endpoints are consumed server-side (SSR /
`reviewItemService`) or through admin UI code paths.

## 3. Endpoints by resource

### Auth

File: `src/app/api/auth/[...nextauth]/route.ts`.

- Methods: `GET`, `POST` (re-exports Auth.js `handlers`:
  `export const { GET, POST } = handlers`).
- Purpose: Google OAuth sign-in, sign-out, session, and callback under the
  Auth.js catch-all route.
- Auth: public (this is the auth surface itself).
- Logic: `src/lib/auth/auth.ts` (NextAuth instance, JWT strategy). The `jwt`
  callback provisions the Mongoose user, sets `token.uid`, resolves role from
  `ADMIN_EMAILS`, and performs the guest-data merge (section 1).
- Client: no `src/requests` module; app code uses Auth.js `signIn` / `signOut`.

### Videos

Files: `src/app/api/dictation/videos/route.ts`,
`src/app/api/dictation/videos/[videoId]/route.ts`.
Decisions: `videoRouteDecisions.ts`. Schemas:
`schemas/videoPayloadSchema.ts`. Record mapper: `dictationVideoRecords.ts`.

#### GET /api/dictation/videos

- Auth: public. No `requireAdmin`/actor call.
- Query/body: none.
- Behavior: `connectDatabase()`, then `DictationVideoModel.find({ status: { $ne:
  'archived' } })` sorted by `{ order: 1, createdAt: -1 }`, limited to 50,
  mapped by `toDictationVideoRecord`.
- Success `200`: `{ "videos": DictationVideoApiRecord[] }`.
- Errors: `500` on `MissingEnvironmentError` (missing Mongo) or unexpected error
  ("Could not load dictation videos.").

#### POST /api/dictation/videos

- Auth: admin. `requireAdmin()` is called before parsing.
- Body: `createDictationVideoPayloadSchema` (strict): `youtubeUrl` (required,
  valid URL, max 2048), `title` (optional, trimmed 1-240, empty -> undefined,
  defaults to "Untitled dictation video"), `transcriptStatus` (optional enum
  `none | manualNeeded | manualAdded`, default `manualNeeded`). Parsed by
  `parseCreateVideoRequest`; new video is created with `status:
  'needsTranscript'` and `order = countDocuments(non-archived)`.
- Success `201`: `{ "video": DictationVideoApiRecord }`.
- Errors: `400` invalid JSON or zod failure; `401`/`403` via `requireAdmin`;
  `409` duplicate (`code 11000`, "This video is already in the dictation
  library."); `500` missing Mongo or unexpected ("Could not create the dictation
  video.").
- Client: `createDictationVideoApi`.

#### PATCH /api/dictation/videos/[videoId]

- Path param: `videoId` (must match `^[a-f\d]{24}$`; else `400` "Invalid video
  id.").
- Auth: admin (`requireAdmin`).
- Body: `updateDictationVideoPayloadSchema` (strict): `defaultLanguage`
  (trimmed 2-12, must pass `isValidTranslationLanguage`). Parsed by
  `parseUpdateVideoRequest`, then normalized via `normalizeTranslationLanguage`.
  Only `defaultLanguage` is updated on a non-archived doc.
- Success `200`: `{ "video": DictationVideoApiRecord }`.
- Errors: `400` bad id / invalid JSON / zod; `401`/`403`; `404` "Dictation video
  was not found."; `500`.
- Client: `updateDictationVideoApi`.

#### DELETE /api/dictation/videos/[videoId]

- Path param: `videoId` (same 24-hex check; `400` "Invalid video id.").
- Auth: admin (`requireAdmin`).
- Behavior: soft-delete via `findOneAndUpdate({ _id, status != archived },
  { $set: { status: 'archived' } })`.
- Success `200`: `{ "video": DictationVideoApiRecord }` (the archived doc).
- Errors: `400` bad id; `401`/`403`; `404` "Dictation video was not found.";
  `500` ("Could not delete this dictation video.").
- Client: `archiveDictationVideoApi`.

### Transcripts

Files: `src/app/api/dictation/transcripts/route.ts`,
`src/app/api/dictation/transcripts/[transcriptId]/route.ts`.
Decisions: `transcriptRouteDecisions.ts` (POST) and
`segmentRouteDecisions.ts` (`parseTranscriptIdParam` for DELETE). Schema:
`schemas/transcriptPayloadSchema.ts`.

#### POST /api/dictation/transcripts

- Auth: admin. Note: this route parses the body first, then calls
  `requireAdmin()` (so an invalid body can return `400` before the admin check;
  a well-formed body from a non-admin still returns `401`/`403`).
- Body: `transcriptPayloadSchema` (strict): `videoId` (24-hex),
  `language` (2-12, default `en`), `role` (`primary | translation`, default
  `primary`), `sourceType` (optional enum `manualText | manualTimedText |
  captionFile`), `rawText` (trimmed, 20 to 500000 chars). `parseTranscriptRequest`
  runs `normalizeTranscriptSource`; if the normalized `qualityStatus ===
  'blocked'` it returns `400` "Transcript source does not contain usable English
  text."
- Behavior:
  - Video must exist and be non-archived, else `404` "This dictation video was
    not found."
  - `role: 'translation'` attaches an alternate-language track without touching
    the primary: dedupes on `sourceHash` (returns existing with `200`), deletes
    older inactive same-language tracks, then creates an `isActive: false` track
    (`201`). Does not change `activeTranscriptId` or build segments.
  - `role: 'primary'` (default): if a transcript with the same `sourceHash`
    already exists it is re-activated (others set inactive), the video is marked
    `transcriptStatus: 'manualAdded'`, `status: 'transcriptReady'`, and returns
    `200`. Otherwise a new active transcript is created and returned `201`. In
    both primary paths `pruneSupersededTranscripts` deletes older same-language
    transcripts plus their orphaned segments (one transcript per video+language).
- Success: `{ "transcript": DictationTranscriptApiRecord, "videoId": string }`
  (`201` on create, `200` on re-activate / existing translation track).
- Errors: `400` invalid JSON / zod / blocked source; `401`/`403`; `404` missing
  video; `409` duplicate (`code 11000`, "This transcript source is already
  attached to the video."); `500`.
- Client: `attachDictationTranscriptApi` (and
  `attachDictationTranslationTrackApi`, which forces `role: 'translation'`).

#### DELETE /api/dictation/transcripts/[transcriptId]

- Path param: `transcriptId` validated by `parseTranscriptIdParam` (24-hex; else
  `400` "Transcript id is invalid.").
- Auth: admin (`requireAdmin`).
- Behavior: loads the transcript (`404` "This transcript was not found." if
  missing); refuses to delete the video's active transcript (`409` "Cannot
  delete the active transcript for this video."); otherwise `deleteOne()`.
- Success `200`: `{ "deleted": true, "transcriptId": string }`.
- Errors: `400` bad id; `401`/`403`; `404`; `409` active transcript; `500`
  ("Could not delete this transcript.").
- Client: `deleteDictationTranscriptApi`.

### Segments

Files: `src/app/api/dictation/transcripts/[transcriptId]/segments/route.ts`
(GET/POST), `src/app/api/dictation/segments/[segmentId]/route.ts` (PATCH).
Decisions: `segmentRouteDecisions.ts`. Segment building/editing logic:
`modules/dictation/segmenting/*`.

#### GET /api/dictation/transcripts/[transcriptId]/segments

- Path param: `transcriptId` (`parseTranscriptIdParam`, 24-hex).
- Auth: admin (`requireAdmin`).
- Behavior: loads transcript (`404` "This transcript was not found."), then
  lists `DictationSegmentModel.find({ transcriptId })` sorted by `{ order: 1 }`.
- Success `200`: `{ "segments": DictationSegmentApiRecord[], "transcriptId":
  string }`.
- Errors: `400` bad id; `401`/`403`; `404`; `500` ("Could not build dictation
  segments." - shared error mapper).
- Client: none.

#### POST /api/dictation/transcripts/[transcriptId]/segments

- Path param: `transcriptId` (`parseTranscriptIdParam`).
- Auth: admin (`requireAdmin`).
- Behavior: loads transcript + its video, then applies
  `getSegmentBuildGuardDecision`:
  - `404` transcript or video missing;
  - `409` "This transcript is blocked by quality checks and cannot be
    segmented." when `qualityStatus === 'blocked'`;
  - `409` "This transcript is no longer the active source for the video. Reload
    before segmenting." when `video.activeTranscriptId !== transcript._id`.
  Then `buildDictationSegments` runs; if it yields zero segments -> `409` "This
  transcript did not produce usable segments." Otherwise all existing segments
  for the transcript are deleted and rebuilt via `insertMany`; transcript
  `segmentCount` and video `sentenceCount` are updated and `video.status` set to
  `ready`.
- Success `201`: `{ "qualityFlags": [...], "qualityStatus": "...", "segments":
  DictationSegmentApiRecord[], "transcriptId": string, "videoId": string }`.
- Errors: `400` bad id; `401`/`403`; `404`; `409` guard/empty-build; `500`.
- Client: `buildDictationSegmentsApi`.

#### PATCH /api/dictation/segments/[segmentId]

- Path param: `segmentId` (`parseSegmentIdParam`, 24-hex; else `400` "Segment id
  is invalid.").
- Auth: admin. Body is parsed first, then `requireAdmin()`.
- Body: `parseSegmentEditRequest` (discriminated union on `action`):
  - `acceptWarning`: no other fields; sets `warningAccepted = true`.
  - `edit`: `text` (trimmed 2-3000), optional nullable `startMs`/`endMs`
    (int >= 0). If both times are non-null and `startMs >= endMs` -> `400`
    "Segment start time must be before end time."
  - `split`: `splitAt` (int >= 1). Splits into two segments and reorders.
  - `mergePrevious` / `mergeNext`: merges with the adjacent segment; `409`
    "There is no adjacent segment to merge." when no neighbor exists.
  Invalid payloads -> `400` "Segment edit payload is invalid."
- Guard: after loading segment + transcript + video, `getSegmentEditGuardDecision`
  applies the build guard rules plus a stale-source check: `409` "Segments were
  built from an older transcript source. Rebuild segments before editing." when
  `segment.transcriptSourceHash !== transcript.sourceHash`.
- Success `200`: `{ "segment": DictationSegmentApiRecord }`; the `split` action
  additionally returns `"createdSegment": DictationSegmentApiRecord`.
- Errors: `400` bad id / invalid JSON / zod / time order; `401`/`403`; `404`
  "This segment was not found."; `409` guard/no-neighbor; `500` ("Could not edit
  this segment.").
- Client: none (admin segment editor UI calls the route directly).

### Sessions

Files: `src/app/api/dictation/sessions/route.ts`,
`src/app/api/dictation/sessions/[sessionId]/route.ts`.
Decisions: `sessionRouteDecisions.ts`. Record mapper:
`dictationSessionRecords.ts`.

#### POST /api/dictation/sessions

- Auth: user or guest (`requirePracticeActor`). Body parsed first.
- Body: `sessionStartSchema` (strict): `videoId` (24-hex). Parsed by
  `parseSessionStartRequest`; invalid -> `400` "Session start payload is
  invalid."
- Behavior: loads non-archived video, its `activeTranscriptId`, and the first
  segment (lowest `order`). `getSessionStartGuardDecision` returns:
  - `404` "This dictation video was not found." (no video);
  - `409` "This video needs an active transcript before practice." (no active
    transcript);
  - `409` "Build sentence segments before starting practice." (no first
    segment).
  If an `active` session already exists for `{ userId, videoId }`, its
  `lastActiveAt` is bumped and it is returned with `mode: 'resume'` (`200`).
  Otherwise a new session is created (cursor at the first segment,
  `playbackSpeed: 1`, `showShortcuts: true`) and the video flips
  `ready`/`transcriptReady` -> `inProgress`; returned with `mode: 'start'`
  (`201`). Mode is computed by `resolveSessionStart`.
- Success: `{ "mode": "resume" | "start", "session": DictationSessionApiRecord }`.
- Errors: `400` invalid JSON / zod; `401`/`403` only if an auth-status error
  bubbles (practice actor itself does not throw); `404`; `409` guards; `500`.
- Client: `startOrResumeDictationSessionApi`.

#### GET /api/dictation/sessions/[sessionId]

- Path param: `sessionId` (`parseSessionIdParam`, 24-hex; else `400` "Session id
  is invalid.").
- Auth: user or guest. Query scoped to `{ _id, userId: actor.id }` so an actor
  can only read their own session.
- Success `200`: `{ "session": DictationSessionApiRecord }`.
- Errors: `400` bad id; `404` "This dictation session was not found." (missing or
  not owned); `500`.
- Client: none (session hydration is done server-side).

#### PATCH /api/dictation/sessions/[sessionId]

- Path param: `sessionId` (`parseSessionIdParam`).
- Auth: user or guest. Body parsed first.
- Body: `sessionPatchSchema` (strict, all optional):
  `currentSegmentId` (24-hex nullable), `currentSegmentOrder` (int >= 0),
  `playbackSpeed` (0.25-2), `showShortcuts` (bool), `isVideoHidden` (bool),
  `status` (`active | completed | abandoned`). Invalid -> `400` "Session update
  payload is invalid."
- Behavior: session must be owned (`404` otherwise). If `currentSegmentId` is
  provided, it must belong to the session's transcript+video, else `409` "This
  segment does not belong to the active session." Setting `status: 'completed'`
  stamps `completedAt`; any other status clears it. `lastActiveAt` is always
  bumped.
- Success `200`: `{ "session": DictationSessionApiRecord }`.
- Errors: `400` bad id / invalid JSON / zod; `404`; `409` segment mismatch;
  `500` ("Could not update this dictation session.").
- Client: `updateDictationSessionApi`.

### Attempts

File: `src/app/api/dictation/sessions/[sessionId]/attempts/route.ts`.
Decisions: `attemptRouteDecisions.ts` (payload + status/cursor logic) and
`parseSessionIdParam` from `sessionRouteDecisions.ts`. Correction:
`modules/dictation/correction`. Review recompute:
`review/reviewItemService.ts`. Record mapper: `dictationAttemptRecords.ts`.

#### POST /api/dictation/sessions/[sessionId]/attempts

- Path param: `sessionId` (`parseSessionIdParam`).
- Auth: user or guest. Body parsed first.
- Body: `attemptPayloadSchema` (strict): `action` (`check | reveal | skip`),
  `idempotencyKey` (trimmed 8-120), `segmentId` (24-hex), optional
  `replayCountDelta` (int 0-500, default 0), `timeSpentMs` (int 0 to 6h, default
  0), `typedAnswer` (max 5000, default ""). Invalid -> `400` "Attempt payload is
  invalid."
- Idempotency: looks up `{ userId, sessionId, idempotencyKey }`. If found,
  echoes the stored attempt with `mode: 'idempotent'` and `200` (plus the
  session's current segment as `nextSegmentId`). Requires the session to still
  exist (`404` otherwise).
- Fresh submission validation:
  - `404` "This dictation session was not found." (not owned);
  - `409` "This dictation session is not active." (`session.status !==
    'active'`);
  - `409` "This attempt is not for the current session segment." (segmentId !=
    session cursor);
  - `404` "This dictation segment was not found." (segment not in
    transcript+video).
- Behavior: `buildDictationCorrection` grades the answer; the attempt is saved;
  the segment's `attemptStatus` is updated (`getAttemptSegmentStatus` for
  reveal/skip, else `getCheckSegmentStatus(isPassed)`), `attemptCount` bumped.
  `shouldAdvanceAttemptCursor` advances to the next segment on `skip` or a passed
  `check`; when there is no next segment the session is marked `completed`, the
  video's `completedSessionCount` is incremented and its `status` set to
  `completed`. After saving, `recomputeReviewItemsForVideo` runs for the actor.
- Success `201`: `{ "attempt": DictationAttemptApiRecord, "mode": "create",
  "nextSegmentId": string | null, "session": DictationSessionApiRecord }`.
  Idempotent replays return the same shape with `mode: "idempotent"` and `200`.
- Errors: `400` bad id / invalid JSON / zod; `404`; `409` non-active / wrong
  segment; `500` ("Could not save this dictation attempt.").
- Client: `submitDictationAttemptApi`.

### Review items

File: `src/app/api/dictation/review-items/route.ts`.
Decisions: `reviewItemRouteDecisions.ts`. Service:
`review/reviewItemService.ts`.

#### GET /api/dictation/review-items

- Auth: user or guest.
- Query: `parseListReviewItemsRequest` over `URLSearchParams`:
  `limit` (coerced int 1-50, default 20), `videoId` (optional 24-hex). Invalid
  -> `400` "Review item filters are invalid."
- Behavior: `listDueReviewItemsForUser({ limit, userId, videoId })`.
- Success `200`: `{ "reviewItems": [...] }`.
- Errors: `400` invalid filters; `500` (missing Mongo / "Could not update
  dictation review items.").
- Client: none (loaded server-side / via `reviewItemService`).

#### POST /api/dictation/review-items

- Auth: user or guest. Body parsed first.
- Body: `recomputeReviewItemsSchema` (strict): `videoId` (24-hex). Invalid ->
  `400` "Review recompute payload is invalid."
- Behavior: `recomputeReviewItemsForVideo({ userId, videoId })`.
- Success `200`: `{ "reviewItems": [...] }`.
- Errors: `400` invalid JSON / zod; `500`.
- Client: none.

#### PATCH /api/dictation/review-items

- Auth: user or guest. Body parsed first.
- Body: `updateReviewItemSchema` (strict): `action` (`complete | dismiss`),
  `reviewItemId` (24-hex). Invalid -> `400` "Review item update payload is
  invalid."
- Behavior: `markReviewItemForUser({ action, userId, reviewItemId })`.
- Success `200`: `{ "reviewItem": {...} }`.
- Errors: `400`; `404` "This review item was not found." (null result); `500`.
- Client: none.

### Debriefs

File: `src/app/api/dictation/debriefs/route.ts`.
Decisions: `ai/debriefDecisions.ts`. Service: `ai/debriefService.ts`.

#### POST /api/dictation/debriefs

- Auth: user or guest. Body parsed first.
- Body: `debriefPayloadSchema` (strict): `videoId` (24-hex), optional `notes`
  (trimmed, max 2000, defaults to ""). `parseDebriefPayload` invalid -> `400`
  "Debrief payload is invalid."
- Behavior: `generateDictationDebriefForUser({ notes, userId, videoId })`. That
  service returns a discriminated result; when `result.ok === false` the route
  emits `{ message: result.message }` at `result.status` (the service decides
  the specific code, for example a completion blocker). On success returns the
  debrief and its `mode`.
- Success `200`: `{ "debrief": DictationDebriefApiRecord, "mode": "cache" |
  "created" }`.
- Errors: `400` invalid JSON / zod; service-provided status when
  `result.ok === false`; `401`/`403` if bubbled; `500` ("Could not generate this
  dictation debrief.").
- Client: `createDictationDebriefApi`.

### Stats

File: `src/app/api/dictation/stats/route.ts`.
Decisions: `statsRouteDecisions.ts`. Services: `stats/globalStatsService.ts`,
`stats/videoStatsService.ts`.

#### GET /api/dictation/stats

- Auth: user or guest.
- Query: `parseStatsSearchParams`. No `videoId` -> scope `global`. A `videoId`
  present must be 24-hex (else `400` "A valid videoId query parameter is
  required.") -> scope `video`.
- Behavior: global scope -> `getGlobalStatsForUser(actor.id)`; video scope ->
  `getVideoStatsForUser({ userId, videoId })`.
- Success `200`: `{ "stats": DictationGlobalStatsRecord }` or
  `{ "stats": DictationVideoStatsRecord }`.
- Errors: `400` invalid videoId; `500` ("Could not load dictation stats.").
- Client: `getDictationGlobalStatsApi`, `getDictationVideoStatsApi`.

### Imports (YouTube)

File: `src/app/api/dictation/imports/youtube/route.ts`.
Decisions: `youtubeImportDecisions.ts`. Schema:
`schemas/youtubeImportPayloadSchema.ts`. Metadata:
`lib/youtube/getYouTubeVideoMetadata.ts`.

#### POST /api/dictation/imports/youtube

- Auth: admin. `requireAdmin()` is called before parsing.
- Body: `youtubeImportPayloadSchema` (strict): `youtubeUrl` (valid URL, max
  2048). `parseYouTubeImportRequest` also runs `extractYouTubeId`; a URL with no
  extractable id -> `400` (extractor message). Invalid body -> `400` (first zod
  issue or "Invalid YouTube import.").
- Behavior: fetches metadata via `getYouTubeVideoMetadata`:
  - `state === 'notFound'` -> `404` (metadata message);
  - `state === 'failed'` -> `500` (metadata message);
  - `state === 'apiKeyMissing'` -> proceeds with a placeholder title and
    `importStatus: 'metadataWarning'`;
  - `state === 'ready'` -> uses real title/channel/duration/thumbnail;
    `importStatus` is `metadataReadyEmbedBlocked` when not embeddable, else
    `metadataReady`.
  Then upserts `DictationVideoModel` on `{ youtubeVideoId }` with `$setOnInsert`
  (sourceType youtube, urls, `status: 'needsTranscript'`, `transcriptStatus:
  'manualNeeded'`) and `$set` of the metadata + import status/warning.
- Success `201`: `{ "video": DictationVideoApiRecord, "warning": string | null }`.
- Errors: `400` invalid JSON / zod / bad URL; `401`/`403`; `404` not found;
  `409` duplicate (`code 11000`, "This YouTube video is already in your dictation
  library."); `500` fetch-failed / missing Mongo / unexpected.
- Client: `importYouTubeVideoApi`.

## 4. Client request layer (`src/requests`)

All wrappers use the native `fetch`, always pass `cache: 'no-store'` (dictation
data is per-user and must never be cached), and share the same error convention:
each module defines a local `readApiError(response)` that reads `body.message`
(falling back to a module-specific string), and every function does
`if (!response.ok) throw new Error(await readApiError(response))`, then returns
the parsed JSON cast to a typed response interface. Each function accepts an
optional `input` URL override (used for tests and absolute-URL SSR calls).

- `dictationVideosApi.ts` -> `listDictationVideosApi` (GET),
  `createDictationVideoApi` (POST), `updateDictationVideoApi` (PATCH),
  `archiveDictationVideoApi` (DELETE). Constant:
  `DICTATION_VIDEOS_API_PATH`.
- `dictationTranscriptsApi.ts` -> `attachDictationTranscriptApi` (POST),
  `attachDictationTranslationTrackApi` (POST, forces `role: 'translation'`),
  `deleteDictationTranscriptApi` (DELETE). Type `DictationTranscriptPayload`;
  constant `DICTATION_TRANSCRIPTS_API_PATH`.
- `dictationSegmentsApi.ts` -> `buildDictationSegmentsApi` (POST). Helper
  `getDictationTranscriptSegmentsApiPath(transcriptId)`. (No GET/PATCH wrappers.)
- `dictationSessionsApi.ts` -> `startOrResumeDictationSessionApi` (POST),
  `updateDictationSessionApi` (PATCH). Constant `DICTATION_SESSIONS_API_PATH`.
- `dictationAttemptsApi.ts` -> `submitDictationAttemptApi` (POST). Types
  `DictationAttemptPayload`, `DictationAttemptResponse`.
- `dictationDebriefsApi.ts` -> `createDictationDebriefApi` (POST). Type
  `DictationDebriefPayload`; constant `DICTATION_DEBRIEFS_API_PATH`.
- `dictationStatsApi.ts` -> `getDictationGlobalStatsApi` (GET),
  `getDictationVideoStatsApi` (GET with `?videoId=`). Constant
  `DICTATION_STATS_API_PATH`. Tests in `dictationStatsApi.test.ts`.
- `dictationImportsApi.ts` -> `importYouTubeVideoApi` (POST). Constant
  `DICTATION_YOUTUBE_IMPORT_API_PATH`.

There is no `requests` module for review items or for the segment GET/PATCH or
session GET routes; those are consumed by Server Components / services (for
example `reviewItemService`) or admin UI code that calls the routes directly.
There is also no `requests` module for auth (app code uses Auth.js `signIn` /
`signOut`).

## 5. Admin vs user vs public gating

Enforcement is entirely server-side; the client role is never trusted.

Public (no auth call):

- `GET /api/dictation/videos`.

Admin-only writes (guarded by `requireAdmin()` inside the handler, which throws
`UnauthenticatedError` 401 / `ForbiddenError` 403, mapped to JSON by each route's
error helper):

- `POST /api/dictation/videos`
- `PATCH /api/dictation/videos/[videoId]`
- `DELETE /api/dictation/videos/[videoId]`
- `POST /api/dictation/transcripts`
- `DELETE /api/dictation/transcripts/[transcriptId]`
- `GET /api/dictation/transcripts/[transcriptId]/segments`
- `POST /api/dictation/transcripts/[transcriptId]/segments`
- `PATCH /api/dictation/segments/[segmentId]`
- `POST /api/dictation/imports/youtube`

User-or-guest (per-user practice, guarded by `requirePracticeActor()`; never
throws, data always scoped to `actor.id`):

- `POST /api/dictation/sessions`, `GET`/`PATCH
  /api/dictation/sessions/[sessionId]`
- `POST /api/dictation/sessions/[sessionId]/attempts`
- `GET`/`POST`/`PATCH /api/dictation/review-items`
- `POST /api/dictation/debriefs`
- `GET /api/dictation/stats`

How the admin re-check works (server-side): the role is not read from the
request. `requireAdmin` -> `requireUser` -> `getOptionalUser` reads the Auth.js
JWT session, and `resolveRole(email)` (`src/lib/auth/roles.ts`) recomputes the
role from the `ADMIN_EMAILS` allowlist on every call. Even though the JWT already
carries `token.role`, admin status is derived from the allowlist server-side, so
a tampered client cannot escalate. Practice ownership is enforced by scoping
every per-user Mongo query to the server-resolved `actor.id` (user id or guest
cookie id), never a client-supplied id.

Ordering caveat worth noting for callers: `POST /transcripts`,
`PATCH /segments/[segmentId]`, and `POST` bodies elsewhere are validated before
`requireAdmin`, so a malformed body can yield `400` even from a non-admin;
`POST /videos` and `POST /imports/youtube` call `requireAdmin` first, so a
non-admin gets `401`/`403` regardless of body.
