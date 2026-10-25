import type { Match } from '@/lib/storage';

export type TabProps = {
  match: Match;
  update: (match: Match) => Promise<void>;
};
