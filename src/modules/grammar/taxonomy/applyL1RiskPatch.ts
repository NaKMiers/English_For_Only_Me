import { GRAMMAR_L1_RISKS } from '@/modules/grammar/constants'
import { validateGrammarContent } from '@/modules/grammar/seed/validateGrammarContent'
import type {
  GrammarContentFile,
  GrammarL1Risk,
  GrammarValidationIssue,
} from '@/modules/grammar/types'

export interface L1RiskPatch {
  /** Null clears a previously recorded judgment. */
  l1RiskObserved: GrammarL1Risk | null
  slug: string
}

export type L1RiskPatchResult =
  | { ok: true; points: GrammarContentFile }
  | { ok: false; issues: GrammarValidationIssue[] }

/**
 * Record one judgment about how hard a point really is, returning the whole
 * taxonomy with that one row changed.
 *
 * Pure on purpose. This is the codepath that can destroy irreplaceable work -
 * hours of the builder's own reading, held in a single committed JSON file - so
 * every failure branch has to be reachable in a test with plain objects, with no
 * filesystem and no database involved. The route around it is a thin shell:
 * read the file, call this, write atomically.
 *
 * Three things it deliberately does NOT do:
 *
 * - It never touches `l1Risk`. That field gates content requirements enforced by
 *   `grammar:validate`, so raising it on a point with 8 drills breaks the build
 *   rather than recording an opinion.
 * - It never touches `reviewStatus`. Marking 184 lessons human-reviewed on the
 *   strength of a difficulty pass would be exactly the dishonesty the unverified
 *   banner exists to prevent. Judging a point hard is not reading its lesson.
 * - It never writes. The caller owns that, and the human owns the commit.
 */
export function applyL1RiskPatch(
  points: GrammarContentFile,
  patch: L1RiskPatch
): L1RiskPatchResult {
  const issues: GrammarValidationIssue[] = []
  const index = points.findIndex(point => point.slug === patch.slug)

  if (index === -1)
    issues.push({
      message: `No grammar point with slug "${patch.slug}".`,
      rule: 'unknown-slug',
      slug: patch.slug,
    })

  if (
    patch.l1RiskObserved != null &&
    !(GRAMMAR_L1_RISKS as readonly string[]).includes(patch.l1RiskObserved)
  )
    issues.push({
      message: `"${patch.l1RiskObserved}" is not a known l1Risk value.`,
      rule: 'enum',
      slug: patch.slug,
    })

  if (issues.length > 0) return { issues, ok: false }

  const next = points.map((point, at) =>
    at === index ? { ...point, l1RiskObserved: patch.l1RiskObserved } : point
  )

  // Validate the WHOLE result, not just the row that changed. A patch is only
  // safe to write if what it produces is a file the seed pipeline would accept;
  // checking the row alone would let an unrelated pre-existing defect be
  // committed under cover of this write.
  const validation = validateGrammarContent({ points: next })

  if (!validation.ok) return { issues: validation.issues, ok: false }

  return { ok: true, points: next }
}
