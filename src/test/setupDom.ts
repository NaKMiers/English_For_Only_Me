import { JSDOM } from 'jsdom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

let hasRegisteredCleanup = false

export function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>')
  const domWindow = dom.window as unknown as Window & typeof globalThis

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: domWindow,
  })
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: domWindow.document,
  })
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: domWindow.navigator,
  })
  Object.defineProperty(globalThis, 'HTMLElement', {
    configurable: true,
    value: domWindow.HTMLElement,
  })
  Object.defineProperty(globalThis, 'SVGElement', {
    configurable: true,
    value: domWindow.SVGElement,
  })
  Object.defineProperty(globalThis, 'MutationObserver', {
    configurable: true,
    value: domWindow.MutationObserver,
  })
  Object.defineProperty(domWindow.HTMLElement.prototype, 'attachEvent', {
    configurable: true,
    value: () => undefined,
  })
  Object.defineProperty(domWindow.HTMLElement.prototype, 'detachEvent', {
    configurable: true,
    value: () => undefined,
  })

  if (hasRegisteredCleanup) return

  hasRegisteredCleanup = true

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
  })
}
