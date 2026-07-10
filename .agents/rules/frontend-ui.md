# Frontend UI Rules

Preserve a polished, practical product feel: calm layout, strong hierarchy,
clear actions, responsive by default, and reusable component primitives.

## Visual Foundation

- Use Tailwind/CSS tokens before one-off colors.
- Default typography follows the newer projects: Montserrat for display/sans
  and Source Sans for body when the product design does not specify otherwise.
- Prefer a small semantic palette: `background`, `primary`, `dark-primary`,
  `secondary`, `light`, `dark`, `light-gray`, and `dark-gray`, then add domain
  colors intentionally.
- Keep custom spacing like `21px` and `10.5px` available through tokens when it
  improves rhythm.
- Avoid broad redesigns while fixing behavior.

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

## Component Library (shadcn/ui) — use it instead of raw HTML

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
  `bg-popover`, `bg-primary`), fix it in the primitive — do not paper over it
  per call site. Per-site `className` is for layout/size overrides only.
- If a needed primitive does not exist yet, add it under `src/components/ui`
  and theme it to the manga tokens before using it. Do not hand-roll a
  bespoke dropdown/modal/menu.
- Replacements must preserve behavior AND appearance. Known gotchas:
  - base-ui `Select` `onValueChange` yields `string | null` — coerce null to
    `''` (`value => onChange(value ?? '')`); keep an item with `value=""` for
    the "all/none" option.
  - base-ui `Checkbox` submits its `name` as the value unless you pass
    `value="on"` — required when a server action reads
    `formData.get(name) === 'on'`. Use `defaultChecked` for uncontrolled
    server-action forms.
  - `MangaButton` forwards `type` and `disabled`; keep `type="submit"` on
    buttons that drive a `<form action={serverAction}>`.
  - `Label` may wrap a native or labelable control (input/textarea/checkbox/
    the Switch button); it renders a real `<label>`.
- Documented exceptions — KEEP RAW (no primitive fits, or a swap would break
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
