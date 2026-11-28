/**
 * Pure half of `bun run auth:drop-guest-data`: which rows count as guest
 * rows, what the run will do, and how it reads its flags. No database here,
 * so it is unit-tested on its own (scripts/lib/guestCleanup.test.ts).
 *
 * Before sign-in became required, anonymous learners practised under a
 * cookie id shaped `guest_` + 32 hex chars. Nothing reads those rows now.
 */

export type GuestOwnerField = 'ownerId' | 'userId'

export interface GuestCleanupTarget {
  /** The Mongo collection name, taken from the model, never hand-typed. */
  collection: string
  ownerField: GuestOwnerField
}

export interface GuestCleanupStep extends GuestCleanupTarget {
  count: number
  filter: Record<string, { $regex: string }>
  willDelete: boolean
}

export interface GuestCleanupPlan {
  apply: boolean
  steps: GuestCleanupStep[]
  total: number
}

/** Anchored prefix, so Mongo can use the owner index. */
export const GUEST_OWNER_REGEX = '^guest_'

export function guestOwnerFilter(field: GuestOwnerField) {
  return { [field]: { $regex: GUEST_OWNER_REGEX } }
}

/** Writing needs both flags; anything else is a dry run. */
export function parseGuestCleanupArgs(argv: readonly string[]) {
  return { apply: argv.includes('--apply') && argv.includes('--i-am-sure') }
}

/**
 * One step per target, in the given order, with the count found by the dry
 * read. Only a step with rows is deleted, and only when applying.
 */
export function planGuestCleanup(
  targets: readonly GuestCleanupTarget[],
  counts: Readonly<Record<string, number>>,
  { apply }: { apply: boolean }
): GuestCleanupPlan {
  const steps = targets.map(target => {
    const count = counts[target.collection] ?? 0

    return {
      ...target,
      count,
      filter: guestOwnerFilter(target.ownerField),
      willDelete: apply && count > 0,
    }
  })

  return {
    apply,
    steps,
    total: steps.reduce((sum, step) => sum + step.count, 0),
  }
}

/** Whether an owner value is a guest id (what the filter matches). */
export function isGuestOwner(value: unknown) {
  return typeof value === 'string' && new RegExp(GUEST_OWNER_REGEX).test(value)
}
