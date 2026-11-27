# UI plan: calm pages, progress you can feel (whole app)

Date: 2026-11-28. Status: plan, reviewed with `/plan-eng-review` on 2026-11-28 (section 8);
not started.
Scope: every learner-facing route, plus a consistency pass on admin.
Baseline: the uncommitted working tree on `main` after commit `4479c16`
(home, IELTS home, dictation landing, vocabulary dashboard and grammar path
already reworked in this session's sibling work).

Who runs this: one implementation session follows sections 5 and 6 in phase
order, then one review session checks every acceptance criterion in section
6 and the guards in section 7. Neither needs the conversation that produced
this plan: everything they need is here or in `.agents/rules/`.

## 0. TL;DR

- One page skeleton for every module landing: title in the topbar, one
  journey card (how far you came, the module's own metaphor, the next
  milestone, at most 4 stat chips, one Next stop), an optional side drawer
  for history and weak spots, then the module's browse area. Nothing else
  above the fold.
- Build the skeleton once as shared primitives in `src/components/journey/`
  (Phase 1), then move the five reworked landings onto it (Phase 2) so they
  stop drifting apart, then bring every sub-page and session-end screen in
  line (Phases 3 to 5), then phone, loading and admin polish (Phases 6, 7).
- Every session ends on a high: a shared `SessionEnd` block leads with what
  went right and the journey step just taken, then the fix-up list, then one
  next stop (peak-end rule).
- Guards in tests keep it that way: one `cta` per landing, no hand-typed
  radii, clickable stat chips pop and static ones do not, shared strings in
  one `common.journey` namespace.

## 1. What the owner asked for (synthesised review notes)

The owner reviewed the app page by page in this session. Their notes, as
rules:

1. **Less is more (choice overload).** Too many components and details
   overwhelm; with too many choices and features people pick nothing and
   give up. Pages are minimal but complete.
2. **Progress you can feel (Duolingo-style).** Show every small step of
   progress and the milestones, so the learner feels they are moving and
   wants to go on. Each module has its own journey metaphor, never a grid of
   identical cards:
   - Grammar: a winding path of lessons plus a CEFR staircase.
   - IELTS: a trail with milestones (Camp, Ridge, Peak, Summit) plus books as
     metro lines of test stations.
   - Dictation: a listening "tracks" scrubber plus topics as vinyl records on
     shelves.
   - Vocabulary: a word garden that grows through CEFR-like stages (seed to
     forest).
3. **A persistent shell that never blinks.** The account avatar loads once
   (root layout `AccountProvider`) and sits at the foot of the rail as a
   squircle with a gradient ring, distinct from the round theme and language
   toggles, which also live at the bottom of the rail. Only Home repeats the
   account as a chip in the topbar. Rail items unroll their label on hover
   (no tooltips).
4. **Home has a simple / full switch** (icon only, label on hover). Simple
   has fewer data points, bigger icons and type, but still feels full. The
   module pills beside the title stay plain names: no numbers in navigation.
5. **Clickable vs static is obvious.** Everything clickable gets the light
   `hover-pop`; static stats never do. Stats carry small icons (star, tick)
   so they feel alive.
6. **Remove what adds little.** Already removed: the grammar side index and
   open / close-all buttons; IELTS search, filters and the admin Manage
   button; the IELTS page heading moved into the topbar to save space.
7. **Progressive disclosure.** IELTS recent attempts and weak spots live in a
   side card hidden by default, slid out by a double-arrow handle straddling
   the journey card's edge; recent attempts first.
8. **One obvious next action per page** ("Next stop"), and a small floating
   Continue button (grammar, IELTS) that only scrolls to where the learner
   is.
9. **Consistency beats one-off polish.** The owner cannot review every page
   piece by piece, so the plan must make pages consistent by construction.

## 2. Principles and how they apply here

Each row: the principle, one source, and what it means for this app. The
"Rule" column is the testable form the implementation and review sessions
check against.

### 2.1 Fewer choices, one prompt

| #   | Principle                    | Source                                                                                                                                                                                                    | Applies here                                                                                                                                                                                          | Rule                                                                                                                                                                                                    |
| --- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | Hick's law                   | Hick 1952, "On the rate of gain of information"; Hyman 1953                                                                                                                                               | Decision time grows with the number of equal-weight options. A landing page with 3 header buttons, 4 stat links, a next-stop card and 5 flow links asks the learner to scan 13 targets before acting. | Above the fold of a module landing: at most 1 primary action and at most 4 secondary targets.                                                                                                           |
| P2  | Choice overload              | Iyengar and Lepper 2000 (jam study); Chernev, Bockenholt and Goodman 2015 meta-analysis (J. Consumer Psychology): overload grows with task difficulty, preference uncertainty and a goal of saving effort | A tired learner opening the app after work is the textbook case: unsure what to study, wants low effort. That is exactly when overload causes deferral ("I'll do it later").                          | The app chooses for them: every landing names one next stop. Browsing (all topics, all tests, all words) sits below it.                                                                                 |
| P3  | Fogg behaviour model (B=MAP) | Fogg 2009, "A behavior model for persuasive design"                                                                                                                                                       | Behaviour happens when motivation, ability and a prompt meet. We cannot raise motivation much, but we can raise ability (one click into the exact exercise) and give one clear prompt.                | The next-stop link goes straight into the work screen (practice, lesson, skill), never to another chooser page.                                                                                         |
| P4  | Von Restorff (isolation)     | von Restorff 1933                                                                                                                                                                                         | The one item that looks different gets noticed and remembered. Today several pages have two or three `cta` (near-black) pills.                                                                        | Exactly one `tone="ink"` / `bg-cta` control per screen region at a time (the next stop or the floating Continue, not both visible at once).                                                             |
| P5  | Progressive disclosure       | Nielsen 2006, "Progressive Disclosure" (NN/g); Carroll and Rosson 1987, "paradox of the active user"                                                                                                      | Show what most visits need; fold what some visits need (history, weak spots, settings, filters) behind one obvious handle.                                                                            | Secondary panels start closed, open with one control, remember nothing surprising, and never hide the next stop.                                                                                        |
| P6  | Defaults                     | Johnson and Goldstein 2003, "Do defaults save lives?"                                                                                                                                                     | A sensible default is a choice the learner does not have to make: home opens in the simple view, practice settings start with the most common setup, the recall session starts with due words.        | Every chooser has a preselected, labelled default; reset returns to it.                                                                                                                                 |
| P7  | Recognition over recall (UI) | Nielsen 1994, ten usability heuristics (#6)                                                                                                                                                               | Icons alone work only when unmistakable. Module icons and tick / cross are; "flow" icons on vocabulary statuses are not without the word.                                                             | An icon-only control has a visible label on hover or focus (rail unroll pattern) and an `aria-label`; static stat icons always sit beside a number whose label is reachable (`dt`, `sr-only` or title). |
| P8  | Cognitive load and chunking  | Miller 1956; Cowan 2001 (working memory about 4 chunks); Sweller 1988 (cognitive load theory)                                                                                                             | Four chunks is the real budget, not seven. A stat strip of 4 is fine; 6 numbers plus a chart is not.                                                                                                  | A stat strip holds at most 4 chips. A page holds at most 4 visible top-level sections before the browse area.                                                                                           |
| P9  | Jakob's law / consistency    | Nielsen 2000, "Jakob's law of internet user experience"; Nielsen heuristic #4                                                                                                                             | Learners spend most of their time in other apps (Duolingo, Anki, YouTube), and within this app they learn one module and expect the others to behave alike.                                           | Every module landing uses the same skeleton (section 5.1). Same thing, same place, same look.                                                                                                           |

### 2.2 Progress you can feel

| #   | Principle                             | Source                                                                                                                                                                                                                                  | Applies here                                                                                                                                       | Rule                                                                                                                                                                      |
| --- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P10 | Goal-gradient effect                  | Hull 1932; Kivetz, Urminsky and Zheng 2006, "The goal-gradient hypothesis resurrected" (J. Marketing Research)                                                                                                                          | Effort speeds up as the goal gets close. "3 lessons to finish A2" pulls harder than "42%".                                                         | Every journey names the next milestone and the steps left to it, as a count, not a percentage.                                                                            |
| P11 | Endowed progress effect               | Nunes and Dreze 2006, "The endowed progress effect" (J. Consumer Research)                                                                                                                                                              | A card with 2 of 10 stamps already filled gets finished more often than a blank 8-stamp card. A brand new learner should never see an empty trail. | Journeys count something already done for a new learner (placement, the first step being "open the module") and show "how far you came" before "what is left".            |
| P12 | Small wins / progress principle       | Amabile and Kramer 2011, "The Progress Principle"; Weick 1984, "Small wins"                                                                                                                                                             | Of all events in a day, making progress in meaningful work lifts motivation the most, even small progress.                                         | Units of progress are small: one clip, one sentence, one lesson, one skill with a band, one word moved a stage. Each one visibly moves something.                         |
| P13 | Zeigarnik and Ovsiankina effects      | Zeigarnik 1927; Ovsiankina 1928; Ghibellini and Meier 2025 meta-analysis (Humanities and Social Sciences Communications 12:962): the urge to resume an interrupted task (Ovsiankina) is robust, better memory for it (Zeigarnik) is not | A half-done video, lesson or test pulls the learner back to finish it. Lean on resumption, not on "you will keep thinking about it".               | "Resume where you left off" beats "start something new" when choosing the next stop, and the resume link lands exactly where they stopped.                                |
| P14 | Goal setting                          | Locke and Latham 2002, "Building a practically useful theory of goal setting" (American Psychologist)                                                                                                                                   | Specific, near goals beat "do your best". A weekly or daily target gives a frame for each small win.                                               | Milestones are concrete ("Camp", "A2 done", "Sapling"), not abstract levels. A daily target is optional and never punitive (open question Q3).                            |
| P15 | Fresh start effect                    | Dai, Milkman and Riis 2014 (Management Science)                                                                                                                                                                                         | People restart after temporal landmarks (Monday, a new month). A learner who missed a week should feel a new beginning, not a debt.                | After a gap, greet with "new week" framing and today's small step; never show a growing backlog as the headline.                                                          |
| P16 | Streaks, loss aversion handled gently | Kahneman and Tversky 1979 (loss aversion); Silverman and Barasch 2023, "On or off track: how (broken) streaks affect consumer decisions" (J. Consumer Research)                                                                         | Intact streaks raise engagement, broken ones lower it, more so when people blame themselves and less when the streak can be repaired.              | Show the streak as a quiet chip. On a break: no red, no "you lost", no loss count; show the best streak and that today starts a new one. Repair is an open question (Q4). |
| P17 | Peak-end rule                         | Kahneman, Fredrickson, Schreiber and Redelmeier 1993; Fredrickson and Kahneman 1993                                                                                                                                                     | A session is remembered by its best moment and its end. Ending on a list of mistakes makes the whole session feel bad.                             | Every session end (lesson, recall, video, test) leads with what went right and the progress made (a step on the journey), then the fix-up list, then one next stop.       |
| P18 | Immediate, specific feedback          | Hattie and Timperley 2007, "The power of feedback" (Review of Educational Research); Shute 2008                                                                                                                                         | Feedback helps when it says what was right or wrong and what to do next, at the moment of the answer.                                              | Every answer shows tick / cross at once with the correct form; results pages say which item types to practise, with a link.                                               |

### 2.3 Learning science

| #   | Principle                           | Source                                                                                                                                         | Applies here                                                                                                                                                              | Rule                                                                                                                                        |
| --- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| P19 | Spaced repetition                   | Ebbinghaus 1885; Cepeda et al. 2006 meta-analysis (Psychological Bulletin)                                                                     | Vocabulary recall, dictation review and grammar review already schedule items. The due count is the most valuable number on home.                                         | Due reviews win the next stop over new material when they exist (already the rule on home simple view; extend to every module).             |
| P20 | Retrieval practice (testing effect) | Roediger and Karpicke 2006 (Psychological Science)                                                                                             | Recalling beats rereading. Notes and transcripts are support, not the activity.                                                                                           | Notes, transcripts and sample answers are folded until asked for; the default action is always a recall or production task.                 |
| P21 | Desirable difficulty                | Bjork 1994; Bjork and Bjork 2011                                                                                                               | Some struggle helps memory, but only if success stays likely. Weak spots and checkpoints are the right kind of hard.                                                      | Show difficulty as a choice the learner sees coming ("Checkpoint", "Weak spots"), never as a surprise; keep the expected success rate high. |
| P22 | Interleaving                        | Rohrer and Taylor 2007; Kornell and Bjork 2008                                                                                                 | Mixing item types beats blocks. Grammar practice and IELTS drill already mix.                                                                                             | Review / practice sessions mix sources by default.                                                                                          |
| P23 | Self-determination theory           | Deci and Ryan 2000 (American Psychologist)                                                                                                     | Autonomy (I choose), competence (I am getting better), relatedness (someone is with me: the buddy mascot).                                                                | One recommended next stop, but every other path stays one click away (browse below). Competence is shown as mastery, not rank.              |
| P24 | Self-efficacy                       | Bandura 1977                                                                                                                                   | Past success is the strongest source of belief in the next success.                                                                                                       | Lead with "how far you have come" (count done), then what is left.                                                                          |
| P25 | Habit loop without variable rewards | Wood and Neal 2007 (Psychological Review); Lally et al. 2010 (habit formation takes 18 to 254 days); critique of variable rewards in Eyal 2014 | Cue (opening the app shows today's step), routine (the step), reward (the journey visibly moves). No loot boxes, random bonuses, fake urgency or confetti on every click. | Rewards are informational (progress moved) and predictable. Celebration is reserved for milestones.                                         |
| P26 | Implementation intentions           | Gollwitzer 1999 (American Psychologist)                                                                                                        | "When I open the app, I do my due words first" is a plan the UI can embody: the same first step in the same place every day.                                              | The next stop sits in the same spot on every landing, so the habit is "open, click the pink-pinned card".                                   |

### 2.4 Interface craft

| #   | Principle                     | Source                                                                           | Applies here                                                                                                                            | Rule                                                                                                      |
| --- | ----------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| P27 | Fitts's law and touch targets | Fitts 1954; WCAG 2.2 SC 2.5.8 (24px minimum); Apple HIG and Material (44 / 48px) | The phone tab bar, the floating Continue and row actions are touched with a thumb.                                                      | Every touch target is at least 44 x 44 px on phones (`min-h-11`); the primary action sits in thumb reach. |
| P28 | Aesthetic-usability effect    | Kurosu and Kashimura 1995                                                        | A calm, polished page is perceived as easier and forgives small friction. This is why consistency of radius, colour and motion matters. | Tokens, corner roles and motion helpers only; no one-off radii or colours (section 5.6 guard).            |
| P29 | Signifiers / affordance       | Norman 2013, "The Design of Everyday Things" (rev. ed.)                          | Learners must tell clickable from static at a glance: the owner's `hover-pop` rule.                                                     | Every clickable has `hover-pop` (or is a primitive that carries it); no static block has it.              |
| P30 | Doherty threshold             | Doherty and Thadani 1982 (IBM)                                                   | Responses under 400 ms keep flow. Skeletons must match the page so nothing jumps, and avatars and rails must not blink.                 | Each landing's `loading.tsx` uses the same skeleton shape as the page; shell parts never remount.         |
| P31 | Serial position effect        | Ebbinghaus 1913; Murdock 1962                                                    | First and last items in a list are remembered best.                                                                                     | Next stop first; the last thing on the page is the "browse everything" area, never a disclaimer wall.     |

## 3. Where the five reworked landings disagree

The reworked pages are good one by one, but they were built one at a time
and already drift. This is the core consistency problem the plan fixes.

| Aspect           | Home (simple)                           | Grammar path                                             | IELTS home                                           | Dictation landing                                 | Vocabulary dashboard                                         |
| ---------------- | --------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------ |
| Page title       | topbar greeting                         | `PageHeader` in the board                                | topbar `aside` from md, `PageHeader` on phones       | `PageHeader` + 3 action pills                     | `PageHeader` + 1 action pill                                 |
| Hero             | "Up next" list + focus card             | `GrammarJourneyHero` (staircase)                         | `JourneyHero` (trail)                                | `ListeningJourneyHero` (scrubber)                 | `WordGardenHero` (stages)                                    |
| Stats            | 3 big rows (`size-12` icon, `text-3xl`) | 4 cards with label (`rounded-2xl`, `size-9` icon circle) | 4 icon-only pills (`rounded-full`, label in `title`) | 4 cards with label (`rounded-2xl`, icon circle)   | 3 "today" cards (bare icon) + a 5-link "flow" nav            |
| Next stop        | focus card, `ink` button                | right card, `ink` button                                 | inline link row inside the hero                      | right card, `ink` button                          | none in the hero; a separate `VocabularyRecallLauncher` card |
| Side info        | buddy card                              | none                                                     | drawer (recent attempts, weak spots)                 | `InProgressSection` open below the hero           | `VocabularyStatsOverview` + Search + Explore panels          |
| Continue float   | none                                    | inline copy in `GrammarPath.tsx:658`                     | `ContinueFloat`                                      | none                                              | none                                                         |
| Hand-typed radii | `rounded-[26px]`                        | `rounded-2xl`, `rounded-3xl`, `rounded-[24px]`           | `rounded-[20px]`, `rounded-[22px]`                   | `rounded-[22px]`, `rounded-[24px]`, `rounded-2xl` | `rounded-[24px]`, `rounded-2xl`                              |
| Loading skeleton | old full desk (`src/app/loading.tsx`)   | old sidebar layout                                       | old filter bar + card grid                           | old video grid + tiles                            | `SkeletonHero` + panels                                      |

## 4. Page-by-page audit

Format per page: **Cut** (remove, merge, fold, move), **Progress** (missing
small steps, milestone, next stop, session end), **Fix** (consistency and
rule breaks). Line numbers are from the working tree on 2026-11-28. The two
raw audits behind this section are kept outside the repo in the session
notes folder; everything needed is condensed here.

### 4.1 Shell (every page)

- **Cut**
  - Phone topbar shows the app name plus a per-page subtitle, and the
    `PageHeader` below repeats a title and subtitle: two titles stacked
    (`AppTopbar.tsx:118-171`). Drop the per-page `subtitle` on phones; keep
    the tagline only on home.
  - `TopbarMenuSheet.tsx:150-182` repeats the module links that `AppTabBar`
    already shows. The sheet becomes "Account": account, language, theme.
- **Progress**: `AppTabBar` has no due signal. A small dot (not a number:
  owner rule "no numbers in navigation") on a tab when that module has due
  reviews is a cheap next-stop cue on phones. Open question Q6.
- **Fix**
  - EN/VI pill is only inside the sheet; `frontend-ui.md` says it sits beside
    the day / night toggle in the phone topbar. Either move it or update the
    rule (Q7).
  - `AppTabBar.tsx:32` hard-coded shadow `rgba(0,0,0,0.45)`: make a token.
  - `AppTopbar.tsx:137` logo `rounded-2xl`: corner role.
  - `RouteError.tsx:252-264` raw button and link without `hover-pop`,
    `rounded-3xl` image.
  - No `error.tsx` under `vocabulary/`, `grammar/`, `admin/`, and no root
    `src/app/error.tsx`.
  - Dead code: `src/components/ui/ModuleCard.tsx` (+ test),
    `src/components/dictation/DictationGlobalStats.tsx`,
    `src/components/dictation/DictationTranscriptDrawer.tsx` (+ test).

### 4.2 Home `/` (simple and full)

- **Cut**
  - Full view has 7 blocks: progress tiles, module tiles, weak words,
    counters (videos, streak, words), plan (6 items), schedule, buddy. The
    streak shows in the buddy and in the counters; due counts show in the
    subtitle, the plan and the schedule. Merge schedule into plan, drop the
    counters card (buddy keeps the streak), keep at most 5 blocks.
  - "Learning progress" link (`HomeStudyDesk.tsx:371`) and a plan link
    (`:289`) go to `/dictation/stats`, which only redirects to `/dictation`.
    Point them at `/dictation` or drop them.
- **Progress**
  - Simple view: the focus card picks "most due" or "next grammar lesson"; it
    ignores unfinished work (P13). Add resume (half-done video, IELTS attempt
    in progress) as rule 1 of section 5.4 once the data is exposed.
  - Home has no "today" sense of progress: the up-next rows do not change
    when a module is cleared today. Proposal: each row shows a tick once its
    due count reaches 0 (data exists: due counts), and the header chip reads
    "All clear" (exists). A daily goal ring is an open question (Q3).
- **Fix**
  - Focus card is a hand-built next stop; numbers are a third stat style.
    Move both to `NextStopCard` and `StatChip` (big size variant allowed on
    home simple, same component).
  - `src/app/loading.tsx` mirrors the old full desk; default view is simple.
  - `rounded-[26px]`, `rounded-2xl` in `HomeSimpleView.tsx`,
    `HomeStudyDesk.tsx`, `HomeBuddyCard.tsx`, `HomeModuleTiles.tsx`.
  - "Learning progress" link uses `hover:bg-tint-soft`, not `hover-pop`.

### 4.3 Dictation

**Landing `/dictation`** (reworked)

- **Cut**: 3 header pills (Latest results, Full stats, Favorites) compete
  with the Next stop; "Full stats" is a dead link. Remove all three header
  actions: latest results and favorites move into the side drawer
  (`SideDrawer`, like IELTS: "Recent" first, then "Favorites"), stats is
  gone. `InProgressSection` (open by default) duplicates the resume next
  stop: move it into the drawer's "Recent" list.
- **Progress**: good (scrubber, tracks, records). Next stop already follows
  resume, then the topic nearest gold.
- **Fix**: stat cards to `StatChip`; next-stop block to `NextStopCard`;
  `PageTag tone="red"` (pink) in `InProgressSection.tsx` breaks "no module
  wears pink"; radii; `dictation/loading.tsx` draws the old video grid.

**Topic `/dictation/[topicSlug]`**

- **Cut**: Sort select is a no-op without a filter
  (`browseQuery.ts:44-46`): drop it. Level select folds behind the search
  field. The pink "Favorites" header button goes (drawer on the landing has
  favorites). The per-card action pill repeats the card link and the medal
  (`BrowseVideoList.tsx:94-113`): keep the medal or tick only.
- **Progress**: no topic progress here although the landing shows this
  topic as a record with `done/total`. Add a small `JourneyCard` (the record
  disc, "x of y videos", "N to gold", Next stop = first unfinished video).
  Auto-open the section holding that video, fold finished sections. Show
  section `done/total` to guests too (`SectionAccordion.tsx:46` gates it on
  `canFavorite`).
- **Fix**: bug in `BrowsePagination.tsx:34` (drops `sort` only when
  `newest`, but the default is `order`, so page 2 of a "newest" search
  reverts). Missing `hover-pop` on disclosure trigger, pager, star,
  breadcrumb; cards use `hover-lift`. `font-semibold` throughout. Pink
  section tags. Empty topic and "no matches" have no action. Pager targets
  `min-h-9`.

**No-topic and favorites** (`/dictation/no-topic`, `/dictation/favorites`)

- **Cut**: three copies of one shell (header + `BrowseVideoList`): one
  `VideoListPage` template.
- **Progress**: no `done/total`, no "next unplayed" next stop: add both via
  the same small `JourneyCard`.
- **Fix**: favorites icon is lemon (`favorites/page.tsx:76`), the only
  dictation route not in sky; empty states without action; skeleton grid
  columns differ from the real grid (`PageSkeletons.tsx:110-146` vs
  `BrowseVideoList.tsx:161`).

**Practice `/dictation/videos/[videoId]/practice`** (the main work screen)

- **Cut** (17 to 19 controls above the fold today):
  - The 3 switches (show answer immediately, show full answer, shortcut
    hints) move into `DictationSettingsMenu` as checkbox items.
  - "Rewind to first" and "Restart" fold into the same menu.
  - The footer "Sentence 3 of 24" duplicates the toolbar counter: becomes
    the progress strip below.
  - Translation language select moves into the settings menu.
  - Ready panel: one big Start (or Continue) button, no eyebrow and
    description.
- **Progress**:
  - A sentence progress strip under the toolbar (`ui/progress` in sky): done
    sentences of this video, "N to finish".
  - On each correct sentence, a quiet "+1" tick on the strip; no toast spam.
  - Finish panel (peak-end): today it has 4 buttons, two of which go to
    `/dictation`. Becomes `SessionEnd`: sentences written, first-try
    accuracy, the topic record moving one step ("7 of 12, 5 to gold"), one
    `ink` Next stop "Next video in <topic>" (needs a next-video lookup in
    `practice/page.tsx`), secondary "See results". "Repeat" moves to the
    results page.
- **Fix**: verdict words beside the icon (`GuidedAnswerInput.tsx:479-503`)
  become `sr-only`. Touch targets: toolbar icons `size-9`
  (`DictationControls.tsx:199`), status actions `min-h-9`, transcript toggles
  `min-h-8`, hint chips. Raw buttons without `hover-pop` (retry saving, hint
  chips, transcript toggles, segment rows). `rounded-2xl` and
  `border-b-amber-600` in `GuidedAnswerInput.tsx`. Title-case copy ("Back To
  Dictation Lab", "Next Exercise"). Loading uses `SkeletonPageShell` with
  topbar and tab bar while the page is `fullHeight` without them: they flash.
  Setup states show admin links ("Import video") to learners.

**Results `/dictation/videos/[videoId]/results`** (the densest screen)

- **Cut**: completion and first-try appear twice
  (`DictationResultsSummary.tsx:329-343` and `DictationStatsPanel.tsx:46-65`);
  6 tall `MetricTile`s and 4 panels, about 15 numbers. Keep one head; fold
  "Mistake map", "Recovery" and "Missed words" behind one "Details"
  `Collapsible`; keep "Hardest sentences" (actionable). AI debrief becomes a
  `paper` button with the notes field opened on demand.
- **Progress**: `SessionEnd` head: completion ring, first-try % with delta vs
  last time (`firstTryAccuracyTrend` exists), the topic record step, one
  `ink` Next stop (next video, or "Review N weak sentences" when due). Today
  the only `ink` button is "Generate AI debrief".
- **Fix**: no `PageHeader` (only dictation route without one): add with a
  breadcrumb to the topic. Debrief error uses pink `border-brand`, not
  `danger` + icon; raw `requestError.message` shown to the learner.
  Duplicate `formatDuration` (`DictationStatsPanel.tsx:22-37`). `QueueRow`
  used for static numbers looks clickable.

**Review `/dictation/review`**

- **Cut**: the panel title repeats the header; "Open queue" links to the
  page itself; the raw priority number tag is internal; rows past 5 fold.
- **Progress**: no due count, no "cleared x of y", no single start. Add a
  head with the due count and one `ink` "Start review" (walks the due
  sentences in order); done state "All caught up" with the landing's next
  stop.
- **Fix**: `QueueRow` `onClick` variant is a clickable `div role=button`;
  no `hover-pop`; loading subtitle differs from the page's
  (`review/loading.tsx:14` vs `review/page.tsx:52`).

**Stats `/dictation/stats`**: a redirect to `/dictation`. Decision (Phase
0): delete the route and `DictationGlobalStats.tsx`, update the three links
and `AppSidebar.test.tsx:70`. The landing hero carries the useful numbers.

### 4.4 Vocabulary

**Dashboard `/vocabulary`** (reworked)

- **Cut**: below the garden: recall launcher + stats overview side by side,
  then the session summary, then Search + Explore side by side: five
  competing blocks. Target: garden `JourneyCard` whose Next stop is the
  recall session (launcher folds into it: "12 words due, next: <word>",
  Start); the "How a word grows" flow nav and the growth chart move into the
  side drawer ("Garden" tab: flow links with counts, growth, hardest words);
  Search becomes one field in the browse area; Explore becomes the Next stop
  when nothing is due ("Plant new words") and otherwise one row "Find new
  words" that opens the deck.
- **Progress**: garden stages are good. Add the endowed start (a new learner
  sees "seed: 1 of 5 steps done" rather than an empty garden, P11).
- **Fix**: "today" cards to `StatChip`; error and status banners to
  `InlineNotice`; radii; `text-[11px]`.

**Word list `/vocabulary/words`**

- **Cut**: custom page-size number input and the per-page select (7
  options): one fixed page size, pager at the bottom. Row actions: show only
  the move that changes something (learning word: "Already know"; known
  word: "Learn it"), not one disabled plus one enabled. Frequency rank and
  source fold into a details line.
- **Progress**: stage as `StepDots` toward mastered (2 of 5 filled). View
  pills carry counts (the dashboard builds them in `vocabStatusLinks`). "Due
  today" view offers "Start recall".
- **Fix**: pills lack `hover-pop`; internal link opened with raw
  `<a target="_blank">`; `text-[11px]`; row buttons `min-h-9`; "Already know"
  is a tick here and a cross in Explore (one icon). Empty state needs an
  action. Long list has no search (owner rule "long lists get a jump aid"):
  the search field from the dashboard filters this list too.

**Search and Explore panels**

- Search result cards are not clickable (`VocabularySearchPanel.tsx:155-178`):
  make each a button that loads the entry, or drop the grid.
- Explore map: one 20px square per card is dozens of tiny targets (Hick's
  law, Fitts). Replace with a thin progress bar "12 of 40 decided".
- Explore deck cards use `rounded-control` for big cards; clickable
  `article role=button`.

**Recall modal and session end**

- **Cut**: "Review 3 / 12" text plus the bar say the same thing; keep the
  bar. The "Stage n" chip clashes with garden stages (two meanings of
  "stage" on one page): rename the recall step to "Box n" or show
  `StepDots`. Launcher's 6 preview chips: one "Next: <word>" line.
- **Progress**: after each answer the card shows the word's step moving
  (dots 2 to 3, or a trophy when mastered); the text already exists in
  `getRecallStatusMessage` but goes to the page behind the modal. The
  session ends inside the modal with `SessionEnd`: reviewed, correct, moved
  up, mastered, garden delta ("4 words to Sapling",
  `wordGardenPosition()`), `ink` Done, `paper` "Plant new words". Today the
  modal just closes and a `ContentPanel` of 2 to 4 tags appears.
  `VocabRecallSessionSummary` shrinks to the not-saved notice.
- **Fix**: progress bar is a `div` in pink `bg-brand` inside the mint module:
  `ui/progress` in `accent-green`. `rounded-[28px]`, `rounded-3xl`,
  `rounded-2xl`, hard-coded `text-white`. Raw buttons without `hover-pop`.
  Verdict word beside the icon. Sentences built from fragments
  (`VocabRecallModal.tsx:514`, `VocabRecallSessionSummary.tsx:160-166`).

### 4.5 Grammar

**Path `/grammar`** (reworked)

- **Cut**: fine. The hero has 4 stat cards of which 2 are links (review due,
  weak spots): keep, as chips.
- **Progress**: good. The floating "Back to my lesson" is an inline copy of
  `ContinueFloat` with its own measuring.
- **Fix**: title to topbar; stat cards and next-stop card to primitives;
  `rounded-3xl` on unit triggers (`GrammarPath.tsx:358`), `rounded-2xl`;
  `grammar/loading.tsx` still draws the removed side index.

**Lesson player, review, checkpoint, practice** (one `LessonPlayer`)

- **Cut**: already close to minimal (one action, 4 to 5 controls). Verdict
  shown three ways (chip colour, icon pill with a word, 10px left border):
  keep chip + icon, word to `sr-only`. Drop the "press Enter" hint.
- **Progress**: the bar goes backwards after a miss (`LessonPlayer.tsx:88`
  divides by a queue that grows on a wrong answer, `playerReducer.ts:96-115`).
  No step count. No sense of place ("2 lessons to the checkpoint"). Combo
  milestones (3, 5, 10, 15) are good small wins: keep.
- **Fix**: raw progress `div`; combo chip `rounded-tag` (should be a pill);
  `font-bold` and `font-semibold` in many places; `border-l-[10px]`;
  option and word tiles and `SpeakButton` (28px) lack `hover-pop` and 44px.

**Session result** (`PlayerResult.tsx`)

- **Cut**: best streak and time are vanity numbers next to accuracy: quiet
  line. Misses list fully expanded pushes Next below the fold on a phone:
  fold, first miss visible. "Back to path" is a second pill beside Next:
  quiet link.
- **Progress**: no journey line. `unlocked.kind === 'unit'` falls back to
  "Back to path" (`PlayerResult.tsx:222-232`, server returns it in
  `planGrammarSessionWrite.ts:397-400`); replays (`unlocked: null`) also only
  offer "Back to path" although the page holds `path.next`.
- **Fix**: hand-rolled stat `dl` (third stat style); "Redo" and "Retry" call
  `window.location.reload()`; rejected-save box has no icon; `font-bold`.

**Notes `/grammar/lessons/[lessonId]/notes`**

- **Cut**: "Path" button duplicates the rail; eyebrow should be a
  breadcrumb link.
- **Progress**: dead end: add one Next stop at the end (next lesson, or
  "Review now" when due).
- **Fix**: falls back to the path skeleton.

**Loading and errors**: `grammar/loading.tsx` is the old sidebar layout and
also shows for the full-screen player and notes; no `grammar/error.tsx`.

### 4.6 IELTS

**Home `/ielts`** (reworked)

- **Cut**: fine; already the model (topbar title, drawer, trail, metro
  lines, Continue float).
- **Fix**: next stop is an inline link row, not the shared card (keep its
  compactness by using `NextStopCard`'s `compact` variant: decision in
  section 8); stat pills have the label only in `title` (not on touch) ; the
  drawer handle uses `bg-ink text-board` when open (rule break: `bg-cta
text-cta-fg`); `rounded-[20px]`, `rounded-[22px]`; `ielts/loading.tsx`
  still draws the old filter bar and card grid, and also shows for `[slug]`
  and drill.

**Test page `/ielts/[slug]`** (the choice-overload hotspot)

- **Cut**: 3 `SkillLauncher` cards, each with a Practice / Mock toggle,
  3 to 5 radio rows with minute counts, a latest-result link and Go: about
  27 controls and 15 numbers above the fold, no recommended skill. Then a
  full vocabulary carousel. Target: one mode switch for the test, one row
  per skill (recommended one open), minutes only on "Full test", track and
  target badges merged into one line, vocabulary folded behind one row.
- **Progress**: no "skills banded N of 3", no milestone ("Writing clears
  this test"), no band vs target. `nextSkillOf` (`testPath.ts:147`) gives the
  next skill: make it the Next stop.
- **Fix**: `PageHeader` at every width (IELTS home moved its title to the
  topbar); "IELTS" hard-coded in the breadcrumb (`[slug]/page.tsx:151`); raw
  radio inputs instead of `RadioGroup`; mode toggle `h-8`; `SKILL_ICONS`
  duplicated; error text in pink, not `danger` + icon (`TestVocabPanel.tsx`,
  `DrillButton.tsx`); no own `loading.tsx`.

**Runner** (`[slug]/[skill]`, `mock`, `drill/[attemptId]`)

- **Cut**: toolbar has 9 controls on a phone; theme toggle, Reset part and
  Guided go into one "More" menu. Score shown twice after Check.
- **Progress**: no answered count on desktop; `RunnerFooter` has an unused
  `top` slot meant for a question strip: wire it (answered / total for the
  part and the test). Writing: thin bar toward `minWords`. Finishing jumps to
  the result table: the result page's new head carries the peak-end.
- **Fix**: `bg-ink text-surface` on selected segments (pane switcher,
  `ToolbarToggle`, `PartSwitcher`); raw `bg-yellow-100`, `bg-yellow-200`,
  `bg-amber-400` (no night values); `text-muted-foreground`; one-off font
  sizes in chrome; Submit overrides `tone="ink"` with `bg-brand`; many
  controls under 44px; no `hover-pop`; the `fixed inset-0 z-[70]` exam frame
  copied in 4 files; notice bar and confirm dialogs copied between
  `IeltsRunner.tsx` and `WritingRunner.tsx`; drill has no loading and flashes
  the home skeleton. No tests for `IeltsRunner`, `WritingRunner`,
  `RunnerToolbar`, `CheckPartPanel`, `PracticeActions`, `AttemptLoader`.

**Result `/ielts/attempts/[attemptId]`**

- **Cut**: up to 5 tall tiles wrap in a 4-column grid; writing shows the task
  band 3 times; the answer table shows every question with 3 filter buttons
  first and scrolls sideways on phones (`min-w-[560px]`).
- **Progress**: no journey line, no next skill of the same test, no target
  comparison, no delta vs last attempt. The Drill and "Back to test" have
  equal weight.
- **Fix**: hard-coded English criteria names and "Task N"
  (`WritingResult.tsx:69-75`, `:180`, `:300`); filter selected state
  `bg-brand`; `font-semibold`, `text-muted-foreground`, `text-[10px]`;
  disclosure and filter buttons under 44px; raw underlined study link;
  banners without icons; `MetricTile` uses `hover-lift`; no tests.

**Not found**: `ielts/not-found.tsx` is an `ExamCard`, not the `RouteError`
look.

### 4.7 Admin (consistency only, lowest priority)

- Five header patterns: `PageHeader` (dashboard, vocab), hand-built h1
  (dictation), h1 inside the list card (IELTS), giant clamp h1 inside a card
  with a red tag (import, video edit). One `PageHeader` with a breadcrumb
  everywhere; the editor keeps its own `EditorHeader` (work screen).
- `activeHref` inconsistent (`/dictation` on import and edit lights the
  learner tab; `admin/ielts/loading.tsx:13` says `/admin/vocab`).
- Dashboard tiles use `hover-lift`; refresh is a raw button; raw "back"
  text links; 5 tall `MetricTile`s in `AdminVocabPanel` become a
  `StatStrip`; `/ IELTS` hard-coded (`admin/ielts/page.tsx:54`); a one-off
  `bg-cta` footer bar on import.
- Loading skeletons mismatch (`admin/loading.tsx` 5 blocks vs 3 tiles;
  `admin/ielts` list); `admin/ielts/[testId]` has none; no `admin/error.tsx`.

## 5. The shared design: one skeleton, a handful of primitives

### 5.1 The landing skeleton (every module landing, same order)

```
+-- topbar --------------------------------------------------------------+
| logo  app name                         [module icon] Module title      |
|                                                     one-line subtitle  |
+------------------------------------------------------------------------+
| rail |  JOURNEY CARD (module pastel gradient)              | side     |
|      |  +--------------------------------+---------------+ | drawer   |
|      |  | how far: big count + unit      | NEXT STOP     | | (closed  |
|      |  | the module's metaphor          | detail line   | |  by      |
|      |  | "N steps to <milestone>"       | title         | |  default)|
|      |  | [chip][chip][chip][chip]       | [ink button]  |<>          |
|      |  +--------------------------------+---------------+ |          |
|      |                                                                 |
|      |  BROWSE AREA: the metaphor at full length                       |
|      |  (grammar path / IELTS metro lines / record shelves / word list)|
|      |                                          [Continue v] (floating)|
+------------------------------------------------------------------------+
```

Phones: the title stays in the board (`PageHeader`, no actions), the
journey card stacks (headline, metaphor, milestone, chips, then Next stop
full width), the drawer opens below the card, the floating Continue sits
above the tab bar.

Budget per landing above the fold (P1, P4, P8): 1 `cta` button (Next stop),
at most 4 stat chips (of which at most 2 are links), 1 drawer handle, 0
header action buttons. Anything else moves into the drawer, the browse area,
or the account menu.

Why the title moves into the topbar everywhere: the owner did it on IELTS to
save space, and the rule of consistency (P9) says the same thing goes in the
same place on every module. It saves about 90px above the fold on every
landing.

### 5.2 Primitives (new folder `src/components/journey/`)

All are server-safe (no `'use client'`) unless marked, take their text as
props or from `common.journey`, accept `className`, use corner roles and
module tokens only.

| Primitive                | Replaces                                                                                                                                                               | API sketch                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `JourneyCard`            | the four hand-built hero sections (`GrammarJourneyHero`, `ListeningJourneyHero`, `WordGardenHero`, IELTS `JourneyHero`)                                                | `{ module: AppModuleKey; titleId: string; title: string; headline: ReactNode; metaphor: ReactNode; milestone: ReactNode; stats?: ReactNode; nextStop: ReactNode; handle?: ReactNode }`. Paints the module gradient from `MODULE_THEMES`, lays out left column + right Next stop, leaves room for the handle.                                                                                                                                                                   |
| `JourneyHeadline`        | the big "42 lessons passed of 120" blocks                                                                                                                              | `{ value: number; unit: string; total?: string; icon?: LucideIcon }`. One size on every module.                                                                                                                                                                                                                                                                                                                                                                                |
| `MilestoneNote`          | the "3 lessons to finish A2" lines                                                                                                                                     | `{ children }` styled line; text comes from each module's `plural(...)` call.                                                                                                                                                                                                                                                                                                                                                                                                  |
| `StatStrip` + `StatChip` | grammar's 4 stat cards, dictation's 4 stat cards, vocabulary's "today" cards, IELTS icon chips, home simple "numbers", `MetricTile` on stats pages where it is a strip | `StatChip { icon: LucideIcon; label: string; value: string; href?: string; tone?: AppModuleKey; iconClassName? }`. Pill `rounded-full bg-surface/80`, icon in the module accent, value `font-medium tabular-nums`, label visible from `sm` as small text, `sr-only` below. With `href`: a `Link` with `hover-pop soft-press` and a tiny chevron; without: a plain `div` that never pops. `StatStrip` is a `dl`; the 4-chip budget is checked in tests, not at runtime (8.3.1). |
| `NextStopCard`           | the next-stop blocks in grammar, dictation, IELTS (inline link), home simple "focus"                                                                                   | `{ eyebrow?: string; detail?: string; title: string; href: string; actionLabel: string; actionIcon?: LucideIcon; done?: { icon: LucideIcon; text: string } }`. Pin chip "Next stop", detail, title (2 lines max), one `ActionButton tone="ink"`. With `done`, shows the all-clear state instead. Takes an `id` (default `next-stop`) that `ContinueFloat` observes (8.2.4) and carries `data-next-stop` for tests.                                                             |
| `SideDrawer` (client)    | IELTS `JourneyRow` + `ProgressToggle`                                                                                                                                  | `JourneyRow` moves here unchanged in behaviour, renamed `DrawerRow`, with `DrawerHandle { showLabel; hideLabel }` taking text by props. Fix: open state uses `bg-cta text-cta-fg`, not `bg-ink text-board` (rule: never `bg-ink` on a control).                                                                                                                                                                                                                                |
| `ContinueFloat` (client) | IELTS `ContinueFloat` and grammar's inline floating button                                                                                                             | `{ label: string; targetId: string; fallbackId?: string; onBeforeJump?: () => void }`. Uses grammar's scroll + resize measurement (works while a fold animates), shows only while the target is out of view, `aria-controls` not needed. Hidden whenever the `NextStopCard` is in view, so only one `cta` is ever visible (P4).                                                                                                                                                |
| `EmptyState`             | ad-hoc empty paragraphs (favorites, review queue, no tests, no hard words, word list filters)                                                                          | `{ icon or mascot; title; body?; action?: { href; label } }`. Always one next action (rules: empty states offer the next useful action).                                                                                                                                                                                                                                                                                                                                       |
| `SessionEnd`             | grammar `PlayerResult`, vocabulary `VocabRecallSessionSummary`, dictation `DictationResultsSummary` head, IELTS attempt result head                                    | `{ module; headline: { value; unit }; wins: ReactNode; journeyStep?: ReactNode; fixUp?: ReactNode; nextStop: ReactNode }`. Order is fixed by the component: wins first, then the journey step ("+1 on the trail, 2 to Camp"), then fix-up list (folded if long), then one Next stop.                                                                                                                                                                                           |

Smaller shared pieces (same phase, existing folders):

| Piece                          | Where                                     | Replaces                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------ | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Progress` theming             | `src/components/ui/progress.tsx`          | 6+ hand-made bars (`LessonPlayer`, `VocabRecallModal`, hero bars, `AudioPlayer`). Add a `tone` (module accent) and `motion-grow-x`; zero consumers today.                                                                                                                                                                                      |
| `StepDots`                     | `src/components/journey/StepDots.tsx`     | "Stage 2" text on words, recall step chips, sentence ticks. `{ done: number; total: number; label: string }`, static, `role="img"` with label.                                                                                                                                                                                                 |
| `Segmented`                    | `src/components/ui/segmented.tsx`         | 7 segmented toggles with 4 different selected colours (`SkillLauncher`, runner pane switcher, `PartSwitcher`, `ToolbarToggle`, `ObjectiveResult` filter, `ielts/ui.tsx segmentClass`, admin dictation view switch). `aria-pressed` buttons (documented raw exception), selected `bg-cta text-cta-fg`, 44px on phones, `hover-pop` on idle.     |
| `ConfirmDialog`                | `src/components/common/ConfirmDialog.tsx` | leave / submit / restart dialogs in `LessonPlayer`, `IeltsRunner` (2), `WritingRunner` (2), `PracticeActions`, `DictationPracticeShell`, `DictationControls`.                                                                                                                                                                                  |
| `InlineNotice`                 | `src/components/common/InlineNotice.tsx`  | status and error banners (`VocabularyDashboard`, `VocabularyWordList`, `DictationPracticeShell`, `DictationDebriefPanel`, IELTS runner notice bar). `tone: 'info'                                                                                                                                                                              | 'error'`; error always `danger` + icon. |
| `PageHeader` `breadcrumb` prop | `src/components/common/PageHeader.tsx`    | hand-built eyebrow breadcrumbs (IELTS test and result, grammar notes, dictation topic, admin). Items from the catalogue, links with `hover-pop`.                                                                                                                                                                                               |
| `AppTopbar` `page` prop        | `src/components/common/AppTopbar.tsx`     | the IELTS page's hand-built `aside`. `{ module: AppModuleKey; title; subtitle? }` (icon and tint resolved inside from `MODULE_ICONS` / `MODULE_THEMES`: a client component cannot take an icon component from a server page, 8.2.1) renders the title block from md; `PageHeader` gets `inTopbar` and then hides itself from md (`md:hidden`). |
| `SkeletonJourney`              | `src/components/common/PageSkeletons.tsx` | `SkeletonHero` + random panels on landings. Draws the `JourneyCard` shape (left column + Next stop) so nothing jumps. Plus `SkeletonPlayer` (header row, card, footer) for focus screens.                                                                                                                                                      |
| `ExamFrame`                    | `src/components/ielts/ui.tsx`             | the `ielts-exam fixed inset-0 z-[70] flex flex-col` wrapper copied in 4 files.                                                                                                                                                                                                                                                                 |

Shared strings: a new `common.journey` block in
`src/i18n/messages/{en,vi}/common.ts` holds `nextStop`, `youAreHere`,
`continue`, `showMore`, `hideMore`, `allClear`, `stepOf`, `stepTaken`,
`toMilestone` (plural), `details`. Vietnamese reuses the wording already
shipped: "Trạm tiếp theo", "Bạn đang ở đây", "Học tiếp", "Đã xong hết". The
module copies (`grammar.path.nextStop`, `dictation.journey.nextStop`,
`ielts.journey.nextStop`, `ielts.journey.continueFloat`,
`grammar.path.jumpToCurrent`, both `youAreHere`) are deleted once their
callers read `common.journey`.

### 5.3 What stays module-specific

Only the metaphor and the numbers: the staircase and winding path, the trail
and metro lines, the scrubber and record shelves, the garden stages. Each
module keeps a pure helper that computes its journey (`unitSummary.ts`,
`testPath.ts`, `listeningJourney.ts`, `wordGarden.ts`); these already exist
and already have tests.

### 5.4 Choosing the next stop (one rule for every module)

In order, first match wins (P13, P19, P3):

1. Resume: an unfinished item (half-done video, lesson in progress, test
   attempt in progress), deep-linked to where it stopped.
2. Due review, when the module schedules reviews and something is due.
3. The next new step on the journey (next lesson, next skill of the next
   test, the topic nearest its next medal, the next words to plant).
4. All done: the `done` state with a celebration line and a browse link.

Home applies the same rule across modules (simple view already does steps
2 and 3; add step 1 when Phase 5 exposes resume data).

### 5.5 Corners

The reworked components hand-type `rounded-[20px]`, `rounded-[22px]`,
`rounded-[24px]`, `rounded-[26px]` and `rounded-2xl` (53 occurrences in 18
files, `grep -rn "rounded-\[[0-9]*px\]\|rounded-2xl" src`). The rule says
corner roles only. Map them:

- outer cards and the Next stop card: `rounded-panel`;
- tiles and rows inside a card: `rounded-control`;
- chips, pills and buttons: `rounded-full`.

Then a guard test fails on any new `rounded-[Npx]` or `rounded-2xl` /
`rounded-3xl` in `src/components` and `src/app` (allowlist for the IELTS
exam paper and the editor if they need it).

## 6. Phased plan (file level)

Rules for every step:

- i18n: every new string goes into `src/i18n/messages/en/<ns>.ts` and
  `vi/<ns>.ts` together; `src/i18n/messages.test.ts` must pass. Vietnamese
  is natural, full diacritics. No sentence built from fragments.
- No em dash anywhere (code, copy, comments, commits).
- Each phase ends green on `bun run lint`, `bun run format:check`,
  `bun test` (vitest) and, for phases touching routes, `bun run build`.
  Visual check in both themes at 375px and 1280px in the browser for every
  page the phase touches (the owner's rule: verify, do not ask).
- One commit per numbered step (or per small group), message
  `ui(<area>): <what>`; nothing is pushed without the owner.
- "Budget" below means section 5.1's above-the-fold budget, checked by the
  guard tests in section 7.

### Phase 0: Baseline and cheap fixes (half a day)

**0.1 Commit the baseline.** The reworked pages are uncommitted on `main`.
Before Phase 1, the owner commits (or lets the implementation session
commit) the current tree as `ui: calm landings baseline`, so every later
step has a clean diff. Open question Q1 (branch or `main`).

**0.2 Remove dead code.**

- Delete `src/components/ui/ModuleCard.tsx` + `ModuleCard.test.tsx`,
  `src/components/dictation/DictationGlobalStats.tsx`,
  `src/components/dictation/DictationTranscriptDrawer.tsx` + test.
- Delete `src/app/(app)/dictation/stats/page.tsx` (it only redirects) and
  point its three links at `/dictation`: `src/app/(app)/dictation/page.tsx`
  "Full stats" (removed in 2.4 anyway), `HomeStudyDesk.tsx:289`, `:371`.
  Update `AppSidebar.test.tsx:70`. Keep a `redirect` only if the owner has
  bookmarks (Q2: default delete).
- Acceptance: `grep -rn "dictation/stats\|ModuleCard\|DictationGlobalStats\|DictationTranscriptDrawer" src` is empty.

**0.3 Fix two real bugs found by the audit.**

- `src/components/dictation/browse/BrowsePagination.tsx:34`: keep `sort`
  unless it equals the real default (`order`, `browseQuery.ts:36-38`).
  Test: `browseQuery.test.ts` or a new `BrowsePagination.test.tsx` case
  "page 2 keeps sort=newest".
- `src/app/admin/ielts/loading.tsx:13`: `activeHref` to the IELTS admin.

### Phase 1: Shared primitives and guards (1.5 to 2 days)

Nothing visible changes in this phase except where a primitive replaces a
copy one to one. Each primitive lands with its test.

**1.1 `common.journey` strings.** Add the block (section 5.2) to
`src/i18n/messages/{en,vi}/common.ts`. Do not delete module copies yet.

**1.2 `StatChip` + `StatStrip`** in `src/components/journey/`.

- Tests (`StatChip.test.tsx`): with `href` renders a link carrying
  `hover-pop`; without `href` renders no link and no `hover-pop`; label is
  in the accessible name in both cases.

**1.3 `NextStopCard`.**

- Variants: `card` (default, right column of a `JourneyCard`) and `compact`
  (one row: pin, title, button; used where height matters, e.g. IELTS and
  the topic page).
- Tests: exactly one `bg-cta` element; `data-next-stop` present; `done`
  state renders no button and the all-clear text.

**1.4 `JourneyCard`, `JourneyHeadline`, `MilestoneNote`.**

- Gradient from `MODULE_THEMES[module]` (add a `gradient` field there:
  `from-pastel-* to-surface`), `rounded-panel`, `border-line`, room for a
  drawer handle on the right edge when `handle` is passed.
- Tests: renders the section with `aria-labelledby`; headline value and
  unit; slots render in order headline, metaphor, milestone, stats, next.

**1.5 `ContinueFloat`** moved to `src/components/journey/ContinueFloat.tsx`
with the grammar measuring logic (scroll + resize + settle timeout) and the
`onBeforeJump` / `fallbackId` props, and an explicit `nextStopId`: hidden
while that element is in view (P4, decision 8.2.4).

- Tests: hidden when target in view; shows "down" arrow when target below;
  calls `onBeforeJump` before scrolling; hidden when a next-stop card is in
  view (mock `IntersectionObserver` / `getBoundingClientRect`).

**1.6 `SideDrawer`** (`DrawerRow`, `DrawerHandle`) moved from
`src/components/ielts/catalogue/JourneyRow.tsx`, text by props, open state
`bg-cta text-cta-fg`. Keep `JourneyRow.test.tsx` passing by moving it.

**1.7 `EmptyState`, `SessionEnd`, `StepDots`, `InlineNotice`,
`ConfirmDialog`, `Segmented`**, `Progress` tone, `PageHeader breadcrumb`
and `inTopbar`, `AppTopbar page`, `SkeletonJourney`, `SkeletonPlayer`.

- Tests: one file per primitive. `SessionEnd`: order is wins, journey step,
  fix-up, next stop, whatever order the props come in; fix-up longer than 3
  items folds. `Segmented`: selected uses `bg-cta`, `aria-pressed`
  reflects state, min height 44px class present. `PageHeader`: `inTopbar`
  adds `md:hidden`; breadcrumb links carry `hover-pop`.

**1.8 Corner and colour clean-up in the primitives' sources.** Map
`rounded-[Npx]`, `rounded-2xl`, `rounded-3xl` to roles (section 5.5) in the
files the primitives replace; `text-[10px]` / `text-[11px]` in heroes become
`text-xs`.

**1.9 Guard tests** (`src/lib/styleGuards.test.ts`, new cases; see section
7 for the full list).

**1.10 Next-stop rule and advance helpers** (review decisions 8.2.2,
8.2.3). `src/lib/journey/nextStop.ts` (`pickNextStop`) + test; per-module
pure helpers that apply a finished session to the loaded journey
(`advanceTopicRecord` in `listeningJourney.ts`, `advanceGardenPosition` in
`wordGarden.ts`, `advanceUnitSummary` in `unitSummary.ts`) + tests,
including "a replay adds 0".

**1.11 Every new token now** (decision 8.2.5): `--notice`, `--notice-soft`,
`--highlight` (day and night), the tab bar shadow token and the
`MODULE_THEMES` `gradient` field. Phases 3 to 7 add no tokens.

Acceptance for Phase 1: all new tests green; no page looks different except
for radius rounding (visual check of the five landings in both themes).

### Phase 2: The five landings on one skeleton (2 days)

Order: IELTS (closest to the target, proves the primitives), grammar,
dictation, vocabulary, home. Each step: title to the topbar
(`AppTopbar page` + `PageHeader inTopbar`), hero to `JourneyCard`, stats to
`StatChip`, next stop to `NextStopCard`, drawer where listed, `ContinueFloat`
where listed, `loading.tsx` to `SkeletonJourney`, delete the module copies
of shared strings.

**2.1 IELTS home.**

- Files: `src/app/(app)/ielts/page.tsx` (use `page` prop, drop the hand
  `aside`), `IeltsHome.tsx`, `JourneyHero.tsx` (becomes a thin
  `IeltsJourney` that feeds `JourneyCard`: trail as metaphor, `NextStopCard
compact`), `JourneyRow.tsx` (removed, uses `SideDrawer`),
  `ContinueFloat.tsx` (removed, uses shared), `ielts/loading.tsx`.
- Acceptance: looks as today except chip labels visible from `sm`; drawer
  handle open state is `cta`; budget met; no layout jump on load.
- Tests: `JourneyHero.test.tsx`, `JourneyRow.test.tsx` (moved),
  `ProgressTabs.test.tsx`, `TestPath.test.tsx` pass.

**2.2 Grammar path.**

- Files: `src/app/(app)/grammar/page.tsx` (topbar title),
  `GrammarPath.tsx` (inline float replaced by `ContinueFloat` with
  `onBeforeJump` = unfold the unit; `rounded-3xl` to role),
  `GrammarJourneyHero.tsx` (to `JourneyCard`: staircase as metaphor),
  `grammar/loading.tsx` (journey skeleton + one centred column, no side
  index).
- Acceptance: float still unfolds the current unit before scrolling; budget
  met (4 chips, 2 linked); no jump on load.
- Tests: `GrammarPath.test.tsx` updated for the shared float.

**2.3 Dictation landing.**

- Files: `src/app/(app)/dictation/page.tsx` (no header actions; topbar
  title; drawer with "Recent" = in-progress videos + latest result link,
  then "Favorites" link), `ListeningJourneyHero.tsx` (to `JourneyCard`:
  scrubber as metaphor), `InProgressSection.tsx` (rendered inside the
  drawer, pink tag to sky), `dictation/loading.tsx`.
- Acceptance: 0 header pills; the only `cta` is the Next stop; drawer closed
  by default with recent first; no jump on load.
- Tests: `ListeningJourney.test.tsx`, `listeningJourney.test.ts` updated; new
  page-level test optional.

**2.4 Vocabulary dashboard.**

- Files: `VocabularyDashboard.tsx` (layout: `JourneyCard` + drawer + browse
  area; recall launcher folded into the Next stop; Explore as the Next stop
  when nothing is due; Search as one field in the browse area that also
  links to the word list), `WordGardenHero.tsx` (to `JourneyCard`; "How a
  word grows" flow moves to the drawer), `VocabularyStatsOverview.tsx`
  (drawer content), `VocabularyRecallLauncher.tsx` (deleted or reduced to a
  helper that builds the next-stop props), `vocabulary/loading.tsx`.
- Acceptance: above the fold: the garden card and nothing else besides the
  browse search field; 1 `cta`; budget met.
- Tests: `VocabularyDashboard.test.tsx` (786 lines; "Start Recall" moves into
  the Next stop, keep its accessible name), `WordGardenHero.test.tsx`,
  `VocabularyStatsOverview.test.tsx`, `vocabularyCore.e2e.ts`.

**2.5 Home.**

- Files: `HomeSimpleView.tsx` (focus card to `NextStopCard`, numbers to
  `StatChip size="lg"`, up-next rows get a tick at 0 due), `HomeStudyDesk.tsx`
  (full view: merge schedule into plan, drop the counters card, fix the two
  links, radii), `HomeBuddyCard.tsx`, `HomeModuleTiles.tsx` (radii only),
  `src/app/loading.tsx` (simple view skeleton).
- Acceptance: simple view has 1 `cta`; full view has at most 5 blocks; the
  module pills stay plain names (owner note 4).
- Tests: `HomeStudyDesk.test.tsx`, `buddyMood.test.ts`.

### Phase 3: Dictation sub-pages (2 days)

**3.1 Topic page as a record.**

- Files: `src/app/(app)/dictation/[topicSlug]/page.tsx`,
  `BrowseToolbar.tsx` (drop sort, level behind search), `SectionAccordion.tsx`
  (open the section with the next video, fold finished, sky progress, show
  to guests), `BrowseDisclosure.tsx`, `BrowseVideoList.tsx` (drop the action
  pill, `hover-pop`), `BrowsePagination.tsx` (ActionButton links, 44px),
  `FavoriteButton.tsx` (44px), `BrowseBreadcrumb.tsx` (to `PageHeader
breadcrumb`), new `TopicJourney.tsx` (`JourneyCard` with the record disc
  reused from `RecordShelves.tsx`, extract the disc as `RecordDisc`),
  `[topicSlug]/loading.tsx`.
- Acceptance: Next stop = first unfinished video in course order; budget
  met; guests see `done/total`; no `font-semibold`.
- Tests: `SectionAccordion.test.tsx`, `FavoriteButton.test.tsx`,
  `browseQuery.test.ts`, `sectionGroups.test.ts`, new `TopicJourney.test.tsx`
  (next video pick, gold count).

**3.2 One list template for no-topic and favorites.**

- Files: new `src/components/dictation/browse/VideoListPage.tsx`;
  `no-topic/page.tsx`, `favorites/page.tsx` use it (sky icon on both,
  compact `JourneyCard`, `EmptyState` with "Browse topics").
  `PageSkeletons.tsx` video grid columns match `BrowseVideoList`.
- Tests: `TopicGrid.test.tsx`; new `VideoListPage.test.tsx` (empty state
  action).

**3.3 Practice: fewer controls, progress strip, peak end.**

- Files: `DictationPracticeShell.tsx`, `DictationControls.tsx`,
  `DictationSettingsMenu.tsx`, `DictationPracticeHeader.tsx`,
  `GuidedAnswerInput.tsx`, `DictationFullTranscript.tsx`,
  `practice/page.tsx` (next-video lookup in the topic's course order;
  learner-safe setup state without admin links), `practice/loading.tsx`
  (`SkeletonPlayer`, full height, no topbar or tab bar).
- Change: section 4.3 Practice. Settings menu gets the three preferences as
  checkbox items, translation language, rewind to first, restart (restart
  behind `ConfirmDialog`). Progress strip under the toolbar. Finish panel to
  `SessionEnd`. Verdict word to `sr-only`. 44px targets. `hover-pop` on raw
  clickables. Title-case copy fixed in `en/dictation.ts` (and matching VI).
- Acceptance: at most 10 controls above the fold (was 17 to 19); the finish
  screen has exactly 1 `cta` that opens the next video of the topic (or the
  landing's next stop when the topic is done); no topbar flash on load.
- Tests: `DictationPracticeShell.test.tsx` (1464 lines: update 'Shortcut
  hints', 'Rewind to first segment', 'Restart progress', 'Repeat this
  exercise', 'View Results' assertions to their new homes),
  `DictationSettingsMenu.test.tsx` (new items),
  `GuidedAnswerInput.test.tsx` (verdict accessible name),
  `dictationPreferences.test.tsx`.

**3.4 Results: one head, details folded.**

- Files: `results/page.tsx` (add `PageHeader` with breadcrumb),
  `DictationResultsSummary.tsx` (to `SessionEnd`), `DictationStatsPanel.tsx`
  (drop duplicate tiles, "Details" collapsible, shared `formatDuration`),
  `DictationDebriefPanel.tsx` (`paper` button, notes on demand, `InlineNotice`
  error, catalogue error text), `results/loading.tsx`.
- Acceptance: 1 `cta` (next video or weak-sentence review); no number shown
  twice; at most 6 numbers above the fold.
- Tests: `DictationResultsSummary.test.tsx` (labels 'Start Practice',
  'Practice Again', 'Continue Practice' move), `videoStats.test.ts`.

**3.5 Review queue.**

- Files: `review/page.tsx`, `review/loading.tsx` (same subtitle),
  `DictationReviewQueue.tsx`, `QueueRow.tsx` (no `div role=button`: a real
  `button`; `hover-pop` on links).
- Change: head with due count and one "Start review" (opens the first due
  sentence's video at that sentence; a dedicated sentence walker is out of
  scope, Q8), rows past 5 folded, no priority tag, `EmptyState` "All caught
  up" + landing next stop.
- Tests: new `DictationReviewQueue.test.tsx`.

### Phase 4: Vocabulary word list and recall (1.5 days)

**4.1 Word list.**

- Files: `VocabularyWordList.tsx`, `vocabWordListRows.ts`,
  `words/page.tsx`, `words/loading.tsx`, new `VocabStatusNav.tsx` (pills
  with counts, shared with the drawer flow links).
- Change: fixed page size, pager at the bottom; the one useful row action;
  `StepDots` for stage; search field filters the list (server query param,
  existing `vocabWordListService`); "Due today" view shows "Start recall";
  `EmptyState`; `next/link` for the source; 44px.
- Acceptance: toolbar gone; at most 4 controls above the list; every row
  has at most 1 action button.
- Tests: `VocabularyWordList.test.tsx` ('Should Learn', 'Already Know',
  'Next', '1/4' assertions updated), `vocabWordListRows.test.ts`,
  `vocabWordListService.test.ts` (search param).

**4.2 Recall modal: visible steps and a real ending.**

- Files: `VocabRecallModal.tsx`, `VocabRecallSessionSummary.tsx`,
  `VocabularyDashboard.tsx` (do not auto-close on empty queue; render the end
  screen), `vocabRecallSession.ts` (session tally helper: moved up,
  mastered), `wordGarden.ts` (garden delta helper).
- Change: `ui/progress` in mint; drop the duplicate "Review 3 / 12" text;
  rename the recall step ("Box n", Q5) or `StepDots`; per-answer step
  movement on the card; `SessionEnd` inside the modal; verdict word to
  `sr-only`; no sentence fragments; radii; raw buttons get `hover-pop`.
- Acceptance: finishing the last card shows the end screen with the garden
  delta and 1 `cta`; the dashboard status line no longer receives per-card
  messages.
- Tests: `VocabularyDashboard.test.tsx` (session end flow), new
  `VocabRecallModal.test.tsx` (end screen, step dots),
  `vocabRecallSession.test.ts` (tally), `wordGarden.test.ts` (delta).

**4.3 Search and Explore.**

- Files: `VocabularySearchPanel.tsx` (result rows are buttons that load the
  entry), `VocabularyExplorePanel.tsx` (map grid replaced by a progress
  bar "12 of 40 decided"; `rounded-panel` deck cards; "Already know" icon =
  tick everywhere).
- Tests: `VocabularyExplorePanel.test.tsx` (map button names removed;
  assert the progress label instead).

### Phase 5: Grammar sub-pages (player, result, notes) (1.5 days)

**5.1 Progress bar that never goes backwards.**

- Files: `src/components/grammar/player/LessonPlayer.tsx`,
  `playerReducer.ts`, `playerReducer.test.ts`.
- Change: the bar measures first-pass cards done out of the original card
  count (add `firstPassDone` / `firstPassTotal` to the reducer state, or a
  pure `lessonProgress(state)` selector). A re-queued miss shows as a small
  "+1" retry pip beside the bar, not as a shrinking bar. Add a visible step
  count "3 / 9" (from `common.journey.stepOf`). Use `ui/progress` (themed in
  Phase 1.7).
- Acceptance: after a wrong answer the bar width is equal to or larger than
  before; the step count never decreases.
- Tests: `playerReducer.test.ts` (new: progress never decreases across a
  miss, a retry and a pass); `LessonPlayer.test.tsx` updated.

**5.2 Verdict once, icon only.**

- Files: `LessonPlayer.tsx`, `PlayerCard.tsx`.
- Change: the verdict pill keeps its icon and moves "Correct" / "Not quite"
  into `sr-only`; drop the 10px left border on the feedback panel; drop the
  "press Enter" hint. `font-bold` / `font-semibold` become `font-medium`.
- Acceptance: one visual verdict signal per answer besides the coloured
  chip; screen readers still hear the word.
- Tests: `LessonPlayer.test.tsx` queries by role / accessible name, which
  still works with `sr-only`.

**5.3 Session end on the journey (peak-end).**

- Files: `src/components/grammar/player/PlayerResult.tsx`,
  `GrammarPlayerPage.tsx`, the four player pages
  (`lessons/[lessonId]/page.tsx`, `review/page.tsx`,
  `units/[unitId]/checkpoint/page.tsx`, `practice/page.tsx`).
- Change: render `SessionEnd`: stars (lesson) or pass mark (checkpoint) as
  the headline; one wins line (accuracy); the journey step from
  `summarizeUnit` / `levelProgress` ("Unit 2: lesson 3 of 5 done,
  checkpoint in 2"); misses folded in a `Collapsible` ("Review 3 misses",
  first miss visible); one Next stop. Best streak and time drop to a quiet
  line. "Back to path" becomes a quiet text link when Next exists.
- Fix the next-stop gaps: handle `unlocked.kind === 'unit'` (Next opens the
  new unit's first lesson); with `unlocked === null` (replay, review) fall
  back to `path.next` passed from the server page.
- "Redo" / "Retry" reset the reducer (or `router.refresh()`) instead of
  `window.location.reload()`.
- Rejected-save message gets the danger icon.
- Acceptance: every player route ends with exactly one `cta` that goes to a
  real next step (never "Back to path" while `path.next` exists); the
  journey line is present for lesson and checkpoint modes.
- Tests: `LessonPlayer.test.tsx` (unit unlock, replay fallback, misses
  folded); `src/modules/grammar/grammarPath.e2e.ts` (headings and links it
  asserts: "Lesson done!", "of 3 stars", "Unlocked: ...", "Next lesson").

**5.4 Notes as a station, not a dead end.**

- Files: `src/app/(app)/grammar/lessons/[lessonId]/notes/page.tsx`.
- Change: the eyebrow becomes a breadcrumb link (`PageHeader` breadcrumb
  prop from Phase 1); drop the "Path" button; add one Next stop at the end
  ("Next: <lesson>" or "Review now" when due).
- Acceptance: one `cta` on the page, at the end.
- Tests: new `notes/page` render test is optional; at least a
  `PageHeader.test.tsx` case for the breadcrumb prop.

**5.5 Loading and errors.**

- Files: `src/app/(app)/grammar/loading.tsx` (redraw to the new path:
  header, journey card skeleton, one centred column), new
  `grammar/lessons/[lessonId]/loading.tsx` and
  `units/[unitId]/checkpoint/loading.tsx` and `practice/loading.tsx` using a
  shared `PlayerSkeleton` (header row, card, footer; like `RunnerSkeleton`),
  new `notes/loading.tsx`, new `grammar/error.tsx` with `RouteError`.
- Acceptance: no layout jump between skeleton and page on `/grammar` at
  375px and 1280px; navigation into the player never flashes the path
  skeleton.

**5.6 Small controls.**

- `src/components/grammar/SpeakButton.tsx`: 44px hit area (invisible
  padding around the 28px glyph), `hover-pop`.
- Option and word tiles in `PlayerCard.tsx` get `hover-pop` (raw buttons
  stay, documented exception).

### Phase 6: IELTS sub-pages (test page, runner, results) (3 days)

**6.1 Test page: one next skill, launchers folded.**

- Files: `src/app/(app)/ielts/[slug]/page.tsx`,
  `src/components/ielts/catalogue/SkillLauncher.tsx`, `TestVocabPanel.tsx`,
  new `src/components/ielts/catalogue/TestJourney.tsx`.
- Change:
  - Title in the topbar like `/ielts` (from md), with a breadcrumb.
  - A `JourneyCard` for the test: headline "skills banded N of 3", metaphor =
    the test's three `SkillPips` as stations on a short line, milestone
    ("Writing clears this test, 2 tests to finish Book 18"), at most 4 chips
    (best band, target band, attempts, time this week), Next stop = the next
    skill from `nextSkillOf`, straight into the runner.
  - One test-level Practice / Mock segmented control (shared
    `ui/segmented.tsx`), not one per card.
  - Launchers: one row per skill (icon, name, pip, latest band). Clicking a
    row opens its part choice inline (`Collapsible`); the recommended skill
    starts open. Raw radios become `RadioGroup`. Minute counts only on "Full
    test".
  - Track and target badges merge into one quiet line under the title.
  - Vocabulary panel folds behind one row ("12 words in this test",
    `Collapsible`).
  - `SKILL_ICONS` imported from `SkillPips.tsx` only.
  - "IELTS" breadcrumb from `t.common.modules.ielts.title`.
- Acceptance: above the fold at 1280px: 1 `cta`, at most 8 other controls
  (was about 27), at most 6 numbers (was about 15); every control at least
  44px on a 375px screen.
- Tests: `SkillLauncher.test.tsx` updated (default mode, mock = full test
  only, Go disabled when blocked, recommended skill open); new
  `TestJourney.test.tsx`; `testPath.test.ts` cases for a per-test next skill.

**6.2 Runner chrome.**

- Files: `src/components/ielts/runner/RunnerToolbar.tsx`,
  `RunnerFooter.tsx`, `IeltsRunner.tsx`, `WritingRunner.tsx`,
  `PracticeActions.tsx`, `PassagePane.tsx`, `src/components/ielts/ui.tsx`,
  the four exam pages.
- Change:
  - Toolbar keeps Back, title, clock, Submit, and one "More" menu
    (`DropdownMenu`) holding Reset part, Guided, theme.
  - Selected segments use `bg-cta text-cta-fg` through `ui/segmented.tsx`
    (pane switcher, part switcher, toolbar toggles, writing Prompt / Essay).
  - Raw `yellow` / `amber` colours become the `--notice` /
    `--notice-soft` / `--highlight` tokens added in Phase 1.11;
    `text-muted-foreground` becomes `text-ink-soft`.
  - Before changing anything here, add characterisation tests for the
    toolbar, footer and submit dialog (decision T2A).
  - Submit drops its `bg-brand` override (it is the one `cta`).
  - Wire the planned question strip into `RunnerFooter`'s `top` slot:
    answered / total for the part and the test, visible on desktop too.
  - Writing: a thin bar toward `minWords` under the word count.
  - Shared `RunnerNotice`, `ConfirmDialog` (also used by `LessonPlayer`),
    `ExamFrame` (the `fixed inset-0 z-[70]` wrapper, 4 copies).
  - Every control at least 44px on phones.
- Acceptance: no `bg-ink` on a control (guard test, Phase 1.9); toolbar has
  at most 5 visible controls on a phone; answered count visible at 1280px.
- Tests: new `RunnerToolbar.test.tsx` (More menu holds Reset / Guided /
  theme), new `RunnerFooter.test.tsx` (question strip counts),
  `QuestionNavigator.test.tsx` updated.

**6.3 Result: hero first, journey line, one next stop.**

- Files: `src/app/(app)/ielts/attempts/[attemptId]/page.tsx` and
  `loading.tsx`, `src/components/ielts/review/ObjectiveResult.tsx`,
  `WritingResult.tsx`.
- Change:
  - `SessionEnd` head: the big band (or raw score), target band and delta vs
    the previous attempt of the same skill as chips, the per-part scores as
    chips, the journey line from `journeyTotals` / `nextMilestone` ("+1 step,
    3 to Camp"), and one Next stop: the next skill of the same test
    (`nextSkillOf`) or, when the test is cleared, the next test
    (`pickNextTest`). The weak-type Drill becomes the secondary action.
  - Answer table: wrong and blank only by default, one "Show correct too"
    `Switch`; dense rows on phones (no `min-w-[560px]` scroll).
  - Writing: the task band once (hero + card title); corrections and the
    rewritten paragraph folded under the marked essay; criteria names and
    "Task N" from the catalogue.
  - Danger banners get an icon.
  - Skeleton redrawn to the new hero.
- Acceptance: above the fold: 1 `cta`, at most 4 chips, the journey line;
  no hard-coded English in the result components (i18n test).
- Tests: new `ObjectiveResult.test.tsx` (default filter, next skill link,
  journey line), new `WritingResult.test.tsx` (catalogue criteria names).

**6.4 IELTS loading, not-found, drill.**

- `src/app/(app)/ielts/loading.tsx` redrawn to journey card + metro lines;
  new `[slug]/loading.tsx`; new `drill/[attemptId]/loading.tsx` using
  `RunnerSkeleton` inside `ExamFrame`; `ielts/not-found.tsx` uses
  `RouteError`'s look.

### Phase 7: Shell, phone and error states (1 day)

**7.1 Phone topbar and menu.**

- Files: `src/components/common/AppTopbar.tsx`, `TopbarMenu.tsx`,
  `TopbarMenuSheet.tsx`, `AppTabBar.tsx`, `globals.css` (tab bar shadow
  token).
- Change: no per-page subtitle on phones (tagline only on home); the sheet
  becomes "Account" (account, language, theme; module links removed);
  EN/VI placement per Q7; logo radius role; optional due dot on tabs (Q6).
- Acceptance: on a 375px module page exactly one title and one subtitle are
  visible; the sheet has no module links.
- Tests: `AppTopbar.test.tsx`, `AppTabBar.test.tsx`, new
  `TopbarMenuSheet.test.tsx`, `LocaleToggle.test.tsx`.

**7.2 Error boundaries everywhere.**

- Files: new `src/app/error.tsx` (root), `src/app/(app)/vocabulary/error.tsx`,
  `src/app/(app)/grammar/error.tsx`, `src/app/admin/error.tsx`, all with
  `RouteError`; `RouteError.tsx` (retry via `ActionButton`, `hover-pop`,
  image radius role); `src/app/(app)/ielts/not-found.tsx` with the
  `RouteError` look.
- Tests: copy the pattern of `src/app/(app)/dictation/error.test.tsx` for
  one new boundary; `RouteError` snapshot of the retry button role.

**7.3 Touch-target sweep.** Any remaining `size-7`, `size-8`, `size-9`,
`h-8`, `h-9`, `min-h-8`, `min-h-9` on a clickable in learner routes gets a
44px hit area (`min-h-11` or invisible padding). Guard test in section 7.

### Phase 8: Admin consistency (1 day, last)

- Files: `src/app/admin/page.tsx`, `admin/dictation/page.tsx`,
  `admin/dictation/import/page.tsx`, `admin/dictation/videos/[videoId]/edit/page.tsx`,
  `admin/ielts/page.tsx`, `admin/vocab/page.tsx` + `AdminVocabPanel.tsx`,
  every `admin/**/loading.tsx`.
- Change: `PageHeader` with breadcrumb on every admin page (the editor keeps
  `EditorHeader`); one `activeHref` rule (admin pages light nothing in the
  learner nav); `hover-pop` instead of `hover-lift`; `IconButton` refresh;
  `StatStrip` for the 5 tiles; catalogue string for "IELTS"; drop the
  one-off `bg-cta` footer bar; skeletons match; `admin/ielts/[testId]/loading.tsx`.
- Tests: `AdminTestCatalogue.test.tsx`, `DictationImportForm.test.tsx`,
  `VideoAssignTable.test.tsx`.

### Phase 9: Write the rules down (half a day)

- `.agents/rules/frontend-ui.md`: replace "Page patterns" with the landing
  skeleton (5.1), the budget, the next-stop rule (5.4), the primitives table
  (5.2), "every session ends with `SessionEnd`", the corner mapping (5.5)
  and the guard list. Remove the line about the grammar unit index (gone).
- `docs/06-frontend.md` via the `/documentlization` skill.
- Acceptance: a new page built only from the rules file lands within budget
  without reading this plan.

### Sequencing and parallel work

```
Phase 0 --> Phase 1 --> Phase 2 --+--> Phase 3 (dictation)  --+
                                  +--> Phase 4 (vocabulary) --+--> Phase 7 --> Phase 8 --> Phase 9
                                  +--> Phase 5 (grammar)    --+
                                  +--> Phase 6 (IELTS)      --+
```

Phases 3 to 6 touch disjoint folders once Phase 1 and 2 are in, so they can
run as parallel sessions in their own worktrees. Shared files they all
touch, and therefore must not be edited in parallel: `globals.css`,
`src/i18n/messages/{en,vi}/common.ts`, `src/components/journey/*`,
`PageSkeletons.tsx`. Rule: during Phases 3 to 6 those files are frozen; a
needed change goes back to a short Phase 1 follow-up first. Phase 2 stays
one session (it defines how the primitives are really used).

Rough total: 13 to 15 working days for one session in sequence; about 8
with Phases 3 to 6 in parallel.

## 7. Guards and test strategy

Consistency must not depend on the owner reviewing pages one by one, so the
rules that matter are tests.

**Static guards** (`src/lib/styleGuards.test.ts`, same file-walk helper):

| Guard                  | Fails on                                                                                                                        | Allowlist                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| corner roles           | `rounded-[` with a px value, `rounded-2xl`, `rounded-3xl` in `src/components` and `src/app`                                     | IELTS exam paper (`TaskVisual`), editor, this test  |
| no ink control         | `bg-ink text-surface` and `bg-ink text-board` anywhere; any `bg-ink` in `src/components` outside the allowlist (decision 8.3.2) | the IELTS footprints marker in `JourneyHero.tsx`    |
| raw palette            | `bg-(yellow                                                                                                                     | amber                                               | red | green | blue)-[0-9]`, `text-white`, `text-muted-foreground` | `TaskVisual` (exam paper) |
| heavy weights          | `font-bold`, `font-black` in learner components (`src/components` minus `admin`, `ielts/editor`)                                | none; `font-semibold` is a warning list, not a fail |
| no em dash             | the U+2014 character anywhere in `src` and `docs`                                                                               | none (code that needs it writes `\u2014`)           |
| no hover-lift on links | `hover-lift` (replaced everywhere by `hover-pop`, then the utility is removed from `globals.css`)                               | none                                                |

The heavy-weight and touch-target guards start as warnings (printed list)
in Phase 1 and become failures at the end of Phase 7, when the sweeps are
done.

**Component tests** (vitest + testing-library), per landing and per session
end: render with fixture data and assert

- exactly one `[data-next-stop]` and exactly one element with class
  `bg-cta` in the initial render (the Continue float is closed);
- at most 4 `dt` in the `StatStrip`;
- every `a` and `button` inside the `JourneyCard` has `hover-pop` (or is an
  `ActionButton` / `IconButton`);
- no static stat (`StatChip` without `href`) has `hover-pop`.

A small helper `expectLandingBudget(container)` in
`src/test/landingBudget.ts` keeps these four checks in one place.

**E2E** (Playwright, `*.e2e.ts`, existing config): extend
`grammarPath.e2e.ts` for the new session end (journey line, Next goes to
the next lesson); add `landings.e2e.ts` that visits the five landings at
375px and 1280px in both themes and checks: no horizontal scroll, the next
stop is in the first viewport, no layout shift above 0.1 between skeleton
and page (`PerformanceObserver` `layout-shift`). Screenshots go to the
report, not into git.

**Manual check per phase** (the review session does this): both themes,
375px and 1280px, every page the phase touched, against its acceptance
criteria.

## 8. Engineering review outcome (`/plan-eng-review`)

Run on 2026-11-28 against this document and the working tree. The owner
was not available during the review, so every question was settled with the
review's recommended option; each decision below is binding for the
implementation session unless the owner overrides it. Where a decision
changes an earlier section, the change is written here and the earlier
section is to be read with it (the implementation session applies both).

### 8.1 Step 0: scope challenge

- **Complexity check triggered** (the plan touches well over 8 files and
  adds about 15 small components). Recommended and chosen: **keep the full
  scope, phased** (not reduced). Reason: the owner's core ask is consistency
  across every page; a reduced plan (landings only) would leave the session
  ends, the IELTS test page and dictation practice inconsistent, which is
  exactly the drift they asked to stop. The phases already isolate risk:
  Phase 1 is additive, Phase 2 proves the primitives on five pages before
  anything else depends on them.
- **What already exists and is reused, not rebuilt**: the four journey
  helpers (`unitSummary.ts`, `testPath.ts`, `listeningJourney.ts`,
  `wordGarden.ts`) and their tests; `JourneyRow` / `ProgressToggle` (moved,
  not rewritten); `ContinueFloat` + the grammar measuring code (merged);
  `ui/progress.tsx`, `RadioGroup`, `Collapsible`, `DropdownMenu`, `Dialog`
  (used instead of new code); `RouteError`; `PageHeader`; `RunnerSkeleton`
  (pattern for `SkeletonPlayer`); `nextSkillOf`, `pickNextTest`,
  `nextMilestone`, `journeyTotals`, `summarizeUnit`, `levelProgress`,
  `wordGardenPosition` for the session-end journey lines;
  `getCachedVideoTopicIds` for the next-video lookup.
- **Built-in check**: no framework built-in replaces these (they are
  presentational). `IntersectionObserver` is the platform built-in for the
  float, but grammar showed it misreads a target inside an animating fold,
  so the scroll + rAF measure stays [Layer 3, observed in this repo].
- **TODOS.md cross-reference**: no deferred item blocks this plan. "Home
  Today Vocabulary Reminder" is already done by the simple view's up-next
  rows; noted, not edited (this session changes no repo file besides this
  plan).

### 8.2 Architecture (5 issues, all decided)

1. **[P1] (confidence 9/10) Server-to-client icon props.**
   `src/components/common/AppTopbar.tsx:1` is `'use client'`, and the plan's
   `page: { icon }` prop would be fed from server pages. A Lucide component
   (a function) cannot cross the server-to-client boundary as a prop.
   Decision **1A**: `AppTopbar page` takes `{ module: AppModuleKey; title;
subtitle? }` and resolves icon and tint inside from `MODULE_ICONS`
   (`HomeModuleTiles.tsx:16`, moved to `src/constants/modules.ts`) and
   `MODULE_THEMES`. Same rule for every journey primitive that a server
   component can feed into a client one: icons travel as rendered elements
   (`ReactNode`) or as a key, never as a component type.
2. **[P2] (confidence 8/10) One next-stop rule, one implementation.**
   Section 5.4 would otherwise be re-coded in five pages and home. Decision
   **2A**: a pure `pickNextStop(candidates)` in
   `src/lib/journey/nextStop.ts` (kinds `resume` > `due` > `next` > `done`,
   stable order inside a kind); each module only builds its candidates.
   Unit-tested once (`nextStop.test.ts`), used by all landings, home and
   every `SessionEnd`.
3. **[P1] (confidence 8/10) Stale journey numbers at a session end.** The
   journey line on a session end is computed from data loaded when the page
   opened (practice page, recall modal, lesson player), so "7 of 12, 5 to
   gold" would show the count before this session. Decision **3A**: each
   module gets a pure "after this session" helper
   (`advanceTopicRecord`, `advanceGardenPosition`, `advanceUnitSummary`;
   IELTS reads fresh data on its server result page) that applies this
   session's delta to the loaded numbers; the next server refresh reconciles.
   Tests cover the delta, including a session that finished nothing new (a
   replay must not add a step).
4. **[P2] (confidence 8/10) Implicit coupling in `ContinueFloat`.** Hiding
   the float "while any `[data-next-stop]` is in view" makes it depend on a
   global DOM query. Decision **4A**: `ContinueFloat` takes an explicit
   `nextStopId` and observes that element; `NextStopCard` takes an `id`.
5. **[P2] (confidence 9/10) The parallel-phase freeze is broken by Phase 6.**
   Phase 6.2 adds `--notice` / `--highlight` tokens to `globals.css`, a
   frozen file. Decision **5A**: all new tokens (`--notice`,
   `--notice-soft`, `--highlight`, the tab bar shadow, the module
   `gradient`) land in Phase 1; Phases 3 to 7 add none.

Data flow the implementation follows (one landing):

```
server page (getMessages, module data loader)
  -> module journey helper (pure: totals, milestone, candidates)
  -> pickNextStop(candidates)            src/lib/journey/nextStop.ts
  -> <JourneyCard module=..>             server-safe
       headline / metaphor / milestone / <StatStrip>
       <NextStopCard id="next-stop">     one cta
       handle: <DrawerHandle>            client, only when a drawer exists
  -> browse area (path, lines, shelves, list) with id="here"
  -> <ContinueFloat targetId="here" nextStopId="next-stop">  client
```

Session end:

```
work screen (client) --finish--> local tally (this session)
  -> advance<Module>(loadedJourney, tally)   pure, tested
  -> pickNextStop(candidates after advance)
  -> <SessionEnd> wins, journey step, fix-up (folded > 3), one next stop
  -> router.refresh() in the background reconciles with the server
```

### 8.3 Code quality (5 issues, all decided)

1. **[P2] (confidence 8/10) Runtime warning in `StatStrip`.** A dev console
   warning above 4 chips is clever, not explicit, and silent in tests.
   Decision **1A**: drop it; the 4-chip budget is enforced by
   `expectLandingBudget` in tests (section 7).
2. **[P2] (confidence 8/10) Fragile "ink control" guard.** Matching
   `bg-ink` "together with a clickable element in the same className string"
   is a regex over JSX and will miss and misfire. Decision **2A**: the guard
   fails on `bg-ink text-surface` and `bg-ink text-board` anywhere, and on
   any `bg-ink` in `src/components` outside an explicit allowlist (the
   IELTS footprints marker, `JourneyHero.tsx`); controls use `bg-cta`.
3. **[P2] (confidence 9/10) Two giant files get more code.**
   `DictationPracticeShell.tsx` (2039 lines) and `VocabularyDashboard.tsx`
   (871 lines) would absorb the progress strip, finish screen and new
   layout. Decision **3A**: new UI goes into new files
   (`dictation/practice/PracticeProgressStrip.tsx`,
   `PracticeFinish.tsx`; `vocabulary/VocabularyLanding.tsx` for the layout,
   `VocabRecallEnd.tsx`), the big files only wire them. No other refactor of
   those files in this plan.
4. **[P3] (confidence 8/10) `MetricTile` lingering.** After Phases 3, 6
   and 8 no learner page uses it. Decision **4A**: Phase 8 replaces the
   admin uses with `StatStrip` and deletes `MetricTile.tsx` + test; then
   `hover-lift` is removed from `globals.css` (guard row "no hover-lift").
5. **[P3] (confidence 7/10) `IELTS_SKILL_LABELS` bypass the catalogue.**
   English constants are shown as UI text (`modules/ielts/constants.ts:95`).
   Decision **5A**: keep the English proper names (Listening, Reading,
   Writing are exam names the learner sees in English on the real test) but
   read them through `t.ielts.skills` so the catalogue owns all UI text;
   Vietnamese keeps the English names. Done in Phase 6.1.

### 8.4 Tests

Framework: vitest + testing-library (`vitest.config.mts`), Playwright for
`*.e2e.ts` (`playwright.config.ts`, three specs today).

```
CODE PATHS                                         USER FLOWS
[+] src/lib/journey/nextStop.ts (new)              [+] Open a landing, take the next stop
  ├── resume beats due beats next   [GAP] unit       ├── [GAP] [→E2E] each landing at 375 / 1280
  ├── ties keep input order         [GAP] unit       ├── [GAP] next stop in first viewport
  └── empty -> done                 [GAP] unit       └── [GAP] no CLS > 0.1 skeleton -> page
[+] journey primitives (new)                       [+] Finish a session (peak-end)
  ├── StatChip link vs static       [GAP] unit       ├── [★★ TESTED] grammar lesson end (grammarPath.e2e.ts)
  ├── NextStopCard one cta / done   [GAP] unit       │     needs: journey line, unit unlock, replay -> path.next
  ├── SessionEnd fixed order, fold  [GAP] unit       ├── [GAP] [→E2E] dictation practice -> next video
  ├── ContinueFloat up/down/hidden  [GAP] unit       ├── [GAP] vocab recall -> end screen (component)
  └── Segmented cta + aria-pressed  [GAP] unit       └── [GAP] IELTS skill -> result -> next skill
[+] advance helpers (new)                          [+] Error and empty states
  ├── topic record +1, replay +0    [GAP] unit       ├── [GAP] save failed / queued on SessionEnd
  ├── garden delta, mastered        [GAP] unit       ├── [GAP] next video missing (topic done, no-topic)
  └── unit summary after lesson     [GAP] unit       ├── [GAP] IELTS test cleared -> next test / all done
[+] changed behaviour (regressions)                  └── [★★ TESTED] dictation error boundary
  ├── lesson progress never shrinks [GAP] CRITICAL
  ├── pagination keeps sort=newest  [GAP] CRITICAL
  └── home links no /dictation/stats [GAP] CRITICAL

COVERAGE today: 2/27 paths  |  after this plan: 27/27 required
```

Decisions:

- **Regression tests are mandatory** (no question asked, review rule):
  `playerReducer.test.ts` "progress never decreases across miss, retry,
  pass"; `BrowsePagination` "page 2 keeps sort=newest"; `HomeStudyDesk.test.tsx`
  "no link points at /dictation/stats".
- **[P1] Test gap: session-end flows** (confidence 9/10). Decision **T1A**:
  each module's session end gets a component test (end screen content,
  exactly one `cta`, next-stop target) plus the failure cases: save failed
  or queued (shows the queued state, still offers the next stop), next item
  missing (falls back to the landing's next stop), everything done (`done`
  state). Files: `PracticeFinish.test.tsx`, `VocabRecallEnd.test.tsx`,
  `PlayerResult` cases in `LessonPlayer.test.tsx`, `ObjectiveResult.test.tsx`,
  `WritingResult.test.tsx`.
- **[P2] Test gap: untested IELTS runner** (confidence 9/10; no tests for
  `IeltsRunner`, `WritingRunner`, `RunnerToolbar`, `CheckPartPanel`,
  `PracticeActions`, `AttemptLoader`). Decision **T2A**: Phase 6.2 starts by
  adding characterisation tests for the toolbar, footer and submit dialog
  before changing them (make the change easy, then make the easy change).
- **[P2] E2E scope** (confidence 7/10). Decision **T3A**: one
  `landings.e2e.ts` (five landings, two widths, two themes, next stop in
  first viewport, no horizontal scroll, CLS) and one `sessionEnds.e2e.ts`
  (grammar lesson and dictation practice end to end; vocab and IELTS stay
  at component level because they need seeded recall and attempt data).

Test plan for `/qa` written to
`~/.gstack/projects/nakmiers-english_for_only_me/nakmiers-main-eng-review-test-plan-20261128.md`.

### 8.5 Performance (2 issues, decided)

1. **[P2] (confidence 8/10) IELTS result needs journey data it does not
   load.** `loadResultPageData` (`src/modules/ielts/services/resultPageData.ts:52`)
   reads one attempt; the journey line and next skill need the catalogue and
   the learner's test bands, and the delta needs the previous attempt.
   Decision **P1A**: reuse the cached catalogue reader and the bands query
   `loadIeltsHomeData` already uses (`ieltsPageData.ts:55`), run them in the
   same `Promise.all` as the attempt, and add one indexed query for the
   previous attempt of the same test and skill (check an index on
   owner + test + skill + finishedAt exists; add it through
   `db:sync-indexes` if not). Do not call `loadIeltsHomeData` whole (it also
   loads weak spots and the overall band).
2. **[P3] (confidence 7/10) Next-video lookup on practice.** Decision
   **P2A**: compute the next video from `getCachedVideoTopicIds()` + the
   topic's cached course order and the completion counts the page already
   loads; no new uncached query per request.

No other issues: `ContinueFloat` is rAF-throttled with passive listeners;
the drawer animates grid tracks (transform-free but already shipped on
IELTS without jank); the garden delta is computed on the client, not by
re-fetching stats per card.

### 8.6 Failure modes

| New path                | Realistic failure                           | Test       | Handling                           | User sees                                    |
| ----------------------- | ------------------------------------------- | ---------- | ---------------------------------- | -------------------------------------------- |
| `pickNextStop`          | all candidates empty for a brand new guest  | yes (unit) | `done` / start state               | "Start here" next stop                       |
| `SessionEnd` save state | outbox queued offline at session end        | yes (T1A)  | queued notice, next stop still on  | clear notice                                 |
| practice next video     | last video of a topic, or a no-topic video  | yes (T1A)  | fall back to landing next stop     | a valid next stop                            |
| IELTS result journey    | catalogue cache cold or read fails          | add (6.3)  | journey line omitted, rest renders | result without the line (not silent: logged) |
| `ContinueFloat` target  | target id missing (empty path, error state) | yes (unit) | renders nothing                    | no float                                     |
| advance helpers         | replay counted as a new step                | yes (unit) | delta 0 for already-done items     | correct count                                |

Critical gaps (no test, no handling, silent): **0** after the decisions
above.

### 8.7 Parallel lanes

| Step                 | Modules touched                                                   | Depends on |
| -------------------- | ----------------------------------------------------------------- | ---------- |
| Phase 0              | dictation (stats, pagination), home, ui, admin loading            | -          |
| Phase 1              | components/journey, components/ui, common, lib, i18n common, css  | Phase 0    |
| Phase 2              | all five landings                                                 | Phase 1    |
| Phase 3 dictation    | components/dictation, app/(app)/dictation                         | Phase 2    |
| Phase 4 vocabulary   | components/vocabulary, app/(app)/vocabulary                       | Phase 2    |
| Phase 5 grammar      | components/grammar, app/(app)/grammar, modules/grammar (e2e)      | Phase 2    |
| Phase 6 IELTS        | components/ielts, app/(app)/ielts, modules/ielts (result data)    | Phase 2    |
| Phase 7 shell        | components/common (topbar, menu, tab bar, RouteError), app errors | 3 to 6     |
| Phase 8 admin        | app/admin, AdminVocabPanel                                        | 7          |
| Phase 9 rules + docs | .agents/rules, docs                                               | 8          |

Lane A: 0 -> 1 -> 2 (sequential, shared primitives). Then lanes B (3), C
(4), D (5), E (6) in parallel worktrees. Merge all four, then 7 -> 8 -> 9.
Conflict flag: lanes B to E each add strings to their own namespace only;
`common.ts`, `globals.css`, `components/journey/*` and `PageSkeletons.tsx`
are frozen after Phase 1 (decision 8.2.5). Lane C and lane B both read
`ContinueFloat` / `SessionEnd` but do not edit them.

### 8.8 Proposed TODOs (not written to `TODOS.md` in this session)

- **Dictation review walker**: a session that walks only the due sentences
  across videos (Q8). Why: the review page can then end like every other
  session. Depends on: Phase 3.5.
- **Daily goal across modules** (Q3): needs a "done today" aggregate per
  module. Why: a day-level small win on home. Depends on: Phase 2.5 ticks
  being used for a while.
- **Shell in the `(app)` layout**: `PageShell` + `AppTopbar` rendered once
  in the layout, pages pass title data through a small context or segment
  config. Why: no per-page topbar props, no loading subtitle mismatches.
  Depends on: Phase 7.

### 8.9 Implementation tasks added by the review

- [ ] **T1 (P1)**: `AppTopbar page` by module key; icon props never cross
      server to client as components. Files: `AppTopbar.tsx`,
      `src/constants/modules.ts`. Verify: `bun run build`.
- [ ] **T2 (P2)**: `src/lib/journey/nextStop.ts` + test; every landing and
      session end uses it.
- [ ] **T3 (P1)**: advance helpers per module + tests (replay adds 0).
- [ ] **T4 (P2)**: `ContinueFloat nextStopId`; `NextStopCard id`.
- [ ] **T5 (P2)**: all new tokens in Phase 1 (`globals.css`).
- [ ] **T6 (P2)**: guards per 8.3.2; no `StatStrip` runtime warning.
- [ ] **T7 (P2)**: new files for practice strip / finish and vocab landing /
      recall end, big files only wire them.
- [ ] **T8 (P3)**: delete `MetricTile` and `hover-lift` in Phase 8.
- [ ] **T9 (P3)**: skill names through `t.ielts.skills`.
- [ ] **T10 (P1)**: three regression tests (progress bar, pagination sort,
      no stats links).
- [ ] **T11 (P1)**: session-end component tests with failure cases (T1A).
- [ ] **T12 (P2)**: IELTS runner characterisation tests before 6.2.
- [ ] **T13 (P2)**: `landings.e2e.ts`, `sessionEnds.e2e.ts`.
- [ ] **T14 (P2)**: IELTS result data in one `Promise.all` + previous
      attempt index check.
- [ ] **T15 (P3)**: practice next video from cached data only.

Completion summary: Step 0 scope accepted as-is (phased); architecture 5
issues; code quality 5 issues; tests: diagram produced, 25 gaps (3
regressions); performance 2 issues; NOT in scope: section 10; what already
exists: 8.1; TODO proposals: 3 (recorded here, `TODOS.md` untouched);
failure modes: 0 critical gaps after decisions; outside voice: skipped
(non-interactive side session); parallel lanes: 5 (1 sequential, 4
parallel), then 3 sequential phases; lake score: 12 of 12 decisions chose
the complete option.

## 9. Open questions (with the default the implementation uses)

The implementation session uses the default unless the owner answers
otherwise before that phase starts.

| #   | Question                                                                                           | Default                                                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | Commit the current uncommitted rework as a baseline, on `main` or on a branch?                     | Commit it on a new branch `ui/calm-progress` cut from `main`; all phases land there; the owner merges.                                                     |
| Q2  | Delete `/dictation/stats` outright, or keep the redirect for old bookmarks?                        | Delete the route and the component (single user, no external links).                                                                                       |
| Q3  | Add a daily goal (for example "3 stops today") with a ring on home?                                | Not now. Only the tick on each up-next row when its due count reaches 0. A daily goal needs a cross-module "done today" aggregate that does not exist yet. |
| Q4  | Streak repair (a "freeze" or "repair by doing two today")?                                         | No repair mechanic. Gentle framing only: no red, no loss wording, show best streak, "today starts a new one".                                              |
| Q5  | Name of the recall step inside the modal ("Stage" clashes with garden stages).                     | No word: `StepDots` with an accessible label "step 2 of 5".                                                                                                |
| Q6  | A due dot on the phone tab bar?                                                                    | Yes: a small brand dot, no number (owner rule: no numbers in navigation). Also on the desktop rail icon for the same module.                               |
| Q7  | EN/VI on phones: in the topbar beside the theme toggle (the written rule) or in the sheet (today)? | Follow the written rule: topbar, as a compact round toggle like the rail's. If it crowds the 375px topbar, keep it in the sheet and update the rule.       |
| Q8  | A real "review due sentences" walker for dictation (instead of opening the whole video)?           | Out of scope here; "Start review" opens the first due sentence's video at that sentence. Log as a TODO.                                                    |
| Q9  | Title in the topbar for sub-pages too (topic, results, notes, test page), not only landings?       | Yes from md for every learner page that has a `PageHeader`; the breadcrumb goes above the title in the topbar block.                                       |
| Q10 | Keep the home full view at all, now that simple is the default and the landings carry the detail?  | Keep, trimmed to at most 5 blocks. Revisit after two weeks of use.                                                                                         |

## 10. Not in scope

- New gamification: XP, leagues, gems, hearts, random rewards (P25).
- Notifications, email or push reminders.
- New data aggregates beyond what pages already load (daily cross-module
  activity, per-sentence review walker).
- Colour, font or theme changes; the pastel dashboard stays.
- IELTS exam reading typography (paper fidelity) and the IELTS editor.
- Moving `PageShell` into the `(app)` layout (it would make the topbar
  persistent too, but every page passes its own topbar props today; a
  separate refactor).

## GSTACK REVIEW REPORT

| Review        | Trigger               | Why                             | Runs | Status      | Findings                                                                                 |
| ------------- | --------------------- | ------------------------------- | ---- | ----------- | ---------------------------------------------------------------------------------------- |
| CEO Review    | `/plan-ceo-review`    | Scope & strategy                | 0    | -           | -                                                                                        |
| Codex Review  | `/codex review`       | Independent 2nd opinion         | 0    | -           | -                                                                                        |
| Eng Review    | `/plan-eng-review`    | Architecture & tests (required) | 1    | issues_open | 37 issues (5 architecture, 5 code quality, 25 test gaps, 2 performance), 0 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps                      | 0    | -           | -                                                                                        |
| DX Review     | `/plan-devex-review`  | Developer experience gaps       | 0    | -           | -                                                                                        |

- **VERDICT:** every review finding is folded into the plan with a decision
  (section 8); the eng review stays open only on the owner's product
  questions below. A `/plan-design-review` is recommended before Phase 2,
  since this is a UI plan.

**UNRESOLVED DECISIONS:**

- Review calls 8.1 to 8.5 were auto-decided with the recommended option
  because the owner was not available; the owner confirms or overrides them.
- Q1 to Q10 in section 9 (baseline commit, stats route, daily goal, streak
  repair, recall step naming, tab bar dot, EN/VI on phones, review walker,
  topbar title on sub-pages, home full view) run on their defaults until
  the owner answers.
