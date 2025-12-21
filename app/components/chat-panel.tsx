import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useChat } from "@ai-sdk/react"
import {
  MessageSquareIcon,
  Send,
  StopCircle,
  Trash2,
} from "lucide-react"
import { useState } from "react"

interface ChatPanelProps {
  systemPrompt: string
  model: string
  historyTurns: number
}

export function ChatPanel({ systemPrompt, model, historyTurns }: ChatPanelProps) {
  const { messages, sendMessage, stop, status, setMessages } = useChat()

  const [input, setInput] = useState("")

  const customSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input) return

    const currentInput = input
    setInput("")

    await sendMessage({
      text: currentInput,
    }, {
      body: {
        system: systemPrompt,
        model,
        historyTurns,
      }
    })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      customSubmit()
    }
  }

  const getMessageText = (m: typeof messages[number]) => {
    if (m.parts) {
      return m.parts.filter(p => p.type === 'text').map(p => p.text).join('')
    }
    return JSON.stringify(m)
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
      <Conversation className="flex-1">
        <ConversationContent className="size-full">
          {messages.length === 0 ? (
            <ConversationEmptyState
              description="Messages will appear here as the conversation progresses."
              icon={<MessageSquareIcon className="size-6" />}
              title="Start a conversation"
            />
          ) : (
            messages.map((message) => {
              return (
                <Message
                  key={message.id}
                  from={message.role === 'user' ? 'user' : 'assistant'}
                >
                  <div className="flex flex-col gap-2">
                    <MessageContent>
                      {message.role === 'assistant' ? (
                        <MessageResponse>{getMessageText(message)}</MessageResponse>
                      ) : (
                        getMessageText(message)
                      )}
                    </MessageContent>
                  </div>
                </Message>
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

      <div className="p-4">
        <form onSubmit={customSubmit} className="relative">
          <Textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="min-h-[60px] pr-12 resize-none"
          />
          <Button
            type="submit"
            size="icon"
            variant="outline"
            disabled={!input && status !== "submitted"}
            className="absolute right-2 bottom-2"
          >
            {status === "submitted" ? (
              <StopCircle
                className="h-4 w-4"
                onClick={(e) => {
                  e.preventDefault()
                  stop()
                }}
              />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
