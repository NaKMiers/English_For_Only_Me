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

### Grammar v2: The Remaining Human Work

- **What:** The `l1Risk` judgment pass. Open `/admin/grammar/l1-risk` in a local
  checkout, read each of the 184 rows, and record how hard the point actually is
  for you. Then `bun run grammar:validate`, read `git diff` on taxonomy.json,
  commit, and `bun run grammar:seed`.
- **Why:** Every `l1Risk` value in the taxonomy is assistant guesswork about
  what is hard for a Vietnamese speaker. `l1RiskRank` is seeded from
  `effectiveL1Risk`, so that guesswork currently drives browse order, the admin
  review queue, the diagnostic's question weighting, the menace tier every
  creature is drawn at, and which cells of the dungeon map are marked dangerous.
  Nothing else in the module is waiting on code.
- **Cons:** 2-3 hours of concentration, and it is genuinely yours to do - a
  second pass of assistant judgment written into the field that exists to
  replace assistant judgment would be worse than leaving it empty.
- **Also outstanding:** `bun run grammar:drop-stale-indexes` against the
  database, once. Mongoose never drops a superseded index, so
  `{reviewStatus, l1Risk}` is still there taking writes after T1 replaced it
  with `{reviewStatus, l1RiskRank, complexity}`. Not run yet because the
  configured `MONGODB_URI` points at Production.
- **Effort:** L (human), and not reducible with CC.
- **Priority:** P1.
- **Depends on / blocked by:** Nothing. All the tooling shipped 2026-08-21.

### Review The 184 Generated Lessons

- **What:** Read each lesson and flip `reviewStatus` from `unverified` to `reviewed` in the admin panel, correcting what is wrong. Then `bun run grammar:export` to carry those decisions back into the committed JSON.
- **Why:** All 184 points now have a body, but zero are human-reviewed, so every lesson renders behind the red `unverified` banner. That banner is honest: generated grammar content has been wrong in ways only reading catches.
- **Pros:** The generation and validation work is done. This is pure reading, needs no API credit, and can be done a few lessons at a time.
- **Cons:** The largest remaining task by wall-clock. At 3-5 minutes per lesson it is 9-15 hours.
- **Priority: P1.** The 2026-08-21 CEO review identified this as the highest-value remaining work on the module, because grammar v2 makes `commonMistakes` the visual centerpiece delivered by a deliberately confident sensei. Beautiful presentation over unchecked content manufactures authority the content has not earned.
- **Prioritisation correction (2026-08-21):** the previous advice here said to prioritise by browse order because the list sorts highest-`l1Risk` first. That is true of `/grammar/points` but **was false of the admin review queue you would actually review from**: `admin/grammar/page.tsx:34` sorted the raw `l1Risk` string, which Mongo orders lexicographically as medium > low > high. With 93 medium points and a 30-row cap, the queue showed **zero of the 67 high-risk lessons**. Fixed as task T1 of the v2 plan (reuse `getGrammarBrowseSort()`). Once that lands, the queue really does surface the highest-value lessons first.
- **New reward (2026-08-21):** grammar v2 makes `reviewStatus` drive whether a creature renders as a translucent ghost or a solid monster. Reviewing a lesson is now the only way to make its creature real, so this task has visible progress attached rather than being an invisible enum flip. **This has now shipped:** every point renders as a ghost creature on its lesson page, in the bestiary and as a rival; each dungeon-map cell reports how many of its lessons are unverified; and the diagnostic result screen states, in the sensei's voice, how many of the rules it just tested have lessons nobody has read. All 184 are currently ghosts.
- **Context:** Generated 2026-08-20 on `gpt-5.4-mini`: 156 lessons in 32 chunks, zero API failures, 259.6k input and 216.6k output tokens, 17 validation issues cleared by two automatic repair passes. The validator catches structural defects (ungradeable targets, choice drills where every option scores correct, a sentence marked both correct and wrong) but cannot judge whether an explanation is _true_. That is what this task is for. Known weak spot: `commonMistakes` entries that mark correct English as wrong - check the "wrong" sentence against a context where it would be fine before trusting an entry.
- **Depends on / blocked by:** Nothing.

### Human Review Of The l1Risk Column

