"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@clerk/nextjs"
import { v4 as uuid } from "uuid"
import type { TestCase, HistoryItem } from "../types"
import { STORAGE_KEY, DEFAULT_EXPECTED_COUNT } from "../constants"

export function useTestCases() {
  const { userId, isLoaded: authLoaded } = useAuth()
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)

  // Load from local storage or backend on mount
  useEffect(() => {
    const loadData = async () => {
      setIsFetching(true)

      if (userId) {
        try {
          const res = await fetch('/api/test-cases')
          if (res.ok) {
            const data = await res.json()
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
          setTestCases(JSON.parse(saved))
        }
      } catch (e) {
        console.error("Failed to load batch test cases from localStorage", e)
      } finally {
        setIsLoaded(true)
        setIsFetching(false)
      }
    }

    if (authLoaded) {
      loadData()
    }
  }, [userId, authLoaded])

  // Save to local storage on change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(testCases))
    }
  }, [testCases, isLoaded])

  const addTestCase = useCallback(async () => {
    setIsAdding(true)
    const newCase: Partial<TestCase> = {
      input: "",
      expectedCount: DEFAULT_EXPECTED_COUNT,
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
        expectedCount: DEFAULT_EXPECTED_COUNT,
        history: []
      }])
    } finally {
      setIsAdding(false)
    }
  }, [userId])

  const removeTestCase = useCallback(async (id: string) => {
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

  const resetHistory = useCallback(async (id: string) => {
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
    setIsFetching(true)
    try {
      if (userId) {
        await Promise.all(testCases.map(testCase =>
          fetch(`/api/test-cases/${testCase.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resetHistory: true })
          }).catch(e => console.error("Failed to reset history for test case", testCase.id, e))
        ))
      }
      setTestCases(prev => prev.map(t => ({ ...t, history: [] })))
    } finally {
      setIsFetching(false)
    }
  }, [userId, testCases])

  const addHistoryItem = useCallback((caseId: string, historyItem: HistoryItem) => {
    setTestCases(prev => prev.map(t => {
      if (t.id === caseId) {
        return { ...t, history: [...t.history, historyItem] }
      }
      return t
    }))
  }, [])

  const updateHistoryItem = useCallback((caseId: string, historyId: string, updates: Partial<HistoryItem>) => {
    setTestCases(prev => prev.map(t => {
      if (t.id === caseId) {
        return {
          ...t,
          history: t.history.map(h =>
            h.id === historyId ? { ...h, ...updates } : h
          )
        }
      }
      return t
    }))
  }, [])

  const saveHistoryToBackend = useCallback(async (caseId: string, successRate: number) => {
    if (userId) {
      try {
        await fetch(`/api/test-cases/${caseId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            historyItem: {
              successRate,
              timestamp: new Date().toISOString()
            }
          })
        })
      } catch (e) {
        console.error("Failed to save history item to backend", e)
      }
    }
  }, [userId])

  return {
    testCases,
    isLoaded,
    isFetching,
    isAdding,
    isDeletingId,
    addTestCase,
    removeTestCase,
    updateTestCase,
    resetHistory,
    resetAllHistory,
    addHistoryItem,
    updateHistoryItem,
    saveHistoryToBackend,
  }
}
