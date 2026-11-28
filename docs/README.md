# English For Only Me - Documentation

This folder is the AI-facing knowledge base for the English For Only Me app: a
private English and IELTS study web app with four live modules: Dictation Lab
(transcribe YouTube segments with token-level correction, spaced review,
analytics and AI debriefs), Vocabulary (dictionary lookup, Explore, word status
and seven-touch recall with Vietnamese meanings), Grammar (a Duolingo-style A1
to C1 lesson path with checkpoints and spaced review) and IELTS (Listening,
Reading and Writing tests in practice, mock and drill modes with band results).
The UI is a soft pastel dashboard with a night theme and an EN / VI switch.

Read these docs instead of reading the roughly 120k lines of source line by line. Every
doc is grounded in the real code and cites repo-relative file paths as anchors,
so you can jump from a doc statement to the exact file that backs it.

## Read in this order

| #   | Doc                                                    | What it answers                                                                                                                                                                                                                                                                                                           |
| --- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | [01-overview.md](./01-overview.md)                     | What the product does, the tech stack, the module roadmap, and the core domain vocabulary. Start here.                                                                                                                                                                                                                    |
| 02  | [02-architecture.md](./02-architecture.md)             | Directory map, layered architecture and dependency direction, server/client boundaries, the practice-attempt data flow, edge auth protection, and build/run/test commands.                                                                                                                                                |
| 03  | [03-data-model.md](./03-data-model.md)                 | The Mongoose collections, ER diagrams, per-model field tables and indexes, every status/enum union, and the per-user ownership (user ObjectId).                                                                                                                                                                           |
| 04  | [04-api-reference.md](./04-api-reference.md)           | Every route handler (contracts, auth gating, status codes), the zod request schemas, and the `src/requests` client fetch helpers.                                                                                                                                                                                         |
| 05  | [05-modules.md](./05-modules.md)                       | Domain logic under `src/modules` for dictation (correction, segmenting, transcripts, practice, review, stats, AI debrief, content) and vocabulary (normalization, providers, enrichment, explore, seven-touch recall, stats), plus the shared recall ladder.                                                              |
| 06  | [06-frontend.md](./06-frontend.md)                     | Pages and routing, the soft pastel design system (tokens, night theme, motion), EN / VI i18n, the shared chrome and UI primitives, and the component trees for home, Dictation, Vocabulary, Grammar and IELTS.                                                                                                            |
| 07  | [07-auth-infra-testing.md](./07-auth-infra-testing.md) | Auth.js v5 (proxy gate on every page, Google OAuth only, the `/auth/login` page, roles, `requireUser`, account lock and admin user management), external integrations (YouTube, Qwen, Cloudinary, MongoDB, keyless vocabulary dictionary/translation providers), signed recall task tokens, env vars, and the test setup. |
| 08  | [08-grammar.md](./08-grammar.md)                       | Grammar domain logic under `src/modules/grammar`: course model, path building and lesson states, sessions and grading, progress and spaced review, checkpoints and test-out.                                                                                                                                              |
| 09  | [09-ielts.md](./09-ielts.md)                           | IELTS domain logic under `src/modules/ielts`: test schema and versions, public views, attempts (practice / mock / drill), scoring and bands, writing grading, AI generation, audio and paper-layout helpers.                                                                                                              |

## Feature plans

- [grammar/](./grammar/README.md) - design, review decisions, test plan and
  wireframe for the Grammar v3 course path.

## Quick orientation

- Stack: Next.js 16 (App Router), React 19, TypeScript strict, MongoDB via
  Mongoose 9, Auth.js v5, Tailwind v4, Zod 4. Package manager: Bun.
- Sign-in with Google is required for every page except `/auth/login`. Without
  Google OAuth config the login page fails closed (a notice, no button). An
  admin can lock an account (`/admin/users`); a locked account reads as signed
  out (`src/lib/auth/accountStatus.ts`). With
  no MongoDB / YouTube / Qwen / Cloudinary config the app still renders,
  falling back to empty and URL-only states.
- Layering (dependencies point downward): App Router pages and
  `route.ts` handlers -> `src/requests` (client fetch) and
  `src/modules/*/services` (decisions + record I/O) -> `src/models`
  -> MongoDB. Pure, unit-tested decision functions are kept separate from
  database record I/O throughout.

## Plans

Design docs, test plans and measurements for larger changes live in
[plans/](./plans/). They record why a change was made and what was decided;
the numbered docs above describe the code as it is now.

- [2026-10-24 performance pass](./plans/2026-10-24-performance-pass-design.md)
  ([test plan](./plans/2026-10-24-performance-pass-test-plan.md),
  [measurements](./plans/2026-10-24-performance-pass-measurements.md))
- [2026-11-09 IELTS content audit](./plans/ielts-content-audit-2026-11-09.md)
- [2026-11-26 IELTS jump-into parity](./plans/ielts-jumpinto-parity-2026-11-26.md)
- [2026-11-27 UI v2: pink brand and night theme](./plans/ui-v2-pink-night-redesign-2026-11-27.md)

[ielts-parity/](./ielts-parity/tracker.md) tracks IELTS paper-layout parity
work. [designs/](./designs/) holds the retired manga sticker design notes, kept
for history only; the current design system is in
[06-frontend.md](./06-frontend.md).

## How these docs stay current

These docs are maintained by the project-local `documentlization` skill. Its
canonical definition lives at `.agents/skills/documentlization/SKILL.md` (shared
by Codex and Claude); Claude discovers it through the thin wrapper at
`.claude/skills/documentlization/SKILL.md`. After changing source code, run:

```
/documentlization
```

It reads the git diff since the last documented commit (tracked in
`docs/.doc-state.json`), maps each changed source file to the doc(s) it affects,
updates only those docs, reconciles this index, and records the new baseline.
The skill's scope table is the authoritative source-file to doc mapping; keep
the file numbering and names stable so links and that mapping stay valid.

Style contract for all docs: no em dash character (use a plain hyphen), ASCII
only, cite real file paths, prefer tables and mermaid diagrams, and never invent
behavior - when code and a doc disagree, the code wins.
