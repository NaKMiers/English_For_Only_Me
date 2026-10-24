/**
 * Seedable randomness. Every shuffle and sample in the grammar module takes an
 * `Rng`, so tests are deterministic and a reported "this question set" can be
 * replayed from its seed.
 */
export type Rng = () => number

/** mulberry32: tiny, fast, good enough for shuffling cards. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0

    let value = state

    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function randomSeed() {
  return Math.floor(Math.random() * 2 ** 31)
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = [...items]

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1))

    ;[result[index], result[swap]] = [result[swap] as T, result[index] as T]
  }

  return result
}

export function sample<T>(items: readonly T[], count: number, rng: Rng): T[] {
  return shuffle(items, rng).slice(0, Math.max(0, count))
}
