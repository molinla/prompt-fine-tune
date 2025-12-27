"use client"

import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react"
import { useAuth } from "@clerk/nextjs"
import type { CustomModelConfig } from "@/app/shared"

export interface PromptConfigContextValue {
  systemPrompt: string
  historyTurns: number
  model: string
  topP: number
  temperature: number
  customConfig?: CustomModelConfig
  isLoading: boolean
  setSystemPrompt: (value: string) => void
  setHistoryTurns: (value: number) => void
  setModel: (value: string) => void
  setTopP: (value: number) => void
  setTemperature: (value: number) => void
  setCustomConfig: (config: CustomModelConfig | undefined) => void
}

const PromptConfigContext = createContext<PromptConfigContextValue | undefined>(undefined)

export interface PromptConfigProviderProps {
  children: ReactNode
}

const DEFAULT_CONFIG = {
  systemPrompt: "",
  historyTurns: 1,
  model: "gpt-4o-mini",
  topP: 0,
  temperature: 0,
} as const

type SettingKey = 'system-prompt' | 'history-turns' | 'model' | 'top-p' | 'temperature'

export function PromptConfigProvider({ children }: PromptConfigProviderProps) {
  const { userId, isLoaded: authLoaded } = useAuth()
  const [systemPrompt, setSystemPromptState] = useState<string>(DEFAULT_CONFIG.systemPrompt)
  const [historyTurns, setHistoryTurnsState] = useState<number>(DEFAULT_CONFIG.historyTurns)
  const [model, setModelState] = useState<string>(DEFAULT_CONFIG.model)
  const [topP, setTopPState] = useState<number>(DEFAULT_CONFIG.topP)
  const [temperature, setTemperatureState] = useState<number>(DEFAULT_CONFIG.temperature)
  const [isLoading, setIsLoading] = useState(true)
  const [customConfig, setCustomConfigState] = useState<CustomModelConfig | undefined>(undefined)

  const pendingChanges = useRef<Map<SettingKey, string>>(new Map())
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasHydratedRef = useRef(false)

  // 批量保存函数
  const flushSave = useCallback(async () => {
    if (!userId || pendingChanges.current.size === 0) return

    const changes = new Map(pendingChanges.current)
    pendingChanges.current.clear()

    try {
      await Promise.all(
        Array.from(changes.entries()).map(([key, value]) =>
          fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value })
          })
        )
      )
    } catch (e) {
      console.error("Failed to save settings", e)
      // 可选：恢复失败的变更到队列中
    }
  }, [userId])

  // 带防抖的保存调度
  const scheduleSave = useCallback((key: SettingKey, value: string) => {
    if (!userId || isLoading) return

    pendingChanges.current.set(key, value)

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      flushSave()
    }, 500) // 500ms 防抖
  }, [userId, isLoading, flushSave])

  useEffect(() => {
    const loadData = async () => {
      hasHydratedRef.current = false

      if (!userId) {
        setIsLoading(false)
        hasHydratedRef.current = true
        return
      }

      try {
        const res = await fetch('/api/settings?keys=system-prompt,history-turns,model,top-p,temperature')
        if (res.ok) {
          const settings = await res.json()
          if (settings['system-prompt']) setSystemPromptState(settings['system-prompt'])
          if (settings['history-turns']) {
            const parsedTurns = parseInt(settings['history-turns'])
            setHistoryTurnsState(Number.isFinite(parsedTurns) ? parsedTurns : DEFAULT_CONFIG.historyTurns)
          }
          if (settings['model']) setModelState(settings['model'])
          if (settings['top-p']) {
            const parsedTopP = parseFloat(settings['top-p'])
            setTopPState(Number.isFinite(parsedTopP) ? parsedTopP : DEFAULT_CONFIG.topP)
          }
          if (settings['temperature']) {
            const parsedTemp = parseFloat(settings['temperature'])
            setTemperatureState(Number.isFinite(parsedTemp) ? parsedTemp : DEFAULT_CONFIG.temperature)
          }
        }
      } catch (e) {
        console.error("Failed to fetch settings from backend", e)
      } finally {
        setIsLoading(false)
        hasHydratedRef.current = true
      }
    }

    if (authLoaded) {
      loadData()
    }
  }, [userId, authLoaded])

  const setSystemPrompt = useCallback((value: string) => {
    setSystemPromptState((prev) => {
      if (prev === value) return prev

      if (hasHydratedRef.current) {
        scheduleSave('system-prompt', value)
      }

      return value
    })
  }, [scheduleSave])

  const setHistoryTurns = useCallback((value: number) => {
    setHistoryTurnsState((prev) => {
      if (prev === value) return prev

      if (hasHydratedRef.current) {
        scheduleSave('history-turns', value.toString())
      }

      return value
    })
  }, [scheduleSave])

  const setModel = useCallback((value: string) => {
    setModelState((prev) => {
      if (prev === value) return prev

      if (hasHydratedRef.current) {
        scheduleSave('model', value)
      }

      return value
    })
  }, [scheduleSave])

  const setTopP = useCallback((value: number) => {
    setTopPState((prev) => {
      if (prev === value) return prev

      if (hasHydratedRef.current) {
        scheduleSave('top-p', value.toString())
      }

      return value
    })
  }, [scheduleSave])

  const setTemperature = useCallback((value: number) => {
    setTemperatureState((prev) => {
      if (prev === value) return prev

      if (hasHydratedRef.current) {
        scheduleSave('temperature', value.toString())
      }

      return value
    })
  }, [scheduleSave])

  const setCustomConfig = useCallback((config: CustomModelConfig | undefined) => {
    setCustomConfigState(config)
  }, [])

  // 组件卸载时保存pending的变更
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      flushSave()
    }
  }, [flushSave])

  const value: PromptConfigContextValue = {
    systemPrompt,
    historyTurns,
    model,
    topP,
    temperature,
    customConfig,
    isLoading,
    setSystemPrompt,
    setHistoryTurns,
    setModel,
    setTopP,
    setTemperature,
    setCustomConfig,
  }

  return (
    <PromptConfigContext.Provider value={value}>
      {children}
    </PromptConfigContext.Provider>
  )
}

export function usePromptConfigContext() {
  const context = useContext(PromptConfigContext)
  if (context === undefined) {
    throw new Error('usePromptConfigContext must be used within a PromptConfigProvider')
  }
  return context
}
