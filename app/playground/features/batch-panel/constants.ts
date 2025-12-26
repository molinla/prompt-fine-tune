export const DEFAULT_VALIDATION_SCRIPT = `// Available variables: output (string), input (string)
// Throw error to fail
if (!output.includes('expected')) {
  throw new Error('Missing expected content')
}`

export const STORAGE_KEY = "batch-test-cases"

export const DEFAULT_EXPECTED_COUNT = 10
