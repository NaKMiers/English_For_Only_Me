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
  + `src/requests/vocabularyApi.ts` -> 04; the rest of `src/modules/vocabulary/**`
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
