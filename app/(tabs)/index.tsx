import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, query, limit, onSnapshot, orderBy } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { SmashTheme } from '../../constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const currentUser = auth.currentUser;

  // Estado del torneo más reciente para el Banner Hero En Vivo
  const [torneoDestacado, setTorneoDestacado] = useState<any>(null);

  useEffect(() => {
    const torneosRef = collection(db, 'torneos');
    const q = query(torneosRef, orderBy('creadoEn', 'desc'), limit(1));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          setTorneoDestacado({ id: docSnap.id, ...docSnap.data() });
        }
      },
      (err) => console.log('Error al consultar torneo destacado:', err)
    );
    return () => unsub();
  }, []);

  const handleProfilePress = () => {
    if (Platform.OS === 'web') {
      const confirmLogout = window.confirm('Sesión activa en Smash Match.\n¿Deseas cerrar tu sesión actual?');
      if (confirmLogout) {
        logout().then(() => {
          router.replace('/login');
        });
      }
      return;
    }

    Alert.alert(
      'Perfil de Usuario',
      `Sesión activa: ${currentUser?.email || 'Organizador'}\n¿Deseas cerrar tu sesión actual?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const handleMenuPress = (optionName: string) => {
    if (optionName === 'Crear torneo') {
      router.push('/crear-torneo');
    } else if (optionName === 'Ver torneo' || optionName === 'Buscar torneo') {
      router.push('/ver-torneos' as any);
    } else if (optionName === 'Ver ranking de jugadores') {
      router.push('/ranking' as any);
    } else if (optionName === 'Noticias') {
      Alert.alert('Noticias Deportivas', 'Nueva edición del torneo Apertura Smash confirmada para el próximo mes.');
    } else {
      Alert.alert(optionName, `Has seleccionado "${optionName}".`);
    }
  };

  // Obtener iniciales del usuario
  const getUserInitials = () => {
    if (!currentUser?.email) return 'SM';
    const parts = currentUser.email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return currentUser.email.substring(0, 2).toUpperCase();
  };

  const getUserDisplayName = () => {
    if (currentUser?.displayName) return currentUser.displayName;
    if (currentUser?.email) return currentUser.email.split('@')[0];
    return 'Organizador';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Círculos de luz neón ambiental */}
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowMid} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}>
        
        {/* Barra Superior / Header estilo Stitch */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getUserInitials()}</Text>
            </View>
            <View>
              <View style={styles.greetingRow}>
                <Text style={styles.greetingText}>Hola, {getUserDisplayName()}</Text>
                <View style={styles.verifiedDot} />
              </View>
              <View style={styles.statusBadgeRow}>
                <Ionicons name="flash" size={12} color={SmashTheme.colors.secondary} />
                <Text style={styles.subGreeting}>Listo para competir hoy</Text>
              </View>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => Alert.alert('Notificaciones', 'No tienes notificaciones pendientes.')}
              activeOpacity={0.7}>
              <Ionicons name="notifications-outline" size={20} color={SmashTheme.colors.onSurface} />
              <View style={styles.notificationDot} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleProfilePress}
              activeOpacity={0.7}>
              <Ionicons name="log-out-outline" size={20} color={SmashTheme.colors.liveRed} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Banner Destacado (Torneo Activo en Vivo) */}
        <View style={styles.heroCard}>
          {/* Acento superior de línea neón degradada */}
          <View style={styles.heroStripe} />

          <View style={styles.heroContent}>
            {/* Tag En Vivo Pulsante */}
            <View style={styles.heroHeaderRow}>
              <View style={styles.liveTag}>
                <View style={styles.pingDotContainer}>
                  <View style={styles.pingDotCore} />
                </View>
                <Text style={styles.liveTagText}>EN VIVO • FASE DE BRACKET</Text>
              </View>

              <View style={styles.courtTag}>
                <Ionicons name="fitness-outline" size={13} color={SmashTheme.colors.secondary} />
                <Text style={styles.courtTagText}>
                  {torneoDestacado?.lugarSede || 'Pistas Centrales'}
                </Text>
              </View>
            </View>

            {/* Título & Datos del Torneo */}
            <Text style={styles.heroTitle} numberOfLines={2}>
              {torneoDestacado?.nombreTorneo || 'Torneo Apertura Smash 2026'}
            </Text>

            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaItem}>
                <Ionicons name="people-outline" size={14} color={SmashTheme.colors.onSurfaceVariant} />
                <Text style={styles.heroMetaText}>
                  {torneoDestacado?.categoria || 'Categoría Abierta'}
                </Text>
              </View>
              <Text style={styles.heroMetaDivider}>•</Text>
              <View style={styles.heroMetaItem}>
                <Ionicons name="git-branch-outline" size={14} color={SmashTheme.colors.primary} />
                <Text style={styles.heroMetaText}>
                  {torneoDestacado?.modalidad || 'Eliminación Directa'}
                </Text>
              </View>
            </View>

            {/* Mini HUD Scoreboard de Demostración */}
            <View style={styles.hudScoreboard}>
              <View style={styles.hudScoreHeader}>
                <Text style={styles.hudScoreTitle}>PARTIDO EN PISTA</Text>
                <Text style={styles.hudScoreRound}>Set 2 en juego</Text>
              </View>

              <View style={styles.hudTeamsRow}>
                {/* Equipo A */}
                <View style={styles.hudTeamInfo}>
                  <View style={styles.hudAvatarA}>
                    <Text style={styles.hudAvatarTextA}>P1</Text>
                  </View>
                  <View style={styles.hudTeamTextContainer}>
                    <Text style={styles.hudTeamName} numberOfLines={1}>M. Gómez</Text>
                    <Text style={styles.hudTeamSub}>Saque</Text>
                  </View>
                </View>

                {/* Marcador Central */}
                <View style={styles.hudScoreNumbers}>
                  <Text style={styles.hudScoreValA}>6</Text>
                  <Text style={styles.hudScoreHyphen}>-</Text>
                  <Text style={styles.hudScoreValB}>4</Text>
                </View>

                {/* Equipo B */}
                <View style={[styles.hudTeamInfo, { justifyContent: 'flex-end' }]}>
                  <View style={[styles.hudTeamTextContainer, { alignItems: 'flex-end' }]}>
                    <Text style={styles.hudTeamName} numberOfLines={1}>A. Silva</Text>
                    <Text style={styles.hudTeamSub}>Resto</Text>
                  </View>
                  <View style={styles.hudAvatarB}>
                    <Text style={styles.hudAvatarTextB}>P2</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Botón de Acción Directa */}
            <TouchableOpacity
              style={styles.heroButton}
              onPress={() => {
                if (torneoDestacado) {
                  router.push({
                    pathname: '/desarrollo-torneo',
                    params: {
                      torneoId: torneoDestacado.id,
                      nombreTorneo: torneoDestacado.nombreTorneo,
                      modalidad: torneoDestacado.modalidad,
                    },
                  });
                } else {
                  router.push('/ver-torneos' as any);
                }
              }}
              activeOpacity={0.85}>
              <Text style={styles.heroButtonText}>Ver Llave en Vivo</Text>
              <Ionicons name="arrow-forward" size={16} color={SmashTheme.colors.onPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Acciones Rápidas (Grid 2 columnas estilo Stitch) */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>ACCIONES RÁPIDAS</Text>
          
          <View style={styles.quickGrid}>
            {/* Opción 1: Crear Torneo */}
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => handleMenuPress('Crear torneo')}
              activeOpacity={0.8}>
              <View style={[styles.quickIconContainer, { backgroundColor: 'rgba(195, 244, 0, 0.12)' }]}>
                <Ionicons name="add-circle" size={26} color={SmashTheme.colors.primary} />
              </View>
              <Text style={styles.quickCardTitle}>Crear Torneo</Text>
              <Text style={styles.quickCardDesc}>Configura sede, fecha y reglas del torneo</Text>
            </TouchableOpacity>

            {/* Opción 2: Ver Torneos */}
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => handleMenuPress('Ver torneo')}
              activeOpacity={0.8}>
              <View style={[styles.quickIconContainer, { backgroundColor: 'rgba(76, 215, 246, 0.12)' }]}>
                <Ionicons name="trophy" size={26} color={SmashTheme.colors.secondary} />
              </View>
              <Text style={styles.quickCardTitle}>Explorar Torneos</Text>
              <Text style={styles.quickCardDesc}>Consulta tablas, brackets y resultados</Text>
            </TouchableOpacity>

            {/* Opción 3: Ranking */}
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => handleMenuPress('Ver ranking de jugadores')}
              activeOpacity={0.8}>
              <View style={[styles.quickIconContainer, { backgroundColor: 'rgba(147, 51, 234, 0.12)' }]}>
                <Ionicons name="podium" size={26} color="#c084fc" />
              </View>
              <Text style={styles.quickCardTitle}>Ranking de Jugadores</Text>
              <Text style={styles.quickCardDesc}>Posiciones oficiales y puntos acumulados</Text>
            </TouchableOpacity>

            {/* Opción 4: Noticias */}
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => handleMenuPress('Noticias')}
              activeOpacity={0.8}>
              <View style={[styles.quickIconContainer, { backgroundColor: 'rgba(234, 88, 12, 0.12)' }]}>
                <Ionicons name="newspaper" size={26} color="#fb923c" />
              </View>
              <Text style={styles.quickCardTitle}>Noticias</Text>
              <Text style={styles.quickCardDesc}>Reglamento, avisos y novedades</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sección Torneos Recientes */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionHeaderTitle}>MIS TORNEOS</Text>
            <TouchableOpacity onPress={() => router.push('/ver-torneos' as any)} activeOpacity={0.7}>
              <Text style={styles.viewAllText}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.tournamentItemCard}
            onPress={() => router.push('/ver-torneos' as any)}
            activeOpacity={0.8}>
            <View style={styles.tournamentItemLeft}>
              <View style={styles.tournamentIconWrapper}>
                <Ionicons name="tennisball-outline" size={20} color={SmashTheme.colors.primary} />
              </View>
              <View style={styles.tournamentItemTexts}>
                <Text style={styles.tournamentItemName}>
                  {torneoDestacado?.nombreTorneo || 'Torneo Apertura Smash'}
                </Text>
                <Text style={styles.tournamentItemSub}>
                  {torneoDestacado?.lugarSede || 'Sede Club Central'} • {torneoDestacado?.modalidad || 'Eliminación Directa'}
                </Text>
              </View>
            </View>
            <View style={styles.statusBadgeLive}>
              <Text style={styles.statusBadgeText}>Activo</Text>
            </View>
          </TouchableOpacity>
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
    top: -40,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: SmashTheme.colors.primary,
    opacity: 0.06,
  },
  glowMid: {
    position: 'absolute',
    top: 280,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: SmashTheme.colors.secondary,
    opacity: 0.05,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 90,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: SmashTheme.colors.surfaceContainerHighest,
    borderWidth: 1.5,
    borderColor: SmashTheme.colors.borderVolt,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: SmashTheme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarText: {
    color: SmashTheme.colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greetingText: {
    fontSize: 16,
    fontWeight: '800',
    color: SmashTheme.colors.onSurface,
  },
  verifiedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SmashTheme.colors.secondary,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  subGreeting: {
    fontSize: 12,
    color: SmashTheme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: SmashTheme.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: SmashTheme.colors.liveRed,
  },
  heroCard: {
    backgroundColor: SmashTheme.colors.surfaceContainerHigh,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 6,
  },
  heroStripe: {
    height: 3,
    width: '100%',
    backgroundColor: SmashTheme.colors.primary,
  },
  heroContent: {
    padding: 18,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SmashTheme.colors.surfaceContainerLowest,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9999,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(195, 244, 0, 0.25)',
  },
  pingDotContainer: {
    width: 8,
    height: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pingDotCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SmashTheme.colors.primary,
  },
  liveTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: SmashTheme.colors.primary,
    letterSpacing: 0.5,
  },
  courtTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SmashTheme.colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  courtTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: SmashTheme.colors.secondary,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: SmashTheme.colors.onSurface,
    lineHeight: 26,
    marginBottom: 8,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroMetaText: {
    fontSize: 12,
    color: SmashTheme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  heroMetaDivider: {
    color: SmashTheme.colors.outline,
  },
  hudScoreboard: {
    backgroundColor: SmashTheme.colors.surfaceContainerLowest,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  hudScoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  hudScoreTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: SmashTheme.colors.onSurfaceVariant,
    letterSpacing: 0.6,
  },
  hudScoreRound: {
    fontSize: 10,
    fontWeight: '700',
    color: SmashTheme.colors.secondary,
  },
  hudTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hudTeamInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hudAvatarA: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: SmashTheme.colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: SmashTheme.colors.primary,
  },
  hudAvatarTextA: {
    fontSize: 11,
    fontWeight: '700',
    color: SmashTheme.colors.primary,
  },
  hudAvatarB: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: SmashTheme.colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: SmashTheme.colors.secondary,
  },
  hudAvatarTextB: {
    fontSize: 11,
    fontWeight: '700',
    color: SmashTheme.colors.secondary,
  },
  hudTeamTextContainer: {
    flex: 1,
  },
  hudTeamName: {
    fontSize: 13,
    fontWeight: '700',
    color: SmashTheme.colors.onSurface,
  },
  hudTeamSub: {
    fontSize: 10,
    color: SmashTheme.colors.onSurfaceVariant,
  },
  hudScoreNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: SmashTheme.colors.surfaceContainerHigh,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  hudScoreValA: {
    fontSize: 20,
    fontWeight: '900',
    color: SmashTheme.colors.primary,
  },
  hudScoreHyphen: {
    fontSize: 16,
    fontWeight: '700',
    color: SmashTheme.colors.onSurfaceVariant,
  },
  hudScoreValB: {
    fontSize: 20,
    fontWeight: '900',
    color: SmashTheme.colors.onSurface,
  },
  heroButton: {
    backgroundColor: SmashTheme.colors.primary,
    borderRadius: 14,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: SmashTheme.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  heroButtonText: {
    color: SmashTheme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: SmashTheme.colors.onSurfaceVariant,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: SmashTheme.colors.primary,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickCard: {
    width: '48%',
    backgroundColor: SmashTheme.colors.surfaceContainerLow,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    padding: 16,
    alignItems: 'flex-start',
  },
  quickIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: SmashTheme.colors.onSurface,
    marginBottom: 4,
  },
  quickCardDesc: {
    fontSize: 11,
    color: SmashTheme.colors.onSurfaceVariant,
    lineHeight: 15,
  },
  tournamentItemCard: {
    backgroundColor: SmashTheme.colors.surfaceContainerLow,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tournamentItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  tournamentIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: SmashTheme.colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tournamentItemTexts: {
    flex: 1,
  },
  tournamentItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: SmashTheme.colors.onSurface,
  },
  tournamentItemSub: {
    fontSize: 11,
    color: SmashTheme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  statusBadgeLive: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(195, 244, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(195, 244, 0, 0.3)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: SmashTheme.colors.primary,
  },
});
