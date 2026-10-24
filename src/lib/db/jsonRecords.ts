/**
 * The shape a value takes after JSON.stringify + JSON.parse: Dates become ISO
 * strings, everything else that is plain data stays as it is. Records crossing
 * a JSON boundary (the Next data cache) are typed with this until revived.
 */
export type Jsonify<T> = T extends Date
  ? string
  : T extends (infer Item)[]
    ? Jsonify<Item>[]
    : T extends object
      ? { [Key in keyof T]: Jsonify<T[Key]> }
      : T

/** Round-trip through JSON so a cache miss returns what a cache hit would. */
export function toJsonSafe<T>(value: T): Jsonify<T> {
  return JSON.parse(JSON.stringify(value)) as Jsonify<T>
}

/**
 * Turn the named ISO-string fields of a JSON record back into Dates. Fields
 * that are null or missing stay as they are, so optional dates survive.
 */
export function reviveDates<T extends object>(
  record: Jsonify<T>,
  keys: readonly (keyof T)[]
): T {
  const revived = { ...(record as object) } as Record<keyof T, unknown>

  for (const key of keys) {
    const value = revived[key]

    if (typeof value === 'string') revived[key] = new Date(value)
  }

  return revived as T
}

/** reviveDates over a list. */
export function reviveDatesInList<T extends object>(
  records: Jsonify<T>[],
  keys: readonly (keyof T)[]
): T[] {
  return records.map(record => reviveDates<T>(record, keys))
}
