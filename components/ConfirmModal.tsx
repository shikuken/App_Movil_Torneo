import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SmashTheme } from '../constants/theme';

export interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'primary';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger',
  icon,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const isDanger = type === 'danger';
  const isPrimary = type === 'primary';

  const defaultIcon: keyof typeof Ionicons.glyphMap = isDanger
    ? 'log-out-outline'
    : isPrimary
    ? 'checkmark-circle-outline'
    : 'alert-circle-outline';

  const iconName = icon || defaultIcon;

  const accentColor = isDanger
    ? SmashTheme.colors.liveRed
    : isPrimary
    ? SmashTheme.colors.primary
    : '#ffb703';

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.dialogCard}>
              {/* Resplandor superior de acento */}
              <View
                style={[
                  styles.glowBar,
                  { backgroundColor: accentColor },
                ]}
              />

              {/* Icono temático */}
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: `${accentColor}18`,
                    borderColor: `${accentColor}40`,
                  },
                ]}>
                <Ionicons name={iconName} size={28} color={accentColor} />
              </View>

              {/* Título y Mensaje */}
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              {/* Botones de Acción */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onCancel}
                  disabled={loading}
                  activeOpacity={0.75}>
                  <Text style={styles.cancelText}>{cancelText}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.confirmBtn,
                    {
                      backgroundColor: accentColor,
                      shadowColor: accentColor,
                    },
                  ]}
                  onPress={onConfirm}
                  disabled={loading}
                  activeOpacity={0.85}>
                  {loading ? (
                    <ActivityIndicator
                      size="small"
                      color={isPrimary ? SmashTheme.colors.onPrimary : '#ffffff'}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.confirmText,
                        {
                          color: isPrimary ? SmashTheme.colors.onPrimary : '#ffffff',
                        },
                      ]}>
                      {confirmText}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 9, 15, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: SmashTheme.colors.surfaceContainer,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
  },
  glowBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: SmashTheme.colors.onSurface,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 14,
    color: SmashTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
    paddingHorizontal: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    backgroundColor: SmashTheme.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: SmashTheme.colors.onSurfaceVariant,
  },
  confirmBtn: {
    flex: 1.2,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
