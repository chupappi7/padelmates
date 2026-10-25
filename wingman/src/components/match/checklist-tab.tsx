import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Field, T } from '@/components/ui';
import { Spacing, useColors } from '@/constants/theme';
import { newId } from '@/lib/storage';

import type { TabProps } from './types';

export function ChecklistTab({ match, update }: TabProps) {
  const colors = useColors();
  const [text, setText] = useState('');
  const done = match.checklist.filter((item) => item.done).length;

  const toggle = (id: string) =>
    update({
      ...match,
      checklist: match.checklist.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
    });

  const remove = (id: string) => update({ ...match, checklist: match.checklist.filter((item) => item.id !== id) });

  const add = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    update({ ...match, checklist: [...match.checklist, { id: newId(), text: trimmed, done: false }] });
    setText('');
  };

  return (
    <View style={{ gap: Spacing.four }}>
      <T variant="secondary">
        {done} of {match.checklist.length} done. Long-press an item to remove it.
      </T>
      <Card style={{ gap: 0, paddingVertical: Spacing.two }}>
        {match.checklist.map((item, index) => (
          <Pressable
            key={item.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: item.done }}
            onPress={() => toggle(item.id)}
            onLongPress={() => remove(item.id)}
            style={[
              styles.row,
              index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
            ]}>
            <View
              style={[
                styles.box,
                { borderColor: item.done ? colors.success : colors.border },
                item.done && { backgroundColor: colors.success },
              ]}>
              {item.done ? <T style={{ color: '#fff', fontSize: 14, lineHeight: 18 }}>✓</T> : null}
            </View>
            <T
              style={[
                { flex: 1 },
                item.done && { textDecorationLine: 'line-through', color: colors.textSecondary },
              ]}>
              {item.text}
            </T>
          </Pressable>
        ))}
      </Card>
      <Field label="Add an item" value={text} onChangeText={setText} onSubmitEditing={add} returnKeyType="done" />
      <Button title="Add" variant="secondary" onPress={add} disabled={!text.trim()} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
