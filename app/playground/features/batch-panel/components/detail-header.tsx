import { Button } from "@/components/ui/button"
import { ArrowLeft, Trash } from "lucide-react"

interface DetailHeaderProps {
  onExit: () => void
  onRemove: () => void
}

export function DetailHeader({ onExit, onRemove }: DetailHeaderProps) {
  return (
    <div className="flex items-center gap-2 p-4 border-b">
      <Button variant="ghost" size="icon" onClick={onExit} className="-ml-2">
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <h3 className="font-medium">Test Case Detail</h3>
      <div className="ml-auto">
        <Button variant="ghost" size="icon" onClick={onRemove}>
          <Trash className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
}
