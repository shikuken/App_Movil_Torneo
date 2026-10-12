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

  // Datos del torneo sincronizados en tiempo real
  const [torneoData, setTorneoData] = useState({
    nombreTorneo: params.nombreTorneo || 'Torneo de Tenis de Mesa',
    organizador: '',
    lugarSede: '',
    categoria: '',
    modalidad: params.modalidad || 'Eliminación directa',
    fechaTorneo: '',
    horaTorneo: '',
    usuarioId: '',
    estado: 'creado',
  });

  // Contador de partidos creados para saber si el torneo ya inició
  const [totalPartidos, setTotalPartidos] = useState(0);

  // Escuchar partidos para detectar si el torneo ya comenzó
  useEffect(() => {
    if (!torneoId) return;
    const partidosRef = collection(db, 'torneos', torneoId, 'partidos');
    const unsub = onSnapshot(partidosRef, (snap) => {
      setTotalPartidos(snap.size);
    });
    return () => unsub();
  }, [torneoId]);

  // Si existen partidos o el estado es 'iniciado'/'finalizado', el torneo ya ha iniciado
  const torneoIniciado =
    totalPartidos > 0 ||
    torneoData.estado === 'iniciado' ||
    torneoData.estado === 'finalizado';

  // Verificar si el usuario actual es el propietario
  const currentUid = auth.currentUser?.uid;
  const esPropietario =
    params.esPropietario === 'true' ||
    (!!currentUid && !!torneoData.usuarioId && currentUid === torneoData.usuarioId);

  // Estados del modal de edición del torneo
  const [modalEditarVisible, setModalEditarVisible] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editOrganizador, setEditOrganizador] = useState('');
  const [editLugarSede, setEditLugarSede] = useState('');
  const [editCategoria, setEditCategoria] = useState('');
  const [editModalidad, setEditModalidad] = useState<'Eliminación directa' | 'Todos contra todos'>('Eliminación directa');
  const [editFechaTorneo, setEditFechaTorneo] = useState('');
  const [editHoraTorneo, setEditHoraTorneo] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [eliminandoTorneo, setEliminandoTorneo] = useState(false);

  // Escuchar información del torneo en tiempo real desde Firestore
  useEffect(() => {
    if (!torneoId) return;
    const docRef = doc(db, 'torneos', torneoId);
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        setTorneoData({
          nombreTorneo: d.nombreTorneo || params.nombreTorneo || 'Torneo de Tenis de Mesa',
          organizador: d.organizador || '',
          lugarSede: d.lugarSede || '',
          categoria: d.categoria || '',
          modalidad: d.modalidad || params.modalidad || 'Eliminación directa',
          fechaTorneo: d.fechaTorneo || '',
          horaTorneo: d.horaTorneo || '',
          usuarioId: d.usuarioId || '',
          estado: d.estado || 'creado',
        });
      }
    });
    return () => unsub();
  }, [torneoId]);

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
    if (torneoIniciado) {
      const msg = 'El torneo ya ha iniciado. No se pueden registrar nuevos participantes.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Torneo iniciado', msg);
      return;
    }

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
    if (torneoIniciado) {
      const msg = 'El torneo ya ha iniciado. No se pueden eliminar participantes.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Torneo iniciado', msg);
      return;
    }

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

  // Finalizar torneo o guardar lista de participantes
  const handleFinalizarRegistro = async () => {
    if (torneoIniciado) {
      const ejecutarFin = async () => {
        try {
          await updateDoc(doc(db, 'torneos', torneoId), {
            estado: 'finalizado',
          });
          const msg = `¡El torneo "${torneoData.nombreTorneo}" ha sido finalizado con éxito!`;
          if (Platform.OS === 'web') {
            window.alert(msg);
            router.replace('/(tabs)');
          } else {
            Alert.alert('Torneo Finalizado', msg, [
              { text: 'Ir al Menú Principal', onPress: () => router.replace('/(tabs)') },
            ]);
          }
        } catch (e: any) {
          const err = e.message || 'Error al finalizar el torneo.';
          if (Platform.OS === 'web') window.alert(err);
          else Alert.alert('Error', err);
        }
      };

      const confMsg = '¿Deseas dar por concluido y finalizado este torneo?';
      if (Platform.OS === 'web') {
        if (window.confirm(confMsg)) ejecutarFin();
      } else {
        Alert.alert('Finalizar Torneo', confMsg, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Finalizar Torneo', style: 'destructive', onPress: ejecutarFin },
        ]);
      }
      return;
    }

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

    const exitoMensaje = `¡Registro completado! Se registraron ${jugadores.length} jugador(es) en el torneo "${torneoData.nombreTorneo}".`;
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

  // Abrir modal de edición de la información del torneo
  const abrirModalEditar = () => {
    setEditNombre(torneoData.nombreTorneo);
    setEditOrganizador(torneoData.organizador);
    setEditLugarSede(torneoData.lugarSede);
    setEditCategoria(torneoData.categoria);
    setEditModalidad((torneoData.modalidad as any) || 'Eliminación directa');
    setEditFechaTorneo(torneoData.fechaTorneo);
    setEditHoraTorneo(torneoData.horaTorneo);
    setModalEditarVisible(true);
  };

  // Helper para asignar fecha rápida en edición
  const handleSetEditQuickDate = (diasAdicionales: number) => {
    const d = new Date();
    d.setDate(d.getDate() + diasAdicionales);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setEditFechaTorneo(`${yyyy}-${mm}-${dd}`);
  };

  // Guardar modificaciones a la información del torneo
  const handleGuardarEdicionTorneo = async () => {
    if (!editNombre.trim() || !editOrganizador.trim()) {
      const msg = 'El nombre y organizador del torneo son obligatorios.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Campos incompletos', msg);
      }
      return;
    }

    setGuardandoEdicion(true);
    try {
      const torneoRef = doc(db, 'torneos', torneoId);
      await updateDoc(torneoRef, {
        nombreTorneo: editNombre.trim(),
        organizador: editOrganizador.trim(),
        lugarSede: editLugarSede.trim() || null,
        categoria: editCategoria.trim() || null,
        modalidad: editModalidad,
        fechaTorneo: editFechaTorneo.trim() || null,
        horaTorneo: editHoraTorneo.trim() || null,
      });

      setModalEditarVisible(false);
      const exito = 'Información del torneo actualizada correctamente.';
      if (Platform.OS === 'web') {
        window.alert(exito);
      } else {
        Alert.alert('¡Actualizado!', exito);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'No se pudo actualizar el torneo.';
      if (Platform.OS === 'web') {
        window.alert(`Error: ${errorMsg}`);
      } else {
        Alert.alert('Error al actualizar', errorMsg);
      }
    } finally {
      setGuardandoEdicion(false);
    }
  };

  // Eliminar el torneo por completo
  const handleEliminarTorneo = () => {
    const ejecutarBorrado = async () => {
      setEliminandoTorneo(true);
      try {
        // 1. Eliminar jugadores subcollection
        const jugadoresRef = collection(db, 'torneos', torneoId, 'jugadores');
        const jugadoresSnap = await getDocs(jugadoresRef);
        const delJugadores = jugadoresSnap.docs.map((docSnap) => deleteDoc(docSnap.ref));
        await Promise.all(delJugadores);

        // 2. Eliminar partidos subcollection si existen
        const partidosRef = collection(db, 'torneos', torneoId, 'partidos');
        const partidosSnap = await getDocs(partidosRef);
        const delPartidos = partidosSnap.docs.map((docSnap) => deleteDoc(docSnap.ref));
        await Promise.all(delPartidos);

        // 3. Eliminar documento del torneo
        await deleteDoc(doc(db, 'torneos', torneoId));

        const msg = `El torneo "${torneoData.nombreTorneo}" ha sido eliminado exitosamente.`;
        if (Platform.OS === 'web') {
          window.alert(msg);
          router.replace('/ver-torneos' as any);
        } else {
          Alert.alert('Torneo eliminado', msg, [
            {
              text: 'Aceptar',
              onPress: () => router.replace('/ver-torneos' as any),
            },
          ]);
        }
      } catch (err: any) {
        const errorMsg = err.message || 'No se pudo eliminar el torneo.';
        if (Platform.OS === 'web') {
          window.alert(`Error: ${errorMsg}`);
        } else {
          Alert.alert('Error', errorMsg);
        }
        setEliminandoTorneo(false);
      }
    };

    if (Platform.OS === 'web') {
      const conf = window.confirm(
        `¿Estás seguro de que deseas eliminar permanentemente el torneo "${torneoData.nombreTorneo}"?\n\nEsta acción borrará a todos los participantes inscritos y los partidos registrados. No se puede deshacer.`
      );
      if (conf) {
        ejecutarBorrado();
      }
      return;
    }

    Alert.alert(
      'Eliminar Torneo',
      `¿Deseas eliminar permanentemente "${torneoData.nombreTorneo}"? Se borrarán todos los jugadores y datos asociados.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí, Eliminar Torneo', style: 'destructive', onPress: ejecutarBorrado },
      ]
    );
  };

  // Navegar a la vista de desarrollo del torneo
  const handleIrDesarrolloTorneo = () => {
    router.push({
      pathname: '/desarrollo-torneo' as any,
      params: {
        torneoId,
        nombreTorneo: torneoData.nombreTorneo,
        modalidad: torneoData.modalidad,
        esPropietario: esPropietario ? 'true' : 'false',
      },
    });
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
                <View style={styles.bannerTopRow}>
                  <View style={styles.trophyCircle}>
                    <Ionicons name="trophy" size={28} color="#2563eb" />
                  </View>
                  <View style={styles.bannerTextContainer}>
                    <Text style={styles.bannerSubtitle}>
                      {esPropietario ? 'Gestionando Torneo' : 'Detalles del Torneo'}
                    </Text>
                    <Text style={styles.bannerTitle} numberOfLines={2}>
                      {torneoData.nombreTorneo}
                    </Text>
                  </View>
                </View>

                {/* Detalles rápidos del torneo */}
                <View style={styles.bannerDetailsGrid}>
                  {torneoData.organizador ? (
                    <View style={styles.bannerMetaItem}>
                      <Ionicons name="person-outline" size={14} color="#64748b" />
                      <Text style={styles.bannerMetaText}>Org: {torneoData.organizador}</Text>
                    </View>
                  ) : null}

                  {torneoData.lugarSede ? (
                    <View style={styles.bannerMetaItem}>
                      <Ionicons name="location-outline" size={14} color="#64748b" />
                      <Text style={styles.bannerMetaText}>Sede: {torneoData.lugarSede}</Text>
                    </View>
                  ) : null}

                  {torneoData.fechaTorneo ? (
                    <View style={styles.bannerMetaItem}>
                      <Ionicons name="calendar-outline" size={14} color="#059669" />
                      <Text style={[styles.bannerMetaText, { color: '#059669', fontWeight: '700' }]}>
                        {torneoData.fechaTorneo} {torneoData.horaTorneo ? `(${torneoData.horaTorneo})` : ''}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.badgeContainer}>
                  <View style={styles.badge}>
                    <Ionicons name="git-network-outline" size={14} color="#1d4ed8" />
                    <Text style={styles.badgeText}>{torneoData.modalidad}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: '#f0fdf4' }]}>
                    <Ionicons name="people" size={14} color="#16a34a" />
                    <Text style={[styles.badgeText, { color: '#16a34a' }]}>
                      {jugadores.length} {jugadores.length === 1 ? 'jugador' : 'jugadores'}
                    </Text>
                  </View>
                  {torneoData.categoria ? (
                    <View style={[styles.badge, { backgroundColor: '#fef3c7' }]}>
                      <Ionicons name="pricetag-outline" size={14} color="#b45309" />
                      <Text style={[styles.badgeText, { color: '#b45309' }]}>
                        {torneoData.categoria}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Botón principal para ver desarrollo de partidos */}
                <TouchableOpacity
                  style={styles.bracketAccessButton}
                  onPress={handleIrDesarrolloTorneo}
                  activeOpacity={0.85}>
                  <Ionicons name="game-controller-outline" size={20} color="#ffffff" />
                  <Text style={styles.bracketAccessButtonText}>
                    Desarrollo del Torneo / Fixture
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#ffffff" />
                </TouchableOpacity>

                {/* Botones de gestión para el propietario */}
                {esPropietario && (
                  <View style={styles.ownerActionsRow}>
                    {!torneoIniciado ? (
                      <TouchableOpacity
                        style={styles.editTournamentButton}
                        onPress={abrirModalEditar}
                        activeOpacity={0.8}>
                        <Ionicons name="pencil-outline" size={16} color="#2563eb" />
                        <Text style={styles.editTournamentButtonText}>Editar Información</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.editTournamentButton, { borderColor: '#94a3b8', backgroundColor: '#f1f5f9' }]}>
                        <Ionicons name="lock-closed" size={15} color="#64748b" />
                        <Text style={[styles.editTournamentButtonText, { color: '#64748b' }]}>
                          Edición bloqueada
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[styles.deleteTournamentButton, eliminandoTorneo && { opacity: 0.6 }]}
                      onPress={handleEliminarTorneo}
                      disabled={eliminandoTorneo}
                      activeOpacity={0.8}>
                      {eliminandoTorneo ? (
                        <ActivityIndicator size="small" color="#dc2626" />
                      ) : (
                        <>
                          <Ionicons name="trash-outline" size={16} color="#dc2626" />
                          <Text style={styles.deleteTournamentButtonText}>Eliminar Torneo</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Aviso cuando el torneo ya inició */}
              {torneoIniciado && (
                <View style={styles.tournamentStartedBanner}>
                  <Ionicons name="lock-closed" size={20} color="#d97706" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tournamentStartedTitle}>Torneo Iniciado / En Curso</Text>
                    <Text style={styles.tournamentStartedDesc}>
                      Los partidos ya están en marcha. Las inscripciones y modificaciones están cerradas. Puedes ingresar a "Desarrollo del Torneo" para colocar puntajes y luego finalizar el torneo.
                    </Text>
                  </View>
                </View>
              )}

              {/* Aviso de solo lectura para visitantes */}
              {!esPropietario && !torneoIniciado && (
                <View style={styles.readOnlyNotice}>
                  <Ionicons name="eye-outline" size={18} color="#64748b" />
                  <Text style={styles.readOnlyNoticeText}>
                    Solo el organizador puede agregar o eliminar jugadores.
                  </Text>
                </View>
              )}

              {/* Formulario de Registro de Jugador — solo para el propietario mientras NO haya iniciado */}
              {esPropietario && !torneoIniciado && (
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
                        {/* Botón de eliminar: solo para el propietario mientras el torneo NO haya iniciado */}
                        {esPropietario && !torneoIniciado && (
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

              {/* Botón Finalizar / Guardar Torneo — solo para el propietario */}
              {esPropietario && (
                <TouchableOpacity
                  style={[styles.finishButton, torneoIniciado && { backgroundColor: '#059669' }]}
                  onPress={handleFinalizarRegistro}
                  activeOpacity={0.85}>
                  <Ionicons name="checkmark-circle" size={22} color="#ffffff" />
                  <Text style={styles.finishButtonText}>
                    {torneoIniciado ? 'Concluir y Finalizar Torneo' : 'Finalizar y Guardar Torneo'}
                  </Text>
                </TouchableOpacity>
              )}

            </ScrollView>
          </KeyboardAvoidingView>

          {/* Modal para Editar Información del Torneo */}
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="create-outline" size={24} color="#2563eb" />
                    <Text style={styles.modalTitle}>Editar Torneo</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setModalEditarVisible(false)}
                    style={styles.modalCloseButton}>
                    <Ionicons name="close" size={24} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
                  {/* Nombre */}
                  <View style={styles.modalFormGroup}>
                    <Text style={styles.modalLabel}>Nombre del torneo *</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editNombre}
                      onChangeText={setEditNombre}
                      placeholder="Nombre del torneo"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  {/* Organizador */}
                  <View style={styles.modalFormGroup}>
                    <Text style={styles.modalLabel}>Organizador *</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editOrganizador}
                      onChangeText={setEditOrganizador}
                      placeholder="Organizador"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  {/* Lugar / Sede */}
                  <View style={styles.modalFormGroup}>
                    <Text style={styles.modalLabel}>Lugar / Sede</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editLugarSede}
                      onChangeText={setEditLugarSede}
                      placeholder="Lugar o sede del torneo"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  {/* Categoría */}
                  <View style={styles.modalFormGroup}>
                    <Text style={styles.modalLabel}>Categoría o Nivel</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editCategoria}
                      onChangeText={setEditCategoria}
                      placeholder="Ej: Avanzado, Sub-21"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  {/* Fecha y Hora */}
                  <View style={styles.modalFormRow}>
                    <View style={[styles.modalFormGroup, { flex: 1, marginRight: 6 }]}>
                      <Text style={styles.modalLabel}>Fecha del evento</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={editFechaTorneo}
                        onChangeText={setEditFechaTorneo}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#94a3b8"
                      />
                      <View style={styles.quickButtonsRow}>
                        <TouchableOpacity
                          style={styles.quickDateButton}
                          onPress={() => handleSetEditQuickDate(0)}>
                          <Text style={styles.quickDateText}>Hoy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.quickDateButton}
                          onPress={() => handleSetEditQuickDate(1)}>
                          <Text style={styles.quickDateText}>Mañana</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={[styles.modalFormGroup, { flex: 1, marginLeft: 6 }]}>
                      <Text style={styles.modalLabel}>Hora de inicio</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={editHoraTorneo}
                        onChangeText={setEditHoraTorneo}
                        placeholder="Ej: 09:00 AM"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                  </View>

                  {/* Modalidad */}
                  <View style={styles.modalFormGroup}>
                    <Text style={styles.modalLabel}>Modalidad</Text>
                    <View style={styles.modalModalityRow}>
                      <TouchableOpacity
                        style={[
                          styles.modalModalityButton,
                          editModalidad === 'Eliminación directa' && styles.modalModalityButtonActive,
                        ]}
                        onPress={() => setEditModalidad('Eliminación directa')}>
                        <Text
                          style={[
                            styles.modalModalityText,
                            editModalidad === 'Eliminación directa' && styles.modalModalityTextActive,
                          ]}>
                          Eliminación directa
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.modalModalityButton,
                          editModalidad === 'Todos contra todos' && styles.modalModalityButtonActive,
                        ]}
                        onPress={() => setEditModalidad('Todos contra todos')}>
                        <Text
                          style={[
                            styles.modalModalityText,
                            editModalidad === 'Todos contra todos' && styles.modalModalityTextActive,
                          ]}>
                          Todos contra todos
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>

                {/* Botones de acción modal */}
                <View style={styles.modalActionButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setModalEditarVisible(false)}>
                    <Text style={styles.modalCancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalSaveButton, guardandoEdicion && { opacity: 0.7 }]}
                    onPress={handleGuardarEdicionTorneo}
                    disabled={guardandoEdicion}>
                    {guardandoEdicion ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.modalSaveButtonText}>Guardar Cambios</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>
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
    flexDirection: 'column',
    alignItems: 'stretch',
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
  bannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
  bannerDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 10,
    paddingTop: 4,
  },
  bannerMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bannerMetaText: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '500',
  },
  bracketAccessButton: {
    backgroundColor: '#d97706',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  bracketAccessButtonText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '700',
  },
  ownerActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  editTournamentButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#2563eb',
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
  },
  editTournamentButtonText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteTournamentButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#dc2626',
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
  },
  deleteTournamentButtonText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '700',
  },
  buttonDisabled: {
    borderColor: '#cbd5e1',
    backgroundColor: '#f1f5f9',
  },
  tournamentStartedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(254, 243, 199, 0.95)',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  tournamentStartedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400e',
    marginBottom: 2,
  },
  tournamentStartedDesc: {
    fontSize: 12.5,
    color: '#78350f',
    lineHeight: 17,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    padding: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalFormGroup: {
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 5,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#0f172a',
  },
  modalFormRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  modalModalityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modalModalityButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  modalModalityButtonActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  modalModalityText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
  },
  modalModalityTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  modalActionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 14,
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  modalCancelButtonText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
  modalSaveButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#2563eb',
  },
  modalSaveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  quickButtonsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  quickDateButton: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  quickDateText: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: '600',
  },
});
