"use client"

import { useState, useEffect } from "react"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CheckIcon } from "lucide-react"
import { ChatPanel } from "./chat-panel"
import { BatchPanel } from "./batch-panel"
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs"
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

export function PromptPlayground() {
  const [systemPrompt, setSystemPrompt] = useState("Result in Markdown")
  const [historyTurns, setHistoryTurns] = useState(5)
  const [model, setModel] = useState("gpt-4o-mini") // Default to matching ID in list if possible, or handle prefix

  // Load from local storage on mount
  useEffect(() => {
    const savedPrompt = localStorage.getItem("system-prompt")
    if (savedPrompt) setSystemPrompt(savedPrompt)

    const savedTurns = localStorage.getItem("history-turns")
    if (savedTurns) setHistoryTurns(parseInt(savedTurns))

    // Check if we have a saved model, maybe handle the prefix issue from legacy state
    const savedModel = localStorage.getItem("model")
    if (savedModel) {
      // If saved model has prefix (e.g. openai/gpt-4o), strip it to match our list IDs if needed, 
      // OR rely on robust finding.
      // For now, let's just trust it or clean it up if we want to force list compliance.
      // But since we are switching to a selector, we usually want to match one of the items.
      // Let's see if it matches any ID.
      const header = savedModel.includes("/") ? savedModel.split("/")[1] : savedModel;
      const exists = models.find(m => m.id === savedModel || m.id === header);
      if (exists) {
        setModel(exists.id);
      }
    }
  }, [])

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem("system-prompt", systemPrompt)
  }, [systemPrompt])

  useEffect(() => {
    localStorage.setItem("history-turns", historyTurns.toString())
  }, [historyTurns])

  useEffect(() => {
    // Also save model
    localStorage.setItem("model", model)
  }, [model])

  const selectedModelData = models.find((m) => m.id === model) || models[0];
  const chefs = Array.from(new Set(models.map((model) => model.chef)));
  const [open, setOpen] = useState(false);

  return (
    <div className="h-screen w-full bg-background text-foreground overflow-hidden">
      <ResizablePanelGroup direction="horizontal">
        {/* Left Panel: Prompt Configuration */}
        <ResizablePanel defaultSize={30} minSize={20}>
          <div className="flex flex-col h-full p-4 border-r gap-4">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-medium text-sm">Model</label>
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
                />
              </TabsContent>

              <TabsContent value="batch" className="flex-1 m-0 overflow-hidden">
                <BatchPanel
                  systemPrompt={systemPrompt}
                  model={model}
                />
              </TabsContent>
            </Tabs>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
