import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText, UIMessage, convertToModelMessages } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages, model, system }: {
    messages: UIMessage[],
    model: string,
    system: string,
  } = await req.json();

  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });


  const result = streamText({
    model: openrouter.chat(model || 'openai/gpt-4o-mini'),
    system,
    messages: convertToModelMessages(messages),
    temperature: 0,
    topP: 0,
  });

  return result.toUIMessageStreamResponse();
}
