# Manual UI review digest (2026-11-28)

The owner reviewed the app by hand in two Claude sessions after the "calm
progress" plan (`docs/plans/ui-calm-progress-2026-11-28.md`) shipped:

- **Session A** ("UI simplify", this repo, the long journey/banner session).
- **Session B** ("Fix: Refinements").

Every item below was asked for on one specific page and **is already fixed
there**. The goal of the next plan is to find the **same kind of problem on
other pages and components** and fix those, without redoing what is listed
here. Read the "Already fixed" column as the reference implementation.

## 1. The owner's principles (from both sessions)

1. **Calm, not crowded.** Too many choices and too many features make a
   learner choose nothing and quit. Fewer elements, less text, more icons
   and numbers; the page must not feel like a matrix or a grid.
2. **Make every small step visible.** Show how far the learner came and how
   many steps are left to the next milestone, so they feel progress and
   keep going (Duolingo-style journey, but each module with its own
   metaphor, not copies of each other).
3. **Save vertical space.** A page with little content must not need much
   scrolling. Banners must be short; a lone button must not take a row.
4. **Clickable things look clickable** (a light hover effect on every
   clickable element) and **icons show state, not action**.
5. **Nothing competes with the main thing** (lines or decorations that pull
   the eye away from milestones; loud secondary controls).
6. **No dead ends.** Remove features that lead to broken pages and dev-only
   pages; keep one clear way forward.

## 2. Review items, grouped by pattern

Each row: what was wrong, where it was fixed, how. "Look for" says what to
hunt for elsewhere.

### P1. Tall banners / journey cards

| Problem | Already fixed on | How |
| --- | --- | --- |
| Banner too tall, content needs deep scrolling | `/ielts`, `/grammar`, `/vocabulary`, `/dictation` (landing) | `JourneyCard` `statsPlacement="top"` (chips in the top right corner), no `MilestoneNote`, shorter metaphor |
| "N steps to X" line under the metaphor wastes a row | same four pages | Steps left written on the metaphor itself: above each IELTS stage, a flag on each Grammar step, above each vocabulary vine stage, "N to go" at the dictation playhead |
| Solid lines / brackets compete with milestones | `/ielts` trail | Plain text only, no lines |
| Text inside short shapes gets hidden | `/grammar` staircase (A1 step) | Level and count share one row (`justify-between`), minimum step height |
| Gap between headline and chart | `/grammar` | Shorter staircase from `sm` |
| Chips wrap to two rows / fall under the headline | `/dictation` | Wider chip area, `@container/journey` drops chip labels under 56rem |
| Drawer open squeezes the banner, items drop | `/vocabulary`, `/dictation`, `/ielts` | `DrawerRow` sets `data-drawer-open`; chips icon + number; `nextStopHidesWithDrawer` |
| Topic strip too tall | `/dictation/[topicSlug]` | Next stop row removed (see P2) |

**Look for:** other headers and summary cards that still stack a
"N to go" line, a progress line and chips vertically (IELTS test page
`/ielts/[slug]`, IELTS result head, grammar unit / lesson / checkpoint
heads, vocabulary word list page, dictation results and review pages,
session end screens, home full view, admin pages if they share the
primitives). Skeletons (`loading.tsx`, `SkeletonJourney`) must match.

### P2. "Next stop" cards that only scroll, or that skip a step

| Problem | Already fixed on | How |
| --- | --- | --- |
| Next stop card whose button only scrolls | `/ielts`, `/grammar`, `/dictation/[topicSlug]`, favorites / uncategorized lists | Removed; a `persistent` `ContinueFloat` is always on screen |
| Continue opened the video directly | `/dictation/[topicSlug]` | `TopicContinueFloat`: opens the folded section, scrolls, focuses the card, pink ring, small bounce (`nudge`) |
| Next stop that goes somewhere real was too big / too small | `/vocabulary` (smaller), `/dictation` (thumbnail, wider) | `NextStopCard size="sm"`, `media`, `layout="aside"`, `asideWidth` |
| Continue only shows after a scroll | all floats | `ContinueFloat` re-measures on page height change (ResizeObserver) |

**Look for:** other pages with a "Continue" / "Start" card that duplicates
a list right below it, Continue floats without `persistent` or `nudge`
where the owner would expect them (IELTS station, grammar node), lists
whose "you are here" item has no visual marker.

### P3. Lone controls that take a whole row

| Problem | Already fixed on | How |
| --- | --- | --- |
| "Words" button alone on a row | `/vocabulary` | Moved into the "Search a word" card header (`ContentPanel action`) |
| Favorites hidden in the avatar menu | account menu, `/dictation` | Removed from `UserMenuPopup`; a Favorites button beside the "Topics" heading (signed-in only) |
| Edit button in the page corner | `/ielts/[slug]` | Removed |

