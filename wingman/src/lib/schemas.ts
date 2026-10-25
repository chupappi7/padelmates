import * as z from 'zod';

// Shared between the app and the API routes: the API asks Claude for output in
// these shapes, and the app stores and renders them.

export const ProfileSchema = z.object({
  name: z.string().describe('First name as shown on the profile, or empty if not visible'),
  age: z.string().describe('Age as shown, or empty'),
  location: z.string().describe('City, neighbourhood or distance, or empty'),
  job: z.string().describe('Job title and/or employer, or empty'),
  education: z.string().describe('School or degree, or empty'),
  height: z.string().describe('Height, or empty'),
  bio: z.string().describe('The free-text bio, copied verbatim, or empty'),
  prompts: z
    .array(z.object({ prompt: z.string(), answer: z.string() }))
    .describe('Profile prompts and their answers, copied verbatim (e.g. Hinge prompts)'),
  interests: z.array(z.string()).describe('Listed interests, hobbies, passions or tags'),
  basics: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .describe(
      'Other listed facts such as star sign, drinking, smoking, kids, religion, politics, pets, languages, looking for',
    ),
  photoDetails: z
    .array(z.string())
    .describe(
      'Concrete, conversation-worthy details visible in the photos: places, activities, pets, sports, travel, events. No comments on appearance or body.',
    ),
  conversationHooks: z
    .array(z.string())
    .describe('The most promising specific things on this profile to ask about or bond over'),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const PrepSchema = z.object({
  summary: z.string().describe('Two or three sentences on who this person seems to be and what they care about'),
  commonGround: z.array(z.string()).describe('Shared interests or experiences between the user and their date'),
  openers: z.array(z.string()).describe('Natural first lines for the first few minutes of the date'),
  topics: z
    .array(
      z.object({
        topic: z.string().describe('Short topic name, e.g. "Her trip to Lisbon"'),
        why: z.string().describe('Why this topic is a good bet for this person, in one sentence'),
        questions: z.array(z.string()).describe('Open questions on this topic, specific to this person'),
        followUps: z.array(z.string()).describe('Follow-up questions to go deeper once they answer'),
      }),
    )
    .describe('Conversation topics, best first'),
  stories: z
    .array(z.object({ cue: z.string(), story: z.string() }))
    .describe(
      'Short things about the user worth sharing, each with the moment it fits. Built from what the user told you about themselves; never invent facts about the user.',
    ),
  rescueLines: z
    .array(z.object({ situation: z.string(), line: z.string() }))
    .describe('Backup lines for when the conversation stalls or gets awkward, each with the situation it fits'),
  playfulLines: z.array(z.string()).describe('Light teasing or playful questions that suit this person'),
  compliments: z
    .array(z.string())
    .describe('Genuine, specific compliments about personality, choices or taste, not looks'),
  avoid: z.array(z.string()).describe('Topics or behaviours to avoid with this person, with a short reason'),
  checklist: z
    .array(z.string())
    .describe('Practical prep for this specific date: logistics, what to wear, backup plan, timing'),
  followUpText: z.string().describe('A short message to send after the date if it went well'),
});
export type Prep = z.infer<typeof PrepSchema>;

export type ImageInput = {
  base64: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
};

export type ExtractRequest = { images: ImageInput[] };

export type PrepRequest = {
  profile: Profile;
  notes: string;
  chat: string;
  date: DatePlan;
  me: AboutMe;
};

export type DatePlan = {
  when: string;
  where: string;
  activity: string;
  goals: string;
};

export type AboutMe = {
  name: string;
  about: string;
  interests: string;
  stories: string;
  nerves: string;
};
