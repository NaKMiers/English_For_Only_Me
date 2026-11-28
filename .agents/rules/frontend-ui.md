# Frontend UI Rules

Preserve a polished, practical product feel: calm layout, strong hierarchy,
clear actions, responsive by default, and reusable component primitives.

## Language

The UI speaks English (default) or Vietnamese, picked by the learner with the
EN/VI toggle beside the day / night toggle at the foot of the rail on
desktop, and in the Account sheet (the topbar menu) on phones.
The choice is a cookie (`efom-locale`), so server components render the right
language on the first paint; routes do not change.

- Every user-visible UI string goes through the message catalogue, in both
  languages: labels, buttons, headings, hints, empty states, aria labels,
  `title`s, page metadata, toasts and API error messages a learner can see.
  No hard-coded UI copy in components.
- Catalogues live in `src/i18n/messages/en/<namespace>.ts` (the source of
  truth for keys) and `src/i18n/messages/vi/<namespace>.ts`, typed as
  `Messages['<namespace>']`, so a missing or extra Vietnamese key is a type
  error. `src/i18n/messages.test.ts` also checks key parity, placeholders and
  empty strings.
- Vietnamese is natural Vietnamese with full diacritics, written for a
  learner, not translated word by word.
- Vietnamese DATA stays data and is never moved into the catalogue: grammar
  lesson content (`src/modules/grammar/course/units/*.ts`), IELTS passages and
  question text, transcripts, translations, word meanings. Only the interface
  around it changes language.

Reading text:

- Server component, `generateMetadata`, route handler, server action:
  `const t = await getMessages()` from `@/i18n/server`
  (`getLocale()` for the code).
- Client component: `const t = useMessages()` from `@/i18n/client`
  (`useLocale()` for the code). Without a provider it falls back to English,
  so unit tests render English.
- A component with no `'use client'` that is shared by server and client
  trees cannot call either: take the text as props, or mark it
  `'use client'` when it has no server-only imports.
- Placeholders: `format(t.x.y, { count })`; plurals:
  `plural(t.x.items, n)` with `{ one, other }` forms; a sentence holding a
  link or `<kbd>`: `formatNodes(t.x.y, { key: <kbd>…</kbd> })`. Helpers are
  in `@/i18n/format` and `@/i18n/formatNodes`. Never build a sentence by
  concatenating fragments: word order differs between the languages.
- Dates and numbers: `Intl` with `INTL_LOCALES[locale]` from `@/i18n/config`.

Adding a string: add the key to `en/<namespace>.ts`, add the same key to
`vi/<namespace>.ts` (the type checker lists what is missing), then read it
with `t.<namespace>.<key>`.

## Simple And Minimal (always)

Always show things in the simplest, most minimal way that still reads clearly.

- Say it with an icon when the icon is unambiguous: a green tick for right, a
  red cross for wrong. No "Correct" / "Wrong" word beside it (keep the word
  as `sr-only` text for screen readers).
- Do not state what the learner can already see: an empty box needs no
  "Blank" label, a score needs no sentence around it.
- One control, one short label. Drop helper sentences, intros, and repeated
  explanations unless the action is unclear without them.
- Prefer removing chrome (extra boxes, borders, badges, backgrounds) over
  adding it. Add a visual element only when it carries meaning.

## Visual Foundation

- Use Tailwind/CSS tokens before one-off colors.
- Typography is Be Vietnam Pro (loaded with `next/font` in
  `src/app/layout.tsx`, with the `vietnamese` subset) for headings and body.
  Headings use `font-medium`, body text the normal weight. Any replacement
  font must ship a `vietnamese` subset, or lesson data renders with mixed
  fallback glyphs.
- Prefer the small semantic palette in `globals.css` (`ink`, `ink-soft`,
  `surface`, `line`, `tint`, `brand`, `cta`, `danger`, the module pastels),
  then add domain colors intentionally.
- Keep custom spacing like `21px` and `10.5px` available through tokens when it
  improves rhythm.
- Avoid broad redesigns while fixing behavior.

## Soft Pastel Dashboard (the app's look)

The app is a white rounded board (`PageShell`, `bg-board`) floating on a
blush backdrop, with a dark icon rail (`AppSidebar`) on the left and the
topbar (`AppTopbar`) above. Blocks are calm: hairline `border-line` borders,
soft `shadow-card` at most, no hard offset shadows, no uppercase, no black
weight.

