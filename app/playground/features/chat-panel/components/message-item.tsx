import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message"
import { MessageActionButtons } from "./message-action-buttons"
import { MessageEditForm } from "./message-edit-form"

interface MessageItemProps {
  role: 'user' | 'assistant'
  content: string
  isEditing: boolean
  editingContent: string
  onEditingContentChange: (content: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onCopy: () => void
  onEdit: () => void
  onResendOrRetry: () => void
}

export function MessageItem({
  role,
  content,
  isEditing,
  editingContent,
  onEditingContentChange,
  onSaveEdit,
  onCancelEdit,
  onCopy,
  onEdit,
  onResendOrRetry,
}: MessageItemProps) {
  return (
    <Message from={role}>
      <div className="flex flex-col gap-2">
        <MessageContent>
          {role === 'assistant' ? (
            isEditing ? (
              <MessageEditForm
                content={editingContent}
                onContentChange={onEditingContentChange}
                onSave={onSaveEdit}
                onCancel={onCancelEdit}
              />
            ) : (
              <MessageResponse>{content}</MessageResponse>
            )
          ) : (
            content
          )}
        </MessageContent>
        {!isEditing && (
          <MessageActionButtons
            role={role}
            onCopy={onCopy}
            onEdit={onEdit}
            onResendOrRetry={onResendOrRetry}
          />
        )}
      </div>
    </Message>
  )
}
