"use client"

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChatPanel } from "./features/chat-panel"
import { BatchPanel, BatchPanelProvider } from "./features/batch-panel"
import { PromptConfig, PromptConfigProvider } from "./features/prompt-config"
import { useCallback, useState } from "react"
import { Layout } from "react-resizable-panels"
import { useIsMobile } from "@/hooks/use-mobile"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { SettingsIcon } from "lucide-react"

interface PromptPlaygroundProps {
  defaultLayout: Layout | undefined
}

const tabComponents = [
  { label: "Chat", value: "chat", component: ChatPanel },
  { label: "Batch Test", value: "batch", component: BatchPanel },
]

function MobilePlayground() {
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="chat" className={`h-full flex flex-col duration-500 ${isSheetOpen ? "scale-95" : ""}`}>
        <div className="border-b px-4 py-2 flex items-center justify-between gap-2">
          <TabsList>
            {tabComponents.map(({ label, value }) => (
              <TabsTrigger key={value} value={value}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground">
                <SettingsIcon className="size-5" />
                <span className="sr-only">Prompt Settings</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[95vh] p-0 rounded-t-2xl overflow-hidden [&>button]:hidden">
              <SheetHeader className="sticky top-0 z-10 bg-white" onClick={() => setIsSheetOpen(false)}>
                <SheetTitle>
                  <span className="inline-block bg-gray-200 w-32 h-2 rounded-full"></span>
                </SheetTitle>
              </SheetHeader>
              <div className="h-[calc(100%-5vh)] overflow-y-auto pt-2">
                <PromptConfig className="border-none" />
              </div>
            </SheetContent>
          </Sheet>
        </div>
        {
          tabComponents.map(({ value, component: C }) =>
            <TabsContent key={value} value={value} className="flex-1 m-0 overflow-hidden">
              <C />
            </TabsContent>)
        }
      </Tabs>
    </div>
  )
}

function DesktopPlayground({
  defaultLayout,
  onLayoutChange
}: {
  defaultLayout: Layout | undefined
  onLayoutChange: (layout: Layout) => void
}) {
  return (
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
  )
}

export default function PromptPlayground({ defaultLayout = { left: 30, right: 70 } }: PromptPlaygroundProps) {
  const isMobile = useIsMobile()
  const onLayoutChange = useCallback((layout: Layout) => {
    document.cookie = `react-resizable-panels:layout=${JSON.stringify(layout)}; path=/`
  }, [])

  return (
    <PromptConfigProvider>
      <BatchPanelProvider>
        <div className="h-screen w-full bg-background text-foreground overflow-hidden">
          {isMobile ? (
            <MobilePlayground />
          ) : (
            <DesktopPlayground defaultLayout={defaultLayout} onLayoutChange={onLayoutChange} />
          )}
        </div>
      </BatchPanelProvider>
    </PromptConfigProvider>
  )
}
