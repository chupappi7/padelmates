import { useColorScheme } from 'react-native';

export const Colors = {
  light: {
    text: '#1A1A1F',
    textSecondary: '#62626E',
    background: '#FBF8F6',
    card: '#FFFFFF',
    border: '#E8E2DE',
    accent: '#E0475B',
    accentText: '#FFFFFF',
    accentSoft: '#FCE8EB',
    success: '#2F8F5B',
    danger: '#C23A3A',
  },
  dark: {
    text: '#F4F2F1',
    textSecondary: '#A7A4AB',
    background: '#121114',
    card: '#1D1B20',
    border: '#2E2B32',
    accent: '#FF6B7E',
    accentText: '#1A0B0E',
    accentSoft: '#3A1D23',
    success: '#5CC48A',
    danger: '#FF7A7A',
  },
} as const;

export type Palette = { [K in keyof typeof Colors.light]: string };

export function useColors(): Palette {
  return Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

export const Spacing = {
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
} as const;

export const Radius = {
  small: 8,
  medium: 14,
  large: 20,
} as const;

export const MaxContentWidth = 720;
