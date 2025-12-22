"use client";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
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
} from "@/components/ai-elements/model-selector";
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
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useChat } from "@ai-sdk/react"
import {
  CheckIcon,
  CopyIcon,
  MessageSquareIcon,
  PencilIcon,
  RefreshCwIcon,
  SendHorizontalIcon,
  Trash2,
} from "lucide-react"
import { useRef, useState } from "react"

import { CustomModelConfig } from "./custom-model-settings";
import { models } from "./model-data";

interface ChatPanelProps {
  systemPrompt: string
  model: string
  historyTurns: number
  customConfig?: CustomModelConfig
  onModelChange?: (model: string) => void
  topP?: number
  temperature?: number
}

export function ChatPanel({ systemPrompt, model, historyTurns, customConfig, onModelChange, topP = 1, temperature = 1 }: ChatPanelProps) {
  const { messages, sendMessage, stop, status, setMessages } = useChat()
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState("")

  const selectedModelData = models.find((m) => m.id === model) || models[0];
  const chefs = Array.from(new Set(models.map((m) => m.chef)));

  const getSubmitStatus = () => {
    if (status === "submitted") return "submitted";
    if (status === "streaming") return "streaming";
    return "ready";
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    await sendMessage({
      text: message.text || "",
    }, {
      body: {
        system: systemPrompt,
        model,
        historyTurns,
        customBaseUrl: customConfig?.baseUrl,
        customApiKey: customConfig?.apiKey,
        customModel: customConfig?.modelName,
        topP,
        temperature,
      }
    })
  }

  const getMessageText = (m: typeof messages[number]) => {
    if (m.parts) {
      return m.parts.filter(p => p.type === 'text').map(p => p.text).join('')
    }
    return JSON.stringify(m)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleResend = async (messageId: string, messageText: string) => {
    // Delete this message and all subsequent messages
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex >= 0) {
      setMessages(messages.slice(0, messageIndex))
    }

    await sendMessage({
      text: messageText,
    }, {
      body: {
        system: systemPrompt,
        model,
        historyTurns,
        customBaseUrl: customConfig?.baseUrl,
        customApiKey: customConfig?.apiKey,
        customModel: customConfig?.modelName,
        topP,
        temperature,
      }
    })
  }

  const handleEditUser = (messageId: string, messageText: string, setInput: (v: string) => void) => {
    // Put the message text in prompt input
    setInput(messageText)
    // Delete this message and all subsequent messages
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex >= 0) {
      setMessages(messages.slice(0, messageIndex))
    }
  }

  const handleEditAssistant = (messageId: string, messageText: string) => {
    setEditingMessageId(messageId)
    setEditingContent(messageText)
  }

  const handleSaveEdit = (messageId: string) => {
    setMessages(messages.map(m =>
      m.id === messageId
        ? { ...m, parts: [{ type: 'text' as const, text: editingContent }] }
        : m
    ))
    setEditingMessageId(null)
    setEditingContent("")
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditingContent("")
  }

  const handleRetry = async (messageId: string) => {
    // Find the assistant message index
    const assistantIndex = messages.findIndex(m => m.id === messageId)
    if (assistantIndex <= 0) return

    // Find the previous user message
    const userMessage = messages[assistantIndex - 1]
    if (!userMessage || userMessage.role !== 'user') return

    // Remove the assistant message and resend
    setMessages(messages.slice(0, assistantIndex - 1))

    await sendMessage({
      text: getMessageText(userMessage),
    }, {
      body: {
        system: systemPrompt,
        model,
        historyTurns,
        customBaseUrl: customConfig?.baseUrl,
        customApiKey: customConfig?.apiKey,
        customModel: customConfig?.modelName,
        topP,
        temperature,
      }
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <h2 className="text-sm font-medium">Chat</h2>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMessages([])}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Clear history"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <PromptInputProvider>
        <ChatContent
          messages={messages}
          status={status}
          getMessageText={getMessageText}
          handleCopy={handleCopy}
          handleResend={handleResend}
          handleEditUser={handleEditUser}
          handleEditAssistant={handleEditAssistant}
          handleSaveEdit={handleSaveEdit}
          handleCancelEdit={handleCancelEdit}
          handleRetry={handleRetry}
          editingMessageId={editingMessageId}
          editingContent={editingContent}
          setEditingContent={setEditingContent}
          historyTurns={historyTurns}
        />

        <div className="p-4">
          <PromptInput globalDrop multiple onSubmit={handleSubmit}>
            <PromptInputAttachments>
              {(attachment) => <PromptInputAttachment data={attachment} />}
            </PromptInputAttachments>
            <PromptInputBody>
              <PromptInputTextarea ref={textareaRef} placeholder="Type your message..." />
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
                  onOpenChange={setModelSelectorOpen}
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
                                  onModelChange?.(modelItem.id);
                                  setModelSelectorOpen(false);
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
              <PromptInputSubmit status={getSubmitStatus()} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </PromptInputProvider>
    </div>
  )
}

