

# Generate PadelMates Logo and Integrate

## Overview
Use the Lovable AI image generation to create a modern PadelMates logo, then integrate it as the app icon (favicon) and navbar/footer logo.

## Steps

### 1. Generate logo via backend function
Create an edge function `generate-logo` that calls the Gemini image model with the user's detailed brief. Generate three variants:
- Square app icon on white background
- Square app icon on dark background
- Horizontal logo with wordmark

### 2. Store generated images
Upload the generated images to a `branding` storage bucket so they persist and can be referenced by URL.

### 3. Update the app to use the new logo
- **`index.html`**: Replace the default favicon with the new app icon
- **`src/components/layout/Navbar.tsx`**: Replace the emoji `🎾` square with an `<img>` tag pointing to the new logo
- **`src/pages/LandingPage.tsx`**: Replace the emoji in the footer and hero badge with the logo image

### 4. Storage bucket setup
Create a `branding` public bucket (no RLS needed -- public assets) via migration to store the logo files.

## Technical Details

- **Edge function**: `supabase/functions/generate-logo/index.ts` -- calls `google/gemini-2.5-flash-image` with the user's style brief, uploads result to storage, returns public URL
- **Model**: `google/gemini-2.5-flash-image` for the initial generation (fast). Can retry with `google/gemini-3-pro-image-preview` if quality is insufficient.
- **Storage bucket**: `branding` (public, no auth required for reads)
- **Files modified**: `index.html`, `Navbar.tsx`, `LandingPage.tsx`
- **Files created**: `supabase/functions/generate-logo/index.ts`

## Prompt Strategy
The image generation prompt will be crafted from the user's brief: minimal, sporty-but-friendly, abstract padel racket/ball, two connected shapes for "mates", deep green or electric blue primary, clean sans-serif typography, works at 64x64.

