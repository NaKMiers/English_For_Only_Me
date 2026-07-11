# documentlization - memory

Self-improving notes for keeping `docs/` in sync with the code. Append lessons
here; this is the single canonical copy (no Claude-side duplicate).

## Doc set (do not rename or renumber)
- `docs/README.md` - index.
- `docs/01-overview.md` - product, stack, module roadmap, vocabulary.
- `docs/02-architecture.md` - dirs, layering, boundaries, data flow, run/test.
- `docs/03-data-model.md` - Mongoose models, ER diagram, enums.
- `docs/04-api-reference.md` - route handlers + zod schemas + `src/requests`.
- `docs/05-modules.md` - `src/modules/dictation` domain logic.
- `docs/06-frontend.md` - pages, routing, components, design system.
- `docs/07-auth-infra-testing.md` - auth, integrations, env, tests.
- Baseline tracked in `docs/.doc-state.json` (`lastDocumentedCommit`).

## Style invariants
- No em dash anywhere. Use a plain hyphen. ASCII only.
- Cite repo-relative file paths. Code wins over stale doc text.
- Mermaid labels use `<br/>`, not `\n` (portable to GitHub/VS Code renderers).

## Lessons
- Fan out one subagent per affected doc for multi-doc updates; each writes its
  own file so there are no write conflicts. Keep `README.md` + `01-overview.md`
  for the driver to assemble last so cross-references stay correct.
- (add more as the app and its doc mapping evolve)
