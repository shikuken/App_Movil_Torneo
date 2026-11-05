import React, { useState, useEffect } from 'react';
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
  Modal,
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
  updateDoc,
  getDocs,
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { SmashTheme } from '../constants/theme';
import { useToast } from '../context/ToastContext';

interface Jugador {
  id: string;
  nombre: string;
  club?: string;
  telefono?: string;
  usuarioId?: string | null;
  email?: string | null;
}

interface UsuarioRegistrado {
  id: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  email: string;
  puntosRanking?: number;
}

export default function RegistrarJugadoresScreen() {
  const router = useRouter();
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const params = useLocalSearchParams<{
    torneoId?: string;
    nombreTorneo?: string;
    modalidad?: string;
    tipoTorneo?: string;
    esPropietario?: string;
  }>();

  const torneoId = params.torneoId || '';

  const [torneoData, setTorneoData] = useState({
    nombreTorneo: params.nombreTorneo || 'Torneo Smash Match',
    organizador: '',
    lugarSede: '',
    categoria: '',
    modalidad: params.modalidad || 'Eliminación directa',
    tipoTorneo: params.tipoTorneo || 'amistoso',
    fechaTorneo: '',
    horaTorneo: '',
    usuarioId: '',
    estado: 'creado',
  });

  const [totalPartidos, setTotalPartidos] = useState(0);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);

  // Formulario de nuevo jugador (Amistoso)
  const [nombre, setNombre] = useState('');
  const [club, setClub] = useState('');
  const [telefono, setTelefono] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Estado para búsqueda y autocompletado de usuarios registrados (Clasificatorio)
  const [usuariosRegistrados, setUsuariosRegistrados] = useState<UsuarioRegistrado[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarTodosUsuarios, setMostrarTodosUsuarios] = useState(false);

  // Modal de edición
  const [modalEditarVisible, setModalEditarVisible] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editOrganizador, setEditOrganizador] = useState('');
  const [editLugarSede, setEditLugarSede] = useState('');
  const [editCategoria, setEditCategoria] = useState('');
  const [editModalidad, setEditModalidad] = useState<'Eliminación directa' | 'Todos contra todos'>('Eliminación directa');
  const [editTipoTorneo, setEditTipoTorneo] = useState<'amistoso' | 'clasificatorio'>('amistoso');
  const [editFechaTorneo, setEditFechaTorneo] = useState('');
  const [editHoraTorneo, setEditHoraTorneo] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [eliminandoTorneo, setEliminandoTorneo] = useState(false);

  // Escuchar partidos
  useEffect(() => {
    if (!torneoId) return;
    const partidosRef = collection(db, 'torneos', torneoId, 'partidos');
    const unsub = onSnapshot(partidosRef, (snap) => {
      setTotalPartidos(snap.size);
    });
    return () => unsub();
  }, [torneoId]);

  const torneoIniciado =
    totalPartidos > 0 ||
    torneoData.estado === 'iniciado' ||
    torneoData.estado === 'finalizado';

  const currentUid = auth.currentUser?.uid;
  const esPropietario =
    params.esPropietario === 'true' ||
    (!!currentUid && !!torneoData.usuarioId && currentUid === torneoData.usuarioId);

  // Escuchar datos del torneo
  useEffect(() => {
    if (!torneoId) return;
    const docRef = doc(db, 'torneos', torneoId);
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        setTorneoData({
          nombreTorneo: d.nombreTorneo || params.nombreTorneo || 'Torneo Smash Match',
          organizador: d.organizador || '',
          lugarSede: d.lugarSede || '',
          categoria: d.categoria || '',
          modalidad: d.modalidad || params.modalidad || 'Eliminación directa',
          tipoTorneo: d.tipoTorneo || params.tipoTorneo || 'amistoso',
          fechaTorneo: d.fechaTorneo || '',
          horaTorneo: d.horaTorneo || '',
          usuarioId: d.usuarioId || '',
          estado: d.estado || 'creado',
        });
      }
    });
    return () => unsub();
  }, [torneoId]);

  // Escuchar usuarios registrados para torneos clasificatorios (excluyendo creador)
  useEffect(() => {
    if (torneoData.tipoTorneo !== 'clasificatorio') return;
    const usuariosRef = collection(db, 'usuarios');
    const unsubscribe = onSnapshot(
      usuariosRef,
      (snapshot) => {
        const creadorId = torneoData.usuarioId || auth.currentUser?.uid;
        const lista: UsuarioRegistrado[] = [];
        snapshot.forEach((uDoc) => {
          // Excluir al creador del torneo
          if (uDoc.id !== creadorId) {
            const data = uDoc.data();
            lista.push({
              id: uDoc.id,
              nombre: data.nombre || '',
              apellido: data.apellido || '',
              telefono: data.telefono || '',
              email: data.email || '',
              puntosRanking: data.puntosRanking || 0,
            });
          }
        });
        setUsuariosRegistrados(lista);
      },
      (error) => {
        console.error('Error al escuchar usuarios registrados:', error);
      }
    );
    return () => unsubscribe();
  }, [torneoData.tipoTorneo, torneoData.usuarioId]);

  // Escuchar lista de jugadores inscritos
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
        const lista: Jugador[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          lista.push({
            id: docSnap.id,
            nombre: data.nombre,
            club: data.club,
            telefono: data.telefono,
            usuarioId: data.usuarioId || null,
            email: data.email || null,
          });
        });
        setJugadores(lista);
        setCargandoLista(false);
      },
      (error) => {
        console.error('Error al escuchar jugadores:', error);
        setCargandoLista(false);
      }
    );

    return () => unsubscribe();
  }, [torneoId]);

  // Usuarios disponibles (no inscritos aún)
  const usuariosDisponibles = usuariosRegistrados.filter((u) => {
    return !jugadores.some(
      (j) => j.usuarioId === u.id || (j.nombre && j.nombre.toLowerCase() === `${u.nombre} ${u.apellido}`.toLowerCase())
    );
  });

  // Coincidencias de búsqueda en vivo para clasificatorios
  const coincidenciasUsuarios = busqueda.trim() === ''
    ? []
    : usuariosDisponibles.filter((u) => {
        const q = busqueda.toLowerCase().trim();
        const fullName = `${u.nombre} ${u.apellido}`.toLowerCase();
        const email = u.email.toLowerCase();
        return fullName.includes(q) || email.includes(q);
      });

  const handleInscribirUsuarioRegistrado = async (usuario: UsuarioRegistrado) => {
    if (!torneoId) return;
    setGuardando(true);
    try {
      const nombreCompleto = `${usuario.nombre} ${usuario.apellido}`.trim();
      const jugadoresRef = collection(db, 'torneos', torneoId, 'jugadores');
      await addDoc(jugadoresRef, {
        nombre: nombreCompleto,
        usuarioId: usuario.id,
        email: usuario.email,
        telefono: usuario.telefono || null,
        club: club.trim() || null,
        creadoEn: serverTimestamp(),
      });

      // Crear notificación para el jugador inscrito (modo clasificatorio)
      try {
        await addDoc(collection(db, 'notificaciones'), {
          usuarioId: usuario.id,
          email: (usuario.email || '').toLowerCase().trim(),
          tipo: 'registro_torneo',
          titulo: 'Inscripción a Torneo',
          mensaje: `Lo han registrado al torneo "${torneoData.nombreTorneo || 'Torneo Smash'}"`,
          torneoId: torneoId,
          nombreTorneo: torneoData.nombreTorneo || 'Torneo Smash',
          organizador: torneoData.organizador || '',
          lugarSede: torneoData.lugarSede || 'Pistas Centrales',
          categoria: torneoData.categoria || 'Intermedia',
          modalidad: torneoData.modalidad || 'Eliminación directa',
          tipoTorneo: 'clasificatorio',
          fechaTorneo: torneoData.fechaTorneo || '',
          horaTorneo: torneoData.horaTorneo || '',
          estadoTorneo: torneoData.estado || 'creado',
          leida: false,
          creadoEn: Date.now(),
        });
      } catch (notifErr) {
        console.warn('No se pudo enviar la notificación al jugador:', notifErr);
      }

      setBusqueda('');
      setClub('');
      showSuccess('Jugador inscrito correctamente.');
    } catch (err: any) {
      showError(err.message || 'No se pudo inscribir al usuario.', 'Error');
    } finally {
      setGuardando(false);
    }
  };

  const handleAgregarJugador = async () => {
    const nombreTrim = nombre.trim();
    const clubTrim = club.trim();
    const telefonoTrim = telefono.trim();

    if (!nombreTrim) {
      showWarning('Por favor ingresa el nombre del jugador o pareja.', 'Nombre requerido');
      return;
    }

    if (!torneoId) {
      showError('No se encontró el ID del torneo para registrar participantes.', 'Error');
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

      setNombre('');
      setClub('');
      setTelefono('');
      showSuccess(`"${nombreTrim}" agregado al torneo.`);
    } catch (err: any) {
      showError(err.message || 'No se pudo guardar el jugador.', 'Error al registrar jugador');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarJugador = (jugadorId: string, nombreJugador: string) => {
    if (torneoIniciado) {
      showWarning('El torneo ya ha iniciado. No se pueden eliminar participantes.', 'Torneo iniciado');
      return;
    }

    const ejecutarEliminacion = async () => {
      try {
        const jugadorRef = doc(db, 'torneos', torneoId, 'jugadores', jugadorId);
        await deleteDoc(jugadorRef);
        showSuccess(`"${nombreJugador}" fue retirado.`);
      } catch (err: any) {
        showError(err.message || 'No se pudo eliminar el jugador.', 'Error');
      }
    };

    if (Platform.OS === 'web') {
      const conf = window.confirm(`¿Estás seguro de eliminar a "${nombreJugador}"?`);
      if (conf) ejecutarEliminacion();
      return;
    }

    Alert.alert(
      'Eliminar Jugador',
      `¿Deseas remover a "${nombreJugador}" de este torneo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: ejecutarEliminacion },
      ]
    );
  };

  // Sorteo aleatorio de cabezas de serie
  const handleSortearParticipantes = () => {
    if (jugadores.length < 2) {
      showWarning('Debes tener al menos 2 jugadores registrados para sortear.', 'Sorteo');
      return;
    }
    const jugadoresShuffled = [...jugadores].sort(() => Math.random() - 0.5);
    setJugadores(jugadoresShuffled);
    showSuccess('El orden de las cabezas de serie ha sido barajado aleatoriamente.', '¡Sorteo Realizado!');
  };

  const handleIrDesarrolloTorneo = () => {
    router.push({
      pathname: '/desarrollo-torneo' as any,
      params: {
        torneoId,
        nombreTorneo: torneoData.nombreTorneo,
        modalidad: torneoData.modalidad,
        tipoTorneo: torneoData.tipoTorneo,
        esPropietario: esPropietario ? 'true' : 'false',
      },
    });
  };

  const abrirModalEditar = () => {
    setEditNombre(torneoData.nombreTorneo);
    setEditOrganizador(torneoData.organizador);
    setEditLugarSede(torneoData.lugarSede);
    setEditCategoria(torneoData.categoria);
    setEditModalidad((torneoData.modalidad as any) || 'Eliminación directa');
    setEditTipoTorneo((torneoData.tipoTorneo as any) || 'amistoso');
    setEditFechaTorneo(torneoData.fechaTorneo);
    setEditHoraTorneo(torneoData.horaTorneo);
    setModalEditarVisible(true);
  };

  const handleGuardarEdicionTorneo = async () => {
    if (!editNombre.trim() || !editOrganizador.trim()) {
      showWarning('El nombre y organizador no pueden estar vacíos.', 'Campos obligatorios');
      return;
    }

    setGuardandoEdicion(true);
    try {
      await updateDoc(doc(db, 'torneos', torneoId), {
        nombreTorneo: editNombre.trim(),
        organizador: editOrganizador.trim(),
        lugarSede: editLugarSede.trim() || null,
        categoria: editCategoria.trim() || null,
        modalidad: editModalidad,
        tipoTorneo: editTipoTorneo,
        fechaTorneo: editFechaTorneo.trim() || null,
        horaTorneo: editHoraTorneo.trim() || null,
      });

      setModalEditarVisible(false);
      showSuccess('Información del torneo actualizada.', '¡Actualizado!');
    } catch (err: any) {
      showError(err.message || 'No se pudo actualizar.', 'Error');
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const handleEliminarTorneo = () => {
    const ejecutarBorrado = async () => {
      setEliminandoTorneo(true);
      try {
        const jugadoresRef = collection(db, 'torneos', torneoId, 'jugadores');
        const jugadoresSnap = await getDocs(jugadoresRef);
        await Promise.all(jugadoresSnap.docs.map((docSnap) => deleteDoc(docSnap.ref)));

        const partidosRef = collection(db, 'torneos', torneoId, 'partidos');
        const partidosSnap = await getDocs(partidosRef);
        await Promise.all(partidosSnap.docs.map((docSnap) => deleteDoc(docSnap.ref)));

        await deleteDoc(doc(db, 'torneos', torneoId));

        showSuccess(`El torneo "${torneoData.nombreTorneo}" fue eliminado.`, 'Torneo Eliminado');
        router.replace('/ver-torneos' as any);
      } catch (err: any) {
        showError(err.message || 'No se pudo eliminar el torneo.', 'Error');
        setEliminandoTorneo(false);
      }
    };

    Alert.alert(
      'Eliminar Torneo',
      `¿Deseas eliminar permanentemente "${torneoData.nombreTorneo}"? Se borrarán todos los participantes y partidos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí, Eliminar Torneo', style: 'destructive', onPress: ejecutarBorrado },
      ]
    );
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
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)');
          }}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={SmashTheme.colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Inscribir Participantes</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{torneoData.nombreTorneo}</Text>
        </View>
        <View style={styles.headerCounterBadge}>
          <Text style={styles.headerCounterText}>{jugadores.length} Inscritos</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Tarjeta de Resumen del Torneo (HUD Card) */}
          <View style={styles.tournamentHudCard}>
            <View style={styles.hudCardTop}>
              <View style={styles.trophyBadge}>
                <Ionicons name="trophy" size={22} color={SmashTheme.colors.primary} />
              </View>
              <View style={styles.hudCardTexts}>
                <Text style={styles.hudCardCategory}>
                  {torneoData.categoria ? `CATEGORÍA ${torneoData.categoria.toUpperCase()}` : 'TORNEO ABIERTO'}
                </Text>
                <Text style={styles.hudCardTitle} numberOfLines={2}>
                  {torneoData.nombreTorneo}
                </Text>
              </View>
            </View>

            {/* Metadatos Rápidos */}
            <View style={styles.metaPillsRow}>
              {/* Badge Tipo de Torneo */}
              <View style={[
                styles.metaPill,
                torneoData.tipoTorneo === 'clasificatorio'
                  ? { backgroundColor: 'rgba(195, 244, 0, 0.12)', borderColor: SmashTheme.colors.borderVolt }
                  : { backgroundColor: 'rgba(76, 215, 246, 0.12)', borderColor: 'rgba(76, 215, 246, 0.3)' }
              ]}>
                <Ionicons
                  name={torneoData.tipoTorneo === 'clasificatorio' ? 'trophy' : 'tennisball-outline'}
                  size={13}
                  color={torneoData.tipoTorneo === 'clasificatorio' ? SmashTheme.colors.primary : SmashTheme.colors.secondary}
                />
                <Text style={[
                  styles.metaPillText,
                  { color: torneoData.tipoTorneo === 'clasificatorio' ? SmashTheme.colors.primary : SmashTheme.colors.secondary, fontWeight: '700' }
                ]}>
                  {torneoData.tipoTorneo === 'clasificatorio' ? 'Clasificatorio Oficial' : 'Amistoso Recreativo'}
                </Text>
              </View>

              <View style={styles.metaPill}>
                <Ionicons name="git-network-outline" size={13} color={SmashTheme.colors.primary} />
                <Text style={styles.metaPillText}>{torneoData.modalidad}</Text>
              </View>

              {torneoData.lugarSede ? (
                <View style={styles.metaPill}>
                  <Ionicons name="location-outline" size={13} color={SmashTheme.colors.secondary} />
                  <Text style={styles.metaPillText}>{torneoData.lugarSede}</Text>
                </View>
              ) : null}

              {torneoData.fechaTorneo ? (
                <View style={styles.metaPill}>
                  <Ionicons name="calendar-outline" size={13} color={SmashTheme.colors.onSurfaceVariant} />
                  <Text style={styles.metaPillText}>{torneoData.fechaTorneo}</Text>
                </View>
              ) : null}
            </View>

            {/* Botón Principal: Fixture / Brackets */}
            <TouchableOpacity
              style={styles.bracketButton}
              onPress={handleIrDesarrolloTorneo}
              activeOpacity={0.85}>
              <Ionicons name="play-circle" size={20} color={SmashTheme.colors.onPrimary} />
              <Text style={styles.bracketButtonText}>Desarrollo del Torneo / Fixture</Text>
              <Ionicons name="arrow-forward" size={16} color={SmashTheme.colors.onPrimary} />
            </TouchableOpacity>

            {/* Acciones del Propietario */}
            {esPropietario && (
              <View style={styles.ownerActionsRow}>
                <TouchableOpacity
                  style={styles.ownerBtnSecondary}
                  onPress={abrirModalEditar}
                  activeOpacity={0.8}>
                  <Ionicons name="create-outline" size={15} color={SmashTheme.colors.secondary} />
                  <Text style={styles.ownerBtnTextSecondary}>Editar Torneo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.ownerBtnDanger}
                  onPress={handleEliminarTorneo}
                  disabled={eliminandoTorneo}
                  activeOpacity={0.8}>
                  {eliminandoTorneo ? (
                    <ActivityIndicator size="small" color={SmashTheme.colors.liveRed} />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={15} color={SmashTheme.colors.liveRed} />
                      <Text style={styles.ownerBtnTextDanger}>Eliminar</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Formulario de Entrada Rápida de Participante */}
          {esPropietario && !torneoIniciado && (
            torneoData.tipoTorneo === 'clasificatorio' ? (
              /* SECCIÓN CLASIFICATORIO: Búsqueda y autocompletado en vivo de usuarios registrados */
              <View style={styles.formCard}>
                <View style={styles.clasificatorioBanner}>
                  <Ionicons name="ribbon" size={16} color={SmashTheme.colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clasificatorioBannerTitle}>Inscripción Clasificatoria Oficial</Text>
                    <Text style={styles.clasificatorioBannerSub}>
                      Busca usuarios registrados en la app para sumar puntos de ranking (1°: 3pts, 2°: 2pts, 3°: 1pt).
                    </Text>
                  </View>
                </View>

                <Text style={styles.formSectionTitle}>BUSCAR JUGADOR REGISTRADO</Text>

                <View style={styles.searchWrapper}>
                  <Ionicons name="search" size={18} color={SmashTheme.colors.primary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Escribe el nombre o correo del jugador..."
                    placeholderTextColor={SmashTheme.colors.onSurfaceVariant + '80'}
                    value={busqueda}
                    onChangeText={setBusqueda}
                    editable={!guardando}
                    autoCapitalize="none"
                  />
                  {busqueda.length > 0 && (
                    <TouchableOpacity onPress={() => setBusqueda('')} style={{ padding: 4 }}>
                      <Ionicons name="close-circle" size={18} color={SmashTheme.colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Coincidencias en tiempo real a medida que escribe */}
                {busqueda.trim().length > 0 && (
                  <View style={styles.matchResultsBox}>
                    <Text style={styles.matchResultsTitle}>
                      Coincidencias encontradas ({coincidenciasUsuarios.length}):
                    </Text>

                    {coincidenciasUsuarios.length > 0 ? (
                      coincidenciasUsuarios.map((u) => {
                        const iniciales = `${u.nombre.charAt(0)}${u.apellido.charAt(0)}`.toUpperCase() || 'SM';
                        return (
                          <View key={u.id} style={styles.matchUserCard}>
                            <View style={styles.matchUserAvatar}>
                              <Text style={styles.matchUserAvatarText}>{iniciales}</Text>
                            </View>
                            <View style={styles.matchUserInfo}>
                              <Text style={styles.matchUserName}>{u.nombre} {u.apellido}</Text>
                              <Text style={styles.matchUserEmail}>{u.email}</Text>
                              <View style={styles.matchPointsPill}>
                                <Ionicons name="trophy" size={11} color={SmashTheme.colors.primary} />
                                <Text style={styles.matchPointsText}>{u.puntosRanking || 0} pts ranking</Text>
                              </View>
                            </View>
                            <TouchableOpacity
                              style={styles.enrollUserBtn}
                              onPress={() => handleInscribirUsuarioRegistrado(u)}
                              disabled={guardando}
                              activeOpacity={0.8}>
                              <Ionicons name="person-add" size={15} color={SmashTheme.colors.onPrimary} />
                              <Text style={styles.enrollUserBtnText}>Inscribir</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })
                    ) : (
                      <View style={styles.noMatchCard}>
                        <Ionicons name="alert-circle-outline" size={20} color={SmashTheme.colors.onSurfaceVariant} />
                        <Text style={styles.noMatchText}>
                          No hay usuarios registrados con "{busqueda}". Recuerda que el creador del torneo está excluido y los participantes deben tener cuenta en la app.
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Toggle para explorar directorio completo de usuarios disponibles */}
                <TouchableOpacity
                  style={styles.toggleDirectoryBtn}
                  onPress={() => setMostrarTodosUsuarios(!mostrarTodosUsuarios)}
                  activeOpacity={0.7}>
                  <Ionicons
                    name={mostrarTodosUsuarios ? 'chevron-up-outline' : 'people-outline'}
                    size={16}
                    color={SmashTheme.colors.secondary}
                  />
                  <Text style={styles.toggleDirectoryText}>
                    {mostrarTodosUsuarios
                      ? 'Ocultar directorio de usuarios'
                      : `Ver todos los usuarios disponibles (${usuariosDisponibles.length})`}
                  </Text>
                </TouchableOpacity>

                {mostrarTodosUsuarios && (
                  <View style={styles.directoryContainer}>
                    {usuariosDisponibles.length === 0 ? (
                      <Text style={styles.noMatchText}>No hay más usuarios registrados disponibles para inscribir.</Text>
                    ) : (
                      usuariosDisponibles.map((u) => {
                        const iniciales = `${u.nombre.charAt(0)}${u.apellido.charAt(0)}`.toUpperCase() || 'SM';
                        return (
                          <View key={u.id} style={styles.matchUserCard}>
                            <View style={styles.matchUserAvatar}>
                              <Text style={styles.matchUserAvatarText}>{iniciales}</Text>
                            </View>
                            <View style={styles.matchUserInfo}>
                              <Text style={styles.matchUserName}>{u.nombre} {u.apellido}</Text>
                              <Text style={styles.matchUserEmail}>{u.email}</Text>
                            </View>
                            <TouchableOpacity
                              style={styles.enrollUserBtn}
                              onPress={() => handleInscribirUsuarioRegistrado(u)}
                              disabled={guardando}
                              activeOpacity={0.8}>
                              <Ionicons name="person-add" size={15} color={SmashTheme.colors.onPrimary} />
                              <Text style={styles.enrollUserBtnText}>Inscribir</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })
                    )}
                  </View>
                )}
              </View>
            ) : (
              /* SECCIÓN AMISTOSO: Entrada libre tradicional tal cual funcionaba */
              <View style={styles.formCard}>
                <Text style={styles.formSectionTitle}>AÑADIR PARTICIPANTE (AMISTOSO)</Text>

                <View style={styles.addInputRow}>
                  <View style={styles.inputWrapperFlex}>
                    <Ionicons name="person-outline" size={18} color={SmashTheme.colors.onSurfaceVariant} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Nombre del jugador o pareja"
                      placeholderTextColor={SmashTheme.colors.onSurfaceVariant + '80'}
                      value={nombre}
                      onChangeText={setNombre}
                      editable={!guardando}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.addButton, guardando && { opacity: 0.7 }]}
                    onPress={handleAgregarJugador}
                    activeOpacity={0.85}
                    disabled={guardando}>
                    {guardando ? (
                      <ActivityIndicator size="small" color={SmashTheme.colors.onPrimary} />
                    ) : (
                      <>
                        <Ionicons name="add" size={18} color={SmashTheme.colors.onPrimary} />
                        <Text style={styles.addButtonText}>Añadir</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Opcional: Club o procedencia */}
                <View style={styles.optionalInputRow}>
                  <TextInput
                    style={styles.optionalInput}
                    placeholder="Club / Equipo (opcional)"
                    placeholderTextColor={SmashTheme.colors.onSurfaceVariant + '70'}
                    value={club}
                    onChangeText={setClub}
                    editable={!guardando}
                  />
                </View>
              </View>
            )
          )}

          {/* Lista de Participantes */}
          <View style={styles.rosterSection}>
            <View style={styles.rosterHeaderRow}>
              <View style={styles.rosterTitleContainer}>
                <Text style={styles.rosterTitle}>Participantes</Text>
                <Text style={styles.rosterCount}>({jugadores.length} Registrados)</Text>
              </View>

              {/* Botón de Sorteo Rápido */}
              {esPropietario && !torneoIniciado && jugadores.length >= 2 && (
                <TouchableOpacity
                  style={styles.shuffleBtn}
                  onPress={handleSortearParticipantes}
                  activeOpacity={0.8}>
                  <Ionicons name="shuffle" size={16} color={SmashTheme.colors.secondary} />
                  <Text style={styles.shuffleBtnText}>Sortear</Text>
                </TouchableOpacity>
              )}
            </View>

            {cargandoLista ? (
              <View style={styles.loadingWrapper}>
                <ActivityIndicator size="small" color={SmashTheme.colors.primary} />
                <Text style={styles.loadingText}>Cargando lista de participantes...</Text>
              </View>
            ) : jugadores.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={42} color={SmashTheme.colors.outline} />
                <Text style={styles.emptyTitle}>Sin jugadores registrados aún</Text>
                <Text style={styles.emptySubtitle}>
                  {esPropietario
                    ? 'Agrega al menos 2 participantes para comenzar el torneo.'
                    : 'El organizador aún no ha inscrito participantes.'}
                </Text>
              </View>
            ) : (
              <View style={styles.participantsList}>
                {jugadores.map((jugador, index) => {
                  const seedNum = index + 1;
                  const isSeed1 = seedNum === 1;
                  const isSeed2 = seedNum === 2;

                  return (
                    <View key={jugador.id} style={styles.participantCard}>
                      <View style={styles.participantLeft}>
                        {/* Avatar con número de siembra */}
                        <View
                          style={[
                            styles.seedAvatar,
                            isSeed1 && styles.seedAvatar1,
                            isSeed2 && styles.seedAvatar2,
                          ]}>
                          <Text
                            style={[
                              styles.seedAvatarText,
                              isSeed1 && styles.seedAvatarText1,
                              isSeed2 && styles.seedAvatarText2,
                            ]}>
                            {seedNum}
                          </Text>
                        </View>

                        <View style={styles.participantInfo}>
                          <Text style={styles.participantName} numberOfLines={1}>
                            {jugador.nombre}
                          </Text>
                          <View style={styles.seedBadgeRow}>
                            {isSeed1 && (
                              <View style={styles.seedTag1}>
                                <Ionicons name="medal" size={11} color={SmashTheme.colors.primary} />
                                <Text style={styles.seedTagText1}>#1 SEED (CABEZA DE SERIE)</Text>
                              </View>
                            )}
                            {isSeed2 && (
                              <View style={styles.seedTag2}>
                                <Ionicons name="star" size={11} color={SmashTheme.colors.secondary} />
                                <Text style={styles.seedTagText2}>#2 SEED</Text>
                              </View>
                            )}
                            {jugador.usuarioId && (
                              <View style={styles.verifiedUserBadge}>
                                <Ionicons name="checkmark-circle" size={10} color={SmashTheme.colors.secondary} />
                                <Text style={styles.verifiedUserText}>USUARIO REGISTRADO</Text>
                              </View>
                            )}
                            {jugador.club ? (
                              <Text style={styles.participantClubText}>{jugador.club}</Text>
                            ) : null}
                          </View>
                        </View>
                      </View>

                      {esPropietario && !torneoIniciado && (
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleEliminarJugador(jugador.id, jugador.nombre)}
                          activeOpacity={0.7}>
                          <Ionicons name="trash-outline" size={18} color={SmashTheme.colors.liveRed} />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de Edición del Torneo */}
      <Modal
        visible={modalEditarVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalEditarVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Torneo</Text>
              <TouchableOpacity onPress={() => setModalEditarVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={SmashTheme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <View style={styles.modalFormGroup}>
                <Text style={styles.modalLabel}>Nombre del Torneo *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editNombre}
                  onChangeText={setEditNombre}
                  placeholderTextColor={SmashTheme.colors.onSurfaceVariant + '70'}
                />
              </View>

              <View style={styles.modalFormGroup}>
                <Text style={styles.modalLabel}>Organizador *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editOrganizador}
                  onChangeText={setEditOrganizador}
                  placeholderTextColor={SmashTheme.colors.onSurfaceVariant + '70'}
                />
              </View>

              <View style={styles.modalFormGroup}>
                <Text style={styles.modalLabel}>Sede / Lugar</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editLugarSede}
                  onChangeText={setEditLugarSede}
                  placeholderTextColor={SmashTheme.colors.onSurfaceVariant + '70'}
                />
              </View>

              <View style={styles.modalFormGroup}>
                <Text style={styles.modalLabel}>Categoría</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editCategoria}
                  onChangeText={setEditCategoria}
                  placeholderTextColor={SmashTheme.colors.onSurfaceVariant + '70'}
                />
              </View>

              {!torneoIniciado && (
                <View style={styles.modalFormGroup}>
                  <Text style={styles.modalLabel}>Tipo de Torneo</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                    <TouchableOpacity
                      style={[
                        styles.modalTypeBtn,
                        editTipoTorneo === 'amistoso' && styles.modalTypeBtnActive,
                      ]}
                      onPress={() => setEditTipoTorneo('amistoso')}>
                      <Text
                        style={[
                          styles.modalTypeBtnText,
                          editTipoTorneo === 'amistoso' && styles.modalTypeBtnTextActive,
                        ]}>
                        Amistoso
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.modalTypeBtn,
                        editTipoTorneo === 'clasificatorio' && styles.modalTypeBtnActiveCyan,
                      ]}
                      onPress={() => setEditTipoTorneo('clasificatorio')}>
                      <Text
                        style={[
                          styles.modalTypeBtnText,
                          editTipoTorneo === 'clasificatorio' && styles.modalTypeBtnTextActiveCyan,
                        ]}>
                        Clasificatorio
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[styles.saveModalBtn, guardandoEdicion && { opacity: 0.7 }]}
                onPress={handleGuardarEdicionTorneo}
                disabled={guardandoEdicion}
                activeOpacity={0.85}>
                {guardandoEdicion ? (
                  <ActivityIndicator size="small" color={SmashTheme.colors.onPrimary} />
                ) : (
                  <Text style={styles.saveModalBtnText}>Guardar Cambios</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
    fontSize: 12,
    color: SmashTheme.colors.primary,
    fontWeight: '600',
    marginTop: 1,
  },
  headerCounterBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    backgroundColor: 'rgba(195, 244, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(195, 244, 0, 0.3)',
  },
  headerCounterText: {
    fontSize: 11,
    fontWeight: '800',
    color: SmashTheme.colors.primary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  tournamentHudCard: {
    backgroundColor: SmashTheme.colors.surfaceContainerLow,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    padding: 16,
    marginBottom: 16,
  },
  hudCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  trophyBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: SmashTheme.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: SmashTheme.colors.borderVolt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudCardTexts: {
    flex: 1,
  },
  hudCardCategory: {
    fontSize: 10,
    fontWeight: '800',
    color: SmashTheme.colors.secondary,
    letterSpacing: 0.6,
  },
  hudCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: SmashTheme.colors.onSurface,
    marginTop: 2,
  },
  metaPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SmashTheme.colors.surfaceContainer,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: SmashTheme.colors.onSurface,
  },
  bracketButton: {
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
  bracketButtonText: {
    color: SmashTheme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  ownerActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  ownerBtnSecondary: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: SmashTheme.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  ownerBtnTextSecondary: {
    fontSize: 12,
    fontWeight: '700',
    color: SmashTheme.colors.secondary,
  },
  ownerBtnDanger: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  ownerBtnTextDanger: {
    fontSize: 12,
    fontWeight: '700',
    color: SmashTheme.colors.liveRed,
  },
  formCard: {
    backgroundColor: SmashTheme.colors.surfaceContainerLow,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    padding: 14,
    marginBottom: 16,
  },
  formSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: SmashTheme.colors.onSurfaceVariant,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  addInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inputWrapperFlex: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SmashTheme.colors.surfaceContainer,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    paddingHorizontal: 10,
    height: 46,
  },
  inputIcon: {
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    color: SmashTheme.colors.onSurface,
    fontSize: 13,
  },
  addButton: {
    backgroundColor: SmashTheme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addButtonText: {
    color: SmashTheme.colors.onPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  optionalInputRow: {
    marginTop: 8,
  },
  optionalInput: {
    backgroundColor: SmashTheme.colors.surfaceContainer,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    paddingHorizontal: 12,
    height: 38,
    color: SmashTheme.colors.onSurface,
    fontSize: 12,
  },
  rosterSection: {
    marginBottom: 20,
  },
  rosterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  rosterTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rosterTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: SmashTheme.colors.onSurface,
  },
  rosterCount: {
    fontSize: 12,
    color: SmashTheme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  shuffleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SmashTheme.colors.surfaceContainer,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
  },
  shuffleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: SmashTheme.colors.secondary,
  },
  loadingWrapper: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: SmashTheme.colors.onSurfaceVariant,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: SmashTheme.colors.surfaceContainerLow,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: SmashTheme.colors.onSurface,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: SmashTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
  },
  participantsList: {
    gap: 8,
  },
  participantCard: {
    backgroundColor: SmashTheme.colors.surfaceContainerLow,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  participantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  seedAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SmashTheme.colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seedAvatar1: {
    backgroundColor: SmashTheme.colors.primary,
  },
  seedAvatar2: {
    backgroundColor: SmashTheme.colors.secondary,
  },
  seedAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: SmashTheme.colors.onSurface,
  },
  seedAvatarText1: {
    color: SmashTheme.colors.onPrimary,
  },
  seedAvatarText2: {
    color: SmashTheme.colors.onSecondary,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 13,
    fontWeight: '700',
    color: SmashTheme.colors.onSurface,
  },
  seedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  seedTag1: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: SmashTheme.colors.surfaceContainerHighest,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  seedTagText1: {
    fontSize: 9,
    fontWeight: '800',
    color: SmashTheme.colors.primary,
    letterSpacing: 0.4,
  },
  seedTag2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: SmashTheme.colors.surfaceContainerHighest,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  seedTagText2: {
    fontSize: 9,
    fontWeight: '800',
    color: SmashTheme.colors.secondary,
    letterSpacing: 0.4,
  },
  participantClubText: {
    fontSize: 11,
    color: SmashTheme.colors.onSurfaceVariant,
  },
  deleteBtn: {
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: SmashTheme.colors.surfaceContainerLow,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: SmashTheme.colors.onSurface,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalFormGroup: {
    marginBottom: 14,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: SmashTheme.colors.onSurface,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: SmashTheme.colors.surfaceContainer,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    paddingHorizontal: 12,
    height: 44,
    color: SmashTheme.colors.onSurface,
    fontSize: 13,
  },
  saveModalBtn: {
    backgroundColor: SmashTheme.colors.primary,
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  saveModalBtnText: {
    color: SmashTheme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  clasificatorioBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(195, 244, 0, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SmashTheme.colors.borderVolt,
    padding: 10,
    marginBottom: 12,
  },
  clasificatorioBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: SmashTheme.colors.primary,
  },
  clasificatorioBannerSub: {
    fontSize: 10.5,
    color: SmashTheme.colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 14,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SmashTheme.colors.surfaceContainer,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    paddingHorizontal: 12,
    height: 48,
  },
  matchResultsBox: {
    marginTop: 10,
    backgroundColor: SmashTheme.colors.surfaceContainerLowest,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    padding: 10,
    gap: 8,
  },
  matchResultsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: SmashTheme.colors.primary,
    marginBottom: 2,
  },
  matchUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SmashTheme.colors.surfaceContainer,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    padding: 10,
    gap: 10,
  },
  matchUserAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: SmashTheme.colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: SmashTheme.colors.borderVolt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchUserAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: SmashTheme.colors.primary,
  },
  matchUserInfo: {
    flex: 1,
  },
  matchUserName: {
    fontSize: 13,
    fontWeight: '700',
    color: SmashTheme.colors.onSurface,
  },
  matchUserEmail: {
    fontSize: 11,
    color: SmashTheme.colors.onSurfaceVariant,
    marginTop: 1,
  },
  matchPointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(195, 244, 0, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 3,
  },
  matchPointsText: {
    fontSize: 10,
    fontWeight: '700',
    color: SmashTheme.colors.primary,
  },
  enrollUserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SmashTheme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  enrollUserBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: SmashTheme.colors.onPrimary,
  },
  noMatchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
  },
  noMatchText: {
    fontSize: 11.5,
    color: SmashTheme.colors.onSurfaceVariant,
    flex: 1,
    lineHeight: 16,
  },
  toggleDirectoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 6,
  },
  toggleDirectoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: SmashTheme.colors.secondary,
  },
  directoryContainer: {
    marginTop: 8,
    gap: 8,
  },
  verifiedUserBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(76, 215, 246, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  verifiedUserText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: SmashTheme.colors.secondary,
    letterSpacing: 0.3,
  },
  modalTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: SmashTheme.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
  },
  modalTypeBtnActive: {
    borderColor: SmashTheme.colors.primary,
    backgroundColor: 'rgba(195, 244, 0, 0.1)',
  },
  modalTypeBtnActiveCyan: {
    borderColor: SmashTheme.colors.secondary,
    backgroundColor: 'rgba(76, 215, 246, 0.1)',
  },
  modalTypeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: SmashTheme.colors.onSurfaceVariant,
  },
  modalTypeBtnTextActive: {
    color: SmashTheme.colors.primary,
    fontWeight: '800',
  },
  modalTypeBtnTextActiveCyan: {
    color: SmashTheme.colors.secondary,
    fontWeight: '800',
  },
});
