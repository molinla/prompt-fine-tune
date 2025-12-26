"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Trash, Settings2, Play, StopCircle } from "lucide-react"
import type { TestCase, TestResult } from "../types"
import { DEFAULT_VALIDATION_SCRIPT } from "../constants"
import { TestResultPanel } from "./test-result-panel"

interface TestCaseDetailProps {
  testCase: TestCase
  result?: TestResult
  model: string
  onBack: () => void
  onRemove: (id: string) => void
  onUpdate: (id: string, updates: Partial<TestCase>) => void
  onRunTest: (testCase: TestCase) => void
  onTerminate: (id: string) => void
}

export function TestCaseDetail({
  testCase,
  result,
  model,
  onBack,
  onRemove,
  onUpdate,
  onRunTest,
  onTerminate,
}: TestCaseDetailProps) {
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center gap-2 p-4 border-b">
        <Button variant="ghost" size="icon" onClick={onBack} className="-ml-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-medium">Test Case Detail</h3>
        <div className="ml-auto">
          <Button variant="ghost" size="icon" onClick={() => onRemove(testCase.id)}>
            <Trash className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Main Content Area - Split View */}
      <div className="flex-1 p-4 pr-2 pt-0 @container @2xl:pt-4 overflow-auto">
        <div className="flex flex-col @2xl:flex-row @2xl:gap-6 h-full">

          {/* LEFT COLUMN: Input & Settings */}
          <div className="flex flex-col pt-4 pb-6 @2xl:pt-0 gap-6 pr-2 h-full max-w-2xl w-full">
            <div className="space-y-2">
              <label className="text-sm font-medium">Input Prompt</label>
              <Textarea
                value={testCase.input}
                onChange={(e) => onUpdate(testCase.id, { input: e.target.value })}
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
                  value={testCase.expectedCount}
                  onChange={(e) => onUpdate(testCase.id, { expectedCount: parseInt(e.target.value) || 1 })}
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
                value={testCase.validationScript || DEFAULT_VALIDATION_SCRIPT}
                onChange={(e) => onUpdate(testCase.id, { validationScript: e.target.value })}
                className="font-mono text-xs h-30 dark:bg-slate-950"
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
                  onClick={() => onTerminate(testCase.id)}
                >
                  <StopCircle className="mr-2 h-4 w-4" /> Stop Test
                </Button>
              ) : (
                <Button
                  className="w-full shadow-xl shadow-white"
                  size="lg"
                  onClick={() => onRunTest(testCase)}
                >
                  <Play className="mr-2 h-4 w-4" /> Run Verification
                </Button>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Results */}
          <div className="flex flex-col py-6 pt-10 @2xl:pt-0 @2xl:overflow-y-auto @2xl:border-l @2xl:pl-6 h-ful w-full min-h-[80vh]">
            <h4 className="font-medium mb-4 sticky top-0 bg-background z-10 py-2 border-b">Results</h4>
            <TestResultPanel result={result} />
          </div>
        </div>
      </div>
    </div>
  )
}
