import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button, Field, Screen, T } from '@/components/ui';
import type { AboutMe } from '@/lib/schemas';
import { emptyMe, getMe, saveMe } from '@/lib/storage';

export default function MeScreen() {
  const [me, setMe] = useState<AboutMe>(emptyMe);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMe().then(setMe);
  }, []);

  const set = (key: keyof AboutMe) => (value: string) => setMe((current) => ({ ...current, [key]: value }));

  return (
    <Screen>
      <T variant="secondary">
        This is used to find common ground and suggest stories you can tell. It stays on your phone.
      </T>
      <Field label="Your first name" value={me.name} onChangeText={set('name')} />
      <Field
        label="About you"
        multiline
        value={me.about}
        onChangeText={set('about')}
        placeholder="Job, where you grew up, what a normal week looks like"
      />
      <Field
        label="Your interests"
        multiline
        value={me.interests}
        onChangeText={set('interests')}
        placeholder="Climbing, cooking Thai food, true crime podcasts"
      />
      <Field
        label="Stories you like telling"
        multiline
        value={me.stories}
        onChangeText={set('stories')}
        placeholder="That time you missed a flight and ended up in Porto"
      />
      <Field
        label="What makes you nervous on dates"
        multiline
        value={me.nerves}
        onChangeText={set('nerves')}
        placeholder="Silences, talking too much about work"
      />
      <Button
        title="Save"
        loading={saving}
        onPress={async () => {
          setSaving(true);
          await saveMe(me);
          setSaving(false);
          router.back();
        }}
      />
    </Screen>
  );
}
