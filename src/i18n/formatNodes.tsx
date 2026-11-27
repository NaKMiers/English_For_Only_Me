import { Fragment, type ReactNode } from 'react'

/**
 * Like `format`, but the values may be React nodes, for a sentence that holds
 * a link, a `<kbd>` or a bold word. The node's own text should come from the
 * catalogue too, so word order can change between languages.
 *
 * formatNodes(t.dictation.pressKey, { key: <kbd>{t.dictation.enter}</kbd> })
 */
export function formatNodes(
  template: string,
  values: Record<string, ReactNode>
): ReactNode[] {
  return template.split(/(\{\w+\})/g).map((part, index) => {
    const match = /^\{(\w+)\}$/.exec(part)
    const node = match && match[1] in values ? values[match[1]] : part

    return <Fragment key={index}>{node}</Fragment>
  })
}
