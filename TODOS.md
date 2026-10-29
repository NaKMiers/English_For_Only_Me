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

## Deferred After Grammar v3 (2026-10-24)

Grammar v2 (184 seeded rules, creatures, dungeon map) was replaced by v3: a
12-unit course path whose content lives in `src/modules/grammar/course/units/`.
Every v2 TODO (l1Risk pass, reviewing 184 generated lessons, the shared list
service) went away with it. Design doc:
[docs/grammar/design.md](docs/grammar/design.md) (plus `ceo-plan.md`, `test-plan.md`,
`wireframe.html` next to it).

### Drop The Grammar v2 Collections

- **What:** After v3 is deployed and checked, run `bun run grammar:drop-legacy`
  (dry run), read the counts, then `bun run grammar:drop-legacy --apply --i-am-sure`.
- **Why:** `grammarpoints`, `usergrammaritems`, `grammardrillattempts` and
  `grammartestsessions` are no longer read by anything.
- **Cons:** One-way door. Until it runs, rolling back to v2 is a plain revert
  of the v3 commits.
- **Depends on / blocked by:** v3 deployed and used for a few days.

### Dictation -> Grammar Bridge

- **What:** When a dictation answer shows a grammar-shaped mistake (missing
  third-person -s, wrong past form, missing article), suggest the matching v3
  lesson ("Có vẻ bạn cần ôn bài X").
- **Why:** Grammar would start fixing the mistakes you actually make instead
  of only the ones the course anticipates.
- **Pros:** Lesson and card ids are permanent, and `GrammarCardMiss` already
  exists, so the bridge only needs a mapping from mistake pattern to lesson id.
- **Cons:** Inferring the error type from a word diff is error-prone; a wrong
  suggestion teaches distrust. Needs a precision bar before it ships.
- **Context:** Deferred in the 2026-10-24 CEO review (E4). Start from
  `src/modules/dictation/correction/compareAnswer.ts` token statuses.
- **Effort:** L (human) -> M with CC. **Priority:** P2.
- **Depends on / blocked by:** v3 stable.

### Read Through The Course Content

- **What:** Play or skim each unit (746 cards) and fix anything that reads
  wrong to you. Units were written and then checked by an independent review
  pass, but no human has read them end to end yet.
- **How:** Edit `src/modules/grammar/course/units/uNN.ts`, then
  `bun run grammar:check src/modules/grammar/course/units/uNN.ts`. Never rename
  a lesson or card id without adding it to `COURSE_ID_ALIASES`.
- **Priority:** P2. Unit 1 is the one a new learner meets first.

### ~~Environment: Stale gstack Copy Breaks Learnings Capture~~ — RESOLVED 2026-08-21

Verified fixed during the grammar v2 CEO review: `~/.codex/skills/gstack` no longer
exists, and `~/.gstack/projects/NaKMiers-English_For_Only_Me/learnings.jsonl` now
receives entries. Cross-session learning capture works. No action needed.

## Deferred After Sticker Manga Design Review (2026-10-23)

### Write A DESIGN.md

- **What:** Run `/design-consultation` to produce a root `DESIGN.md` covering the manga
  palette, Montserrat/Source Sans type, ink borders, hard offset shadows, and the sticker
  role radii (`--sticker-shell/panel/control/tag`) plus `sticker-press`.
- **Why:** The design system lives across `src/app/globals.css`,
  `.agents/rules/frontend-ui.md`, and `docs/06-frontend.md`. Every gstack design skill
  calibrates against `DESIGN.md` and flags its absence on each run.
- **Pros:** One canonical source for future design reviews and new screens.
- **Cons:** A separate ~30 min CC session; covers more than corners (type, colour, spacing).
- **Context:** The sticker restyle (`docs/designs/sticker-manga-corners.md`, design review
  5.1) chose to record its vocabulary in the agent rules file instead of creating a
  DESIGN.md, to keep the restyle small.
- **Depends on / blocked by:** Best after the sticker restyle ships, so the tokens it
  documents are real.

