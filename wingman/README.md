# Wingman

Prepare for a date so the conversation never dies. SwiftUI app plus a
Cloudflare Worker that holds the Claude key, the same setup as Konvo.

1. **Import their profile.** Pick screenshots of their dating profile and
   Claude reads them: name, prompts, bio, interests, basics, conversation-worthy
   photo details, things worth asking about.
2. **Add what you know.** Notes, your chat so far, and the date plan.
3. **Get prepped.** Openers, topics with questions and follow-ups, stories to
   share, rescue lines for silences, playful lines, compliments, things to
   avoid, a post-date text, and a checklist.
4. **Pocket card.** During the date, one big line at a time.

Matches live on the phone in SwiftData. The worker stores nothing.

Screenshots instead of scraping: dating apps have no public API, and scraping
needs your login and breaks their terms.

## Backend

```sh
cd Backend
npm install
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler deploy
```

Optional: `npx wrangler secret put APP_KEY` and the same value as
`WINGMAN_APP_KEY` in the app config. The worker also rate-limits per IP and uses
smart placement so calls from Vietnam do not leave from Hong Kong.

Local: put `ANTHROPIC_API_KEY=...` in `Backend/.dev.vars`, run `npx wrangler dev`.

## App

```sh
cp Config/Secrets.example.xcconfig Config/Secrets.xcconfig   # set WINGMAN_WORKER_URL
xcodegen generate
open Wingman.xcodeproj
```

Pick your team under Signing & Capabilities and run on your iPhone.
`Wingman.xcodeproj` is generated and not in git.
