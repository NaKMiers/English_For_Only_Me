---
name: documentlization
description: Keep the docs/ folder in sync with the source code for the English For Only Me app. Reads the git diff since docs were last generated, maps each changed source file to the doc(s) it affects, and rewrites those docs so an AI can understand the app from docs/ instead of reading the whole tree. Use when the user says "documentlization", "update the docs", "sync docs", "regenerate docs", or after shipping a feature.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Agent
---

# documentlization

Project-local documentation skill for **English For Only Me**. Its single job is
to keep `docs/` faithful to the code with the least churn: detect what changed,
update only the affected docs, and keep the whole set internally consistent.

The docs exist so an AI assistant can understand the app's structure and core
logic from a compact, structured reference instead of reading ~31k lines of
source. Every doc is grounded in real code and cites repo-relative file paths.

## Project style rules (STRICT - apply to every doc you write)

These come from `.agents/rules/project-style.md` and the project memory:

- **Never use the em dash character.** Use a plain hyphen instead, everywhere
  (prose, tables, code, comments).
- ASCII only unless product copy genuinely needs non-ASCII.
- Ground every claim in real code and cite repo-relative file paths as anchors.
  If unsure about behavior, read the file - do not speculate.
- Prefer tables and mermaid diagrams for structure, hierarchies, and flows.
- Keep each doc's H1 title and one-paragraph summary at the top.
- Bun is the package manager. Reference `bun` commands, not npm/yarn/pnpm.

## The docs set (source of truth for structure)

`docs/` is a fixed set of files. Do not rename or renumber them; update in place.