- **What:** Read the `l1Risk` value on all 184 taxonomy rows and correct the ones that do not match your own experience.
- **Why:** `l1Risk` drives browse order, drill minimums, whether a Vietnamese explanation is generated, and how the diagnostic spends its questions. It is the single most load-bearing column in the module.
- **Pros:** Cheap - it is one pass over one JSON file, no code and no API calls.
- **Cons:** Every current value is assistant judgment about what is hard for a Vietnamese speaker, not yours. Where it is wrong, it is wrong in a way that compounds: a point mislabelled `low` gets fewer drills, no Vietnamese explanation, and sorts to the bottom of the list.
- **Superseded by grammar v2 (2026-08-21).** This entry is now IN SCOPE for the v2 plan, with one important correction: **`l1Risk` is a content contract, not a label.** `getRequiredDrillCount` returns 12 for `high` versus 8 otherwise, and `requiresVietnameseExplanation` fires on `high || complexity >= 4` — both enforced by `grammar:validate` in the test step. Measured against the real taxonomy: of the 117 non-high points, **114 would fail validation if promoted to high** (110 have fewer than 12 drills, 84 have no `explanationVi`). So editing `l1Risk` directly can only ever LOWER risk. Demotions are free; promotions are gated by content.
- **Resolution:** v2 adds an optional `l1RiskObserved` field carrying the builder's lived judgment, which never feeds the two requirement functions and so cannot break validation. `l1Risk` keeps owning the content contract. `l1RiskRank` (the stored sort key) is seeded from `effectiveL1Risk = l1RiskObserved ?? l1Risk`, so browse order, the admin queue, and every existing index inherit the judgment with no other code change. `l1RiskObserved != null` doubles as the reviewed marker, making the pass resumable.
- **Depends on / blocked by:** Nothing. Task T2 of the v2 plan.

### Shared Content List Service

- **What:** Extract a shared filter/sort/paginate list service into `src/modules/learning/`, consumed by both `vocabWordListService` and the grammar point list.
- **Why:** Both do the same job with different field names: filter a global content collection, left-join per-user item state, sort, paginate, and leave untouched rows untouched. That left-join is fiddly and easy to get subtly wrong twice.
- **Pros:** One implementation of the pagination and left-join logic. A third learning module would get the list surface almost free.
- **Cons:** The two filter on genuinely different fields (`term`, `partOfSpeech` versus `cefrLevel`, `family`, `complexity`, `l1Risk`), so sharing needs a field-mapping abstraction that could easily cost more than the duplication it removes. This is the classic premature-abstraction trap.
- **Context:** Spotted during the Step 0 reuse audit of the 2026-08-20 eng review on the grammar module design. Deliberately NOT bundled into the phase 2 shared-scheduler gate: that gate already blocks phase 3, and stacking a second extraction onto it is how a forcing function becomes a stall. The real information only arrives once `grammarPointListService` exists and the two files can be diffed side by side.
- **Depends on / blocked by:** ~~Grammar phase 1 shipping.~~ **UNBLOCKED 2026-08-21** — grammar phase 1 has shipped, so `grammarPointListService.ts` and `vocabWordListService.ts` can finally be diffed side by side and the real information the entry was waiting for is now available. Still a judgment call whether the field-mapping abstraction costs more than the duplication it removes; the v2 CEO review did NOT take this into scope.
- **Related evidence (2026-08-21):** the duplication cost has now been measured once. `admin/grammar/page.tsx` hand-rolled its own copy of the browse sort instead of calling `getGrammarBrowseSort()`, the copy drifted to the wrong field, and the result hid 67 high-risk lessons from the review queue. That is a data point in favour of sharing, though on a different pair of call sites than this entry describes.

### ~~Environment: Stale gstack Copy Breaks Learnings Capture~~ — RESOLVED 2026-08-21

Verified fixed during the grammar v2 CEO review: `~/.codex/skills/gstack` no longer
exists, and `~/.gstack/projects/NaKMiers-English_For_Only_Me/learnings.jsonl` now
receives entries. Cross-session learning capture works. No action needed.

## Deferred After Grammar v2 CEO Review (2026-08-21)

Decisions and rationale for all of these live in
`~/.gstack/projects/NaKMiers-English_For_Only_Me/ceo-plans/2026-08-21-grammar-module-v2.md`.

