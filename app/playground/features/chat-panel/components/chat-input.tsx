import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector"
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
import { CheckIcon } from "lucide-react"
import { forwardRef } from "react"
import { models } from "@/app/shared"

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
    const selectedModelData = models.find((m) => m.id === model) || models[0]
    const chefs = Array.from(new Set(models.map((m) => m.chef)))

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
              <ModelSelector
                onOpenChange={onModelSelectorOpenChange}
                open={modelSelectorOpen}
              >
                <ModelSelectorTrigger asChild>
                  <PromptInputButton>
                    {selectedModelData?.chefSlug && (
                      <ModelSelectorLogo provider={selectedModelData.chefSlug} />
                    )}
                    {selectedModelData?.name && (
                      <ModelSelectorName>{selectedModelData.name}</ModelSelectorName>
                    )}
                  </PromptInputButton>
                </ModelSelectorTrigger>
                <ModelSelectorContent>
                  <ModelSelectorInput placeholder="Search models..." />
                  <ModelSelectorList>
                    <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                    {chefs.map((chef) => (
                      <ModelSelectorGroup heading={chef} key={chef}>
                        {models
                          .filter((m) => m.chef === chef)
                          .map((modelItem) => (
                            <ModelSelectorItem
                              key={modelItem.id}
                              onSelect={() => {
                                onModelChange?.(modelItem.id)
                                onModelSelectorOpenChange(false)
                              }}
                              value={modelItem.id}
                            >
                              <ModelSelectorLogo provider={modelItem.chefSlug} />
                              <ModelSelectorName>{modelItem.name}</ModelSelectorName>
                              <ModelSelectorLogoGroup>
                                {modelItem.providers.map((provider) => (
                                  <ModelSelectorLogo
                                    key={provider}
                                    provider={provider}
                                  />
                                ))}
                              </ModelSelectorLogoGroup>
                              {model === modelItem.id ? (
                                <CheckIcon className="ml-auto size-4" />
                              ) : (
                                <div className="ml-auto size-4" />
                              )}
                            </ModelSelectorItem>
                          ))}
                      </ModelSelectorGroup>
                    ))}
                  </ModelSelectorList>
                </ModelSelectorContent>
              </ModelSelector>
            </PromptInputTools>
            <PromptInputSubmit status={submitStatus} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    )
  }
)
