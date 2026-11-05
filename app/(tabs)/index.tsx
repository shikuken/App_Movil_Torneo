import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  StatusBar,
  Image,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  collection,
  query,
  limit,
  onSnapshot,
  orderBy,
  where,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { SmashTheme } from '../../constants/theme';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';
import { Producto, DEFAULT_PRODUCTS } from '../../constants/tienda';

interface NotificacionItem {
  id: string;
  usuarioId: string;
  email?: string;
  tipo?: string;
  titulo?: string;
  mensaje: string;
  torneoId?: string;
  nombreTorneo?: string;
  organizador?: string;
  lugarSede?: string;
  categoria?: string;
  modalidad?: string;
  tipoTorneo?: string;
  fechaTorneo?: string;
  horaTorneo?: string;
  estadoTorneo?: string;
  leida: boolean;
  creadoEn: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const { logout, perfil } = useAuth();
  const { showToast, showInfo } = useToast();
  const [modalLogoutVisible, setModalLogoutVisible] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const currentUser = auth.currentUser;

  // Estado del torneo más reciente para la sección inferior "Mis Torneos"
  const [torneoDestacado, setTorneoDestacado] = useState<any>(null);

  // Estado para el Carrusel de Novedades de la Tienda (Últimos 3 productos fijos con fotos)
  const productosTienda: Producto[] = DEFAULT_PRODUCTS.slice(0, 3);
  const [slideActivo, setSlideActivo] = useState(0);
  const carouselRef = useRef<any>(null);
  const screenWidth = Dimensions.get('window').width;
  const [cardWidth, setCardWidth] = useState(screenWidth - 36);

  // Estado del Sistema de Notificaciones en la App
  const [notificaciones, setNotificaciones] = useState<NotificacionItem[]>([]);
  const [modalNotifVisible, setModalNotifVisible] = useState(false);
  const [torneoDetalleModal, setTorneoDetalleModal] = useState<NotificacionItem | null>(null);

