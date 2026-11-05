import React, { createContext, useContext, useState, useRef, useCallback, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  PanResponder,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SmashTheme } from '../constants/theme';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface ToastContextValue {
  showToast: (options: ToastOptions | string) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TYPE_CONFIG: Record<
  ToastType,
  {
    color: string;
    glow: string;
    bg: string;
    defaultIcon: keyof typeof Ionicons.glyphMap;
    defaultTitle: string;
  }
> = {
  success: {
    color: SmashTheme.colors.primary, // #c3f400
    glow: SmashTheme.colors.glowVolt,
    bg: '#141d18',
    defaultIcon: 'checkmark-circle',
    defaultTitle: 'Éxito',
  },
  error: {
    color: SmashTheme.colors.liveRed, // #ff3b30
    glow: 'rgba(255, 59, 48, 0.25)',
    bg: '#201214',
    defaultIcon: 'close-circle',
    defaultTitle: 'Atención',
  },
  warning: {
    color: '#ffb703',
    glow: 'rgba(255, 183, 3, 0.25)',
    bg: '#201a11',
    defaultIcon: 'alert-circle',
    defaultTitle: 'Aviso',
  },
  info: {
    color: SmashTheme.colors.secondary, // #4cd7f6
    glow: 'rgba(76, 215, 246, 0.25)',
    bg: '#0e1823',
    defaultIcon: 'information-circle',
    defaultTitle: 'Información',
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toastData, setToastData] = useState<ToastOptions | null>(null);
  const [visible, setVisible] = useState(false);

  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setToastData(null);
    });
  }, [opacity, translateY]);

  const showToast = useCallback(
    (options: ToastOptions | string) => {
      const config: ToastOptions =
        typeof options === 'string'
          ? { message: options, type: 'info' }
          : { type: 'info', ...options };

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setToastData(config);
      setVisible(true);

      // Disparar haptics según el tipo
      try {
        if (config.type === 'success') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (config.type === 'error') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else if (config.type === 'warning') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } catch {
        // En plataformas no soportadas se ignora
      }

      translateY.setValue(-120);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const duration = config.duration ?? 3500;
      timeoutRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    },
    [hideToast, opacity, translateY]
  );

  const showSuccess = useCallback(
    (message: string, title?: string) => {
      showToast({ message, title: title ?? '¡Excelente!', type: 'success' });
    },
    [showToast]
  );

  const showError = useCallback(
    (message: string, title?: string) => {
      showToast({ message, title: title ?? 'Error', type: 'error' });
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message: string, title?: string) => {
      showToast({ message, title: title ?? 'Aviso', type: 'warning' });
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, title?: string) => {
      showToast({ message, title: title ?? 'Información', type: 'info' });
    },
    [showToast]
  );

  // Permitir descartar deslizando hacia arriba
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy < -10;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -20) {
          hideToast();
        }
      },
    })
  ).current;

  const currentType: ToastType = toastData?.type || 'info';
  const typeConfig = TYPE_CONFIG[currentType];
  const iconName = toastData?.icon || typeConfig.defaultIcon;
  const title = toastData?.title !== undefined ? toastData.title : typeConfig.defaultTitle;

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        hideToast,
      }}>
      {children}
      {visible && toastData && (
        <View
          pointerEvents="box-none"
          style={[
            styles.overlayContainer,
            { top: Math.max(insets.top, Platform.OS === 'android' ? 14 : 10) + 6 },
          ]}>
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.toastCard,
              {
                backgroundColor: typeConfig.bg,
                borderColor: typeConfig.color,
                shadowColor: typeConfig.color,
                transform: [{ translateY }],
                opacity,
              },
            ]}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={hideToast}
              style={styles.toastTouchArea}>
              {/* Indicador lateral de color neón */}
              <View
                style={[styles.accentIndicator, { backgroundColor: typeConfig.color }]}
              />

              {/* Icono temático con círculo sutil */}
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: `${typeConfig.color}15`,
                    borderColor: `${typeConfig.color}40`,
                  },
                ]}>
                <Ionicons name={iconName} size={22} color={typeConfig.color} />
              </View>

              {/* Textos: Título y Mensaje */}
              <View style={styles.textContainer}>
                {title ? (
                  <Text style={[styles.title, { color: SmashTheme.colors.onSurface }]}>
                    {title}
                  </Text>
                ) : null}
                <Text
                  style={[styles.message, { color: SmashTheme.colors.onSurfaceVariant }]}
                  numberOfLines={3}>
                  {toastData.message}
                </Text>
              </View>

              {/* Botón rápido para cerrar */}
              <TouchableOpacity
                onPress={hideToast}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.closeBtn}>
                <Ionicons
                  name="close"
                  size={16}
                  color={SmashTheme.colors.onSurfaceVariant}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe ser utilizado dentro de un ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99999,
    alignItems: 'center',
  },
  toastCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 12,
  },
  toastTouchArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    paddingLeft: 18,
  },
  accentIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
    marginLeft: 8,
  },
});
