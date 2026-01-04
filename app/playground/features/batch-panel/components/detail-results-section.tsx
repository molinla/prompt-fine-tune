import { CheckCircle, XCircle, Play } from "lucide-react"
import { Streamdown } from "streamdown"
import { TestResult } from "../types"

interface DetailResultsSectionProps {
  result: TestResult | undefined
  onToggleIteration?: (index: number) => void
}

export function DetailResultsSection({ result, onToggleIteration }: DetailResultsSectionProps) {
  if (!result) {
    return (
      <div className="flex flex-col py-6 pt-10 @2xl:pt-0 @2xl:overflow-y-auto @2xl:border-l @2xl:pl-6 h-ful w-full min-h-[80vh]">
        <h4 className="font-medium mb-4 sticky top-0 bg-background z-10 py-2 border-b">Results</h4>
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-50">
          <Play className="h-12 w-12 mb-2" />
          <p>Run the test to see results here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col py-6 pt-10 @2xl:pt-0 @2xl:overflow-y-auto @2xl:border-l @2xl:pl-6 h-ful w-full min-h-[80vh]">
      <h4 className="font-medium mb-4 sticky top-0 bg-background z-10 py-2 border-b">Results</h4>
      <div className="space-y-6">
        <div className={`p-4 rounded-lg border ${result.status === 'success' ? 'bg-green-50/50 border-green-200' :
          result.status === 'failure' ? 'bg-red-50/50 border-red-200' :
            'bg-secondary/50 border-border'
          }`}>
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-sm">Last Run Summary</span>
            <span className="text-xs text-muted-foreground">
              {new Date(result.lastRun).toLocaleTimeString()}
            </span>
          </div>
          <div className="text-3xl font-bold mb-1">
            {result.successRate?.toFixed(0)}% <span className="text-base font-normal text-muted-foreground">success rate</span>
          </div>
          <div className="flex gap-4 text-xs mt-2">
            <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-600" /> {result.details.filter(d => d.status === 'success').length} passed</span>
            <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-600" /> {result.details.filter(d => d.status === 'failure').length} failed</span>
          </div>
          {result.error && (
            <div className="text-xs text-red-600 mt-3 p-2 bg-red-100/50 rounded border border-red-200">
              Error: {result.error}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Log Details</h5>
          {result.details.map((detail, idx) => (
            <div key={idx} className="text-sm border rounded-lg p-3 bg-card/50 hover:bg-card transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">#{detail.iteration}</span>
                <button
                  onClick={() => onToggleIteration?.(idx)}
                  disabled={result.status === 'running'}
                  className={`focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-full transition-all active:scale-95 ${result.status === 'running' ? 'opacity-50 cursor-not-allowed active:scale-100' : ''}`}
                  title={result.status === 'running' ? "Cannot toggle while running" : "Click to toggle Pass/Fail"}
                >
                  {detail.status === 'success' ?
                    <span className="flex items-center gap-1.5 text-green-600 text-xs font-medium px-2 py-0.5 bg-green-50 rounded-full border border-green-100 hover:bg-green-100/80">
                      <CheckCircle className="w-3 h-3" /> Pass
                    </span> :
                    <span className="flex items-center gap-1.5 text-red-600 text-xs font-medium px-2 py-0.5 bg-red-50 rounded-full border border-red-100 hover:bg-red-100/80">
                      <XCircle className="w-3 h-3" /> Fail
                    </span>
                  }
                </button>
              </div>
              <div className="space-y-2 mt-2">
                <Streamdown mode="static" className="text-xs max-h-75 overflow-y-auto">
                  {detail.output}
                </Streamdown>
                {detail.error && (
                  <div className={`text-xs p-2 rounded border flex items-center gap-2 ${detail.status === 'success' && detail.error === 'Passed by user evaluation'
                    ? 'text-amber-700 bg-amber-50 border-amber-200'
                    : 'text-red-600 bg-red-50 border-red-100'
                    }`}>
                    {detail.status === 'success' && detail.error === 'Passed by user evaluation' && (
                      <CheckCircle className="w-3 h-3" />
                    )}
                    {detail.error}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