| File | Scope | Rebuild when these change |
| --- | --- | --- |
| `docs/README.md` | Index / entry point + doc map | any doc added, removed, or re-scoped |
| `docs/01-overview.md` | Product purpose, tech stack summary, module roadmap, domain vocabulary | `package.json`, `src/constants/modules.ts`, `src/modules/dictation/types.ts`, `README.md`, `.env.example` |
| `docs/02-architecture.md` | Directory map, layering, server/client boundaries, data-flow diagrams, build/run/test | top-level configs, `src/proxy.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, new top-level `src/*` folders, `.agents/rules/*` |
| `docs/03-data-model.md` | Mongoose models, ER diagram, field tables, indexes, status enums | anything under `src/models/**`, `src/lib/db/connectDatabase.ts`, enum/interface changes in `src/modules/dictation/types.ts`, `src/types/next-auth.d.ts` |
| `docs/04-api-reference.md` | Every route handler, contracts, auth gating, client request helpers | anything under `src/app/api/**/route.ts`, `src/modules/dictation/services/*RouteDecisions.ts` and `*Records.ts`, `src/modules/dictation/schemas/**`, `src/requests/**` |
| `docs/05-modules.md` | Domain/business logic: correction, segmenting, transcripts, translations, review, stats, ai, content, preferences, player, top-level helpers | anything under `src/modules/dictation/**` except the `services/*Route*`/`*Records*` API glue |
| `docs/06-frontend.md` | Pages/routing, component trees, design system, UI primitives | anything under `src/app/**` (non-api pages/layouts/loading/error), `src/components/**`, `src/constants/theme.ts`, `src/constants/dictation.ts`, `src/app/globals.css`, `components.json` |
| `docs/07-auth-infra-testing.md` | Auth.js v5, roles, guest/merge, external integrations (YouTube/OpenAI/Cloudinary/Mongo), env vars, testing | `src/lib/auth/**`, `src/proxy.ts`, `src/app/api/auth/**`, `src/lib/{ai,cloudinary,youtube,db}/**`, `src/constants/environments.ts`, `.env.example`, `vitest.config.mts`, `playwright.config.ts`, `src/test/**`, `.agents/rules/{testing-quality,api-security}.md` |

If you add a genuinely new top-level subsystem that fits none of the above, add a
new `docs/NN-<name>.md`, register it in the table above and in `docs/README.md`.

## Workflow

### Step 0 - Establish the baseline

The skill tracks the last-documented commit in `docs/.doc-state.json`:

```bash
cat docs/.doc-state.json 2>/dev/null || echo '{"lastDocumentedCommit": null}'
git rev-parse HEAD
git status --porcelain
```

- If `docs/.doc-state.json` is missing, treat this as a first run: every doc is
  in scope (a full regeneration). Confirm with the user before a full rebuild if
  the docs already exist and look current.
- Otherwise compute the changed source files since `lastDocumentedCommit`,
  including uncommitted work:

```bash
BASE=$(node -e "process.stdout.write(require('./docs/.doc-state.json').lastDocumentedCommit||'')" 2>/dev/null)
git diff --name-only "${BASE:-HEAD~1}" -- src scripts package.json next.config.ts .env.example .agents
git diff --name-only            # unstaged
git diff --name-only --cached   # staged
git ls-files --others --exclude-standard -- src   # brand-new untracked source
```

### Step 1 - Map changes to docs

For each changed path, look it up in the scope table above to build the set of
docs to update. Print the mapping to the user, for example:

```
Changed: src/models/dictation/DictationSegmentModel.ts -> docs/03-data-model.md
Changed: src/app/api/dictation/sessions/route.ts       -> docs/04-api-reference.md, docs/README.md(check)
Docs to update: 03-data-model, 04-api-reference
```

If nothing maps (only tests, styling, or docs changed with no structural
impact), say so and stop - do not churn the docs.

### Step 2 - Update each affected doc

For each doc in scope:

1. Read the current doc so you preserve its structure, headings, and voice.
2. Read the changed source files (and their neighbors for context) to learn the
   real current behavior. Do not trust the old doc where code changed.
3. Rewrite only the sections the change touches. Keep unchanged sections intact.
   Preserve the H1 and summary; update the summary only if scope shifted.
4. Verify cited file paths still exist. Fix stale paths, add anchors for new
   files, and remove references to deleted files.
5. Update or add mermaid diagrams if the structure/flow changed (new model,
   new endpoint, new layer).

For a large multi-doc update, you may fan out one subagent per affected doc
(each writes its own file, so there are no write conflicts). Give each the
project style rules above, the doc's scope row, and the changed files. Keep
`docs/README.md` and `docs/01-overview.md` for yourself to assemble last so
cross-references stay correct.

### Step 3 - Reconcile the index and cross-links

- Update `docs/README.md` if any doc was added, removed, or re-scoped, and make
  sure every doc link resolves.
- Update `docs/01-overview.md` tech-stack / module tables if
  `package.json` or `src/constants/modules.ts` changed.
- Check inter-doc links (e.g. 02 -> 03) still point at real files.

### Step 4 - Record the new baseline

Write the commit the docs now describe:

```bash
node -e "require('fs').writeFileSync('docs/.doc-state.json', JSON.stringify({lastDocumentedCommit: require('child_process').execSync('git rev-parse HEAD').toString().trim(), updatedAt: new Date().toISOString()}, null, 2)+'\n')"
```

If there is uncommitted work in scope, note in your summary that the baseline
points at the current HEAD and the docs also reflect the uncommitted changes.

### Step 5 - Report

Tell the user: which docs changed, a one-line summary of each change, any new
files documented, and any stale references you removed. Do not commit unless the
user asks.

## Guardrails

- Never invent behavior. If code and the old doc disagree, the code wins - read
  it and correct the doc.
- Never expose secret values (e.g. from `.env.development`). List env keys and
  their purpose only.
- Do not reformat or rewrite docs that had no relevant source change.
- Keep the file numbering and names stable so links and the skill's scope table
  stay valid.

## Self-improvement

Read `.agents/skills/documentlization/references/memory.md` at the start of every
run. Update it (the single canonical copy) when the doc set changes, when a new
source-to-doc mapping is learned, or when the user corrects how a change should
be documented.

## Source of truth

This is the canonical skill definition under `.agents/`. Claude discovers it
through the thin wrapper at `.claude/skills/documentlization/SKILL.md`, which
delegates here. Edit logic and memory only in `.agents/`; after any change to
this skill's `name`/`description` or `references/`, run the `skill-sync` skill
(or `bash .agents/skills/skill-sync/gen-claude-wrappers.sh`) to regenerate the
wrapper.
