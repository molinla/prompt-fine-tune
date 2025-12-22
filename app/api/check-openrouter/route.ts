export const runtime = 'edge';

export async function GET() {
  return Response.json({
    hasKey: !!process.env.OPENROUTER_API_KEY
  });
}
