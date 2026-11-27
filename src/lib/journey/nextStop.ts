/**
 * One rule for every landing, home and every session end (plan section 5.4):
 * first match wins, in this order of kinds.
 *
 *   resume  an unfinished item, deep-linked to where it stopped
 *   due     a scheduled review that is due now
 *   next    the next new step on the journey
 *   done    nothing left: the all-clear state
 *
 * Each module builds its own candidates; inside one kind the input order is
 * kept, so the module decides which resume or which due item comes first.
 */
export type NextStopKind = 'resume' | 'due' | 'next' | 'done'

export interface NextStopCandidate<Data = unknown> {
  data: Data
  kind: Exclude<NextStopKind, 'done'>
}

export type PickedNextStop<Data> =
  { data: Data; kind: Exclude<NextStopKind, 'done'> } | { kind: 'done' }

const KIND_ORDER: Exclude<NextStopKind, 'done'>[] = ['resume', 'due', 'next']

export function pickNextStop<Data>(
  candidates: ReadonlyArray<NextStopCandidate<Data> | null | undefined | false>
): PickedNextStop<Data> {
  const present = candidates.filter(
    (candidate): candidate is NextStopCandidate<Data> => Boolean(candidate)
  )

  for (const kind of KIND_ORDER) {
    const match = present.find(candidate => candidate.kind === kind)

    if (match) return { data: match.data, kind }
  }

  return { kind: 'done' }
}
