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