  // Escuchar torneo más reciente para la sección "Mis Torneos"
  useEffect(() => {
    if (!currentUser) return;
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
      (err) => {
        if (err.code !== 'permission-denied') {
          console.log('Error al consultar torneo destacado:', err);
        }
      }
    );
    return () => unsub();
  }, [currentUser]);

  // Escuchar notificaciones del usuario actual en tiempo real
  useEffect(() => {
    if (!currentUser?.uid) {
      setNotificaciones([]);
      return;
    }

    const notifRef = collection(db, 'notificaciones');
    const q = query(notifRef, where('usuarioId', '==', currentUser.uid));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: NotificacionItem[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<NotificacionItem, 'id'>),
        }));
        // Ordenar descendentemente por fecha de creación
        list.sort((a, b) => (b.creadoEn || 0) - (a.creadoEn || 0));
        setNotificaciones(list);
      },
      (err) => console.log('Error al escuchar notificaciones:', err)
    );

    return () => unsub();
  }, [currentUser?.uid]);

  const noLeidasCount = notificaciones.filter((n) => !n.leida).length;

  // Avance automático fluido del carrusel cada 5 segundos
  useEffect(() => {
    if (productosTienda.length <= 1) return;
    const timer = setInterval(() => {
      setSlideActivo((prev) => {
        const next = (prev + 1) % productosTienda.length;
        carouselRef.current?.scrollTo({ x: next * cardWidth, animated: true });
        return next;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [productosTienda.length, cardWidth]);

  const handleCarouselScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / cardWidth);
    if (index !== slideActivo && index >= 0 && index < productosTienda.length) {
      setSlideActivo(index);
    }
  };

  const handleProfilePress = () => {
    setModalLogoutVisible(true);
  };

  const handleConfirmLogout = async () => {
    setCerrandoSesion(true);
    try {
      await logout();
      setModalLogoutVisible(false);
      router.replace('/login');
    } catch (e: any) {
      console.error('Error al cerrar sesión:', e);
      setModalLogoutVisible(false);
    } finally {
      setCerrandoSesion(false);
    }
  };

  const handleMenuPress = (optionName: string) => {
    if (optionName === 'Crear torneo') {
      router.push('/crear-torneo');
    } else if (optionName === 'Ver torneo' || optionName === 'Buscar torneo') {
      router.push('/ver-torneos' as any);
    } else if (optionName === 'Ver ranking de jugadores') {
      router.push('/ranking' as any);
    } else if (optionName === 'Tienda') {
      router.push('/tienda');
    } else {
      showInfo(`Has seleccionado "${optionName}".`, optionName);
    }
  };

  // Al presionar una notificación: se marca como leída y se abre la info del torneo
  const handlePressNotificacion = async (notif: NotificacionItem) => {
    if (!notif.leida) {
      try {
        await updateDoc(doc(db, 'notificaciones', notif.id), { leida: true });
      } catch (err) {
        console.log('Error al marcar leída:', err);
      }
    }
    setModalNotifVisible(false);
    setTorneoDetalleModal(notif);
  };

  // Marcar todas las notificaciones como leídas
  const handleMarcarTodasLeidas = async () => {
    const noLeidas = notificaciones.filter((n) => !n.leida);
    for (const item of noLeidas) {
      try {
        await updateDoc(doc(db, 'notificaciones', item.id), { leida: true });
      } catch (e) {
        console.log(e);
      }
    }
  };

  // Formato de tiempo relativo
  const formatearFechaRelativa = (timestamp: number) => {
    if (!timestamp) return 'Reciente';
    const diff = Date.now() - timestamp;
    const minutos = Math.floor(diff / 60000);
    if (minutos < 1) return 'Hace un momento';
    if (minutos < 60) return `Hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `Hace ${horas} h`;
    const dias = Math.floor(horas / 24);
    if (dias === 1) return 'Ayer';
    if (dias < 7) return `Hace ${dias} días`;
    const d = new Date(timestamp);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
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
    if (perfil?.nombre) return perfil.nombre;
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
          <TouchableOpacity
            style={styles.userInfo}
            onPress={() => router.push('/perfil' as any)}
            activeOpacity={0.8}>
            <View style={styles.avatar}>
              {perfil?.fotoUrl ? (
                <Image source={{ uri: perfil.fotoUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{getUserInitials()}</Text>
              )}
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
          </TouchableOpacity>

          <View style={styles.headerActions}>
            {/* Botón de Notificaciones con Indicador Neón */}
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setModalNotifVisible(true)}
              activeOpacity={0.7}
              accessibilityLabel="Notificaciones">
              <Ionicons
                name={noLeidasCount > 0 ? "notifications" : "notifications-outline"}
                size={20}
                color={noLeidasCount > 0 ? SmashTheme.colors.primary : SmashTheme.colors.onSurface}
              />
              {noLeidasCount > 0 && (
                <View style={styles.notificationDotBadge}>
                  <Text style={styles.notificationDotText}>
                    {noLeidasCount > 9 ? '9+' : noLeidasCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleProfilePress}
              activeOpacity={0.7}
              accessibilityLabel="Cerrar Sesión">
              <Ionicons name="log-out-outline" size={20} color={SmashTheme.colors.liveRed} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Carrusel de Novedades de la Tienda (Reemplaza el recuadro del torneo en vivo) */}
        <View
          style={styles.carouselSection}
          onLayout={(e) => {
            const width = e.nativeEvent.layout.width;
            if (width > 0 && Math.abs(width - cardWidth) > 2) {
              setCardWidth(width);
            }
          }}>
          <ScrollView
            ref={carouselRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleCarouselScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            style={styles.carouselScrollView}>
            {productosTienda.map((prod, index) => {
              const prodColor = prod.color || SmashTheme.colors.primary;
              return (
                <View key={prod.id || index} style={[styles.heroCard, { width: cardWidth }]}>
                  {/* Acento superior de línea neón degradada */}
                  <View style={[styles.heroStripe, { backgroundColor: prodColor }]} />

                  <View style={styles.heroContent}>
                    {/* Header del producto en el carrusel */}
                    <View style={styles.heroHeaderRow}>
                      <View style={styles.liveTag}>
                        <Ionicons name="sparkles" size={12} color={SmashTheme.colors.primary} />
                        <Text style={styles.liveTagText}>
                          {prod.badge || 'NOVEDAD EN TIENDA'}
                        </Text>
                      </View>

                      <View style={styles.courtTag}>
                        <Ionicons name="pricetag-outline" size={12} color={prodColor} />
                        <Text style={[styles.courtTagText, { color: prodColor }]}>
                          {prod.category}
                        </Text>
                      </View>
                    </View>

                    {/* Contenido principal del producto (Imagen + Textos) */}
                    <View style={styles.productCarouselRow}>
                      <View style={styles.productCarouselImageWrapper}>
                        {prod.fotoUrl ? (
                          <Image
                            source={{ uri: prod.fotoUrl }}
                            style={styles.productCarouselImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View
                            style={[
                              styles.productCarouselFallback,
                              { backgroundColor: `${prodColor}20` },
                            ]}>
                            <Ionicons name="tennisball-outline" size={40} color={prodColor} />
                          </View>
                        )}
                      </View>

                      <View style={styles.productCarouselInfo}>
                        <Text style={styles.productCarouselTitle} numberOfLines={2}>
                          {prod.name}
                        </Text>
                        <Text style={styles.productCarouselDesc} numberOfLines={2}>
                          {prod.description}
                        </Text>
                        <View style={styles.productCarouselPriceBadge}>
                          <Text style={styles.productCarouselPriceLabel}>Precio:</Text>
                          <Text style={styles.productCarouselPriceValue}>
                            {prod.price}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Botón CTA del carrusel */}
                    <TouchableOpacity
                      style={styles.heroButton}
                      onPress={() => router.push('/tienda')}
                      activeOpacity={0.85}>
                      <Ionicons name="basket-outline" size={18} color={SmashTheme.colors.onPrimary} />
                      <Text style={styles.heroButtonText}>Ver en la Tienda</Text>
                      <Ionicons name="arrow-forward" size={16} color={SmashTheme.colors.onPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Indicadores de Paginación del Carrusel (Dots Neón) */}
          <View style={styles.carouselDotsRow}>
            {productosTienda.map((_, dotIndex) => (
              <TouchableOpacity
                key={dotIndex}
                onPress={() => {
                  setSlideActivo(dotIndex);
                  carouselRef.current?.scrollTo({ x: dotIndex * cardWidth, animated: true });
                }}
                activeOpacity={0.7}
                style={[
                  styles.carouselDot,
                  slideActivo === dotIndex && styles.carouselDotActive,
                ]}
              />
            ))}
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

            {/* Opción 4: Tienda */}
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => handleMenuPress('Tienda')}
              activeOpacity={0.8}>
              <View style={[styles.quickIconContainer, { backgroundColor: 'rgba(234, 88, 12, 0.12)' }]}>
                <Ionicons name="basket" size={26} color="#fb923c" />
              </View>
              <Text style={styles.quickCardTitle}>Tienda</Text>
              <Text style={styles.quickCardDesc}>Equipamiento para tenis de mesa</Text>
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

      {/* MODAL 1: MENÚ DESPLEGABLE DE NOTIFICACIONES */}
      <Modal
        visible={modalNotifVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalNotifVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setModalNotifVisible(false)}>
          <View style={styles.notifBackdrop}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.notifDropdownCard}>
                <View style={styles.heroStripe} />

                {/* Encabezado del menú desplegable */}
                <View style={styles.notifHeaderRow}>
                  <View style={styles.notifTitleGroup}>
                    <Ionicons name="notifications" size={19} color={SmashTheme.colors.primary} />
                    <Text style={styles.notifMenuTitle}>Notificaciones</Text>
                    {noLeidasCount > 0 && (
                      <View style={styles.notifCountPill}>
                        <Text style={styles.notifCountText}>
                          {noLeidasCount} {noLeidasCount === 1 ? 'nueva' : 'nuevas'}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.notifActionsRight}>
                    {noLeidasCount > 0 && (
                      <TouchableOpacity
                        onPress={handleMarcarTodasLeidas}
                        activeOpacity={0.7}
                        style={styles.marcarLeidasBtn}>
                        <Text style={styles.marcarLeidasText}>Marcar leídas</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => setModalNotifVisible(false)}
                      style={styles.closeNotifBtn}
                      activeOpacity={0.7}>
                      <Ionicons name="close" size={20} color={SmashTheme.colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Lista de Notificaciones */}
                <ScrollView
                  style={styles.notifListScroll}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 10 }}>
                  {notificaciones.length === 0 ? (
                    <View style={styles.notifEmptyBox}>
                      <View style={styles.notifEmptyIcon}>
                        <Ionicons
                          name="notifications-off-outline"
                          size={34}
                          color={SmashTheme.colors.onSurfaceVariant}
                        />
                      </View>
                      <Text style={styles.notifEmptyTitle}>No tienes notificaciones</Text>
                      <Text style={styles.notifEmptySub}>
                        Cuando te registren a un torneo clasificatorio, te aparecerá aquí la notificación oficial con todos los detalles.
                      </Text>
                    </View>
                  ) : (
                    notificaciones.map((notif) => {
                      return (
                        <TouchableOpacity
                          key={notif.id}
                          style={[
                            styles.notifItemCard,
                            !notif.leida && styles.notifItemUnread,
                          ]}
                          onPress={() => handlePressNotificacion(notif)}
                          activeOpacity={0.75}>
                          <View
                            style={[
                              styles.notifIconWrap,
                              !notif.leida && styles.notifIconWrapUnread,
                            ]}>
                            <Ionicons
                              name="trophy"
                              size={18}
                              color={!notif.leida ? SmashTheme.colors.primary : SmashTheme.colors.secondary}
                            />
                          </View>

                          <View style={styles.notifTextWrap}>
                            <View style={styles.notifItemHeader}>
                              <Text style={styles.notifItemType}>TORNEO CLASIFICATORIO</Text>
                              {!notif.leida && <View style={styles.unreadDotPulse} />}
                            </View>
                            <Text style={styles.notifItemMessage} numberOfLines={2}>
                              {notif.mensaje}
                            </Text>
                            <View style={styles.notifItemFooter}>
                              <Text style={styles.notifItemTime}>
                                {formatearFechaRelativa(notif.creadoEn)}
                              </Text>
                              <View style={styles.verTorneoLink}>
                                <Text style={styles.verTorneoLinkText}>Ver información</Text>
                                <Ionicons name="chevron-forward" size={13} color={SmashTheme.colors.primary} />
                              </View>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* MODAL 2: INFORMACIÓN DEL TORNEO DESDE LA NOTIFICACIÓN */}
      <Modal
        visible={!!torneoDetalleModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTorneoDetalleModal(null)}>
        <TouchableWithoutFeedback onPress={() => setTorneoDetalleModal(null)}>
          <View style={styles.notifBackdrop}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.torneoDetalleCard}>
                <View style={styles.heroStripe} />

                {/* Cabecera del Torneo */}
                <View style={styles.torneoDetalleHeader}>
                  <View style={styles.torneoDetalleBadge}>
                    <Ionicons name="trophy" size={13} color={SmashTheme.colors.primary} />
                    <Text style={styles.torneoDetalleBadgeText}>CLASIFICATORIO OFICIAL</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setTorneoDetalleModal(null)}
                    style={styles.closeNotifBtn}
                    activeOpacity={0.7}>
                    <Ionicons name="close" size={22} color={SmashTheme.colors.onSurface} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.torneoDetalleTitle}>
                  {torneoDetalleModal?.nombreTorneo || 'Torneo Smash Match'}
                </Text>

                <Text style={styles.torneoDetalleSub}>
                  Has sido registrado como participante oficial en este torneo. Los resultados sumarán puntos al ranking general.
                </Text>

                {/* Grilla de Datos del Torneo */}
                <View style={styles.torneoInfoGrid}>
                  {/* Modalidad */}
                  <View style={styles.torneoInfoRow}>
                    <View style={styles.torneoInfoIcon}>
                      <Ionicons name="git-branch-outline" size={18} color={SmashTheme.colors.secondary} />
                    </View>
                    <View style={styles.torneoInfoTexts}>
                      <Text style={styles.torneoInfoLabel}>MODALIDAD</Text>
                      <Text style={styles.torneoInfoValue}>
                        {torneoDetalleModal?.modalidad || 'Eliminación directa'}
                      </Text>
                    </View>
                  </View>

                  {/* Categoría */}
                  <View style={styles.torneoInfoRow}>
                    <View style={styles.torneoInfoIcon}>
                      <Ionicons name="people-outline" size={18} color="#c084fc" />
                    </View>
                    <View style={styles.torneoInfoTexts}>
                      <Text style={styles.torneoInfoLabel}>CATEGORÍA</Text>
                      <Text style={styles.torneoInfoValue}>
                        {torneoDetalleModal?.categoria || 'Abierta / Intermedia'}
                      </Text>
                    </View>
                  </View>

                  {/* Sede */}
                  <View style={styles.torneoInfoRow}>
                    <View style={styles.torneoInfoIcon}>
                      <Ionicons name="location-outline" size={18} color="#fb923c" />
                    </View>
                    <View style={styles.torneoInfoTexts}>
                      <Text style={styles.torneoInfoLabel}>SEDE / LUGAR</Text>
                      <Text style={styles.torneoInfoValue}>
                        {torneoDetalleModal?.lugarSede || 'Pistas Centrales'}
                      </Text>
                    </View>
                  </View>

                  {/* Fecha y Hora si existen */}
                  {(torneoDetalleModal?.fechaTorneo || torneoDetalleModal?.horaTorneo) ? (
                    <View style={styles.torneoInfoRow}>
                      <View style={styles.torneoInfoIcon}>
                        <Ionicons name="calendar-outline" size={18} color={SmashTheme.colors.primary} />
                      </View>
                      <View style={styles.torneoInfoTexts}>
                        <Text style={styles.torneoInfoLabel}>FECHA Y HORA</Text>
                        <Text style={styles.torneoInfoValue}>
                          {[torneoDetalleModal?.fechaTorneo, torneoDetalleModal?.horaTorneo]
                            .filter(Boolean)
                            .join(' • ')}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {/* Organizador si existe */}
                  {torneoDetalleModal?.organizador ? (
                    <View style={styles.torneoInfoRow}>
                      <View style={styles.torneoInfoIcon}>
                        <Ionicons name="person-circle-outline" size={18} color={SmashTheme.colors.onSurfaceVariant} />
                      </View>
                      <View style={styles.torneoInfoTexts}>
                        <Text style={styles.torneoInfoLabel}>ORGANIZADOR</Text>
                        <Text style={styles.torneoInfoValue}>
                          {torneoDetalleModal.organizador}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>

                {/* Botones de Acción */}
                <View style={styles.torneoDetalleActions}>
                  <TouchableOpacity
                    style={styles.torneoDetallePrimaryBtn}
                    onPress={() => {
                      const tId = torneoDetalleModal?.torneoId;
                      const nom = torneoDetalleModal?.nombreTorneo;
                      const mod = torneoDetalleModal?.modalidad;
                      setTorneoDetalleModal(null);
                      if (tId) {
                        router.push({
                          pathname: '/desarrollo-torneo',
                          params: {
                            torneoId: tId,
                            nombreTorneo: nom,
                            modalidad: mod,
                            tipoTorneo: 'clasificatorio',
                          },
                        });
                      } else {
                        router.push('/ver-torneos' as any);
                      }
                    }}
                    activeOpacity={0.85}>
                    <Ionicons name="play-circle" size={18} color={SmashTheme.colors.onPrimary} />
                    <Text style={styles.torneoDetallePrimaryBtnText}>Ver Cuadro y Partidos</Text>
                    <Ionicons name="arrow-forward" size={16} color={SmashTheme.colors.onPrimary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.torneoDetalleSecondaryBtn}
                    onPress={() => setTorneoDetalleModal(null)}
                    activeOpacity={0.75}>
                    <Text style={styles.torneoDetalleSecondaryBtnText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal Personalizado de Confirmación de Cerrar Sesión */}
      <ConfirmModal
        visible={modalLogoutVisible}
        title="Cerrar Sesión"
        message={`¿Estás seguro de que deseas salir?\nSesión: ${currentUser?.email || 'Usuario'}`}
        confirmText="Cerrar Sesión"
        cancelText="Cancelar"
        type="danger"
        icon="log-out-outline"
        loading={cerrandoSesion}
        onCancel={() => setModalLogoutVisible(false)}
        onConfirm={handleConfirmLogout}
      />
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
    overflow: 'hidden',
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
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
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
  notificationDotBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: SmashTheme.colors.liveRed,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: SmashTheme.colors.surface,
  },
  notificationDotText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },

  // Carrusel Hero Section
  carouselSection: {
    marginBottom: 24,
  },
  carouselScrollView: {
    borderRadius: 22,
  },
  heroCard: {
    backgroundColor: SmashTheme.colors.surfaceContainerHigh,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    overflow: 'hidden',
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
    padding: 16,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
  },
  courtTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  // Fila del Producto en Carrusel
  productCarouselRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  productCarouselImageWrapper: {
    width: 104,
    height: 104,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: SmashTheme.colors.surfaceContainerLowest,
    borderWidth: 1.5,
    borderColor: 'rgba(195, 244, 0, 0.25)',
  },
  productCarouselImage: {
    width: '100%',
    height: '100%',
  },
  productCarouselFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productCarouselInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productCarouselTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: SmashTheme.colors.onSurface,
    lineHeight: 21,
    marginBottom: 4,
  },
  productCarouselDesc: {
    fontSize: 11,
    color: SmashTheme.colors.onSurfaceVariant,
    lineHeight: 15,
    marginBottom: 8,
  },
  productCarouselPriceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(195, 244, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(195, 244, 0, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  productCarouselPriceLabel: {
    fontSize: 10,
    color: SmashTheme.colors.onSurfaceVariant,
    fontWeight: '700',
  },
  productCarouselPriceValue: {
    fontSize: 13,
    fontWeight: '900',
    color: SmashTheme.colors.primary,
  },

  heroButton: {
    backgroundColor: SmashTheme.colors.primary,
    borderRadius: 14,
    height: 44,
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
    fontSize: 13,
    fontWeight: '800',
  },
  carouselDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  carouselDotActive: {
    width: 22,
    height: 6,
    borderRadius: 3,
    backgroundColor: SmashTheme.colors.primary,
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

  // ==========================================
  // ESTILOS: MENÚ DESPLEGABLE DE NOTIFICACIONES
  // ==========================================
  notifBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  notifDropdownCard: {
    width: '100%',
    maxHeight: '82%',
    backgroundColor: SmashTheme.colors.surfaceContainerHigh,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  notifTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifMenuTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: SmashTheme.colors.onSurface,
  },
  notifCountPill: {
    backgroundColor: 'rgba(195, 244, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(195, 244, 0, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  notifCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: SmashTheme.colors.primary,
  },
  notifActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  marcarLeidasBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  marcarLeidasText: {
    fontSize: 11,
    fontWeight: '700',
    color: SmashTheme.colors.secondary,
  },
  closeNotifBtn: {
    padding: 4,
  },
  notifListScroll: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  notifEmptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  notifEmptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: SmashTheme.colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
  },
  notifEmptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: SmashTheme.colors.onSurface,
    marginBottom: 6,
  },
  notifEmptySub: {
    fontSize: 12,
    color: SmashTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
  },
  notifItemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: SmashTheme.colors.surfaceContainerLow,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    gap: 12,
  },
  notifItemUnread: {
    borderColor: 'rgba(195, 244, 0, 0.35)',
    backgroundColor: 'rgba(195, 244, 0, 0.04)',
  },
  notifIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: SmashTheme.colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
  },
  notifIconWrapUnread: {
    borderColor: SmashTheme.colors.primary,
    backgroundColor: 'rgba(195, 244, 0, 0.12)',
  },
  notifTextWrap: {
    flex: 1,
  },
  notifItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  notifItemType: {
    fontSize: 9,
    fontWeight: '900',
    color: SmashTheme.colors.secondary,
    letterSpacing: 0.6,
  },
  unreadDotPulse: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: SmashTheme.colors.primary,
  },
  notifItemMessage: {
    fontSize: 13,
    fontWeight: '700',
    color: SmashTheme.colors.onSurface,
    lineHeight: 18,
    marginBottom: 6,
  },
  notifItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifItemTime: {
    fontSize: 10,
    color: SmashTheme.colors.onSurfaceVariant,
  },
  verTorneoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  verTorneoLinkText: {
    fontSize: 11,
    fontWeight: '800',
    color: SmashTheme.colors.primary,
  },

  // ==========================================
  // ESTILOS: MODAL INFORMACIÓN DEL TORNEO
  // ==========================================
  torneoDetalleCard: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: SmashTheme.colors.surfaceContainerHigh,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    overflow: 'hidden',
  },
  torneoDetalleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  torneoDetalleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(195, 244, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(195, 244, 0, 0.28)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  torneoDetalleBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: SmashTheme.colors.primary,
    letterSpacing: 0.5,
  },
  torneoDetalleTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: SmashTheme.colors.onSurface,
    lineHeight: 28,
    marginBottom: 6,
  },
  torneoDetalleSub: {
    fontSize: 12,
    color: SmashTheme.colors.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: 16,
  },
  torneoInfoGrid: {
    backgroundColor: SmashTheme.colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    gap: 12,
    marginBottom: 20,
  },
  torneoInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  torneoInfoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: SmashTheme.colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
  },
  torneoInfoTexts: {
    flex: 1,
  },
  torneoInfoLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: SmashTheme.colors.onSurfaceVariant,
    letterSpacing: 0.6,
  },
  torneoInfoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: SmashTheme.colors.onSurface,
    marginTop: 1,
  },
  torneoDetalleActions: {
    gap: 10,
  },
  torneoDetallePrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: SmashTheme.colors.primary,
    borderRadius: 14,
    height: 48,
    shadowColor: SmashTheme.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  torneoDetallePrimaryBtnText: {
    color: SmashTheme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  torneoDetalleSecondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  torneoDetalleSecondaryBtnText: {
    color: SmashTheme.colors.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '700',
  },
});
