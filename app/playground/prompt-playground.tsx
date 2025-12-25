"use client"

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChatPanel } from "./features/chat-panel"
import { BatchPanel } from "./features/batch-panel"
import { PromptConfig, PromptConfigProvider } from "./features/prompt-config"
import { useCallback } from "react"
import { Layout } from "react-resizable-panels"

interface PromptPlaygroundProps {
  defaultLayout: Layout | undefined
}

const tabComponents = [
  { label: "Chat", value: "chat", component: ChatPanel },
  { label: "Batch Test", value: "batch", component: BatchPanel },
]

export default function PromptPlayground({ defaultLayout = { left: 30, right: 70 } }: PromptPlaygroundProps) {
  const onLayoutChange = useCallback((layout: Layout) => {
    document.cookie = `react-resizable-panels:layout=${JSON.stringify(layout)}; path=/`
  }, [])


  return (
    <PromptConfigProvider>
      <div className="h-screen w-full bg-background text-foreground overflow-hidden">
        <ResizablePanelGroup direction="horizontal" defaultLayout={defaultLayout} onLayoutChange={onLayoutChange}>
          <ResizablePanel id="left" collapsible defaultSize="30" minSize={400}>
            <PromptConfig />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel id="right" defaultSize="70" minSize={400}>
            <div className="h-full flex flex-col">
              <Tabs defaultValue="chat" className="h-full flex flex-col">
                <div className="border-b px-4 py-2">
                  <TabsList>
                    {tabComponents.map(({ label, value }) => (
                      <TabsTrigger key={value} value={value}>
                        {label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                {
                  tabComponents.map(({ value, component: C }) =>
                    <TabsContent key={value} value={value} className="flex-1 m-0 overflow-hidden">
                      <C />
                    </TabsContent>)
                }
              </Tabs>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </PromptConfigProvider>
  )
}
