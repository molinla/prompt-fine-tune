import { createOpenAI } from '@ai-sdk/openai';
import { streamText, UIMessage, convertToModelMessages } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages, model, system }: {
    messages: UIMessage[],
    model: string,
    system: string,
  } = await req.json();

  const openai = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
  });
  console.log(messages)
  const result = streamText({
    model: openai(model || 'openai/gpt-4o-mini'),
    system: system,
    messages: convertToModelMessages(messages),
    temperature: 0,
    topP: 0,
  });

  return result.toUIMessageStreamResponse();
}
