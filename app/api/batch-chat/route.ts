import { createOpenAI } from '@ai-sdk/openai';
import { generateText, ModelMessage } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages, model = 'openai/gpt-4o-mini', system, customBaseUrl, customApiKey, customModel, topP = 0, temperature = 0 }: {
    messages: ModelMessage[],
    model: string,
    system: string,
    customBaseUrl?: string,
    customApiKey?: string,
    customModel?: string,
    topP?: number,
    temperature?: number
  } = await req.json();

  const openai = createOpenAI({
    baseURL: customBaseUrl || 'https://openrouter.ai/api/v1',
    apiKey: customApiKey || process.env.OPENROUTER_API_KEY,
  });

  const modelProvider = openai.chat(customModel || model);

  try {
    const { text } = await generateText({
      model: modelProvider,
      system,
      messages,
      temperature,
      topP,
    });

    return Response.json({ text });
  } catch (error: any) {
    console.error('Batch Chat API Error:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
