import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Chips, CopyLine, ErrorText, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { generatePrep } from '@/lib/api';
import { checklistFrom, getMe } from '@/lib/storage';

import type { TabProps } from './types';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <T variant="heading">{title}</T>
      {children}
    </Card>
  );
}

export function PrepTab({ match, update }: TabProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prep = match.prep;

  async function generate() {
    setError(null);
    setLoading(true);
    try {
      const me = await getMe();
      const next = await generatePrep({
        profile: match.profile,
        notes: match.notes,
        chat: match.chat,
        date: match.date,
        me,
      });
      // Keep the user's own checklist items and ticks; add new suggestions.
      const existing = new Set(match.checklist.map((item) => item.text.toLowerCase()));
      const added = checklistFrom(next.checklist.filter((text) => !existing.has(text.toLowerCase())));
      await update({ ...match, prep: next, checklist: [...match.checklist, ...added] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate prep');
    } finally {
      setLoading(false);
    }
  }

  const generateButton = (
    <Button
      title={loading ? 'Preparing… (about a minute)' : prep ? 'Regenerate prep' : 'Generate prep'}
      variant={prep ? 'secondary' : 'primary'}
      loading={loading}
      onPress={generate}
    />
  );

  if (!prep) {
    return (
      <View style={{ gap: Spacing.four }}>
        <Card>
          <T variant="heading">Get ready for the date</T>
          <T variant="secondary">
            Wingman uses their profile, your notes, your chat and the date plan to write openers,
            questions with follow-ups, stories to tell, backup lines for awkward silences and a
            checklist. Fill in the Notes tab and About me first for the best results.
          </T>
        </Card>
        <ErrorText message={error} />
        {generateButton}
      </View>
    );
  }

  return (
    <View style={{ gap: Spacing.four }}>
      <Button
        title="Open pocket card"
        onPress={() => router.push({ pathname: '/match/[id]/pocket', params: { id: match.id } })}
      />

      <Section title="Who they are">
        <T>{prep.summary}</T>
        {prep.commonGround.length ? (
          <>
            <T variant="label">Common ground</T>
            <Chips items={prep.commonGround} />
          </>
        ) : null}
      </Section>

      <Section title="Openers">
        {prep.openers.map((line, index) => (
          <CopyLine key={index} text={line} />
        ))}
      </Section>

      {prep.topics.map((topic, index) => (
        <Section key={index} title={topic.topic}>
          <T variant="secondary">{topic.why}</T>
          {topic.questions.map((question, i) => (
            <CopyLine key={`q${i}`} text={question} />
          ))}
          {topic.followUps.length ? <T variant="label">Go deeper</T> : null}
          {topic.followUps.map((question, i) => (
            <CopyLine key={`f${i}`} text={question} />
          ))}
        </Section>
      ))}

      <Section title="If the conversation stalls">
        {prep.rescueLines.map((rescue, index) => (
          <CopyLine key={index} caption={rescue.situation} text={rescue.line} />
        ))}
      </Section>

      {prep.stories.length ? (
        <Section title="Things to share about you">
          {prep.stories.map((story, index) => (
            <CopyLine key={index} caption={story.cue} text={story.story} />
          ))}
        </Section>
      ) : null}

      <Section title="Playful">
        {prep.playfulLines.map((line, index) => (
          <CopyLine key={index} text={line} />
        ))}
      </Section>

      <Section title="Genuine compliments">
        {prep.compliments.map((line, index) => (
          <CopyLine key={index} text={line} />
        ))}
      </Section>

      <Section title="Avoid">
        {prep.avoid.map((line, index) => (
          <T key={index}>• {line}</T>
        ))}
      </Section>

      <Section title="Text after the date">
        <CopyLine text={prep.followUpText} />
      </Section>

      <ErrorText message={error} />
      {generateButton}
    </View>
  );
}
