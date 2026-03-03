

# Modernize Auth Page Backgrounds

## What changes

Replace the plain flat `#0D1F1E` background on Sign In and Sign Up with a more visually interesting, modern background -- using only the existing primary color `#14b8a6` (teal). No new colors introduced.

## Approach: Gradient mesh + subtle animated glow orbs

The background will combine:

1. **Radial gradient mesh** -- two or three soft, large radial gradients using `#14b8a6` at very low opacity (5-15%) layered on top of the `#0D1F1E` base. This creates depth and visual interest without being distracting.

2. **Animated glow orbs** -- two CSS-only blurred circles (using the primary teal at ~10% opacity, ~300-400px diameter) that slowly float/drift using the existing `float` keyframe animation. Positioned at top-right and bottom-left to frame the form content.

3. **Subtle grid or noise texture** (optional, CSS-only) -- a faint dot grid pattern using a tiny radial-gradient repeating pattern at ~3% opacity for a "tech/modern" feel.

## Files to edit

### `src/pages/Auth/LoginPage.tsx`
- Replace the outer `div` plain background with layered CSS gradients
- Add two decorative `div` elements (absolute positioned, blurred, animated) as glow orbs behind the form
- Wrap content in `relative z-10` to sit above the orbs
- Keep logo, form, and all functionality exactly as-is

### `src/pages/Auth/SignupPage.tsx`
- Same background treatment as LoginPage for visual consistency
- All three steps (account, about, skill) retain their current design and behavior

## Technical details

Background container will use inline styles or Tailwind for:

```text
Base layer:     background-color: #0D1F1E
Gradient layer: radial-gradient(ellipse at 20% 50%, rgba(20,184,166,0.12) 0%, transparent 60%),
                radial-gradient(ellipse at 80% 20%, rgba(20,184,166,0.08) 0%, transparent 50%)
```

Glow orbs (2 divs):
```text
- absolute positioned, w-72 h-72 to w-96 h-96
- rounded-full, blur-3xl
- bg-primary/10 (teal at 10% opacity)
- animate-float with different animation-delay for staggered movement
- pointer-events-none so they don't interfere with interactions
```

No new dependencies. Uses existing Tailwind classes, existing keyframes, and existing primary color only.

