import { usePromptConfigContext } from '../provider'
import type { CustomModelConfig } from "@/app/shared"

export interface PromptConfig {
  systemPrompt: string
  historyTurns: number
  model: string
  topP: number
  temperature: number
  customConfig?: CustomModelConfig
}

export interface UsePromptConfigReturn extends PromptConfig {
  isLoading: boolean
  setSystemPrompt: (value: string) => void
  setHistoryTurns: (value: number) => void
  setModel: (value: string) => void
  setTopP: (value: number) => void
  setTemperature: (value: number) => void
  setCustomConfig: (config: CustomModelConfig | undefined) => void
}

export function usePromptConfig(): UsePromptConfigReturn {
  return usePromptConfigContext()
}
