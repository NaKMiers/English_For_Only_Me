# IELTS parity with the paper (Jumpinto as the visual reference)

_Written 2026-11-26 from the review of IELTS 16 Test 4. Part 1 is what was
found and fixed; Part 2 is the master prompt for the full run over every test._

## Part 1. What the Test 4 review found

The owner compared IELTS 16 Test 4 on this site with the same test on
jumpinto.com, screen by screen. Every problem fell into one of two kinds:

- **Display problems.** The renderer showed correct data the wrong way. These
  are fixed in shared code, so every test already gets the fix.
- **Data problems.** The stored test itself is wrong or incomplete. These must
  be fixed test by test, and are what the full run is for.

### 1A. Display rules now in the shared code (done, all tests)

| Area                     | Rule (as the paper / Jumpinto shows it)                                                                                                                                                     | Where                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Part heading             | Small gray caps `PART 1` / `PASSAGE 2` / `TASK 2`                                                                                                                                           | `ListeningPane`, `PassagePane`, `WritingRunner`    |
| Reading header           | Gray line "You should spend about 20 minutes on Questions X-Y, which are based on Reading Passage N."; title centered; standfirst centered bold italic                                      | `PassagePane`, `passageStandfirst.ts`              |
| Lettered passages        | Letter `A` as a bold heading on its own line, its paragraphs below; small gap between paragraphs, bigger gap between letters; a line break inside a stored paragraph starts a new paragraph | `PassagePane`                                      |
| Listening header         | Context line hidden when the announcer reads it; part title centered at the top of the **Audioscript** panel; borderless full-width toggle                                                  | `ListeningPane`                                    |
| Group label              | "Question 5", "Questions 21 and 22", "Questions 1-6"                                                                                                                                        | `GroupBlock`                                       |
| Instructions             | One sentence per line, the caps word limit in bold                                                                                                                                          | `instructionText.ts`                               |
| Group title              | Shown for choice groups too ("Local council report on traffic and highways"), hidden when it only repeats the question                                                                      | `GroupBlock`                                       |
| Notes / short answers    | Each stored line is its own line (one question per line)                                                                                                                                    | `markdown/parse.ts`                                |
| Word box / matching list | Its own centered, fit-width box above the summary, centered title; recognised in any storage format (`- **A** x`, `A. x`, `A) x`, several per line, table)                                  | `publicView.ts` `bodyWithoutOptions`, `GroupBlock` |
| Spacing                  | Tight notes (line height 1.65, 28px inputs), small frame padding, compact options                                                                                                           | `IeltsMarkdown`, `SlotInput`, `GroupBlock`         |
| Pictures                 | Diagram/map/plan image above the notes when `group.imageUrl` is set; `visual_missing` warning when the text mentions a diagram and there is none                                            | `GroupBlock`, `checkTest.ts`                       |
| Choices                  | Only the radio/checkbox picks; selected option is gray, never red; red is only for wrong answers in review                                                                                  | `GroupBlock`, `ReviewMark`                         |
| Flags                    | Click a question number to flag it (amber, flag icon); a part with flags gets an amber dot in the footer                                                                                    | `QuestionNumberBadge`, `QuestionNavigator`         |
| Writing                  | "Sample Writing Answer" collapsible under the task (practice and mock); essay box bounded and resizable; task image without a frame                                                         | `WritingRunner`, `publicView.ts`                   |

### 1B. Data problems found in Test 4 (each test must be checked for these)

| #   | Problem                                                                                                                    | Example in Test 4                                                | How it was fixed                                                                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| D1  | Diagram, map, plan or picture missing (`imageUrl` empty)                                                                   | Reading 1 Q1-6, the qanat diagram                                | `bun run ielts:attach-image -- <slug> <section> <firstQ> <file>` with an image the owner supplied |
| D2  | Standfirst merged into the first paragraph                                                                                 | Reading 2, "What are the implications of the way we read today?" | `bun run ielts:set-standfirst -- <slug> <section> "<text>"`                                       |
| D3  | A lettered section stored as one block; its inner paragraphs lost                                                          | Reading 3, sections A-F (7 breaks)                               | `bun run ielts:paragraph-breaks -- <slug> <section> "A=<first words>" ...`                        |
| D4  | Word box options only inside the body text, not stored as options, so the blanks show text inputs instead of A-H dropdowns | (seen in the audit, not in Test 4)                               | needs a section patch: move the options into `group.options`                                      |
| D5  | Group title missing, or the title holds the question text                                                                  | Listening 3 Q21-24                                               | display rule covers the duplicate; a missing title needs a data patch                             |
| D6  | Writing sample answer missing or not matching the task                                                                     | (both Test 4 tasks have one)                                     | section patch                                                                                     |

