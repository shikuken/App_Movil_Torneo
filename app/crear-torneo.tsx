import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import * as Notifications from 'expo-notifications';
import { SmashTheme } from '../constants/theme';
import { useToast } from '../context/ToastContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function CrearTorneoScreen() {
  const router = useRouter();
  const currentUser = auth.currentUser;
  const { showToast, showError, showWarning, showSuccess } = useToast();

  // Estados para los campos de entrada
  const [nombreTorneo, setNombreTorneo] = useState('');
  const [organizador, setOrganizador] = useState(
    currentUser?.displayName || (currentUser?.email ? currentUser.email.split('@')[0] : '')
  );
  const [lugarSede, setLugarSede] = useState('');
  const [categoria, setCategoria] = useState('Intermedia');
  const [fechaTorneo, setFechaTorneo] = useState('');
  const [horaTorneo, setHoraTorneo] = useState('16:00');
  const [tipoTorneo, setTipoTorneo] = useState<'amistoso' | 'clasificatorio'>('amistoso');
  const [modalidad, setModalidad] = useState<'Eliminación directa' | 'Todos contra todos'>('Eliminación directa');
  const [cargando, setCargando] = useState(false);

  const mostrarMensaje = (titulo: string, mensaje: string) => {
    if (titulo.toLowerCase().includes('error')) {
      showError(mensaje, titulo);
    } else {
      showWarning(mensaje, titulo);
    }
  };

  const notificarTorneoCreado = async (nombre: string) => {
    if (Platform.OS === 'web') return;

    try {
      if (Platform.OS === 'android') {
        try {
          await Notifications.deleteNotificationChannelAsync('torneos');
        } catch (_) {}

        try {
          await Notifications.setNotificationChannelAsync('torneos_canal', {
            name: 'Notificaciones de torneos',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: SmashTheme.colors.primary,
          });
        } catch (_) {}
      }

      let { status, canAskAgain } = await Notifications.getPermissionsAsync();

      if (status !== 'granted' && canAskAgain) {
        const respuesta = await Notifications.requestPermissionsAsync();
        status = respuesta.status;
      }

      if (status !== 'granted') return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🏆 Torneo creado exitosamente',
          body: `El torneo "${nombre}" fue creado correctamente en Smash Match.`,
          sound: true,
          data: { url: '/ver-torneos' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 2,
          ...(Platform.OS === 'android' ? { channelId: 'torneos_canal' } : {}),
        },
      });
    } catch (error) {
      console.error('Error de notificación:', error);
    }
  };

  const handleRegistrarJugadores = async () => {
    if (!nombreTorneo.trim() || !organizador.trim()) {
      mostrarMensaje('Campos incompletos', 'Por favor ingresa el nombre del torneo y el organizador.');
      return;
    }

    if (!currentUser) {
      mostrarMensaje('Sesión requerida', 'Por favor inicia sesión para crear un torneo.');
      router.replace('/login');
      return;
    }

    setCargando(true);
    try {
      const docRef = await addDoc(collection(db, 'torneos'), {
        usuarioId: currentUser.uid,
        usuarioEmail: currentUser.email,
        nombreTorneo: nombreTorneo.trim(),
        organizador: organizador.trim(),
        lugarSede: lugarSede.trim() || null,
        categoria: categoria.trim() || 'Intermedia',
        modalidad,
        tipoTorneo,
        puntosAsignados: false,
        fechaTorneo: fechaTorneo.trim() || null,
        horaTorneo: horaTorneo.trim() || null,
        creadoEn: serverTimestamp(),
        estado: 'creado',
      });

      await notificarTorneoCreado(nombreTorneo.trim());
      showSuccess(`Torneo "${nombreTorneo.trim()}" creado exitosamente.`);

      router.push({
        pathname: '/registrar-jugadores',
        params: {
          torneoId: docRef.id,
          nombreTorneo: nombreTorneo.trim(),
          modalidad: modalidad,
          tipoTorneo: tipoTorneo,
          esPropietario: 'true',
        },
      });
    } catch (error: any) {
      console.error('Error al crear el torneo:', error);
      mostrarMensaje('Error al guardar', 'No se pudo registrar el torneo. Verifica tu conexión a internet.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      
      {/* Luces de ambiente neón */}
      <View style={styles.glowTop} pointerEvents="none" />

      {/* Header fijo estilo Stitch */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={SmashTheme.colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Crear Nuevo Torneo</Text>
          <Text style={styles.headerSubtitle}>Paso 1: Parámetros del evento</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          <View style={styles.formCard}>
            {/* 1. Nombre del Torneo */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nombre del Torneo *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="trophy-outline" size={18} color={SmashTheme.colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej: Torneo Clausura Smash 2026"
                  placeholderTextColor={SmashTheme.colors.onSurfaceVariant + '80'}
                  value={nombreTorneo}
                  onChangeText={setNombreTorneo}
                />
              </View>
            </View>

            {/* 2. Organizador */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Organizador / Club *</Text>
                <View style={styles.badgeOfficial}>
                  <Ionicons name="checkmark-circle" size={12} color={SmashTheme.colors.secondary} />
                  <Text style={styles.badgeOfficialText}>OFICIAL</Text>
                </View>
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-circle-outline" size={18} color={SmashTheme.colors.secondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Nombre de la academia o director"
                  placeholderTextColor={SmashTheme.colors.onSurfaceVariant + '80'}
                  value={organizador}
                  onChangeText={setOrganizador}
                />
              </View>
            </View>

            {/* 3. Selector de Categoría / Nivel (Segmented Control Stitch) */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Categoría / Nivel de Juego</Text>
              <View style={styles.segmentedContainer}>
                {['Aficionados', 'Intermedia', 'Avanzado/Pro'].map((cat) => {
                  const isActive = categoria === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.segmentBtn, isActive && styles.segmentBtnActive]}
                      onPress={() => setCategoria(cat)}
                      activeOpacity={0.8}>
                      {isActive && <View style={styles.segmentActiveDot} />}
                      <Text style={[styles.segmentBtnText, isActive && styles.segmentBtnTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 4. Sede o Ubicación */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Sede o Ubicación</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="location-outline" size={18} color={SmashTheme.colors.secondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej: Club Raqueta Norte, Pistas 1 y 2"
                  placeholderTextColor={SmashTheme.colors.onSurfaceVariant + '80'}
                  value={lugarSede}
                  onChangeText={setLugarSede}
                />
              </View>
            </View>

            {/* 5. Fecha y Hora */}
            <View style={styles.row}>
              <View style={[styles.formGroup, styles.halfCol]}>
                <Text style={styles.label}>Fecha</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="calendar-outline" size={18} color={SmashTheme.colors.onSurfaceVariant} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={SmashTheme.colors.onSurfaceVariant + '80'}
                    value={fechaTorneo}
                    onChangeText={setFechaTorneo}
                  />
                </View>
              </View>

              <View style={[styles.formGroup, styles.halfCol]}>
                <Text style={styles.label}>Hora Prevista</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="time-outline" size={18} color={SmashTheme.colors.onSurfaceVariant} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="16:00"
                    placeholderTextColor={SmashTheme.colors.onSurfaceVariant + '80'}
                    value={horaTorneo}
                    onChangeText={setHoraTorneo}
                  />
                </View>
              </View>
            </View>

            {/* 6. Tipo de Torneo (Amistoso vs Clasificatorio) */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Tipo de Torneo *</Text>
                {tipoTorneo === 'clasificatorio' && (
                  <View style={styles.badgeRankOfficial}>
                    <Ionicons name="ribbon" size={12} color={SmashTheme.colors.primary} />
                    <Text style={styles.badgeRankOfficialText}>SUMA RANKING (3, 2, 1 PTS)</Text>
                  </View>
                )}
              </View>
              <View style={styles.modalidadCardsRow}>
                {/* Opción 1: Amistoso */}
                <TouchableOpacity
                  style={[
                    styles.modalidadCard,
                    tipoTorneo === 'amistoso' && styles.modalidadCardActive,
                  ]}
                  onPress={() => setTipoTorneo('amistoso')}
                  activeOpacity={0.8}>
                  <View style={styles.modalidadCardTop}>
                    <Ionicons
                      name="tennisball-outline"
                      size={20}
                      color={tipoTorneo === 'amistoso' ? SmashTheme.colors.primary : SmashTheme.colors.onSurfaceVariant}
                    />
                    {tipoTorneo === 'amistoso' ? (
                      <Ionicons name="checkmark-circle" size={18} color={SmashTheme.colors.primary} />
                    ) : (
                      <View style={styles.uncheckDot} />
                    )}
                  </View>
                  <Text style={[styles.modalidadTitle, tipoTorneo === 'amistoso' && styles.modalidadTitleActive]}>
                    Amistoso
                  </Text>
                  <Text style={styles.modalidadDesc}>
                    Recreativo. Registro libre de jugadores sin impacto en el ranking.
                  </Text>
                </TouchableOpacity>

                {/* Opción 2: Clasificatorio */}
                <TouchableOpacity
                  style={[
                    styles.modalidadCard,
                    tipoTorneo === 'clasificatorio' && styles.modalidadCardActiveCyan,
                  ]}
                  onPress={() => setTipoTorneo('clasificatorio')}
                  activeOpacity={0.8}>
                  <View style={styles.modalidadCardTop}>
                    <Ionicons
                      name="trophy"
                      size={20}
                      color={tipoTorneo === 'clasificatorio' ? SmashTheme.colors.secondary : SmashTheme.colors.onSurfaceVariant}
                    />
                    {tipoTorneo === 'clasificatorio' ? (
                      <Ionicons name="checkmark-circle" size={18} color={SmashTheme.colors.secondary} />
                    ) : (
                      <View style={styles.uncheckDot} />
                    )}
                  </View>
                  <Text style={[styles.modalidadTitle, tipoTorneo === 'clasificatorio' && styles.modalidadTitleActiveCyan]}>
                    Clasificatorio
                  </Text>
                  <Text style={styles.modalidadDesc}>
                    Oficial. Inscribe usuarios de la app y otorga puntos: 1° (3pts), 2° (2pts), 3° (1pt).
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 7. Modalidad de Competición (Cards estilo Stitch) */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Modalidad de Competencia</Text>
              <View style={styles.modalidadCardsRow}>
                {/* Opción 1: Eliminación Directa */}
                <TouchableOpacity
                  style={[
                    styles.modalidadCard,
                    modalidad === 'Eliminación directa' && styles.modalidadCardActive,
                  ]}
                  onPress={() => setModalidad('Eliminación directa')}
                  activeOpacity={0.8}>
                  <View style={styles.modalidadCardTop}>
                    <Ionicons
                      name="git-network-outline"
                      size={20}
                      color={modalidad === 'Eliminación directa' ? SmashTheme.colors.primary : SmashTheme.colors.onSurfaceVariant}
                    />
                    {modalidad === 'Eliminación directa' ? (
                      <Ionicons name="checkmark-circle" size={18} color={SmashTheme.colors.primary} />
                    ) : (
                      <View style={styles.uncheckDot} />
                    )}
                  </View>
                  <Text style={[styles.modalidadTitle, modalidad === 'Eliminación directa' && styles.modalidadTitleActive]}>
                    Eliminación Directa
                  </Text>
                  <Text style={styles.modalidadDesc}>
                    Cuadro de llaves (brackets). El ganador avanza de ronda.
                  </Text>
                </TouchableOpacity>

                {/* Opción 2: Todos contra todos */}
                <TouchableOpacity
                  style={[
                    styles.modalidadCard,
                    modalidad === 'Todos contra todos' && styles.modalidadCardActive,
                  ]}
                  onPress={() => setModalidad('Todos contra todos')}
                  activeOpacity={0.8}>
                  <View style={styles.modalidadCardTop}>
                    <Ionicons
                      name="grid-outline"
                      size={20}
                      color={modalidad === 'Todos contra todos' ? SmashTheme.colors.secondary : SmashTheme.colors.onSurfaceVariant}
                    />
                    {modalidad === 'Todos contra todos' ? (
                      <Ionicons name="checkmark-circle" size={18} color={SmashTheme.colors.secondary} />
                    ) : (
                      <View style={styles.uncheckDot} />
                    )}
                  </View>
                  <Text style={[styles.modalidadTitle, modalidad === 'Todos contra todos' && styles.modalidadTitleActiveCyan]}>
                    Liga / Grupos
                  </Text>
                  <Text style={styles.modalidadDesc}>
                    Todos contra todos. Tabla por puntos y diferencia.
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Botón Acción Principal: Volt CTA */}
            <TouchableOpacity
              style={[styles.submitButton, cargando && { opacity: 0.7 }]}
              onPress={handleRegistrarJugadores}
              activeOpacity={0.85}
              disabled={cargando}>
              {cargando ? (
                <ActivityIndicator color={SmashTheme.colors.onPrimary} size="small" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Continuar: Inscribir Jugadores</Text>
                  <Ionicons name="arrow-forward" size={18} color={SmashTheme.colors.onPrimary} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: SmashTheme.colors.primary,
    opacity: 0.05,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: SmashTheme.colors.cardBorder,
    backgroundColor: SmashTheme.colors.surfaceContainerLowest,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: SmashTheme.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: SmashTheme.colors.onSurface,
  },
  headerSubtitle: {
    fontSize: 12,
    color: SmashTheme.colors.onSurfaceVariant,
    marginTop: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: SmashTheme.colors.surfaceContainerLow,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    padding: 18,
  },
  formGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: SmashTheme.colors.onSurface,
    marginBottom: 6,
  },
  badgeOfficial: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(76, 215, 246, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeOfficialText: {
    fontSize: 10,
    fontWeight: '800',
    color: SmashTheme.colors.secondary,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SmashTheme.colors.surfaceContainer,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: SmashTheme.colors.onSurface,
    fontSize: 13,
    height: '100%',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: SmashTheme.colors.surfaceContainerLowest,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: SmashTheme.colors.surfaceContainerHigh,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SmashTheme.colors.primary,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: SmashTheme.colors.onSurfaceVariant,
  },
  segmentBtnTextActive: {
    color: SmashTheme.colors.primary,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCol: {
    flex: 1,
  },
  modalidadCardsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalidadCard: {
    flex: 1,
    backgroundColor: SmashTheme.colors.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: SmashTheme.colors.cardBorder,
    padding: 12,
  },
  modalidadCardActive: {
    borderColor: SmashTheme.colors.primary,
    backgroundColor: 'rgba(195, 244, 0, 0.05)',
  },
  modalidadCardActiveCyan: {
    borderColor: SmashTheme.colors.secondary,
    backgroundColor: 'rgba(76, 215, 246, 0.05)',
  },
  badgeRankOfficial: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(195, 244, 0, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: SmashTheme.colors.borderVolt,
  },
  badgeRankOfficialText: {
    fontSize: 9,
    fontWeight: '800',
    color: SmashTheme.colors.primary,
    letterSpacing: 0.3,
  },
  modalidadCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  uncheckDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: SmashTheme.colors.outline,
  },
  modalidadTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: SmashTheme.colors.onSurface,
    marginBottom: 4,
  },
  modalidadTitleActive: {
    color: SmashTheme.colors.primary,
  },
  modalidadTitleActiveCyan: {
    color: SmashTheme.colors.secondary,
  },
  modalidadDesc: {
    fontSize: 10,
    color: SmashTheme.colors.onSurfaceVariant,
    lineHeight: 14,
  },
  submitButton: {
    backgroundColor: SmashTheme.colors.primary,
    borderRadius: 14,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    shadowColor: SmashTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  submitButtonText: {
    color: SmashTheme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
});
