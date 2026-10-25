import * as Clipboard from 'expo-clipboard';
import { type ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type TextProps,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Spacing, useColors } from '@/constants/theme';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const colors = useColors();
  const inner = <View style={styles.content}>{children}</View>;
  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

type Variant = 'title' | 'heading' | 'body' | 'secondary' | 'label';

export function T({ variant = 'body', style, ...props }: TextProps & { variant?: Variant }) {
  const colors = useColors();
  const color = variant === 'secondary' || variant === 'label' ? colors.textSecondary : colors.text;
  return <Text {...props} style={[textStyles[variant], { color }, style]} />;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      {children}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
}) {
  const colors = useColors();
  const primary = variant === 'primary';
  const background = primary ? colors.accent : colors.card;
  const foreground = primary ? colors.accentText : variant === 'danger' ? colors.danger : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, borderColor: primary ? background : colors.border },
        (pressed || disabled) && { opacity: disabled ? 0.5 : 0.8 },
      ]}>
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <Text style={[styles.buttonText, { color: foreground }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  multiline,
  ...props
}: TextInputProps & { label: string; hint?: string }) {
  const colors = useColors();
  return (
    <View style={{ gap: Spacing.one }}>
      <T variant="label">{label}</T>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={colors.textSecondary}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          styles.input,
          multiline && styles.multiline,
          { color: colors.text, backgroundColor: colors.card, borderColor: colors.border },
        ]}
      />
      {hint ? <T variant="secondary" style={{ fontSize: 13 }}>{hint}</T> : null}
    </View>
  );
}

export function Chips({ items }: { items: string[] }) {
  const colors = useColors();
  if (items.length === 0) return null;
  return (
    <View style={styles.chips}>
      {items.map((item, index) => (
        <View key={`${item}-${index}`} style={[styles.chip, { backgroundColor: colors.accentSoft }]}>
          <Text style={{ color: colors.text, fontSize: 14 }}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function Segmented<K extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
}) {
  const colors = useColors();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.key)}
            style={[styles.segment, selected && { backgroundColor: colors.accent }]}>
            <Text
              style={{
                color: selected ? colors.accentText : colors.text,
                fontWeight: '600',
                fontSize: 14,
              }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A line of text with a tap-to-copy affordance, for questions and rescue lines. */
export function CopyLine({ text, caption }: { text: string; caption?: string }) {
  const colors = useColors();
  const [copied, setCopied] = useState(false);
  return (
    <Pressable
      onPress={async () => {
        await Clipboard.setStringAsync(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      style={[styles.copyLine, { borderColor: colors.border }]}>
      {caption ? <T variant="label">{caption}</T> : null}
      <T>{text}</T>
      {copied ? <T variant="secondary" style={{ fontSize: 12 }}>Copied</T> : null}
    </Pressable>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  const colors = useColors();
  if (!message) return null;
  return <Text style={{ color: colors.danger }}>{message}</Text>;
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.four,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.large,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  button: {
    minHeight: 48,
    borderRadius: Radius.medium,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  multiline: { minHeight: 110 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one + 2, borderRadius: 999 },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: Radius.medium,
    padding: Spacing.one,
    gap: Spacing.one,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.small,
  },
  copyLine: {
    borderLeftWidth: 3,
    paddingLeft: Spacing.three,
    paddingVertical: Spacing.one,
    gap: 2,
  },
});

const textStyles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700' },
  heading: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 23 },
  secondary: { fontSize: 15, lineHeight: 21 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
});
