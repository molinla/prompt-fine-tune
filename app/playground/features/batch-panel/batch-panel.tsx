"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Play, Loader2, Plus, RotateCcw, StopCircle } from "lucide-react"
import { usePromptConfig } from "../prompt-config"
import { useTestCases, useTestRunner } from "./hooks"
import { TestCaseCard, TestCaseDetail } from "./components"
import type { TestCase } from "./types"

export function BatchPanel() {
  const { systemPrompt, model, customConfig, topP, temperature } = usePromptConfig()

  const {
    testCases,
    isFetching,
    isAdding,
    isDeletingId,
    addTestCase,
    removeTestCase,
    updateTestCase,
    resetHistory,
    resetAllHistory,
    addHistoryItem,
    updateHistoryItem,
    saveHistoryToBackend,
  } = useTestCases()

  const runnerConfig = useMemo(() => ({
    model,
    systemPrompt,
    customConfig,
    topP,
    temperature,
  }), [model, systemPrompt, customConfig, topP, temperature])

  const {
    results,
    isRunning,
    runSingleTest,
    runAllTests,
    terminateTest,
    terminateAllTests,
  } = useTestRunner({
    config: runnerConfig,
    onHistoryAdd: addHistoryItem,
    onHistoryUpdate: updateHistoryItem,
    onHistorySave: saveHistoryToBackend,
  })

  const [activeTestCaseId, setActiveTestCaseId] = useState<string | null>(null)

  const activeTestCase = useMemo(() =>
    testCases.find(t => t.id === activeTestCaseId),
    [testCases, activeTestCaseId]
  )

  const enterDetail = (testCase: TestCase) => {
    setActiveTestCaseId(testCase.id)
  }

  const exitDetail = () => {
    setActiveTestCaseId(null)
  }

  const handleRemoveTestCase = async (id: string) => {
    await removeTestCase(id)
    if (activeTestCaseId === id) {
      setActiveTestCaseId(null)
    }
  }

  if (activeTestCase) {
    return (
      <TestCaseDetail
        testCase={activeTestCase}
        result={results[activeTestCaseId!]}
        model={model}
        onBack={exitDetail}
        onRemove={handleRemoveTestCase}
        onUpdate={updateTestCase}
        onRunTest={runSingleTest}
        onTerminate={terminateTest}
      />
    )
  }

  // Loading state
  if (isFetching) {
    return (
      <div className="flex flex-col h-full gap-4 p-4 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading test cases...</p>
      </div>
    )
  }

  // Calculate global success rate
  const globalSuccessRate = (() => {
    const rates: number[] = []
    for (const tc of testCases) {
      const result = results[tc.id]
      const rate = result?.successRate ?? (tc.history.length > 0 ? tc.history[tc.history.length - 1].successRate : undefined)
      if (rate !== undefined) {
        rates.push(rate)
      }
    }
    return rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : undefined
  })()

  return (
    <div className="@container/cards flex flex-col h-full gap-4 p-4 overflow-y-auto">
      <div className="flex justify-between items-center flex-col gap-4 @md/cards:flex-row">
        <h3 className="text-lg font-medium">
          <span className="mr-4">Batch Suite</span>
          <span className={`font-mono font-bold ${globalSuccessRate === undefined ? 'text-muted-foreground' :
            globalSuccessRate === 100 ? 'text-green-600' :
              globalSuccessRate >= 50 ? 'text-yellow-600' : 'text-red-600'
            }`}>
            {globalSuccessRate !== undefined ? `${globalSuccessRate.toFixed(0)}% Success` : 'No runs yet'}
          </span>
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetAllHistory} disabled={isRunning || testCases.length === 0}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset All
          </Button>
          {isRunning ? (
            <Button variant="destructive" onClick={terminateAllTests}>
              <StopCircle className="mr-2 h-4 w-4" />
              Stop All
            </Button>
          ) : (
            <Button onClick={() => runAllTests(testCases)} disabled={testCases.length === 0}>
              <Play className="mr-2 h-4 w-4" />
              Run Suite
            </Button>
          )}
        </div>
      </div>

      <div className="grid @md/cards:grid-cols-2 @2xl/cards:grid-cols-3 @4xl/cards:grid-cols-4 @7xl/cards:grid-cols-5 grid-cols-1 gap-4">
        {testCases.map((testCase) => (
          <TestCaseCard
            key={testCase.id}
            testCase={testCase}
            result={results[testCase.id]}
            isDeletingId={isDeletingId}
            onEnterDetail={enterDetail}
            onRemove={handleRemoveTestCase}
            onTerminate={terminateTest}
            onResetHistory={resetHistory}
          />
        ))}

        <div
          onClick={isAdding ? undefined : addTestCase}
          className={`flex flex-col justify-center items-center border rounded-lg p-3 transition-colors group bg-card relative min-h-[250px] ${isAdding ? 'opacity-70 cursor-wait' : 'hover:border-primary/20 cursor-pointer'}`}
        >
          <Button variant="ghost" className="hover:bg-transparent cursor-pointer" disabled={isAdding}>
            {isAdding ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {isAdding ? 'Adding...' : 'New Test Case'}
          </Button>
        </div>
      </div>
    </div>
  )
}
