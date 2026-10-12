import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ImageBackground,
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
import { auth } from '../firebaseConfig';
import { db } from '../firebaseConfig';
import * as Notifications from 'expo-notifications';

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

  // Estados para los campos de entrada de texto
  const [nombreTorneo, setNombreTorneo] = useState('');
  const [organizador, setOrganizador] = useState('');
  const [lugarSede, setLugarSede] = useState('');
  const [categoria, setCategoria] = useState('');
  const [fechaTorneo, setFechaTorneo] = useState('');
  const [horaTorneo, setHoraTorneo] = useState('');
  const [cargando, setCargando] = useState(false);

  const mostrarMensaje = (titulo: string, mensaje: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${titulo}\n${mensaje}`);
    } else {
      Alert.alert(titulo, mensaje);
    }
  };

  // Notificación local automática
  const notificarTorneoCreado = async (nombreTorneo: string) => {
    if (Platform.OS === 'web') return;

    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('torneos', {
          name: 'Notificaciones de torneos',
          importance: Notifications.AndroidImportance.MAX,
          sound: true,
        });
      }

      let { status, canAskAgain } =
        await Notifications.getPermissionsAsync();

      if (status !== 'granted' && canAskAgain) {
        const respuesta =
          await Notifications.requestPermissionsAsync();
        status = respuesta.status;
      }

      if (status !== 'granted') {
        console.log('Permiso de notificaciones denegado');
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🏆 Torneo creado exitosamente',
          body: `El torneo "${nombreTorneo}" fue creado correctamente en Smash Match.`,
          sound: true,
          data: {
            url: '/ver-torneos',
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 5,
          ...(Platform.OS === 'android'
            ? { channelId: 'torneos' }
            : {}),
        },
      });

      console.log('Notificación programada');
    } catch (error) {
      console.error('Error de notificación:', error);
    }
  };
  // Estado para la opción de modalidad seleccionada
  const [modalidad, setModalidad] = useState<'Eliminación directa' | 'Todos contra todos'>(
    'Eliminación directa'
  );

  // Sanitizado para permitir únicamente caracteres alfanuméricos y espacios
  const handleAlphanumericChange = (text: string, setter: (val: string) => void) => {
    const sanitizedText = text.replace(/[^a-zA-Z0-9\s]/g, '');
    setter(sanitizedText);
  };

  // Helper para asignar fecha de hoy o mañana
  const handleSetQuickDate = (diasAdicionales: number) => {
    const d = new Date();
    d.setDate(d.getDate() + diasAdicionales);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setFechaTorneo(`${yyyy}-${mm}-${dd}`);
  };

  // Manejo del botón de acción "Registrar jugadores"
  const handleRegistrarJugadores = async () => {
    if (!nombreTorneo.trim() || !organizador.trim()) {
      const msg = 'Por favor completa la información del torneo (Nombre y Organizador) para continuar.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Campos incompletos', msg);
      }
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      const msg = 'Por favor inicia sesión para crear un torneo.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Sesión requerida', msg);
      }
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
        categoria: categoria.trim() || null,
        modalidad,
        fechaTorneo: fechaTorneo.trim() || null,
        horaTorneo: horaTorneo.trim() || null,
        creadoEn: serverTimestamp(),
      });

      // Enviar notificación local después de guardar el torneo
      await notificarTorneoCreado(nombreTorneo.trim());

      // Navegar inmediatamente a la vista para registrar jugadores del torneo creado
      router.push({
        pathname: '/registrar-jugadores' as any,
        params: {
          torneoId: docRef.id,
          nombreTorneo: nombreTorneo.trim(),
          modalidad,
          esPropietario: 'true',
        },
      });
    } catch (error: any) {
      const errMsg = error.message || 'Ocurrió un error al guardar en la nube.';
      if (Platform.OS === 'web') {
        window.alert(`Error al crear torneo: ${errMsg}`);
      } else {
        Alert.alert('Error al crear torneo', errMsg);
      }
    } finally {
      setCargando(false);
    }
  };

  // Manejo del botón "Regresar a la página principal"
  const handleRegresar = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/');
    }
  };


  return (
    <ImageBackground
      source={{
        uri: 'https://images.unsplash.com/photo-1611251126786-291730073574?auto=format&fit=crop&w=1000&q=80',
      }}
      style={styles.backgroundImage}
      resizeMode="cover">
      {/* Capa oscura superpuesta para legibilidad */}
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle="light-content" />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
            <ScrollView
              contentContainerStyle={styles.scrollContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}>

              {/* Botón para regresar a la página principal */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleRegresar}
                activeOpacity={0.8}
                accessibilityLabel="Regresar a la página principal">
                <Ionicons name="arrow-back-circle-outline" size={26} color="#ffffff" />
                <Text style={styles.backButtonText}>Regresar a la página principal</Text>
              </TouchableOpacity>

              {/* Tarjeta contenedora con fondo semi-transparente */}
              <View style={styles.cardContainer}>
                {/* Título de la pantalla */}
                <Text style={styles.mainTitle}>Crea tu torneo</Text>

                {/* Formulario: Campo 1 - Nombre del torneo */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Nombre del torneo</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ej: Torneo Smash 2026"
                    placeholderTextColor="#94a3b8"
                    value={nombreTorneo}
                    onChangeText={(text) => handleAlphanumericChange(text, setNombreTorneo)}
                    autoCapitalize="words"
                  />
                </View>

                {/* Formulario: Campo 2 - Organizador */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Organizador</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ej: Club Tenis de Mesa Cali"
                    placeholderTextColor="#94a3b8"
                    value={organizador}
                    onChangeText={(text) => handleAlphanumericChange(text, setOrganizador)}
                    autoCapitalize="words"
                  />
                </View>

                {/* Formulario: Campo 3 - Lugar o Sede */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Lugar / Sede</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ej: Coliseo Central Mza 4"
                    placeholderTextColor="#94a3b8"
                    value={lugarSede}
                    onChangeText={(text) => handleAlphanumericChange(text, setLugarSede)}
                    autoCapitalize="words"
                  />
                </View>

                {/* Formulario: Campo 4 - Categoría */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Categoría o Nivel</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ej: Categoria Avanzada 2026"
                    placeholderTextColor="#94a3b8"
                    value={categoria}
                    onChangeText={(text) => handleAlphanumericChange(text, setCategoria)}
                    autoCapitalize="sentences"
                  />
                </View>

                {/* Formulario: Campo 5 - Fecha y Hora del Torneo */}
                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 6 }]}>
                    <View style={styles.labelWithIcon}>
                      <Ionicons name="calendar-outline" size={15} color="#2563eb" />
                      <Text style={styles.label}>Fecha torneo</Text>
                    </View>
                    <TextInput
                      style={styles.textInput}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#94a3b8"
                      value={fechaTorneo}
                      onChangeText={setFechaTorneo}
                    />
                    <View style={styles.quickButtonsRow}>
                      <TouchableOpacity
                        style={styles.quickDateButton}
                        onPress={() => handleSetQuickDate(0)}
                        activeOpacity={0.7}>
                        <Text style={styles.quickDateText}>Hoy</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.quickDateButton}
                        onPress={() => handleSetQuickDate(1)}
                        activeOpacity={0.7}>
                        <Text style={styles.quickDateText}>Mañana</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={[styles.formGroup, { flex: 1, marginLeft: 6 }]}>
                    <View style={styles.labelWithIcon}>
                      <Ionicons name="time-outline" size={15} color="#2563eb" />
                      <Text style={styles.label}>Hora inicio</Text>
                    </View>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Ej: 09:00 AM"
                      placeholderTextColor="#94a3b8"
                      value={horaTorneo}
                      onChangeText={setHoraTorneo}
                    />
                    <View style={styles.quickButtonsRow}>
                      {['09:00 AM', '02:00 PM', '06:00 PM'].map((h) => (
                        <TouchableOpacity
                          key={h}
                          style={[styles.quickDateButton, horaTorneo === h && styles.quickDateButtonActive]}
                          onPress={() => setHoraTorneo(h)}
                          activeOpacity={0.7}>
                          <Text style={[styles.quickDateText, horaTorneo === h && styles.quickDateTextActive]}>
                            {h.split(' ')[0]}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Sección Modalidad */}
                <View style={styles.modalitySection}>
                  <Text style={styles.modalityTitle}>Modalidad</Text>
                  <View style={styles.modalityButtonsContainer}>
                    {/* Opción 1: Eliminación directa */}
                    <TouchableOpacity
                      style={[
                        styles.modalityButton,
                        modalidad === 'Eliminación directa' && styles.modalityButtonSelected,
                      ]}
                      onPress={() => setModalidad('Eliminación directa')}
                      activeOpacity={0.8}>
                      <Ionicons
                        name="git-commit-outline"
                        size={20}
                        color={modalidad === 'Eliminación directa' ? '#ffffff' : '#2563eb'}
                        style={styles.modalityIcon}
                      />
                      <Text
                        style={[
                          styles.modalityButtonText,
                          modalidad === 'Eliminación directa' && styles.modalityButtonTextSelected,
                        ]}>
                        Eliminación directa
                      </Text>
                    </TouchableOpacity>

                    {/* Opción 2: Todos contra todos */}
                    <TouchableOpacity
                      style={[
                        styles.modalityButton,
                        modalidad === 'Todos contra todos' && styles.modalityButtonSelected,
                      ]}
                      onPress={() => setModalidad('Todos contra todos')}
                      activeOpacity={0.8}>
                      <Ionicons
                        name="grid-outline"
                        size={20}
                        color={modalidad === 'Todos contra todos' ? '#ffffff' : '#2563eb'}
                        style={styles.modalityIcon}
                      />
                      <Text
                        style={[
                          styles.modalityButtonText,
                          modalidad === 'Todos contra todos' && styles.modalityButtonTextSelected,
                        ]}>
                        Todos contra todos
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Botón principal: Registrar jugadores */}
                <TouchableOpacity
                  style={[styles.submitButton, cargando && { opacity: 0.75 }]}
                  onPress={handleRegistrarJugadores}
                  activeOpacity={0.85}
                  disabled={cargando}>
                  {cargando ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.submitButtonText}>Registrar jugadores</Text>
                      <Ionicons name="arrow-forward" size={22} color="#ffffff" />
                    </>
                  )}
                </TouchableOpacity>

              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
    alignItems: 'stretch',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  cardContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 22,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  modalitySection: {
    marginTop: 8,
    marginBottom: 24,
  },
  modalityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
  },
  modalityButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalityButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  modalityButtonSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  modalityIcon: {
    marginRight: 6,
  },
  modalityButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#2563eb',
    textAlign: 'center',
  },
  modalityButtonTextSelected: {
    color: '#ffffff',
  },
  submitButton: {
    backgroundColor: '#16a34a',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  quickButtonsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  quickDateButton: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  quickDateButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  quickDateText: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: '600',
  },
  quickDateTextActive: {
    color: '#ffffff',
  },
});
