

## Add Password Strength Requirements (No Special Character)

### What Changes
Add real-time password validation feedback on the signup form. The "Continue" button stays disabled until all rules pass.

### Password Rules
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

### Implementation

**1. Create `src/components/auth/PasswordRequirements.tsx`**
- Accepts `password` string prop
- Renders a compact checklist below the password input
- Each rule shows a green check icon when met, gray dot when not
- Exports an `isPasswordValid(password: string): boolean` helper

**2. Update `src/pages/Auth/SignupPage.tsx`**
- Import `PasswordRequirements` and `isPasswordValid`
- Render the component below the password input field
- Change `minLength` from 6 to 8
- Disable "Continue" button when `!isPasswordValid(password)` (in addition to existing `loading` check)

### Validation Logic
```text
password.length >= 8        -- 8+ characters
/[A-Z]/.test(password)      -- uppercase letter
/[a-z]/.test(password)      -- lowercase letter
/[0-9]/.test(password)      -- at least one number
```

No special character requirement per user request.

