"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Play, Loader2, Plus, Trash, ChevronRight, ArrowLeft, Settings2, CheckCircle, XCircle, RotateCcw, StopCircle } from "lucide-react"
import { Streamdown } from "streamdown"
import { ChartContainer, ChartConfig } from "@/components/ui/chart"
import { Area, AreaChart, YAxis } from "recharts"

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


// TrendChart component using shadcn chart
const chartConfig = {
    successRate: {
        label: "Success Rate",
        color: "hsl(var(--chart-1))",
    },
} satisfies ChartConfig

function TrendChart({ history, id }: { history: HistoryItem[], id: string }) {
    if (history.length === 0) {
        return (
            <div className="h-12 w-full bg-muted/20 rounded-sm flex items-center justify-center text-[10px] text-muted-foreground">
                No history
            </div>
        )
    }

    const data = history.slice(-20).map((h, i) => ({
        index: i,
        successRate: h.successRate,
        timestamp: h.timestamp,
    }))

    // Calculate average for dynamic color
    const avgRate = data.reduce((a, b) => a + b.successRate, 0) / data.length
    const color = avgRate >= 90 ? '#22c55e' : avgRate >= 50 ? '#eab308' : '#ef4444'

    const gradientId = `fillSuccessRate-${id}`

    return (
        <ChartContainer config={chartConfig} className="h-12 w-full">
            <AreaChart
                data={data}
                margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
            >
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity="0.3" />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <YAxis domain={[0, 100]} hide />
                <Area
                    type="monotone"
                    dataKey="successRate"
                    stroke={color}
                    strokeWidth={1.5}
                    fill={`url(#${gradientId})`}
                    dot={false}
                />
            </AreaChart>
        </ChartContainer>
    )
}

import { CustomModelConfig } from "./custom-model-settings"
import { CustomDifyConfig } from "./custom-dify-settings"

