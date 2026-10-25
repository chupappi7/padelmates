# Wingman

Prepare for a date so the conversation never dies.

1. **Import their profile.** Screenshot their dating profile (Hinge, Tinder, Bumble…) and Wingman reads it with Claude: name, prompts, bio, interests, basics, conversation-worthy photo details.
2. **Add what you know.** Notes from texts or friends, your chat so far, and the date plan (when, where, what you want from it).
3. **Get prepped.** Openers, topics with questions and follow-ups, stories to share about yourself, rescue lines for awkward silences, playful lines, genuine compliments, things to avoid, a post-date text, and a date checklist.
4. **Pocket card.** During the date, one big line at a time: rescue lines, questions or playful lines.

Your matches are stored only on your phone. The server only sees screenshots or notes while it generates a result, and stores nothing.

## Why screenshots instead of scraping

Dating apps have no public API. Scraping them means logging in with your account and breaks their terms, which can get you banned. Screenshots work with every app and don't break.

## Stack

- Expo SDK 58, Expo Router, TypeScript
- Expo Router API routes (`src/app/api/*+api.ts`) call the Claude API, so the API key stays on the server
- `@react-native-async-storage/async-storage` for on-device storage
- Claude `claude-opus-5-5` with structured outputs (Zod schemas in `src/lib/schemas.ts`)

```
src/
  app/
    index.tsx                 your dates
    me.tsx                    about you (used for common ground and stories)
    match/new.tsx             import screenshots
    match/[id]/index.tsx      profile / notes / prep / checklist
    match/[id]/pocket.tsx     pocket card for during the date
    api/extract-profile+api.ts
    api/generate-prep+api.ts
  components/                 UI kit and match tabs
  lib/                        schemas, storage, API client, Claude client
```

## Run locally

```bash
npm install
cp .env.example .env        # add your ANTHROPIC_API_KEY
npx expo start --web        # web, API routes served by the dev server
```

For your phone, the app needs a reachable API: deploy it (below) and set `EXPO_PUBLIC_API_URL` to the deployed URL, then `npx expo start` and open it in Expo Go.

## Deploy the API (EAS Hosting)

```bash
npx expo export --platform web
npx eas-cli@latest deploy --prod
npx eas-cli@latest env:create --name ANTHROPIC_API_KEY --value sk-ant-... --environment production --visibility secret
```

Set `WINGMAN_APP_KEY` on the server and `EXPO_PUBLIC_WINGMAN_KEY` in the app to the same value so random visitors can't spend your Claude credits. It ships inside the app, so it's a speed bump, not real auth; add sign-in before a public launch.

## Checks

```bash
npx tsc --noEmit
npx eslint .
```
