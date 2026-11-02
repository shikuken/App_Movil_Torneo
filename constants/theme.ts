/**
 * Smash Match Design System Tokens (Stitch Mockup Aesthetic)
 * High-Tech Athleticism Dark Mode
 */

import { Platform } from 'react-native';

export const SmashTheme = {
  colors: {
    surface: '#0d1320',
    surfaceDim: '#0d1320',
    surfaceBright: '#333948',
    surfaceContainerLowest: '#080e1b',
    surfaceContainerLow: '#161b29',
    surfaceContainer: '#1a1f2d',
    surfaceContainerHigh: '#242a38',
    surfaceContainerHighest: '#2f3543',
    onSurface: '#dde2f5',
    onSurfaceVariant: '#94a3b8',
    outline: '#2f3543',
    outlineVariant: '#444933',
    // Volt neón deportivo (Kinetic Volt)
    primary: '#c3f400',
    primaryContainer: '#c3f400',
    onPrimary: '#161e00',
    onPrimaryContainer: '#556d00',
    // Cyber Cyan
    secondary: '#4cd7f6',
    secondaryContainer: '#03b5d3',
    onSecondary: '#003640',
    // Estados y Alertas
    liveRed: '#ff3b30',
    error: '#ffb4ab',
    errorContainer: '#93000a',
    onError: '#690005',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    borderVolt: 'rgba(195, 244, 0, 0.4)',
    glowVolt: 'rgba(195, 244, 0, 0.25)',
  },
  round: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
};

export const Colors = {
  light: {
    text: '#dde2f5',
    background: '#0d1320',
    tint: '#c3f400',
    icon: '#94a3b8',
    tabIconDefault: '#94a3b8',
    tabIconSelected: '#c3f400',
  },
  dark: {
    text: '#dde2f5',
    background: '#0d1320',
    tint: '#c3f400',
    icon: '#94a3b8',
    tabIconDefault: '#94a3b8',
    tabIconSelected: '#c3f400',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
});
