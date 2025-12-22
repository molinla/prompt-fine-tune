import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText, ModelMessage } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages, model, system, customBaseUrl, customApiKey, customModel, customDifyBaseUrl, customDifyApiKey }: {
    messages: ModelMessage[],
    model: string,
    system: string,
    customBaseUrl?: string,
    customApiKey?: string,
    customModel?: string,
    customDifyBaseUrl?: string,
    customDifyApiKey?: string
  } = await req.json();

  // Handle Dify API
  if (model === 'custom-dify' && customDifyBaseUrl && customDifyApiKey) {
    try {
      // Get the last user message
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      if (!lastUserMessage) {
        return Response.json({ error: 'No user message found' }, { status: 400 });
      }

      // Extract text from message content
      const query = typeof lastUserMessage.content === 'string'
        ? lastUserMessage.content
        : (Array.isArray(lastUserMessage.content)
            ? lastUserMessage.content.filter(p => p.type === 'text').map(p => p.text).join('')
            : '');
      const combinedQuery = [system, query].filter(Boolean).join('\n\n');

      // Call Dify API in blocking mode
      const difyResponse = await fetch(`${customDifyBaseUrl}/chat-messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${customDifyApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: {},
          query: combinedQuery,
          response_mode: 'blocking',
          user: 'default-user',
        }),
      });

      if (!difyResponse.ok) {
        throw new Error(`Dify API error: ${difyResponse.statusText}`);
      }

      const difyData = await difyResponse.json();
      const text = difyData.answer || '';

      return Response.json({ text });
    } catch (error: any) {
      console.error('Dify Batch API Error:', error);
      return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
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
    modelProvider = openrouter.chat(model || 'openai/gpt-4o-mini');
  }

  try {
    const { text } = await generateText({
      model: modelProvider,
      system,
      messages,
      temperature: 0,
      topP: 0,
    });

    return Response.json({ text });
  } catch (error: any) {
    console.error('Batch Chat API Error:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
