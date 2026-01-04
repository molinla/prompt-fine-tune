import { Button } from "@/components/ui/button"
import { Play, RotateCcw, StopCircle } from "lucide-react"

interface SuiteHeaderProps {
  globalSuccessRate: number | undefined
  isRunning: boolean
  testCasesCount: number
  onResetAllHistory: () => void
  onTerminateAllTests: () => void
  onRunAllTests: () => void
}

export function SuiteHeader({
  globalSuccessRate,
  isRunning,
  testCasesCount,
  onResetAllHistory,
  onTerminateAllTests,
  onRunAllTests,
}: SuiteHeaderProps) {
  return (
    <div className="flex justify-between items-center flex-col gap-4 @md/cards:flex-row">
      <h3 className="text-lg font-medium">
        <span className="mr-4">Batch Suite</span>
        <span
          className={`font-mono font-bold ${globalSuccessRate === undefined
            ? "text-muted-foreground"
            : globalSuccessRate === 100
              ? "text-green-600"
              : globalSuccessRate >= 50
                ? "text-yellow-600"
                : "text-red-600"
          }`}
        >
          {globalSuccessRate !== undefined
            ? `${globalSuccessRate.toFixed(0)}% Success`
            : "No runs yet"}
        </span>
      </h3>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onResetAllHistory}
          disabled={isRunning || testCasesCount === 0}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset All
        </Button>
        {isRunning ? (
          <Button variant="destructive" onClick={onTerminateAllTests}>
            <StopCircle className="mr-2 h-4 w-4" />
            Stop All
          </Button>
        ) : (
          <Button onClick={onRunAllTests} disabled={testCasesCount === 0}>
            <Play className="mr-2 h-4 w-4" />
            Run Suite
          </Button>
        )}
      </div>
    </div>
  )
}
