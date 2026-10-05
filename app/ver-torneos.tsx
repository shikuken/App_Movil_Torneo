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
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

interface Torneo {
  id: string;
  nombreTorneo: string;
  organizador: string;
  lugarSede?: string | null;
  categoria?: string | null;
  modalidad: string;
  creadoEn?: any;
  usuarioId?: string;
}

export default function VerTorneosScreen() {
  const router = useRouter();

  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroModalidad, setFiltroModalidad] = useState<'Todos' | 'Eliminación directa' | 'Todos contra todos' | 'Mis torneos'>('Todos');

  // Escuchar todos los torneos en tiempo real desde Firestore
  useEffect(() => {
    const torneosRef = collection(db, 'torneos');
    const q = query(torneosRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const lista: Torneo[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          lista.push({
            id: docSnap.id,
            nombreTorneo: data.nombreTorneo || 'Sin nombre',
            organizador: data.organizador || 'Sin organizador',
            lugarSede: data.lugarSede || null,
            categoria: data.categoria || null,
            modalidad: data.modalidad || 'Eliminación directa',
            creadoEn: data.creadoEn || null,
            usuarioId: data.usuarioId || '',
          });
        });

        // Ordenar los torneos más recientes primero
        lista.sort((a, b) => {
          const timeA = a.creadoEn?.seconds || 0;
          const timeB = b.creadoEn?.seconds || 0;
          return timeB - timeA;
        });

        setTorneos(lista);
        setCargando(false);
      },
      (error) => {
        console.error('Error al consultar torneos:', error);
        setCargando(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Función para dar formato legible a la fecha de Firestore
  const formatearFecha = (timestamp: any): string => {
    if (!timestamp) return 'Fecha no registrada';
    try {
      const fecha = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
      return fecha.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Fecha no disponible';
    }
  };

  // Filtrado de torneos en base al texto ingresado y la modalidad
  const currentUid = auth.currentUser?.uid;
  const torneosFiltrados = torneos.filter((torneo) => {
    const queryTexto = busqueda.toLowerCase().trim();
    const fechaTexto = formatearFecha(torneo.creadoEn).toLowerCase();

    const coincideTexto =
      !queryTexto ||
      torneo.nombreTorneo.toLowerCase().includes(queryTexto) ||
      torneo.organizador.toLowerCase().includes(queryTexto) ||
      (torneo.lugarSede && torneo.lugarSede.toLowerCase().includes(queryTexto)) ||
      (torneo.categoria && torneo.categoria.toLowerCase().includes(queryTexto)) ||
      fechaTexto.includes(queryTexto);

    let coincideModalidad: boolean;
    if (filtroModalidad === 'Todos') {
      coincideModalidad = true;
    } else if (filtroModalidad === 'Mis torneos') {
      coincideModalidad = torneo.usuarioId === currentUid;
    } else {
      coincideModalidad = torneo.modalidad === filtroModalidad;
    }

    return coincideTexto && coincideModalidad;
  });

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
            
            {/* Encabezado fijo */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.replace('/(tabs)')}
                activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={22} color="#ffffff" />
                <Text style={styles.backButtonText}>Menú</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Torneos Disponibles</Text>
              <View style={{ width: 60 }} />
            </View>

            {/* Barra de Búsqueda */}
            <View style={styles.searchSection}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar por nombre, sede, organizador o fecha..."
                  placeholderTextColor="#94a3b8"
                  value={busqueda}
                  onChangeText={setBusqueda}
                  autoCorrect={false}
                />
                {busqueda.length > 0 && (
                  <TouchableOpacity onPress={() => setBusqueda('')} style={styles.clearButton}>
                    <Ionicons name="close-circle" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Filtros de Modalidad (Chips) */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterChipsContainer}>
                {/* Chip especial: Mis torneos */}
                <TouchableOpacity
                  style={[
                    styles.chip,
                    styles.chipMisTorneos,
                    filtroModalidad === 'Mis torneos' && styles.chipMisTorneosSelected,
                  ]}
                  onPress={() => setFiltroModalidad('Mis torneos')}
                  activeOpacity={0.75}>
                  <Ionicons
                    name="person"
                    size={13}
                    color={filtroModalidad === 'Mis torneos' ? '#ffffff' : '#f59e0b'}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      { color: filtroModalidad === 'Mis torneos' ? '#ffffff' : '#f59e0b' },
                      filtroModalidad === 'Mis torneos' && { fontWeight: '700' },
                    ]}>
                    Mis torneos
                  </Text>
                </TouchableOpacity>

                {/* Chips de modalidad */}
                {(['Todos', 'Eliminación directa', 'Todos contra todos'] as const).map((modalidad) => (
                  <TouchableOpacity
                    key={modalidad}
                    style={[
                      styles.chip,
                      filtroModalidad === modalidad && styles.chipSelected,
                    ]}
                    onPress={() => setFiltroModalidad(modalidad)}
                    activeOpacity={0.75}>
                    <Text
                      style={[
                        styles.chipText,
                        filtroModalidad === modalidad && styles.chipTextSelected,
                      ]}>
                      {modalidad}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

            </View>

            {/* Lista de Torneos */}
            <ScrollView
              contentContainerStyle={styles.scrollList}
              showsVerticalScrollIndicator={false}>
              
              <View style={styles.counterRow}>
                <Text style={styles.counterText}>
                  {cargando
                    ? 'Cargando torneos...'
                    : `${torneosFiltrados.length} ${
                        torneosFiltrados.length === 1 ? 'torneo encontrado' : 'torneos encontrados'
                      }`}
                </Text>
              </View>

              {cargando ? (
                <View style={styles.centerContainer}>
                  <ActivityIndicator size="large" color="#2563eb" />
                  <Text style={styles.centerText}>Consultando torneos en la nube...</Text>
                </View>
              ) : torneosFiltrados.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="trophy-outline" size={54} color="#94a3b8" />
                  <Text style={styles.emptyTitle}>No se encontraron torneos</Text>
                  <Text style={styles.emptySubtitle}>
                    {busqueda
                      ? 'No hay resultados que coincidan con tu búsqueda. Intenta con otros términos.'
                      : filtroModalidad === 'Mis torneos'
                      ? '¡Aún no has creado ningún torneo! Crea uno desde el menú principal.'
                      : 'Aún no se ha creado ningún torneo. ¡Crea el primero desde el menú principal!'}
                  </Text>
                </View>
              ) : (
                torneosFiltrados.map((torneo) => (
                  <View key={torneo.id} style={styles.tournamentCard}>
                    {/* Encabezado de la tarjeta */}
                    <View style={styles.cardHeader}>
                      <View style={styles.cardTitleContainer}>
                        <Text style={styles.tournamentName} numberOfLines={2}>
                          {torneo.nombreTorneo}
                        </Text>
                        <Text style={styles.organizerText}>
                          <Ionicons name="person" size={13} color="#2563eb" /> {torneo.organizador}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.modalityBadge,
                          torneo.modalidad === 'Todos contra todos'
                            ? styles.badgeRoundRobin
                            : styles.badgeDirect,
                        ]}>
                        <Text
                          style={[
                            styles.modalityBadgeText,
                            torneo.modalidad === 'Todos contra todos'
                              ? styles.badgeRoundRobinText
                              : styles.badgeDirectText,
                          ]}>
                          {torneo.modalidad}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Detalles del Torneo */}
                    <View style={styles.cardDetails}>
                      {torneo.lugarSede ? (
                        <View style={styles.detailRow}>
                          <Ionicons name="location-outline" size={16} color="#64748b" />
                          <Text style={styles.detailText}>
                            <Text style={styles.detailBold}>Sede: </Text>
                            {torneo.lugarSede}
                          </Text>
                        </View>
                      ) : null}

                      {torneo.categoria ? (
                        <View style={styles.detailRow}>
                          <Ionicons name="pricetag-outline" size={16} color="#64748b" />
                          <Text style={styles.detailText}>
                            <Text style={styles.detailBold}>Categoría: </Text>
                            {torneo.categoria}
                          </Text>
                        </View>
                      ) : null}

                      <View style={styles.detailRow}>
                        <Ionicons name="calendar-outline" size={16} color="#64748b" />
                        <Text style={styles.detailText}>
                          <Text style={styles.detailBold}>Creado: </Text>
                          {formatearFecha(torneo.creadoEn)}
                        </Text>
                      </View>
                    </View>

                    {/* Botón: Gestionar (solo propietario) o Ver (solo lectura) */}
                    {(() => {
                      const currentUid = auth.currentUser?.uid;
                      const esPropietario = !!currentUid && currentUid === torneo.usuarioId;
                      return esPropietario ? (
                        <TouchableOpacity
                          style={styles.cardButton}
                          onPress={() => {
                            router.push({
                              pathname: '/registrar-jugadores' as any,
                              params: {
                                torneoId: torneo.id,
                                nombreTorneo: torneo.nombreTorneo,
                                modalidad: torneo.modalidad,
                                esPropietario: 'true',
                              },
                            });
                          }}
                          activeOpacity={0.85}>
                          <Ionicons name="settings" size={18} color="#ffffff" />
                          <Text style={styles.cardButtonText}>Gestionar Torneo</Text>
                          <Ionicons name="chevron-forward" size={18} color="#ffffff" />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.cardButtonReadOnly}
                          onPress={() => {
                            router.push({
                              pathname: '/registrar-jugadores' as any,
                              params: {
                                torneoId: torneo.id,
                                nombreTorneo: torneo.nombreTorneo,
                                modalidad: torneo.modalidad,
                                esPropietario: 'false',
                              },
                            });
                          }}
                          activeOpacity={0.85}>
                          <Ionicons name="people" size={18} color="#2563eb" />
                          <Text style={styles.cardButtonReadOnlyText}>Ver Participantes</Text>
                          <Ionicons name="chevron-forward" size={18} color="#2563eb" />
                        </TouchableOpacity>
                      );
                    })()}

                  </View>
                ))
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
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  searchSection: {
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    color: '#0f172a',
  },
  clearButton: {
    padding: 4,
  },
  filterChipsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 10,
  },
  chip: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  chipSelected: {
    backgroundColor: '#2563eb',
  },
  chipText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  chipMisTorneos: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  chipMisTorneosSelected: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  scrollList: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  counterRow: {
    marginBottom: 12,
  },
  counterText: {
    color: '#94a3b8',
    fontSize: 13.5,
    fontWeight: '600',
  },
  centerContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  centerText: {
    color: '#cbd5e1',
    fontSize: 14.5,
  },
  emptyContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: 13.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  tournamentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleContainer: {
    flex: 1,
    paddingRight: 10,
  },
  tournamentName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  organizerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
    marginTop: 3,
  },
  modalityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  badgeDirect: {
    backgroundColor: '#eff6ff',
  },
  badgeDirectText: {
    color: '#1d4ed8',
    fontSize: 11.5,
    fontWeight: '700',
  },
  badgeRoundRobin: {
    backgroundColor: '#f0fdf4',
  },
  badgeRoundRobinText: {
    color: '#16a34a',
    fontSize: 11.5,
    fontWeight: '700',
  },
  modalityBadgeText: {},
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  cardDetails: {
    gap: 6,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13.5,
    color: '#475569',
  },
  detailBold: {
    fontWeight: '700',
    color: '#334155',
  },
  cardButton: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  cardButtonText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '700',
  },
  cardButtonReadOnly: {
    borderWidth: 1.5,
    borderColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
  },
  cardButtonReadOnlyText: {
    color: '#2563eb',
    fontSize: 14.5,
    fontWeight: '700',
  },
});
