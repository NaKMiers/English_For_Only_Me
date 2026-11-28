# Plan: sign-in required (Google only), one login page, guest mode removed

Date: 2026-11-28. Status: plan, reviewed with `/plan-eng-review` on 2026-11-28
(report at the end); not started.
Baseline: `main` at `a9c198f` plus the large uncommitted calm-progress UI work in
the tree. **Commit (or stash) that work before starting**, so this change lands
as its own reviewable diff.

Who runs this: one implementation session follows section 6 phase by phase,
then one review session checks the acceptance criteria in section 7 and the
failure modes in section 9. Everything needed is in this file or in
`.agents/rules/`.

## 0. TL;DR

- Every page except `/auth/login` needs a signed-in Google account. Every per-user
  API needs one too (401 otherwise). Admin rules do not change.
- One new page, `/auth/login`: a centred card on the app's pastel canvas with the
  Buddy mascot, the app name, one tagline, four module chips and a single
  "Continue with Google" button. EN/VI and day/night toggles in the corner. No
  sign-up, no password, no "forgot password".
- Guest mode is deleted end to end: the guest cookie, `POST /api/guest`, the
  four guest-merge services and their planners, the anonymous outbox owner,
  every `isGuest` / `canFavorite` branch and every "sign in to ..." prompt.
- A one-off script `bun run auth:drop-guest-data` removes rows owned by
  `guest_...` ids (dry run first, `--apply --i-am-sure` to write).
- Playwright signs in by minting a session JWT for a seeded test user in a
  global setup. No test-only route ships in the app.

## 1. What the owner asked for, and the decisions

Request (2026-11-28): "everyone must log in and have an account to use the
web app; Google is the only auth method. Make one beautiful, eye-catching
login page in the current site style. No sign-up or forgot-password page.
Plan how it affects the current source and delete whatever becomes
redundant, so the site keeps no dead features."

Owner decisions (asked during the review):

| Id | Question | Decision |
| -- | -------- | -------- |
| D1 | Existing guest rows in MongoDB | Delete all guest code, plus a cleanup script (dry run, then apply) |
| D2 | Google OAuth not configured (local machine without client id/secret) | Fail closed: `/auth/login` shows "sign-in is not configured", nobody gets in. No dev bypass |
| D3 | Login page layout | Centred card + Buddy mascot + module chips on the pastel canvas |
| D4 | E2E sign-in | Playwright global setup mints a session JWT for a seeded test user |

Reviewer decisions (engineering calls made in this review; change them here
before implementation if you disagree):

