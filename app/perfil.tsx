import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { SmashTheme } from '../constants/theme';

export default function PerfilScreen() {
  const router = useRouter();
  const { user, perfil, actualizarPerfil } = useAuth();
  const { showSuccess, showWarning, showError } = useToast();

  const [nombre, setNombre] = useState(perfil?.nombre || '');
  const [apellido, setApellido] = useState(perfil?.apellido || '');
  const [telefono, setTelefono] = useState(perfil?.telefono || '');
  const [fotoUrl, setFotoUrl] = useState<string | null>(perfil?.fotoUrl || null);
  const [modalFotoVisible, setModalFotoVisible] = useState(false);
  const [cargandoFoto, setCargandoFoto] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (perfil) {
      if (perfil.nombre) setNombre(perfil.nombre);
      if (perfil.apellido) setApellido(perfil.apellido);
      if (perfil.telefono) setTelefono(perfil.telefono);
      if (perfil.fotoUrl !== undefined) setFotoUrl(perfil.fotoUrl);
    }
  }, [perfil]);

  const getInitials = () => {
    const n = nombre.trim();
    const a = apellido.trim();
    if (n && a) {
      return (n[0] + a[0]).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'SM';
  };

  const handlePickFromGallery = async () => {
    setModalFotoVisible(false);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showWarning('Se requiere permiso para acceder a la galería de fotos.', 'Permiso Denegado');
        return;
      }

      setCargandoFoto(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newFoto = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;

        setFotoUrl(newFoto);
        await actualizarPerfil({ fotoUrl: newFoto });
        showSuccess('Foto de perfil actualizada correctamente.');
      }
    } catch (e: any) {
      console.error('Error al seleccionar imagen:', e);
      showError(e.message || 'No se pudo cargar la imagen.', 'Error');
    } finally {
      setCargandoFoto(false);
    }
  };

  const handleTakePhoto = async () => {
    setModalFotoVisible(false);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showWarning('Se requiere permiso para usar la cámara.', 'Permiso Denegado');
        return;
      }

      setCargandoFoto(true);
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newFoto = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;

        setFotoUrl(newFoto);
        await actualizarPerfil({ fotoUrl: newFoto });
        showSuccess('Foto de perfil actualizada correctamente.');
      }
    } catch (e: any) {
      console.error('Error al capturar foto:', e);
      showError(e.message || 'No se pudo tomar la foto.', 'Error');
    } finally {
      setCargandoFoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    setModalFotoVisible(false);
    setCargandoFoto(true);
    try {
      setFotoUrl(null);
      await actualizarPerfil({ fotoUrl: null });
      showSuccess('Foto de perfil eliminada.');
    } catch (e: any) {
      console.error('Error al eliminar foto:', e);
      showError(e.message || 'No se pudo eliminar la foto.', 'Error');
    } finally {
      setCargandoFoto(false);
    }
  };

  const handleGuardar = async () => {
    const nombreTrim = nombre.trim();
    const apellidoTrim = apellido.trim();
    const telefonoTrim = telefono.trim();

    if (!nombreTrim || !apellidoTrim) {
      showWarning('El nombre y el apellido son obligatorios.', 'Campos incompletos');
      return;
    }

    if (telefonoTrim && telefonoTrim.replace(/[^0-9]/g, '').length < 7) {
      showWarning('Por favor ingresa un número de teléfono válido.', 'Teléfono inválido');
      return;
    }

    setGuardando(true);
    try {
      await actualizarPerfil({
        nombre: nombreTrim,
        apellido: apellidoTrim,
        telefono: telefonoTrim,
        fotoUrl: fotoUrl ?? null,
      });

      showSuccess('Tus datos han sido actualizados con éxito.', 'Perfil Guardado');
    } catch (err: any) {
      console.error('Error al actualizar perfil:', err);
      showError(err.message || 'No se pudieron guardar los cambios.', 'Error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Luces de ambiente (Glow HUD) */}
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBottom} pointerEvents="none" />

      {/* Header Fijo */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={SmashTheme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          
          {/* Tarjeta Hero del Perfil */}
          <View style={styles.heroCard}>
            <TouchableOpacity
              style={styles.avatarBorder}
              onPress={() => setModalFotoVisible(true)}
              activeOpacity={0.8}>
              <View style={styles.avatar}>
                {fotoUrl ? (
                  <Image source={{ uri: fotoUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{getInitials()}</Text>
                )}

                {cargandoFoto && (
                  <View style={styles.avatarLoadingOverlay}>
                    <ActivityIndicator size="small" color={SmashTheme.colors.primary} />
                  </View>
                )}
              </View>

              {/* Botón flotante de cámara */}
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={14} color={SmashTheme.colors.onPrimary} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setModalFotoVisible(true)}
              style={styles.changePhotoPill}
              activeOpacity={0.75}>
              <Ionicons name="camera-outline" size={13} color={SmashTheme.colors.primary} />
              <Text style={styles.changePhotoText}>Cambiar Foto</Text>
            </TouchableOpacity>

            <Text style={styles.heroName}>
              {nombre.trim() || apellido.trim()
                ? `${nombre} ${apellido}`.trim()
                : 'Usuario Smash Match'}
            </Text>

            <View style={styles.emailBadge}>
              <Ionicons name="mail-outline" size={13} color={SmashTheme.colors.primary} />
              <Text style={styles.emailText}>{user?.email || 'Sin correo asociado'}</Text>
            </View>

            {/* Estadísticas del Jugador / Organizador si existen */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{perfil?.puntosRanking ?? 0}</Text>
                <Text style={styles.statLabel}>Puntos Ranking</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{perfil?.torneosJugados ?? 0}</Text>
                <Text style={styles.statLabel}>Torneos</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{perfil?.primerosPuestos ?? 0}</Text>
                <Text style={styles.statLabel}>Títulos 🥇</Text>
              </View>
            </View>
          </View>

          {/* Formulario de Edición */}
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Ionicons name="person-circle-outline" size={20} color={SmashTheme.colors.primary} />
              <Text style={styles.formTitle}>Información Personal</Text>
            </View>

            {/* Campo: Nombre */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nombre *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={18} color={SmashTheme.colors.onSurfaceVariant} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={nombre}
                  onChangeText={setNombre}
                  placeholder="Tu nombre"
                  placeholderTextColor={SmashTheme.colors.onSurfaceVariant + '70'}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Campo: Apellido */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Apellido *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={18} color={SmashTheme.colors.onSurfaceVariant} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={apellido}
                  onChangeText={setApellido}
                  placeholder="Tu apellido"
                  placeholderTextColor={SmashTheme.colors.onSurfaceVariant + '70'}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Campo: Teléfono */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Teléfono / Celular</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={18} color={SmashTheme.colors.onSurfaceVariant} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={telefono}
                  onChangeText={setTelefono}
                  placeholder="Ej: 310 123 4567"
                  placeholderTextColor={SmashTheme.colors.onSurfaceVariant + '70'}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Campo: Correo Electrónico (Solo Lectura) */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Correo Electrónico</Text>
                <Text style={styles.readOnlyTag}>No editable</Text>
              </View>
              <View style={[styles.inputWrapper, styles.inputReadOnly]}>
                <Ionicons name="lock-closed-outline" size={18} color={SmashTheme.colors.onSurfaceVariant + '80'} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: SmashTheme.colors.onSurfaceVariant }]}
                  value={user?.email || ''}
                  editable={false}
                />
              </View>
            </View>

            {/* Botón Guardar Cambios */}
            <TouchableOpacity
              style={[styles.saveButton, guardando && { opacity: 0.75 }]}
              onPress={handleGuardar}
              disabled={guardando}
              activeOpacity={0.85}>
              {guardando ? (
                <ActivityIndicator size="small" color={SmashTheme.colors.onPrimary} />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color={SmashTheme.colors.onPrimary} />
                  <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal Opciones de Foto de Perfil */}
      <Modal
        visible={modalFotoVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalFotoVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setModalFotoVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalCard}>
                <View style={styles.modalGlowBar} />
                
                <Text style={styles.modalTitle}>Foto de Perfil</Text>
                <Text style={styles.modalSubtitle}>Elige una opción para actualizar tu foto</Text>

                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={handleTakePhoto}
                  activeOpacity={0.75}>
                  <View style={[styles.modalOptionIcon, { backgroundColor: `${SmashTheme.colors.primary}20` }]}>
                    <Ionicons name="camera" size={20} color={SmashTheme.colors.primary} />
                  </View>
                  <Text style={styles.modalOptionText}>Tomar Foto con Cámara</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={handlePickFromGallery}
                  activeOpacity={0.75}>
                  <View style={[styles.modalOptionIcon, { backgroundColor: `${SmashTheme.colors.secondary}20` }]}>
                    <Ionicons name="images" size={20} color={SmashTheme.colors.secondary} />
                  </View>
                  <Text style={styles.modalOptionText}>Elegir de la Galería</Text>
                </TouchableOpacity>

                {fotoUrl ? (
                  <TouchableOpacity
                    style={styles.modalOption}
                    onPress={handleRemovePhoto}
                    activeOpacity={0.75}>
                    <View style={[styles.modalOptionIcon, { backgroundColor: `${SmashTheme.colors.liveRed}20` }]}>
                      <Ionicons name="trash-outline" size={20} color={SmashTheme.colors.liveRed} />
                    </View>
                    <Text style={[styles.modalOptionText, { color: SmashTheme.colors.liveRed }]}>
                      Eliminar Foto Actual
                    </Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setModalFotoVisible(false)}
                  activeOpacity={0.75}>
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SmashTheme.colors.surface,
  },
  glowTop: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: SmashTheme.colors.primary,
    opacity: 0.08,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: SmashTheme.colors.secondary,
    opacity: 0.06,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: SmashTheme.colors.cardBorder,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: SmashTheme.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: SmashTheme.colors.onSurface,
    letterSpacing: 0.3,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: SmashTheme.colors.surfaceContainerLow,
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    marginBottom: 16,
  },
  avatarBorder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: SmashTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: SmashTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    position: 'relative',
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: SmashTheme.colors.surfaceContainerHighest,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 43,
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: SmashTheme.colors.primary,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: SmashTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: SmashTheme.colors.surfaceContainerLow,
    elevation: 4,
  },
  changePhotoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: SmashTheme.colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: SmashTheme.colors.borderVolt,
    marginBottom: 10,
  },
  changePhotoText: {
    fontSize: 11,
    fontWeight: '700',
    color: SmashTheme.colors.primary,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '800',
    color: SmashTheme.colors.onSurface,
    marginBottom: 6,
    textAlign: 'center',
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: SmashTheme.colors.surfaceContainerHigh,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    marginBottom: 18,
  },
  emailText: {
    fontSize: 13,
    color: SmashTheme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: SmashTheme.colors.cardBorder,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: SmashTheme.colors.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: SmashTheme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: SmashTheme.colors.cardBorder,
  },
  formCard: {
    backgroundColor: SmashTheme.colors.surfaceContainerLow,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: SmashTheme.colors.onSurface,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: SmashTheme.colors.onSurface,
    marginBottom: 6,
  },
  readOnlyTag: {
    fontSize: 11,
    color: SmashTheme.colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SmashTheme.colors.surfaceContainerHigh,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    paddingHorizontal: 12,
    height: 48,
  },
  inputReadOnly: {
    opacity: 0.65,
    backgroundColor: SmashTheme.colors.surfaceContainer,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: SmashTheme.colors.onSurface,
    fontWeight: '500',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: SmashTheme.colors.primary,
    height: 50,
    borderRadius: 14,
    marginTop: 8,
    shadowColor: SmashTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: SmashTheme.colors.onPrimary,
    letterSpacing: 0.3,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 9, 15, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: SmashTheme.colors.surfaceContainer,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
  },
  modalGlowBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: SmashTheme.colors.primary,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: SmashTheme.colors.onSurface,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: SmashTheme.colors.onSurfaceVariant,
    marginBottom: 18,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: SmashTheme.colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    marginBottom: 10,
  },
  modalOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: SmashTheme.colors.onSurface,
  },
  modalCancelBtn: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 14,
    marginTop: 4,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: SmashTheme.colors.onSurfaceVariant,
  },
});
