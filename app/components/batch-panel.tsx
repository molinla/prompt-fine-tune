"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Play, Loader2, Plus, Trash, ChevronRight, ArrowLeft, Settings2, CheckCircle, XCircle, RotateCcw, StopCircle } from "lucide-react"
import { Streamdown } from "streamdown"

interface HistoryItem {
    id: string
    timestamp: string
    successRate: number
}

interface TestCase {
    id: string
    input: string
    expectedCount: number // Default/Global setting for this case
    validationScript?: string // Custom validation script for this case
    history: HistoryItem[]
}

interface RunDetail {
    iteration: number
    output: string
    status: 'success' | 'failure'
    error?: string
}

interface TestResult {
    id: string
    testCaseId: string
    status: 'pending' | 'success' | 'failure' | 'running'
    successRate?: number
    error?: string
    lastRun: string // ISO date
    details: RunDetail[]
}

interface BatchPanelProps {
    systemPrompt: string
    model: string
}

const DEFAULT_VALIDATION_SCRIPT = `// Available variables: output (string), input (string)
// Throw error to fail
if (!output.includes('expected')) {
  throw new Error('Missing expected content')
}`

const STORAGE_KEY = "batch-test-cases"

export function BatchPanel({ systemPrompt, model }: BatchPanelProps) {
    const [testCases, setTestCases] = useState<TestCase[]>([])
    const [results, setResults] = useState<Record<string, TestResult>>({})
    const [isRunning, setIsRunning] = useState(false)
    const [activeTestCaseId, setActiveTestCaseId] = useState<string | null>(null)
    const [abortControllers, setAbortControllers] = useState<Record<string, AbortController>>({})

    // Layer 2 State (Drafting changes before running/saving)
    const [editingCase, setEditingCase] = useState<TestCase | null>(null)
    const [isLoaded, setIsLoaded] = useState(false)

    // Load from local storage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved) {
                setTestCases(JSON.parse(saved))
            }
        } catch (e) {
            console.error("Failed to load batch test cases", e)
        } finally {
            setIsLoaded(true)
        }
    }, [])

    // Save to local storage on change
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(testCases))
        }
    }, [testCases, isLoaded])

    const addTestCase = () => {
        setTestCases([...testCases, {
            id: crypto.randomUUID(),
            input: "",
            expectedCount: 5,
            history: []
        }])
    }

    const removeTestCase = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation()
        setTestCases(testCases.filter(t => t.id !== id))
        if (activeTestCaseId === id) {
            setActiveTestCaseId(null)
            setEditingCase(null)
        }
    }

    const updateTestCase = (id: string, updates: Partial<TestCase>) => {
        setTestCases(testCases.map(t => t.id === id ? { ...t, ...updates } : t))
        if (editingCase?.id === id) {
            setEditingCase({ ...editingCase, ...updates })
        }
    }

    const resetHistory = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        updateTestCase(id, { history: [] })
    }

    const resetAllHistory = () => {
        setTestCases(prev => prev.map(t => ({ ...t, history: [] })))
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

        // Create history item immediately
        const newHistoryId = crypto.randomUUID()
        const newHistoryItem: HistoryItem = {
            id: newHistoryId,
            timestamp: new Date().toISOString(),
            successRate: 0
        }

        // Add to history immediately
        setTestCases(prev => prev.map(t => {
            if (t.id === caseId) {
                return { ...t, history: [...t.history, newHistoryItem] }
            }
            return t
        }))

        // Optimistic update for UI status
        setResults(prev => ({
            ...prev,
            [caseId]: {
                id: crypto.randomUUID(),
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
                        model,
                        system: systemPrompt
                    }),
                    signal: controller.signal
                })

                if (!response.ok) throw new Error('Network response was not ok')

                const { text: output } = await response.json()
                currentOutput = output

                // Validate
                // eslint-disable-next-line
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
                    // User terminated, stop the loop
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

            // Calculate current success rate
            const currentSuccessRate = (successCount / (i + 1)) * 100

            // Update results progressively
            setResults(prev => ({
                ...prev,
                [caseId]: {
                    ...prev[caseId],
                    status: 'running',
                    successRate: currentSuccessRate,
                    details: [...runDetails]
                }
            }))

            // Update the live history item
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

        // Clean up abort controller
        setAbortControllers(prev => {
            const next = { ...prev }
            delete next[caseId]
            return next
        })

        // Only update final status if not already terminated
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

    // Layer 1: Overview
    if (!activeTestCaseId) {
        return (
            <div className="flex flex-col h-full gap-4 p-4 overflow-y-auto">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Batch Suite</h3>
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
                            <Button onClick={runAllTests} disabled={testCases.length === 0}>
                                <Play className="mr-2 h-4 w-4" />
                                Run Suite
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {testCases.map((testCase, index) => {
                        const result = results[testCase.id]
                        const successRate = result?.successRate ?? (testCase.history.length > 0 ? testCase.history[testCase.history.length - 1].successRate : undefined)

                        return (
                            <div key={testCase.id}
                                className="flex flex-col border rounded-lg p-3 hover:border-primary/50 transition-colors cursor-pointer group bg-card relative h-[250px]"
                                onClick={() => enterLayer2(testCase)}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex flex-col">
                                        <div className={`font-mono font-bold ${successRate === undefined ? 'text-muted-foreground' :
                                            successRate === 100 ? 'text-green-600' :
                                                successRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                                            }`}>
                                            {successRate !== undefined ? `${successRate.toFixed(0)}% Success` : 'No runs yet'}
                                            {result?.status === 'running' && (
                                                <span className="text-xs text-muted-foreground font-mono mt-0.5">
                                                    ({result.details.length}/{testCase.expectedCount})
                                                </span>
                                            )}
                                        </div>

                                    </div>
                                    <div className="flex items-center gap-2">
                                        {result?.status === 'running' ? (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-destructive hover:text-destructive -mr-2"
                                                onClick={(e) => terminateTest(testCase.id, e)}
                                                title="Stop this test"
                                            >
                                                <StopCircle className="h-4 w-4" />
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity -mr-2"
                                                onClick={(e) => removeTestCase(testCase.id, e)}
                                            >
                                                <Trash className="h-3 w-3 text-destructive" />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 mb-2">
                                    <div className="text-sm text-foreground/80 line-clamp-7 wrap-break-words whitespace-pre-wrap" title={testCase.input}>
                                        {testCase.input || <span className="italic text-muted-foreground">Empty test case...</span>}
                                    </div>
                                </div>

                                <div className="mt-auto pt-2 border-t border-dashed">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                        <span>Trend ({testCase.history.length} runs)</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-4 w-4 hover:bg-transparent hover:text-foreground"
                                            onClick={(e) => resetHistory(testCase.id, e)}
                                            title="Reset History"
                                        >
                                            <RotateCcw className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <div className="h-6 w-full bg-muted/20 flex items-end gap-0.5 rounded-sm overflow-hidden px-1 pb-1">
                                        {testCase.history.length === 0 ? (
                                            <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">No history</div>
                                        ) : (
                                            testCase.history.slice(-20).map((h) => (
                                                <div
                                                    key={h.id}
                                                    className={`flex-1 min-w-[4px] rounded-t-sm ${h.successRate >= 90 ? 'bg-green-500' : h.successRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                    style={{ height: `${Math.max(10, h.successRate)}%` }}
                                                    title={`${new Date(h.timestamp).toLocaleTimeString()} - ${h.successRate.toFixed(0)}%`}
                                                />
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    <div
                        onClick={addTestCase}
                        className="flex flex-col justify-center items-center border rounded-lg p-3 hover:border-primary/50 transition-colors cursor-pointer group bg-card relative h-[250px]"
                    >
                        <Button variant="ghost" className="hover:bg-transparent cursor-pointer" >
                            <Plus className="mr-2 h-4 w-4" /> New Test Case
                        </Button>
                    </div>
                </div>


            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-background animate-in slide-in-from-right-4 duration-200">
            <div className="flex items-center gap-2 p-4 border-b">
                <Button variant="ghost" size="icon" onClick={exitLayer2} className="-ml-2">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-medium">Test Case Detail</h3>
                <div className="ml-auto">
                    <Button variant="ghost" size="icon" onClick={() => removeTestCase(activeTestCaseId!)}>
                        <Trash className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            </div>

            {/* Main Content Area - Split View */}
            <div className="flex-1 overflow-hidden p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">

                    {/* LEFT COLUMN: Input & Settings */}
                    <div className="flex flex-col gap-6 overflow-y-auto pr-2 h-full">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Input Prompt</label>
                            <Textarea
                                value={editingCase?.input || ''}
                                onChange={(e) => updateTestCase(activeTestCaseId!, { input: e.target.value })}
                                className="min-h-[260px] flex-1"
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
                                    value={editingCase?.expectedCount || 1}
                                    onChange={(e) => updateTestCase(activeTestCaseId!, { expectedCount: parseInt(e.target.value) || 1 })}
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
                                value={editingCase?.validationScript ?? DEFAULT_VALIDATION_SCRIPT}
                                onChange={(e) => updateTestCase(activeTestCaseId!, { validationScript: e.target.value })}
                                className="font-mono text-xs h-[120px] bg-slate-50 dark:bg-slate-950"
                                placeholder="// function(output, input) { ... }"
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Variables: <code>output</code> (AI response), <code>input</code> (User prompt). Throw error to fail.
                            </p>
                        </div>

                        <div className="pt-4 mt-auto">
                            {results[activeTestCaseId!]?.status === 'running' ? (
                                <Button
                                    className="w-full"
                                    size="lg"
                                    variant="destructive"
                                    onClick={() => terminateTest(activeTestCaseId!)}
                                >
                                    <StopCircle className="mr-2 h-4 w-4" /> Stop Test
                                </Button>
                            ) : (
                                <Button
                                    className="w-full"
                                    size="lg"
                                    onClick={() => editingCase && runSingleTest(editingCase)}
                                >
                                    <Play className="mr-2 h-4 w-4" /> Run Verification
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Results */}
                    <div className="flex flex-col overflow-y-auto border-l pl-6 h-full">
                        <h4 className="font-medium mb-4 sticky top-0 bg-background z-10 py-2 border-b">Results</h4>

                        {!results[activeTestCaseId!] ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-50">
                                <Play className="h-12 w-12 mb-2" />
                                <p>Run the test to see results here</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Summary Card */}
                                <div className={`p-4 rounded-lg border ${results[activeTestCaseId!].status === 'success' ? 'bg-green-50/50 border-green-200' :
                                    results[activeTestCaseId!].status === 'failure' ? 'bg-red-50/50 border-red-200' :
                                        'bg-secondary/50 border-border'
                                    }`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-semibold text-sm">Last Run Summary</span>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(results[activeTestCaseId!].lastRun).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <div className="text-3xl font-bold mb-1">
                                        {results[activeTestCaseId!].successRate?.toFixed(0)}% <span className="text-base font-normal text-muted-foreground">success rate</span>
                                    </div>
                                    <div className="flex gap-4 text-xs mt-2">
                                        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-600" /> {results[activeTestCaseId!].details.filter(d => d.status === 'success').length} passed</span>
                                        <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-600" /> {results[activeTestCaseId!].details.filter(d => d.status === 'failure').length} failed</span>
                                    </div>
                                    {results[activeTestCaseId!].error && (
                                        <div className="text-xs text-red-600 mt-3 p-2 bg-red-100/50 rounded border border-red-200">
                                            Error: {results[activeTestCaseId!].error}
                                        </div>
                                    )}
                                </div>

                                {/* Detailed List */}
                                <div className="space-y-3">
                                    <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Log Details</h5>
                                    {results[activeTestCaseId!].details.map((detail, idx) => (
                                        <div key={idx} className="text-sm border rounded-lg p-3 bg-card/50 hover:bg-card transition-colors">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">#{detail.iteration}</span>
                                                {detail.status === 'success' ?
                                                    <span className="flex items-center gap-1.5 text-green-600 text-xs font-medium px-2 py-0.5 bg-green-50 rounded-full border border-green-100">
                                                        <CheckCircle className="w-3 h-3" /> Pass
                                                    </span> :
                                                    <span className="flex items-center gap-1.5 text-red-600 text-xs font-medium px-2 py-0.5 bg-red-50 rounded-full border border-red-100">
                                                        <XCircle className="w-3 h-3" /> Fail
                                                    </span>
                                                }
                                            </div>
                                            <div className="space-y-2 mt-2">
                                                <Streamdown mode="static" className="text-xs max-h-[300px] overflow-y-auto">
                                                    {detail.output}
                                                </Streamdown>
                                                {detail.error && (
                                                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
                                                        {detail.error}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