export function BatchPanel({ systemPrompt, model, customConfig }: BatchPanelProps & { customConfig?: CustomModelConfig }) {
    const userId = "default-user"
    const authLoaded = true
    const [testCases, setTestCases] = useState<TestCase[]>([])
    const [results, setResults] = useState<Record<string, TestResult>>({})
    const [isRunning, setIsRunning] = useState(false)
    const [activeTestCaseId, setActiveTestCaseId] = useState<string | null>(null)
    const [abortControllers, setAbortControllers] = useState<Record<string, AbortController>>({})

    // Layer 2 State (Drafting changes before running/saving)
    const [editingCase, setEditingCase] = useState<TestCase | null>(null)
    const [isLoaded, setIsLoaded] = useState(false)

    // Loading states for API operations
    const [isFetching, setIsFetching] = useState(false)
    const [isAdding, setIsAdding] = useState(false)
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null)

    // Load from backend on mount
    useEffect(() => {
        const loadData = async () => {
            setIsFetching(true)
            try {
                const res = await fetch('/api/test-cases')
                if (res.ok) {
                    const data = await res.json()
                    setTestCases(data)
                }
            } catch (e) {
                console.error("Failed to load test cases from backend", e)
            } finally {
                setIsLoaded(true)
                setIsFetching(false)
            }
        }

        loadData()
    }, [])

    // Remove save to local storage effect

    const addTestCase = async () => {
        setIsAdding(true)
        const newCase: Partial<TestCase> = {
            input: "",
            expectedCount: 5,
        }

        try {
            if (userId) {
                try {
                    const res = await fetch('/api/test-cases', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newCase)
                    })
                    if (res.ok) {
                        const savedCase = await res.json()
                        setTestCases([...testCases, savedCase])
                        return
                    }
                } catch (e) {
                    console.error("Failed to save new test case to backend", e)
                }
            }

            // Fallback to local only if not signed in or error
            setTestCases([...testCases, {
                id: crypto.randomUUID(),
                input: "",
                expectedCount: 5,
                history: []
            }])
        } finally {
            setIsAdding(false)
        }
    }

    const removeTestCase = async (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation()
        setIsDeletingId(id)
        try {
            if (userId) {
                try {
                    await fetch(`/api/test-cases/${id}`, { method: 'DELETE' })
                } catch (e) {
                    console.error("Failed to delete test case from backend", e)
                }
            }
            setTestCases(testCases.filter(t => t.id !== id))
            if (activeTestCaseId === id) {
                setActiveTestCaseId(null)
                setEditingCase(null)
            }
        } finally {
            setIsDeletingId(null)
        }
    }

    const updateTestCase = async (id: string, updates: Partial<TestCase>) => {
        setTestCases(testCases.map(t => t.id === id ? { ...t, ...updates } : t))
        if (editingCase?.id === id) {
            setEditingCase({ ...editingCase, ...updates })
        }

        if (userId) {
            try {
                await fetch(`/api/test-cases/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                })
            } catch (e) {
                console.error("Failed to update test case in backend", e)
            }
        }
    }

    const resetHistory = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (userId) {
            try {
                await fetch(`/api/test-cases/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ resetHistory: true })
                })
            } catch (e) {
                console.error("Failed to reset history in backend", e)
            }
        }
        updateTestCase(id, { history: [] })
    }

    const resetAllHistory = async () => {
        for (const testCase of testCases) {
            if (userId) {
                try {
                    setIsFetching(true)
                    await fetch(`/api/test-cases/${testCase.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ resetHistory: true })
                    })
                } catch (e) {
                    console.error("Failed to reset history for test case", testCase.id, e)
                } finally {
                    setIsFetching(false)
                }
            }
        }
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
                        system: systemPrompt,
                        customBaseUrl: customConfig?.baseUrl,
                        customApiKey: customConfig?.apiKey,
                        customModel: customConfig?.modelName,
                        customDifyBaseUrl: customDifyConfig?.baseUrl,
                        customDifyApiKey: customDifyConfig?.apiKey,
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

        // Save to backend history if signed in
        if (userId) {
            try {
                await fetch(`/api/test-cases/${caseId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        historyItem: {
                            successRate: finalSuccessRate,
                            timestamp: new Date().toISOString()
                        }
                    })
                })
            } catch (e) {
                console.error("Failed to save history item to backend", e)
            }
        }

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
        // Show loading overlay while fetching initial data
        if (isFetching) {
            return (
                <div className="flex flex-col h-full gap-4 p-4 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading test cases...</p>
                </div>
            )
        }

        // Calculate global success rate from all test cases
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
            <div className="flex flex-col h-full gap-4 p-4 overflow-y-auto">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">
                        <span className="mr-4">
                            Batch Suite
                        </span>
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
                                className="flex flex-col border rounded-lg p-3 hover:border-primary/50 transition-colors cursor-pointer group bg-card relative min-h-[250px]"
                                onClick={() => enterLayer2(testCase)}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex flex-col">
                                        <div className={`font-mono font-bold ${successRate === undefined || (result?.status === 'running' && result.details.length === 0) ? 'text-muted-foreground' :
                                            successRate === 100 ? 'text-green-600' :
                                                successRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                                            }`}>
                                            {successRate === undefined || (result?.status === 'running' && result.details.length === 0) ? 'No runs yet' : `${successRate.toFixed(0)}% Success`}
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
                                        ) : isDeletingId === testCase.id ? (
                                            <div className="h-6 w-6 flex items-center justify-center -mr-2">
                                                <Loader2 className="h-3 w-3 animate-spin text-destructive" />
                                            </div>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity -mr-2"
                                                onClick={(e) => removeTestCase(testCase.id, e)}
                                                disabled={isDeletingId !== null}
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
                                    <TrendChart history={testCase.history} id={testCase.id} />
                                </div>
                            </div>
                        )
                    })}
                    <div
                        onClick={isAdding ? undefined : addTestCase}
                        className={`flex flex-col justify-center items-center border rounded-lg p-3 transition-colors group bg-card relative min-h-[250px] ${isAdding ? 'opacity-70 cursor-wait' : 'hover:border-primary/50 cursor-pointer'}`}
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
            <div className="flex-1 p-4 pt-0 lg:pt-4 overflow-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-6 h-full">

                    {/* LEFT COLUMN: Input & Settings */}
                    <div className="flex flex-col pt-4 lg:pt-0 gap-6 pr-2 h-full">
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
                                value={editingCase?.validationScript || DEFAULT_VALIDATION_SCRIPT}
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
                    <div className="flex flex-col py-6 lg:pt-0 lg:overflow-y-auto lg:border-l lg:pl-6 h-full">
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
