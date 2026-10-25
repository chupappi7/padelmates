import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Button, Card, ErrorText, Field, Screen, T } from '@/components/ui';
import { Radius, Spacing, useColors } from '@/constants/theme';
import { extractProfile } from '@/lib/api';
import { MAX_SCREENSHOTS, pickScreenshots, type PickedImage } from '@/lib/images';
import {
  checklistFrom,
  DEFAULT_CHECKLIST,
  emptyDate,
  emptyProfile,
  type Match,
  newId,
  saveMatch,
} from '@/lib/storage';

export default function NewMatchScreen() {
  const colors = useColors();
  const [app, setApp] = useState('');
  const [images, setImages] = useState<PickedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addImages() {
    const picked = await pickScreenshots(MAX_SCREENSHOTS - images.length);
    setImages((current) => [...current, ...picked].slice(0, MAX_SCREENSHOTS));
  }

  async function create(useScreenshots: boolean) {
    setError(null);
    setLoading(useScreenshots);
    try {
      const profile = useScreenshots ? await extractProfile(images) : emptyProfile();
      const now = Date.now();
      const match: Match = {
        id: newId(),
        createdAt: now,
        updatedAt: now,
        app: app.trim(),
        profile,
        notes: '',
        chat: '',
        date: emptyDate(),
        prep: null,
        checklist: checklistFrom(DEFAULT_CHECKLIST),
      };
      await saveMatch(match);
      router.replace({ pathname: '/match/[id]', params: { id: match.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Card>
        <T variant="heading">Screenshot their profile</T>
        <T variant="secondary">
          Open their profile in the dating app and screenshot every part of it: photos, prompts, bio
          and basics. Up to {MAX_SCREENSHOTS} screenshots.
        </T>
        {images.length > 0 ? (
          <ScrollView horizontal contentContainerStyle={{ gap: Spacing.two }}>
            {images.map((image, index) => (
              <Pressable
                key={image.uri + index}
                accessibilityLabel="Remove screenshot"
                onPress={() => setImages((current) => current.filter((_, i) => i !== index))}>
                <Image
                  source={{ uri: image.uri }}
                  style={{ width: 90, height: 180, borderRadius: Radius.small, backgroundColor: colors.border }}
                  contentFit="cover"
                />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        {images.length > 0 ? <T variant="secondary">Tap a screenshot to remove it.</T> : null}
        <Button
          title={images.length ? 'Add more screenshots' : 'Choose screenshots'}
          variant="secondary"
          onPress={addImages}
          disabled={images.length >= MAX_SCREENSHOTS}
        />
      </Card>

      <Field label="Which app? (optional)" value={app} onChangeText={setApp} placeholder="Hinge, Tinder, Bumble" />

      <View style={{ gap: Spacing.two }}>
        <ErrorText message={error} />
        <Button
          title={loading ? 'Reading profile…' : 'Read profile'}
          onPress={() => create(true)}
          loading={loading}
          disabled={images.length === 0}
        />
        <Button title="Skip, I will type it in" variant="secondary" onPress={() => create(false)} disabled={loading} />
      </View>
    </Screen>
  );
}
