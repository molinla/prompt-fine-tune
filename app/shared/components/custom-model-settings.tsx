import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings2 } from "lucide-react"
import { useEffect, useState } from "react"

export interface CustomModelConfig {
  baseUrl: string
  apiKey: string
  modelName: string
}

interface CustomModelSettingsProps {
  onConfigChange: (config: CustomModelConfig) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CustomModelSettings({ onConfigChange, open, onOpenChange }: CustomModelSettingsProps) {
  const [baseUrl, setBaseUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [modelName, setModelName] = useState("")

  useEffect(() => {
    // Load from local storage on mount
    const savedConfig = localStorage.getItem("custom-openai-config")
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig)
        setBaseUrl(config.baseUrl || "")
        setApiKey(config.apiKey || "")
        setModelName(config.modelName || "")
        onConfigChange(config)
      } catch (e) {
        console.error("Failed to parse saved custom model config", e)
      }
    }
  }, []) // Empty dependency array to run only once on mount

  const handleSave = () => {
    const config: CustomModelConfig = {
      baseUrl,
      apiKey,
      modelName,
    }
    localStorage.setItem("custom-openai-config", JSON.stringify(config))
    onConfigChange(config)
    onConfigChange(config)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Custom Model Settings" className="shrink-0 bg-background">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Custom OpenAI Settings</DialogTitle>
          <DialogDescription>
            Configure your custom OpenAI-compatible model details here. These are saved locally in your browser.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="baseUrl" className="text-right">
              Base URL
            </Label>
            <Input
              id="baseUrl"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="modelName" className="text-right">
              Model Name
            </Label>
            <Input
              id="modelName"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="gpt-4o-mini"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="apiKey" className="text-right">
              API Key
            </Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
