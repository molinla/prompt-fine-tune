import {
  MessageAction,
  MessageActions,
} from "@/components/ai-elements/message"
import { CopyIcon, PencilIcon, RefreshCwIcon } from "lucide-react"

interface MessageActionButtonsProps {
  role: 'user' | 'assistant'
  onCopy: () => void
  onEdit: () => void
  onResendOrRetry: () => void
}

export function MessageActionButtons({
  role,
  onCopy,
  onEdit,
  onResendOrRetry,
}: MessageActionButtonsProps) {
  return (
    <MessageActions
      className={`text-gray-600 ${role === 'user' ? 'ml-auto' : 'mr-auto'}`}
    >
      <MessageAction tooltip="Copy" onClick={onCopy}>
        <CopyIcon className="h-4 w-4" />
      </MessageAction>
      {role === 'user' ? (
        <>
          <MessageAction tooltip="Resend" onClick={onResendOrRetry}>
            <RefreshCwIcon className="h-4 w-4" />
          </MessageAction>
          <MessageAction tooltip="Edit" onClick={onEdit}>
            <PencilIcon className="h-4 w-4" />
          </MessageAction>
        </>
      ) : (
        <>
          <MessageAction tooltip="Edit" onClick={onEdit}>
            <PencilIcon className="h-4 w-4" />
          </MessageAction>
          <MessageAction tooltip="Retry" onClick={onResendOrRetry}>
            <RefreshCwIcon className="h-4 w-4" />
          </MessageAction>
        </>
      )}
    </MessageActions>
  )
}
