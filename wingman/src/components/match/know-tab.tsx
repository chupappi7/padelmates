import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Field, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import type { DatePlan } from '@/lib/schemas';

import type { TabProps } from './types';

export function KnowTab({ match, update, onDone }: TabProps & { onDone: () => void }) {
  const [notes, setNotes] = useState(match.notes);
  const [chat, setChat] = useState(match.chat);
  const [date, setDate] = useState<DatePlan>(match.date);
  const [saving, setSaving] = useState(false);

  const setDateField = (key: keyof DatePlan) => (value: string) =>
    setDate((current) => ({ ...current, [key]: value }));

  return (
    <View style={{ gap: Spacing.four }}>
      <Field
        label="Everything you know about them"
        multiline
        value={notes}
        onChangeText={setNotes}
        placeholder="Has a sister in Berlin, just started a pottery class, hates coriander, mentioned a big work deadline this week…"
        hint="Anything from texts, mutual friends or their socials. More detail means better questions."
      />
      <Field
        label="Your chat so far"
        multiline
        value={chat}
        onChangeText={setChat}
        placeholder="Paste the conversation from the app"
      />

      <Card>
        <T variant="heading">The date</T>
        <Field label="When" value={date.when} onChangeText={setDateField('when')} placeholder="Friday 7pm" />
        <Field label="Where" value={date.where} onChangeText={setDateField('where')} placeholder="Bar Luce, Kreuzberg" />
        <Field
          label="What you are doing"
          value={date.activity}
          onChangeText={setDateField('activity')}
          placeholder="Drinks, then maybe food"
        />
        <Field
          label="What you want from it"
          multiline
          value={date.goals}
          onChangeText={setDateField('goals')}
          placeholder="See if there is chemistry, keep it relaxed, find out if they want something serious"
        />
      </Card>

      <Button
        title="Save and go to prep"
        loading={saving}
        onPress={async () => {
          setSaving(true);
          await update({ ...match, notes, chat, date });
          setSaving(false);
          onDone();
        }}
      />
    </View>
  );
}
