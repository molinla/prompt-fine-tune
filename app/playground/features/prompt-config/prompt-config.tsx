"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs"
import { Minus, Plus } from "lucide-react"
import { PromptConfigSkeleton } from "./components/loading"
import {
  CustomModelSettings,
  type CustomModelConfig,
  ModelSelectorPopover,
  ModelSelectorLogo,
  ModelSelectorName,
  getModelById,
} from "@/app/shared"
import { usePromptConfig } from "./hooks/use-prompt-config"
import { ButtonGroup } from "@/components/ui/button-group"
import { cn } from "@/lib/utils"

export interface PromptConfigProps {
  className?: string
  onConfigChange?: (config: {
    systemPrompt: string
    historyTurns: number
    model: string
    topP: number
    temperature: number
    customConfig?: CustomModelConfig
  }) => void
}

export function PromptConfig({ onConfigChange, className }: PromptConfigProps) {
  const {
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
  } = usePromptConfig()

  const [open, setOpen] = useState(false)
  const [isCustomSettingsOpen, setIsCustomSettingsOpen] = useState(false)

  const selectedModelData = getModelById(model)

  if (isLoading) return <PromptConfigSkeleton />

  return (
    <div className={cn("relative flex flex-col h-full p-4 border-r gap-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Prompt Config</h2>
        <div>
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="outline" size="sm">Sign In</Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton appearance={{ elements: { userButtonAvatarBox: "size-8" } }} />
          </SignedIn>
        </div>
      </div>

      {/* Configuration Controls */}
      <div className="flex flex-col gap-4">
        {/* Model Selector */}
        <div className="flex flex-col gap-1">
          <label className="font-medium text-sm">Model</label>
          <div className="flex gap-2 items-center">
            <div className="flex-1 min-w-0">
              <ModelSelectorPopover
                model={model}
                onModelChange={setModel}
                open={open}
                onOpenChange={setOpen}
                trigger={
                  <Button className="w-full justify-between font-normal px-2" variant="outline">
                    <div className="flex items-center gap-2 truncate">
                      {selectedModelData?.chefSlug && (
                        <ModelSelectorLogo provider={selectedModelData.chefSlug} />
                      )}
                      {selectedModelData?.name && (
                        <ModelSelectorName className="truncate">{selectedModelData.name}</ModelSelectorName>
                      )}
                    </div>
                  </Button>
                }
              />
            </div>
            {model === 'custom-openai' && (
              <CustomModelSettings
                onConfigChange={setCustomConfig}
                open={isCustomSettingsOpen}
                onOpenChange={setIsCustomSettingsOpen}
              />
            )}
          </div>
        </div>

        {/* History Turns */}
        <div className="flex flex-col gap-1">
          <label className="font-medium text-sm">History Turns</label>
          <ButtonGroup className="w-full">
            <Input
              className="h-9"
              type="number"
              min={0}
              value={historyTurns}
              onChange={(e) => setHistoryTurns(parseInt(e.target.value) || 0)}
            />
            <Button variant="outline" onClick={() => setHistoryTurns(Math.min(50, historyTurns + 1))}><Plus /></Button>
            <Button variant="outline" onClick={() => setHistoryTurns(Math.max(0, historyTurns - 1))}><Minus /></Button>
          </ButtonGroup>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <label className="font-medium text-sm">Temperature</label>
            <span className="text-xs text-muted-foreground font-mono">{temperature.toFixed(2)}</span>
          </div>
          <Slider
            min={0}
            max={2}
            step={0.05}
            value={[temperature]}
            onValueChange={([v]) => setTemperature(v)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <label className="font-medium text-sm">Top P</label>
            <span className="text-xs text-muted-foreground font-mono">{topP.toFixed(2)}</span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.05}
            value={[topP]}
            onValueChange={([v]) => setTopP(v)}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2 min-h-0">
        <label className="font-medium text-sm">System Prompt</label>
        <Textarea
          className="flex-1 resize-none font-mono text-sm overflow-auto"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="Enter system prompt instructions..."
        />
      </div>
    </div>
  )
}
