import { createOpenAI } from '@ai-sdk/openai';
import { generateText, ModelMessage } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages, model, system }: {
    messages: ModelMessage[],
    model: string,
    system: string,
  } = await req.json();

  const openai = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
  });


  const { text } = await generateText({
    model: openai(model || 'openai/gpt-4o-mini'),
    system,
    messages,
    temperature: 0,
    topP: 0,
  });

  return Response.json({ text });
}