// Inner component that has access to usePromptInputController
interface ChatContentProps {
  messages: ReturnType<typeof useChat>['messages']
  status: ReturnType<typeof useChat>['status']
  getMessageText: (m: ReturnType<typeof useChat>['messages'][number]) => string
  handleCopy: (text: string) => void
  handleResend: (messageId: string, messageText: string) => void
  handleEditUser: (messageId: string, messageText: string, setInput: (v: string) => void) => void
  handleEditAssistant: (messageId: string, messageText: string) => void
  handleSaveEdit: (messageId: string) => void
  handleCancelEdit: () => void
  handleRetry: (messageId: string) => void
  editingMessageId: string | null
  editingContent: string
  setEditingContent: (content: string) => void
  historyTurns: number
}

function ChatContent({
  messages,
  status,
  getMessageText,
  handleCopy,
  handleResend,
  handleEditUser,
  handleEditAssistant,
  handleSaveEdit,
  handleCancelEdit,
  handleRetry,
  editingMessageId,
  editingContent,
  setEditingContent,
  historyTurns,
}: ChatContentProps) {
  const controller = usePromptInputController()
  const setInput = controller.textInput.setInput

  return (
    <Conversation className="flex-1">
      <ConversationContent className="size-full">
        {messages.length === 0 ? (
          <ConversationEmptyState
            description="Messages will appear here as the conversation progresses."
            icon={<MessageSquareIcon className="size-6" />}
            title="Start a conversation"
          />
        ) : (
          messages.map((message, index) => {
            const messageText = getMessageText(message)
            const isEditing = editingMessageId === message.id
            // Calculate if this message is the first one in the history window
            // historyTurns represents how many messages from the end are sent to AI
            const isOdd = messages.length % 2 === 1
            const historyStartIndex = messages.length - historyTurns * (isOdd ? 1 : 2)
            const showSeparator = historyStartIndex > 0 && historyTurns > 0 && messages.length > historyTurns && index === historyStartIndex

            return (
              <div key={message.id}>
                {showSeparator && (
                  <div className="flex items-center gap-2 my-4 px-2">
                    <Separator className="flex-1" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap bg-background px-2">
                      ↓ History sent to AI (last {historyTurns} turn messages)
                    </span>
                    <Separator className="flex-1" />
                  </div>
                )}
                <Message
                  from={message.role === 'user' ? 'user' : 'assistant'}
                >
                  <div className="flex flex-col gap-2">
                    <MessageContent>
                      {message.role === 'assistant' ? (
                        isEditing ? (
                          <div className="flex flex-col gap-2 w-full">
                            <textarea
                              cols={128}
                              rows={6}
                              className="w-full min-h-[100px] p-2 rounded-md border bg-background resize-y"
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleSaveEdit(message.id)}>
                                <CheckIcon className="h-4 w-4 mr-1" />
                                Save
                              </Button>
                              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <MessageResponse>{messageText}</MessageResponse>
                        )
                      ) : (
                        messageText
                      )}
                    </MessageContent>
                    {!isEditing && (
                      <MessageActions className={`text-gray-600 ${message.role === 'user' ? 'ml-auto' : 'mr-auto'}`}>
                        {message.role === 'user' ? (
                          <>
                            <MessageAction tooltip="Copy" onClick={() => handleCopy(messageText)}>
                              <CopyIcon className="h-4 w-4" />
                            </MessageAction>
                            <MessageAction tooltip="Resend" onClick={() => handleResend(message.id, messageText)}>
                              <RefreshCwIcon className="h-4 w-4" />
                            </MessageAction>
                            <MessageAction tooltip="Edit" onClick={() => handleEditUser(message.id, messageText, setInput)}>
                              <PencilIcon className="h-4 w-4" />
                            </MessageAction>
                          </>
                        ) : (
                          <>
                            <MessageAction tooltip="Copy" onClick={() => handleCopy(messageText)}>
                              <CopyIcon className="h-4 w-4" />
                            </MessageAction>
                            <MessageAction tooltip="Edit" onClick={() => handleEditAssistant(message.id, messageText)}>
                              <PencilIcon className="h-4 w-4" />
                            </MessageAction>
                            <MessageAction tooltip="Retry" onClick={() => handleRetry(message.id)}>
                              <RefreshCwIcon className="h-4 w-4" />
                            </MessageAction>
                          </>
                        )}
                      </MessageActions>
                    )}
                  </div>
                </Message>
              </div>
            )
          })
        )}
        {status === "submitted" && (
          <Message from="assistant">
            <MessageContent>
              <Shimmer>Thinking...</Shimmer>
            </MessageContent>
          </Message>
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  )
}
