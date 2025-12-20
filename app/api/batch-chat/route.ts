import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, ModelMessage } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages, model, system }: {
    messages: ModelMessage[],
    model: string,
    system: string,
  } = await req.json();

  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  console.log(messages);

  const { text } = await generateText({
    model: openrouter.chat(model || 'openai/gpt-4o-mini'),
    system,
    messages,
    temperature: 0,
    topP: 0,
  });

  return Response.json({ text });
}
