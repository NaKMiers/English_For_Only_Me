import { Types } from 'mongoose'
import { describe, expect, it } from 'vitest'

import { IELTS_SAMPLE_TEST } from '../fixtures/sampleTest'
import { toIeltsTestRecord } from './testRecords'

describe('toIeltsTestRecord', () => {
  it('keeps the id when a cached record is revived (no _id left)', () => {
    const _id = new Types.ObjectId()
    const record = toIeltsTestRecord({ ...IELTS_SAMPLE_TEST, _id })
    const revived = toIeltsTestRecord(
      JSON.parse(JSON.stringify(record)) as Record<string, unknown>
    )

    expect(record.id).toBe(_id.toHexString())
    expect(revived.id).toBe(_id.toHexString())
    expect(() => new Types.ObjectId(revived.id)).not.toThrow()
  })
})
