import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

import { describe, expect, test } from 'vitest'

const ROOT = process.cwd()
const SRC = join(ROOT, 'src')
const DOCS = join(ROOT, 'docs')

function files(directory: string, pattern: RegExp): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === 'node_modules') return []
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return files(path, pattern)
    return pattern.test(entry.name) ? [path] : []
  })
}

function repoPath(file: string) {
  return relative(ROOT, file).split(sep).join('/')
}

interface Guard {
  /** Files allowed to match: a permanent exception, or a baseline. */
  allow: string[]
  /** The baseline part of `allow`: still-offending files, shrink-only. */
  baseline?: string[]
  pattern: RegExp
  roots: string[]
  scope?: (path: string) => boolean
}

/** Every `path:line` that matches, outside the allowlist. */
function offenders({ allow, pattern, roots, scope = () => true }: Guard) {
  const allowed = new Set(allow)

  return (
    roots
      .flatMap(root => files(root, /\.tsx?$/))
      .map(repoPath)
      // Tests name the patterns they assert against.
      .filter(path => !/\.test\.tsx?$/.test(path))
      .filter(path => scope(path) && !allowed.has(path))
      .flatMap(path =>
        readFileSync(join(ROOT, path), 'utf8')
          .split('\n')
          .flatMap((line, index) =>
            pattern.test(line) ? [`${path}:${index + 1}`] : []
          )
      )
  )
}

/** Baseline files that no longer match: drop them from the list. */
function staleBaseline({ baseline = [], pattern }: Guard) {
  return baseline.filter(
    path => !pattern.test(readFileSync(join(ROOT, path), 'utf8'))
  )
}

const THIS_FILE = 'src/lib/styleGuards.test.ts'
const COMPONENTS_AND_APP = [join(SRC, 'components'), join(SRC, 'app')]

describe('sticker corners guard', () => {
  // Stops square corners coming back through copy-paste. It does NOT catch a
  // bordered block that simply has no radius class; that is a visual check.
  test('no source file uses rounded-none', () => {
    expect(
      offenders({
        allow: [THIS_FILE, 'src/lib/utils.test.ts'],
        pattern: /rounded-none/,
        roots: [SRC],
      })
    ).toEqual([])
  })
})

// Corner roles only (frontend-ui.md): panel, control, tag, full. The baseline
// lists files written before the guard; each phase that cleans a file removes
// it here, and the stale check below makes sure the list only shrinks.
const CORNERS: Guard = {
  allow: [
    // IELTS exam paper (paper fidelity) and the editor keep their own look.
    'src/components/ielts/widgets/TaskVisual.tsx',
  ],
  baseline: [
    'src/components/common/RouteError.tsx',
    'src/components/common/UserMenu.tsx',
    'src/components/dictation/GuidedAnswerInput.tsx',
    'src/components/dictation/browse/RecordShelves.tsx',
    'src/components/dictation/browse/TopicGrid.tsx',
    'src/components/home/HomeBuddyCard.tsx',
    'src/components/home/HomeModuleTiles.tsx',
    'src/components/home/HomeSimpleView.tsx',
    'src/components/home/HomeStudyDesk.tsx',
    'src/components/home/HomeViewSwitch.tsx',
    'src/components/ielts/catalogue/ProgressTabs.tsx',
    'src/components/ielts/catalogue/TestPath.tsx',
    'src/components/ui/tooltip.tsx',
    'src/components/vocabulary/VocabRecallModal.tsx',
    'src/components/vocabulary/WordGardenHero.tsx',
  ],
  pattern: /\brounded(-[trblxyse]{1,2})?-(\[\d+(\.\d+)?px\]|2xl|3xl)/,
  roots: COMPONENTS_AND_APP,
  scope: path => !path.startsWith('src/components/ielts/editor/'),
}

// `bg-ink` turns into a white slab at night: controls use `cta`.
const INK_CONTROL: Guard = {
  allow: [],
  baseline: [
    'src/components/ielts/runner/IeltsRunner.tsx',
    'src/components/ielts/runner/RunnerFooter.tsx',
    'src/components/ielts/runner/RunnerToolbar.tsx',
    'src/components/ielts/widgets/QuestionNumberBadge.tsx',
    'src/components/ui/tooltip.tsx',
  ],
  pattern: /\bbg-ink(?![\w/-])/,
  roots: [join(SRC, 'components')],
  scope: path => !path.startsWith('src/components/ielts/editor/'),
}

