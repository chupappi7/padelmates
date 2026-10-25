import Anthropic from '@anthropic-ai/sdk';

// Server-only: imported by API routes. ANTHROPIC_API_KEY is a server env var and
// never reaches the app bundle.

export const MODEL = 'claude-opus-5-5';

let client: Anthropic | undefined;

export function getClient() {
  client ??= new Anthropic();
  return client;
}

// Server-side fallback reroutes a request the primary model declines.
export const FALLBACK: Pick<Anthropic.Beta.MessageCreateParamsNonStreaming, 'betas' | 'fallbacks'> = {
  betas: ['server-side-fallback-2026-07-01'],
  fallbacks: 'default',
};

export function checkAppKey(request: Request): Response | null {
  const expected = process.env.WINGMAN_APP_KEY;
  if (expected && request.headers.get('x-wingman-key') !== expected) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export function errorResponse(error: unknown): Response {
  if (error instanceof Anthropic.RateLimitError) {
    return Response.json({ error: 'Too many requests, try again in a minute.' }, { status: 429 });
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return Response.json({ error: 'Server API key is invalid.' }, { status: 500 });
  }
  if (error instanceof Anthropic.APIError) {
    return Response.json({ error: `Claude API error: ${error.message}` }, { status: 502 });
  }
  const message = error instanceof Error ? error.message : 'Unknown error';
  return Response.json({ error: message }, { status: 500 });
}
