import Storage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import type { AboutMe, DatePlan, Prep, Profile } from './schemas';

// Everything about matches stays on this device. Nothing is synced to a server;
// the API routes only see what is sent for a single extraction or generation.

export type ChecklistItem = { id: string; text: string; done: boolean };

export type Match = {
  id: string;
  createdAt: number;
  updatedAt: number;
  app: string;
  profile: Profile;
  notes: string;
  chat: string;
  date: DatePlan;
  prep: Prep | null;
  checklist: ChecklistItem[];
};

const MATCH_PREFIX = 'match:';
const ME_KEY = 'me';

export const emptyProfile = (): Profile => ({
  name: '',
  age: '',
  location: '',
  job: '',
  education: '',
  height: '',
  bio: '',
  prompts: [],
  interests: [],
  basics: [],
  photoDetails: [],
  conversationHooks: [],
});

export const emptyDate = (): DatePlan => ({ when: '', where: '', activity: '', goals: '' });

export const emptyMe = (): AboutMe => ({ name: '', about: '', interests: '', stories: '', nerves: '' });

export const DEFAULT_CHECKLIST = [
  'Confirm time and place the day before',
  'Check the route and leave 10 minutes early',
  'Phone charged, payment card on you',
  'Pick a backup spot nearby in case it is full',
  'Tell a friend where you are going',
  'Skim the prep and rescue lines once on the way',
];

export function newId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function checklistFrom(texts: string[]): ChecklistItem[] {
  return texts.map((text) => ({ id: newId(), text, done: false }));
}

export async function listMatches(): Promise<Match[]> {
  const keys = (await Storage.getAllKeys()).filter((key) => key.startsWith(MATCH_PREFIX));
  const entries = await Storage.multiGet(keys);
  return entries
    .map(([, value]) => value)
    .filter((value): value is string => value !== null)
    .map((value) => JSON.parse(value) as Match)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getMatch(id: string): Promise<Match | null> {
  const value = await Storage.getItem(MATCH_PREFIX + id);
  return value ? (JSON.parse(value) as Match) : null;
}

export async function saveMatch(match: Match): Promise<Match> {
  const saved = { ...match, updatedAt: Date.now() };
  await Storage.setItem(MATCH_PREFIX + match.id, JSON.stringify(saved));
  return saved;
}

export async function deleteMatch(id: string) {
  await Storage.removeItem(MATCH_PREFIX + id);
}

export async function getMe(): Promise<AboutMe> {
  const value = await Storage.getItem(ME_KEY);
  return value ? { ...emptyMe(), ...(JSON.parse(value) as AboutMe) } : emptyMe();
}

export async function saveMe(me: AboutMe) {
  await Storage.setItem(ME_KEY, JSON.stringify(me));
}

/** Loads a match whenever the screen gains focus, so edits on other screens show up. */
export function useMatch(id: string) {
  const [match, setMatch] = useState<Match | null | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getMatch(id).then((loaded) => active && setMatch(loaded));
      return () => {
        active = false;
      };
    }, [id]),
  );

  const update = useCallback(async (next: Match) => {
    setMatch(next);
    setMatch(await saveMatch(next));
  }, []);

  return { match, update };
}
