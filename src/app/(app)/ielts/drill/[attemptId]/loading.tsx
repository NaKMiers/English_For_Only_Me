import { RunnerSkeleton } from '@/components/ielts/runner/AttemptLoader'
import { ExamFrame } from '@/components/ielts/ui'

/** The drill is an exam screen: its own skeleton, not the IELTS home's. */
export default function IeltsDrillLoading() {
  return (
    <ExamFrame>
      <RunnerSkeleton />
    </ExamFrame>
  )
}
