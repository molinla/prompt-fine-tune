"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash, Loader2, StopCircle, RotateCcw, Quote, MapPin, BadgeDollarSign } from "lucide-react"
import type { TestCase, TestResult } from "../types"
import { TrendChart } from "./trend-chart"

interface TestCaseCardProps {
  testCase: TestCase
  result?: TestResult
  isDeletingId: string | null
  onEnterDetail: (testCase: TestCase) => void
  onRemove: (id: string) => void
  onTerminate: (id: string) => void
  onResetHistory: (id: string) => void
}

export function TestCaseCard({
  testCase,
  result,
  isDeletingId,
  onEnterDetail,
  onRemove,
  onTerminate,
  onResetHistory,
}: TestCaseCardProps) {
  const successRate = result?.successRate ??
    (testCase.history.length > 0 ? testCase.history[testCase.history.length - 1].successRate : undefined)

  let userInput: string | Record<string, any> = testCase.input
  try {
    userInput = JSON.parse(testCase.input)
  } catch {
    // Input is not JSON, treat as string
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRemove(testCase.id)
  }

  const handleTerminate = (e: React.MouseEvent) => {
    e.stopPropagation()
    onTerminate(testCase.id)
  }

  const handleResetHistory = (e: React.MouseEvent) => {
    e.stopPropagation()
    onResetHistory(testCase.id)
  }

  return (
    <div
      className="flex flex-col border rounded-lg p-3 hover:border-primary/20 transition-colors cursor-pointer group bg-card relative min-h-[250px]"
      onClick={() => onEnterDetail(testCase)}
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
              onClick={handleTerminate}
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
              onClick={handleRemove}
              disabled={isDeletingId !== null}
            >
              <Trash className="h-3 w-3 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 mb-2 relative">
        {typeof userInput === 'string' ? (
          <div className="text-sm text-foreground/80 line-clamp-4 wrap-break-words whitespace-pre-wrap" title={userInput}>
            {userInput ? <h1 className="font-bold text-lg">{userInput}</h1> : <span className="italic text-muted-foreground">Empty test case...</span>}
          </div>
        ) : (
          <div className="flex flex-col justify-between h-full text-sm text-foreground/80 line-clamp-3 wrap-break-words whitespace-pre-wrap" title={JSON.stringify(userInput)}>
            <h1 className="font-bold text-lg">{userInput.user_query}</h1>
            <footer className="flex gap-1">
              {userInput.user_profile?.level === "VIP" && <Badge className="size-5 p-0" variant="secondary"><BadgeDollarSign size={12} /></Badge>}
              {userInput.user_profile?.location && <Badge className="size-5 p-0" variant="secondary"><MapPin size={12} /></Badge>}
            </footer>
          </div>
        )}
        <Quote className="absolute bottom-0 right-0 opacity-5 z-index-[-1]" size={128} />
      </div>

      <div className="mt-auto pt-2 border-t border-dashed">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>Trend ({testCase.history.length} runs)</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-transparent hover:text-foreground"
            onClick={handleResetHistory}
            title="Reset History"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
        <TrendChart history={testCase.history} id={testCase.id} />
      </div>
    </div>
  )
}
