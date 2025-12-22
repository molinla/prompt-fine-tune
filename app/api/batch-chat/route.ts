import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText, ModelMessage } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages, model, system, customBaseUrl, customApiKey, customModel }: {
    messages: ModelMessage[],
    model: string,
    system: string,
    customBaseUrl?: string,
    customApiKey?: string,
    customModel?: string
  } = await req.json();

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