### l1Risk Divergence Queue

- **What:** Report the points where `l1RiskObserved` is `high` but `l1Risk` is not, then
  raise their content to the high-risk bar: 12 drills (`GRAMMAR_MIN_DRILLS_HIGH_L1_RISK`)
  and an `explanationVi`.
- **Why:** These are the points you personally judged brutal but whose content does not
  yet have high-risk-grade support. Until the content catches up, `l1Risk` cannot be
  promoted without failing `grammar:validate`, so the module under-drills exactly the
  rules that beat you most.
- **Pros:** A generation queue ranked by _lived_ difficulty rather than assistant
  guesswork, which is strictly better targeting than the original bulk generation had.
  `grammar:generate` already writes drills and Vietnamese explanations, so the tooling
  exists.
- **Cons:** API spend, and it mints fresh unverified content — which is the problem the
  v2 CEO review opened on. Every generated drill lands as `unverified` and joins the
  reading backlog.
- **Context:** Only becomes populated after the `l1Risk` pass (task T2/T3 of v2) writes
  `l1RiskObserved` values. Task T9 of the v2 plan builds the report itself
  (`scripts/reportL1RiskDivergence.ts`); acting on the report is this entry.
- **Effort:** M (human) → S (with CC), plus generation time and API cost.
- **Priority:** P1 once the l1Risk pass is done, unactionable before that.
- **Depends on / blocked by:** ~~v2 tasks T2 and T3.~~ T2 and T3 shipped
  2026-08-21. The tool is at `/admin/grammar/l1-risk` (development only). This
  entry unblocks as soon as the judgment pass itself is done. Note that T9, the
  divergence report script, was NOT built - `hasL1RiskDivergence` exists in
  `taxonomy/effectiveL1Risk.ts` and is tested, so the report is a small script
  over the taxonomy file rather than new logic.

### Declined Delight Items From The v2 Review

Each was offered individually and declined. Recorded because they are cheap and may look
better later, not because they should be revisited now.

- **Drill kinds as attack types** — map the 5 `GRAMMAR_DRILL_KINDS` to 5 combat moves
  with `build` as the finisher. Declined as more visual authoring than feeling. S/S.
- **Time-decay fog on the map** — cells untouched for weeks fog back over, via
  `lastReviewedAt`. Declined at D4.1. Worth noting the marginal cost _dropped_ after that
  decision: the dungeon map needs a per-point projection for ghost state anyway, which
  was most of the work. S/S.
- **Lamp wakes the sensei** — at night the sensei is asleep in the dojo; yanking the
  existing pull-cord lamp (`@keyframes lamp-yank`, `lamp-flash` in `globals.css:350-379`)
  wakes him up annoyed. Declined. S/S.

### Deferred From The v2 Design Doc

- **Micro sentence-mutation** — tap one token or drag a tense marker one notch and the
  adjacent comic panel mutates, used only where prose cannot teach the contrast. The
  cross-model review argued this is the only item that makes lessons genuinely _clearer_
  rather than prettier. Needs a client island and per-point authoring to know which token
  is the pivot. M/S. Revisit after the Articles gate.
- **AI-generated creature portraits** — `CreatureSlot` is deliberately built as the swap
  seam (fixed aspect, theme-aware frame), so richer portraits can replace individual SVG
  species later with no layout churn. Mixed SVG/portrait is a valid end state. M/S.
- **Cinematic cold-open reveal** — black panel typing "184 rules. You are wrong about 31
  of them", the map drawing itself cell by cell, camera push into the cursed corner. v2
  ships only the reduced version (one reveal sweep on first load). M/S.
- **Promote comic primitives to `components/ui/`** — the primitives are the presentation
  layer vocabulary and dictation could share. Deliberately grammar-only until a second
  real consumer exists, to avoid the premature-abstraction trap this file already
  documents for the list service. M/S. Do not do this speculatively.
- **Learner-state-driven beat reordering** — v1 of the panel-script compiler uses one
  fixed beat order with absent beats collapsed. Reordering by learner state (lead with
  `scar` when `wrongCount` is high, lead with `hook` when untouched) needs a feel for the
  pacing first. S/S.
