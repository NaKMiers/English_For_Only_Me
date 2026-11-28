# documentlization - memory

Self-improving notes for keeping `docs/` in sync with the code. Append lessons
here; this is the single canonical copy (no Claude-side duplicate).

## Doc set (do not rename or renumber)

- `docs/README.md` - index.
- `docs/01-overview.md` - product, stack, module roadmap, vocabulary.
- `docs/02-architecture.md` - dirs, layering, boundaries, data flow, run/test.
- `docs/03-data-model.md` - Mongoose models, ER diagram, enums.
- `docs/04-api-reference.md` - route handlers + zod schemas + `src/requests`.
- `docs/05-modules.md` - dictation + vocabulary + shared learning domain logic.
- `docs/06-frontend.md` - pages, routing, components, design system.
- `docs/07-auth-infra-testing.md` - auth, integrations, env, tests.
- `docs/08-grammar.md` - `src/modules/grammar` domain logic (added 2026-11-27).
- `docs/09-ielts.md` - `src/modules/ielts` domain logic (added 2026-11-27).
- Baseline tracked in `docs/.doc-state.json` (`lastDocumentedCommit`).

## Style invariants

- No em dash anywhere. Use a plain hyphen. ASCII only.
- Cite repo-relative file paths. Code wins over stale doc text.
- Mermaid labels use `<br/>`, not `\n` (portable to GitHub/VS Code renderers).

## Lessons

- Fan out one subagent per affected doc for multi-doc updates; each writes its
  own file so there are no write conflicts. Keep `README.md` + `01-overview.md`
  for the driver to assemble last so cross-references stay correct.
- Tell each doc-writer subagent to VERIFY the existing text against source
  (code wins) rather than only appending - several docs already carried partial,
  sometimes stale, content (e.g. `01-overview`/`03`/`06` had vocabulary
  half-documented; `05` referenced removed functions). Instruct them to fix
  stale absolute repo-root header lines to `/home/KHOANA/ME/IT_IT/Webs/English_For_Only_Me`.
- Vocabulary subsystem source -> doc mapping (a second feature area parallel to
  dictation): `src/models/vocabulary/**` -> 03; `src/app/api/vocab/**` +
  `src/app/api/admin/vocab/**` + `src/modules/vocabulary/services/{vocabularyRouteDecisions,*Records,vocabApiErrors}`
  - `src/requests/vocabularyApi.ts` -> 04; the rest of `src/modules/vocabulary/**`
    (providers/enrichment/explore/recall/stats/seed/normalize/vietnameseMeaning)
    -> 05; `src/app/(app)/vocabulary/**` + `src/app/admin/vocab` +
    `src/components/vocabulary/**` -> 06; `src/modules/vocabulary/providers/**`
    (external APIs) + `recall/recallTaskToken.ts` + new env keys + e2e -> 07.
- Recall schedule facts (from `src/modules/vocabulary/constants.ts`): stages 1-7,
  interval days {1:1,2:1,3:4,4:7,5:14,6:17} sum to 44 days (not "day 45"); token
  TTL 30 min. Segment model `text`/`normalizedText` maxlength is 3000.
- The two `overlappingTiming`/`largeGap` quality flags remain in the type + model
  enum but are no longer emitted by the current pause-based `buildSegments.ts`.
