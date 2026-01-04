import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Play, Settings2, StopCircle } from "lucide-react"
import { TestCase, TestResult } from "../types"

interface DetailInputSectionProps {
  testCase: TestCase | null
  activeTestCaseId: string
  model: string
  result: TestResult | undefined
  onUpdate: (id: string, updates: Partial<TestCase>) => void
  onRun: () => void
  onTerminate: () => void
  defaultValidationScript: string
}

export function DetailInputSection({
  testCase,
  activeTestCaseId,
  model,
  result,
  onUpdate,
  onRun,
  onTerminate,
  defaultValidationScript,
}: DetailInputSectionProps) {
  return (
    <div className="flex flex-col pt-4 pb-6 @2xl:pt-0 gap-6 pr-2 h-full max-w-2xl w-full">
      <div className="space-y-2">
        <label className="text-sm font-medium">Input Prompt</label>
        <Textarea
          value={testCase?.input || ''}
          onChange={(e) => onUpdate(activeTestCaseId, { input: e.target.value })}
          className="min-h-65 flex-1"
          placeholder="Enter the prompt to test..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Loop Count</label>
          <Input
            type="number"
            min={1}
            max={50}
            value={testCase?.expectedCount || 1}
            onChange={(e) => onUpdate(activeTestCaseId, { expectedCount: parseInt(e.target.value) || 1 })}
          />
        </div>
        <div className="space-y-2 opacity-50 pointer-events-none">
          <label className="text-sm font-medium">Model</label>
          <Input value={model} disabled />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Verification Script</label>
          <Settings2 className="h-4 w-4 text-muted-foreground" />
        </div>
        <Textarea
          value={testCase?.validationScript || defaultValidationScript}
          onChange={(e) => onUpdate(activeTestCaseId, { validationScript: e.target.value })}
          className="font-mono text-xs h-30  dark:bg-slate-950"
          placeholder="// function(output, input) { ... }"
        />
        <p className="text-[10px] text-muted-foreground">
          Variables: <code>output</code> (AI response), <code>input</code> (User prompt). Throw error to fail.
        </p>
      </div>

      <div className="pt-4 mt-auto sticky bottom-0">
        {result?.status === 'running' ? (
          <Button
            className="w-full shadow-xl shadow-white"
            size="lg"
            variant="destructive"
            onClick={onTerminate}
          >
            <StopCircle className="mr-2 h-4 w-4" /> Stop Test
          </Button>
        ) : (
          <Button
            className="w-full shadow-xl shadow-white"
            size="lg"
            onClick={onRun}
          >
            <Play className="mr-2 h-4 w-4" /> Run Verification
          </Button>
        )}
      </div>
    </div>
  )
}
