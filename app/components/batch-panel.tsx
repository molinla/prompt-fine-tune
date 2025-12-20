"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Play, Loader2, Plus, Trash, ChevronRight, ArrowLeft, Settings2, CheckCircle, XCircle } from "lucide-react"
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

    const runSingleTest = async (testCase: TestCase) => {
        const caseId = testCase.id

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
                    headers: { 'Content-Type': 'json' },
                    body: JSON.stringify({
                        messages: [{ role: 'user', content: testCase.input }],
                        model,
                        system: systemPrompt
                    })
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
                errorMsg = e.message
                runDetails.push({
                    iteration: i + 1,
                    output: currentOutput || '(No output)',
                    status: 'failure',
                    error: e.message
                })
            }

            // Update results progressively
            setResults(prev => ({
                ...prev,
                [caseId]: {
                    ...prev[caseId],
                    details: [...runDetails]
                }
            }))
        }

        const successRate = (successCount / testCase.expectedCount) * 100

        const newHistoryItem: HistoryItem = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            successRate
        }

        // Update history in state
        setTestCases(prev => prev.map(t => {
            if (t.id === caseId) {
                return { ...t, history: [...t.history, newHistoryItem] }
            }
            return t
        }))

        setResults(prev => ({
            ...prev,
            [caseId]: {
                id: crypto.randomUUID(),
                testCaseId: caseId,
                status: successRate === 100 ? 'success' : 'failure',
                successRate,
                error: successRate === 100 ? undefined : (errorMsg || 'One or more tests failed'),
                lastRun: new Date().toISOString(),
                details: runDetails
            }
        }))
    }

    const runAllTests = async () => {
        setIsRunning(true)
        // Run sequentially to avoid rate limits
        for (const testCase of testCases) {
            await runSingleTest(testCase)
        }
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
                    <Button onClick={runAllTests} disabled={isRunning || testCases.length === 0}>
                        {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                        Run Suite
                    </Button>
                </div>

                <div className="space-y-3">
                    {testCases.map((testCase, index) => {
                        const result = results[testCase.id]
                        const successRate = result?.successRate ?? (testCase.history.length > 0 ? testCase.history[testCase.history.length - 1].successRate : undefined)

                        return (
                            <div key={testCase.id}
                                className="border rounded-lg p-3 hover:border-primary/50 transition-colors cursor-pointer group bg-card relative"
                                onClick={() => enterLayer2(testCase)}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1 font-medium truncate pr-8">
                                        {testCase.input || `Case #${index + 1}`}
                                    </div>
                                    <div className="absolute top-3 right-3 flex items-center gap-2">
                                        {result?.status === 'running' && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => removeTestCase(testCase.id, e)}
                                        >
                                            <Trash className="h-3 w-3 text-destructive" />
                                        </Button>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-50 group-hover:opacity-100" />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <div className="flex gap-2 items-center">
                                        {/* Sparkline visualization */}
                                        <div className="flex items-end gap-px h-4 w-20 bg-muted/20 overflow-hidden">
                                            {testCase.history.slice(-10).map((h) => (
                                                <div
                                                    key={h.id}
                                                    className={`w-1.5 ${h.successRate >= 90 ? 'bg-green-500' : h.successRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                    style={{ height: `${Math.max(10, h.successRate)}%` }} // Minimum height for visibility
                                                />
                                            ))}
                                        </div>
                                        <span>{testCase.history.length} runs</span>
                                    </div>

                                    <div className={`font-mono font-bold ${successRate === undefined ? '' :
                                        successRate === 100 ? 'text-green-600' :
                                            successRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                                        }`}>
                                        {successRate !== undefined ? `${successRate.toFixed(0)}%` : '--%'}
                                    </div>
                                </div>
                            </div>
                        )
                    })}

                    <Button variant="outline" className="w-full border-dashed" onClick={addTestCase}>
                        <Plus className="mr-2 h-4 w-4" /> New Test Case
                    </Button>
                </div>
            </div>
        )
    }

    // Layer 2: Detail
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

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Input Prompt</label>
                    <Textarea
                        value={editingCase?.input || ''}
                        onChange={(e) => updateTestCase(activeTestCaseId!, { input: e.target.value })}
                        className="min-h-[80px]"
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
                    {/* Placeholder for future specific settings */}
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
                        className="font-mono text-xs h-[150px] bg-slate-50 dark:bg-slate-950"
                        placeholder="// function(output, input) { ... }"
                    />
                    <p className="text-[10px] text-muted-foreground">
                        Variables: <code>output</code> (AI response), <code>input</code> (User prompt). Throw error to fail.
                    </p>
                </div>

                {/* Run Actions */}
                <div className="pt-4">
                    <Button
                        className="w-full"
                        size="lg"
                        onClick={() => editingCase && runSingleTest(editingCase)}
                        disabled={results[activeTestCaseId!]?.status === 'running'}
                    >
                        {results[activeTestCaseId!]?.status === 'running' ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running ({editingCase?.expectedCount}x)</>
                        ) : (
                            <><Play className="mr-2 h-4 w-4" /> Run Verification</>
                        )}
                    </Button>
                </div>

                {/* Single Run Result display */}
                {results[activeTestCaseId!] && (
                    <div className="space-y-4">
                        <div className={`mt-4 p-4 rounded-lg border ${results[activeTestCaseId!].status === 'success' ? 'bg-green-50/50 border-green-200' :
                            results[activeTestCaseId!].status === 'failure' ? 'bg-red-50/50 border-red-200' : 'bg-gray-50 border-gray-200'
                            }`}>
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-semibold text-sm">Last Run Result</span>
                                <span className="text-xs text-muted-foreground">
                                    {new Date(results[activeTestCaseId!].lastRun).toLocaleTimeString()}
                                </span>
                            </div>
                            <div className="text-2xl font-bold mb-1">
                                {results[activeTestCaseId!].successRate?.toFixed(0)}% <span className="text-sm font-normal text-muted-foreground">success</span>
                            </div>
                            {results[activeTestCaseId!].error && (
                                <div className="text-xs text-red-600 mt-2 p-2 bg-red-100 rounded">
                                    Error: {results[activeTestCaseId!].error}
                                </div>
                            )}
                        </div>

                        {/* Detailed Results List */}
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">Run Details</h4>
                            <div className="space-y-2">
                                {results[activeTestCaseId!].details.map((detail, idx) => (
                                    <div key={idx} className="text-sm border rounded p-3 bg-card">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-mono text-muted-foreground">Run #{detail.iteration}</span>
                                            {detail.status === 'success' ?
                                                <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                                                    <CheckCircle className="w-3 h-3" /> Pass
                                                </div> :
                                                <div className="flex items-center gap-1 text-red-600 text-xs font-medium">
                                                    <XCircle className="w-3 h-3" /> Fail
                                                </div>
                                            }
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-xs text-muted-foreground">Output:</div>
                                            <Streamdown mode="static" controls={{ code: false }}>
                                                {detail.output}
                                            </Streamdown>
                                            {detail.error && (
                                                <div className="text-xs text-red-600 bg-red-50 p-1 rounded mt-1">
                                                    {detail.error}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