- Colours are tokens from `src/app/globals.css`: `ink` / `ink-soft` text,
  `board` the page sheet, `surface` cards, `canvas` backdrop, `line`
  borders, `tint` / `tint-soft` for selected and quiet fills.
- `brand` is the logo's pink: `brand` for accent text and fills,
  `brand-soft` for the pastel pink chip and the primary button, `brand-ink`
  for text that sits on `brand-soft`. No module wears pink.
- `cta` / `cta-fg` is the one strong action (`ActionButton tone="ink"`,
  selected segments and tabs, checked boxes): near-black by day, pink at
  night. Never use `bg-ink text-surface` for a control, it turns into a
  white slab at night.
- `danger` is a tomato red about 40deg of hue away from the pink, only for
  wrong answers, errors and delete, and always with an icon (cross, alert,
  trash) so it never relies on colour. `lesson-correct` marks right answers.
- One pastel per module from `MODULE_THEMES` (`src/constants/theme.ts`):
  Dictation sky, Vocabulary mint, Grammar lilac, IELTS peach (fills
  `bg-pastel-*`, text and icons `text-accent-*`, each at least 4.5:1 on its
  pastel).
- Buttons and chips are pills (`rounded-full`): `ActionButton` tones are
  `primary` (pastel pink), `paper` (outlined) and `ink` (the one `cta`).
- Corners by role, never a hand-typed radius on a bordered block:

| Role    | Utility           | Size                    | Use for                                        |
| ------- | ----------------- | ----------------------- | ---------------------------------------------- |
| shell   | `rounded-shell`   | 36px (0 under 640px)    | `PageShell` only                               |
| panel   | `rounded-panel`   | 24px (20px under 640px) | cards, panels, dialogs, popups, big tiles      |
| control | `rounded-control` | 14px                    | inputs, tabs, rows, a card inside a card       |
| tag     | `rounded-tag`     | 8px                     | checkboxes, tooltips, menu items, small badges |

- Never use `rounded-none` (`src/lib/styleGuards.test.ts` fails on it).
- A child's radius is never larger than its parent's.
- Pressable things use `soft-press` (a small scale on press) instead of
  `transition-all`.
- Progress you can feel (the app-wide product rule, first applied on
  `/ielts`): measure the learner in small steps (one skill with a band, one
  lesson, one clip), show how far they have come before what is left, name
  the next milestone and how few steps it is away, and give one obvious "next
  stop" to click. Visualise a module as a journey (lines, stations, trails),
  not as a grid of identical cards. Each module gets its own metaphor: the
  grammar path winds, the IELTS books are metro lines.
- Everything clickable shows it on hover: `hover-pop` (rises 2px, soft
  shadow, its icon grows a little). `ActionButton` and `IconButton` carry it;
  add it to any raw clickable button or link. Static blocks (stats, labels)
  never get it, so clickable and not clickable stay easy to tell apart.
- Motion is calm and short, transform / opacity only, and every helper
  lives in the MOTION block of `globals.css`: `page-enter` (PageShell `main`,
  replays per route), `motion-stagger` on a card grid or list, `hover-pop`
  on anything clickable, `motion-grow-x` / `motion-grow-y` for bars,
  `motion-draw` for an SVG line. Entrances use `backwards` fill so no
  transform stays behind. Work screens (practice, lesson player, IELTS
  runner) get a quick fade at most. Reduced motion turns movement off.
- Night (`:root[data-theme='lightup']`) is its own plum-tinted palette, not
  inverted day tokens. Depth comes from lighter surfaces (canvas < board <
  surface < tint), hairline borders, an inner top highlight on cards
  (`--card-highlight`, part of `shadow-card`) and a 1px ring on the shell;
  never from drop shadows. Pastels become deep tinted fills and their
  `accent-*` become light tones. The rail keeps its own `rail` / `rail-fg`.
  Check both themes after a visual change.

### Page patterns (calm pages, progress you can feel)

Every learner page is built from the journey primitives in
`src/components/journey/` and a few shared pieces, so pages stay the same
by construction. This section is enough to build a new page.

**The landing skeleton** (every module landing, same order):

1. Title in the topbar from md: `AppTopbar page={{ module, title,
subtitle?, breadcrumb? }}` (a module key, never an icon component),
   plus `PageHeader inTopbar` which shows the same title on phones only.
