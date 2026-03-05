

## Problem

Two issues with Google OAuth sign-in for returning users:

1. **No redirect after sign-in**: The `LoginPage` has no logic to detect that the user is already authenticated and redirect them away. For email login, `navigate("/games")` is called explicitly after `signIn()`. But for Google OAuth, the page reloads (due to OAuth redirect), and the user lands back on `/login` with an active session but no redirect logic.

2. **Onboarding check is overly aggressive**: The `sessionStorage` flag prevents the profile check on the same browser session, but the `checkedOAuthRef` resets on every page load. The real fix is: check the profile, and only redirect to onboarding if the profile is actually incomplete — otherwise redirect to `/games`.

## Fix

### 1. `src/pages/Auth/LoginPage.tsx`
Add a `useEffect` that checks if the user is already authenticated and redirects to `/games`:
```typescript
const { signIn, user, loading: authLoading } = useAuth();

useEffect(() => {
  if (!authLoading && user) {
    navigate("/games", { replace: true });
  }
}, [user, authLoading, navigate]);
```

### 2. `src/contexts/AuthContext.tsx`
Simplify the OAuth onboarding check: on `SIGNED_IN` event for OAuth users, always check the profile. If profile has `sex` and `region` filled, navigate to `/games`. If not, navigate to `/onboarding`. Remove the `sessionStorage` guard that was blocking subsequent sign-ins:

```typescript
if (event === "SIGNED_IN" && session?.user) {
  const provider = session.user.app_metadata?.provider;
  if (provider && provider !== "email") {
    setTimeout(async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("sex, region")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!profile || (!profile.sex && !profile.region)) {
        window.location.href = "/onboarding";
      }
      // If profile is complete, LoginPage's useEffect handles the redirect
    }, 500);
  }
}
```

## Files to change
- **`src/pages/Auth/LoginPage.tsx`**: Add auth-aware redirect in `useEffect`
- **`src/contexts/AuthContext.tsx`**: Simplify OAuth onboarding check to only redirect to onboarding when profile is truly incomplete

