import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, View } from 'react-native';

import { ChecklistTab } from '@/components/match/checklist-tab';
import { KnowTab } from '@/components/match/know-tab';
import { PrepTab } from '@/components/match/prep-tab';
import { ProfileTab } from '@/components/match/profile-tab';
import { Button, Screen, Segmented, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { deleteMatch, useMatch } from '@/lib/storage';

type Tab = 'profile' | 'know' | 'prep' | 'checklist';

const TABS: { key: Tab; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'know', label: 'Notes' },
  { key: 'prep', label: 'Prep' },
  { key: 'checklist', label: 'Checklist' },
];

function confirm(message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onConfirm();
    return;
  }
  Alert.alert(message, undefined, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { match, update } = useMatch(id);
  const [tab, setTab] = useState<Tab>('profile');

  if (match === undefined) {
    return (
      <Screen scroll={false}>
        <ActivityIndicator />
      </Screen>
    );
  }
  if (match === null) {
    return (
      <Screen>
        <T>This match no longer exists.</T>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: match.profile.name || 'Match' }} />
      <Segmented options={TABS} value={tab} onChange={setTab} />

      {tab === 'profile' ? <ProfileTab match={match} update={update} /> : null}
      {tab === 'know' ? <KnowTab match={match} update={update} onDone={() => setTab('prep')} /> : null}
      {tab === 'prep' ? <PrepTab match={match} update={update} /> : null}
      {tab === 'checklist' ? <ChecklistTab match={match} update={update} /> : null}

      <View style={{ marginTop: Spacing.five }}>
        <Button
          title="Delete match"
          variant="danger"
          onPress={() =>
            confirm(`Delete ${match.profile.name || 'this match'} and all notes?`, async () => {
              await deleteMatch(match.id);
              router.back();
            })
          }
        />
      </View>
    </Screen>
  );
}
