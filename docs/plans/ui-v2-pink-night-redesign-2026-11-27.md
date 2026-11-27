# UI v2: pink brand, real night theme, module pages on par with home

Work happens in the `claude/ui-v2-061f08` worktree (base ffad1b2) and
`design/pastel-dashboard` is fast-forwarded onto it after each large part.

## Research summary

- Dark themes that read well use layered, slightly tinted near-black
  surfaces (Material: elevation = lighter surface, not shadow), hairline
  borders at 8-12% white, an inner top highlight instead of drop shadows,
  off-white text (not #fff), and pastel accents lifted to their light
  300-400 tones on deep tinted fills.
- Brand pink and "wrong" red stay apart by hue (pink ~335deg vs a tomato
  red ~14deg) plus a non-colour cue (icon, word) on every wrong state.
- Long course paths (Duolingo) needed a "jump" aid; good curricula show a
  "continue" hero first, a unit index with progress, collapse finished units,
  and put review / weak spots next to the hero.
- SRS dashboards (Anki, WaniKani) put the due count and the review CTA above
  the fold; feedback on WaniKani's redesign: too much whitespace and too many
  clicks. Dense word tables, status as small dots.
- Test catalogues: tests grouped per book, skill badges that fill once a band
  exists, results lead with the band, then per-type accuracy, then mistakes.

## Direction

Keep the soft pastel dashboard (board on a backdrop, dark rail, pastel
cards, pills). Change the accent, rebuild night, and bring the module pages
up to the home page's density and polish. Restyles stay in class names and
layout; copy changes stay minimal (parallel i18n branch).

## 1. Pink brand (point 5)

Tokens in `src/app/globals.css` (`:root` and `.day-palette`):

| token         | day       | night     | note                                 |
| ------------- | --------- | --------- | ------------------------------------ |
| `brand`       | `#c93a74` | `#ff8fbd` | text / fill, 4.8:1 on white          |
| `brand-soft`  | `#fde8f1` | `#3a2030` | pastel pink chip / primary button    |
| `brand-ink`   | `#a52c5e` | `#ffc0da` | NEW: brand text on `brand-soft`      |
| `danger`      | `#cf3d12` | `#ff8a5c` | tomato red, 38deg hue away from pink |
| `danger-soft` | `#fdebe4` | `#3a2119` |                                      |

- Backdrop warms from lavender to blush-lavender; selection, scrollbar,
  focus ring, `.marker`, lesson-stage glow follow `brand`.
- `THEME_COLORS` in `src/constants/theme.ts` mirrors the new day values.
- Vocabulary's module pastel moves from rose to mint, so the pink brand is
  not mistaken for "the vocabulary colour" (decision for the owner).
- Every wrong / error / delete keeps an icon (cross, alert, trash) so danger
  never relies on colour.

## 2. Night theme (point 1)

A deliberate plum-tinted dark palette, not inverted tokens:

- Backdrop `#0f0d12`, board `#17141b`, `surface-muted` `#1e1a23`, `tint`
  `#2a2330`, `tint-soft` `#211c26`; `line` `#2c2631`, `line-strong` `#3a3240`.
- Text `ink` `#f2ebf0`, `ink-soft` `#aea2ad` (7:1 on the board).
- Module pastels become deep tinted fills (sky `#172334`, mint `#16291f`,
  lilac `#231d36`, peach `#2e2119`, rose `#301a26`, lemon `#262a17`,
  cream `#2b2519`), accents their light tones (`#8ec5ff`, `#7fd8a4`,
  `#c0a8ff`, `#ffb98a`, `#ff9cc2`).
- Depth: cards get an inner top highlight (`--card-highlight`), shadows
  only on floating layers; the board gets a 1px white/6% ring so it lifts
  off the backdrop.
- Backdrop art: the line-art strokes in pink at low opacity, two soft
  plum / pink glows.
- `bg-ink text-surface` blocks (inverted chips, mastered nodes) are
  re-checked: in night they become light-on-dark inversions, which is
  fine for small chips; big inverted panels move to `bg-tint`.

## 3. Grammar path (point 4)

Replace the 11,600px zigzag with a two-column course page:

- Hero "Continue" card (lilac): current unit and lesson, unit progress
  bar, one big CTA (`path.next`), and side entry points: Review due (n),
  Weak spots (n), stars / lessons stats.
- Unit index (lg: sticky left column; phone: horizontal chip strip): each
  unit with order, level, a mini progress ring, state; click scrolls to and
  opens that unit.
- Units are collapsible cards (raw `aria-expanded` disclosure, documented
  exception): the current unit opens, complete units fold to one line
  (tick, title, stars), locked units fold with a "Test out" link.
- Inside a unit: lessons are a compact stepper grid of tiles (state icon,
  title, stars, due marker) plus the checkpoint tile; the lesson dialog is
  kept.
- Level filter chips (All, A1, A2, B1, B2, C1) above the units.
- Lesson player / notes / review / practice / checkpoint: same chrome
  tokens (header progress bar, pink accents, night check); no behaviour
  change.

## 4. Vocabulary (point 3)

- `/vocabulary`: one compact "today" row: title + streak chip, a big due
  card with the Start Recall CTA (merges `VocabularyRecallLauncher`'s
  header into it), and a slim status bar (Learning / Due / Already know /
  Mastered / Known) as one segmented row of links instead of five 144px
  tiles. Growth chart and hardest words become one compact row of two
  cards; search and explore panels tighten padding and type sizes.
- `/vocabulary/words`: dense list rows (~44px), status dots, sticky filter
  chips.

## 5. IELTS (point 2)

- `/ielts`: a peach hero card (title, band estimate ring, tests done,
  skills practised), toolbar, then one card per book with its tests as
  tiles; skill badges outline when not done and fill with the band when
  done.
- `/ielts/[slug]`: hero with breadcrumb, badges and per-skill best band;
  skill launchers get a tinted header with the skill icon, a segmented
  Practice / Mock control in the pill style, and the pink Go button.
- Results / attempts: band hero first, then per-type accuracy, then the
  question review. The exam runner (`.ielts-exam`, paper layout) is not
  touched; only its surrounding chrome tokens change.

## 6. Everything else (point 6)

- Dictation browse / topic / review / stats / results: align headers with a
  shared compact page header (tag, h1, one-line subtitle, actions), tighten
  card grids, check night.
- Admin pages: same header, dense tables, night check.
- Error / not-found / loading: one friendly error card with the mascot and
  retry / home actions; skeletons shaped like the new layouts (no shift).
- Phone: a fixed bottom tab bar (5 modules) under 768px on normal pages,
  hidden on full-height work screens; the topbar menu stays for account
  and theme (decision for the owner).

## Not changing

Data, APIs, the exam runner's paper layout, the practice flows, copy
beyond what a new layout needs.

## Tests and docs

- Update tests that assert class names (`bg-tint`, `bg-brand`,
  module tints, grammar path structure).
- New unit tests: grammar unit index / collapse logic (pure helper),
  vocab status bar links.
- Update `.agents/rules/frontend-ui.md` (palette, night rules, new
  patterns: course page, compact stat bar, bottom tab bar).

## Verification

`npx tsc --noEmit -p .`, `npx eslint src`,
`npx vitest run --exclude '.claude/**'`, `npx next build`; every route in
day and night and at 375px in the browser.

## Eng review decisions (2026-11-27)

- D1 review target: this plan. D2 scope: all six points, one commit per point.
- D3 Vocabulary's module pastel moves from rose to mint.
- D4 Phone: fixed bottom tab bar (`AppTabBar`, 5 modules) under `md`, hidden
  on `fullHeight` work screens; body gets bottom padding plus
  `env(safe-area-inset-bottom)`. The topbar menu stays for account / theme.
- D5 Grammar units fold with the existing `Collapsible` primitive; open state
  is derived from progress (current unit open, others folded), never stored.
  The unit index opens a unit by lifting its open state into `GrammarPath`.
- D6 One shared `PageHeader` (grown from `PageHero`): tag, h1, one-line
  subtitle, actions slot. Every module page uses it.

## What already exists

- `PageShell`, `AppTopbar`, `AppSidebar`, `ContentPanel`, `MetricTile`,
  `PageTag`, `PageHero`, `ActionButton`: reused, restyled at the source.
- `MODULE_THEMES` drives module tints: change once, every card follows.
- `Collapsible` (base-ui) and dictation's `SectionAccordion`: reused for
  grammar units.
- MOTION block (`motion-stagger`, `hover-lift`, `motion-grow-*`): reused.
- `buildGrammarPath` already derives unit / lesson state; the index only
  adds a pure per-unit summary on top of it.

## NOT in scope

- Exam runner paper layout (`.ielts-exam` panes): owner rule, paper
  fidelity. Only its chrome tokens change through the palette.
- Copy rewrites: the i18n branch owns strings.
- New data (e.g. a review forecast chart): needs services, not a restyle.
- Route transitions (`experimental.viewTransition`): rejected in the motion
  pass for input blocking.

## Test plan

```
CODE PATHS                                         USER FLOWS
[+] grammar/path/unitSummary.ts (new, pure)         [+] Grammar path
  ├── per-unit done / total / stars                   ├── continue hero -> next href   [unit]
  ├── default open set (current unit, else first)     ├── index click opens + scrolls  [unit]
  └── level filter                                    └── completed unit folded        [unit]
[+] common/AppTabBar.tsx (new)                      [+] Phone nav
  ├── active tab per pathname                         └── hidden on work screens       [unit]
  └── renders 5 module links
[+] common/PageHeader.tsx (new)                     [+] Vocabulary
  └── tag / title / subtitle / actions                └── status bar links to word views [unit]
[~] existing class-name tests (MetricTile, ModuleCard, ActionButton,
    AppSidebar, HomeStudyDesk, TopicGrid, ...)     -> updated, not deleted
```

New test files: `src/modules/grammar/path/unitSummary.test.ts`,
`src/components/common/AppTabBar.test.tsx`,
`src/components/common/PageHeader.test.tsx`,
`src/components/grammar/path/GrammarPath.test.tsx`,
`src/components/vocabulary/VocabularyStatsOverview.test.tsx`.

## Failure modes

- Tab bar covers the last row of a page: bottom padding on `PageShell`
  under `md` (checked at 375px). Not silent: visible in QA.
- Index click on a folded unit scrolls before it opens: open first, scroll
  in the next frame.
- Night inner highlight on `bg-ink` blocks reads as a light line: highlight
  only on `surface` cards.

## Parallelization

Sequential implementation: tokens first (everything depends on them), then
pages that share `PageHeader` and `ContentPanel`.

## Implementation Tasks

- [ ] **T1 (P1)** tokens: pink brand, tomato danger, night palette, mint vocab (`globals.css`, `constants/theme.ts`)
- [ ] **T2 (P1)** `PageHeader` + `AppTabBar` + shell padding (`components/common`)
- [ ] **T3 (P1)** Grammar course page + `unitSummary` helper + tests
- [ ] **T4 (P1)** Vocabulary compact dashboard + words list
- [ ] **T5 (P1)** IELTS home / test / results chrome
- [ ] **T6 (P2)** Dictation, admin, error / loading, phone checks
- [ ] **T7 (P1)** rules doc, tests, tsc / eslint / vitest / build, browser pass

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | - | - |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | - | - |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR (PLAN) | 4 issues, 0 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | - | - |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | - | - |

- **VERDICT:** ENG CLEARED - ready to implement

NO UNRESOLVED DECISIONS
