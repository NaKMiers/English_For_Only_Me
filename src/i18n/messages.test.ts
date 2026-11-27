import { describe, expect, test } from 'vitest'

import { MESSAGES } from './messages'
import { en } from './messages/en'
import { vi } from './messages/vi'

type Tree = { [key: string]: string | Tree }

/** Every leaf as [dotted.path, text]. */
function leaves(tree: Tree, prefix = ''): [string, string][] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key

    return typeof value === 'string'
      ? [[path, value] as [string, string]]
      : leaves(value, path)
  })
}

function placeholders(text: string) {
  return [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()
}

const enLeaves = leaves(en as unknown as Tree)
const viLeaves = new Map(leaves(vi as unknown as Tree))

describe('message catalogues', () => {
  test('Vietnamese has exactly the English keys', () => {
    const enKeys = enLeaves.map(([path]) => path).sort()
    const viKeys = [...viLeaves.keys()].sort()

    expect(viKeys).toEqual(enKeys)
  })

  test('every message is non-empty in both languages', () => {
    const empty = [
      ...enLeaves.filter(([, text]) => !text.trim()).map(([p]) => `en ${p}`),
      ...[...viLeaves]
        .filter(([, text]) => !text.trim())
        .map(([p]) => `vi ${p}`),
    ]

    expect(empty).toEqual([])
  })

  test('both languages use the same placeholders', () => {
    const mismatched = enLeaves
      .filter(
        ([path, text]) =>
          placeholders(text).join() !==
          placeholders(viLeaves.get(path) ?? '').join()
      )
      .map(([path]) => path)

    expect(mismatched).toEqual([])
  })

  test('no message uses the em dash', () => {
    const emDash = String.fromCharCode(0x2014)
    const offenders = [
      ...enLeaves.map(([path, text]) => [`en ${path}`, text]),
      ...[...viLeaves].map(([path, text]) => [`vi ${path}`, text]),
    ]
      .filter(([, text]) => text.includes(emDash))
      .map(([path]) => path)

    expect(offenders).toEqual([])
  })

  test('the locale map points at both catalogues', () => {
    expect(MESSAGES.en).toBe(en)
    expect(MESSAGES.vi).toBe(vi)
  })
})
