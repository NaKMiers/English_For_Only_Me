# TODOs

## Deferred After Vocabulary Phase 1

### Dictation Word Lookup Popover

- **What:** Add a dictation correction/debrief word lookup popover with `Should learn` and `Already know`.
- **Why:** It turns an unknown word during dictation into a future flashcard without making the user leave the learning moment.
- **Pros:** Keeps the strongest delight moment in the roadmap. Reuses the vocab lookup and item APIs after Phase 1 proves them.
- **Cons:** Touches `DictationFeedback`, `DictationDebriefPanel`, token parsing, popover UI, and ownership paths, so it should not be mixed into the first core build.
- **Context:** Phase 1 builds the vocab backbone, search, Explore, recall, stats, admin enrich, and `/vocabulary`. This starts after those APIs are stable.
- **Depends on / blocked by:** Phase 1 vocab lookup API, item status API, and dictionary popover component.

### Home Today Vocabulary Reminder

- **What:** Add a Home Today vocab due-count row that links to `/vocabulary`.
- **Why:** Users return more reliably when the home page tells them they have words due today.
- **Pros:** Motivational and simple once `getVocabStatsForActor` exists. Reuses the existing `HomeTodayPanel` layout.
- **Cons:** Touches home server data loading and `HomeTodayPanel`, so doing it now expands the first vocabulary slice.
- **Context:** Existing `HomeTodayPanel` renders Today rows from dictation stats. After Phase 1, add vocab stats as an optional prop and show due count without minting a guest id on first visit.
- **Depends on / blocked by:** Phase 1 vocab stats service and read-only actor lookup.

## Deferred After Grammar Phase 1

### Review The 184 Generated Lessons

- **What:** Read each lesson and flip `reviewStatus` from `unverified` to `reviewed` in the admin panel, correcting what is wrong. Then `bun run grammar:export` to carry those decisions back into the committed JSON.
- **Why:** All 184 points now have a body, but zero are human-reviewed, so every lesson renders behind the red `unverified` banner. That banner is honest: generated grammar content has been wrong in ways only reading catches.
- **Pros:** The generation and validation work is done. This is pure reading, needs no API credit, and can be done a few lessons at a time.
- **Cons:** The largest remaining task by wall-clock. At 3-5 minutes per lesson it is 9-15 hours. Prioritise by browse order - the list already sorts highest-`l1Risk` and hardest first, so the top of the list is where a wrong lesson costs most.
- **Context:** Generated 2026-08-20 on `gpt-5.4-mini`: 156 lessons in 32 chunks, zero API failures, 259.6k input and 216.6k output tokens, 17 validation issues cleared by two automatic repair passes. The validator catches structural defects (ungradeable targets, choice drills where every option scores correct, a sentence marked both correct and wrong) but cannot judge whether an explanation is *true*. That is what this task is for. Known weak spot: `commonMistakes` entries that mark correct English as wrong - check the "wrong" sentence against a context where it would be fine before trusting an entry.
- **Depends on / blocked by:** Nothing.

### Human Review Of The l1Risk Column

- **What:** Read the `l1Risk` value on all 184 taxonomy rows and correct the ones that do not match your own experience.
- **Why:** `l1Risk` drives browse order, drill minimums, whether a Vietnamese explanation is generated, and how the diagnostic spends its questions. It is the single most load-bearing column in the module.
- **Pros:** Cheap - it is one pass over one JSON file, no code and no API calls.
- **Cons:** Every current value is assistant judgment about what is hard for a Vietnamese speaker, not yours. Where it is wrong, it is wrong in a way that compounds: a point mislabelled `low` gets fewer drills, no Vietnamese explanation, and sorts to the bottom of the list.
- **Depends on / blocked by:** Nothing.

### Shared Content List Service

- **What:** Extract a shared filter/sort/paginate list service into `src/modules/learning/`, consumed by both `vocabWordListService` and the grammar point list.
- **Why:** Both do the same job with different field names: filter a global content collection, left-join per-user item state, sort, paginate, and leave untouched rows untouched. That left-join is fiddly and easy to get subtly wrong twice.
- **Pros:** One implementation of the pagination and left-join logic. A third learning module would get the list surface almost free.
- **Cons:** The two filter on genuinely different fields (`term`, `partOfSpeech` versus `cefrLevel`, `family`, `complexity`, `l1Risk`), so sharing needs a field-mapping abstraction that could easily cost more than the duplication it removes. This is the classic premature-abstraction trap.
- **Context:** Spotted during the Step 0 reuse audit of the 2026-08-20 eng review on the grammar module design. Deliberately NOT bundled into the phase 2 shared-scheduler gate: that gate already blocks phase 3, and stacking a second extraction onto it is how a forcing function becomes a stall. The real information only arrives once `grammarPointListService` exists and the two files can be diffed side by side.
- **Depends on / blocked by:** Grammar phase 1 shipping. Nothing to compare against before that.

### Environment: Stale gstack Copy Breaks Learnings Capture

- **What:** Replace the stale directory at `~/.codex/skills/gstack` with a symlink to `~/.gstack/repos/gstack`, then re-run the skill sync.
- **Why:** `~/.codex/skills/gstack` is a real directory dated 2026-07-06 with no `lib/` subdirectory, while the canonical repo at `~/.gstack/repos/gstack` has it. Every binary importing `lib/jsonl-store.ts` fails, so `gstack-learnings-log` is dead and cross-session learning capture has silently no-opped. Both skill preambles on 2026-08-20 reported `LEARNINGS: 0` despite five prior sessions.
- **Pros:** Restores cross-session learning, which is the mechanism that makes later reviews smarter. Matches the documented convention in the global notes, which say gstack is symlinked from `~/.gstack/repos/gstack/`.
- **Cons:** Replacing a directory that other tooling resolves to; worth confirming nothing else writes into the stale copy first.
- **Context:** Found while logging learnings during the 2026-08-20 grammar eng review. Workaround in the meantime is to call binaries via `~/.gstack/repos/gstack/bin` directly, which is how this session's three learnings were saved. `gstack-review-log`, `gstack-decision-log`, and `gstack-review-read` work from either copy; only the `lib/`-importing ones break.
- **Depends on / blocked by:** Nothing. Environment fix, unrelated to any feature work.