2. One `JourneyCard` on the module gradient: `JourneyHeadline` (how far
   the learner came, a count), the module's own metaphor (grammar
   staircase, IELTS trail, dictation scrubber, vocabulary garden) with
   the steps left written on the metaphor itself (never a percentage), a
   `StatStrip` of at most 4 `StatChip`s in the card's top right
   (`statsPlacement="top"`, at most 2 linked), and at most one
   `NextStopCard`.
3. Optional side drawer: `DrawerRow` + `DrawerHandle` (closed by default)
   for history, weak spots, favorites.
4. The browse area: the metaphor at full length (path, metro lines, record
   shelves, word list). A `ContinueFloat` (`targetId`, `nextStopId`) may
   scroll back to "you are here"; it hides while the next stop is on
   screen.

**IELTS and Grammar keep the card short:** no `NextStopCard` and no
milestone line under the metaphor. The steps left sit on the metaphor itself as plain text
with no lines that compete with it (IELTS: a number above each stage of
the trail; Grammar: a flag on top of each step, a tick when done, the pink
pin with "N to go" on the step being climbed, a quiet "N to go" ahead).
The chips sit in the card's top right (`statsPlacement="top"`), and a
`persistent` `ContinueFloat` with `nudge` (the node or station bounces once
the scroll settles) is the way on. Their landing tests call
`expectLandingBudget(container, { ctas: 0, nextStops: 0 })`.

**A dictation topic page has no next stop row either:** the next video's
card wears a pink ring and an always-on `TopicContinueFloat` opens its
section, scrolls to the card, focuses it and gives it a small bounce
(`nudge`; the learner sees where it sits before playing it).

**Vocabulary and Dictation keep a small next stop** (it goes somewhere
real: the recall session, a video to resume; vocabulary with nothing due
has none and a `persistent` `ContinueFloat` bounces the explore deck): same short card (vocabulary:
words to go above each stage of the vine still ahead and no stage badge;
dictation: "N to go" beside the playhead and the next track at the end of
the waveform, no inner panel; chips top right, no milestone line), with
the next stop as a `NextStopCard size="sm"` in a narrow right column
(`layout="aside"`, `nextStopHidesWithDrawer`). A stop with a picture (the
dictation video's thumbnail) passes it as `media` and takes
`asideWidth="lg"`.

**An open side drawer makes the card compact on wide screens:** `DrawerRow`
sets `data-drawer-open` on its `group/drawer`, every `StatChip` label goes
`sr-only` (icon and number only, the chip's `title` names it; the same
happens whenever the card's left column, `@container/journey`, is under
56rem), and a card
with `nextStopHidesWithDrawer` (vocabulary) hides its next stop so nothing
wraps. Style this with `group-data-[drawer-open]/drawer:`, never with a hook,
so server cards (IELTS) get it too.

**Budget above the fold:** 1 `cta` (the next stop), at most 4 stat chips,
1 drawer handle, 0 header action buttons. `expectLandingBudget` in
`src/test/landingBudget.ts` checks it in tests: use it for every new
landing and session end.

**The next stop** follows one rule, `pickNextStop` in
`src/lib/journey/nextStop.ts`: resume an unfinished item, else a due
review, else the next new step, else the all-clear `done` state. Each
module only builds its candidates. The next stop links straight into the
work screen, never to another chooser.

**Every session ends with `SessionEnd`** (dictation practice and results,
vocabulary recall, grammar player, IELTS result): wins first, then the
journey step just taken (computed with the module's advance helper so a
replay adds 0: `advanceTopicRecord`, `advanceGardenPosition`,
`advanceUnitSummary`), then the fix-up list (folded past 3), then exactly
one next stop that goes somewhere real. Numbers like accuracy, streak or
time are static `StatChip`s in the `stats` slot on the headline's row (top
right, the twin of `JourneyCard statsPlacement="top"`), not a chip row
under the big number. The next stop is a `NextStopCard variant="compact"`
(title, detail, one `ink` button, or `done` for the all-clear), never a
bare button. Its title is a win ("Listening done"), not the page title.

**Shared pieces:**

