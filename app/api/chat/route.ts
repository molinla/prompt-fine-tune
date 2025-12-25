import { createOpenAI } from '@ai-sdk/openai';
import { streamText, UIMessage, convertToModelMessages } from 'ai';

export const runtime = 'edge';

const normalizeHistoryTurns = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
  return Math.max(0, Math.floor(value));
};

const trimMessagesByTurns = (allMessages: UIMessage[], historyTurns: number) => {
  if (!allMessages.length) return [];

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
  const { messages = [], model = 'openai/gpt-4o-mini', system = '', historyTurns = 1, customBaseUrl, customApiKey, customModel, topP = 0, temperature = 0 }: {
    messages: UIMessage[],
    model: string,
    system: string,
    historyTurns: number,
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
    const safeHistoryTurns = normalizeHistoryTurns(historyTurns);
    const trimmedMessages = trimMessagesByTurns(messages, safeHistoryTurns);

    const result = streamText({
      model: modelProvider,
      system,
      messages: convertToModelMessages(trimmedMessages),
      temperature,
      topP,
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
