"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Plus } from "lucide-react"
import { v4 as uuid } from "uuid"
import { useAuth } from "@clerk/nextjs"
import { usePromptConfig } from "../prompt-config"

import { TestCase, HistoryItem, RunDetail } from "./types"

import { SuiteHeader } from "./components/suite-header"
import { TestCaseCard } from "./components/test-case-card"
import { DetailHeader } from "./components/detail-header"
import { DetailInputSection } from "./components/detail-input-section"
import { DetailResultsSection } from "./components/detail-results-section"
import { BatchPanelSkeleton } from "./components/loading"

import { useBatchPanelContext } from "./provider"

const DEFAULT_VALIDATION_SCRIPT = `// Available variables: output (string), input (string)
// Throw error to fail
if (!output.includes('expected')) {
  throw new Error('Missing expected content')
}`

export function BatchPanel() {
  const { systemPrompt, model, customConfig, topP, temperature } = usePromptConfig()
  const { userId } = useAuth()

  const {
    testCases,
    results,
    isLoaded,
    isAdding,
    isDeletingId,
    setTestCases,
    setResults,
    addTestCase,
    removeTestCase: removeTestCaseFromProvider,
    updateTestCase: updateTestCaseFromProvider,
    resetHistory,
    resetAllHistory,
  } = useBatchPanelContext()

  const [isRunning, setIsRunning] = useState(false)
  const [activeTestCaseId, setActiveTestCaseId] = useState<string | null>(null)
  const [abortControllers, setAbortControllers] = useState<Record<string, AbortController>>({})
  const [editingCase, setEditingCase] = useState<TestCase | null>(null)

  const removeTestCase = async (id: string, e?: React.MouseEvent) => {
    await removeTestCaseFromProvider(id, e)
    if (activeTestCaseId === id) {
      setActiveTestCaseId(null)
      setEditingCase(null)
    }
  }

  const updateTestCase = async (id: string, updates: Partial<TestCase>) => {
    await updateTestCaseFromProvider(id, updates)
    if (editingCase?.id === id) {
      setEditingCase({ ...editingCase, ...updates })
    }
  }

  const terminateTest = (caseId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const controller = abortControllers[caseId]
    if (controller) {
      controller.abort()
      setAbortControllers(prev => {
        const next = { ...prev }
        delete next[caseId]
        return next
      })
      setResults(prev => ({
        ...prev,
        [caseId]: {
          ...prev[caseId],
          status: 'failure',
          error: 'Terminated by user'
        }
      }))
    }
  }

  const terminateAllTests = () => {
    Object.keys(abortControllers).forEach(caseId => {
      abortControllers[caseId]?.abort()
    })
    setAbortControllers({})
    setIsRunning(false)
    setResults(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(caseId => {
        if (next[caseId].status === 'running') {
          next[caseId] = { ...next[caseId], status: 'failure', error: 'Terminated by user' }
        }
      })
      return next
    })
  }

  const runSingleTest = async (testCase: TestCase) => {
    const caseId = testCase.id
    const controller = new AbortController()
    setAbortControllers(prev => ({ ...prev, [caseId]: controller }))

    const newHistoryId = uuid()
    const newHistoryItem: HistoryItem = {
      id: newHistoryId,
      timestamp: new Date().toISOString(),
      successRate: 0
    }

    setTestCases(prev => prev.map(t => {
      if (t.id === caseId) {
        return { ...t, history: [...t.history, newHistoryItem] }
      }
      return t
    }))

    setResults(prev => ({
      ...prev,
      [caseId]: {
        id: uuid(),
        testCaseId: caseId,
        historyItemId: newHistoryId,
        status: 'running',
        lastRun: new Date().toISOString(),
        details: []
      }
    }))

    let successCount = 0
    let errorMsg = ''
    const scriptToUse = testCase.validationScript || DEFAULT_VALIDATION_SCRIPT
    const runDetails: RunDetail[] = []

    for (let i = 0; i < testCase.expectedCount; i++) {
      let currentOutput = ''
      try {
        const response = await fetch('/api/batch-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: testCase.input }],
            model,
            system: systemPrompt,
            customBaseUrl: customConfig?.baseUrl,
            customApiKey: customConfig?.apiKey,
            customModel: customConfig?.modelName,
            topP,
            temperature,
          }),
          signal: controller.signal
        })

        if (!response.ok) throw new Error('Network response was not ok')

        const { text: output } = await response.json()
        currentOutput = output

        const validate = new Function('output', 'input', scriptToUse)
        validate(output, testCase.input)

        successCount++
        runDetails.push({
          iteration: i + 1,
          output: currentOutput,
          status: 'success'
        })

      } catch (e: any) {
        if (e.name === 'AbortError') {
          break
        }
        errorMsg = e.message
        runDetails.push({
          iteration: i + 1,
          output: currentOutput || '(No output)',
          status: 'failure',
          error: e.message
        })
      }

      const currentSuccessRate = (successCount / (i + 1)) * 100

      setResults(prev => ({
        ...prev,
        [caseId]: {
          ...prev[caseId],
          status: 'running',
          successRate: currentSuccessRate,
          details: [...runDetails]
        }
      }))

      setTestCases(prev => prev.map(t => {
        if (t.id === caseId) {
          return {
            ...t,
            history: t.history.map(h =>
              h.id === newHistoryId
                ? { ...h, successRate: currentSuccessRate }
                : h
            )
          }
        }
        return t
      }))
    }

    const finalSuccessRate = (successCount / testCase.expectedCount) * 100
    let savedHistoryId = newHistoryId

    if (userId) {
      try {
        const res = await fetch(`/api/test-cases/${caseId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            historyItem: {
              successRate: finalSuccessRate,
              timestamp: new Date().toISOString()
            }
          })
        })

        if (res.ok) {
          const savedItem = await res.json()
          savedHistoryId = savedItem.id

          setTestCases(prev => prev.map(t => {
            if (t.id === caseId) {
              return {
                ...t,
                history: t.history.map(h => h.id === newHistoryId ? { ...h, id: savedHistoryId } : h)
              }
            }
            return t
          }))
        }
      } catch (e) {
        console.error("Failed to save history item to backend", e)
      }
    }

    setAbortControllers(prev => {
      const next = { ...prev }
      delete next[caseId]
      return next
    })

    setResults(prev => {
      if (prev[caseId]?.error === 'Terminated by user') return prev
      return {
        ...prev,
        [caseId]: {
          ...prev[caseId],
          historyItemId: savedHistoryId,
          status: finalSuccessRate === 100 ? 'success' : 'failure',
          successRate: finalSuccessRate,
          error: finalSuccessRate === 100 ? undefined : (errorMsg || 'One or more tests failed'),
        }
      }
    })
  }

  const toggleIterationStatus = async (caseId: string, iterationIndex: number) => {
    const result = results[caseId]
    if (!result) return

    const newDetails = [...result.details]
    const detail = newDetails[iterationIndex]
    if (!detail) return

    // Toggle status and set custom message
    if (detail.status === 'success') {
      detail.status = 'failure'
      detail.error = 'Failed by user evaluation'
    } else {
      detail.status = 'success'
      detail.error = 'Passed by user evaluation'
    }

    // Recalculate success rate
    const successCount = newDetails.filter(d => d.status === 'success').length
    const newSuccessRate = (successCount / result.details.length) * 100
    const finalStatus = newSuccessRate === 100 ? 'success' : 'failure'

    setResults(prev => ({
      ...prev,
      [caseId]: {
        ...prev[caseId],
        status: finalStatus,
        successRate: newSuccessRate,
        details: newDetails
      }
    }))

    setTestCases(prev => prev.map(t => {
      if (t.id === caseId) {
        return {
          ...t,
          history: t.history.map(h =>
            h.id === result.historyItemId
              ? { ...h, successRate: newSuccessRate }
              : h
          )
        }
      }
      return t
    }))

    if (userId && result.historyItemId) {
      try {
        await fetch(`/api/test-cases/${caseId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            updateHistoryItem: {
              id: result.historyItemId,
              successRate: newSuccessRate
            }
          })
        })
      } catch (e) {
        console.error("Failed to persist toggled status", e)
      }
    }
  }

  const runAllTests = async () => {
    setIsRunning(true)
    // Run all test cases in parallel - each card's batch requests are independent
    await Promise.all(testCases.map(testCase => runSingleTest(testCase)))
    setIsRunning(false)
  }

  const enterLayer2 = (testCase: TestCase) => {
    setActiveTestCaseId(testCase.id)
    setEditingCase({ ...testCase })
  }

  const exitLayer2 = () => {
    setActiveTestCaseId(null)
    setEditingCase(null)
  }

  if (!activeTestCaseId) {
    if (!isLoaded) {
      return <BatchPanelSkeleton />
    }

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
        <SuiteHeader
          globalSuccessRate={globalSuccessRate}
          isRunning={isRunning}
          testCasesCount={testCases.length}
          onResetAllHistory={resetAllHistory}
          onTerminateAllTests={terminateAllTests}
          onRunAllTests={runAllTests}
        />

        <div className="grid  @md/cards:grid-cols-2 @2xl/cards:grid-cols-3 @4xl/cards:grid-cols-4 @7xl/cards:grid-cols-5 grid-cols-1 gap-4">
          {testCases.map((testCase) => (
            <TestCaseCard
              key={testCase.id}
              testCase={testCase}
              result={results[testCase.id]}
              isDeleting={isDeletingId === testCase.id}
              onClick={() => enterLayer2(testCase)}
              onRemove={removeTestCase}
              onResetHistory={resetHistory}
              onTerminate={terminateTest}
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

  return (
    <div className="flex flex-col h-full bg-background">
      <DetailHeader
        onExit={exitLayer2}
        onRemove={() => removeTestCase(activeTestCaseId!)}
      />

      {/* Main Content Area - Split View */}
      <div className="flex-1 p-4 pr-2 pt-0 @container @2xl:pt-4 overflow-auto">
        <div className="flex flex-col @2xl:flex-row @2xl:gap-6 h-full">
          <DetailInputSection
            testCase={editingCase}
            activeTestCaseId={activeTestCaseId!}
            model={model}
            result={results[activeTestCaseId!]}
            onUpdate={updateTestCase}
            onRun={() => editingCase && runSingleTest(editingCase)}
            onTerminate={() => terminateTest(activeTestCaseId!)}
            defaultValidationScript={DEFAULT_VALIDATION_SCRIPT}
          />

          <DetailResultsSection
            result={results[activeTestCaseId!]}
            onToggleIteration={(idx) => toggleIterationStatus(activeTestCaseId!, idx)}
          />
        </div>
      </div>
    </div>
  )
}
