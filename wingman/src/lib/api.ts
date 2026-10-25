import type { ExtractRequest, Prep, PrepRequest, Profile } from './schemas';

// In development Expo serves the API routes from the dev server, so relative
// URLs work on web. Native builds need the deployed URL (EAS Hosting) in
// EXPO_PUBLIC_API_URL.
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const APP_KEY = process.env.EXPO_PUBLIC_WINGMAN_KEY ?? '';

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(APP_KEY ? { 'x-wingman-key': APP_KEY } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? `Request failed (${response.status})`);
  }
  return data as T;
}

export async function extractProfile(images: ExtractRequest['images']): Promise<Profile> {
  const { profile } = await post<{ profile: Profile }>('/api/extract-profile', { images });
  return profile;
}

export async function generatePrep(request: PrepRequest): Promise<Prep> {
  const { prep } = await post<{ prep: Prep }>('/api/generate-prep', request);
  return prep;
}
