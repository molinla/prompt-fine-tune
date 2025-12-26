"use client"

import { useState, useCallback, useRef } from "react"
import { v4 as uuid } from "uuid"
import type { TestCase, TestResult, RunDetail, HistoryItem, TestRunnerConfig } from "../types"
import { DEFAULT_VALIDATION_SCRIPT } from "../constants"

interface UseTestRunnerOptions {
  config: TestRunnerConfig
  onHistoryAdd: (caseId: string, historyItem: HistoryItem) => void
  onHistoryUpdate: (caseId: string, historyId: string, updates: Partial<HistoryItem>) => void
  onHistorySave: (caseId: string, successRate: number) => Promise<void>
}

export function useTestRunner({
  config,
  onHistoryAdd,
  onHistoryUpdate,
  onHistorySave,
}: UseTestRunnerOptions) {
  const [results, setResults] = useState<Record<string, TestResult>>({})
  const [isRunning, setIsRunning] = useState(false)
  const abortControllersRef = useRef<Record<string, AbortController>>({})

  const terminateTest = useCallback((caseId: string) => {
    const controller = abortControllersRef.current[caseId]
    if (controller) {
      controller.abort()
      delete abortControllersRef.current[caseId]
      setResults(prev => ({
        ...prev,
        [caseId]: {
          ...prev[caseId],
          status: 'failure',
          error: 'Terminated by user'
        }
      }))
    }
  }, [])

  const terminateAllTests = useCallback(() => {
    Object.keys(abortControllersRef.current).forEach(caseId => {
      abortControllersRef.current[caseId]?.abort()
    })
    abortControllersRef.current = {}
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
  }, [])

  const runSingleTest = useCallback(async (testCase: TestCase) => {
    const caseId = testCase.id
    const controller = new AbortController()
    abortControllersRef.current[caseId] = controller

    const newHistoryId = uuid()
    const newHistoryItem: HistoryItem = {
      id: newHistoryId,
      timestamp: new Date().toISOString(),
      successRate: 0
    }

    onHistoryAdd(caseId, newHistoryItem)

    setResults(prev => ({
      ...prev,
      [caseId]: {
        id: uuid(),
        testCaseId: caseId,
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
            model: config.model,
            system: config.systemPrompt,
            customBaseUrl: config.customConfig?.baseUrl,
            customApiKey: config.customConfig?.apiKey,
            customModel: config.customConfig?.modelName,
            topP: config.topP,
            temperature: config.temperature,
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

      onHistoryUpdate(caseId, newHistoryId, { successRate: currentSuccessRate })
    }

    const finalSuccessRate = (successCount / testCase.expectedCount) * 100

    await onHistorySave(caseId, finalSuccessRate)

    delete abortControllersRef.current[caseId]

    setResults(prev => {
      if (prev[caseId]?.error === 'Terminated by user') return prev
      return {
        ...prev,
        [caseId]: {
          ...prev[caseId],
          status: finalSuccessRate === 100 ? 'success' : 'failure',
          successRate: finalSuccessRate,
          error: finalSuccessRate === 100 ? undefined : (errorMsg || 'One or more tests failed'),
        }
      }
    })
  }, [config, onHistoryAdd, onHistoryUpdate, onHistorySave])

  const runAllTests = useCallback(async (testCases: TestCase[]) => {
    setIsRunning(true)
    await Promise.all(testCases.map(testCase => runSingleTest(testCase)))
    setIsRunning(false)
  }, [runSingleTest])

  const isTestRunning = useCallback((caseId: string) => {
    return !!abortControllersRef.current[caseId]
  }, [])

  return {
    results,
    isRunning,
    runSingleTest,
    runAllTests,
    terminateTest,
    terminateAllTests,
    isTestRunning,
  }
}
