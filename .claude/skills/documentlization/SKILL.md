---
name: documentlization
description: Keep the docs/ folder in sync with the source code for the English For Only Me app. Reads the git diff since docs were last generated, maps each changed source file to the doc(s) it affects, and rewrites those docs so an AI can understand the app from docs/ instead of reading the whole tree. Use when the user says "documentlization", "update the docs", "sync docs", "regenerate docs", or after shipping a feature.
---

# Documentlization (Claude wrapper)

This is the Claude discovery wrapper for the **documentlization** skill. The canonical
definition lives under `.agents/` so Codex and Claude share one source of truth.

When this skill runs:

1. Read and follow `.agents/skills/documentlization/SKILL.md` exactly.
2. Read the references it points to, including `.agents/skills/documentlization/references/memory.md`.
3. Apply the project rules in `CLAUDE.md` / `AGENTS.md` and `.agents/rules/`.
4. Write any skill self-improvement back to `.agents/skills/documentlization/references/memory.md` (the single canonical copy), never a Claude-side duplicate.

Do not duplicate the skill logic here. If this wrapper and the canonical file ever
disagree, `.agents/skills/documentlization/SKILL.md` wins.
