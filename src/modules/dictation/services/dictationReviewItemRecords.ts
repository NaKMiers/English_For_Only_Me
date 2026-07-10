import type {
  DictationReviewItemApiRecord,
  DictationReviewStatsSnapshotRecord,
} from '@/modules/dictation/types'

const EMPTY_STATS_SNAPSHOT: DictationReviewStatsSnapshotRecord = {
  accuracy: 0,
  attemptCount: 0,
  lastAction: 'check',
  mistakeTaxonomy: {
    extra: 0,
    missing: 0,
    spellingVariant: 0,
    wrong: 0,
  },
}

interface ReviewStatsSnapshotInput {
  accuracy?: number | null
  attemptCount?: number | null
  lastAction?: DictationReviewStatsSnapshotRecord['lastAction'] | null
  mistakeTaxonomy?: Partial<
    DictationReviewStatsSnapshotRecord['mistakeTaxonomy']
  > | null
}

function toStatsSnapshot(
  snapshot?: ReviewStatsSnapshotInput | null
): DictationReviewStatsSnapshotRecord {
  return {
    accuracy: snapshot?.accuracy ?? EMPTY_STATS_SNAPSHOT.accuracy,
    attemptCount: snapshot?.attemptCount ?? EMPTY_STATS_SNAPSHOT.attemptCount,
    lastAction: snapshot?.lastAction ?? EMPTY_STATS_SNAPSHOT.lastAction,
    mistakeTaxonomy: {
      extra:
        snapshot?.mistakeTaxonomy?.extra ??
        EMPTY_STATS_SNAPSHOT.mistakeTaxonomy.extra,
      missing:
        snapshot?.mistakeTaxonomy?.missing ??
        EMPTY_STATS_SNAPSHOT.mistakeTaxonomy.missing,
      spellingVariant:
        snapshot?.mistakeTaxonomy?.spellingVariant ??
        EMPTY_STATS_SNAPSHOT.mistakeTaxonomy.spellingVariant,
      wrong:
        snapshot?.mistakeTaxonomy?.wrong ??
        EMPTY_STATS_SNAPSHOT.mistakeTaxonomy.wrong,
    },
  }
}

export function toDictationReviewItemRecord(item: {
  _id: unknown
  createdAt: Date
  dueAt: Date
  kind: DictationReviewItemApiRecord['kind']
  label: string
  lastReviewedAt?: Date | null
  userId: string
  priority: number
  reason: DictationReviewItemApiRecord['reason']
  segmentId: unknown
  statsSnapshot?: ReviewStatsSnapshotInput | null
  status: DictationReviewItemApiRecord['status']
  updatedAt: Date
  videoId: unknown
}): DictationReviewItemApiRecord {
  return {
    id: String(item._id),
    createdAt: item.createdAt,
    dueAt: item.dueAt,
    kind: item.kind,
    label: item.label,
    lastReviewedAt: item.lastReviewedAt ?? null,
    userId: item.userId,
    priority: item.priority,
    reason: item.reason,
    segmentId: String(item.segmentId),
    statsSnapshot: toStatsSnapshot(item.statsSnapshot),
    status: item.status,
    updatedAt: item.updatedAt,
    videoId: String(item.videoId),
  }
}
