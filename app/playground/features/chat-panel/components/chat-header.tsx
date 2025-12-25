import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

interface ChatHeaderProps {
  hasMessages: boolean
  onClearHistory: () => void
}

export function ChatHeader({ hasMessages, onClearHistory }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 shrink-0">
      <h2 className="text-sm font-medium">Chat</h2>
      {hasMessages && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onClearHistory}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Clear history"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
