import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { IeltsAdminTestRow } from '@/modules/ielts/tests/testService'

import { AdminTestCatalogue } from './AdminTestCatalogue'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

function row(
  id: string,
  title: string,
  createdAt: string,
  status: IeltsAdminTestRow['status'] = 'published'
): IeltsAdminTestRow {
  return {
    id,
    slug: id,
    version: 1,
    status,
    source: 'manual',
    series: '',
    title,
    track: 'academic',
    createdAt,
    updatedAt: createdAt,
    publishedAt: createdAt,
    sections: [{ key: 'l1', genStatus: 'ready', ready: true }],
  }
}

const tests = [
  row('a', 'IELTS 1 Test 1', '2026-10-01T00:00:00.000Z'),
  row('b', 'IELTS 15 Test 1', '2026-10-20T00:00:00.000Z'),
  row('c', 'IELTS 9 Test 1', '2026-10-10T00:00:00.000Z'),
  row('d', 'IELTS 15 Test 2', '2026-10-21T00:00:00.000Z', 'draft'),
]

const headings = () =>
  screen
    .getAllByRole('heading', { level: 2 })
    .map(node => node.firstChild?.textContent)

describe('AdminTestCatalogue', () => {
  it('lists the newest created series first', () => {
    render(
      <AdminTestCatalogue
        tests={tests.filter(test => test.status === 'published')}
        title={<h1>IELTS Tests</h1>}
      />
    )

    expect(headings()).toEqual([
      'IELTS 15 Academic',
      'IELTS 9 Academic',
      'IELTS 1 Academic',
    ])
  })

  it('narrows the tab counts as the search narrows the list', () => {
    render(
      <AdminTestCatalogue
        tests={tests}
        title={<h1>IELTS Tests</h1>}
      />
    )

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search tests' }), {
      target: { value: 'ielts 15' },
    })

    expect(headings()).toEqual(['IELTS 15 Academic'])
    expect(screen.getByRole('tab', { name: /Drafts/ })).toHaveTextContent('1')
    expect(screen.getByRole('tab', { name: /Published/ })).toHaveTextContent(
      '1'
    )
  })
})
