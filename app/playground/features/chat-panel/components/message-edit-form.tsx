import { Button } from "@/components/ui/button"
import { CheckIcon } from "lucide-react"

interface MessageEditFormProps {
  content: string
  onContentChange: (content: string) => void
  onSave: () => void
  onCancel: () => void
}

export function MessageEditForm({
  content,
  onContentChange,
  onSave,
  onCancel,
}: MessageEditFormProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <textarea
        cols={128}
        rows={6}
        className="w-full min-h-[100px] p-2 rounded-md border bg-background resize-y"
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave}>
          <CheckIcon className="h-4 w-4 mr-1" />
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