## Deferred After The Performance Pass (2026-10-24)

### Cache Components Migration

- **What:** Turn on `cacheComponents` in `next.config.ts`, remove the 21 `export const dynamic = 'force-dynamic'` configs, and split each page into a prerendered static shell plus `<Suspense>`-streamed per-user data. Shared catalog reads move from `unstable_cache` to `'use cache'` + `cacheTag`.
- **Why:** The shell would come from the CDN and paint instantly even when the function is cold. Today every page is rendered per request, and a cold function on the live site took 10-31 s before the region pin.
- **Pros:** The fastest possible first paint. Removes the per-route rendering config entirely (`node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md`).
- **Cons:** Touches every page, and runtime data outside `<Suspense>` becomes a build error, so it is a large, cross-cutting diff. `loading.tsx` skeletons already make navigation feel instant, so the extra win is mostly cold first loads.
- **Context:** Deliberately left out of the 2026-10-24 performance pass (Approach C in `docs/plans/2026-10-24-performance-pass-design.md`). Judge it against the re-measured numbers in `docs/plans/2026-10-24-performance-pass-measurements.md`, which also holds the benchmark script.
- **Depends on / blocked by:** The performance pass being deployed and re-measured.

### Reset The Leaked Segment Progress In Production

- **What:** Run `bun run dictation:reset-segment-progress` (dry run), then `bun run dictation:reset-segment-progress -- --apply`.
- **Why:** Practice used to write one learner's `attemptStatus`, `attemptCount` and `lastAttemptAt` onto the shared `DictationSegment`, so other learners saw that progress. The performance pass derives progress per user from attempts and stops reading or writing those fields, but the stale cross-user values are still stored in the content collection.
- **Pros:** Removes the last trace of the leak. Idempotent and dry-run by default.
- **Cons:** It writes to Production, so only you should run it, and only after the per-user progress change is deployed (old code would stamp the fields again).
- **Context:** Script: `scripts/resetSharedSegmentProgress.ts`. Nothing in the app reads these fields after the change, so this is hygiene, not a fix.
- **Depends on / blocked by:** The per-user segment progress change deployed.

### Build The New Indexes In Production

- **What:** Run `bun run db:sync-indexes` against Production to see what is missing (a dry run, it builds nothing), then `bun run db:sync-indexes --apply` to build it. Do the same for every NEW database (a preview, staging or restored copy): with `autoIndex` off it starts with no unique indexes at all, and the routes that treat a duplicate-key error as "already saved" then quietly accept duplicates.
- **Why:** Production now connects with `autoIndex: false` so cold starts stop issuing about 80 `createIndex` calls. New index declarations (for example `{ userId: 1, createdAt: 1 }` on `DictationAttempt`) are therefore only built by this script.
- **Pros:** Additive only (`createIndexes`, never drops). Nothing depends on the new indexes for correctness: the speed ones only make queries faster, and the one unique index (`active_review_item_unique` on `DictationReviewItem`) only stops a rare race from inserting a duplicate review item, which the code already tolerates.
- **Before `--apply`:** if Production already has more than one active (`due` or `scheduled`) review item for the same user, segment, kind and reason, the unique build fails and the script names it and exits 1. Dismiss the extras first, keeping the oldest in each group (nothing is deleted):
  ```js
  db.dictationreviewitems.aggregate([
    { $match: { status: { $in: ['due', 'scheduled'] } } },
    { $sort: { createdAt: 1 } },
    { $group: { _id: { u: '$userId', s: '$segmentId', k: '$kind', r: '$reason' }, ids: { $push: '$_id' }, n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } },
  ]).forEach(g => db.dictationreviewitems.updateMany({ _id: { $in: g.ids.slice(1) } }, { $set: { status: 'dismissed' } }))
  ```
- **Cons:** Index builds put load on the cluster for a few seconds.
- **Context:** Run it after each deploy that adds an index declaration. `bun run grammar:drop-stale-indexes` (listed above) is the separate tool for dropping superseded ones.
- **Depends on / blocked by:** The performance pass deployed.