// Raw Tailwind palette and shadcn leftovers instead of the app tokens.
const RAW_PALETTE: Guard = {
  allow: ['src/components/ielts/widgets/TaskVisual.tsx'],
  baseline: [
    'src/app/admin/ielts/page.tsx',
    'src/components/ielts/review/ObjectiveResult.tsx',
    'src/components/ielts/runner/IeltsRunner.tsx',
    'src/components/ielts/runner/ListeningPane.tsx',
    'src/components/ielts/runner/PassagePane.tsx',
    'src/components/ielts/runner/RunnerFooter.tsx',
    'src/components/ielts/runner/TextHighlighter.tsx',
    'src/components/ielts/runner/WritingRunner.tsx',
    'src/components/ielts/widgets/QuestionNumberBadge.tsx',
    'src/components/ui/badge.tsx',
    'src/components/ui/card.tsx',
    'src/components/ui/dialog.tsx',
    'src/components/ui/dropdown-menu.tsx',
    'src/components/ui/input.tsx',
    'src/components/ui/select.tsx',
    'src/components/ui/sheet.tsx',
    'src/components/ui/tabs.tsx',
    'src/components/ui/textarea.tsx',
    'src/components/vocabulary/VocabRecallModal.tsx',
  ],
  pattern:
    /\b(bg|text|border|ring)-(yellow|amber|red|green|blue)-\d|\btext-white\b|\btext-muted-foreground\b/,
  roots: COMPONENTS_AND_APP,
  scope: path => !path.startsWith('src/components/ielts/editor/'),
}

// Headings use font-medium; no bold or black weight in learner screens.
const HEAVY_WEIGHT: Guard = {
  allow: [],
  baseline: [
    'src/components/grammar/player/LessonPlayer.tsx',
    'src/components/grammar/player/PlayerCard.tsx',
    'src/components/grammar/player/PlayerResult.tsx',
    'src/components/ielts/review/LineDictation.tsx',
    'src/components/ielts/runner/PassagePane.tsx',
    'src/components/ielts/widgets/GroupBlock.tsx',
    'src/components/ielts/widgets/QuestionNumberBadge.tsx',
    'src/components/ielts/widgets/ReviewMark.tsx',
    'src/components/ielts/widgets/WritingPrompt.tsx',
  ],
  pattern: /\bfont-(bold|black)\b/,
  roots: [join(SRC, 'components')],
  scope: path =>
    !path.startsWith('src/components/admin/') &&
    !path.startsWith('src/components/ielts/editor/'),
}

// `hover-pop` replaced `hover-lift`; the baseline goes in Phase 8.
const HOVER_LIFT: Guard = {
  allow: [],
  baseline: [
    'src/app/admin/page.tsx',
    'src/components/common/MetricTile.tsx',
    'src/components/dictation/browse/BrowseVideoList.tsx',
    'src/components/dictation/browse/TopicGrid.tsx',
    'src/components/home/HomeBuddyCard.tsx',
    'src/components/home/HomeModuleTiles.tsx',
    'src/components/home/HomeSimpleView.tsx',
    'src/components/home/HomeStudyDesk.tsx',
  ],
  pattern: /\bhover-lift\b/,
  roots: COMPONENTS_AND_APP,
}

for (const [name, guard] of Object.entries({
  CORNERS,
  HEAVY_WEIGHT,
  HOVER_LIFT,
  INK_CONTROL,
  RAW_PALETTE,
}))
  describe(`${name} guard`, () => {
    test('no new offender outside the allowlist', () => {
      expect(
        offenders({
          ...guard,
          allow: [...guard.allow, ...(guard.baseline ?? []), THIS_FILE],
        })
      ).toEqual([])
    })

    test('the baseline only shrinks (drop files that are clean now)', () => {
      expect(staleBaseline(guard)).toEqual([])
    })
  })

describe('no em dash guard', () => {
  // The owner's rule: never the U+2014 character; code that needs it writes
  // the escape. Kept out: IELTS passage dumps (exam data) and two design
  // notes written before the rule.
  const DASH = new RegExp('\u2014')
  const ALLOWED_DOCS = new Set([
    'docs/designs/sticker-manga-corners.md',
    'docs/designs/sticker-manga-sketch.html',
  ])

  test('no source or doc file contains it', () => {
    const found = [
      ...files(SRC, /\.(tsx?|css|md)$/),
      ...files(DOCS, /\.(md|html)$/),
    ]
      .map(repoPath)
      .filter(path => !ALLOWED_DOCS.has(path))
      .filter(path => DASH.test(readFileSync(join(ROOT, path), 'utf8')))

    expect(found).toEqual([])
  })
})
