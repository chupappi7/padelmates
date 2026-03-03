

# Refresh "Join PadelMates today" Subtitle

## Problem
The "Join PadelMates today" subtitle text on the Sign Up page looks plain and boring -- it's just flat muted gray text with no visual flair.

## Solution
Make the subtitle more engaging by highlighting the brand name within it, matching the same "Padel + Mates" color treatment used in the logo text above. This creates visual cohesion and makes the subtitle feel intentional rather than generic.

### Change
In `src/pages/Auth/SignupPage.tsx`, update the subtitle from:

```text
<p class="text-center text-[#94A3B8] mb-8">Join PadelMates today</p>
```

to:

```text
<p class="text-center text-[#94A3B8] mb-8">
  Join <span class="text-white font-semibold">Padel</span><span class="text-primary font-semibold">Mates</span> today
</p>
```

This makes "PadelMates" pop with the same white + teal treatment as the logo wordmark, while "Join" and "today" stay in the muted gray. One line change, no new dependencies.