## Deferred After IELTS Testing v1 (2026-10-28)

Plans: `.prompts/ielts-testing/` (design, CEO plan, eng plan, design review).

### IELTS Speaking

- **What:** Speaking tests: browser recording, speech-to-text, AI examiner for Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy, and an estimated Pronunciation band; examiner questions via TTS.
- **Why:** Completes the four skills so the overall band is real, not a 3-skill estimate.
- **Pros:** The schema already carries `skill`; TTS and the examiner pattern exist after v1.
- **Cons:** Microphone permissions, audio upload size, and pronunciation scoring from a transcript is only an estimate.
- **Context:** v1 ships Listening, Reading, Writing. Overall is labelled "N-skill estimate" until this lands.
- **Effort:** L (human) / M (CC). **Priority:** P2.
- **Depends on / blocked by:** IELTS v1 shipped (attempt model, examiner, TTS client).

### IELTS Passage Highlight And Notes

- **What:** Select text in a passage or transcript to highlight it or attach a note, saved per attempt.
- **Why:** Mirrors how learners mark up paper tests; jumpinto has it.
- **Pros:** Small, self-contained UI on top of the runner.
- **Cons:** Range anchoring across re-renders and mobile selection are fiddly.
- **Context:** Deferred from v1 by the office-hours spec review to keep the runner lean.
- **Effort:** M (human) / S (CC). **Priority:** P3.
- **Depends on / blocked by:** IELTS runner.

### IELTS Band Trend And Home Row

- **What:** A band trend chart per skill on `/ielts` and a "latest band" row on the Home Study Desk.
- **Why:** Shows progress over weeks, the main motivation signal.
- **Pros:** Data already in attempts.
- **Cons:** Touches home server data loading.
- **Context:** v1 has an attempt list with bands only.
- **Effort:** S (human) / S (CC). **Priority:** P3.
- **Depends on / blocked by:** A few weeks of scored attempts to be worth drawing.

### IELTS Map Labelling Generation And More AI Assist

- **What:** AI generation for plan/map/diagram labelling (generated image or SVG plan) and more assist actions: per-blank variant suggestions, difficulty rewrite, Vietnamese explanations.
- **Why:** v1 supports map labelling only when the admin uploads an image by hand.
- **Pros:** Fuller question-type coverage in generated tests.
- **Cons:** Generating a usable labelled plan image is the hard part.
- **Context:** v1 assist has four actions (material, questions, evidence and explanations, sample answer).
- **Effort:** M (human) / S (CC). **Priority:** P3.
- **Depends on / blocked by:** IELTS editor and generation pipeline.

### IELTS Background Generation Queue

- **What:** Run test generation as queued jobs (a job collection plus a Vercel cron or after() worker) so it continues when the editor tab closes, and optionally keep N unseen published tests ready.
- **Why:** v1 generation is driven by the open editor (resumable per section, but it stops when the tab closes).
- **Pros:** Hands-off bank refills; a learner never runs out of fresh tests.
- **Cons:** Adds leases, retries and cron config for one admin; auto-publish needs a quality gate.
- **Context:** Deliberate v1 decision (CEO review 1A). Per-section `genStatus` and `generationLog` already exist, so a worker can reuse `runSectionJob` and the conditional section write.
- **Effort:** M (human) / S (CC). **Priority:** P3.
- **Depends on / blocked by:** IELTS generation pipeline (M5).

### IELTS Line Dictation History

- **What:** Store the results of "Type this line" on the Listening review and schedule missed lines for spaced review like Dictation Lab.
- **Why:** v1 grades the line in place and forgets it, so repeated misses are not tracked.
- **Pros:** Reuses the correction engine and the learning ladder in `src/modules/learning`.
- **Cons:** New attempt-like collection and a review surface.
- **Context:** E2 in `.prompts/ielts-testing/03-ceo-plan.md`; grading is client-side `buildDictationCorrection`.
- **Effort:** M (human) / S (CC). **Priority:** P3.
- **Depends on / blocked by:** IELTS Listening review (M6).
