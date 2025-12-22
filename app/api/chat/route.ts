import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, UIMessage, convertToModelMessages } from 'ai';

export const runtime = 'edge';

const normalizeHistoryTurns = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
  return Math.max(0, Math.floor(value));
};

const trimMessagesByTurns = (allMessages: UIMessage[], historyTurns: number) => {
  if (!allMessages.length) return [];

  // historyTurns = 0 时仅保留最后一条用户消息
  if (historyTurns <= 0) {
    for (let i = allMessages.length - 1; i >= 0; i -= 1) {
      if (allMessages[i].role === 'user') return [allMessages[i]];
    }
    return [];
  }

  let userCount = 0;
  let startIndex = 0;
  for (let i = allMessages.length - 1; i >= 0; i -= 1) {
    if (allMessages[i].role === 'user') {
      userCount += 1;
      if (userCount >= historyTurns) {
        startIndex = i;
        break;
      }
    }
  }

  if (userCount === 0) return [];
  return allMessages.slice(startIndex);
};

export async function POST(req: Request) {
  const { messages = [], model = 'openai/gpt-4o-mini', system = '', historyTurns = 1, customBaseUrl, customApiKey, customModel, customDifyBaseUrl, customDifyApiKey }: {
    messages: UIMessage[],
    model: string,
    system: string,
    historyTurns: number,
    customBaseUrl?: string,
    customApiKey?: string,
    customModel?: string,
    customDifyBaseUrl?: string,
    customDifyApiKey?: string
  } = await req.json();

  // Handle Dify API
  if (model === 'custom-dify' && customDifyBaseUrl && customDifyApiKey) {
    try {
      const safeHistoryTurns = normalizeHistoryTurns(historyTurns);
      const trimmedMessages = trimMessagesByTurns(messages, safeHistoryTurns);

      // Get the last user message
      const lastUserMessage = trimmedMessages.filter(m => m.role === 'user').pop();
      if (!lastUserMessage) {
        return new Response(JSON.stringify({ error: 'No user message found' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Extract text from message
      const query = lastUserMessage.parts?.filter(p => p.type === 'text').map(p => p.text).join('') || '';

      // Call Dify API
      const difyResponse = await fetch(`${customDifyBaseUrl}/chat-messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${customDifyApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: {},
          query,
          response_mode: 'streaming',
          user: 'default-user',
        }),
      });

      if (!difyResponse.ok) {
        throw new Error(`Dify API error: ${difyResponse.statusText}`);
      }

      // Stream the response
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          const reader = difyResponse.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          let buffer = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                if (buffer) {
                   // Process any remaining buffer if needed, though usually valid SSE ends with empty line
                }
                break;
              }

              // Decode with stream: true to handle multi-byte characters correctly across chunks
              const chunk = decoder.decode(value, { stream: true });
              buffer += chunk;

              const lines = buffer.split('\n');
              // Keep the last line in buffer as it might be incomplete
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine.startsWith('data:')) continue;

                const data = trimmedLine.replace(/^data:\s*/, '');
                if (data === '[DONE]') continue;

                try {
                  const json = JSON.parse(data);
                  if (json.event === 'agent_message' || json.event === 'message') {
                    // Format as AI SDK stream format
                    // IMPORTANT: JSON.stringify to properly escape special characters and quotes
                    const textContent = json.answer || '';
                    if (textContent) {
                         const streamData = `0:${JSON.stringify(textContent)}\n`;
                         controller.enqueue(encoder.encode(streamData));
                    }
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          } finally {
            reader.releaseLock();
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Vercel-AI-Data-Stream': 'v1',
        },
      });
    } catch (error: any) {
      console.error('Dify API Error:', error);
      return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Handle Custom OpenAI or OpenRouter
  let modelProvider;

  if (model === 'custom-openai' && customBaseUrl && customApiKey && customModel) {
    const openai = createOpenAI({
      baseURL: customBaseUrl,
      apiKey: customApiKey,
    });
    // 自定义 Base URL 多为 OpenAI 兼容的 Chat Completions 接口，优先走 chat 以避免流格式不匹配
    modelProvider = openai.chat(customModel);
  } else {
    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });
    modelProvider = openrouter.chat(model);
  }


  try {
    const safeHistoryTurns = normalizeHistoryTurns(historyTurns);
    const trimmedMessages = trimMessagesByTurns(messages, safeHistoryTurns);

    const result = streamText({
      model: modelProvider,
      system,
      messages: convertToModelMessages(trimmedMessages),
      temperature: 0,
      topP: 0,
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
