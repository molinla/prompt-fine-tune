export interface HistoryItem {
  id: string
  timestamp: string
  successRate: number
}

export interface TestCase {
  id: string
  input: string
  expectedCount: number
  validationScript?: string
  history: HistoryItem[]
}

export interface RunDetail {
  iteration: number
  output: string
  status: 'success' | 'failure'
  error?: string
}

export interface TestResult {
  id: string
  testCaseId: string
  historyItemId?: string // Track which history record this belongs to
  status: 'pending' | 'success' | 'failure' | 'running'
  successRate?: number
  error?: string
  lastRun: string
  details: RunDetail[]
}
