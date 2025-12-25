import { Separator } from "@/components/ui/separator"

interface HistorySeparatorProps {
  historyTurns: number
}

export function HistorySeparator({ historyTurns }: HistorySeparatorProps) {
  return (
    <div className="flex items-center gap-2 my-4 px-2">
      <Separator className="flex-1" />
      <span className="text-xs text-muted-foreground whitespace-nowrap bg-background px-2">
        ↓ History sent to AI (last {historyTurns} turn messages)
      </span>
      <Separator className="flex-1" />
    </div>
  )
}