| Need                         | Use                                                        |
| ---------------------------- | ---------------------------------------------------------- |
| Journey card and parts       | `JourneyCard`, `JourneyHeadline`                           |
| Numbers                      | `StatStrip` + `StatChip` (static never pops, linked does)  |
| The one next action          | `NextStopCard` (`card` or `compact`; `href` or `onAction`) |
| Folded side card             | `DrawerRow`, `DrawerHandle`                                |
| Back to "you are here"       | `ContinueFloat`                                            |
| Empty list or queue          | `EmptyState` (always one action)                           |
| A step count (word, recall)  | `StepDots`                                                 |
| Status or error banner       | `InlineNotice` (`error` is danger with an icon)            |
| Should learn / Already know  | `VocabDecisionButtons` (picked state, error under it)      |
| State icons                  | `DUE_ICON` (due), `DONE_ICON` (done) in `stateIcons.ts`    |
| An admin row's actions       | `AdminMenuTrigger` in a `DropdownMenu`                     |
| Leave / restart / submit     | `ConfirmDialog`                                            |
| Mutually exclusive toggles   | `Segmented` (selected is `cta`, 44px on phones)            |
| Bars                         | `Progress` with a module `tone`                            |
| Wayfinding                   | `PageHeader breadcrumb` / `Breadcrumb`                     |
| Loading                      | `SkeletonJourney`, `SkeletonPlayer` (focus screens)        |
| IELTS full-screen exam frame | `ExamFrame`                                                |

**Corners:** outer cards and the next stop `rounded-panel`, tiles and rows
inside a card `rounded-control`, chips, pills and buttons `rounded-full`.
Never a hand-typed `rounded-[Npx]`, `rounded-2xl` or `rounded-3xl`.

**Guards** (`src/lib/styleGuards.test.ts`, shrink-only baselines): corner
roles, no `bg-ink` on a control, no raw Tailwind palette /
`text-white` / `text-muted-foreground`, no `font-bold` / `font-black` in
learner components, no `hover-lift`, no em dash in `src` or `docs`, 44px
touch targets (`SMALL_TOUCH`), and `RotateCcw` only for real replay /
redo / retry / restore actions (`ROTATE_FOR_REPLAY`). When a page cleans a baseline file,
remove it from the list (the stale check fails until you do).

**State, feedback and controls** (the follow-up review, 2026-11-28):

- One state, one icon: "due" is `DUE_ICON` (the brain) everywhere it
  shows (chips, nodes, rows, buttons); the rotate arrow is for replay,
  redo, retry and restore only.
- Errors render next to the control that caused them: under the button
  pressed, on the failed row, in the card of the section or task, as
  `InlineNotice tone="error"`. A page-top notice is only for page-wide
  messages (a load that failed, time running out).
- A disabled control whose reason is hidden (a tooltip, a closed fold) is
  a bug: hide the control and, when the learner needs to know, say why in
  one quiet line. Pager ends are spacers, not faded buttons.
- No whole-card opacity and no translucent stacked cards: dim with a tint
  (`bg-tint text-ink-soft`), keep cards and chips on opaque tokens
  (`bg-surface`, a pastel), and keep `bg-surface/xx` for decoration only.
- A next stop links into the work screen with its deep link when the
  landing is a chooser: `/vocabulary?recall=1`, the grammar path's
  `nextHref`, the dictation review queue's `?segment=`.
- AI text a learner reads follows the app locale (`getLocale()` and
  `LANGUAGE_NAMES` from `src/lib/ai/languageNames.ts`), and stored AI
  output keeps the language it was written in.

Also:

- Page content uses one padding rhythm, `px-4 pb-6 md:pr-6 md:pl-0`, and
  its `loading.tsx` draws the page's own shape (journey card, rows, player)
  inside the real topbar (`SkeletonPageShell page={...}`), so nothing
  shifts when data lands.
- Long lists get a jump aid (a search field or the Continue float) and
  dense rows, not a column of big cards; finished things fold.
- Every touch target is at least 44px on phones (`min-h-11`, or an
  invisible hit area around a small glyph like `SpeakButton`).
- Phones: `AppTabBar` floats at the bottom below `md` on normal pages and
  is left out on full-height work screens; `PageShell` keeps room for it.
  The topbar menu is the Account sheet (account, language), not a second
  module list.
- Route error boundaries render `RouteError` (retry optional, back to the
  module); every module and the app root have one.
- Adding a corner role means adding it in `globals.css` AND to
  `extendTailwindMerge` in `src/lib/utils.ts`.

## Components

- Shared components live in `src/components`.
- Put basic primitives in `src/components/ui`, cross-feature helpers in
  `src/components/common`, and product sections in domain folders.
- Component files should export a focused component with a nearby `Props`
  interface.
- Accept `className?: string` on reusable visual components and merge it with
  `cn(...)`.
- Use `memo(...)` for stable reusable components when it matches the existing
  pattern and props are simple.
