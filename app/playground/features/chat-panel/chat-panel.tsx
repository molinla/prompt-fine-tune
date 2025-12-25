"use client";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import { Message, MessageContent } from "@/components/ai-elements/message"
import {
  type PromptInputMessage,
  PromptInputProvider,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input"
import { Shimmer } from "@/components/ai-elements/shimmer"
import { useChat } from "@ai-sdk/react"
import { MessageSquareIcon } from "lucide-react"
import { useRef, useState } from "react"

import { ChatHeader } from "./components/chat-header"
import { ChatInput } from "./components/chat-input"
import { HistorySeparator } from "./components/history-separator"
import { MessageItem } from "./components/message-item"
import { usePromptConfig } from "../prompt-config"

export function ChatPanel() {
  const { systemPrompt, model, historyTurns, customConfig, setModel, topP, temperature } = usePromptConfig()
  const { messages, sendMessage, stop, status, setMessages } = useChat()
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState("")

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
      <ChatHeader
        hasMessages={messages.length > 0}
        onClearHistory={() => setMessages([])}
      />
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

        <ChatInput
          ref={textareaRef}
          model={model}
          modelSelectorOpen={modelSelectorOpen}
          onModelSelectorOpenChange={setModelSelectorOpen}
          onModelChange={setModel}
          onSubmit={handleSubmit}
          submitStatus={getSubmitStatus()}
        />
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
            // historyTurns represents how many turns (user + assistant pairs) sent to AI
            // When messages.length is odd (user sent, waiting for AI), include current user message
            const isOdd = messages.length % 2 === 1
            const historyMessageCount = historyTurns * 2 + (isOdd ? 1 : 0)
            const historyStartIndex = messages.length - historyMessageCount
            const showSeparator = historyStartIndex > 0 && historyTurns > 0 && index === historyStartIndex

            return (
              <div key={message.id}>
                {showSeparator && <HistorySeparator historyTurns={historyTurns} />}
                <MessageItem
                  role={message.role === 'user' ? 'user' : 'assistant'}
                  content={messageText}
                  isEditing={isEditing}
                  editingContent={editingContent}
                  onEditingContentChange={setEditingContent}
                  onSaveEdit={() => handleSaveEdit(message.id)}
                  onCancelEdit={handleCancelEdit}
                  onCopy={() => handleCopy(messageText)}
                  onEdit={() =>
                    message.role === 'user'
                      ? handleEditUser(message.id, messageText, setInput)
                      : handleEditAssistant(message.id, messageText)
                  }
                  onResendOrRetry={() =>
                    message.role === 'user'
                      ? handleResend(message.id, messageText)
                      : handleRetry(message.id)
                  }
                />
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
