export type MessageValues = Record<string, string | number>

export interface PluralForms {
  one: string
  other: string
}

const PLACEHOLDER = /\{(\w+)\}/g

/**
 * Fills `{name}` placeholders in a catalogue string. A placeholder with no
 * value is left as written, so a missing value is visible instead of silent.
 */
export function format(template: string, values: MessageValues = {}): string {
  return template.replace(PLACEHOLDER, (match, key: string) =>
    key in values ? String(values[key]) : match
  )
}

/**
 * Picks the singular or plural form for `count` and fills it. `{count}` is
 * always available in the template. Vietnamese has no plural inflection, so
 * its catalogue usually repeats the same text in both forms.
 */
export function plural(
  forms: PluralForms,
  count: number,
  values: MessageValues = {}
): string {
  return format(count === 1 ? forms.one : forms.other, { count, ...values })
}
