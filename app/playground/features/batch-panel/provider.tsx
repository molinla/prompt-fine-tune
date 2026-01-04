"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { useAuth } from "@clerk/nextjs"
import { v4 as uuid } from "uuid"
import { TestCase, TestResult } from "./types"

const STORAGE_KEY = "batch-test-cases"

export interface BatchPanelContextValue {
  testCases: TestCase[]
  results: Record<string, TestResult>
  isLoaded: boolean
  isFetching: boolean
  isAdding: boolean
  isDeletingId: string | null
  setTestCases: React.Dispatch<React.SetStateAction<TestCase[]>>
  setResults: React.Dispatch<React.SetStateAction<Record<string, TestResult>>>
  addTestCase: () => Promise<void>
  removeTestCase: (id: string, e?: React.MouseEvent) => Promise<void>
  updateTestCase: (id: string, updates: Partial<TestCase>) => Promise<void>
  resetHistory: (id: string, e: React.MouseEvent) => Promise<void>
  resetAllHistory: () => Promise<void>
}

const BatchPanelContext = createContext<BatchPanelContextValue | undefined>(undefined)

export interface BatchPanelProviderProps {
  children: ReactNode
}

export function BatchPanelProvider({ children }: BatchPanelProviderProps) {
  const { userId, isLoaded: authLoaded } = useAuth()
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [results, setResults] = useState<Record<string, TestResult>>({})
  const [isLoaded, setIsLoaded] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoaded) return
    if (isLoaded) return // Already loaded, don't load again

    let isMounted = true

    const loadData = async () => {
      setIsFetching(true)
      if (userId) {
        try {
          const res = await fetch('/api/test-cases')
          if (res.ok) {
            const data = await res.json()
            if (!isMounted) return
            setTestCases(data)
            setIsLoaded(true)
            setIsFetching(false)
            return
          }
        } catch (e) {
          console.error("Failed to load test cases from backend", e)
        }
      }

      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (!isMounted) return
          setTestCases(parsed)
        }
      } catch (e) {
        console.error("Failed to load batch test cases from localStorage", e)
      } finally {
        if (isMounted) {
          setIsLoaded(true)
          setIsFetching(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [userId, authLoaded, isLoaded])

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(testCases))
    }
  }, [testCases, isLoaded])

  const addTestCase = useCallback(async () => {
    setIsAdding(true)
    const newCase: Partial<TestCase> = {
      input: "",
      expectedCount: 10,
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
            setTestCases(prev => [...prev, savedCase])
            return
          }
        } catch (e) {
          console.error("Failed to save new test case to backend", e)
        }
      }

      setTestCases(prev => [...prev, {
        id: uuid(),
        input: "",
        expectedCount: 10,
        history: []
      }])
    } finally {
      setIsAdding(false)
    }
  }, [userId])

  const removeTestCase = useCallback(async (id: string, e?: React.MouseEvent) => {
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
      setTestCases(prev => prev.filter(t => t.id !== id))
    } finally {
      setIsDeletingId(null)
    }
  }, [userId])

  const updateTestCase = useCallback(async (id: string, updates: Partial<TestCase>) => {
    setTestCases(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))

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
  }, [userId])

  const resetHistory = useCallback(async (id: string, e: React.MouseEvent) => {
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
    setTestCases(prev => prev.map(t => t.id === id ? { ...t, history: [] } : t))
  }, [userId])

  const resetAllHistory = useCallback(async () => {
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
  }, [userId, testCases])

  const value: BatchPanelContextValue = {
    testCases,
    results,
    isLoaded,
    isFetching,
    isAdding,
    isDeletingId,
    setTestCases,
    setResults,
    addTestCase,
    removeTestCase,
    updateTestCase,
    resetHistory,
    resetAllHistory,
  }

  return (
    <BatchPanelContext.Provider value={value}>
      {children}
    </BatchPanelContext.Provider>
  )
}

export function useBatchPanelContext() {
  const context = useContext(BatchPanelContext)
  if (context === undefined) {
    throw new Error('useBatchPanelContext must be used within a BatchPanelProvider')
  }
  return context
}
