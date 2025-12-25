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
  const [systemPrompt, setSystemPrompt] = useState<string>(DEFAULT_CONFIG.systemPrompt)
  const [historyTurns, setHistoryTurns] = useState<number>(DEFAULT_CONFIG.historyTurns)
  const [model, setModel] = useState<string>(DEFAULT_CONFIG.model)
  const [topP, setTopP] = useState<number>(DEFAULT_CONFIG.topP)
  const [temperature, setTemperature] = useState<number>(DEFAULT_CONFIG.temperature)
  const [isLoading, setIsLoading] = useState(true)
  const [customConfig, setCustomConfig] = useState<CustomModelConfig | undefined>(undefined)

  const pendingChanges = useRef<Map<SettingKey, string>>(new Map())
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isInitialLoad = useRef(true)

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
      if (!userId) {
        setIsLoading(false)
        return
      }

      try {
        const res = await fetch('/api/settings?keys=system-prompt,history-turns,model,top-p,temperature')
        if (res.ok) {
          const settings = await res.json()
          if (settings['system-prompt']) setSystemPrompt(settings['system-prompt'])
          if (settings['history-turns']) {
            const parsedTurns = parseInt(settings['history-turns'])
            setHistoryTurns(Number.isFinite(parsedTurns) ? parsedTurns : DEFAULT_CONFIG.historyTurns)
          }
          if (settings['model']) setModel(settings['model'])
          if (settings['top-p']) {
            const parsedTopP = parseFloat(settings['top-p'])
            setTopP(Number.isFinite(parsedTopP) ? parsedTopP : DEFAULT_CONFIG.topP)
          }
          if (settings['temperature']) {
            const parsedTemp = parseFloat(settings['temperature'])
            setTemperature(Number.isFinite(parsedTemp) ? parsedTemp : DEFAULT_CONFIG.temperature)
          }
        }
      } catch (e) {
        console.error("Failed to fetch settings from backend", e)
      } finally {
        setIsLoading(false)
        setTimeout(() => {
          isInitialLoad.current = false
        }, 0)
      }
    }

    if (authLoaded) {
      loadData()
    }
  }, [userId, authLoaded])

  // 统一的保存 effect - 监听所有配置变化
  useEffect(() => {
    if (isInitialLoad.current || isLoading) return

    scheduleSave('system-prompt', systemPrompt)
  }, [systemPrompt, scheduleSave, isLoading])

  useEffect(() => {
    if (isInitialLoad.current || isLoading) return

    scheduleSave('history-turns', historyTurns.toString())
  }, [historyTurns, scheduleSave, isLoading])

  useEffect(() => {
    if (isInitialLoad.current || isLoading) return

    scheduleSave('model', model)
  }, [model, scheduleSave, isLoading])

  useEffect(() => {
    if (isInitialLoad.current || isLoading) return

    scheduleSave('top-p', topP.toString())
  }, [topP, scheduleSave, isLoading])

  useEffect(() => {
    if (isInitialLoad.current || isLoading) return

    scheduleSave('temperature', temperature.toString())
  }, [temperature, scheduleSave, isLoading])

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
