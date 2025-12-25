import {
  ModelSelectorPopover,
  ModelSelectorLogo,
  ModelSelectorName,
  getModelById,
} from "@/app/shared"
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input"
import { forwardRef } from "react"

interface ChatInputProps {
  model: string
  modelSelectorOpen: boolean
  onModelSelectorOpenChange: (open: boolean) => void
  onModelChange?: (model: string) => void
  onSubmit: (message: PromptInputMessage) => void
  submitStatus: "ready" | "submitted" | "streaming"
}

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  function ChatInput(
    {
      model,
      modelSelectorOpen,
      onModelSelectorOpenChange,
      onModelChange,
      onSubmit,
      submitStatus,
    },
    ref
  ) {
    const selectedModelData = getModelById(model)

    return (
      <div className="p-4">
        <PromptInput globalDrop multiple onSubmit={onSubmit}>
          <PromptInputAttachments>
            {(attachment) => <PromptInputAttachment data={attachment} />}
          </PromptInputAttachments>
          <PromptInputBody>
            <PromptInputTextarea ref={ref} placeholder="Type your message..." />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
              <ModelSelectorPopover
                model={model}
                onModelChange={(modelId) => onModelChange?.(modelId)}
                open={modelSelectorOpen}
                onOpenChange={onModelSelectorOpenChange}
                trigger={
                  <PromptInputButton>
                    {selectedModelData?.chefSlug && (
                      <ModelSelectorLogo provider={selectedModelData.chefSlug} />
                    )}
                    {selectedModelData?.name && (
                      <ModelSelectorName>{selectedModelData.name}</ModelSelectorName>
                    )}
                  </PromptInputButton>
                }
              />
            </PromptInputTools>
            <PromptInputSubmit status={submitStatus} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    )
  }
)
