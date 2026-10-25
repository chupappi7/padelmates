import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Card, Screen, T } from '@/components/ui';
import { Spacing, useColors } from '@/constants/theme';
import { listMatches, type Match } from '@/lib/storage';

export default function HomeScreen() {
  const colors = useColors();
  const [matches, setMatches] = useState<Match[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      listMatches().then(setMatches);
    }, []),
  );

  return (
    <Screen>
      <View style={{ gap: Spacing.one }}>
        <T variant="title">Your dates</T>
        <T variant="secondary">
          Import a match&apos;s profile, add what you know, and walk in with things to talk about.
        </T>
      </View>

      <Button title="New match" onPress={() => router.push('/match/new')} />

      {matches?.length === 0 ? (
        <Card>
          <T variant="heading">No matches yet</T>
          <T variant="secondary">
            Take screenshots of their dating profile, then tap New match to import them.
          </T>
        </Card>
      ) : null}

      {matches?.map((match) => (
        <Link key={match.id} href={{ pathname: '/match/[id]', params: { id: match.id } }} asChild>
          <Pressable>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two }}>
                <T variant="heading" style={{ flexShrink: 1 }}>
                  {[match.profile.name || 'Unnamed match', match.profile.age].filter(Boolean).join(', ')}
                </T>
                {match.app ? <T variant="label">{match.app}</T> : null}
              </View>
              {match.date.when || match.date.where ? (
                <T variant="secondary">
                  {[match.date.when, match.date.where].filter(Boolean).join(' · ')}
                </T>
              ) : null}
              <T variant="secondary" style={{ color: match.prep ? colors.success : colors.textSecondary }}>
                {match.prep ? 'Prep ready' : 'No prep yet'}
              </T>
            </Card>
          </Pressable>
        </Link>
      ))}

      <Button title="About me" variant="secondary" onPress={() => router.push('/me')} />
    </Screen>
  );
}
