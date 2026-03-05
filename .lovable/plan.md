## Problem

The `handle_new_user` database trigger extracts the name using `raw_user_meta_data->>'name'`, but Google OAuth stores the full name under `full_name` (not `name`). This results in an empty or email-based name in the profile.

## Fix

1. **Update the `handle_new_user` trigger** to check both `name` and `full_name` fields from Google metadata:

```sql
COALESCE(
  NEW.raw_user_meta_data->>'name',
  NEW.raw_user_meta_data->>'full_name',
  NEW.email
)
```

2. **Update the onboarding page** to also save the Google name to the profile during onboarding (as a fallback), since the trigger may have already fired with the wrong value. In `handleAboutSubmit`, include `name` from `user.user_metadata.name || user.user_metadata.full_name` in the profile update.
3. **Fix existing empty profiles** — for the current user, the onboarding submit should patch the name so it's corrected going forward.

## Files to change

- **Database migration**: Update `handle_new_user()` function with the corrected COALESCE
- `**src/pages/Auth/OnboardingPage.tsx**`: Include `name` in the first profile update call using the Google metadata name

&nbsp;

take pfp from google aswell as default

&nbsp;