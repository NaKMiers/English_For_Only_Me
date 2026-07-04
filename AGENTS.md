# Codex Project Instructions

## Project memory

If present, consult `.codex/memory.md` for repo-specific conventions, stack
notes, and preferred workflows before making broad changes.

## Source of truth

This project's rules synthesize the user's existing projects in this priority:

1. `DeewasExpo` for the newest formatting, strictness, naming, component, and
   product-style preferences.
2. `Deewas` for the current Next.js/web translation of those preferences.
3. `AnphaShop` for mature App Router, API, database, ecommerce/security, and
   testing guardrails.

When these projects disagree, prefer the newer DeewasExpo/Deewas convention
unless this repo's local code has a clearer, already-established pattern.

## Project rules

Consult these source-specific rule files before changing the matching area:

- `.agents/rules/project-style.md` for universal TypeScript, naming,
  formatting, file organization, comments, and dependency preferences.
- `.agents/rules/nextjs-app-router.md` for App Router pages, layouts,
  metadata, routing, caching, and server/client component boundaries.
- `.agents/rules/api-security.md` for route handlers, auth, admin routes,
  secrets, validation, email, uploads, AI calls, and external services.
- `.agents/rules/data-and-state.md` for persistence, models, request helpers,
  client stores, local storage, and sync rules.
- `.agents/rules/frontend-ui.md` for components, Tailwind/CSS tokens,
  responsive behavior, copy, icons, loading states, and UI polish.
- `.agents/rules/testing-quality.md` for formatting, test placement,
  verification commands, lint/build expectations, and quality bars.

## Skill routing

When the user's request matches an available skill, invoke that skill first
instead of answering ad hoc or reaching for unrelated tools. Prefer the
project's gstack skills for the workflows they cover.

Key routing rules:

- Product ideas, "is this worth building", brainstorming -> use `/office-hours`
- Bugs, errors, "why is this broken", 500 errors -> use `/investigate`
- Ship, deploy, push, create PR -> use `/ship`
- QA, test the site, find bugs -> use `/qa`
- Code review, check my diff -> use `/review`
- Update docs after shipping -> use `/document-release`
- Weekly retro -> use `/retro`
- Design system, brand -> use `/design-consultation`
- Visual audit, design polish -> use `/design-review`
- Architecture review -> use `/plan-eng-review`
- Save progress, checkpoint, resume -> use `/checkpoint` when available
- Code quality, health check -> use `/health` when available

## Web browsing

Use the `/browse` skill from gstack for web browsing tasks in this repository.
Do not use `mcp__claude-in-chrome__*` tools.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->
