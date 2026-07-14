# documentlization - memory

Self-improving notes for keeping `docs/` in sync with the code. Append lessons
here; this is the single canonical copy (no Claude-side duplicate).

## Doc set (do not rename or renumber)
- `docs/README.md` - index.
- `docs/01-overview.md` - product, stack, module roadmap, vocabulary.
- `docs/02-architecture.md` - dirs, layering, boundaries, data flow, run/test.
- `docs/03-data-model.md` - Mongoose models, ER diagram, enums.
- `docs/04-api-reference.md` - route handlers + zod schemas + `src/requests`.
- `docs/05-modules.md` - `src/modules/dictation` domain logic.
- `docs/06-frontend.md` - pages, routing, components, design system.
- `docs/07-auth-infra-testing.md` - auth, integrations, env, tests.
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
