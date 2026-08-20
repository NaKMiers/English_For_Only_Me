import { MangaButton } from '@/components/ui/MangaButton'
import {
  GRAMMAR_CEFR_LEVELS,
  GRAMMAR_COMPLEXITY_LEVELS,
  GRAMMAR_FAMILIES,
  GRAMMAR_FAMILY_LABELS,
  GRAMMAR_L1_RISKS,
} from '@/modules/grammar/constants'
import type { ParsedGrammarPointsQuery } from '@/modules/grammar/services/grammarRouteDecisions'

const SELECT_CLASS =
  'border-manga-black bg-manga-white text-manga-black min-h-10 border-2 px-2 font-sans text-xs font-black uppercase'

/**
 * Plain GET form so filters are shareable URLs and the page stays a server
 * component. No client-side state to keep in sync.
 */
export function GrammarPointFilters({
  query,
}: {
  query: ParsedGrammarPointsQuery
}) {
  return (
    <form
      action="/grammar/points"
      className="border-manga-black bg-manga-paper-soft flex flex-wrap items-end gap-2 border-3 p-3 shadow-[4px_4px_0_var(--manga-black)]"
      method="get"
    >
      <label className="grid gap-1">
        <span className="font-sans text-xs font-black uppercase">Level</span>
        <select
          className={SELECT_CLASS}
          defaultValue={query.cefrLevel ?? ''}
          name="cefrLevel"
        >
          <option value="">Any</option>
          {GRAMMAR_CEFR_LEVELS.map(level => (
            <option
              key={level}
              value={level}
            >
              {level}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1">
        <span className="font-sans text-xs font-black uppercase">
          Difficulty
        </span>
        <select
          className={SELECT_CLASS}
          defaultValue={query.complexity ? String(query.complexity) : ''}
          name="complexity"
        >
          <option value="">Any</option>
          {GRAMMAR_COMPLEXITY_LEVELS.map(complexity => (
            <option
              key={complexity}
              value={complexity}
            >
              {complexity}/5
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1">
        <span className="font-sans text-xs font-black uppercase">VI risk</span>
        <select
          className={SELECT_CLASS}
          defaultValue={query.l1Risk ?? ''}
          name="l1Risk"
        >
          <option value="">Any</option>
          {GRAMMAR_L1_RISKS.map(risk => (
            <option
              key={risk}
              value={risk}
            >
              {risk}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1">
        <span className="font-sans text-xs font-black uppercase">Family</span>
        <select
          className={SELECT_CLASS}
          defaultValue={query.family ?? ''}
          name="family"
        >
          <option value="">Any</option>
          {GRAMMAR_FAMILIES.map(family => (
            <option
              key={family}
              value={family}
            >
              {GRAMMAR_FAMILY_LABELS[family]}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1">
        <span className="font-sans text-xs font-black uppercase">Search</span>
        <input
          className={SELECT_CLASS}
          defaultValue={query.q ?? ''}
          name="q"
          placeholder="present perfect"
          type="search"
        />
      </label>

      <MangaButton type="submit">Filter</MangaButton>
      <MangaButton href="/grammar/points">Clear</MangaButton>
    </form>
  )
}