The 2026-11-09 self-audit (`docs/plans/ielts-content-audit-2026-11-09.md`)
already lists more data problems across all 84 tests: wrong answer keys,
missing answer variants ("&" vs "and", dates, postcodes), wrong question
types, invented options replacing pictures, missing worked examples and word
boxes, evidence quotes not in the cited block, missing audio (8-4, 2-3), and
the duplicate `ielts-21-test-3`. The full run must re-check these too.

### 1C. Known limits

- **Claude cannot open jumpinto.com.** The organization's policy blocks it in
  Claude in Chrome and in the desktop browser pane ("This site is blocked by
  your organization's policy"). No session can compare against it directly
  until an admin allows the site. Do not try to get around the block (no
  curl, proxies, caches, archives or other mirrors). The comparison source
  must be material the owner provides: Jumpinto screenshots, or the Cambridge
  books (PDF or photos), dropped into `docs/ielts-reference/<slug>/`.
- **Cache.** `REVALIDATE_SECRET` is unset, so scripts cannot expire the
  `ielts-content` tag. After data changes, the owner runs
  `grep -l "<slug>" .next/dev/cache/fetch-cache/* | xargs rm` and restarts the
  dev server.

---

## Part 2. Master prompt (paste into a new session)

```markdown
# IELTS parity run: hub and spoke

You are the HUB for a full content-parity run of the IELTS module in this
repo (Next.js app "EnglishForOnlyMe"). Goal: every IELTS test on the site
(84 tests, `ielts-1-test-1` ... `ielts-21-test-4`) shows the same content
and layout as the Cambridge paper, as Jumpinto presents it, so a learner is
never confused. Fix the data in MongoDB and, where a problem is about
display, the shared renderer.

## Read first (hub only, before spawning anything)

1. `AGENTS.md` and `.agents/rules/*` (style, data, testing rules).
2. `docs/plans/ielts-jumpinto-parity-2026-11-26.md`: Part 1 lists the display
   rules already in code (1A), the data problem types (1B, D1-D6) and the
   limits (1C). This is the checklist.
3. `docs/plans/ielts-content-audit-2026-11-09.md` and `.json`: the earlier
   self-audit with per-test findings; reuse them, do not redo them blind.
4. The scripts in `scripts/` (`attachIeltsGroupImage.ts`,
   `setIeltsStandfirst.ts`, `setIeltsParagraphBreaks.ts`) and
   `src/modules/ielts/consistency/checkTest.ts`.

## Hard rules (every agent)

- **jumpinto.com is blocked for Claude by the organization's policy.** At the
  start, the hub tries once to open it with Claude in Chrome. If it is
  blocked, nobody opens it and nobody tries to get around the block (no curl,
  fetch, proxies, caches, archives, mirrors). Then the only reference is what
  the owner put in `docs/ielts-reference/<slug>/` (Jumpinto screenshots or
  Cambridge book pages). If a test has no reference files, check it against
  the paper conventions in the checklist and the 2026-11-09 audit, and list
  every item that needs the paper to settle as `needs-reference`.
- Never invent content. Text, answers, options and images come from the
  reference or from the test's own passage/transcript. If you cannot prove a
  fix, report it instead of guessing.
- Data changes only through scripts that load the newest version, run
  `checkTest`, bump `section.revision` and write with
  `updateOne({ _id, 'sections.key': key }, { $set: { 'sections.$': section } })`.
  Never edit MongoDB by hand, never delete a test, never touch user attempts.
- Never print or commit `.env` values. Do not commit or push unless the owner
  asks. Never use the em dash character (U+2014) anywhere.
- Only the HUB edits code under `src/` or `scripts/`. Spokes are read-only on
  code; they write data via the hub's scripts and write their own findings
  file only.

## Phase 0: hub prepares the tools (sequential, before any spoke)

1. Add `scripts/dumpIeltsTest.ts` (+ `ielts:dump-test` in `package.json`):
   writes the newest version of one test as pretty JSON to
   `docs/ielts-parity/dumps/<slug>.json` (gitignored), read-only.
2. Add `scripts/patchIeltsSection.ts` (+ `ielts:patch-section`): takes
   `<slug> <sectionKey> <file.json>` holding one full section, validates it
   with `ieltsSectionSchema`, runs `checkTest` on the patched test (abort on
   errors), bumps `revision`, writes it, prints a field-level diff. This
   covers D4-D6 and every audit fix (answers, variants, types, options,
   examples, evidence).
3. Add both dump folders to `.gitignore`; run `npx tsc --noEmit` and the
   IELTS tests (`npx vitest run src/modules/ielts src/components/ielts`).
4. Create `docs/ielts-parity/tracker.md`: one row per test (slug, status
   `todo | in-progress | done | blocked`, spoke, counts of found / fixed /
   needs-reference / needs-code).

## Phase 1: spokes, one test per spoke

Run spokes in waves of at most 6 (use the Agent tool, general-purpose). One
spoke owns one test at a time; no two spokes ever work on the same slug.
Order: tests that have reference files first, then by book number.

Give each spoke exactly this brief (fill in `<slug>`):

> You are a SPOKE in an IELTS parity run. Your test: `<slug>`. Read
> `docs/plans/ielts-jumpinto-parity-2026-11-26.md` Part 1 (checklist) and the
> rows for `<slug>` in `docs/plans/ielts-content-audit-2026-11-09.json`.
> Do not open jumpinto.com (blocked by policy) and do not edit any code.
>
> 1. Run `bun run ielts:dump-test -- <slug>` and read the dump.
> 2. Read the reference in `docs/ielts-reference/<slug>/` if it exists.
> 3. Check every section (listening 1-4, reading 1-3, writing 1-2) against
>    D1-D6, the audit rows, and the reference: question numbering and group
>    ranges, instruction text and word limits, group titles, options and
>    word boxes, answer keys and accepted variants, question types, worked
>    examples, passage title / standfirst / paragraph letters and breaks,
>    images for every "diagram / map / plan / picture / chart", audio present,
>    writing prompt, visual and sample answer.
> 4. Fix what you can prove, one section at a time, with
>    `ielts:set-standfirst`, `ielts:paragraph-breaks`, `ielts:attach-image`
>    (only with an image file the owner supplied) or `ielts:patch-section`.
>    Re-dump after each write and confirm the change.
> 5. Write `docs/ielts-parity/findings/<slug>.json`: an array of
>    `{ section, questions, type (D1-D6 | audit category | display),
detail, evidence (reference file + what it shows, or passage line),
status: fixed | needs-reference | needs-image | needs-code | wont-fix,
fix (script + args, or the patch file) }`.
> 6. Return only: counts by status, and every `needs-code` item in one line
>    each (what renders wrong, which component you suspect).

## Phase 2: hub merges after each wave

1. Read each findings file; update `tracker.md`.
2. `needs-code` items: group them; if two or more tests show the same display
   problem, fix it once in the shared renderer (`GroupBlock`, `IeltsMarkdown`,
   `markdown/parse.ts`, `PassagePane`, `ListeningPane`, `WritingRunner`,
   `publicView.ts`), add or update a test, run tsc + IELTS tests + eslint on
   the touched files. Never special-case one slug in code.
3. Check a sample of spoke fixes yourself (re-dump, read the diff) before the
   next wave. If a spoke guessed, revert that section from the previous dump
   with `ielts:patch-section` and mark it `needs-reference`.
4. Start the next wave.

## Phase 3: report

When every test is `done` or `blocked`:

- Write `docs/ielts-parity/summary.md`: totals by type and status, every
  shared-code change, and two owner to-do lists: **images needed** (slug,
  section, questions, what the picture is) and **needs-reference** (slug,
  section, question, what to check in the book or on Jumpinto).
- Tell the owner to clear the content cache
  (`rm .next/dev/cache/fetch-cache/*`) and restart the dev server, since
  `REVALIDATE_SECRET` is unset.
- Do not commit; list the changed code files and the new scripts.

## Done means

- Every test is in the tracker with a findings file.
- `checkTest` reports no errors for any test.
- No display problem is fixed for only one test.
- The owner has a short, concrete list of what only they can provide
  (images, paper checks).
```
