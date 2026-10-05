import React, { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

interface Jugador {
  id: string;
  nombre: string;
  club?: string;
  telefono?: string;
}

export default function RegistrarJugadoresScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    torneoId?: string;
    nombreTorneo?: string;
    modalidad?: string;
    esPropietario?: string;
  }>();

  const torneoId = params.torneoId || '';
  const nombreTorneo = params.nombreTorneo || 'Torneo de Tenis de Mesa';
  const modalidad = params.modalidad || 'Eliminación directa';
  // Solo el creador del torneo puede gestionar (agregar/eliminar jugadores y finalizar)
  const esPropietario = params.esPropietario === 'true';

  // Estados del formulario para agregar jugador
  const [nombre, setNombre] = useState('');
  const [club, setClub] = useState('');
  const [telefono, setTelefono] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Lista de jugadores obtenidos en tiempo real desde Firestore
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);

  // Escuchar en tiempo real los jugadores del torneo en Firestore
  useEffect(() => {
    if (!torneoId) {
      setCargandoLista(false);
      return;
    }

    const jugadoresRef = collection(db, 'torneos', torneoId, 'jugadores');
    const q = query(jugadoresRef, orderBy('creadoEn', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Jugador[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            nombre: data.nombre || '',
            club: data.club || '',
            telefono: data.telefono || '',
          });
        });
        setJugadores(list);
        setCargandoLista(false);
      },
      (error) => {
        console.error('Error al escuchar jugadores:', error);
        setCargandoLista(false);
      }
    );

    return () => unsubscribe();
  }, [torneoId]);

  // Manejador para agregar un jugador
  const handleAgregarJugador = async () => {
    const nombreTrim = nombre.trim();
    const clubTrim = club.trim();
    const telefonoTrim = telefono.trim();

    if (!nombreTrim) {
      const msg = 'Por favor ingresa el nombre del jugador.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Nombre requerido', msg);
      }
      return;
    }

    if (!torneoId) {
      const msg = 'No se encontró el ID del torneo para registrar jugadores.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
      return;
    }

    setGuardando(true);
    try {
      const jugadoresRef = collection(db, 'torneos', torneoId, 'jugadores');
      await addDoc(jugadoresRef, {
        nombre: nombreTrim,
        club: clubTrim || null,
        telefono: telefonoTrim || null,
        creadoEn: serverTimestamp(),
      });

      // Limpiar campos del formulario
      setNombre('');
      setClub('');
      setTelefono('');
    } catch (err: any) {
      const errorMsg = err.message || 'No se pudo guardar el jugador.';
      if (Platform.OS === 'web') {
        window.alert(`Error: ${errorMsg}`);
      } else {
        Alert.alert('Error al registrar jugador', errorMsg);
      }
    } finally {
      setGuardando(false);
    }
  };

  // Manejador para eliminar un jugador
  const handleEliminarJugador = (jugadorId: string, nombreJugador: string) => {
    const ejecutarEliminacion = async () => {
      try {
        const jugadorRef = doc(db, 'torneos', torneoId, 'jugadores', jugadorId);
        await deleteDoc(jugadorRef);
      } catch (err: any) {
        const errorMsg = err.message || 'No se pudo eliminar el jugador.';
        if (Platform.OS === 'web') {
          window.alert(`Error: ${errorMsg}`);
        } else {
          Alert.alert('Error', errorMsg);
        }
      }
    };

    if (Platform.OS === 'web') {
      const conf = window.confirm(`¿Estás seguro de eliminar a "${nombreJugador}"?`);
      if (conf) {
        ejecutarEliminacion();
      }
      return;
    }

    Alert.alert(
      'Eliminar jugador',
      `¿Deseas remover a "${nombreJugador}" de este torneo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: ejecutarEliminacion },
      ]
    );
  };

  // Finalizar registro de jugadores y volver al menú principal
  const handleFinalizarRegistro = () => {
    if (jugadores.length === 0) {
      const mensaje = 'No has registrado ningún jugador aún. ¿Deseas salir de todos modos?';
      if (Platform.OS === 'web') {
        if (window.confirm(mensaje)) {
          router.replace('/(tabs)');
        }
      } else {
        Alert.alert('Sin jugadores', mensaje, [
          { text: 'Permanecer aquí', style: 'cancel' },
          { text: 'Salir al Menú', style: 'destructive', onPress: () => router.replace('/(tabs)') },
        ]);
      }
      return;
    }

    const exitoMensaje = `¡Registro completado! Se registraron ${jugadores.length} jugador(es) en el torneo "${nombreTorneo}".`;
    if (Platform.OS === 'web') {
      window.alert(exitoMensaje);
      router.replace('/(tabs)');
    } else {
      Alert.alert('¡Excelente!', exitoMensaje, [
        {
          text: 'Ir al Menú Principal',
          onPress: () => router.replace('/(tabs)'),
        },
      ]);
    }
  };

  return (
    <ImageBackground
      source={{
        uri: 'https://images.unsplash.com/photo-1534158914592-062992fbe900?auto=format&fit=crop&w=1200&q=80',
      }}
      style={styles.backgroundImage}
      resizeMode="cover">
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle="light-content" />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}>
            <ScrollView
              contentContainerStyle={styles.scrollContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              
              {/* Botón de retroceso */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace('/(tabs)');
                  }
                }}
                activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={22} color="#ffffff" />
                <Text style={styles.backButtonText}>Volver</Text>
              </TouchableOpacity>

              {/* Tarjeta de Información del Torneo */}
              <View style={styles.tournamentBanner}>
                <View style={styles.trophyCircle}>
                  <Ionicons name="trophy" size={28} color="#2563eb" />
                </View>
                <View style={styles.bannerTextContainer}>
                  <Text style={styles.bannerSubtitle}>
                    {esPropietario ? 'Tu Torneo' : 'Torneo'}
                  </Text>
                  <Text style={styles.bannerTitle} numberOfLines={2}>
                    {nombreTorneo}
                  </Text>
                  <View style={styles.badgeContainer}>
                    <View style={styles.badge}>
                      <Ionicons name="git-network-outline" size={14} color="#1d4ed8" />
                      <Text style={styles.badgeText}>{modalidad}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: '#f0fdf4' }]}>
                      <Ionicons name="people" size={14} color="#16a34a" />
                      <Text style={[styles.badgeText, { color: '#16a34a' }]}>
                        {jugadores.length} {jugadores.length === 1 ? 'jugador' : 'jugadores'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Aviso de solo lectura para visitantes */}
              {!esPropietario && (
                <View style={styles.readOnlyNotice}>
                  <Ionicons name="eye-outline" size={18} color="#64748b" />
                  <Text style={styles.readOnlyNoticeText}>
                    Solo el organizador puede agregar o eliminar jugadores.
                  </Text>
                </View>
              )}

              {/* Formulario de Registro de Jugador — solo para el propietario */}
              {esPropietario && (
                <View style={styles.cardContainer}>
                  <View style={styles.formHeader}>
                    <Ionicons name="person-add" size={22} color="#2563eb" />
                    <Text style={styles.formTitle}>Registrar Nuevo Jugador</Text>
                  </View>

                  {/* Campo: Nombre del Jugador */}
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Nombre completo *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Ej. Juan Pérez"
                      placeholderTextColor="#94a3b8"
                      value={nombre}
                      onChangeText={setNombre}
                      autoCapitalize="words"
                      editable={!guardando}
                    />
                  </View>

                  {/* Campo: Club o Equipo */}
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Club / Equipo / Procedencia (opcional)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Ej. Smash Club Central"
                      placeholderTextColor="#94a3b8"
                      value={club}
                      onChangeText={setClub}
                      editable={!guardando}
                    />
                  </View>

                  {/* Campo: Teléfono o Contacto */}
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Teléfono de contacto (opcional)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Ej. +57 300 123 4567"
                      placeholderTextColor="#94a3b8"
                      value={telefono}
                      onChangeText={setTelefono}
                      keyboardType="phone-pad"
                      editable={!guardando}
                    />
                  </View>

                  {/* Botón para Añadir Jugador */}
                  <TouchableOpacity
                    style={[styles.addButton, guardando && { opacity: 0.7 }]}
                    onPress={handleAgregarJugador}
                    activeOpacity={0.85}
                    disabled={guardando}>
                    {guardando ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
                        <Text style={styles.addButtonText}>Agregar Jugador a la Lista</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Lista de Jugadores Inscritos */}
              <View style={[styles.cardContainer, { marginTop: 18 }]}>
                <View style={styles.listHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="list" size={22} color="#0f172a" />
                    <Text style={styles.listSectionTitle}>Lista de Inscritos</Text>
                  </View>
                  <View style={styles.counterPill}>
                    <Text style={styles.counterPillText}>{jugadores.length}</Text>
                  </View>
                </View>

                {cargandoLista ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#2563eb" />
                    <Text style={styles.loadingText}>Cargando participantes...</Text>
                  </View>
                ) : jugadores.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={44} color="#94a3b8" />
                    <Text style={styles.emptyTitle}>Aún no hay jugadores registrados</Text>
                    <Text style={styles.emptySubtitle}>
                      {esPropietario
                        ? 'Usa el formulario superior para añadir los participantes de este torneo.'
                        : 'El organizador aún no ha registrado jugadores en este torneo.'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.playersList}>
                    {jugadores.map((item, index) => (
                      <View key={item.id} style={styles.playerItem}>
                        <View style={styles.playerIndexBadge}>
                          <Text style={styles.playerIndexText}>#{index + 1}</Text>
                        </View>
                        <View style={styles.playerInfo}>
                          <Text style={styles.playerName}>{item.nombre}</Text>
                          {item.club ? (
                            <View style={styles.metaRow}>
                              <Ionicons name="shield-outline" size={13} color="#64748b" />
                              <Text style={styles.metaText}>{item.club}</Text>
                            </View>
                          ) : null}
                          {item.telefono ? (
                            <View style={styles.metaRow}>
                              <Ionicons name="call-outline" size={13} color="#64748b" />
                              <Text style={styles.metaText}>{item.telefono}</Text>
                            </View>
                          ) : null}
                        </View>
                        {/* Botón de eliminar: solo para el propietario */}
                        {esPropietario && (
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleEliminarJugador(item.id, item.nombre)}
                            activeOpacity={0.7}
                            accessibilityLabel={`Eliminar ${item.nombre}`}>
                            <Ionicons name="trash-outline" size={20} color="#ef4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Botón Finalizar Registro — solo para el propietario */}
              {esPropietario && (
                <TouchableOpacity
                  style={styles.finishButton}
                  onPress={handleFinalizarRegistro}
                  activeOpacity={0.85}>
                  <Ionicons name="checkmark-circle" size={22} color="#ffffff" />
                  <Text style={styles.finishButtonText}>Finalizar y Guardar Torneo</Text>
                </TouchableOpacity>
              )}

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
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  tournamentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  trophyCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
    marginBottom: 6,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  cardContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  formTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 5,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14.5,
    color: '#0f172a',
  },
  addButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  listSectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  counterPill: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  counterPillText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: 26,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  playersList: {
    gap: 10,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  playerIndexBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  playerIndexText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563eb',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
    color: '#64748b',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    marginLeft: 8,
  },
  finishButton: {
    backgroundColor: '#16a34a',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 22,
    elevation: 4,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  finishButtonText: {
    color: '#ffffff',
    fontSize: 16.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  readOnlyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  readOnlyNoticeText: {
    flex: 1,
    color: '#cbd5e1',
    fontSize: 13.5,
    fontWeight: '500',
  },
});
