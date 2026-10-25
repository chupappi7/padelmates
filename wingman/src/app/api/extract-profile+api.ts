import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type Anthropic from '@anthropic-ai/sdk';

import { checkAppKey, errorResponse, FALLBACK, getClient, MODEL } from '@/lib/claude';
import { type ExtractRequest, ProfileSchema } from '@/lib/schemas';

const MAX_IMAGES = 10;

const SYSTEM = `You read screenshots of a dating app profile (Hinge, Tinder, Bumble, Raya or similar) and extract what the profile says, so the user can prepare for a date with this person.

Copy text verbatim. Merge information that appears across several screenshots into one profile. Leave a field empty rather than guessing. For photos, note only concrete details that could start a conversation (a place, an activity, a pet, an event); never comment on someone's body or attractiveness.`;

export async function POST(request: Request) {
  const unauthorized = checkAppKey(request);
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as ExtractRequest;
  const images = body.images ?? [];
  if (images.length === 0) {
    return Response.json({ error: 'Add at least one screenshot.' }, { status: 400 });
  }
  if (images.length > MAX_IMAGES) {
    return Response.json({ error: `Use at most ${MAX_IMAGES} screenshots.` }, { status: 400 });
  }

  const content: Anthropic.Beta.BetaContentBlockParam[] = images.map((image) => ({
    type: 'image',
    source: { type: 'base64', media_type: image.mediaType, data: image.base64 },
  }));
  content.push({ type: 'text', text: 'Extract this dating profile.' });

  try {
    const response = await getClient().beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      ...FALLBACK,
      system: SYSTEM,
      output_config: { effort: 'low', format: betaZodOutputFormat(ProfileSchema) },
      messages: [{ role: 'user', content }],
    });

    if (response.stop_reason === 'refusal') {
      return Response.json({ error: 'Claude could not read these screenshots.' }, { status: 422 });
    }
    if (!response.parsed_output) {
      return Response.json({ error: 'Could not read the profile, try clearer screenshots.' }, { status: 502 });
    }
    return Response.json({ profile: response.parsed_output });
  } catch (error) {
    return errorResponse(error);
  }
}