- Scoped runs: when the user asks to update one doc only (e.g. "update
  docs/06-frontend.md"), do NOT move `docs/.doc-state.json`; the other docs are
  still behind the baseline, and moving it would hide that. Say so in the report.
- Frontend source -> 06 mapping now also covers `src/i18n/**` (catalogue,
  provider, locale cookie, LocaleToggle), `src/components/grammar/**` and
  `src/app/(app)/grammar/**`, `src/components/ielts/**` and
  `src/app/(app)/ielts/**` + `src/app/admin/ielts/**`, `src/components/home/**`,
  and the chrome in `src/components/common/{PageShell,AppSidebar,AppTabBar,AppTopbar,AppCredits,PageHeader,RouteError}.tsx`.
- 2026-11-27: the manga sticker UI was replaced by the soft pastel dashboard
  (pink brand, night theme, Be Vietnam Pro, EN/VI i18n). `06-frontend.md` was
  rewritten for it. The same day a full sync brought 01-05 and 07 up to date
  and added 08-grammar and 09-ielts (baseline moved to 99d515a).
- Full syncs: 7 parallel doc-writer subagents (one file each) took 3 to 8
  minutes; the driver kept 01, README and the skill scope table. Afterwards run
  one cross-doc check: no em dash, ASCII except product copy, every
  `./NN-*.md` link resolves, every cited `src/...` path exists, prettier
  clean. Cross-doc drift to watch: a later doc can prove an earlier one stale
  (e.g. 04 found `updateDictationSessionApi` gone while 06 still cited it).
- Doc writers surface real code gaps; verify them and report to the user
  instead of fixing code inside a docs run (2026-11-27: IELTS models missing
  from `scripts/syncIndexes.ts`; vocabulary not in `foldGuestIntoUser`).
- Vitest at the repo root also collects `.claude/worktrees/**` tests; docs and
  checks should use `bun run test -- --exclude '.claude/**'` or run inside src.
- 2026-11-28: OpenAI was removed; every AI feature runs on Qwen (Alibaba
  Cloud Model Studio). Env keys are `DASHSCOPE_API_KEY`, `DASHSCOPE_HOST`,
  `QWEN_*_MODEL`; `src/lib/ai` files are `qwenClientCore`, `qwenDebriefClient`,
  `qwenTranslate`, `qwenSpeech`, `wavToPcm`, `strictJsonSchema`. AI wording
  touches 01, 02, 04, 05, 07, 09 and README; grep `docs/` for the old provider
  name after any AI change. "OpenAI-compatible" is still correct for Qwen's
  `compatible-mode` Responses API.
- `.env.example` is denied to Claude's Read/Edit tools (and to `git add`).
  Learn its content from the owner's terminal output instead of working
  around the permission rule.
- 2026-11-28: after the "calm pages, progress you can feel" UI rework (plan
  `docs/plans/ui-calm-progress-2026-11-28.md`) a sync touched 02, 04, 05, 06,
  07, 08; 01, 03, 09 and README had no relevant change. New mappings: shared
  journey primitives `src/components/journey/**` and `src/lib/journey/**`
  -> 06 (and 02 for the folder map); `src/lib/auth/actions.ts` (client-callable
  sign-in/out server actions) -> 07 and 02; page-only query parsers in
  `src/modules/*/services/*RouteDecisions.ts` used by a page, not a route, ->
  04 under a "(page, not a route)" heading. Four parallel writers took 1 to 3
  minutes. Gaps they surfaced, reported not fixed: `/api/dictation/stats` and
  its request helpers have no UI caller after `/dictation/stats` was removed;
  `src/components/common/SketchChart.tsx` is unused; the `page-hero` class is
  used but not defined in `globals.css`.
- Branch runs beside a parallel session that is rewriting docs in the main
  checkout (2026-11-28, UI follow-ups branch): edit only the sections the
  branch changed, keep the wording local, and do not move
  `docs/.doc-state.json`, so the later merge stays small and the owner's own
  sync still sees every commit since the old baseline.
- 2026-11-28: Google sign-in became required and guest mode was removed (plan
  `docs/plans/google-login-required-2026-11-28.md`). A sync touched every doc
  (01 to 09 and README). New mappings: `src/lib/auth/currentUser.ts` (moved
  from `src/modules/dictation/services/getCurrentUser.ts`; `requireUser`,
  `requirePageUser`), `src/lib/auth/callbackUrl.ts`, `src/app/auth/login/**`
  and `src/components/auth/**` -> 06, 07 and 02; `src/e2e/**` (Playwright
  minted-session global setup) and `playwright.config.ts` projects -> 07 and
  02; `scripts/dropGuestData.ts` + `scripts/lib/guestCleanup.ts` -> 07, 02, 03. After it, "guest" may appear in docs only as history (removed on
  2026-11-28, legacy `guest_` rows, the cleanup script); grep for it. Four
  parallel writers (07; 02+06; 03+05+08; 04) took 1 to 3 minutes; the driver
  did 01, 09 and README. Gap a writer found and the session fixed: dictation
  and vocabulary error mappers turned `InvalidOwnerKeyError` into 500.
- 2026-11-28: login page redesign (`LoginHero` + `LoginCard`, `.login-*` CSS)
  and admin user management (lock / unlock / delete). New mappings:
  `src/modules/admin/**` and `src/lib/auth/accountStatus.ts` -> 07 (section 2
  "Admin user management") + 02 + 03 (User `status`/`lockedAt`);
  `src/components/admin/**` and `src/app/admin/users/**` -> 06 (7.4) + 02;
  admin server actions with no route -> 04 section 8 "Server actions";
  `src/models/userOwnedModels.ts` (`USER_OWNED_MODELS`, the one list of
  per-user collections) -> 03 6.2 + 07 8. Two parallel writers (07+03;
  06+02+04) took about 3 minutes; the driver did 01 and README. Writers
  found real gaps that the session fixed before commit (admin list page and
  detail metadata lacked `requireAdmin`; a deleted account showed the
  locked notice; unused i18n keys). Baseline left at 4fdcc8c because other
  sessions' commits on main since then were not synced by this run.
- 2026-11-28: full sync from `4fdcc8c` to `a864dfe` after the UI review
  follow-ups (42 items, plan `docs/plans/ui-review-followups-2026-11-28.md`),
  its code review fixes and the merge with Google sign-in. Earlier runs had
  each left the baseline at `4fdcc8c`, so this run verified every doc against
  the code rather than only appending. Two writers (02+06; 03+04+05+07+08+09)
  took 4 to 6 minutes under the owner's RAM limit (no vitest, tsc, eslint or
  build inside a docs run, at most 2 subagents); the driver did 01 and README.
  New mappings: `src/constants/stateIcons.ts` (`DUE_ICON`, `DONE_ICON`) -> 02
  and 06; `src/modules/dictation/review/reviewDeepLink.ts` (`?segment=`) -> 05
  and 06; `VOCAB_RECALL_PARAM` (`?recall=1`) -> 05 and 06;
  `src/lib/ai/languageNames.ts` (AI output in the app locale) -> 07, 09, 04.
  When checking cited paths, expand `{a,b}` brace lists before testing
  existence; a naive split on commas reports false misses. Gaps reported, not
  fixed: a stale `statsPlacement` comment in `SessionEnd.tsx`; guest-era
  `userId: null` branches in several dictation and vocabulary services;
  `isAccountBlocked` only used by tests; the read-only video detail route
  answers `videoUpdateFailed` on 500.
