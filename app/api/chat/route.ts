import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText, UIMessage, convertToModelMessages } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages = [], model = 'openai/gpt-4o-mini', system = '', historyTurns = 5 }: {
    messages: UIMessage[],
    model: string,
    system: string,
    historyTurns: number,
  } = await req.json();

  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });


  const result = streamText({
    model: openrouter.chat(model),
    system,
    messages: convertToModelMessages(messages.slice(-(historyTurns * 2 + 1))),
    temperature: 0,
    topP: 0,
  });

  return result.toUIMessageStreamResponse();
}
