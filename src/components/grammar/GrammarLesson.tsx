import Link from 'next/link'

import { MangaPanel } from '@/components/common/MangaPanel'
import { GRAMMAR_FAMILY_LABELS } from '@/modules/grammar/constants'
import type {
  GrammarContrastRecord,
  GrammarPointApiRecord,
} from '@/modules/grammar/types'

import { GrammarAxes, UnverifiedBanner } from './GrammarRiskBadges'

type LessonProps = GrammarPointApiRecord & {
  contrasts: GrammarContrastRecord[]
  redirectedFrom: string | null
}

export function GrammarLesson({ lesson }: { lesson: LessonProps }) {
  const hasBody = Boolean(lesson.explanation)

  return (
    <div className="grid gap-4">
      {lesson.redirectedFrom ? (
        <p className="border-manga-black bg-manga-paper-soft border-2 border-dashed p-3 text-sm leading-6 font-semibold">
          <code>{lesson.redirectedFrom}</code> was merged into this point. Your
          progress followed the redirect.
        </p>
      ) : null}

      {hasBody && lesson.reviewStatus === 'unverified' ? (
        <UnverifiedBanner />
      ) : null}

      <MangaPanel
        eyebrow={GRAMMAR_FAMILY_LABELS[lesson.family]}
        title={lesson.title}
      >
        <p className="text-manga-ink-soft text-base leading-7 font-semibold">
          {lesson.summary}
        </p>
        <GrammarAxes
          cefrLevel={lesson.cefrLevel}
          complexity={lesson.complexity}
          ieltsImpact={lesson.ieltsImpact}
          l1Risk={lesson.l1Risk}
        />
      </MangaPanel>

      {!hasBody ? (
        <MangaPanel
          eyebrow="Not written yet"
          title="No lesson body"
        >
          <p className="text-manga-ink-soft text-base leading-7 font-semibold">
            This point exists in the taxonomy but has no lesson yet. Run{' '}
            <code>bun run grammar:generate {lesson.slug}</code> to write it,
            then <code>bun run grammar:seed</code>.
          </p>
        </MangaPanel>
      ) : null}

      {lesson.formPatterns.length > 0 ? (
        <MangaPanel
          eyebrow="Form"
          title="Patterns"
        >
          <ul className="grid gap-2">
            {lesson.formPatterns.map(pattern => (
              <li
                className="border-manga-black bg-manga-white border-2 p-2 font-mono text-sm font-semibold"
                key={pattern}
              >
                {pattern}
              </li>
            ))}
          </ul>
        </MangaPanel>
      ) : null}

      {lesson.explanation ? (
        <MangaPanel
          eyebrow="Explanation"
          title="How it works"
        >
          <p className="text-manga-ink-soft text-base leading-7 font-semibold whitespace-pre-line">
            {lesson.explanation}
          </p>
        </MangaPanel>
      ) : null}

      {lesson.explanationVi ? (
        <MangaPanel
          eyebrow="Tieng Viet"
          title="Giai thich"
        >
          <p className="text-manga-ink-soft text-base leading-7 font-semibold whitespace-pre-line">
            {lesson.explanationVi}
          </p>
        </MangaPanel>
      ) : null}

      {lesson.examples.length > 0 ? (
        <MangaPanel
          eyebrow="Examples"
          title="In use"
        >
          <ul className="grid gap-3">
            {lesson.examples.map(example => (
              <li
                className="border-manga-black bg-manga-white grid gap-1 border-2 p-3"
                key={example.en}
              >
                <span className="text-base leading-7 font-semibold">
                  {example.en}
                </span>
                {example.vi ? (
                  <span className="text-manga-ink-soft text-sm leading-6 font-semibold italic">
                    {example.vi}
                  </span>
                ) : null}
                {example.note ? (
                  <span className="text-manga-ink-soft text-xs leading-5 font-black uppercase">
                    {example.note}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </MangaPanel>
      ) : null}

      {lesson.commonMistakes.length > 0 ? (
        <MangaPanel
          eyebrow="Traps"
          title="Common mistakes"
        >
          <ul className="grid gap-3">
            {lesson.commonMistakes.map(mistake => (
              <li
                className="border-manga-black bg-manga-white grid gap-1 border-2 p-3"
                key={mistake.wrong}
              >
                <span className="text-manga-red text-sm leading-6 font-black line-through">
                  {mistake.wrong}
                </span>
                <span className="text-base leading-7 font-semibold">
                  {mistake.right}
                </span>
                <span className="text-manga-ink-soft text-sm leading-6 font-semibold">
                  {mistake.why}
                </span>
              </li>
            ))}
          </ul>
        </MangaPanel>
      ) : null}

      {lesson.minimalPairs.length > 0 ? (
        <MangaPanel
          eyebrow="Both correct"
          title="Same words, different meaning"
        >
          <p className="text-manga-ink-soft mb-3 text-sm leading-6 font-semibold">
            Every sentence below is correct English. What changes is the
            meaning.
          </p>
          <ul className="grid gap-3">
            {lesson.minimalPairs.map(pair => (
              <li
                className="border-manga-black bg-manga-white grid gap-1 border-2 p-3"
                key={pair.sentence}
              >
                <span className="text-base leading-7 font-black">
                  {pair.sentence}
                </span>
                <span className="text-manga-ink-soft text-sm leading-6 font-semibold">
                  {pair.meaning}
                </span>
              </li>
            ))}
          </ul>
        </MangaPanel>
      ) : null}

      {lesson.l1Notes ? (
        <MangaPanel
          eyebrow="Vietnamese interference"
          title="Why this one catches you"
        >
          <p className="text-manga-ink-soft text-base leading-7 font-semibold whitespace-pre-line">
            {lesson.l1Notes}
          </p>
        </MangaPanel>
      ) : null}

      {lesson.contrasts.length > 0 ? (
        <MangaPanel
          eyebrow="Compare"
          title="Contrast with"
        >
          <ul className="grid gap-2">
            {lesson.contrasts.map(contrast => (
              <li key={contrast.slug}>
                <Link
                  className="border-manga-black bg-manga-white hover:bg-manga-pale-red grid gap-1 border-2 p-3"
                  href={`/grammar/points/${contrast.slug}`}
                >
                  <span className="font-sans text-sm font-black uppercase">
                    {contrast.title} ({contrast.cefrLevel})
                  </span>
                  <span className="text-manga-ink-soft text-sm leading-6 font-semibold">
                    {contrast.summary}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </MangaPanel>
      ) : null}
    </div>
  )
}
