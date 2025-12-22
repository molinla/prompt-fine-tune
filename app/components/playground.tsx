"use client"

import { useState, useEffect } from "react"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CheckIcon, Loader2 } from "lucide-react"
import { ChatPanel } from "./chat-panel"
import { BatchPanel } from "./batch-panel"
import { models } from "./model-data"
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector"

import { CustomModelSettings, type CustomModelConfig } from "./custom-model-settings"

export function PromptPlayground() {
  const userId = "default-user"
  const [systemPrompt, setSystemPrompt] = useState("")
  const [historyTurns, setHistoryTurns] = useState(1)
  const [model, setModel] = useState("gpt-4o-mini")
  const [isLoading, setIsLoading] = useState(true)
  const [customConfig, setCustomConfig] = useState<CustomModelConfig | undefined>(undefined)
  const [isCustomSettingsOpen, setIsCustomSettingsOpen] = useState(false)

  // Load config from backend on mount (batch get)
  useEffect(() => {
    const loadData = async () => {
      try {
        // Batch get all AI config settings in one request
        const res = await fetch('/api/settings?keys=system-prompt,history-turns,model,custom-openai-config')
        if (res.ok) {
          const settings = await res.json()
          if (settings['system-prompt']) setSystemPrompt(settings['system-prompt'])
          if (settings['history-turns']) {
            const parsedTurns = parseInt(settings['history-turns'])
            setHistoryTurns(Number.isFinite(parsedTurns) ? parsedTurns : 1)
          }
          if (settings['model']) setModel(settings['model'])
          if (settings['custom-openai-config']) {
            try {
              setCustomConfig(JSON.parse(settings['custom-openai-config']))
            } catch (e) {
              console.error("Failed to parse custom-openai-config", e)
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch settings from backend", e)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Save to backend on change
  useEffect(() => {
    if (!isLoading) {
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'system-prompt', value: systemPrompt })
      })
    }
  }, [systemPrompt, isLoading])

  useEffect(() => {
    if (!isLoading) {
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'history-turns', value: historyTurns.toString() })
      })
    }
  }, [historyTurns, isLoading])

  useEffect(() => {
    if (!isLoading) {
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'model', value: model })
      })
    }
  }, [model, isLoading])

  const selectedModelData = models.find((m) => m.id === model) || models[0];
  const chefs = Array.from(new Set(models.map((model) => model.chef)));
  const [open, setOpen] = useState(false);

  return (
    <div className="h-screen w-full bg-background text-foreground overflow-hidden relative">
      {/* Loading overlay for initial config fetch */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading configuration...</p>
          </div>
        </div>
      )}
      <ResizablePanelGroup direction="horizontal">
        {/* Left Panel: Prompt Configuration */}
        <ResizablePanel defaultSize={30} minSize={20}>
          <div className="flex flex-col h-full p-4 border-r gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Prompt Config</h2>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-medium text-sm">Model</label>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 min-w-0">
                    <ModelSelector onOpenChange={setOpen} open={open}>
                      <ModelSelectorTrigger asChild>
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
                      </ModelSelectorTrigger>
                    <ModelSelectorContent>
                      <ModelSelectorInput placeholder="Search models..." />
                      <ModelSelectorList>
                        <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                        {chefs.map((chef) => (
                          <ModelSelectorGroup heading={chef} key={chef}>
                            {models
                              .filter((model) => model.chef === chef)
                              .map((modelItem) => (
                                <ModelSelectorItem
                                  key={modelItem.id}
                                  onSelect={() => {
                                    setModel(modelItem.id);
                                    setOpen(false);
                                  }}
                                  value={modelItem.id}
                                >
                                  <ModelSelectorLogo provider={modelItem.chefSlug} />
                                  <ModelSelectorName>{modelItem.name}</ModelSelectorName>
                                  <ModelSelectorLogoGroup>
                                    {modelItem.providers.map((provider) => (
                                      <ModelSelectorLogo
                                        key={provider}
                                        provider={provider}
                                      />
                                    ))}
                                  </ModelSelectorLogoGroup>
                                  {model === modelItem.id ? (
                                    <CheckIcon className="ml-auto size-4" />
                                  ) : (
                                    <div className="ml-auto size-4" />
                                  )}
                                </ModelSelectorItem>
                              ))}
                          </ModelSelectorGroup>
                        ))}
                      </ModelSelectorList>
                    </ModelSelectorContent>
                  </ModelSelector>
                </div>
                {model === 'custom-openai' && (
                    <CustomModelSettings
                      config={customConfig}
                      onConfigChange={setCustomConfig}
                      open={isCustomSettingsOpen}
                      onOpenChange={setIsCustomSettingsOpen}
                    />
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-medium text-sm">History Turns</label>
                <Input
                  className="h-9"
                  type="number"
                  min={0}
                  value={historyTurns}
                  onChange={(e) => setHistoryTurns(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <label className="font-medium text-sm">System Prompt</label>
              <Textarea
                className="flex-1 resize-none font-mono text-sm"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Enter system prompt instructions..."
              />
            </div>


          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel: Interaction */}
        <ResizablePanel defaultSize={70}>
          <div className="h-full flex flex-col">
            <Tabs defaultValue="chat" className="h-full flex flex-col">
              <div className="border-b px-4 py-2">
                <TabsList>
                  <TabsTrigger value="chat">Chat</TabsTrigger>
                  <TabsTrigger value="batch">Batch Test</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="chat" className="flex-1 m-0 overflow-hidden">
                <ChatPanel
                  systemPrompt={systemPrompt}
                  // If the backend expects "openai/gpt-4o", and we only have "gpt-4o",
                  // we might need to map it. For now, passing ID as is.
                  model={model}
                  historyTurns={historyTurns}
                  customConfig={customConfig}
                />
              </TabsContent>

              <TabsContent value="batch" className="flex-1 m-0 overflow-hidden">
                <BatchPanel
                  systemPrompt={systemPrompt}
                  model={model}
                  customConfig={customConfig}
                />
              </TabsContent>
            </Tabs>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
