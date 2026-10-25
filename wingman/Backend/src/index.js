import Anthropic from "@anthropic-ai/sdk";
import { betaJSONSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/beta/json-schema";

const MODEL = "claude-opus-5-5";
const MAX_IMAGES = 10;

// Server-side fallback reroutes a request the primary model declines.
const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // The worker URL ships in the app binary, so it is public in practice.
    // Limit per IP before anything costs money.
    if (env.RATE_LIMIT) {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      try {
        const { success } = await env.RATE_LIMIT.limit({ key: ip });
        if (!success) return json({ error: "Too many requests, slow down." }, 429);
      } catch (e) {
        console.log("rate limit check failed:", String(e).slice(0, 120));
      }
    }

    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    if (env.APP_KEY && request.headers.get("x-wingman-key") !== env.APP_KEY) {
      return json({ error: "Unauthorized" }, 401);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Body must be JSON" }, 400);
    }

    try {
      switch (url.pathname) {
        case "/api/extract-profile":
          return await extractProfile(body, env);
        case "/api/generate-prep":
          return await generatePrep(body, env);
        default:
          return json({ error: "Not found" }, 404);
      }
    } catch (error) {
      return errorResponse(error);
    }
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(error) {
  if (error instanceof Anthropic.RateLimitError) {
    return json({ error: "Too many requests, try again in a minute." }, 429);
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return json({ error: "Server API key is invalid." }, 500);
  }
  if (error instanceof Anthropic.APIError) {
    return json({ error: `Claude API error: ${error.message}` }, 502);
  }
  console.error("worker error:", error);
  return json({ error: error?.message || "Unknown error" }, 500);
}

function client(env) {
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

// Structured outputs need every property listed as required and no extras.
function object(properties) {
  return { type: "object", properties, required: Object.keys(properties), additionalProperties: false };
}
const str = (description) => ({ type: "string", description });
const list = (items, description) => ({ type: "array", items, description });

const PROFILE_SCHEMA = object({
  name: str("First name as shown, or empty"),
  age: str("Age as shown, or empty"),
  location: str("City, neighbourhood or distance, or empty"),
  job: str("Job title and/or employer, or empty"),
  education: str("School or degree, or empty"),
  height: str("Height, or empty"),
  bio: str("The free-text bio copied verbatim, or empty"),
  prompts: list(object({ prompt: str("The prompt"), answer: str("Their answer, verbatim") }), "Profile prompts and answers"),
  interests: list(str("Interest"), "Listed interests, hobbies, passions or tags"),
  basics: list(
    object({ label: str("e.g. Drinking"), value: str("e.g. Socially") }),
    "Other listed facts: star sign, drinking, smoking, kids, religion, politics, pets, languages, looking for",
  ),
  photoDetails: list(
    str("Detail"),
    "Concrete, conversation-worthy details visible in photos: places, activities, pets, events. Never appearance or body.",
  ),
  conversationHooks: list(str("Hook"), "The most promising specific things on this profile to ask about or bond over"),
});

const PREP_SCHEMA = object({
  summary: str("Two or three sentences on who this person seems to be and what they care about"),
  commonGround: list(str("Item"), "Shared interests or experiences between the user and their date"),
  openers: list(str("Line"), "Natural first lines for the first few minutes of the date"),
  topics: list(
    object({
      topic: str("Short topic name"),
      why: str("Why this topic suits this person, one sentence"),
      questions: list(str("Question"), "Open questions on this topic, specific to this person"),
      followUps: list(str("Question"), "Follow-up questions to go deeper"),
    }),
    "Conversation topics, best first",
  ),
  stories: list(
    object({ cue: str("When to tell it"), story: str("What to share") }),
    "Things about the user worth sharing. Only from what the user said about themselves.",
  ),
  rescueLines: list(
    object({ situation: str("e.g. Long silence"), line: str("What to say") }),
    "Backup lines for when the conversation stalls or gets awkward",
  ),
  playfulLines: list(str("Line"), "Light teasing or playful questions that suit this person"),
  compliments: list(str("Line"), "Genuine, specific compliments about personality, choices or taste, never looks"),
  avoid: list(str("Item"), "Topics or behaviours to avoid with this person, with a short reason"),
  checklist: list(str("Item"), "Practical prep for this specific date: logistics, what to wear, backup plan"),
  followUpText: str("A short message to send after the date if it went well"),
});

const EXTRACT_SYSTEM = `You read screenshots of a dating app profile (Hinge, Tinder, Bumble or similar) and extract what the profile says, so the user can prepare for a date with this person.

Copy text verbatim. Merge information that appears across several screenshots into one profile. Leave a field empty rather than guessing. For photos, note only concrete details that could start a conversation (a place, an activity, a pet, an event); never comment on someone's body or attractiveness.`;

const PREP_SYSTEM = `You are a warm, socially sharp friend helping someone prepare for a first or early date. You get their date's dating profile, everything the user knows about them, their chat so far, the date plan, and some things about the user.

Write prep that sounds like a real person talking, not a pickup script. Make every question and line specific to this person: reference their actual prompts, photos, job, interests and what they said in chat. Prefer open questions that invite stories over yes/no questions. Rescue lines should be easy to say out loud and recover a stalled conversation gracefully. Keep the tone respectful and genuine: no manipulation, negging or pressure tactics, and no compliments about bodies. Never use em dashes.

Only use facts about the user that they gave you. If something is unknown, leave it out rather than inventing it.`;

const MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function extractProfile(body, env) {
  const images = Array.isArray(body.images) ? body.images : [];
  if (images.length === 0) return json({ error: "Add at least one screenshot." }, 400);
  if (images.length > MAX_IMAGES) return json({ error: `Use at most ${MAX_IMAGES} screenshots.` }, 400);

  const content = images.map((image) => ({
    type: "image",
    source: {
      type: "base64",
      media_type: MEDIA_TYPES.has(image.mediaType) ? image.mediaType : "image/jpeg",
      data: image.base64,
    },
  }));
  content.push({ type: "text", text: "Extract this dating profile." });

  const response = await client(env).beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    system: EXTRACT_SYSTEM,
    output_config: { effort: "low", format: betaJSONSchemaOutputFormat(PROFILE_SCHEMA) },
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") {
    return json({ error: "Claude could not read these screenshots." }, 422);
  }
  if (!response.parsed_output) {
    return json({ error: "Could not read the profile, try clearer screenshots." }, 502);
  }
  return json({ profile: response.parsed_output });
}

function section(tag, value) {
  const trimmed = (value || "").trim();
  return trimmed ? `<${tag}>\n${trimmed}\n</${tag}>` : "";
}

function lines(pairs) {
  return pairs
    .filter(([, value]) => value && value.trim())
    .map(([label, value]) => `${label}: ${value.trim()}`)
    .join("\n");
}

async function generatePrep(body, env) {
  const date = body.date || {};
  const me = body.me || {};

  const prompt = [
    section("date_profile", JSON.stringify(body.profile || {}, null, 2)),
    section("what_i_know_about_them", body.notes),
    section("our_chat_so_far", body.chat),
    section(
      "date_plan",
      lines([
        ["When", date.when],
        ["Where", date.where],
        ["Activity", date.activity],
        ["What I want from this date", date.goals],
      ]),
    ),
    section(
      "about_me",
      lines([
        ["Name", me.name],
        ["About me", me.about],
        ["My interests", me.interests],
        ["Stories I like telling", me.stories],
        ["What makes me nervous on dates", me.nerves],
      ]),
    ),
    "Prepare me for this date so the conversation never dies. Give 6-8 topics, at least 10 rescue lines covering different situations, and a checklist for this specific date.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await client(env).beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    system: PREP_SYSTEM,
    output_config: { effort: "medium", format: betaJSONSchemaOutputFormat(PREP_SCHEMA) },
    messages: [{ role: "user", content: prompt }],
  });

  if (response.stop_reason === "refusal") {
    return json({ error: "Claude declined to generate prep for this." }, 422);
  }
  if (!response.parsed_output) {
    return json({ error: "Prep generation failed, try again." }, 502);
  }
  return json({ prep: response.parsed_output });
}
