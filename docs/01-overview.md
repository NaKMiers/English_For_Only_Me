# Product & System Overview

English For Only Me is a private, single-purpose IELTS study web app. Today it
ships two live learning modules. The Dictation Lab lets the learner practice
English listening by transcribing short segments of YouTube videos, get their
typed answer graded token by token, build a spaced-repetition review queue from
their mistakes, and receive an AI-generated debrief after a session. The
Vocabulary module seeds common English word shells, enriches selected words
through free dictionary providers, lets users mark words as `Should learn` or
`Already know`, and schedules seven-touch recall. The app is designed to run and
degrade gracefully even when optional services (MongoDB, Google auth, YouTube
API, OpenAI, Cloudinary) are not configured.

## What the product does

- Import a YouTube video (by URL) into a content library, optionally enriched
  with metadata from the YouTube Data API.
- Attach a transcript (manual text, timed text, or caption file), then split it
  into practice segments with automatic quality flags.
- Practice a video: watch/hide the player, listen to a segment, type what was
  said, and receive immediate token-level correction (correct / wrong / missing
  / extra / spelling-variant), plus reveal and skip actions.
- Track progress and analytics per video and globally: accuracy trends, streaks,
  hardest segments, most-missed words, and a mistake taxonomy.
- Review weak items on a spaced-repetition schedule generated from attempt
  history.
- Start from the NGSL top 1000 vocabulary shells, then enrich words on demand or
  in admin batches through free dictionary providers.
- Search, lookup, Explore, classify, and recall vocabulary words on a seven
  stage schedule through day 45.
- Read an AI debrief (content summary, key vocabulary, listening traps, weak
  patterns, next actions) generated from the session by an LLM.
- Browse content by Topic -> Section -> Video, search/filter/sort/paginate,
  and favorite videos.
- Admins manage the content library: create topics/sections, import and assign
  videos, drag-to-reorder, upload topic thumbnails, and edit segments.

## Audience for these docs

These documents exist so an AI assistant can understand the app's structure and
core logic from a compact, structured reference instead of reading the ~31k
lines of source line by line. Every document is grounded in the real code and
cites repo-relative file paths as anchors.

## Tech stack (summary)

| Area            | Choice                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------- |
| Framework       | Next.js 16 (App Router), React 19                                                               |
| Language        | TypeScript (strict)                                                                             |
| Styling         | Tailwind CSS v4, `tw-animate-css`, `clsx` + `tailwind-merge` (`cn`), `class-variance-authority` |
| UI primitives   | `@base-ui/react`, shadcn-style components, `lucide-react` icons                                 |
| Data            | MongoDB via Mongoose 9                                                                          |
| Auth            | Auth.js v5 (`next-auth` 5 beta), Google OAuth + JWT sessions + guest cookie                     |
| Validation      | Zod 4                                                                                           |
| AI              | OpenAI-compatible client (debrief + translation)                                                |
| Media           | YouTube Data API (import), Cloudinary (thumbnail upload)                                        |
| Package manager | Bun (`bun.lock`)                                                                                |
| Tests           | Vitest + Testing Library + jsdom (unit), Playwright (e2e)                                       |

See [docs/02-architecture.md](./02-architecture.md) for the full stack table and
layering.

## Module roadmap

The home "Study Desk" surfaces one active module and several planned ones. The
list is data-driven from `src/constants/modules.ts` (`APP_MODULES`).

| Module        | Key             | Status    | Route            |
| ------------- | --------------- | --------- | ---------------- |
| Dictation Lab | `dictation`     | active    | `/dictation`     |
| Vocabulary    | `vocabulary`    | active    | `/vocabulary`    |
| Writing Notes | `writing-notes` | future    | `/writing-notes` |
| AI Coach      | `ai-coach`      | future    | `/ai-coach`      |
| Reading       | `reading`       | secondary | `/reading`       |
| Speaking      | `speaking`      | secondary | `/speaking`      |

Dictation Lab and Vocabulary are implemented. The others are placeholders that
shape the intended product surface.

## Core domain vocabulary

| Term             | Meaning                                                                       |
| ---------------- | ----------------------------------------------------------------------------- |
| Topic            | Top-level content grouping (has a slug, thumbnail, ordered sections).         |
| Section          | A group of videos inside a topic.                                             |
| Video            | A YouTube source with metadata, one active transcript, and segments.          |
| Transcript       | Raw text/cues for a video, normalized and quality-graded; one is active.      |
| Segment          | A single practiceable sentence/line derived from a transcript.                |
| Session          | A user's practice run over a video's segments.                                |
| Attempt          | One graded submission (check/reveal/skip) against a segment.                  |
| Review item      | A weak spot (word/segment/pattern) scheduled for spaced review.               |
| Debrief          | An AI-generated post-session summary and coaching output.                     |
| Favorite         | A user's bookmark on a video.                                                 |
| Vocab entry      | A global dictionary-cache row keyed by language and normalized term.          |
| User vocab item  | A per-user word-learning state: learning, already know, mastered, or ignored. |
| Vocab occurrence | A trail of where a user encountered or looked up a word.                      |

The full field-level model is in [docs/03-data-model.md](./03-data-model.md).

## Where to read next

- Architecture, layering, and data flow: [docs/02-architecture.md](./02-architecture.md)
- Data model and collections: [docs/03-data-model.md](./03-data-model.md)
- HTTP API and client request helpers: [docs/04-api-reference.md](./04-api-reference.md)
- Domain/business logic (correction, segmenting, review, stats, AI): [docs/05-modules.md](./05-modules.md)
- Frontend pages, components, and design system: [docs/06-frontend.md](./06-frontend.md)
- Auth, external integrations, config, and testing: [docs/07-auth-infra-testing.md](./07-auth-infra-testing.md)
