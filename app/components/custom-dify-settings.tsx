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

export interface CustomDifyConfig {
  baseUrl: string
  apiKey: string
}

interface CustomDifySettingsProps {
  config?: CustomDifyConfig
  onConfigChange: (config: CustomDifyConfig) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CustomDifySettings({ config, onConfigChange, open, onOpenChange }: CustomDifySettingsProps) {
  const [baseUrl, setBaseUrl] = useState("")
  const [apiKey, setApiKey] = useState("")

  useEffect(() => {
    if (open && config) {
      setBaseUrl(config.baseUrl || "")
      setApiKey(config.apiKey || "")
    }
  }, [open, config])

  const handleSave = async () => {
    const newConfig: CustomDifyConfig = {
      baseUrl,
      apiKey,
    }

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'custom-dify-config',
          value: JSON.stringify(newConfig)
        })
      })
      onConfigChange(newConfig)
      onOpenChange(false)
    } catch (e) {
      console.error("Failed to save custom Dify config", e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Custom Dify Settings" className="shrink-0 bg-background">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Custom Dify Settings</DialogTitle>
          <DialogDescription>
            Configure your Dify API endpoint details here. These are saved in your settings.
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
              placeholder="https://api.dify.ai/v1"
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
              placeholder="app-..."
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
