import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';

import { checkAppKey, errorResponse, FALLBACK, getClient, MODEL } from '@/lib/claude';
import { PrepSchema, type PrepRequest } from '@/lib/schemas';

const SYSTEM = `You are a warm, socially sharp friend helping someone prepare for a first or early date. You get their date's dating profile, everything the user knows about them, their chat so far, the date plan, and some things about the user.

Write prep that sounds like a real person talking, not a pickup script. Make every question and line specific to this person: reference their actual prompts, photos, job, interests and what they said in chat. Prefer open questions that invite stories over yes/no questions. Rescue lines should be easy to say out loud and recover a stalled conversation gracefully. Keep the tone respectful and genuine: no manipulation, negging or pressure tactics, and no compliments about bodies.

Only use facts about the user that they gave you. If something is unknown, leave it out rather than inventing it.`;

function section(title: string, value: string) {
  const trimmed = value.trim();
  return trimmed ? `<${title}>\n${trimmed}\n</${title}>` : '';
}

export async function POST(request: Request) {
  const unauthorized = checkAppKey(request);
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as PrepRequest;

  const prompt = [
    section('date_profile', JSON.stringify(body.profile, null, 2)),
    section('what_i_know_about_them', body.notes),
    section('our_chat_so_far', body.chat),
    section(
      'date_plan',
      [
        body.date.when && `When: ${body.date.when}`,
        body.date.where && `Where: ${body.date.where}`,
        body.date.activity && `Activity: ${body.date.activity}`,
        body.date.goals && `What I want from this date: ${body.date.goals}`,
      ]
        .filter(Boolean)
        .join('\n'),
    ),
    section(
      'about_me',
      [
        body.me.name && `Name: ${body.me.name}`,
        body.me.about && `About me: ${body.me.about}`,
        body.me.interests && `My interests: ${body.me.interests}`,
        body.me.stories && `Stories I like telling: ${body.me.stories}`,
        body.me.nerves && `What makes me nervous on dates: ${body.me.nerves}`,
      ]
        .filter(Boolean)
        .join('\n'),
    ),
    'Prepare me for this date so the conversation never dies. Give 6-8 topics, at least 10 rescue lines covering different situations, and a checklist for this specific date.',
  ]
    .filter(Boolean)
    .join('\n\n');

  try {
    const response = await getClient().beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      ...FALLBACK,
      system: SYSTEM,
      output_config: { effort: 'medium', format: betaZodOutputFormat(PrepSchema) },
      messages: [{ role: 'user', content: prompt }],
    });

    if (response.stop_reason === 'refusal') {
      return Response.json({ error: 'Claude declined to generate prep for this.' }, { status: 422 });
    }
    if (!response.parsed_output) {
      return Response.json({ error: 'Prep generation failed, try again.' }, { status: 502 });
    }
    return Response.json({ prep: response.parsed_output });
  } catch (error) {
    return errorResponse(error);
  }
}
