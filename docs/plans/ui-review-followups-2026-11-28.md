# UI review follow-ups: same problems, other pages (2026-11-28)

Status: plan, reviewed with `/plan-eng-review` on 2026-11-28; not started.
Input: `docs/plans/manual-review-digest-2026-11-28.md` (principles and
patterns P1 to P11). Baseline: the uncommitted working tree on `main` after
commit `614414a` (the owner's two hand-review sessions). Treat the current
files as the fixed state; nothing in the digest's "Already fixed" columns is
redone here.

Who runs this: one implementation session works through sections 3 to 11 in
order. Everything needed is in this file, the digest and
`.agents/rules/frontend-ui.md`. Line numbers are a snapshot: re-read a line
before editing it (the Google sign-in session edits auth files and a few
dictation pages in parallel).

## 0. TL;DR

- 42 work items in 10 phases. Phase A builds or extracts 5 shared pieces
  first (due icon, `SessionEnd` chips slot, skeletons, vocabulary decision
  buttons, an affordance sweep), so the module phases reuse them instead of
  patching each page by hand.
- Phases B to F fix the modules (dictation, vocabulary, home and shell,
  grammar, IELTS). Phase G makes the IELTS Writing examiner follow the app
  locale (P11). Phase H is admin. Phase I deletes dead code, API routes, i18n
  keys and CSS tokens last, when nothing else still edits those files.
  Phase J updates rules and docs.
- Owner decisions taken in this review: build a real deep link for the
  dictation review queue (item 6); the Writing examiner writes in the app
  language, stored feedback keeps its language and offers "Grade again" when
  it differs (item 34). Other product calls use the defaults in section 2;
  the owner can overturn any of them before the item starts.
- Biggest risks: the review deep link must not rewind or complete the
  learner's saved practice session; the examiner change must not spend the
  daily grading limit silently; dead-code deletion must not drop an API or a
  key that is read dynamically.

## 1. Principles that decide every item

From the digest, section 1: calm not crowded; every small step visible;
save vertical space; clickable things look clickable and icons show state;
nothing competes with the main thing; no dead ends. Plus the house rules:
one next stop that goes somewhere real, errors as `InlineNotice tone="error"`
(danger with an icon) next to the control that caused them, no whole-card
opacity, EN and VI catalogues in parity, no em dash.

## 2. Product defaults (owner may overturn before the item starts)

| #   | Question                                                       | Default used in this plan                                                                                              | Item  |
| --- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----- |
| D1  | Dictation review: deep link or hide?                           | **Owner: deep link**                                                                                                   | 6     |
| D2  | Writing examiner language                                      | **Owner: app locale, stored feedback keeps its language, "Grade again" when it differs**                               | 34    |
| D3  | `/ielts/[slug]`: mark one skill as next?                       | Yes: pink ring and `ink` Go on the next skill (`nextSkillOf`), `paper` Go on the others                                | 28    |
| D4  | Passed grammar checkpoint node                                 | Static green node (no link), like a locked node minus the lock                                                         | 24    |
| D5  | Home simple view: next stop card and the same row in "Up next" | Keep the card, filter that row out of the list                                                                         | 21    |
| D6  | Vocabulary landing with nothing due                            | No next stop card; a `persistent` `ContinueFloat` with `nudge` to the explore deck's active card (IELTS/Grammar style) | 14    |
| D7  | IELTS result: `SessionEnd` h2 repeats the page title           | A win title instead ("Listening done"), new EN/VI key                                                                  | 29    |
| D8  | IELTS review, "Wrong" filter                                   | Explanation and evidence shown inline; the per-row fold stays for "All"                                                | 30    |
| D9  | Full transcript rows                                           | `soft-press` plus hover tint, no `hover-pop` (a 2px rise jitters a dense scrolling list)                               | 12    |
| D10 | `/api/dictation/review-items` (no caller)                      | Decide in item 6: keep only if the deep link needs a dismiss path, else delete in item 40                              | 6, 40 |

Open, not planned (needs an owner call later): whether the home full view
should drop one of its three link groups (module nav, tiles, plan groups all
point at the same four landings); whether the vocabulary recall end should
make "Plant new words" the one next stop instead of "Done"; whether learner
notes should feed the Writing examiner (there is no notes field today).

## 3. Phase A: shared groundwork (do first, in order)

Make the change easy, then make the easy change. Every later phase depends
on at least one item here.

### 1. Due state has one icon: `Brain` (P4, S)

- Problem: the grammar nodes switched "due" from `RotateCcw` to `Brain`, but
  the rotate icon still means "due" in 8 places, so the same state wears two
  icons and the rotate one reads as "redo".
- Files: add `src/constants/stateIcons.ts` exporting `DUE_ICON = Brain` (and
  `DONE_ICON = Check` if it helps); use it in
  `src/components/dictation/browse/ListeningJourneyHero.tsx:97-101` (chip),
  `src/app/(app)/dictation/review/page.tsx:82` (page icon),
  `src/components/dictation/DictationReviewQueue.tsx:187` (Start review),
  `src/components/home/HomeSimpleView.tsx:127`,
  `src/components/home/HomeStudyDesk.tsx:417`,
  `src/components/vocabulary/VocabularyStatsOverview.tsx:26` (`FLOW_ICONS`
  "Due today" step), `src/components/grammar/path/GrammarJourneyHero.tsx:66`
  (chip), `src/components/grammar/path/GrammarPath.tsx:365-371` (unit "N due"
  tag) and the modal's Review button (`GrammarPath.tsx:587`).
- Keep `RotateCcw` only for real replay/redo actions (practice Replay in
  `DictationControls.tsx`, Regenerate).
- Guard: add a case to `src/lib/styleGuards.test.ts` that fails when
  `RotateCcw` is imported outside an allowlist of replay/redo files.
- Verify: `npx vitest run src/lib/styleGuards.test.ts` plus the touched
  components' tests; browser: `/dictation` chip, `/dictation/review`, `/`
  both views, `/vocabulary` drawer, `/grammar` chip and unit tag show the
  brain.

### 2. `SessionEnd` gets a chips slot beside the headline (P1, P8, M)

- Problem: session ends stack h2, big number, a `StatStrip` row and several
  journey lines (IELTS result head, grammar `PlayerResult` up to 8 lines),
  the same shape P1 removed from the landing banners.
- Change in `src/components/journey/SessionEnd.tsx`: add `stats?: ReactNode`
  rendered on the headline's row, top right (`flex flex-wrap items-start
justify-between`, the twin of `JourneyCard statsPlacement="top"`), and
  document that `nextStop` is a `NextStopCard variant="compact"` (not a bare
  button). Keep the fixed slot order.
- Verify: extend `SessionEnd.test.tsx` (chips render in `data-session-slot`
  beside the headline; order unchanged; `expectLandingBudget` still passes for
  one compact next stop).

### 3. Skeletons that match the pages (P1, S-M)

- Problems: `src/app/(app)/ielts/[slug]/loading.tsx:18-27` still draws the
  deleted journey banner and three stacked rows; the dictation topic,
  favorites and no-topic skeletons
  (`[topicSlug]/loading.tsx:18-22`, `favorites/loading.tsx:16-20`,
  `no-topic/loading.tsx:16-20`) draw a next stop panel the strip no longer
  has; several skeletons pass no `page`, so the topbar grows when the page
  lands (`dictation/review/loading.tsx:15`,
  `dictation/videos/[videoId]/results/loading.tsx:96`, the three above,
  `vocabulary/words/loading.tsx:121-124`, grammar notes `loading.tsx:13-21`);
  the home skeleton (`src/app/loading.tsx:19-22`) draws one circle where the
  real header has 4 nav pills; the vocabulary route skeleton and the
  in-component fallback differ (`vocabulary/loading.tsx:234-237` vs
  `VocabularyDashboard.tsx:722-725`).
- Change in `src/components/common/PageSkeletons.tsx`: add
  `SkeletonTopicStrip` (64px disc, two lines, thin bar), `SkeletonIeltsTest`
  (segmented pill, 3 launcher blocks in a row from `sm`, one panel) and
  `SkeletonVocabularyLanding` (used by both vocabulary fallbacks). Pass a
  `page` with the static breadcrumb/title to every `SkeletonPageShell`.
- Verify: browser with network throttling on each route: no jump in the
  topbar or the first card when data lands (day theme, 1280px and 375px).

### 4. One vocabulary decision control with a picked state (P7, M)

- Problem: the `/vocabulary` search shows a word's saved state
  ("should learn" / "already know") with `aria-pressed` and a picked style;
  the explore deck shows it by disabling the chosen button
  (`VocabularyExplorePanel.tsx:311-339`), and the practice word dialog shown
  in dictation and the IELTS runner shows nothing
  (`QuickVocabLookup.tsx:206-223`) plus a `Search` icon for the status
  (`:225-230`).
- Change: extract the buttons, `PICKED_CLASS_NAME`
  (`VocabularySearchPanel.tsx:50`) and the status presentation into
  `src/components/vocabulary/VocabDecisionButtons.tsx` (props: `decision`,
  `onDecide`, `busy`, `error` rendered as `InlineNotice tone="error"` under
  the buttons). Use it in `VocabularySearchPanel` first (no visual change).
- Verify: new `VocabDecisionButtons.test.tsx` (picked state via
  `aria-pressed`, clicking the current choice is a no-op, error renders under
  the buttons with the danger icon); `VocabularySearchPanel` tests unchanged.

### 5. Affordance sweep: every learner clickable pops (P4, S)

- Problem: raw clickables without `hover-pop` (or with a hover equal to the
  base colour).
- Files: `src/components/vocabulary/VocabTermHeader.tsx:111-128` speak
  button (every word row, explore card, recall card, word dialog) ->
  `IconButton`; `src/components/dictation/GuidedAnswerInput.tsx:434-441` hint
  chips (`hover:bg-pastel-peach` equals the base) -> `soft-press hover-pop
hover:bg-surface`; `src/components/home/HomeModuleNav.tsx:24-28`;
  `src/components/dictation/DictationPracticeHeader.tsx:65-71` logo link;
  `src/components/dictation/DictationDebriefPanel.tsx:106` collapsible
  trigger; `src/components/ielts/runner/RunnerFooter.tsx:29-30` skill links;
  `src/components/ielts/widgets/EvidenceIconButton.tsx:22-24`;
  `src/components/common/AudioPlayer.tsx` `AUDIO_PLAY_BUTTON_CLASS` (has
  `soft-press`, lacks `hover-pop`; used by dictation and the IELTS listening
  key).
- Do not add `hover-pop` to static chips or rows (`ProgressTabs` `li` is item
  33).
- Verify: the touched components' tests; a quick hover pass in the browser
  on each surface (day and night).

## 4. Phase B: dictation

### 6. Review queue opens the weak sentence, not the whole video (P10, P2, L)

Owner decision D1. Today every row of `/dictation/review`
(`DictationReviewQueue.tsx:150-158`) and its Start button (`:186`) link to
`/dictation/videos/<id>/practice`; a finished video opens on its "Done"
screen (`DictationPracticeShell.tsx:292-294`), so the learner never reaches
the sentence. The page is linked from the landing next stop
(`dictation/page.tsx:163`), the journey chip (`ListeningJourneyHero.tsx:98`)
and both home views (`HomeSimpleView.tsx:126`, `HomeStudyDesk.tsx:416`).

```
/dictation/review row ─► /dictation/videos/<v>/practice?segment=<s>
                              │ page.tsx: validate <s> belongs to <v>
                              │          (unknown / foreign id: ignore, normal practice)
                              ▼
                  DictationPracticeShell reviewSegmentId=<s>
                   ├─ start at that segment, isCompleted=false, no restart
                   ├─ DO NOT write currentSegmentOrder / completions
                   ├─ attempt POST (existing) ─► recomputeReviewItemsForSegment
                   │                              (item leaves the queue when solved)
                   └─ after Check: compact end "Back to review (N left)"
                                     └─ next due item's deep link, or /dictation/review
```

- Step 1 (investigate, no code): read how the practice shell saves the
  session (`currentSegmentOrder`, completions) and confirm that an attempt
  through `src/app/api/dictation/sessions/[sessionId]/attempts/route.ts`
  already calls `recomputeReviewItemsForSegment` and clears a solved item.
  Write the answer in the PR description. If a session must exist for the
  attempt route, create or reuse one without moving its position.
- Step 2: `practice/page.tsx` reads `searchParams.segment` (Next 16:
  `searchParams` is a Promise; read the guide in
  `node_modules/next/dist/docs/` first), passes `reviewSegmentId` to the
  shell. Shell review mode: one sentence, no session position write, a small
  end with one next stop to the next due item.
- Step 3: `DictationReviewQueue` rows and Start link to the deep link; the
  four callers above keep linking to `/dictation/review` (it now works).
- Step 4: decide D10: if review mode needs no dismiss, mark
  `/api/dictation/review-items` and the test-only scheduler helpers
  (`reviewScheduler.ts:209,232,244`) for deletion in item 40.
- Verify: unit tests for the page's segment validation (own segment, foreign
  segment, missing) and for the shell's review mode reducer (starts at the
  index, never writes position, end shows "N left"); E2E
  `src/modules/dictation/dictationReview.e2e.ts` (signed in, seed one weak
  segment on a finished video, open `/dictation/review`, click the row, land
  on that sentence, answer right, the row is gone). Browser: a finished video
  stays finished on its own practice page afterwards.

### 7. Debrief panel: errors visible, no disabled button with a hidden reason (P7, P9, P6, P5, S-M)

- `src/components/dictation/DictationDebriefPanel.tsx`: a failed generate
  sets the error (`:81-85`) but the `InlineNotice` lives inside the closed
  `CollapsiblePanel` (`:160`, `:191-195`), so nothing shows. Render the error
  under the Generate button, outside the fold.
- `:131` `disabled={!canGenerate || isGenerating}` with the reason folded away
  (`:189`): when `!canGenerate`, hide the button and show `text.locked` as one
  quiet line in the head.
- Vocabulary cards (`:210-216`): term `text-base font-medium`, meaning
  `text-ink-soft`. Replace `bg-surface/80` (`:37,199,210`) with `bg-surface`.
- Verify: `DictationDebriefPanel` tests for the error path (fetch rejects ->
  error visible without opening the panel) and the locked state (no
  disabled button in the DOM); browser on a results page.

### 8. Practice screen: translation is a helper, errors in place, main actions sized (P6, P5, P7, P8, P1, M)

- `src/components/dictation/DictationTranslation.tsx:47-48,61-63`: the
  translation uses the answer's text size and `font-semibold`, on `bg-white`
  (a light slab at night). Make it `text-ink-soft text-sm leading-6
font-normal` on `bg-surface`, same treatment as the fixed full transcript.
- `DictationPracticeShell.tsx:1925-1931`: lookup error as `InlineNotice
tone="error"` (today pink text, `role="status"`, no icon); `:2003-2008`:
  pass `translationError` into `DictationTranslation` and show it in the
  strip instead of the frame footer.
- `:1883-1899`: Check and Next/Finish use the default `ActionButton` size;
  keep `px-4 py-1 text-sm` for Skip, Retry, Show words.
- Progress shown twice (`DictationControls.tsx:99-104` counter and
  `PracticeProgressStrip` row): keep the strip, drop the toolbar counter (the
  strip's `title` carries "3 / 20").
- Verify: practice shell tests (Check button class, error in strip, one
  progress element); browser on a practice page, day and night, 375px.

### 9. Practice word dialog: compact and shows the saved state (P6, P7, P4, S)

Depends on item 4. `QuickVocabLookup.tsx:200-205` renders meaning and
definition as two equal bold boxes; shared with the IELTS runner
(`ielts/runner/TextHighlighter.tsx:256`).

- Copy the compact search result layout (`VocabularySearchPanel.tsx:152-198`):
  meaning as one mint chip `font-medium`, definition `text-sm` regular, no
  boxes. Use `VocabDecisionButtons` with `entry.userItem` as the decision;
  drop the `Search` status icon; errors (`:231-233`, `:394`) via the
  component's `InlineNotice`.
- Verify: `QuickVocabLookup` tests (picked state from `userItem`); browser in
  a dictation practice and in an IELTS reading runner (both hosts).

### 10. Results page before any practice: one empty state (P9, P8, P6, P10, S)

- `DictationResultsSummary.tsx:117-134` and `results/page.tsx:223-241` show
  two panels saying "practice first" and the only useful action as a small
  `paper` button. Replace both with one `EmptyState` (thumbnail as media, one
  sentence, one `ink` action: Start or Continue practice).
- Drop the helper sentence `text.builtFrom` (`:110`).
- Reword or delete `en/dictation.ts:371,373` (they talk about the removed
  review queue) in EN and VI.
- Verify: `DictationResultsSummary.test.tsx` (not-started and in-progress
  render one action, `expectLandingBudget(container)`); browser on an
  unplayed video's results.

### 11. Dictation session ends show the journey step (principle 2, M)

- House rule: every `SessionEnd` shows the step just taken with the module's
  advance helper. `PracticeFinish.tsx:49-80` and
  `DictationResultsSummary.tsx:58-114` pass no `journeyStep`;
  `advanceTopicRecord` (`browse/listeningJourney.ts:129`) is used only by its
  test.
- Load the video's topic counts where the finish screen and results page are
  built, compute the record with `advanceTopicRecord` (`wasFinishedBefore` =
  completions > 0 at load, so a replay adds 0) and pass "+1 on {topic}, N to
  go". Videos without a topic show nothing.
- Verify: tests for first finish (+1) and replay (+0); browser finish a short
  video.

### 12. Dictation small fixes (P3, P2, P9, P4, S)

- `browse/DictationSide.tsx:101-113`: remove the favorites block and the
  `showFavorites` prop (Favorites now sits beside the "Topics" heading,
  `dictation/page.tsx:243-251`); use `Star` on that heading button so the icon
  matches the cards (`FavoriteButton.tsx:369`).
- Topic page search (`[topicSlug]/page.tsx:232-236`): pass
  `nextId={next?.video.id ?? null}` to the flat list and no
  `TopicContinueFloat` while a search result is shown.
- Pager ends (`browse/BrowsePagination.tsx:249-255,270-276`): render an empty
  spacer instead of a faded disabled pill.
- Full transcript (`DictationFullTranscript.tsx:111-116,128-133`): toggles get
  `soft-press hover-pop`; rows (`:171-174`) get `soft-press` and keep the
  hover tint (D9).
- Setup/empty panels with a lone button (`practice/page.tsx:73-77`,
  `results/page.tsx:73-76`, `DictationPracticeShell.tsx:1524-1532`) become
  `EmptyState`.
- Verify: `VideoListPage.test.tsx`, `TopicJourney.test.tsx`,
  `ListeningJourney.test.tsx` updates; browser on `/dictation`, a topic
  with a search, the last page of a list.

## 5. Phase C: vocabulary

### 13. Recall deep link `/vocabulary?recall=1` (P2, S)

- The recall session opens only through `onStartRecall`, so the word list's
  Start (`VocabularyWordList.tsx:371-378`) and the home vocabulary row link to
  the landing, a chooser. Add a `recall=1` search param that
  `VocabularyDashboard` reads on mount to call `openRecallModal` (then strip
  the param with `router.replace`).
- Verify: dashboard test (param opens the modal once; no due cards -> the
  modal's empty state, not an error); browser.

### 14. Landing with nothing due: no next stop that only scrolls (P2, M)

- `VocabularyLanding.tsx:60-65` builds a "plant" next stop whose href is
  `#vocab-explore`, the in-page scroll the owner removed elsewhere. With
  nothing due (D6): no `nextStop`; mount a `persistent` `ContinueFloat`
  (`nudge`) targeting the explore deck's active card. With cards due: keep the
  small next stop into recall (item 13's link or `onAction`).
- Update the landing test budget: due -> `{ nextStops: 1 }`, nothing due ->
  `{ ctas: 0, nextStops: 0 }`.
- Verify: `VocabularyLanding` tests for both states; browser with a fresh
  account and with due cards.

### 15. Landing feedback next to the deck and the search card (P7, M)

- `VocabularyLanding.tsx:77-84` shows mark results and errors from the
  explore deck and the search card at the top of the page
  (`VocabularyDashboard.tsx:590-592,618-622,653-654,215`). Pass status and
  error into `VocabularyExplorePanel` and `VocabularySearchPanel` (via
  `VocabDecisionButtons`) and render them under the button pressed; drop the
  "loaded {term}" notice (the result shows it).
- Verify: dashboard tests (a failed mark from the deck renders inside the
  deck, nothing at the top); browser.

### 16. Explore deck: solid neighbour cards, picked state (P5, P7, S)

- `VocabularyExplorePanel.tsx:239,274-276` puts every non-active card at 50%
  opacity, so the card behind shows through, against the file's own comment
  (`:83-84`). Keep `opacity: 1` for visible cards; dim neighbours with
  `bg-tint text-ink-soft`; replace `hover:opacity-80` (`:87`) with `hover-pop`.
- Use `VocabDecisionButtons` (item 4) instead of disabling the chosen button.
- Verify: explore panel test (no inline opacity below 1 on a visible card;
  `aria-pressed` on the chosen decision); browser, both themes.

### 17. Word list: errors on the row, real Start, calm pager (P7, P2, P9, P3, M)

- Per-row errors: `VocabularyWordList.tsx:382-387` shows a failed mark above
  the list. Keep `rowErrors[entryId]` and render `InlineNotice tone="error"`
  inside that row; drop the success line (the row leaving the view says it).
- Start review links to `/vocabulary?recall=1` (item 13).
- Pager ends (`:508-524`): hide instead of disabled.
- Empty state on `vocabulary/words/page.tsx:52-62` -> `EmptyState`.
- Verify: word list tests; browser search, mark, page through.

### 18. Recall modal and dashboard skeleton (P5, P1, S)

- `VocabRecallModal.tsx:434` fades not-picked options with `opacity-55`;
  use `bg-surface text-ink-soft` with the number chip on `bg-tint`.
- Use `SkeletonVocabularyLanding` (item 3) in `VocabularyDashboard.tsx:722-725`.
- Verify: recall modal tests; browser answer one card.

## 6. Phase D: home and shell

### 19. Account menu without a stray divider (P5, S)

- `UserMenuPopup.tsx:79-85`: the separator renders for everyone, so a
  learner's menu opens with a hairline above "Sign out". Move it inside the
  `isAdmin` branch.
- Verify: `UserMenuPopup.test.tsx` (non-admin: no separator); browser.

### 20. Remove the stale shell comment (P10, S)

- `AppSidebar.tsx:94` says phones get the links from the topbar menu; the
  menu is the Account sheet now. Fix the comment.

### 21. Home simple view: next stops go to the work screen (P2, S-M)

Depends on item 13.

- `HomeSimpleView.tsx:131-146` links the vocabulary row to `/vocabulary` and
  the grammar row ("Your next lesson", titled with the lesson) to `/grammar`.
  Use `/vocabulary?recall=1` and `nextHref(grammarPath.next)`
  (`grammar/path/pathNext.ts:9`, pass it from `src/app/page.tsx:50-59`).
- D5: filter the row picked as the next stop (`:158-178`) out of "Up next".
- Verify: `HomeSimpleView` tests (next stop href is a work screen, picked row
  absent from the list, `expectLandingBudget`); browser.

### 22. Home full view: no duplicate links, module colours, opaque fills (P3, P10, P5, P1, S-M)

- `HomeStudyDesk.tsx:330-353`: "Learning progress" row links to `/dictation`
  above two tiles that link there already; make it a plain `h2`.
- `:421-427`: "New clip / Add one" promises adding a clip (admin only) and
  repeats `/dictation`; remove it.
- `:247-259`: the dictation tile wears IELTS peach; use
  `MODULE_THEMES.dictation`.
- Translucent fills `bg-surface/80`, `bg-pastel-sky/60`, `bg-pastel-rose/70`
  (`:157,172,369,435`, `HomeBuddyCard.tsx:136,149`) -> opaque tokens; the rose
  group also breaks "no module wears pink".
- `HomeBuddyCard.tsx:48`: `min-h-[480px]`/`560px` only from `xl`.
- Verify: home tests; browser full view at 375px and 1280px, both themes.

## 7. Phase E: grammar

### 23. Continue float bounces on the node (P2, S)

- `GrammarPath.tsx:536-546` and `IeltsHome.tsx:104-111`: both floats are
  `persistent` without `nudge`. Add `nudge="li"` (grammar node) and
  `nudge="li"` or `true` (IELTS station, check which ancestor wraps the pin).
- Verify: `ContinueFloat` tests already cover `nudge`; browser jump on both.

### 24. Passed checkpoint is a static node (P10, S)

- `GrammarPath.tsx:248-262` links a passed checkpoint to
  `/grammar/units/<id>/checkpoint`, which redirects to `/grammar` for a
  complete unit (`checkpoint/page.tsx:33`). D4: render it as a static node
  (span, green tick, no `hover-pop`).
- Verify: `GrammarPath.test.tsx` (passed checkpoint has no link);
  `expectLandingBudget` still passes.

### 25. Lesson session end: one compact next stop, chips beside the stars (P8, P1, M)

Depends on item 2.

- `PlayerResult.tsx:375-384` passes a bare left-aligned `ActionButton` as the
  next stop while Redo / Back are centred under it. Use
  `NextStopCard variant="compact"` with `title` = next lesson, checkpoint or
  unit name, `detail` = "Unlocked" / "Up next", `done` for the all-clear.
- `:280-303`, `:416-441`: accuracy, best streak and time become static
  `StatChip`s in the new `stats` slot; merge "+1 lesson" and the unit line
  into one journey line ("+1 in Unit 3, 2 to the checkpoint").
- Verify: `PlayerResult` tests (one `data-next-stop`, chips in the stats
  slot, replay shows +0); browser finish a lesson.

### 26. Notes page: no lone Redo row, no repeated tag (P3, P6, P1, S)

- `notes/page.tsx:82-103`: from `md` the header is a full-width row holding
  only Redo. Move Redo into the first card's header (`ContentPanel action`)
  and drop `actions`, so `PageHeader` is `md:hidden`; the skeleton from item 3
  then matches.
- `PlayerCard.tsx:122-127`: add `hideTag` to `ExplainCardView`; the notes page
  sets it (every card repeats "Remember").
- Verify: notes page test; browser.

### 27. Checkpoint pass mark stays visible (P9, S)

- `LessonPlayer.tsx:329-333` shows the pass mark intro only on card 1. Show
  the pass mark as a small static chip next to the step count for checkpoint
  and review runs; keep the long test-out sentence on card 1 only.
- Verify: `LessonPlayer` test (chip present after advancing); browser run a
  checkpoint.

## 8. Phase F: IELTS

### 28. Test page: matching skeleton, one marked next skill, calm blocked state (P1, P2, P8, P5, P9, P10, M)

Depends on item 3.

- Use `SkeletonIeltsTest` in `ielts/[slug]/loading.tsx`.
- D3: pass `next = nextSkillOf(entry, bandsFromAttempts(...))` from
  `ielts/[slug]/page.tsx` to `SkillLauncher`; the next skill's card gets the
  pink ring (`ring-brand/35 ring-4`, as the dictation topic card) and an
  `ink` Go; the others stay `paper`. Fix the stale comment at
  `SkillLauncher.tsx:178`.
- Mock-blocked launcher (`SkillLauncher.tsx:118-125,179-187`): hide the
  faded option list and the disabled Go; show only the reason as an
  `InlineNotice` in the card.
- Drop `partMinutes` and the `meta` it feeds (`page.tsx:45-62,189-193`; the
  launcher discards it at `SkillLauncher.tsx:76-80`) and the keys
  `testPage.audioMinutes` / `noAudio` if nothing else reads them.
- Verify: page test (exactly one `bg-cta` Go, on the next skill; none when
  all skills are banded); browser on a fresh test and a half-done test.

### 29. Result head: one title, chips beside the band, one "next" (P1, P3, M)

Depends on item 2.

- `ielts/attempts/[attemptId]/page.tsx:99,112` and
  `IeltsResultHead.tsx:113-116`: the page title and the `SessionEnd` h2 both
  say "Listening result". D7: `SessionEnd` title becomes a win title (new
  EN/VI key `ielts.result.done`, "{skill} done").
- Chips (`:117-144`) go into the `stats` slot; the "N of M skills banded" line
  (`:81-88`) becomes the journey step.
- `ObjectiveResult.tsx:122-141`: drop the separate "Next" card; put
  "Weakest: X" and `DrillButton` in the Answers card header (`ExamCard`
  action).
- Verify: result head tests (one heading per level, one next stop); browser
  a listening and a writing result.

### 30. Review table: compact, the key stands out, explanations inline (P6, P9, P4, M-L)

- `ObjectiveResult.tsx:170-171`: a 560px-min 5-column table scrolls sideways
  on phones. Compact rows: number, given -> accepted, mark; question type as a
  quiet tag.
- `:237-245`: given answer normal (`line-through text-ink-soft` when wrong),
  accepted answer `font-medium text-lesson-correct`.
- D8: in the "Wrong" filter show explanation and evidence inline; the fold
  stays for "All" and the whole row is its trigger (`hover:bg-tint-soft`).
- `:261`, `:53`: evidence quote is the primary line, explanation
  `text-sm text-ink-soft` under it.
- `widgets/ReviewMark.tsx:304-312`: a prop keeps "Correct" / "Wrong" `sr-only`
  in the result table (the in-runner paper review keeps its look).
- Verify: `ObjectiveResult` tests (Wrong filter shows explanations without a
  click; All filter folds; mark words are `sr-only`); browser 375px, no
  horizontal scroll.

### 31. Writing result: errors by the button, Grade up top, no dead controls (P7, P8, P9, P6, P10, P4, M)

Do before item 34 (same file).

- `WritingResult.tsx:294-301`: one error above all tasks, neutral, no icon.
  Keep the error per task and render `InlineNotice tone="error"` in that
  task's card next to its Grade button.
- `:226-247`: Grade / Grade again moves to the task card header (`ExamCard`
  action); "Show sample" stays with the sample.
- `:248-260`: render "Show sample" only when `task.sampleAnswer` is non-empty.
- `:235`: blank essay: hide Grade, say "Nothing written" once.
- `:131-141`: correction reason `text-ink-soft text-sm`.
- `:142-149`: grammar lesson links redirect to `/grammar` when the lesson is
  locked (`grammar/lessons/[lessonId]/page.tsx:40-43`). Resolve per lesson in
  `resultPageData`: passed -> `/notes`, unlocked -> lesson, locked -> title
  without a link.
- `:195-198`: prompt fold uses the `SessionEnd` fold classes (`soft-press
hover-pop`, chevron).
- Verify: `WritingResult` tests for each branch (error placement, no sample,
  blank essay, locked lesson renders no link); browser a graded and an
  ungraded writing result.

### 32. Runner: controls share rows, errors in place (P3, P7, P4, M)

- `WritingRunner.tsx:292`: Task/Essay switch on its own `justify-end` row on
  phones; pass it as `RunnerToolbar panes` (as the Reading runner does).
- `IeltsRunner.tsx:398-402,303-311,321`, `WritingRunner.tsx:160-165`: check
  and evidence failures go to the top notice bar. Show the check error in
  `CheckPartPanel`'s live slot and "evidence not available" next to the
  question; keep the top bar for exam-wide messages.
- Notice "Close" (`IeltsRunner.tsx:620-626`, `WritingRunner.tsx:281-287`):
  `IconButton` with `X`, 44px target.
- `DrillButton.tsx:57-63`: error as `text-danger` with `AlertCircle`.
- `LineDictation.tsx:25-35` and `SaveWordButton`: one `flex flex-wrap gap-2`
  row; `SaveWordButton.tsx:57-86` becomes one labelled `ExamButton` with the
  icon inside.
- `SaveWordButton.tsx:27-30` always starts as "Save": load the learner's item
  status for review words in `resultPageData` and start in the saved state
  (P7, M on its own; split it out if the data load is heavy).
- Verify: runner tests (panes in the toolbar on writing; check error inside
  the panel); browser a practice reading part and a writing task (these
  create attempts: use a test account).

### 33. IELTS drawer rows: only the link looks clickable (P4, S)

- `catalogue/ProgressTabs.tsx:124,179,187`: the static `li` lights up on hover
  while the real attempt link only underlines. Remove the `li` hover; give
  the link `soft-press hover-pop rounded-control` and the row padding.
- Verify: `ProgressTabs` test; browser.

## 9. Phase G: AI output language (P11)

### 34. Writing examiner writes in the app language (P11, M)

Owner decision D2. Reference: the dictation debrief
(`api/dictation/debriefs/route.ts:74` `language: await getLocale()`,
`modules/dictation/ai/debriefPrompt.ts` `LANGUAGE_NAMES`).

```
grade route / check route ── getLocale() ──► gradeWritingTask / checkPracticeWriting
                                              │ language: Locale
                                              ▼
                                   buildExaminerMessages(input)
                                   "Write summary and reason in {LANGUAGE_NAMES[language]}.
                                    suggestion and improved stay in English."
                                              ▼
                       stored writingFeedback.<task> { ..., language, promptVersion }
                                              ▼
WritingResult: feedback.language ?? 'vi' (legacy) !== current locale
               ─► quiet "Grade again in English/Tiếng Việt" (uses the daily limit,
                  says so; never automatic)
```

- Move `LANGUAGE_NAMES` to `src/lib/ai/languageNames.ts` and import it from
  both prompts (DRY).
- `examinerPrompt.ts:48,55-56`: drop "Vietnamese learner" from the role line;
  the language line names the target; `suggestion` and `improved` stay
  English. Add `EXAMINER_PROMPT_VERSION`.
- `ExaminerInput.language`, `IeltsWritingTaskFeedback.language` and
  `promptVersion` (`attemptRecords.ts:21`, the Mongo model's sub-schema),
  written by `gradeWritingService.ts`; practice check returns it too.
- Verify: `promptBlocks.test.ts` / new `examinerPrompt.test.ts` (EN and VI
  produce the right language line; essay stays wrapped as data);
  `runExaminer.test.ts` passes `language` through; `WritingResult` test shows
  "Grade again" only on a mismatch. Eval (manual, owner's key): grade one
  short essay in each locale and read the summary language.

### 35. Grading failures shown in the learner's language (P11, P7, S)

- `gradeWritingService.ts:173,198` and `runExaminer.ts:61,69` store raw
  English messages (sometimes schema-validation text) that
  `WritingResult.tsx:222-224` shows. Store an error code
  (`missingTask`, `emptyEssay`, `invalidOutput`, `providerFailed`), map it to
  catalogue strings (EN/VI), log the raw message only.
- Verify: service tests assert the code; `WritingResult` test maps it.

### 36. Admin assist notes follow the admin's locale (P11, S)

- `modules/ielts/generation/assistService.ts:104` asks for Vietnamese
  `summary`/`notes` while the editor UI copy follows the locale. Pass the
  locale from `api/admin/ielts/assist/route.ts` and use `LANGUAGE_NAMES`.
- Verify: assist service test for both locales.

## 10. Phase H: admin (owner-only, lower severity)

### 37. Admin layout and affordances (P1, P3, P4, P5, P9, S-M)

- Menu triggers without `hover-pop`/`soft-press`: `AdminVideoRow.tsx:120`,
  `AdminTrashVideoMenu.tsx:36`, `AdminTopicCard.tsx:89`,
  `AdminTestRow.tsx:178`, `EditorHeader.tsx:272`: one shared trigger built on
  `IconButton` (DRY).
- Rows and toggles: `AdminTestRow.tsx:144`, `ChecksPanel.tsx:49`,
  `AdminUnassignedPanel.tsx:44`, `AdminTopicCard.tsx:244,500`,
  `AdminTrashPanel.tsx:34`, `AdminVocabPanel.tsx:114` (-> `IconButton`),
  `AssistMenu.tsx:179`, `ConfirmSubmitButton.tsx:67` (-> `ActionButton`).
- `admin/dictation/page.tsx:200,230`: Import button into `PageHeader actions`.
- Card in card: `admin/dictation/import/page.tsx:52` and
  `videos/[videoId]/edit/page.tsx:154` wrap a form made of `ContentPanel`s;
  render the form directly. Keep one intro line on the import page (drop the
  page subtitle or `saveUrlFirst`). URL input and submit on one row from `sm`
  (`DictationImportForm.tsx:295`).
- `AdminVocabPanel.tsx:134`: the 5-chip strip moves into the header.
- Disabled delete items with a tooltip-only reason
  (`AdminTopicCard.tsx:286-287,543-544`): hide them when they cannot run.
- Verify: admin component tests; browser admin dashboard, dictation, import,
  edit, IELTS list, vocab.

### 38. Admin errors next to the control, in the error tone (P7, M)

- `DictationCaptionManager.tsx:369,517`: remove/activate errors on the track
  row; others as `InlineNotice tone="error"`.
- `TestEditor.tsx:158,567-572`: split error from success; a section save or
  generate error renders in that section card (like `section.genError`,
  `:706`).
- `AdminVocabPanel.tsx:194-195`: refresh failure next to the header button,
  `InlineNotice tone="error"`.
- Verify: component tests for each error path.

## 11. Phase I: dead code (P10), last

Runs after every phase above so no deleted key or export is still being
edited. Each deletion: grep the name and the path string, run `tsc`, the i18n
parity test and the full vitest.

### 39. Dead components and exports (P10, S-M)

- `JourneyCard`: `milestone`, `MilestoneNote` and the `statsPlacement='below'`
  branch (every caller passes `top`); `SkeletonJourney`'s `below` branch once
  item 3 removed its last user. Update `JourneyCard.test.tsx` and the rules
  file (item 42).
- `DictationReviewQueue` `variant='embedded'`; `DictationSegmentEditor.tsx`;
  the `QuickVocabLookup` export (`QuickVocabLookup.tsx:330-405`); `ExamBadge`
  and `BADGE_TONES` (`ielts/ui.tsx:46-70`); `ui/separator.tsx`,
  `ui/slider.tsx`; `modules/vocabulary/stats/vocabStats.ts` (+ test).
- `useReducedMotion`/`shouldReduceMotion` (`lib/motion/useReducedMotion.ts`):
  use `shouldReduceMotion()` in `AppSidebar.tsx:63`, `ThemeProvider.tsx:135`,
  `ContinueFloat.tsx:179` instead of three inline media queries (DRY), keep the
  module.
- Unused exports listed in the audit note A3 (`THEME_COLORS`,
  `useOutboxPendingCount`, `ANSWER_TEXT_SIZE_LABEL`,
  `readDictationPreferences`, `VOCAB_WORD_LIST_VIEW_LABELS`,
  `listDueVocabRecallCardsForUser`, `answerVocabRecallForUser`, unused
  vocabulary constants, `openAttempts`, `parseCheckPart`,
  `IELTS_WRITING_MIN_WORDS`, `resetStrictSchemaCache`, `listIeltsTestsApi`,
  `readIeltsAttemptApi`) and test-only helpers (`getDictationStatusLabel`,
  `matchesBrowseQuery`, `shouldCreateDebriefAttempt`,
  `parseVocabWordListView`, `answerLineCells`, `isAdminEmail`). Keep
  `advanceTopicRecord` (item 11 uses it). Leave `lib/auth/*` to the sign-in
  session.

### 40. Dead API routes (P10, M)

- Delete `api/admin/ielts/tests/[testId]/new-version` (410 stub) and
  `ieltsEditor.api.editedInPlace`; `api/vocab/items/batch` and
  `VOCAB_API_PATHS.itemsBatch`; the `GET`/`POST` of `api/dictation/videos` and
  the `PATCH`/`DELETE` of `api/dictation/videos/[videoId]` with their four
  wrappers in `requests/dictationVideosApi.ts` (keep `GET [videoId]`, used by
  `DictationImportForm.tsx:197`).
- `api/dictation/review-items` and the test-only scheduler helpers: per D10,
  only after item 6.
- Update `docs/04-api-reference.md`.

### 41. Dead config, i18n keys and CSS tokens (P10, M)

- `constants/modules.ts:38-41`: the four future modules with routes that do
  not exist, `future`/`secondary` statuses, `NAV_HIDDEN_MODULE_KEYS`,
  `NavItem.disabled`, and their keys (`common.modules.*` for them,
  `common.nav.soon`, `common.nav.menuDescription`, `common.moduleStatus.*`).
- i18n keys with no reader (audit note A4): `ielts.testJourney.*`,
  `ielts.catalogue.*` (old path UI), `ielts.testPage.editTest`,
  `ielts.launcher.modeGroup`, `ielts.loading.result`,
  `ielts.result.{skillBand,drillNoBand,partNoBand}`,
  `ielts.writingResult.{writingBand,singleTaskNoBand,task2Double}`,
  `dictation.stats.*` leftovers, `dictation.meta.reviewSubtitle`,
  `dictation.landing.favoritesLink`, `dictation.browse.card.practiceAgain`,
  `dictation.results.firstTryAccuracy`, `common.journey.{showMore,hideMore}`,
  `common.errors.serverError`, `grammar.path.{statDue,weakSpots}`,
  `grammar.result.bestStreak`, `vocabulary.stats.{growthEyebrow,focusEyebrow}`,
  `admin.api.accessDenied`. Re-check each with grep (keys read through a
  record like `reasons[x]` are not dead) and delete in EN and VI together.
- `globals.css`: `.day-palette` (`:23`), `--chart-1..5`, `--dark-primary`,
  `--light-gray`, `--dark-gray`, `--destructive-foreground`, `--radius-xl`
  in `:root`, the night block and `@theme inline`; fix
  `docs/06-frontend.md:48,100`.
- Verify: `npx tsc --noEmit`, `npx vitest run src/i18n/messages.test.ts`,
  full `npx vitest run --dir src`, `npx next build` (not at the same time as
  vitest: the machine OOMs).

## 12. Phase J: rules and docs

### 42. Write the new rules down (S)

- `.agents/rules/frontend-ui.md`: due state = `DUE_ICON` (`Brain`), rotate
  only for replay; `SessionEnd stats` slot and compact next stop; errors
  render next to the control that caused them; no whole-card opacity and no
  translucent stacked cards; a disabled control whose reason is hidden is a
  bug (hide it); remove `MilestoneNote` from the shared pieces table.
- Run `/documentlization` for `docs/` (04 API reference, 06 frontend,
  09 IELTS).

## 13. Order, dependencies and parallel lanes

```
A: 1 ─ 2 ─ 3 ─ 4 ─ 5          (shared pieces, sequential, small)
        │   │   │
        │   │   ├──────────► B: 9 (word dialog)        C: 15, 16 (decision buttons)
        │   ├──────────────► B: 12 skeletons used      F: 28 (test page skeleton)
        ├──────────────────► E: 25 (lesson end)        F: 29 (result head)
B: 6 7 8 9 10 11 12          C: 13 14 15 16 17 18
                                   │13
                                   └──► D: 21 (home links)
D: 19 20 21 22               E: 23 24 25 26 27
F: 28 29 30 31 32 33  ──►  G: 34 35 36   (31 and 34 share WritingResult.tsx)
H: 37 38   (any time after A)
I: 39 40 41   (after everything; 40 waits for 6)
J: 42   (last)
```

Independent of each other (can run in any order once Phase A is in): the
dictation lane (B), the vocabulary lane (C), the grammar lane (E), the admin
lane (H). D needs item 13 from C; G needs item 31 from F; I and J go last.

| Lane | Items | Modules touched                                                         | Depends on |
| ---- | ----- | ----------------------------------------------------------------------- | ---------- |
| A    | 1-5   | `components/journey`, `common`, `vocabulary`, `constants`, style guards | -          |
| B    | 6-12  | `components/dictation`, `app/(app)/dictation`                           | A          |
| C    | 13-18 | `components/vocabulary`, `app/(app)/vocabulary`                         | A          |
| D    | 19-22 | `components/home`, `components/common`                                  | A, item 13 |
| E    | 23-27 | `components/grammar`, `app/(app)/grammar`                               | A          |
| F    | 28-33 | `components/ielts`, `app/(app)/ielts`                                   | A          |
| G    | 34-36 | `modules/ielts`, `lib/ai`, `components/ielts/review`                    | F (31)     |
| H    | 37-38 | `app/admin`, admin components                                           | A          |
| I    | 39-41 | everywhere, `i18n`, `globals.css`, `app/api`                            | all above  |
| J    | 42    | `.agents/rules`, `docs`                                                 | I          |

Conflict flags: every lane adds EN/VI keys, so parallel worktrees will
conflict in `src/i18n/messages/{en,vi}/*.ts`; B and F both touch
`QuickVocabLookup` consumers (item 9 changes a component the IELTS runner
hosts). One implementer working in order avoids all of it; if lanes run in
parallel, merge A first, then B, C, E, H in parallel, then D, F, G, then I, J.

## 14. What already exists (reuse, do not rebuild)

- `JourneyCard`, `ContinueFloat` (`persistent`, `nudge`, `onBeforeJump`,
  `fallbackId`), `NextStopCard` (`compact`, `done`), `StatChip`/`StatStrip`,
  `SessionEnd`, `EmptyState`, `InlineNotice`, `IconButton`, `ActionButton`,
  `ContentPanel action`, `PageHeader actions`, `SkeletonPageShell`.
- `TopicContinueFloat` (open fold, scroll, focus, bounce): the model for any
  new persistent float.
- `VocabularySearchPanel`: compact result, picked decision style,
  `lookupError` under the box.
- `pickNextStop`, `nextHref(PathNext)`, `nextSkillOf`, `advanceTopicRecord`,
  `advanceGardenPosition`, `advanceUnitSummary`.
- `recomputeReviewItemsForSegment` (already called by the attempts route):
  the review deep link reuses it instead of a new "complete" endpoint.
- `debriefPrompt.ts` language handling: the model for the examiner.
- `expectLandingBudget` and `styleGuards.test.ts`: extend, do not fork.

## 15. NOT in scope

- Anything in the digest's "Already fixed" columns.
- The AI provider migration and the Google sign-in work (other sessions),
  including `FavoriteButton.tsx:16` and `favorites/page.tsx:33` still sending
  guests through `/api/auth/signin?callbackUrl=/dictation`: flagged to the
  sign-in session, which owns `loginUrlFor`.
- Hand-rolled leave/submit dialogs that could use `ConfirmDialog`
  (`LessonPlayer.tsx:426-452`, IELTS runners, `ResetPartButton`,
  `DeleteAttemptButton`): a house-rule cleanup, not one of P1 to P11.
- IELTS exam-paper widgets (they mimic the paper test on purpose).
- Plural-aware unit strings ("1 steps taken"): needs plural objects in every
  module; separate copy pass.
- The open questions at the end of section 2.

## 16. Test plan

Commands: `npx vitest run --dir src` (all), `npx tsc --noEmit`,
`npx eslint src`, `npx prettier --check <changed files>`, `npx next build`
(never at the same time as the full vitest), `npx playwright test
src/modules/dictation/dictationReview.e2e.ts` for item 6.

```
CODE PATHS (new or changed)                          USER FLOWS
[A] DUE_ICON guard ............ styleGuards.test      [6] review row -> weak sentence -> solved
[A] SessionEnd stats slot ..... SessionEnd.test           [→E2E] dictationReview.e2e.ts
[A] VocabDecisionButtons ...... new test                   [GAP today] foreign segment id ignored
    picked / no-op / error                                 [GAP today] finished video stays finished
[6] practice?segment parse .... page test (own/foreign/missing)
[6] shell review mode ......... reducer test (no position write, N left)
[13] ?recall=1 ................ dashboard test (opens once, empty queue)
[14] landing budget both states  VocabularyLanding.test
[24] passed checkpoint static . GrammarPath.test
[25] lesson end next stop ..... PlayerResult.test (+1 / replay +0)
[28] one ink Go on next skill . test page test (none when all banded)
[30] Wrong filter inline ...... ObjectiveResult.test
[31] WritingResult branches ... error by button, no sample, blank, locked lesson
[34] examiner language ........ examinerPrompt.test (EN, VI) [→EVAL manual]
     legacy feedback = 'vi' ... WritingResult.test (Grade again only on mismatch)
[35] error codes .............. gradeWritingService.test
[39-41] deletions ............. tsc + messages.test + full vitest + build
```

Regression tests that must be added (existing behaviour changed): item 6
(finished video still opens on "Done" without `?segment`), item 14 (due state
keeps its next stop), item 24 (locked and current checkpoints still link as
before), item 34 (feedback without `language` still renders).

Browser pass after each phase: the touched routes at 1280px and 375px, day
and night; for items that create data (IELTS runners, grading, recall, review
deep link) use a test account, not the owner's.

## 17. Failure modes

| Item | Realistic failure                                                                      | Test                                    | Handling                         | User sees                         |
| ---- | -------------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------- | --------------------------------- |
| 6    | Review mode writes `currentSegmentOrder`, the learner's real practice position rewinds | reducer test                            | review mode never saves position | nothing (covered)                 |
| 6    | `?segment` of another user's video                                                     | page test                               | ignored, normal practice         | normal page                       |
| 13   | `?recall=1` with no due cards                                                          | dashboard test                          | modal empty state                | "nothing due"                     |
| 14   | Float target inside a transformed deck card never measures                             | float has `fallbackId` = deck           | float points at the deck         | float works                       |
| 34   | Provider ignores the language line                                                     | manual eval                             | none automatic                   | wrong language, can "Grade again" |
| 34   | "Grade again" spends the daily limit silently                                          | `WritingResult` test                    | button says it uses one grading  | clear                             |
| 40   | An external script calls a deleted API                                                 | grep `scripts/`, docs                   | none                             | script 404s (owner-only)          |
| 41   | A key read dynamically gets deleted                                                    | `tsc` (typed catalogues), messages test | build fails before merge         | nothing                           |

No critical gaps (every new path has a test or a typed guard).

## 18. Implementation tasks (checklist)

- [ ] 1 (S) Due icon + guard
- [ ] 2 (M) SessionEnd stats slot
- [ ] 3 (S-M) skeletons
- [ ] 4 (M) VocabDecisionButtons
- [ ] 5 (S) affordance sweep
- [ ] 6 (L) review deep link
- [ ] 7 (S-M) debrief panel
- [ ] 8 (M) practice screen
- [ ] 9 (S) word dialog
- [ ] 10 (S) results empty state
- [ ] 11 (M) dictation journey step
- [ ] 12 (S) dictation small fixes
- [ ] 13 (S) recall deep link
- [ ] 14 (M) vocab landing float
- [ ] 15 (M) vocab feedback in place
- [ ] 16 (S) explore deck
- [ ] 17 (M) word list
- [ ] 18 (S) recall modal + skeleton
- [ ] 19 (S) account menu
- [ ] 20 (S) shell comment
- [ ] 21 (S-M) home simple
- [ ] 22 (S-M) home full
- [ ] 23 (S) float nudge
- [ ] 24 (S) static passed checkpoint
- [ ] 25 (M) lesson end
- [ ] 26 (S) notes page
- [ ] 27 (S) pass mark chip
- [ ] 28 (M) IELTS test page
- [ ] 29 (M) result head
- [ ] 30 (M-L) review table
- [ ] 31 (M) writing result
- [ ] 32 (M) runner
- [ ] 33 (S) drawer rows
- [ ] 34 (M) examiner language
- [ ] 35 (S) error codes
- [ ] 36 (S) assist language
- [ ] 37 (S-M) admin layout
- [ ] 38 (M) admin errors
- [ ] 39 (S-M) dead components
- [ ] 40 (M) dead APIs
- [ ] 41 (M) dead config/keys/CSS
- [ ] 42 (S) rules and docs

Source audits (raw findings with quoted code, outside the repo):
`~/.config/Claude/side-session-notes/local_62294925-e801-4c45-bf31-b9f1a4c379d6/followup-audit-*.md`.

## GSTACK REVIEW REPORT

| Review        | Trigger               | Why                             | Runs | Status       | Findings                                     |
| ------------- | --------------------- | ------------------------------- | ---- | ------------ | -------------------------------------------- |
| CEO Review    | `/plan-ceo-review`    | Scope & strategy                | 0    | -            | -                                            |
| Codex Review  | `/codex review`       | Independent 2nd opinion         | 0    | -            | -                                            |
| Eng Review    | `/plan-eng-review`    | Architecture & tests (required) | 1    | CLEAR (PLAN) | 42 items, 2 owner decisions, 0 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps                      | 0    | -            | -                                            |
| DX Review     | `/plan-devex-review`  | Developer experience gaps       | 0    | -            | -                                            |

- **VERDICT:** ENG CLEARED - ready to implement. Product defaults D3 to D10
  stand unless the owner overturns them before the item starts.

NO UNRESOLVED DECISIONS
