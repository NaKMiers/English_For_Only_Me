# Frontend UI Rules

Preserve a polished, practical product feel: calm layout, strong hierarchy,
clear actions, responsive by default, and reusable component primitives.

## Language

All web UI text is English: labels, buttons, headings, hints, aria labels,
titles, metadata, toasts and API error messages a learner can see.
Vietnamese appears only as data (lesson content, translations, meanings) when
the content needs it.

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
- Prefer a small semantic palette: `background`, `primary`, `dark-primary`,
  `secondary`, `light`, `dark`, `light-gray`, and `dark-gray`, then add domain
  colors intentionally.
- Keep custom spacing like `21px` and `10.5px` available through tokens when it
  improves rhythm.
- Avoid broad redesigns while fixing behavior.

## Soft Pastel Dashboard (the app's look)

The app is a white rounded board (`PageShell`) floating on a lavender
backdrop, with a dark icon rail (`AppSidebar`) on the left and the topbar
(`AppTopbar`) above. Blocks are calm: hairline `border-line` borders, soft
`shadow-card` at most, no hard offset shadows, no uppercase, no black weight.

- Colours are tokens from `src/app/globals.css`: `ink` / `ink-soft` text,
  `surface` cards, `canvas` backdrop, `line` borders, `brand` (violet) for
  accents, `danger` (red) only for wrong answers, errors and delete,
  `lesson-correct` for right answers, `tint` / `tint-soft` for selected and
  quiet fills, and one pastel per module from `MODULE_THEMES`
  (`src/constants/theme.ts`): Dictation sky, Vocabulary rose, Grammar lilac,
  IELTS peach.
- Buttons and chips are pills (`rounded-full`): `ActionButton` tones are
  `primary` (soft violet), `paper` (outlined) and `ink` (the one dark CTA).
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
- Night mode remaps the same tokens under `:root[data-theme='lightup']`; the
  rail keeps its own `rail` / `rail-fg` colours so it stays dark. Check both
  themes after a visual change.
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
  - `<input type="range">` → `Slider`
  - on/off preference → `Switch`
  - `<textarea>` → `Textarea`
  - `<label>` → `Label`
  - `<button>` → `MangaButton` (primary/labelled actions), `IconButton`
    (icon-only), or `Button` (base); destructive/confirm submits →
    `ConfirmSubmitButton`
  - menus → `DropdownMenu`; modals/confirms → `Dialog`; tabs → `Tabs`;
    tooltips → `Tooltip`; progress → `Progress`; separators → `Separator`
- The primitives are themed ONCE to the manga aesthetic at the source
  (`src/components/ui/*`): sharp corners (`rounded-none`), `border-2`/`border-3`
  `border-manga-black`, `bg-manga-white`, hard offset shadows
  (`shadow-[Npx_Npx_0_var(--manga-black)]`), `font-sans font-black`. When you
  find a primitive still carrying default shadcn styling (rounded-lg, `ring`,
  `bg-popover`, `bg-primary`), fix it in the primitive - do not paper over it
  per call site. Per-site `className` is for layout/size overrides only.
- If a needed primitive does not exist yet, add it under `src/components/ui`
  and theme it to the manga tokens before using it. Do not hand-roll a
  bespoke dropdown/modal/menu.
- Replacements must preserve behavior AND appearance. Known gotchas:
  - base-ui `Select` `onValueChange` yields `string | null` - coerce null to
    `''` (`value => onChange(value ?? '')`); keep an item with `value=""` for
    the "all/none" option.
  - base-ui `Checkbox` submits its `name` as the value unless you pass
    `value="on"` - required when a server action reads
    `formData.get(name) === 'on'`. Use `defaultChecked` for uncontrolled
    server-action forms.
  - `MangaButton` forwards `type` and `disabled`; keep `type="submit"` on
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