- Prefer `next/image` and `next/link` in web UI.
- Prefer `lucide-react` icons for common actions when available.

## Tailwind And Layout

- Compose responsive layouts with Tailwind utilities and semantic tokens.
- Keep class names readable with `cn(...)`, not long nested ternaries.
- Use stable dimensions for fixed-format UI such as buttons, tiles, toolbars,
  counters, and cards to avoid layout shift.
- Ensure text fits on mobile and desktop. Avoid tiny text as the only fix for
  overflow.
- Do not use clickable `div`s when a real `button` or `Link` is correct.

## Component Library (shadcn/ui) - use it instead of raw HTML

- ALWAYS reach for the project's shadcn/ui primitive in `src/components/ui`
  instead of writing a raw HTML form/control element, whenever an equivalent
  exists. Raw `<select>`, `<input>`, `<textarea>`, `<button>`, `<label>`,
  `<dialog>`/ad-hoc modals, checkboxes, and switches are NOT allowed when a
  primitive covers the case. Standard mapping:
  - `<select>` → `Select` / `SelectTrigger` / `SelectValue` / `SelectContent` /
    `SelectItem`
  - `<input type="text|search|number|email">` → `Input`
  - `<input type="checkbox">` → `Checkbox`
  - `<input type="range">` → a `Slider` primitive (none is kept until a
    second caller needs one; `AudioPlayer` uses `@base-ui/react/slider`)
  - on/off preference → `Switch`
  - `<textarea>` → `Textarea`
  - `<label>` → `Label`
  - `<button>` → `ActionButton` (primary/labelled actions), `IconButton`
    (icon-only), or `Button` (base); destructive/confirm submits →
    `ConfirmSubmitButton`
  - menus → `DropdownMenu`; modals/confirms → `Dialog`; tabs → `Tabs`;
    tooltips → `Tooltip`; progress → `Progress`; a menu divider →
    `DropdownMenuSeparator`
- The primitives are themed ONCE to the pastel dashboard at the source
  (`src/components/ui/*`): corner roles, hairline `border-line`, `bg-surface`,
  `shadow-card` / `shadow-float`, `cta` for checked and selected states. When
  you find a primitive still carrying default shadcn styling (rounded-lg,
  `ring`, `bg-popover`, `bg-primary`), fix it in the primitive - do not paper
  over it per call site. Per-site `className` is for layout/size overrides
  only.
- If a needed primitive does not exist yet, add it under `src/components/ui`
  and theme it to the dashboard tokens before using it. Do not hand-roll a
  bespoke dropdown/modal/menu.
- Replacements must preserve behavior AND appearance. Known gotchas:
  - base-ui `Select` `onValueChange` yields `string | null` - coerce null to
    `''` (`value => onChange(value ?? '')`); keep an item with `value=""` for
    the "all/none" option.
  - base-ui `Checkbox` submits its `name` as the value unless you pass
    `value="on"` - required when a server action reads
    `formData.get(name) === 'on'`. Use `defaultChecked` for uncontrolled
    server-action forms.
  - `ActionButton` forwards `type` and `disabled`; keep `type="submit"` on
    buttons that drive a `<form action={serverAction}>`.
  - `Label` may wrap a native or labelable control (input/textarea/checkbox/
    the Switch button); it renders a real `<label>`.
- Documented exceptions - KEEP RAW (no primitive fits, or a swap would break
  behavior): hidden form fields (`<input type="hidden">`), file inputs using a
  `ref` + `sr-only` trigger, segmented toggles relying on `aria-pressed`,
  disclosure/accordion triggers relying on `aria-expanded`/`aria-controls`,
  native HTML5 drag handles (`draggable` + `onDragStart`), and deliberate
  transparent/overlay inputs (e.g. the dictation answer overlay). Leave a brief
  comment when keeping raw for one of these reasons.

## Loading, Empty, And Error States

- Add route-level `loading.tsx` or component-level loading UI for slow pages.
- Put reusable loading skeletons in `src/components/loading`.
- Empty states should explain the state and offer the next useful action.
- Client actions should show useful feedback through the project's toast system
  once one is installed.

## Copy And Accessibility

- Keep product copy intentional and user-facing copy consistent in language and
  tone.
- Do not replace existing Vietnamese or localized copy unless requested.
- Use clear `alt` text for meaningful images; decorative images should be
  safely hidden or empty-alt as appropriate.
- Preserve disabled, focus, hover, and loading states.
