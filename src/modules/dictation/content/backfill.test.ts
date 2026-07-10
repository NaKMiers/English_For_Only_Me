import { describe, expect, it, vi } from 'vitest'

import { backfillContentHierarchy, type BackfillVideoModel } from './backfill'

function makeModel(over: Partial<BackfillVideoModel> = {}): BackfillVideoModel {
  return {
    estimatedDocumentCount: vi.fn().mockResolvedValue(10),
    countDocuments: vi.fn().mockResolvedValue(4),
    updateMany: vi.fn().mockResolvedValue({ modifiedCount: 4 }),
    ...over,
  }
}

describe('backfillContentHierarchy', () => {
  it('dry-run reports counts and mutates nothing', async () => {
    const model = makeModel()

    const result = await backfillContentHierarchy({ dryRun: true }, model)

    expect(result).toEqual({
      scanned: 10,
      needing: 4,
      updated: 0,
      dryRun: true,
    })
    expect(model.updateMany).not.toHaveBeenCalled()
  })

  it('apply sets the hierarchy fields to null on videos missing them', async () => {
    const model = makeModel()

    const result = await backfillContentHierarchy({ dryRun: false }, model)

    expect(result.updated).toBe(4)
    expect(model.updateMany).toHaveBeenCalledWith(expect.any(Object), {
      $set: { topicId: null, sectionId: null, level: null },
    })
  })

  it('is idempotent: a second run with nothing needing backfill skips the write', async () => {
    const model = makeModel({ countDocuments: vi.fn().mockResolvedValue(0) })

    const result = await backfillContentHierarchy({ dryRun: false }, model)

    expect(result).toEqual({
      scanned: 10,
      needing: 0,
      updated: 0,
      dryRun: false,
    })
    expect(model.updateMany).not.toHaveBeenCalled()
  })
})
