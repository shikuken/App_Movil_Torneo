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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { SmashTheme } from '../constants/theme';

interface Torneo {
  id: string;
  nombreTorneo: string;
  organizador: string;
  lugarSede?: string | null;
  categoria?: string | null;
  modalidad: string;
  tipoTorneo?: string;
  creadoEn?: any;
  usuarioId?: string;
  fechaTorneo?: string | null;
  horaTorneo?: string | null;
  estado?: string;
}

export default function VerTorneosScreen() {
  const router = useRouter();

  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroModalidad, setFiltroModalidad] = useState<'Todos' | 'Eliminación directa' | 'Todos contra todos' | 'Mis torneos'>('Todos');

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
            tipoTorneo: data.tipoTorneo || 'amistoso',
            creadoEn: data.creadoEn || null,
            usuarioId: data.usuarioId || '',
            fechaTorneo: data.fechaTorneo || null,
            horaTorneo: data.horaTorneo || null,
            estado: data.estado || 'creado',
          });
        });

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
      (torneo.fechaTorneo && torneo.fechaTorneo.toLowerCase().includes(queryTexto)) ||
      (torneo.horaTorneo && torneo.horaTorneo.toLowerCase().includes(queryTexto)) ||
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

  const handleSeleccionarTorneo = (torneo: Torneo) => {
    const esPropietario = !!currentUid && torneo.usuarioId === currentUid;
    router.push({
      pathname: '/registrar-jugadores',
      params: {
        torneoId: torneo.id,
        nombreTorneo: torneo.nombreTorneo,
        modalidad: torneo.modalidad,
        tipoTorneo: torneo.tipoTorneo || 'amistoso',
        esPropietario: esPropietario ? 'true' : 'false',
      },
    });
  };

  const handleVerDesarrollo = (torneo: Torneo) => {
    const esPropietario = !!currentUid && torneo.usuarioId === currentUid;
    router.push({
      pathname: '/desarrollo-torneo' as any,
      params: {
        torneoId: torneo.id,
        nombreTorneo: torneo.nombreTorneo,
        modalidad: torneo.modalidad,
        tipoTorneo: torneo.tipoTorneo || 'amistoso',
        esPropietario: esPropietario ? 'true' : 'false',
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      
      {/* Luces de ambiente */}
      <View style={styles.glowTop} pointerEvents="none" />

      {/* Header Fijo */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={SmashTheme.colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Explorar Torneos</Text>
          <Text style={styles.headerSubtitle}>{torneos.length} torneos registrados</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity
            style={styles.rankingHeaderBtn}
            onPress={() => router.push('/ranking' as any)}
            activeOpacity={0.85}>
            <Ionicons name="podium-outline" size={16} color={SmashTheme.colors.secondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => router.push('/crear-torneo')}
            activeOpacity={0.85}>
            <Ionicons name="add" size={16} color={SmashTheme.colors.onPrimary} />
            <Text style={styles.createBtnText}>Crear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>

        {/* Buscador y Filtros estilo Stitch */}
        <View style={styles.searchAndFiltersContainer}>
          {/* Barra de Búsqueda */}
          <View style={styles.searchWrapper}>
            <Ionicons name="search" size={18} color={SmashTheme.colors.onSurfaceVariant} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre, club o sede..."
              placeholderTextColor={SmashTheme.colors.onSurfaceVariant + '80'}
              value={busqueda}
              onChangeText={setBusqueda}
            />
            {busqueda.length > 0 && (
              <TouchableOpacity onPress={() => setBusqueda('')} style={styles.clearSearchBtn}>
                <Ionicons name="close-circle" size={18} color={SmashTheme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filtros Horizontales (Pills) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterPillsContainer}>
            {(['Todos', 'Eliminación directa', 'Todos contra todos', 'Mis torneos'] as const).map((filtro) => {
              const isActive = filtroModalidad === filtro;
              return (
                <TouchableOpacity
                  key={filtro}
                  style={[styles.filterPill, isActive && styles.filterPillActive]}
                  onPress={() => setFiltroModalidad(filtro)}
                  activeOpacity={0.8}>
                  <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                    {filtro === 'Todos' ? `Todos (${torneos.length})` : filtro}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Feed de Torneos */}
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}>
          {cargando ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={SmashTheme.colors.primary} />
              <Text style={styles.loadingText}>Sincronizando torneos en vivo...</Text>
            </View>
          ) : torneosFiltrados.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="trophy-outline" size={48} color={SmashTheme.colors.outline} />
              <Text style={styles.emptyTitle}>No se encontraron torneos</Text>
              <Text style={styles.emptySubtitle}>
                {busqueda
                  ? 'Intenta con otro término de búsqueda.'
                  : 'Crea tu primer torneo deportivo y organízalo en tiempo real.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyCreateBtn}
                onPress={() => router.push('/crear-torneo')}
                activeOpacity={0.85}>
                <Ionicons name="add-circle" size={18} color={SmashTheme.colors.onPrimary} />
                <Text style={styles.emptyCreateBtnText}>Crear Nuevo Torneo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.tournamentsList}>
              {torneosFiltrados.map((torneo) => {
                const esPropietario = !!currentUid && torneo.usuarioId === currentUid;
                const esEliminacion = torneo.modalidad === 'Eliminación directa';

                return (
                  <View key={torneo.id} style={styles.tournamentCard}>
                    {/* Header de la Tarjeta */}
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.badgesRow}>
                        <View style={styles.liveBadge}>
                          <View style={styles.liveDot} />
                          <Text style={styles.liveBadgeText}>ACTIVO</Text>
                        </View>
                        {torneo.tipoTorneo === 'clasificatorio' && (
                          <View style={styles.clasificatorioBadge}>
                            <Ionicons name="ribbon" size={10} color={SmashTheme.colors.primary} />
                            <Text style={styles.clasificatorioBadgeText}>OFICIAL</Text>
                          </View>
                        )}
                        <View style={styles.formatBadge}>
                          <Text style={styles.formatBadgeText}>{torneo.modalidad}</Text>
                        </View>
                      </View>

                      {esPropietario && (
                        <View style={styles.ownerChip}>
                          <Ionicons name="shield-checkmark" size={12} color={SmashTheme.colors.secondary} />
                          <Text style={styles.ownerChipText}>TÚ</Text>
                        </View>
                      )}
                    </View>

                    {/* Título & Meta */}
                    <Text style={styles.cardTournamentTitle} numberOfLines={2}>
                      {torneo.nombreTorneo}
                    </Text>

                    <View style={styles.cardMetaRow}>
                      <View style={styles.metaInfoItem}>
                        <Ionicons name="person-outline" size={13} color={SmashTheme.colors.onSurfaceVariant} />
                        <Text style={styles.metaInfoText}>Org: {torneo.organizador}</Text>
                      </View>
                      {torneo.lugarSede ? (
                        <View style={styles.metaInfoItem}>
                          <Ionicons name="location-outline" size={13} color={SmashTheme.colors.secondary} />
                          <Text style={styles.metaInfoText} numberOfLines={1}>{torneo.lugarSede}</Text>
                        </View>
                      ) : null}
                    </View>

                    {torneo.fechaTorneo ? (
                      <View style={styles.dateRow}>
                        <Ionicons name="calendar-outline" size={13} color={SmashTheme.colors.primary} />
                        <Text style={styles.dateText}>
                          {torneo.fechaTorneo} {torneo.horaTorneo ? `• ${torneo.horaTorneo}` : ''}
                        </Text>
                      </View>
                    ) : null}

                    {/* Botones de Acción */}
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        style={styles.cardActionPrimary}
                        onPress={() => handleVerDesarrollo(torneo)}
                        activeOpacity={0.85}>
                        <Ionicons name="play" size={14} color={SmashTheme.colors.onPrimary} />
                        <Text style={styles.cardActionPrimaryText}>Ver Fixture / Llave</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.cardActionSecondary}
                        onPress={() => handleSeleccionarTorneo(torneo)}
                        activeOpacity={0.8}>
                        <Ionicons name="people-outline" size={15} color={SmashTheme.colors.onSurface} />
                        <Text style={styles.cardActionSecondaryText}>Inscritos</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
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
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: SmashTheme.colors.primary,
    opacity: 0.05,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
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
  rankingHeaderBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: SmashTheme.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SmashTheme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  createBtnText: {
    color: SmashTheme.colors.onPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  clasificatorioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(195, 244, 0, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: SmashTheme.colors.borderVolt,
  },
  clasificatorioBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: SmashTheme.colors.primary,
    letterSpacing: 0.3,
  },
  keyboardView: {
    flex: 1,
  },
  searchAndFiltersContainer: {
    backgroundColor: SmashTheme.colors.surfaceContainerLowest,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: SmashTheme.colors.cardBorder,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SmashTheme.colors.surfaceContainer,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: SmashTheme.colors.onSurface,
    fontSize: 13,
  },
  clearSearchBtn: {
    padding: 4,
  },
  filterPillsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    paddingBottom: 4,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: SmashTheme.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
  },
  filterPillActive: {
    backgroundColor: SmashTheme.colors.primary,
    borderColor: SmashTheme.colors.primary,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: SmashTheme.colors.onSurfaceVariant,
  },
  filterPillTextActive: {
    color: SmashTheme.colors.onPrimary,
    fontWeight: '800',
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: SmashTheme.colors.onSurfaceVariant,
  },
  emptyContainer: {
    padding: 36,
    alignItems: 'center',
    backgroundColor: SmashTheme.colors.surfaceContainerLow,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: SmashTheme.colors.onSurface,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: SmashTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  emptyCreateBtn: {
    marginTop: 18,
    backgroundColor: SmashTheme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyCreateBtnText: {
    color: SmashTheme.colors.onPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  tournamentsList: {
    gap: 14,
  },
  tournamentCard: {
    backgroundColor: SmashTheme.colors.surfaceContainerLow,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(195, 244, 0, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(195, 244, 0, 0.25)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SmashTheme.colors.primary,
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: SmashTheme.colors.primary,
    letterSpacing: 0.5,
  },
  formatBadge: {
    backgroundColor: SmashTheme.colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  formatBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: SmashTheme.colors.onSurfaceVariant,
  },
  ownerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(76, 215, 246, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ownerChipText: {
    fontSize: 9,
    fontWeight: '800',
    color: SmashTheme.colors.secondary,
  },
  cardTournamentTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: SmashTheme.colors.onSurface,
    marginBottom: 8,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  metaInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaInfoText: {
    fontSize: 12,
    color: SmashTheme.colors.onSurfaceVariant,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 14,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '600',
    color: SmashTheme.colors.primary,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cardActionPrimary: {
    flex: 1.5,
    backgroundColor: SmashTheme.colors.primary,
    borderRadius: 12,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cardActionPrimaryText: {
    color: SmashTheme.colors.onPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  cardActionSecondary: {
    flex: 1,
    backgroundColor: SmashTheme.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    borderRadius: 12,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cardActionSecondaryText: {
    color: SmashTheme.colors.onSurface,
    fontSize: 12,
    fontWeight: '700',
  },
});
