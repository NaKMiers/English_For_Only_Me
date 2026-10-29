import { RunnerSkeleton } from '@/components/ielts/runner/AttemptLoader'

export default function IeltsRunnerLoading() {
  return (
    <div className="ielts-exam fixed inset-0 z-[70] flex flex-col">
      <RunnerSkeleton />
    </div>
  )
}
