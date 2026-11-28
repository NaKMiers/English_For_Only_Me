# Product & System Overview

English For Only Me is a private, single-learner English and IELTS study web
app. It ships four live modules. The Dictation Lab trains listening by
transcribing YouTube segments with token-level correction, spaced review and AI
debriefs. Vocabulary looks words up through free dictionary providers, lets the
learner mark them, and schedules seven-touch recall with Vietnamese meanings.
Grammar is a Duolingo-style path of short Vietnamese-explained lessons from A1
to C1 with stars, checkpoints, spaced review and weak-spot practice. IELTS runs
full Listening, Reading and Writing tests in practice, mock and drill modes on
an exam-paper layout, with band scores, evidence review and AI writing feedback.
The UI is a soft pastel dashboard with a night theme and an English /
Vietnamese switch. The app degrades gracefully when optional services
(MongoDB, Google auth, YouTube API, Qwen, Cloudinary) are not configured.

## What the product does

- Dictation: import a YouTube video, attach a transcript, split it into
  segments, practise each line with immediate correction (correct / wrong /
  missing / extra / spelling variant), reveal or skip, and review weak items on
  a schedule. Per-video and global stats, favourites, and an AI debrief.
- Vocabulary: start from NGSL word shells, enrich words on demand or in admin
  batches, search and Explore, mark words `Should learn` or `Already know`, and
  recall them on a seven-stage schedule spanning 44 days. Every recall answer
  shows the verdict with the Vietnamese meaning. Words can be looked up from a
  dictation correction or an IELTS passage.
- Grammar: work through 12 units of short lessons (choice, fill, order and
  fix-the-mistake cards), earn up to three stars, pass a unit checkpoint or test
  out, review lessons when they come due, and practise past mistakes.
- IELTS: browse tests by series, launch a skill in practice (guided checks,
  evidence), mock (timed, no transcript) or drill (one question type), and read
  a band result with per-question review. Writing tasks get AI grading. Admins
  author tests in an editor with AI-assisted generation and audio.
- Progress lives per learner: a signed-in user, or a guest cookie whose data
  merges into the account on sign-in. Writes go through a client outbox, so
  practice survives a flaky network.

## Audience for these docs

These documents exist so an AI assistant can understand the app's structure and
core logic from a compact, structured reference instead of reading the roughly
120k lines of TypeScript source. Every document is grounded in the real code and
cites repo-relative file paths as anchors.

## Tech stack (summary)

| Area            | Choice                                                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Framework       | Next.js 16 (App Router), React 19                                                                                                  |
| Language        | TypeScript (strict)                                                                                                                |
| Styling         | Tailwind CSS v4, `tw-animate-css`, `clsx` + `tailwind-merge` (`cn`), `class-variance-authority`; font Be Vietnam Pro (`next/font`) |
| UI primitives   | `@base-ui/react`, shadcn-style components, `lucide-react` icons                                                                    |
| i18n            | In-house typed EN / VI catalogue (`src/i18n/**`), cookie `efom-locale`                                                             |
| Data            | MongoDB via Mongoose 9                                                                                                             |
| Auth            | Auth.js v5 (`next-auth` 5 beta), Google OAuth + JWT sessions + guest cookie                                                        |
| Validation      | Zod 4                                                                                                                              |
| AI              | Qwen on Alibaba Cloud Model Studio (dictation debrief and translation, IELTS writing grading and test generation, speech)          |
| Media           | YouTube Data API (import), Cloudinary (thumbnails, IELTS images and audio)                                                         |
| Package manager | Bun (`bun.lock`)                                                                                                                   |
| Tests           | Vitest + Testing Library + jsdom (unit), Playwright (e2e)                                                                          |

See [docs/02-architecture.md](./02-architecture.md) for the full stack and
layering.

## Module roadmap

The list is data-driven from `src/constants/modules.ts` (`APP_MODULES`); labels
live in the message catalogue under `common.modules`.

| Module        | Key          | Status | Route         |
| ------------- | ------------ | ------ | ------------- |
| Dictation Lab | `dictation`  | active | `/dictation`  |
| Vocabulary    | `vocabulary` | active | `/vocabulary` |
| Grammar       | `grammar`    | active | `/grammar`    |
| IELTS Tests   | `ielts`      | active | `/ielts`      |

The four active modules are implemented. Writing Notes, Reading and Speaking are
hidden from navigation because the IELTS module covers them; AI Coach shows as a
disabled item.

## Core domain vocabulary

| Term                          | Meaning                                                                                                         |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Topic / Section / Video       | Dictation content: a topic holds ordered sections of YouTube videos.                                            |
| Transcript / Segment          | A video's normalised text, and one practiceable line derived from it.                                           |
| Session / Attempt             | A learner's practice run over a video, and one graded submission (check / reveal / skip) on a segment.          |
| Review item                   | A dictation weak spot scheduled for spaced review.                                                              |
| Debrief                       | An AI-generated post-session summary and coaching.                                                              |
| Favorite                      | A bookmark on a dictation video.                                                                                |
| Vocab entry / User vocab item | A global dictionary-cache row, and a learner's state for that word (learning, already know, mastered, ignored). |
| Recall task                   | One generated vocabulary exercise (listen, definition, example), signed into a short-lived token.               |
| Grammar unit / lesson / card  | A unit of five lessons ending in a checkpoint; a lesson is a list of explain and practice cards.                |
| Lesson state                  | `open`, `locked`, `passed`, `due` (review due), `mastered`.                                                     |
| Checkpoint / Test-out         | A unit test that unlocks the next unit, or skips a locked unit and everything before it.                        |
| Weak spot                     | A grammar card the learner missed, served again until answered right.                                           |
| IELTS test / section          | A test with Listening, Reading and Writing sections; versioned and published by admins.                         |
| Attempt mode                  | `practice`, `mock` or `drill`.                                                                                  |
| Band                          | The IELTS 0 to 9 score derived from raw marks or writing grading.                                               |
| Guest / owner key             | A cookie-backed anonymous learner id, and its hashed form used to scope client-side queues.                     |
| Outbox                        | The client queue that stores writes per learner and replays them in order with idempotency keys.                |

The field-level model is in [docs/03-data-model.md](./03-data-model.md).

## Where to read next

- Architecture, layering, and data flow: [docs/02-architecture.md](./02-architecture.md)
- Data model and collections: [docs/03-data-model.md](./03-data-model.md)
- HTTP API and client request helpers: [docs/04-api-reference.md](./04-api-reference.md)
- Dictation and vocabulary domain logic: [docs/05-modules.md](./05-modules.md)
- Frontend pages, components, design system and i18n: [docs/06-frontend.md](./06-frontend.md)
- Auth, external integrations, config, and testing: [docs/07-auth-infra-testing.md](./07-auth-infra-testing.md)
- Grammar domain logic: [docs/08-grammar.md](./08-grammar.md)
- IELTS domain logic: [docs/09-ielts.md](./09-ielts.md)
