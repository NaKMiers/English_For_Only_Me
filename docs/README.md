# English For Only Me - Documentation

This folder is the AI-facing knowledge base for the English For Only Me app: a
private IELTS study web app with two live learning modules: Dictation Lab
(practice English listening by transcribing YouTube video segments, with
token-level correction, spaced-repetition review, analytics, and AI debriefs)
and Vocabulary (free dictionary lookup, Explore, user word status, and
seven-touch recall).

Read these docs instead of reading the ~31k lines of source line by line. Every
doc is grounded in the real code and cites repo-relative file paths as anchors,
so you can jump from a doc statement to the exact file that backs it.

## Read in this order

| #   | Doc                                                    | What it answers                                                                                                                                                            |
| --- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | [01-overview.md](./01-overview.md)                     | What the product does, the tech stack, the module roadmap, and the core domain vocabulary. Start here.                                                                     |
| 02  | [02-architecture.md](./02-architecture.md)             | Directory map, layered architecture and dependency direction, server/client boundaries, the practice-attempt data flow, edge auth protection, and build/run/test commands. |
| 03  | [03-data-model.md](./03-data-model.md)                 | The Mongoose collections, ER diagrams, per-model field tables and indexes, every status/enum union, and the guest-vs-user ownership split.                                 |
| 04  | [04-api-reference.md](./04-api-reference.md)           | Every route handler (contracts, auth gating, status codes), the zod request schemas, and the `src/requests` client fetch helpers.                                          |
| 05  | [05-modules.md](./05-modules.md)                       | The domain logic under `src/modules`: dictation (correction engine, segmenting, transcripts, review scheduler, stats, AI debrief, content) and vocabulary (normalization, dictionary providers, enrichment, explore, seven-touch recall, stats). |
| 06  | [06-frontend.md](./06-frontend.md)                     | Pages and routing, the manga-page design system, the UI primitive library, and the component trees for the browse / practice / results / review / stats / admin flows.     |
| 07  | [07-auth-infra-testing.md](./07-auth-infra-testing.md) | Auth.js v5 (edge/Node split, Google OAuth, roles, guest identity and merge), external integrations (YouTube, OpenAI, Cloudinary, MongoDB, keyless vocabulary dictionary/translation providers), signed recall task tokens, env vars, and the test setup. |

## Quick orientation

- Stack: Next.js 16 (App Router), React 19, TypeScript strict, MongoDB via
  Mongoose 9, Auth.js v5, Tailwind v4, Zod 4. Package manager: Bun.
- The app degrades gracefully: with no MongoDB / Google / YouTube / OpenAI /
  Cloudinary config it still renders, falling back to guest and URL-only states.
- Layering (dependencies point downward): App Router pages and
  `route.ts` handlers -> `src/requests` (client fetch) and
  `src/modules/*/services` (decisions + record I/O) -> `src/models`
  -> MongoDB. Pure, unit-tested decision functions are kept separate from
  database record I/O throughout.

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
