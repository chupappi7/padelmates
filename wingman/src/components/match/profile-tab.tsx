import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Chips, ErrorText, Field, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { extractProfile } from '@/lib/api';
import { MAX_SCREENSHOTS, pickScreenshots } from '@/lib/images';
import type { Profile } from '@/lib/schemas';

import type { TabProps } from './types';

const lines = (items: string[]) => items.join('\n');
const fromLines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

export function ProfileTab({ match, update }: TabProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Profile>(match.profile);
  const [rescanning, setRescanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const profile = match.profile;

  const set = (key: keyof Profile) => (value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const setList = (key: 'interests' | 'photoDetails' | 'conversationHooks') => (value: string) =>
    setDraft((current) => ({ ...current, [key]: fromLines(value) }));

  async function rescan() {
    setError(null);
    const images = await pickScreenshots(MAX_SCREENSHOTS);
    if (images.length === 0) return;
    setRescanning(true);
    try {
      const next = await extractProfile(images);
      await update({ ...match, profile: next });
      setDraft(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read screenshots');
    } finally {
      setRescanning(false);
    }
  }

  if (editing) {
    return (
      <View style={{ gap: Spacing.three }}>
        <Field label="Name" value={draft.name} onChangeText={set('name')} />
        <Field label="Age" value={draft.age} onChangeText={set('age')} keyboardType="number-pad" />
        <Field label="Location" value={draft.location} onChangeText={set('location')} />
        <Field label="Job" value={draft.job} onChangeText={set('job')} />
        <Field label="Education" value={draft.education} onChangeText={set('education')} />
        <Field label="Bio" multiline value={draft.bio} onChangeText={set('bio')} />
        <Field
          label="Interests"
          hint="One per line"
          multiline
          defaultValue={lines(draft.interests)}
          onChangeText={setList('interests')}
        />
        <Field
          label="Details from photos"
          hint="One per line"
          multiline
          defaultValue={lines(draft.photoDetails)}
          onChangeText={setList('photoDetails')}
        />
        <Field
          label="Things to ask about"
          hint="One per line"
          multiline
          defaultValue={lines(draft.conversationHooks)}
          onChangeText={setList('conversationHooks')}
        />
        <Button
          title="Save profile"
          onPress={async () => {
            await update({ ...match, profile: draft });
            setEditing(false);
          }}
        />
        <Button
          title="Cancel"
          variant="secondary"
          onPress={() => {
            setDraft(match.profile);
            setEditing(false);
          }}
        />
      </View>
    );
  }

  const headline = [profile.age, profile.location].filter(Boolean).join(' · ');
  const work = [profile.job, profile.education].filter(Boolean).join(' · ');
  const isEmpty = !profile.name && !profile.bio && profile.prompts.length === 0 && profile.interests.length === 0;

  return (
    <View style={{ gap: Spacing.four }}>
      <Card>
        <T variant="title">{profile.name || 'Unnamed match'}</T>
        {headline ? <T variant="secondary">{headline}</T> : null}
        {work ? <T variant="secondary">{work}</T> : null}
        {isEmpty ? (
          <T variant="secondary">Nothing here yet. Edit the profile or read it from screenshots.</T>
        ) : null}
        {profile.bio ? <T>{profile.bio}</T> : null}
      </Card>

      {profile.prompts.map((prompt, index) => (
        <Card key={index}>
          <T variant="label">{prompt.prompt}</T>
          <T variant="heading" style={{ fontWeight: '500' }}>
            {prompt.answer}
          </T>
        </Card>
      ))}

      {profile.interests.length ? (
        <Card>
          <T variant="label">Interests</T>
          <Chips items={profile.interests} />
        </Card>
      ) : null}

      {profile.basics.length ? (
        <Card>
          <T variant="label">Basics</T>
          {profile.basics.map((basic, index) => (
            <T key={index}>
              <T style={{ fontWeight: '600' }}>{basic.label}: </T>
              {basic.value}
            </T>
          ))}
        </Card>
      ) : null}

      {profile.photoDetails.length ? (
        <Card>
          <T variant="label">From their photos</T>
          {profile.photoDetails.map((detail, index) => (
            <T key={index}>• {detail}</T>
          ))}
        </Card>
      ) : null}

      {profile.conversationHooks.length ? (
        <Card>
          <T variant="label">Worth asking about</T>
          {profile.conversationHooks.map((hook, index) => (
            <T key={index}>• {hook}</T>
          ))}
        </Card>
      ) : null}

      <ErrorText message={error} />
      <Button
        title="Edit profile"
        variant="secondary"
        onPress={() => {
          setDraft(match.profile);
          setEditing(true);
        }}
      />
      <Button
        title={rescanning ? 'Reading…' : 'Read again from screenshots'}
        variant="secondary"
        loading={rescanning}
        onPress={rescan}
      />
    </View>
  );
}
