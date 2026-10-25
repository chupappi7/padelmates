import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Screen, Segmented, T } from '@/components/ui';
import { Radius, Spacing, useColors } from '@/constants/theme';
import { useMatch } from '@/lib/storage';

type Deck = 'rescue' | 'questions' | 'playful';

const DECKS: { key: Deck; label: string }[] = [
  { key: 'rescue', label: 'Rescue' },
  { key: 'questions', label: 'Questions' },
  { key: 'playful', label: 'Playful' },
];

type CardItem = { caption: string; line: string };

/** One big line at a time, for a quick glance during the date. */
export default function PocketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { match } = useMatch(id);
  const colors = useColors();
  const [deck, setDeck] = useState<Deck>('rescue');
  const [index, setIndex] = useState(0);

  const cards = useMemo<CardItem[]>(() => {
    const prep = match?.prep;
    if (!prep) return [];
    if (deck === 'rescue') return prep.rescueLines.map((r) => ({ caption: r.situation, line: r.line }));
    if (deck === 'playful') return prep.playfulLines.map((line) => ({ caption: 'Playful', line }));
    return prep.topics.flatMap((topic) =>
      [...topic.questions, ...topic.followUps].map((line) => ({ caption: topic.topic, line })),
    );
  }, [match, deck]);

  if (!match?.prep) {
    return (
      <Screen>
        <T>Generate prep first.</T>
      </Screen>
    );
  }

  const card = cards.length ? cards[index % cards.length] : null;

  return (
    <Screen scroll={false}>
      <Segmented
        options={DECKS}
        value={deck}
        onChange={(next) => {
          setDeck(next);
          setIndex(0);
        }}
      />
      <Pressable
        onPress={() => setIndex((i) => i + 1)}
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {card ? (
          <>
            <T variant="label">{card.caption}</T>
            <T style={styles.line}>{card.line}</T>
          </>
        ) : (
          <T variant="secondary">Nothing in this deck.</T>
        )}
      </Pressable>
      <View style={{ gap: Spacing.two }}>
        <T variant="secondary" style={{ textAlign: 'center' }}>
          {cards.length ? `${(index % cards.length) + 1} of ${cards.length} · tap the card for the next one` : ''}
        </T>
        <Button
          title="Shuffle"
          variant="secondary"
          onPress={() => setIndex(Math.floor(Math.random() * Math.max(cards.length, 1)))}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.large,
    padding: Spacing.five,
    justifyContent: 'center',
    gap: Spacing.four,
  },
  line: { fontSize: 26, lineHeight: 34, fontWeight: '600' },
});