**Look for:** any `flex justify-end` row holding a single button, page
actions that could sit in an existing card header or heading row, account
menu entries that are not about the account.

### P4. Icons and affordances

| Problem | Already fixed on | How |
| --- | --- | --- |
| Rotate icon read as "redo" instead of "recall due" | grammar path nodes | Done = green tick, due = brain icon; click still opens the modal |
| Clickable icons without hover feedback | home rotate icon, buddy icon, grammar | `hover-pop` on every clickable |
| Stars / lessons numbers without icons | grammar | Star and tick icons on stat chips |

**Look for:** other rotate / refresh / play icons used for state, other
clickable icons or rows without `hover-pop` / `soft-press`, static chips
that pop (must not).

### P5. Spacing and visual bugs

| Problem | Already fixed on | How |
| --- | --- | --- |
| Divider touching the language button | rail foot | More gap |
| "Already know" vocab cards transparent (see-through) | IELTS test page vocab panel | Opaque surface |

**Look for:** other dividers glued to controls, other cards using a
translucent background over content (`bg-surface/xx` on stacked cards),
other states that change opacity of a whole card.

### P6. Dense text blocks

| Problem | Already fixed on | How |
| --- | --- | --- |
| Full transcript tab hard to read | dictation practice, full transcript | Heart under the order number, translation smaller, lighter, not bold |
| Vocabulary search result too long | `/vocabulary` search | Compact redesign |

**Look for:** other lists that mix a primary line and a translation /
meaning at the same weight (review queue, results, word list, IELTS
review, grammar notes), long result panels that could be compact.

### P7. Feedback in the wrong place, missing status

| Problem | Already fixed on | How |
| --- | --- | --- |
| "No result" error at the page top | `/vocabulary` search | Shown under the search box (`lookupError`) |
| Search result without its learning status | `/vocabulary` search | Shows should learn / already know |

**Look for:** other inline errors rendered in a page-level notice far from
the control that caused them, other items whose saved state is not shown.

### P8. Primary actions

| Problem | Already fixed on | How |
| --- | --- | --- |
| Start button small and floating | dictation video page | Bigger, prominent, centred in the right panel beside the video |
| AI debrief hard to find | dictation results | More prominent |

**Look for:** other main actions rendered as small or secondary buttons, or
floating without alignment (IELTS skill launchers, grammar lesson start,
checkpoint start, vocabulary recall start).

### P9. Detail pages too complex

| Problem | Already fixed on | How |
| --- | --- | --- |
| Test page cluttered | `/ielts/[slug]` | No banner, all skills shown (no expand), mock hides parts, "Before you start" always shown and placed under the tests, tests laid out horizontally |
| Results page monotone, wasteful | dictation results | Redesigned (banner kept), "Start review" removed (it led to a broken page), debrief and notes collapsible |

**Look for:** other detail pages with expand-to-see sections that hold the
main content, disabled controls that should be hidden, guidance blocks that
hide themselves, long vertical lists that fit in a row.

### P10. Dead code and broken links

| Problem | Already fixed on | How |
| --- | --- | --- |
| Dev-only page | `src/app/zz-dev-ielts-editor` | Deleted |
| Feature leading to an error page | dictation results "Start review" | Removed |
| Unused stats API, chart, CSS class | dictation stats | Removed (commit `0454ec6`) |

**Look for:** other links to routes that redirect or error, other dev or
sandbox routes, components and i18n keys nothing imports.

### P11. AI output language

| Problem | Already fixed on | How |
| --- | --- | --- |
| Debrief answered in English when asked for Vietnamese | dictation AI debrief | Follows the app locale and the learner's notes about focus and language; cache key includes locale and prompt version |

**Look for:** every other AI call (IELTS writing feedback, grammar or
vocabulary AI helpers, coach) that ignores the app locale or the learner's
explicit language request, and caches that do not key on locale.

## 3. Out of scope

- Anything listed in the "Already fixed" columns.
- The AI provider migration (`docs/plans/ai-provider-qwen-migration-2026-11-27.md`)
  and the Google sign-in work (`docs/plans/google-login-required-2026-11-28.md`),
  owned by other sessions.

## 4. House rules that still apply

- `.agents/rules/frontend-ui.md` (journey card rules, landing budget,
  drawer compact mode, Continue floats).
- No em dash anywhere; EN and VI catalogues in parity; tests with
  `npx vitest run --dir src`.
