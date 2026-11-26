// A line holding only a down arrow separates two flow-chart steps.
const ARROW_LINE = /^\s*[↓⬇⇩]\s*$/

/**
 * A flow-chart body ("Decide on sample:\nTwelve students ... {{q25}}\n\n↓\n
 * \nDecide on methodology:\n...") as the Markdown of each box, or null when
 * the body is not a flow chart. A line ending in ":" heads its box in bold;
 * the other lines become bullets when the box has a heading or more than one
 * line, as the paper sets them.
 */
export function flowChartSteps(body: string): string[] | null {
  const lines = body.replace(/\r\n?/g, '\n').split('\n')

  if (!lines.some(line => ARROW_LINE.test(line))) return null

  const steps: string[][] = [[]]

  for (const raw of lines) {
    const line = raw.trim()

    if (ARROW_LINE.test(line)) steps.push([])
    else if (line) steps[steps.length - 1].push(line)
  }

  const boxes = steps.filter(step => step.length > 0)

  if (boxes.length < 2) return null

  return boxes.map(step => {
    const hasHeading = step.some(line => line.endsWith(':'))
    const bullets = hasHeading || step.length > 1

    return step
      .map(line => {
        if (line.endsWith(':')) return `**${line.replace(/^\*\*|\*\*$/g, '')}**`
        if (!bullets || /^[-*]\s/.test(line)) return line

        return `- ${line}`
      })
      .join('\n')
  })
}