| Id | Decision | Why |
| -- | -------- | --- |
| R1 | A 401 from the client outbox **holds** the queued write and sends the tab to `/auth/login?callbackUrl=<current path>`. After signing back in with the same account, the stored queue is adopted and replayed | Today any 4xx drops the item and rolls the UI back. With login required, an expired or signed-out session is the common 401; dropping would lose practice the learner just did |
| R2 | `requireUser()` becomes the one write-boundary resolver: it absorbs `assertOwnerKey` and the `x-outbox-owner` check from `requirePracticeActor`. `requirePracticeActor`, `PracticeActor` and `getPracticeActorId` are deleted. Server Components call a new `requirePageUser()` that redirects to `/auth/login` | One identity path instead of three. Explicit: callers only ever needed a user id |
| R3 | Keep `toClientOwnerKey` (sha256 hash) as the outbox owner, drop only the `anonymous` branch | Changing the owner key format would orphan queues already stored in browsers. The hash costs nothing |
| R4 | `safeCallbackUrl(raw)` (pure) accepts only same-origin paths; rejects `//x`, `/\x`, `/auth/login`, `/api/...`, other origins; falls back to `/` | Open-redirect guard. Auth.js passes an absolute URL as `callbackUrl`, so it must parse absolute same-origin URLs too |
| R5 | Delete `src/app/sitemap.ts`; add `src/app/robots.ts` with `disallow: '/'`; `/auth/login` metadata `robots: { index: false }` | Nothing behind the login is crawlable; a sitemap of pages that all redirect is dead weight |
| R6 | Keep the `auth.config.ts` / `auth.ts` split. Next 16 proxy runs on Node by default (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`, "Runtime"), so the reason is no longer "edge cannot load Mongoose" but "the proxy runs on every navigation and prefetch, so it must only decode the JWT, never touch the DB" (Next auth guide, "Optimistic checks with Proxy"). Update the comments to say so | Same structure, correct rationale |
| R7 | `/auth/login` lives at `src/app/auth/login/` (outside the `(app)` group): no rail, no tab bar, no `OutboxOwnerProvider` | A signed-out visitor has no owner and nothing to queue. Path `/auth/login` is the owner's convention; it does not clash with the Auth.js handlers under `/api/auth/*` (the proxy matcher skips `api/`) |
| R8 | Auth.js `pages: { signIn: '/auth/login', error: '/auth/login' }` in `authConfig`; `signOut({ redirectTo: '/auth/login' })`; every `/api/auth/signin?...` link in the code goes away | The Auth.js default sign-in page must never show again |

## 2. What exists today

```
browser ──► proxy.ts (matcher /admin/* only) ──► page renders for anyone
                                                    │
            guest cookie dictationGuestId ◄─────────┤ first write: POST /api/guest
                                                    │ (requirePracticeActor mints it)
            Google sign-in (AccountControl) ──► jwt callback
                                                    ├─ provisionUserOnSignIn (upsert User)
                                                    └─ foldGuestIntoUser
                                                         ├─ mergeGuestDataIntoUser   (dictation)
                                                         ├─ mergeGrammarGuestData    (+ planGrammarGuestMerge)
                                                         ├─ mergeIeltsGuestData
                                                         └─ mergeVocabGuestData      (+ planVocabGuestMerge)
```

- Public browsing is the design today (`auth.config.ts` `authorized` returns
  `true` for every non-admin path). 57 files under `src/` mention "guest".
- `requirePracticeActor()` is called by 26 route handlers; `getPracticeActorId()`
  by 13 pages and page-data services; `getOptionalUser()` by 14 files.
- Signed-out UI branches: `AccountControl` sign-in form (chip and rail),
  `FavoriteButton` sign-in link, `canFavorite` prop chain through 6 dictation
  browse components, `dictation.descriptionGuest`, IELTS `signInToGrade` /
  `signInForAi`, `common.errors.guestSession`, `AccountState.enabled`.

## 3. Target architecture

### 3.1 Request flow

```
request
  │
  ▼
proxy.ts  matcher: every path except api/, _next/static, _next/image, files with an extension
  │  authorized({ auth, request }):
  │    /auth/login                  -> true
  │    /admin/*                -> auth.user.role === 'admin'
  │    anything else           -> Boolean(auth?.user)
  │  false -> Auth.js redirects to pages.signIn = /auth/login?callbackUrl=<absolute url>
  ▼
page (Server Component)
  │  requirePageUser()  (cache()d; redirect('/auth/login') if no session: defense in depth)
  ▼
route handler /api/**   (not in the proxy matcher, so it is its own gate)
  │  requireUser()  -> 401 UnauthenticatedError
  │                 -> 400 InvalidOwnerKeyError  (assertOwnerKey, ObjectId only)
  │                 -> 409 OutboxOwnerMismatchError (x-outbox-owner hash differs)
  │  requireAdmin() -> 403 for /api/admin/**
  ▼
service, always scoped to user.id
```

### 3.2 Login flow

```
/auth/login?callbackUrl=X&error=E
  │
  ├─ session exists ───────────────► redirect(safeCallbackUrl(X))
  ├─ !hasGoogleAuth() ─────────────► card with "sign-in is not configured" notice, no button
  └─ render LoginCard
        │  error E present -> InlineNotice (AccessDenied | Configuration | default)
        │  <form action={signInAction}> hidden input callbackUrl = safeCallbackUrl(X)
        ▼
     signInAction(formData) ──► signIn('google', { redirectTo: safeCallbackUrl(value) })
        ▼
     Google ──► /api/auth/callback/google ──► jwt callback
                                               ├─ provisionUserOnSignIn (unchanged)
                                               └─ token.role = resolveRole(email)
        ▼
     redirectTo (same origin, checked again by Auth.js redirect callback)
```

### 3.3 Session lost mid-practice (R1)

```
outbox send ──► 401
   │
   ├─ item stays in the lane (like a network failure), lane pauses
   ├─ onUnauthorized() once per tab: flushWithKeepalive is NOT called,
   │    queue is marked released, then
   │    location.assign('/auth/login?callbackUrl=' + encodeURIComponent(path + search))
   ▼
sign in again (same Google account -> same user id -> same owner hash)
   ▼
page loads, getClientOutbox(ownerKey) adopts the released queue ──► replay
   │
   └─ a different account signs in: different owner key, old queue stays in
      storage for its owner (existing behaviour), never sent under the new user
```

## 4. Login page design (D3)

Route: `src/app/auth/login/page.tsx` (Server Component, `dynamic = 'force-dynamic'`,
`runtime = 'nodejs'`) plus `src/components/auth/LoginCard.tsx` (client only
where it must be: the submit button pending state).

Layout (phone first, 16px gutter, no horizontal scroll):

```
┌──────────────────────────────────────────────┐
│                                   [EN|VI] [☾] │  corner toggles (existing LocaleToggle, ThemeToggle)
│                                              │
│          ┌──────────────────────────┐        │
│          │      (Buddy, ready.png)   │        │  HomeBuddyMascot mood="ready", buddy-bob animation
│          │                          │        │
│          │   English For Only Me    │        │  app name, font-medium, text-ink
│          │   one-line tagline       │        │  text-ink-soft
│          │                          │        │
│          │ [Dictation][Grammar]     │        │  4 pastel chips, decorative (not links):
│          │ [IELTS]   [Vocabulary]   │        │  pastel-sky / mint / peach / lilac, module icons
│          │                          │        │
│          │ [ G  Continue with Google ]│      │  the single CTA (bg-cta text-cta-fg), Google "G" mark
│          │                          │        │
│          │  (error / not configured  │        │  InlineNotice, only when present
│          │   notice)                 │        │
│          └──────────────────────────┘        │
│                 AppCredits                   │  existing footer credits
└──────────────────────────────────────────────┘
```

Rules it follows (`.agents/rules/frontend-ui.md`):

- Tokens only: `bg-canvas`, `bg-surface`, `text-ink`, `text-ink-soft`,
  `border-line`, `bg-cta`, the `pastel-*` colours. No one-off hex.
- Both themes (`light`, `lightup`) look right; check both.
- Exactly one `cta` on the page. Chips are static (no hover pop).
- Every string goes through the catalogue: new `auth` namespace keys in
  `src/i18n/messages/en/common.ts` and `vi/common.ts` (`common.auth.*`):
  `loginTitle`, `loginTagline`, `continueWithGoogle`, `notConfigured`,
  `errorAccessDenied`, `errorGeneric`, plus page metadata `loginMetaTitle`.
  Reuse existing module labels for the chips.
- The Google "G" mark is an inline SVG with `aria-hidden`; the button text
  carries the meaning.
- Button shows a pending state (`useFormStatus`) so a double click does not
  start two OAuth round trips.
- Metadata: localized title, `robots: { index: false }`.

## 5. Impact on the current source

### 5.1 Delete (whole files)

| File | Reason |
| ---- | ------ |
| `src/lib/auth/guestUser.ts` | Guest cookie identity |
| `src/lib/auth/guestMerge.ts`, `guestMerge.test.ts` | Merge on sign-in |
| `src/app/api/guest/route.ts` | Guest minting endpoint |
| `src/modules/dictation/services/mergeGuestData.ts`, `.test.ts` | Dictation merge |
| `src/modules/grammar/services/mergeGrammarGuestData.ts` | Grammar merge |
| `src/modules/grammar/progress/planGrammarGuestMerge.ts`, `.test.ts` | Grammar merge planner |
| `src/modules/ielts/services/mergeIeltsGuestData.ts` | IELTS merge |
| `src/modules/vocabulary/services/mergeVocabGuestData.ts` | Vocab merge |
| `src/modules/vocabulary/services/planVocabGuestMerge.ts`, `.test.ts` | Vocab merge planner |
| `src/app/sitemap.ts` | R5 |

Before deleting each planner, `grep` for other importers (only the merge
services import them today).

### 5.2 Change

Auth core:

- `src/lib/auth/auth.config.ts`: `pages`, new `authorized` rules (3.1),
  comments per R6.
- `src/lib/auth/auth.ts`: drop `foldGuestIntoUser`; jwt callback keeps
  provisioning + role.
- `src/lib/auth/actions.ts`: `signInAction(formData)` reads and sanitises
  `callbackUrl`; `signOutAction` redirects to `/auth/login`.
- New `src/lib/auth/callbackUrl.ts` (+ test): `safeCallbackUrl` (R4).
- `src/lib/auth/ownerKey.ts`: pattern becomes `/^[a-f0-9]{24}$/`.
- `src/lib/auth/clientOwnerKey.ts`: remove `ANONYMOUS_OUTBOX_OWNER`
  handling; `outboxOwnerMatchesActor(header, userId)`.
- `src/modules/dictation/services/getCurrentUser.ts`: R2. Consider moving it
  to `src/lib/auth/currentUser.ts` since it is no longer dictation-specific;
  do it only if the import churn stays mechanical (it is imported widely).
- `src/proxy.ts`: matcher
  `['/((?!api|_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)']` (a literal
  constant, as the docs require) and updated comment.

Pages and layouts:

- `src/app/layout.tsx`: `readAccount()` drops `enabled`; returns
  `{ account: null }` only when there is no session (the login page).
- `src/app/page.tsx`: drop the anonymous branch; `requirePageUser()`.
- `src/app/(app)/layout.tsx`: owner key from `requirePageUser()`; no
  `isGuest`.
- The 13 pages / page-data services on `getPracticeActorId()` switch to
  `requirePageUser()` and lose their "no actor yet" branches (empty-state
  defaults for first-time visitors become plain "no progress yet" data, which
  the services already return for a user with no rows).
- `src/app/(app)/dictation/favorites/page.tsx`,
  `src/app/admin/layout.tsx`, `src/app/admin/dictation/import/page.tsx`,
  `src/app/admin/dictation/videos/[videoId]/edit/page.tsx`: replace the
  `/api/auth/signin` redirects with `requirePageUser()` (admin layout keeps
  its non-admin redirect).

Route handlers (26 on `requirePracticeActor`): switch to `requireUser()`.
Drop `actor.isGuest` uses in `api/grammar/sessions` (log field) and the IELTS
`grade` / `check` routes. `authErrorResponse` already maps 401.

Client:

- `src/components/common/AccountProvider.tsx`: `AccountState` is
  `{ account: AccountRecord | null }`; no `enabled`.
- `src/components/common/AccountControl.tsx`: delete both sign-in branches;
  `null` account renders nothing.
- `src/components/common/OutboxOwnerProvider.tsx`: `ownerKey: string`
  required, no `isGuest`.
- `src/lib/sync/clientOutbox.ts`: delete `ensureGuestIdentity`,
  `GUEST_IDENTITY_PATH`, anonymous adoption; add the 401 hold + redirect (R1).
  `src/lib/sync/outbox.ts`: new `unauthorized` outcome that keeps the item
  and pauses the lane, with an `onUnauthorized` callback.
- `src/components/dictation/DictationPracticeShell.tsx`,
  `src/components/ielts/runner/AttemptLoader.tsx`: drop the
  `ensureGuestIdentity()` calls.
- `canFavorite` prop chain removed: `FavoriteButton`, `VideoListPage`,
  `BrowseVideoList`, `SectionAccordion`, `TopicJourney` callers,
  `DictationSide` (`showFavorites` always on), the three dictation pages.
- `src/modules/dictation/preferences/dictationPreferences.ts`: drop the
  anonymous-owner draft fallback.
- `src/modules/ielts/writing/gradeWritingService.ts`: drop the `isGuest`
  parameter and both 401 branches.

i18n (en and vi together): remove `common.errors.guestSession`,
`dictation.descriptionGuest`, `dictation.signInToFavorite`,
`ielts.signInToGrade`, `ielts.signInForAi`; keep `common.auth.signIn` only if
something still reads it (the login button uses `continueWithGoogle`); add
the keys in section 4.

Comments that describe guests (search `guest` after the change; expect zero
hits in `src/` except the cleanup script): `progressRepository.ts`,
`grammarPageData.ts`, `vocabDashboardService.ts`, `recallTaskPayload.ts`,
`grammar/progress/types.ts`, `connectDatabase.test.ts`, `nextStop.test.ts`,
`ielts/fixtures/sampleTest.ts`.

### 5.3 Add

- `src/app/auth/login/page.tsx`, `src/components/auth/LoginCard.tsx` (+ tests).
- `src/app/robots.ts` (R5).
- `src/lib/auth/callbackUrl.ts` (+ test).
- `scripts/dropGuestData.ts` + `package.json` script `auth:drop-guest-data`
  (section 6, phase 5).
- `src/e2e/globalSetup.ts` (or `playwright/globalSetup.ts`) + config wiring
  (phase 6).

### 5.4 Docs to update (via `/documentlization` after the code lands)

`docs/07-auth-infra-testing.md` (1.1, 1.2, delete 1.5, 1.6, 1.7, 2, 5, 6, 7,
8), `docs/02-architecture.md`, `docs/01-overview.md`, `docs/03-data-model.md`,
`docs/04-api-reference.md` (remove `POST /api/guest`, 401 on every per-user
route), `docs/05-modules.md`, `docs/06-frontend.md` (login page, account
control), `docs/08-grammar.md`, `docs/09-ielts.md`, `docs/README.md`.
`.agents/rules/` has no guest rules; no change needed there.

## 6. Implementation phases

Phase order matters: phase 2 depends on the new `requireUser` from phase 1.

1. **Auth core + proxy + login page.** Section 5.2 "Auth core", section 4,
   `robots.ts`, sitemap deletion, i18n additions. App still compiles because
   `requirePracticeActor` stays as a thin deprecated wrapper over
   `requireUser` until phase 2.
2. **Guest removal.** Route handlers, pages, page-data services, deletions in
   5.1, wrapper deleted, i18n removals, comments.
3. **Client cleanup.** AccountControl / AccountProvider / OutboxOwnerProvider,
   `canFavorite` chain, `ensureGuestIdentity` callers, preferences.
4. **Outbox 401 hold (R1).** Core + browser wiring + tests.
5. **Cleanup script.** `scripts/dropGuestData.ts`, modelled on
   `scripts/dropLegacyGrammar.ts`: dry run by default lists, per collection,
   the count of `{ <ownerField>: /^guest_/ }`; `--apply --i-am-sure` runs
   `deleteMany`. Owner fields (verified in `src/models`):
   `userId` on `dictationsessions`, `dictationattempts`,
   `dictationreviewitems`, `dictationdebriefs`, `grammarlessonprogresses`,
   `grammarunitprogresses`, `grammarcardmisses`, `grammarsessions`,
   `uservocabitems`, `vocaboccurrences`, `vocabrecallattempts`; `ownerId` on
   `ieltsattempts` (and `ieltsgradingledgers`, expected 0 since guests could
   not grade). Take collection names from each model (`Model.collection.name`),
   not hand-typed strings. Keep the planner pure (`planGuestCleanup`) and
   unit-test it. Run it only after the deploy (TODO below).
6. **E2E sign-in (D4).** Global setup upserts `e2e-learner@example.test`
   through `provisionUserOnSignIn`, encodes a JWT with `encode` from
   `next-auth/jwt` (`secret: AUTH_SECRET`, `salt` = the session cookie name:
   `authjs.session-token` on http, `__Secure-authjs.session-token` on https,
   token `{ sub, email, name, uid, role }`), writes `storageState`. Refuses to
   run unless the base URL host is `localhost` / `127.0.0.1` (never against a
   deployed site). Never logs the secret or the token. A separate project
   without `storageState` covers the signed-out redirects.
7. **Docs** via `/documentlization`, then `bun run lint`, `bun run test`,
   `bun run build`, `bunx playwright test`.

## 7. Acceptance criteria

- Signed out, any of `/`, `/dictation`, `/grammar`, `/ielts`, `/vocabulary`,
  a deep lesson URL, `/admin` -> 307 to `/auth/login?callbackUrl=...`; after Google
  sign-in the learner lands on that exact page.
- Signed out, `/api/dictation/sessions` (and every per-user API) -> 401 JSON
  with the localized `common.errors.unauthorized`. `/api/guest` -> 404.
- Signed in, `/auth/login` -> redirect to `callbackUrl` (sanitised) or `/`.
- `/auth/login?callbackUrl=https://evil.example` and `//evil.example` -> after
  sign-in the learner lands on `/`.
- No Google env -> `/auth/login` shows the not-configured notice, no button; every
  other page still redirects to `/auth/login`.
- Sign out from the user menu -> `/auth/login`.
- `grep -ri guest src` returns only the cleanup script and its test.
- No `/api/auth/signin` string left in `src/`.
- Static assets (`/buddy/*.png`, `/favicon.ico`, `/site.webmanifest`, fonts)
  load on `/auth/login` while signed out.
- `/auth/login` looks right in both themes, both languages, at 375px and desktop.

## 8. Test plan

Framework: Vitest (unit, `*.test.ts(x)` beside the code) and Playwright
(`*.e2e.ts`). Existing tests that encode guest behaviour are rewritten, not
just deleted, wherever the behaviour they guarded still exists for users.

```
CODE PATHS                                              USER FLOWS
[+] auth.config.ts authorized()                         [+] Reach any page
  ├── [GAP] /auth/login, signed out -> true                    ├── [GAP][→E2E] signed out -> /auth/login -> Google -> same page
  ├── [GAP] /dictation, signed out -> false               ├── [GAP][→E2E] signed out deep link keeps callbackUrl
  ├── [GAP] /dictation, signed in -> true                 └── [GAP][→E2E] signed in visiting /auth/login -> home
  ├── [GAP] /admin, user -> false; admin -> true        [+] Login page states
[+] proxy matcher                                         ├── [GAP] OAuth not configured -> notice, no button
  ├── [GAP] excludes /api, /_next/*, /buddy/x.png         ├── [GAP] ?error=AccessDenied -> localized notice
  └── [GAP] includes /, /auth/login, /grammar/lessons/x        ├── [GAP] unknown error code -> generic notice
[+] safeCallbackUrl()                                     └── [GAP] double click -> one submit (pending state)
  ├── [GAP] '/grammar' -> '/grammar'                    [+] Session lost mid-practice
  ├── [GAP] absolute same-origin -> path+search           ├── [GAP] 401 keeps the queued write
  ├── [GAP] '//evil', '/\\evil', 'https://evil' -> '/'    ├── [GAP] redirect to /auth/login with current path
  ├── [GAP] '/auth/login', '/api/x', '', null -> '/'           └── [GAP] same account signs in -> queue replays
[+] signInAction / signOutAction                        [+] Sign out
  ├── [GAP] passes sanitised redirectTo                   └── [GAP] menu sign-out -> /auth/login
  └── [GAP] signOut redirectTo '/auth/login'                 [+] Account control
[+] requireUser() (absorbs requirePracticeActor)          └── [GAP] no sign-in button anywhere when signed in
  ├── [GAP] no session -> 401
  ├── [GAP] bad owner key -> 400
  ├── [GAP] header hash mismatch -> 409
  ├── [GAP] header absent -> ok
  └── [GAP] header 'anonymous' -> 409 (was ok for guests)  CRITICAL regression guard
[+] requirePageUser() -> redirect('/auth/login') when null
[+] outbox 401 -> unauthorized outcome, lane paused, item kept
[+] dropGuestData planner: only /^guest_/ owners, dry run writes nothing
[+] Route handlers formerly on requirePracticeActor
  └── [GAP] anonymous POST now 401 (was 200 as guest)    CRITICAL regression guard, one per module

COVERAGE today: 0/31 new paths (all new or changed)  |  target: 31/31
```

Tests to write (file, assertion):

| Test file | Asserts |
| --------- | ------- |
| `src/lib/auth/auth.config.test.ts` | `authorized` table above, including admin rules unchanged |
| `src/proxy.test.ts` | matcher includes/excludes the paths above (use the `next/experimental/testing/server` matcher helper if this Next version ships it; check `node_modules/next/dist/docs` first; otherwise test the regex literal) |
| `src/lib/auth/callbackUrl.test.ts` | every R4 case |
| `src/lib/auth/actions.test.ts` | `signIn` called with `redirectTo` sanitised; `signOut` with `/auth/login` |
| `src/modules/dictation/services/getCurrentUser.test.ts` (rewrite) | `requireUser` 401 / 400 / 409 / ok; `requirePageUser` redirects |
| `src/lib/auth/ownerKey.test.ts`, `clientOwnerKey.test.ts` (rewrite) | guest ids now invalid; `anonymous` header rejected |
| `src/app/auth/login/page.test.tsx` | signed in -> redirect; not configured; error codes; one CTA |
| `src/components/auth/LoginCard.test.tsx` | renders name, tagline, 4 chips, button; pending state disables it |
| `src/lib/sync/outbox.test.ts`, `clientOutbox.test.ts` (extend/rewrite) | 401 keeps item, pauses lane, calls `onUnauthorized` once; anonymous adoption tests deleted |
| `src/components/common/AccountControl` tests (via `AppSidebar.test.tsx`, `AppTopbar.test.tsx`) | no sign-in control rendered; signed-in menu unchanged |
| `src/app/api/dictation/sessions/[sessionId]/attempts/route.test.ts` + one route test per module (grammar sessions, ielts attempts, vocab items) | anonymous -> 401 |
| `src/modules/ielts/writing` grading tests | guest branch removed, signed-in path unchanged |
| `scripts/dropGuestData.test.ts` (or planner beside it) | planner filters, dry-run default |
| `src/app/auth.e2e.ts` (signed-out project) | redirect + callbackUrl preserved; `/api/guest` 404 |
| `src/modules/grammar/grammarPath.e2e.ts` (rewrite) | "a new learner finishes lesson 1 and unlocks lesson 2" under the minted session |
| `src/i18n/messages.test.ts` (existing) | key parity after adds/removes |

QA artifact: `~/.gstack/projects/nakmiers-english_for_only_me/` test plan file
written by this review (affected routes and flows for `/qa`).

## 9. Failure modes

| New path | Realistic failure | Test | Handling | User sees |
| -------- | ----------------- | ---- | -------- | --------- |
| Proxy matcher | A route path containing a dot is skipped by the extension exclusion and served unauthenticated | matcher test | Page still calls `requirePageUser()` (defense in depth) | Redirect to `/auth/login` |
| Proxy matcher | An asset folder without an extension (none today) gets blocked | matcher test | Add an explicit exclusion | Broken image on `/auth/login` (caught by acceptance check) |
| callbackUrl | Open redirect via `//evil` | unit | `safeCallbackUrl` + Auth.js redirect callback | Lands on `/` |
| OAuth error | Google denies or callback fails | page test | `pages.error = '/auth/login'`, localized notice | Clear message, can retry |
| OAuth not configured | Deployed without env | page test | Fail closed (D2) | "Sign-in is not configured" |
| Session expiry mid-practice | Write returns 401 | outbox test | R1 hold + redirect | Login page, then back to the same page with the write replayed |
| Different account after expiry | Queue from account A | outbox test (existing owner-mismatch) | Owner key differs, queue never sent as B | Nothing lost for A, nothing leaked to B |
| Cleanup script | Run against the wrong DB or before deploy | planner test | Dry run default, double flag, prints DB name and counts first | n/a (operator) |
| E2E setup | Pointed at a deployed URL | none (guard) | Host check refuses | Test run fails fast |
| Stale tab from before deploy | Old JS still calls `POST /api/guest` | none | 404 -> old outbox fails the write; reload fixes | One failed save in a stale tab |

No critical gap: every new path has a test or explicit handling, and none
fails silently.

## 10. NOT in scope

- **Account allowlist / invite-only.** Any Google account can sign in and
  gets a user row on first sign-in, as today. Add an `ALLOWED_EMAILS` gate
  later if the site should stay private.
- **Other providers, email/password, sign-up, password reset.** Owner said
  Google only.
- **Account deletion / data export page.** No request for it.
- **`src/app/zz-dev-ielts-editor/`** (dev-only harness marked "TEMPORARY").
  Unrelated to login; remove in its own cleanup.
- **Session length tuning.** Auth.js JWT defaults (30 days, rolling) stay.
- **Landing / marketing page.** `/auth/login` is the only public page.

## 11. What already exists (reused, not rebuilt)

| Need | Existing piece | Plan |
| ---- | -------------- | ---- |
| Google OAuth, JWT session | `auth.config.ts`, `auth.ts`, `[...nextauth]/route.ts` | Reuse; add `pages` |
| User row on first sign-in | `provisionUserOnSignIn` | Reuse unchanged |
| Role from allowlist | `roles.ts`, `ADMIN_EMAILS` | Unchanged |
| Route gate | `src/proxy.ts` + `authorized` callback | Widen matcher, new rules |
| 401/403/409 localized errors | `authErrorResponse` | Reuse |
| Owner-key data isolation | `ownerKey.ts`, `clientOwnerKey.ts` | Keep, drop guest branch |
| Mascot, toggles, credits, notice | `HomeBuddyMascot`, `LocaleToggle`, `ThemeToggle`, `AppCredits`, `InlineNotice` | Reuse on `/auth/login` |
| Destructive script pattern | `scripts/dropLegacyGrammar.ts` | Copy its dry-run/apply shape |
| Outbox replay across reloads | outbox adoption of released queues | Reuse for R1 |

## 12. Parallelization

| Step | Modules touched | Depends on |
| ---- | --------------- | ---------- |
| 1 Auth core + login | `src/lib/auth/`, `src/proxy.ts`, `src/app/auth/login/`, `src/components/auth/`, `src/i18n/` | - |
| 2 Guest removal (server) | `src/app/api/`, `src/app/(app)/`, `src/modules/` | 1 |
| 3 Client cleanup | `src/components/`, `src/i18n/` | 1 |
| 4 Outbox 401 hold | `src/lib/sync/` | 1 |
| 5 Cleanup script | `scripts/`, `package.json` | - |
| 6 E2E sign-in | `playwright.config.ts`, `src/**/*.e2e.ts` | 1 |

Lanes: A = 1 -> 2 -> 3 (sequential: shared `src/i18n/` and the
`requireUser` signature). B = 5 (independent). C = 4 after 1. D = 6 after 1.
Run A in this checkout; B can start at once in its own worktree; C and D
after step 1 is committed. Conflict flag: steps 2 and 3 both edit dictation
pages that pass `canFavorite`; keep them in one lane.

## 13. Implementation tasks

- [ ] **T1 (P1, human: ~1d / CC: ~40min)** - auth - Widen proxy, add `pages`, `authorized` rules, `safeCallbackUrl`, sign-in/out actions, `requireUser` / `requirePageUser`
  - Surfaced by: Architecture, 3.1 and R2/R4/R8
  - Files: `src/proxy.ts`, `src/lib/auth/*`, `src/modules/dictation/services/getCurrentUser.ts`
  - Verify: `bun run test src/lib/auth src/proxy.test.ts src/modules/dictation/services`
- [ ] **T2 (P1, human: ~1d / CC: ~40min)** - ui - Build `/auth/login` (section 4) with i18n and robots
  - Surfaced by: D3, section 4
  - Files: `src/app/auth/login/`, `src/components/auth/`, `src/i18n/messages/*/common.ts`, `src/app/robots.ts`
  - Verify: page tests; screenshot both themes, both languages, 375px and desktop
- [ ] **T3 (P1, human: ~1.5d / CC: ~1h)** - server - Remove guest mode from route handlers, pages, services; delete files in 5.1
  - Surfaced by: D1, section 5
  - Files: `src/app/api/**`, `src/app/(app)/**`, `src/modules/**`, `src/lib/auth/guest*`
  - Verify: `grep -ri guest src` clean; anonymous route tests return 401
- [ ] **T4 (P1, human: ~0.5d / CC: ~30min)** - client - Remove signed-out UI and `canFavorite` / `isGuest` chains
  - Surfaced by: section 2 signed-out branches
  - Files: `src/components/common/*`, `src/components/dictation/**`, `src/components/ielts/runner/AttemptLoader.tsx`
  - Verify: component tests; no `/api/auth/signin` in `src/`
- [ ] **T5 (P1, human: ~0.5d / CC: ~30min)** - sync - Outbox 401 hold and redirect
  - Surfaced by: R1, failure modes
  - Files: `src/lib/sync/outbox.ts`, `src/lib/sync/clientOutbox.ts`
  - Verify: `bun run test src/lib/sync`
- [ ] **T6 (P2, human: ~0.5d / CC: ~20min)** - scripts - `auth:drop-guest-data` with pure planner
  - Surfaced by: D1
  - Files: `scripts/dropGuestData.ts`, `package.json`
  - Verify: planner test; dry run against local DB
- [ ] **T7 (P1, human: ~0.5d / CC: ~30min)** - e2e - Minted-session global setup, signed-out project, rewrite grammar e2e
  - Surfaced by: D4, test review
  - Files: `playwright.config.ts`, `src/**/*.e2e.ts`, global setup file
  - Verify: `bunx playwright test`
- [ ] **T8 (P2, human: ~0.5d / CC: ~20min)** - docs - Run `/documentlization` for the docs in 5.4
  - Surfaced by: section 5.4
  - Verify: no "guest" left in `docs/` except history notes

## 14. TODOs (deferred on purpose)

- **Run the guest cleanup in production.** After the deploy is checked, run
  `bun run auth:drop-guest-data` (dry run), read the counts, then
  `--apply --i-am-sure`. One-way door; until then the rows are inert.
- ~~**Delete `src/app/zz-dev-ielts-editor/`** once the IELTS editor redesign
  review is finished (its own comment says so).~~ Done 2026-11-28.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | - | - |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | - | - |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR (PLAN) | 12 issues (4 owner decisions D1-D4, 8 reviewer decisions R1-R8), 0 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | - | - |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | - | - |

- **VERDICT:** ENG CLEARED - ready to implement. Design review of `/auth/login` recommended before T2.

NO UNRESOLVED DECISIONS
