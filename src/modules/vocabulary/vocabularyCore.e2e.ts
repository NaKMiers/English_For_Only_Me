import { expect, type Locator, type Page, test } from 'playwright/test'

test.skip(
  !process.env.PLAYWRIGHT_BASE_URL || !process.env.MONGODB_URI,
  'Set PLAYWRIGHT_BASE_URL and MONGODB_URI to run the vocabulary smoke flow.'
)

// The seeded learner keeps its words between runs, so every run plants a word
// it has not picked yet (the first card Explore deals) and answers every due
// card right, so no card is left due for the next run.
const DAILY_AUTO_OPEN_STORAGE_KEY = 'vocab:recall:auto-open-date'
const DUE_RECALL_PATH = '/api/vocab/recall/due'
const MAX_RECALL_CARDS = 20

interface RecallTask {
  entry: { id: string; term: string }
  options: { definition: string | null; id: string; term: string | null }[]
  type: string
}

function normalize(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

/** The Learning count in the "How a word grows" drawer. */
async function learningCount(page: Page) {
  const text = await page
    .getByRole('link', { name: /^Learning \d+$/ })
    .innerText()

  return Number(text.match(/\d+/)?.[0])
}

/**
 * Answers the card on screen correctly, whatever its type: "I Remember" for
 * an example card, else the option the queue marks as correct. The card is
 * matched to its task by its options, which the page shows in queue order.
 * Returns the card's word.
 */
async function answerCard(dialog: Locator, tasks: RecallTask[]) {
  const remember = dialog.getByRole('button', { name: 'I Remember' })
  const options = dialog.getByRole('listitem').getByRole('button')

  if (await remember.isVisible()) {
    const term = await dialog.getByRole('heading', { level: 3 }).innerText()

    await remember.click()
    await expect(dialog.getByText('Correct!')).toBeVisible()
    await dialog.getByRole('button', { name: 'Continue' }).click()

    return normalize(term)
  }

  // Each option shows its key number, then its word or definition.
  const shown = await options.evaluateAll(buttons =>
    buttons.map(
      button => button.querySelector(':scope > span:last-child')?.textContent
    )
  )
  const labels = shown.map(text => normalize(text ?? ''))
  const task = tasks.find(
    candidate =>
      candidate.options.length === labels.length &&
      candidate.options.every(
        (option, index) =>
          normalize(option.term ?? option.definition ?? '') === labels[index]
      )
  )

  if (!task)
    throw new Error(`No due task has the options ${labels.join(' | ')}`)

  const kind = task.type.endsWith('ChooseWord') ? 'word' : 'definition'
  const correct = task.options.findIndex(
    option => option.id === `${kind}:${task.entry.id}`
  )

  await options.nth(correct).click()
  await expect(dialog.getByText('Correct!')).toBeVisible()
  await dialog.getByRole('button', { name: 'Continue' }).click()

  return task.entry.term
}

test('search, learn, recall, and stats update', async ({ page }) => {
  // The page opens recall by itself once a day; this test opens it on purpose.
  await page.addInitScript(
    ([key, today]) => window.localStorage.setItem(key, today),
    [DAILY_AUTO_OPEN_STORAGE_KEY, new Date().toISOString().slice(0, 10)]
  )
  await page.goto('/vocabulary')

  const learningBefore = await learningCount(page)
  const term = (
    await page
      .locator('article')
      .getByRole('heading', { level: 3 })
      .first()
      .innerText()
  ).trim()

  // Search: the lookup loads the word with its meaning into the search card.
  const search = page.locator('[data-slot="card"]').filter({
    has: page.getByRole('heading', { name: 'Search a word' }),
  })

  await search
    .getByRole('searchbox', { name: 'Search vocabulary term' })
    .fill(term)
  await search.getByRole('button', { name: 'Lookup' }).click()
  await expect(page.getByText(`Loaded "${term}".`)).toBeVisible({
    timeout: 15_000,
  })
  await expect(
    search.getByRole('heading', { exact: true, name: term })
  ).toBeVisible()

  // Learn: the word joins the recall queue and the Learning count goes up.
  // The queue reloads in the background; recall must open on the new queue,
  // since the page never swaps cards in the middle of a session.
  const shouldLearn = search.getByRole('button', {
    exact: true,
    name: 'Should Learn',
  })
  const dueReload = page.waitForResponse(
    response =>
      new URL(response.url()).pathname === DUE_RECALL_PATH && response.ok()
  )

  await shouldLearn.click()
  await expect(shouldLearn).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByText(`"${term}" is in your recall queue.`)
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: `Learning ${learningBefore + 1}` })
  ).toBeVisible({ timeout: 15_000 })

  const { tasks } = (await (await dueReload).json()) as { tasks: RecallTask[] }

  // A new word is due at once.
  expect(tasks.map(task => task.entry.term)).toContain(term)

  // Recall: every due card answered right moves a step.
  await page.getByRole('button', { name: 'Start Recall' }).click()

  const dialog = page.getByRole('dialog', {
    name: 'Vocabulary flashcard review',
  })
  const sessionDone = dialog.getByRole('heading', { name: 'Session done' })
  const nextCard = dialog
    .getByRole('button', { name: 'I Remember' })
    .or(dialog.getByRole('listitem').getByRole('button'))
  const answered: string[] = []

  for (let card = 0; card < MAX_RECALL_CARDS; card += 1) {
    await expect(sessionDone.or(nextCard).first()).toBeVisible()
    if (await sessionDone.isVisible()) break
    answered.push(await answerCard(dialog, tasks))
  }

  expect(answered).toContain(term)
  await expect(sessionDone).toBeVisible()
  await expect(
    dialog.getByText(
      `${answered.length} right, ${answered.length} moved a step`
    )
  ).toBeVisible()

  // Stats: the word is still Learning (now at step 2) and nothing is due.
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(dialog).toBeHidden()
  await expect(
    page.getByRole('link', { name: `Learning ${learningBefore + 1}` })
  ).toBeVisible()
  await expect(page.getByText('Nothing is due right now')).toBeVisible({
    timeout: 15_000,
  })
})
