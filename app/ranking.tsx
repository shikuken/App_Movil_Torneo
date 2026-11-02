import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { SmashTheme } from '../constants/theme';

interface JugadorRanking {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  puntosRanking: number;
  torneosJugados?: number;
  primerosPuestos?: number;
  segundosPuestos?: number;
  tercerosPuestos?: number;
}

export default function RankingScreen() {
  const router = useRouter();
  const [jugadores, setJugadores] = useState<JugadorRanking[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const usuariosRef = collection(db, 'usuarios');
    const q = query(usuariosRef, orderBy('puntosRanking', 'desc'));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const lista: JugadorRanking[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          lista.push({
            id: docSnap.id,
            nombre: d.nombre || '',
            apellido: d.apellido || '',
            email: d.email || '',
            telefono: d.telefono || '',
            puntosRanking: typeof d.puntosRanking === 'number' ? d.puntosRanking : 0,
            torneosJugados: d.torneosJugados || 0,
            primerosPuestos: d.primerosPuestos || 0,
            segundosPuestos: d.segundosPuestos || 0,
            tercerosPuestos: d.tercerosPuestos || 0,
          });
        });

        // Ordenar con precisión: primero por puntos desc, luego por primeros puestos desc
        lista.sort((a, b) => {
          if (b.puntosRanking !== a.puntosRanking) {
            return b.puntosRanking - a.puntosRanking;
          }
          return (b.primerosPuestos || 0) - (a.primerosPuestos || 0);
        });

        setJugadores(lista);
        setCargando(false);
      },
      (error) => {
        console.error('Error al escuchar el ranking de usuarios:', error);
        setCargando(false);
      }
    );

    return () => unsub();
  }, []);

  const jugadoresFiltrados = jugadores.filter((j) => {
    const queryStr = busqueda.toLowerCase().trim();
    if (!queryStr) return true;
    const nombreCompleto = `${j.nombre} ${j.apellido}`.toLowerCase();
    return nombreCompleto.includes(queryStr) || j.email.toLowerCase().includes(queryStr);
  });

  const top1 = jugadores[0] || null;
  const top2 = jugadores[1] || null;
  const top3 = jugadores[2] || null;

  const totalPuntosTemporada = jugadores.reduce((acc, curr) => acc + (curr.puntosRanking || 0), 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowMid} pointerEvents="none" />

      {/* Header Fijo */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)');
          }}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={SmashTheme.colors.onSurface} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Ranking de Jugadores</Text>
          <Text style={styles.headerSubtitle}>Temporada Oficial Smash Match</Text>
        </View>

        <View style={styles.headerBadge}>
          <Ionicons name="podium" size={15} color={SmashTheme.colors.primary} />
          <Text style={styles.headerBadgeText}>{jugadores.length} Atletas</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}>

        {/* Banner Explicativo del Sistema de Puntuación */}
        <View style={styles.rulesBanner}>
          <View style={styles.rulesBannerHeader}>
            <Ionicons name="information-circle" size={18} color={SmashTheme.colors.primary} />
            <Text style={styles.rulesBannerTitle}>SISTEMA DE PUNTOS OFICIAL</Text>
          </View>
          <Text style={styles.rulesBannerDesc}>
            Los puntos se otorgan exclusivamente en Torneos Clasificatorios según la posición final del jugador:
          </Text>
          <View style={styles.rulesPillsRow}>
            <View style={[styles.rulePill, styles.rulePillGold]}>
              <Text style={styles.rulePillMedal}>🥇 1° Puesto</Text>
              <Text style={styles.rulePillPointsGold}>+3 Puntos</Text>
            </View>
            <View style={[styles.rulePill, styles.rulePillSilver]}>
              <Text style={styles.rulePillMedal}>🥈 2° Puesto</Text>
              <Text style={styles.rulePillPointsSilver}>+2 Puntos</Text>
            </View>
            <View style={[styles.rulePill, styles.rulePillBronze]}>
              <Text style={styles.rulePillMedal}>🥉 3° Puesto</Text>
              <Text style={styles.rulePillPointsBronze}>+1 Punto</Text>
            </View>
          </View>
        </View>

        {/* Podio Visual de Líderes */}
        {jugadores.length > 0 && totalPuntosTemporada > 0 && (
          <View style={styles.podiumSection}>
            <Text style={styles.podiumSectionTitle}>PODIO DE LA TEMPORADA</Text>
            <View style={styles.podiumContainer}>
              {/* 2° Lugar (Plata - Izquierda) */}
              <View style={[styles.podiumColumn, styles.podiumCol2]}>
                <View style={styles.podiumAvatarWrapSilver}>
                  <Text style={styles.podiumAvatarInitials}>
                    {top2 ? `${top2.nombre.charAt(0)}${top2.apellido.charAt(0)}`.toUpperCase() : '--'}
                  </Text>
                </View>
                <Text style={styles.podiumPlayerName} numberOfLines={1}>
                  {top2 ? `${top2.nombre} ${top2.apellido}` : 'Sin definir'}
                </Text>
                <View style={styles.podiumPedestalSilver}>
                  <Text style={styles.podiumRankText}>2°</Text>
                  <Text style={styles.podiumPointsValSilver}>{top2?.puntosRanking || 0} PTS</Text>
                </View>
              </View>

              {/* 1° Lugar (Oro - Centro / Elevado) */}
              <View style={[styles.podiumColumn, styles.podiumCol1]}>
                <View style={styles.crownWrap}>
                  <Ionicons name="sparkles" size={16} color={SmashTheme.colors.primary} />
                </View>
                <View style={styles.podiumAvatarWrapGold}>
                  <Text style={styles.podiumAvatarInitialsGold}>
                    {top1 ? `${top1.nombre.charAt(0)}${top1.apellido.charAt(0)}`.toUpperCase() : '--'}
                  </Text>
                </View>
                <Text style={styles.podiumPlayerNameGold} numberOfLines={1}>
                  {top1 ? `${top1.nombre} ${top1.apellido}` : 'Sin definir'}
                </Text>
                <View style={styles.podiumPedestalGold}>
                  <Text style={styles.podiumRankTextGold}>1°</Text>
                  <Text style={styles.podiumPointsValGold}>{top1?.puntosRanking || 0} PTS</Text>
                </View>
              </View>

              {/* 3° Lugar (Bronce - Derecha) */}
              <View style={[styles.podiumColumn, styles.podiumCol3]}>
                <View style={styles.podiumAvatarWrapBronze}>
                  <Text style={styles.podiumAvatarInitials}>
                    {top3 ? `${top3.nombre.charAt(0)}${top3.apellido.charAt(0)}`.toUpperCase() : '--'}
                  </Text>
                </View>
                <Text style={styles.podiumPlayerName} numberOfLines={1}>
                  {top3 ? `${top3.nombre} ${top3.apellido}` : 'Sin definir'}
                </Text>
                <View style={styles.podiumPedestalBronze}>
                  <Text style={styles.podiumRankText}>3°</Text>
                  <Text style={styles.podiumPointsValBronze}>{top3?.puntosRanking || 0} PTS</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Buscador de Atletas */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={SmashTheme.colors.primary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o correo..."
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

        {/* Tabla / Lista de Posiciones */}
        <View style={styles.tableSection}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableColHeader, { width: 44, textAlign: 'center' }]}>POS</Text>
            <Text style={[styles.tableColHeader, { flex: 1, paddingLeft: 8 }]}>JUGADOR</Text>
            <Text style={[styles.tableColHeader, { width: 90, textAlign: 'right' }]}>TOTAL PTS</Text>
          </View>

          {cargando ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={SmashTheme.colors.primary} />
              <Text style={styles.loadingText}>Cargando clasificación oficial...</Text>
            </View>
          ) : jugadoresFiltrados.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="podium-outline" size={44} color={SmashTheme.colors.outline} />
              <Text style={styles.emptyTitle}>
                {busqueda ? `Sin resultados para "${busqueda}"` : 'Aún no hay puntuaciones'}
              </Text>
              <Text style={styles.emptyDesc}>
                {busqueda
                  ? 'Intenta buscar con otro nombre.'
                  : 'Crea o finaliza un torneo clasificatorio para empezar a acumular puntos en el ranking oficial.'}
              </Text>
            </View>
          ) : (
            <View style={styles.tableBody}>
              {jugadoresFiltrados.map((jugador, index) => {
                const posNumber = index + 1;
                const isFirst = posNumber === 1;
                const isSecond = posNumber === 2;
                const isThird = posNumber === 3;
                const hasPoints = jugador.puntosRanking > 0;

                const medal = isFirst ? '🥇' : isSecond ? '🥈' : isThird ? '🥉' : `#${posNumber}`;

                return (
                  <View
                    key={jugador.id}
                    style={[
                      styles.playerRow,
                      isFirst && styles.rowGold,
                      isSecond && styles.rowSilver,
                      isThird && styles.rowBronze,
                      posNumber > 3 && posNumber % 2 === 0 && styles.rowEven,
                    ]}>
                    {/* Posición / Medalla */}
                    <View style={styles.rankBadge}>
                      <Text style={[
                        styles.rankBadgeText,
                        isFirst && { color: SmashTheme.colors.primary, fontWeight: '900' },
                        isSecond && { color: SmashTheme.colors.secondary, fontWeight: '900' },
                        isThird && { color: '#f59e0b', fontWeight: '900' },
                      ]}>
                        {medal}
                      </Text>
                    </View>

                    {/* Info del Jugador */}
                    <View style={styles.playerInfoCol}>
                      <Text style={styles.playerNameText} numberOfLines={1}>
                        {jugador.nombre} {jugador.apellido}
                      </Text>
                      <View style={styles.playerMetaRow}>
                        <Text style={styles.playerEmailText} numberOfLines={1}>
                          {jugador.email}
                        </Text>
                        {(jugador.torneosJugados || 0) > 0 && (
                          <Text style={styles.tournamentsPlayedText}>
                            • {jugador.torneosJugados} {jugador.torneosJugados === 1 ? 'torneo' : 'torneos'}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Total de Puntos Acumulados */}
                    <View style={[
                      styles.totalPointsBadge,
                      hasPoints ? styles.totalPointsBadgeActive : styles.totalPointsBadgeZero,
                    ]}>
                      <Ionicons
                        name="trophy"
                        size={12}
                        color={hasPoints ? SmashTheme.colors.onPrimary : SmashTheme.colors.onSurfaceVariant}
                      />
                      <Text style={[
                        styles.totalPointsText,
                        hasPoints ? styles.totalPointsTextActive : styles.totalPointsTextZero,
                      ]}>
                        {jugador.puntosRanking} PTS
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

      </ScrollView>
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
    opacity: 0.06,
  },
  glowMid: {
    position: 'absolute',
    top: 250,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: SmashTheme.colors.secondary,
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
    fontSize: 17,
    fontWeight: '800',
    color: SmashTheme.colors.onSurface,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: SmashTheme.colors.primary,
    fontWeight: '600',
    marginTop: 1,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(195, 244, 0, 0.1)',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: SmashTheme.colors.borderVolt,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: SmashTheme.colors.primary,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
  },
  rulesBanner: {
    backgroundColor: '#161f33',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(195, 244, 0, 0.3)',
    padding: 14,
    marginBottom: 16,
  },
  rulesBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  rulesBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: SmashTheme.colors.primary,
    letterSpacing: 0.5,
  },
  rulesBannerDesc: {
    fontSize: 11.5,
    color: SmashTheme.colors.onSurfaceVariant,
    lineHeight: 16,
    marginBottom: 10,
  },
  rulesPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rulePill: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  rulePillGold: {
    backgroundColor: 'rgba(195, 244, 0, 0.12)',
    borderColor: SmashTheme.colors.primary,
  },
  rulePillSilver: {
    backgroundColor: 'rgba(76, 215, 246, 0.1)',
    borderColor: SmashTheme.colors.secondary,
  },
  rulePillBronze: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: '#f59e0b',
  },
  rulePillMedal: {
    fontSize: 10.5,
    fontWeight: '700',
    color: SmashTheme.colors.onSurface,
  },
  rulePillPointsGold: {
    fontSize: 12,
    fontWeight: '900',
    color: SmashTheme.colors.primary,
    marginTop: 2,
  },
  rulePillPointsSilver: {
    fontSize: 12,
    fontWeight: '900',
    color: SmashTheme.colors.secondary,
    marginTop: 2,
  },
  rulePillPointsBronze: {
    fontSize: 12,
    fontWeight: '900',
    color: '#f59e0b',
    marginTop: 2,
  },
  podiumSection: {
    marginBottom: 18,
  },
  podiumSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: SmashTheme.colors.onSurfaceVariant,
    letterSpacing: 0.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 14,
  },
  podiumColumn: {
    flex: 1,
    alignItems: 'center',
  },
  podiumCol1: {
    zIndex: 2,
  },
  podiumCol2: {},
  podiumCol3: {},
  crownWrap: {
    marginBottom: 2,
  },
  podiumAvatarWrapGold: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1e2a1e',
    borderWidth: 2,
    borderColor: SmashTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  podiumAvatarWrapSilver: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#172433',
    borderWidth: 1.5,
    borderColor: SmashTheme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  podiumAvatarWrapBronze: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2b2118',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  podiumAvatarInitialsGold: {
    fontSize: 16,
    fontWeight: '900',
    color: SmashTheme.colors.primary,
  },
  podiumAvatarInitials: {
    fontSize: 14,
    fontWeight: '800',
    color: SmashTheme.colors.onSurface,
  },
  podiumPlayerNameGold: {
    fontSize: 12,
    fontWeight: '800',
    color: SmashTheme.colors.primary,
    marginBottom: 6,
    textAlign: 'center',
  },
  podiumPlayerName: {
    fontSize: 11,
    fontWeight: '700',
    color: SmashTheme.colors.onSurface,
    marginBottom: 6,
    textAlign: 'center',
  },
  podiumPedestalGold: {
    width: '100%',
    height: 90,
    backgroundColor: 'rgba(195, 244, 0, 0.18)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: SmashTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  podiumPedestalSilver: {
    width: '100%',
    height: 70,
    backgroundColor: 'rgba(76, 215, 246, 0.12)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: SmashTheme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  podiumPedestalBronze: {
    width: '100%',
    height: 56,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  podiumRankTextGold: {
    fontSize: 20,
    fontWeight: '900',
    color: SmashTheme.colors.primary,
  },
  podiumRankText: {
    fontSize: 16,
    fontWeight: '800',
    color: SmashTheme.colors.onSurface,
  },
  podiumPointsValGold: {
    fontSize: 11,
    fontWeight: '900',
    color: SmashTheme.colors.primary,
  },
  podiumPointsValSilver: {
    fontSize: 10.5,
    fontWeight: '800',
    color: SmashTheme.colors.secondary,
  },
  podiumPointsValBronze: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#f59e0b',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SmashTheme.colors.surfaceContainer,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 14,
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
  tableSection: {
    backgroundColor: '#161f33',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(76, 215, 246, 0.35)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 5,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202a42',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(76, 215, 246, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tableColHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: SmashTheme.colors.primary,
    letterSpacing: 0.3,
  },
  tableBody: {},
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  rowGold: {
    backgroundColor: 'rgba(195, 244, 0, 0.16)',
    borderLeftWidth: 4,
    borderLeftColor: '#c3f400',
  },
  rowSilver: {
    backgroundColor: 'rgba(76, 215, 246, 0.14)',
    borderLeftWidth: 4,
    borderLeftColor: '#4cd7f6',
  },
  rowBronze: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  rowEven: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  rankBadge: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: SmashTheme.colors.onSurfaceVariant,
  },
  playerInfoCol: {
    flex: 1,
    paddingHorizontal: 8,
  },
  playerNameText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  playerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  playerEmailText: {
    fontSize: 11,
    color: SmashTheme.colors.onSurfaceVariant,
    flexShrink: 1,
  },
  tournamentsPlayedText: {
    fontSize: 10.5,
    color: SmashTheme.colors.secondary,
    marginLeft: 4,
    fontWeight: '600',
  },
  totalPointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  totalPointsBadgeActive: {
    backgroundColor: SmashTheme.colors.primary,
  },
  totalPointsBadgeZero: {
    backgroundColor: SmashTheme.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
  },
  totalPointsText: {
    fontSize: 12,
    fontWeight: '900',
  },
  totalPointsTextActive: {
    color: SmashTheme.colors.onPrimary,
  },
  totalPointsTextZero: {
    color: SmashTheme.colors.onSurfaceVariant,
  },
  loadingBox: {
    padding: 30,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: SmashTheme.colors.onSurfaceVariant,
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: SmashTheme.colors.onSurface,
    marginTop: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: SmashTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 260,
  },
});
