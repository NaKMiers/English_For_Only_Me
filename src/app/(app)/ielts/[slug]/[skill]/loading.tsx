import { RunnerSkeleton } from '@/components/ielts/runner/AttemptLoader'
import { ExamFrame } from '@/components/ielts/ui'

export default function IeltsRunnerLoading() {
  return (
    <ExamFrame>
      <RunnerSkeleton />
    </ExamFrame>
  )
}
