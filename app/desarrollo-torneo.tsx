import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
  StatusBar,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

interface JugadorInfo {
  id: string;
  nombre: string;
  club?: string;
}

interface Partido {
  id: string;
  numeroPartido: number;
  ronda: string;
  jugador1: JugadorInfo | null;
  jugador2: JugadorInfo | null;
  marcador1: number;
  marcador2: number;
  puntosDetalle?: string;
  ganadorId: string | null;
  ganadorNombre: string | null;
  estado: 'pendiente' | 'en_juego' | 'finalizado';
  siguientePartidoNumero?: number | null;
  posicionEnSiguiente?: 1 | 2 | null;
}

interface PosicionJugador {
  id: string;
  nombre: string;
  club?: string;
  pj: number;
  pg: number;
  pp: number;
  sf: number;
  sc: number;
  puntos: number;
}

export default function DesarrolloTorneoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    torneoId?: string;
    nombreTorneo?: string;
    modalidad?: string;
    esPropietario?: string;
  }>();

  const torneoId = params.torneoId || '';

  // Datos del torneo
  const [torneo, setTorneo] = useState<{
    nombreTorneo: string;
    modalidad: string;
    usuarioId: string;
    categoria?: string;
    organizador?: string;
    lugarSede?: string;
  }>({
    nombreTorneo: params.nombreTorneo || 'Desarrollo del Torneo',
    modalidad: params.modalidad || 'Eliminación directa',
    usuarioId: '',
  });

  const [jugadores, setJugadores] = useState<JugadorInfo[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);

  // Tab para modalidad Todos contra todos
  const [tabActual, setTabActual] = useState<'partidos' | 'posiciones'>('partidos');

  // Estado para modal de registro de marcador
  const [modalVisible, setModalVisible] = useState(false);
  const [partidoActivo, setPartidoActivo] = useState<Partido | null>(null);
  const [marcador1, setMarcador1] = useState(0);
  const [marcador2, setMarcador2] = useState(0);
  const [puntosDetalle, setPuntosDetalle] = useState('');
  const [guardandoResultado, setGuardandoResultado] = useState(false);

  // Verificación de propietario
  const currentUid = auth.currentUser?.uid;
  const esPropietario =
    params.esPropietario === 'true' ||
    (!!currentUid && !!torneo.usuarioId && currentUid === torneo.usuarioId);

  // 1. Escuchar datos del torneo
  useEffect(() => {
    if (!torneoId) return;
    const torneoRef = doc(db, 'torneos', torneoId);
    const unsub = onSnapshot(torneoRef, (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        setTorneo({
          nombreTorneo: d.nombreTorneo || params.nombreTorneo || 'Torneo',
          modalidad: d.modalidad || params.modalidad || 'Eliminación directa',
          usuarioId: d.usuarioId || '',
          categoria: d.categoria || '',
          organizador: d.organizador || '',
          lugarSede: d.lugarSede || '',
        });
      }
    });
    return () => unsub();
  }, [torneoId]);

  // 2. Escuchar jugadores registrados
  useEffect(() => {
    if (!torneoId) return;
    const jugadoresRef = collection(db, 'torneos', torneoId, 'jugadores');
    const q = query(jugadoresRef, orderBy('creadoEn', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: JugadorInfo[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          nombre: d.nombre || 'Jugador',
          club: d.club || '',
        });
      });
      setJugadores(list);
    });
    return () => unsub();
  }, [torneoId]);

  // 3. Escuchar partidos en tiempo real
  useEffect(() => {
    if (!torneoId) {
      setCargando(false);
      return;
    }
    const partidosRef = collection(db, 'torneos', torneoId, 'partidos');
    const q = query(partidosRef, orderBy('numeroPartido', 'asc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: Partido[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            numeroPartido: d.numeroPartido || 0,
            ronda: d.ronda || 'Ronda',
            jugador1: d.jugador1 || null,
            jugador2: d.jugador2 || null,
            marcador1: d.marcador1 ?? 0,
            marcador2: d.marcador2 ?? 0,
            puntosDetalle: d.puntosDetalle || '',
            ganadorId: d.ganadorId || null,
            ganadorNombre: d.ganadorNombre || null,
            estado: d.estado || 'pendiente',
            siguientePartidoNumero: d.siguientePartidoNumero || null,
            posicionEnSiguiente: d.posicionEnSiguiente || null,
          });
        });
        setPartidos(list);
        setCargando(false);
      },
      (err) => {
        console.error('Error al escuchar partidos:', err);
        setCargando(false);
      }
    );
    return () => unsub();
  }, [torneoId]);

  // Generar Fixture según modalidad
  const handleGenerarFixture = async () => {
    if (jugadores.length < 2) {
      const msg = 'Se necesitan al menos 2 jugadores registrados para generar el fixture.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Jugadores insuficientes', msg);
      return;
    }

    setGenerando(true);
    try {
      // Limpiar partidos existentes primero si los hubiera
      const partidosRef = collection(db, 'torneos', torneoId, 'partidos');
      const snap = await getDocs(partidosRef);
      const delPromises = snap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(delPromises);

      if (torneo.modalidad === 'Todos contra todos') {
        // Round Robin: cada jugador contra todos
        let numeroPartido = 1;
        const addPromises = [];
        for (let i = 0; i < jugadores.length; i++) {
          for (let j = i + 1; j < jugadores.length; j++) {
            addPromises.push(
              addDoc(partidosRef, {
                numeroPartido: numeroPartido++,
                ronda: 'Todos contra todos',
                jugador1: {
                  id: jugadores[i].id,
                  nombre: jugadores[i].nombre,
                  club: jugadores[i].club || '',
                },
                jugador2: {
                  id: jugadores[j].id,
                  nombre: jugadores[j].nombre,
                  club: jugadores[j].club || '',
                },
                marcador1: 0,
                marcador2: 0,
                puntosDetalle: '',
                ganadorId: null,
                ganadorNombre: null,
                estado: 'pendiente',
                siguientePartidoNumero: null,
                posicionEnSiguiente: null,
                creadoEn: serverTimestamp(),
              })
            );
          }
        }
        await Promise.all(addPromises);
      } else {
        // Eliminación Directa
        const totalJugadores = jugadores.length;
        if (totalJugadores === 2) {
          // Solo la final
          await addDoc(partidosRef, {
            numeroPartido: 1,
            ronda: 'Gran Final',
            jugador1: { id: jugadores[0].id, nombre: jugadores[0].nombre, club: jugadores[0].club || '' },
            jugador2: { id: jugadores[1].id, nombre: jugadores[1].nombre, club: jugadores[1].club || '' },
            marcador1: 0,
            marcador2: 0,
            puntosDetalle: '',
            ganadorId: null,
            ganadorNombre: null,
            estado: 'pendiente',
            siguientePartidoNumero: null,
            posicionEnSiguiente: null,
            creadoEn: serverTimestamp(),
          });
        } else if (totalJugadores <= 4) {
          // Semifinales + Final (3 partidos)
          await addDoc(partidosRef, {
            numeroPartido: 1,
            ronda: 'Semifinal 1',
            jugador1: { id: jugadores[0].id, nombre: jugadores[0].nombre, club: jugadores[0].club || '' },
            jugador2: { id: jugadores[1].id, nombre: jugadores[1].nombre, club: jugadores[1].club || '' },
            marcador1: 0,
            marcador2: 0,
            puntosDetalle: '',
            ganadorId: null,
            ganadorNombre: null,
            estado: 'pendiente',
            siguientePartidoNumero: 3,
            posicionEnSiguiente: 1,
            creadoEn: serverTimestamp(),
          });

          await addDoc(partidosRef, {
            numeroPartido: 2,
            ronda: 'Semifinal 2',
            jugador1: { id: jugadores[2].id, nombre: jugadores[2].nombre, club: jugadores[2].club || '' },
            jugador2: jugadores[3]
              ? { id: jugadores[3].id, nombre: jugadores[3].nombre, club: jugadores[3].club || '' }
              : null,
            marcador1: 0,
            marcador2: 0,
            puntosDetalle: '',
            ganadorId: !jugadores[3] ? jugadores[2].id : null,
            ganadorNombre: !jugadores[3] ? jugadores[2].nombre : null,
            estado: !jugadores[3] ? 'finalizado' : 'pendiente',
            siguientePartidoNumero: 3,
            posicionEnSiguiente: 2,
            creadoEn: serverTimestamp(),
          });

          await addDoc(partidosRef, {
            numeroPartido: 3,
            ronda: 'Gran Final',
            jugador1: null,
            jugador2: !jugadores[3]
              ? { id: jugadores[2].id, nombre: jugadores[2].nombre, club: jugadores[2].club || '' }
              : null,
            marcador1: 0,
            marcador2: 0,
            puntosDetalle: '',
            ganadorId: null,
            ganadorNombre: null,
            estado: 'pendiente',
            siguientePartidoNumero: null,
            posicionEnSiguiente: null,
            creadoEn: serverTimestamp(),
          });
        } else {
          // 5 a 8 jugadores: Cuartos (4 partidos) + Semis (2 partidos) + Final (1 partido) = 7 partidos
          // Cuartos
          for (let i = 0; i < 4; i++) {
            const j1 = jugadores[i * 2] || null;
            const j2 = jugadores[i * 2 + 1] || null;
            const semiNum = i < 2 ? 5 : 6;
            const pos = i % 2 === 0 ? 1 : 2;

            await addDoc(partidosRef, {
              numeroPartido: i + 1,
              ronda: 'Cuartos de final',
              jugador1: j1 ? { id: j1.id, nombre: j1.nombre, club: j1.club || '' } : null,
              jugador2: j2 ? { id: j2.id, nombre: j2.nombre, club: j2.club || '' } : null,
              marcador1: 0,
              marcador2: 0,
              puntosDetalle: '',
              ganadorId: j1 && !j2 ? j1.id : null,
              ganadorNombre: j1 && !j2 ? j1.nombre : null,
              estado: j1 && !j2 ? 'finalizado' : 'pendiente',
              siguientePartidoNumero: semiNum,
              posicionEnSiguiente: pos,
              creadoEn: serverTimestamp(),
            });
          }

          // Semifinales
          await addDoc(partidosRef, {
            numeroPartido: 5,
            ronda: 'Semifinal 1',
            jugador1: null,
            jugador2: null,
            marcador1: 0,
            marcador2: 0,
            puntosDetalle: '',
            ganadorId: null,
            ganadorNombre: null,
            estado: 'pendiente',
            siguientePartidoNumero: 7,
            posicionEnSiguiente: 1,
            creadoEn: serverTimestamp(),
          });

          await addDoc(partidosRef, {
            numeroPartido: 6,
            ronda: 'Semifinal 2',
            jugador1: null,
            jugador2: null,
            marcador1: 0,
            marcador2: 0,
            puntosDetalle: '',
            ganadorId: null,
            ganadorNombre: null,
            estado: 'pendiente',
            siguientePartidoNumero: 7,
            posicionEnSiguiente: 2,
            creadoEn: serverTimestamp(),
          });

          // Gran Final
          await addDoc(partidosRef, {
            numeroPartido: 7,
            ronda: 'Gran Final',
            jugador1: null,
            jugador2: null,
            marcador1: 0,
            marcador2: 0,
            puntosDetalle: '',
            ganadorId: null,
            ganadorNombre: null,
            estado: 'pendiente',
            siguientePartidoNumero: null,
            posicionEnSiguiente: null,
            creadoEn: serverTimestamp(),
          });
        }
      }

      const msg = '¡Fixture generado con éxito!';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('¡Excelente!', msg);
    } catch (e: any) {
      const err = e.message || 'Error al generar los partidos.';
      if (Platform.OS === 'web') window.alert(err);
      else Alert.alert('Error', err);
    } finally {
      setGenerando(false);
    }
  };

  // Abrir modal de resultado
  const abrirModalResultado = (partido: Partido) => {
    setPartidoActivo(partido);
    setMarcador1(partido.marcador1 || 0);
    setMarcador2(partido.marcador2 || 0);
    setPuntosDetalle(partido.puntosDetalle || '');
    setModalVisible(true);
  };

  // Guardar resultado de partido
  const handleGuardarResultado = async () => {
    if (!partidoActivo) return;

    if (marcador1 === marcador2) {
      const msg = 'En tenis de mesa no hay empates. Un jugador debe ganar la serie de sets.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Empate no permitido', msg);
      return;
    }

    const ganador = marcador1 > marcador2 ? partidoActivo.jugador1 : partidoActivo.jugador2;
    if (!ganador) {
      const msg = 'No se ha determinado el jugador ganador.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
      return;
    }

    setGuardandoResultado(true);
    try {
      const partidoRef = doc(db, 'torneos', torneoId, 'partidos', partidoActivo.id);
      await updateDoc(partidoRef, {
        marcador1,
        marcador2,
        puntosDetalle: puntosDetalle.trim(),
        ganadorId: ganador.id,
        ganadorNombre: ganador.nombre,
        estado: 'finalizado',
      });

      // Si es eliminación directa y tiene siguiente partido programado, avanzar ganador
      if (partidoActivo.siguientePartidoNumero) {
        const partidosRef = collection(db, 'torneos', torneoId, 'partidos');
        const snap = await getDocs(partidosRef);
        const sigPartidoDoc = snap.docs.find(
          (d) => d.data().numeroPartido === partidoActivo.siguientePartidoNumero
        );

        if (sigPartidoDoc) {
          const updateField =
            partidoActivo.posicionEnSiguiente === 1 ? 'jugador1' : 'jugador2';
          await updateDoc(sigPartidoDoc.ref, {
            [updateField]: {
              id: ganador.id,
              nombre: ganador.nombre,
              club: ganador.club || '',
            },
          });
        }
      }

      setModalVisible(false);
    } catch (e: any) {
      const err = e.message || 'Error al guardar el resultado.';
      if (Platform.OS === 'web') window.alert(err);
      else Alert.alert('Error', err);
    } finally {
      setGuardandoResultado(false);
    }
  };

  // Calcular tabla de posiciones para Round Robin
  const calcularPosiciones = (): PosicionJugador[] => {
    const mapa: { [id: string]: PosicionJugador } = {};

    jugadores.forEach((j) => {
      mapa[j.id] = {
        id: j.id,
        nombre: j.nombre,
        club: j.club,
        pj: 0,
        pg: 0,
        pp: 0,
        sf: 0,
        sc: 0,
        puntos: 0,
      };
    });

    partidos.forEach((p) => {
      if (p.estado === 'finalizado' && p.jugador1 && p.jugador2) {
        const j1 = mapa[p.jugador1.id];
        const j2 = mapa[p.jugador2.id];

        if (j1 && j2) {
          j1.pj += 1;
          j2.pj += 1;
          j1.sf += p.marcador1;
          j1.sc += p.marcador2;
          j2.sf += p.marcador2;
          j2.sc += p.marcador1;

          if (p.marcador1 > p.marcador2) {
            j1.pg += 1;
            j1.puntos += 2; // 2 pts por victoria
            j2.pp += 1;
            j2.puntos += 1; // 1 pt por partido jugado
          } else {
            j2.pg += 1;
            j2.puntos += 2;
            j1.pp += 1;
            j1.puntos += 1;
          }
        }
      }
    });

    const lista = Object.values(mapa);
    lista.sort((a, b) => {
      if (b.puntos !== a.puntos) return b.puntos - a.puntos;
      const difA = a.sf - a.sc;
      const difB = b.sf - b.sc;
      if (difB !== difA) return difB - difA;
      return b.sf - a.sf;
    });

    return lista;
  };

  // Detectar campeón de la final en Eliminación Directa
  const partidoFinal = partidos.find((p) => p.ronda === 'Gran Final');
  const campeonFinal =
    partidoFinal && partidoFinal.estado === 'finalizado' ? partidoFinal.ganadorNombre : null;

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

          {/* Encabezado fijo */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color="#ffffff" />
              <Text style={styles.backButtonText}>Volver</Text>
            </TouchableOpacity>

            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                Desarrollo del Torneo
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {torneo.nombreTorneo}
              </Text>
            </View>

            <View style={{ width: 70 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {/* Banner de Estado del Torneo */}
            <View style={styles.statusCard}>
              <View style={styles.statusCardTop}>
                <View style={styles.trophyIconContainer}>
                  <Ionicons name="trophy" size={24} color="#d97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusTournamentName} numberOfLines={2}>
                    {torneo.nombreTorneo}
                  </Text>
                  <View style={styles.badgesRow}>
                    <View style={styles.badgeModality}>
                      <Text style={styles.badgeModalityText}>{torneo.modalidad}</Text>
                    </View>
                    <View style={styles.badgePlayers}>
                      <Text style={styles.badgePlayersText}>
                        {jugadores.length} {jugadores.length === 1 ? 'jugador' : 'jugadores'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Si hay un campeón declarado */}
              {campeonFinal && (
                <View style={styles.championBanner}>
                  <Ionicons name="ribbon" size={26} color="#d97706" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.championTitle}>¡CAMPEÓN DEL TORNEO!</Text>
                    <Text style={styles.championName}>{campeonFinal}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Si no se ha generado fixture aún */}
            {partidos.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="game-controller-outline" size={54} color="#94a3b8" />
                <Text style={styles.emptyTitle}>El fixture no ha sido generado</Text>
                <Text style={styles.emptyDesc}>
                  {esPropietario
                    ? 'Como organizador, puedes generar los emparejamientos y cruces de partidos ahora.'
                    : 'El organizador aún no ha iniciado los partidos del torneo. Vuelve pronto para seguir los resultados.'}
                </Text>

                {esPropietario && (
                  <TouchableOpacity
                    style={[styles.generateButton, generando && { opacity: 0.7 }]}
                    onPress={handleGenerarFixture}
                    disabled={generando}
                    activeOpacity={0.85}>
                    {generando ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="flash-outline" size={20} color="#ffffff" />
                        <Text style={styles.generateButtonText}>Generar Fixture y Partidos</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <>
                {/* Switcher para Todos contra todos */}
                {torneo.modalidad === 'Todos contra todos' && (
                  <View style={styles.tabsContainer}>
                    <TouchableOpacity
                      style={[styles.tabButton, tabActual === 'partidos' && styles.tabButtonActive]}
                      onPress={() => setTabActual('partidos')}
                      activeOpacity={0.8}>
                      <Ionicons
                        name="tennisball-outline"
                        size={17}
                        color={tabActual === 'partidos' ? '#2563eb' : '#64748b'}
                      />
                      <Text
                        style={[
                          styles.tabButtonText,
                          tabActual === 'partidos' && styles.tabButtonTextActive,
                        ]}>
                        Partidos ({partidos.length})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.tabButton,
                        tabActual === 'posiciones' && styles.tabButtonActive,
                      ]}
                      onPress={() => setTabActual('posiciones')}
                      activeOpacity={0.8}>
                      <Ionicons
                        name="podium-outline"
                        size={17}
                        color={tabActual === 'posiciones' ? '#2563eb' : '#64748b'}
                      />
                      <Text
                        style={[
                          styles.tabButtonText,
                          tabActual === 'posiciones' && styles.tabButtonTextActive,
                        ]}>
                        Tabla de Posiciones
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Vista 1: Tabla de posiciones (solo Round Robin) */}
                {torneo.modalidad === 'Todos contra todos' && tabActual === 'posiciones' ? (
                  <View style={styles.standingsCard}>
                    <View style={styles.standingsHeaderRow}>
                      <Text style={[styles.standingsCol, { width: 34, textAlign: 'center' }]}>#</Text>
                      <Text style={[styles.standingsCol, { flex: 1 }]}>Jugador</Text>
                      <Text style={[styles.standingsCol, { width: 32, textAlign: 'center' }]}>PJ</Text>
                      <Text style={[styles.standingsCol, { width: 32, textAlign: 'center' }]}>PG</Text>
                      <Text style={[styles.standingsCol, { width: 32, textAlign: 'center' }]}>PP</Text>
                      <Text style={[styles.standingsCol, { width: 42, textAlign: 'center' }]}>Sets</Text>
                      <Text style={[styles.standingsCol, { width: 36, textAlign: 'center', fontWeight: '800', color: '#2563eb' }]}>
                        Pts
                      </Text>
                    </View>

                    {calcularPosiciones().map((pos, idx) => {
                      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}°`;
                      return (
                        <View
                          key={pos.id}
                          style={[
                            styles.standingsRow,
                            idx % 2 === 0 && { backgroundColor: '#f8fafc' },
                            idx === 0 && { backgroundColor: '#fef3c7' },
                          ]}>
                          <Text style={[styles.standingsCell, { width: 34, textAlign: 'center', fontWeight: '700' }]}>
                            {medal}
                          </Text>
                          <View style={{ flex: 1, paddingRight: 4 }}>
                            <Text style={styles.standingsPlayerName} numberOfLines={1}>
                              {pos.nombre}
                            </Text>
                            {pos.club ? (
                              <Text style={styles.standingsPlayerClub} numberOfLines={1}>
                                {pos.club}
                              </Text>
                            ) : null}
                          </View>
                          <Text style={[styles.standingsCell, { width: 32, textAlign: 'center' }]}>
                            {pos.pj}
                          </Text>
                          <Text style={[styles.standingsCell, { width: 32, textAlign: 'center', color: '#16a34a', fontWeight: '700' }]}>
                            {pos.pg}
                          </Text>
                          <Text style={[styles.standingsCell, { width: 32, textAlign: 'center', color: '#dc2626' }]}>
                            {pos.pp}
                          </Text>
                          <Text style={[styles.standingsCell, { width: 42, textAlign: 'center', fontSize: 11.5 }]}>
                            {pos.sf}-{pos.sc}
                          </Text>
                          <Text style={[styles.standingsCell, { width: 36, textAlign: 'center', fontWeight: '800', color: '#2563eb' }]}>
                            {pos.puntos}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  /* Vista 2: Lista de Partidos / Cruces */
                  <View style={styles.matchesList}>
                    {partidos.map((partido) => {
                      const finalizado = partido.estado === 'finalizado';
                      const j1Ganador = finalizado && partido.ganadorId === partido.jugador1?.id;
                      const j2Ganador = finalizado && partido.ganadorId === partido.jugador2?.id;

                      return (
                        <View key={partido.id} style={styles.matchCard}>
                          {/* Cabecera del partido */}
                          <View style={styles.matchCardHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <View style={styles.matchNumberBadge}>
                                <Text style={styles.matchNumberText}>#{partido.numeroPartido}</Text>
                              </View>
                              <Text style={styles.matchRoundText}>{partido.ronda}</Text>
                            </View>

                            <View
                              style={[
                                styles.statusPill,
                                finalizado ? styles.statusPillFinished : styles.statusPillPending,
                              ]}>
                              <Text
                                style={[
                                  styles.statusPillText,
                                  finalizado
                                    ? styles.statusPillTextFinished
                                    : styles.statusPillTextPending,
                                ]}>
                                {finalizado ? 'Finalizado' : 'Pendiente'}
                              </Text>
                            </View>
                          </View>

                          {/* Contendientes */}
                          <View style={styles.matchVersusContainer}>
                            {/* Jugador 1 */}
                            <View
                              style={[
                                styles.playerSide,
                                j1Ganador && styles.playerSideWinner,
                              ]}>
                              <Text
                                style={[
                                  styles.matchPlayerName,
                                  j1Ganador && styles.matchPlayerNameWinner,
                                ]}
                                numberOfLines={1}>
                                {partido.jugador1 ? partido.jugador1.nombre : 'Por definir'}
                              </Text>
                              {j1Ganador && (
                                <Ionicons name="trophy" size={14} color="#d97706" style={{ marginTop: 2 }} />
                              )}
                            </View>

                            {/* Marcador central */}
                            <View style={styles.scoreContainer}>
                              <Text
                                style={[
                                  styles.scoreDigit,
                                  finalizado && { color: j1Ganador ? '#16a34a' : '#64748b' },
                                ]}>
                                {partido.marcador1}
                              </Text>
                              <Text style={styles.scoreSeparator}>-</Text>
                              <Text
                                style={[
                                  styles.scoreDigit,
                                  finalizado && { color: j2Ganador ? '#16a34a' : '#64748b' },
                                ]}>
                                {partido.marcador2}
                              </Text>
                            </View>

                            {/* Jugador 2 */}
                            <View
                              style={[
                                styles.playerSide,
                                j2Ganador && styles.playerSideWinner,
                              ]}>
                              <Text
                                style={[
                                  styles.matchPlayerName,
                                  j2Ganador && styles.matchPlayerNameWinner,
                                ]}
                                numberOfLines={1}>
                                {partido.jugador2 ? partido.jugador2.nombre : 'Por definir'}
                              </Text>
                              {j2Ganador && (
                                <Ionicons name="trophy" size={14} color="#d97706" style={{ marginTop: 2 }} />
                              )}
                            </View>
                          </View>

                          {/* Detalle de puntos si existe */}
                          {partido.puntosDetalle ? (
                            <Text style={styles.pointsDetailText}>
                              Sets: {partido.puntosDetalle}
                            </Text>
                          ) : null}

                          {/* Botón de registrar resultado (Solo propietario) */}
                          {esPropietario && (
                            <TouchableOpacity
                              style={styles.recordScoreButton}
                              onPress={() => abrirModalResultado(partido)}
                              activeOpacity={0.8}>
                              <Ionicons
                                name={finalizado ? 'pencil-outline' : 'create-outline'}
                                size={15}
                                color="#2563eb"
                              />
                              <Text style={styles.recordScoreButtonText}>
                                {finalizado ? 'Editar Resultado' : 'Registrar Marcador'}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Botón para reiniciar fixture si es propietario */}
                {esPropietario && (
                  <TouchableOpacity
                    style={styles.resetFixtureButton}
                    onPress={() => {
                      const confMsg = '¿Deseas reiniciar los partidos? Se borrarán todos los resultados registrados.';
                      if (Platform.OS === 'web') {
                        if (window.confirm(confMsg)) handleGenerarFixture();
                      } else {
                        Alert.alert('Reiniciar Fixture', confMsg, [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Reiniciar', style: 'destructive', onPress: handleGenerarFixture },
                        ]);
                      }
                    }}
                    activeOpacity={0.8}>
                    <Ionicons name="refresh-outline" size={16} color="#64748b" />
                    <Text style={styles.resetFixtureButtonText}>Regenerar / Reiniciar Fixture</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>

          {/* Modal para Registrar/Editar Marcador */}
          <Modal
            visible={modalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Anotar Marcador</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {partidoActivo && (
                  <View style={{ gap: 16 }}>
                    <Text style={styles.modalMatchInfo}>
                      {partidoActivo.ronda} • Partido #{partidoActivo.numeroPartido}
                    </Text>

                    {/* Selector de Sets Ganados */}
                    <View style={styles.scoreInputRow}>
                      {/* Jugador 1 */}
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={styles.scoreInputLabel} numberOfLines={2}>
                          {partidoActivo.jugador1?.nombre || 'Jugador 1'}
                        </Text>
                        <View style={styles.counterRow}>
                          <TouchableOpacity
                            style={styles.stepButton}
                            onPress={() => setMarcador1(Math.max(0, marcador1 - 1))}>
                            <Ionicons name="remove" size={18} color="#0f172a" />
                          </TouchableOpacity>
                          <Text style={styles.counterValue}>{marcador1}</Text>
                          <TouchableOpacity
                            style={styles.stepButton}
                            onPress={() => setMarcador1(marcador1 + 1)}>
                            <Ionicons name="add" size={18} color="#0f172a" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <Text style={{ fontSize: 20, fontWeight: '800', color: '#64748b' }}>VS</Text>

                      {/* Jugador 2 */}
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={styles.scoreInputLabel} numberOfLines={2}>
                          {partidoActivo.jugador2?.nombre || 'Jugador 2'}
                        </Text>
                        <View style={styles.counterRow}>
                          <TouchableOpacity
                            style={styles.stepButton}
                            onPress={() => setMarcador2(Math.max(0, marcador2 - 1))}>
                            <Ionicons name="remove" size={18} color="#0f172a" />
                          </TouchableOpacity>
                          <Text style={styles.counterValue}>{marcador2}</Text>
                          <TouchableOpacity
                            style={styles.stepButton}
                            onPress={() => setMarcador2(marcador2 + 1)}>
                            <Ionicons name="add" size={18} color="#0f172a" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {/* Botones rápidos de marcador típico de Tenis de Mesa (al mejor de 3 o 5 sets) */}
                    <View style={styles.quickScoreRow}>
                      {[
                        [3, 0],
                        [3, 1],
                        [3, 2],
                        [0, 3],
                        [1, 3],
                        [2, 3],
                      ].map(([s1, s2], idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.quickScorePill}
                          onPress={() => {
                            setMarcador1(s1);
                            setMarcador2(s2);
                          }}>
                          <Text style={styles.quickScorePillText}>
                            {s1} - {s2}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Detalle de puntos opcional (ej: 11-9, 11-8) */}
                    <View>
                      <Text style={styles.detailLabel}>Detalle de sets (opcional):</Text>
                      <TextInput
                        style={styles.detailInput}
                        value={puntosDetalle}
                        onChangeText={setPuntosDetalle}
                        placeholder="Ej: 11-9, 8-11, 11-7"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>

                    {/* Botones de acción del modal */}
                    <View style={styles.modalButtonsRow}>
                      <TouchableOpacity
                        style={styles.modalCancelButton}
                        onPress={() => setModalVisible(false)}>
                        <Text style={styles.modalCancelButtonText}>Cancelar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.modalSaveButton, guardandoResultado && { opacity: 0.7 }]}
                        onPress={handleGuardarResultado}
                        disabled={guardandoResultado}>
                        {guardandoResultado ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Text style={styles.modalSaveButtonText}>Guardar Resultado</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>
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
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    gap: 4,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  statusCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trophyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTournamentName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  badgeModality: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeModalityText: {
    color: '#1d4ed8',
    fontSize: 11.5,
    fontWeight: '700',
  },
  badgePlayers: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgePlayersText: {
    color: '#16a34a',
    fontSize: 11.5,
    fontWeight: '700',
  },
  championBanner: {
    marginTop: 12,
    backgroundColor: '#fffbeb',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  championTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b45309',
    letterSpacing: 0.5,
  },
  championName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 6,
  },
  emptyDesc: {
    fontSize: 13.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  generateButton: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  generateButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#eff6ff',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabButtonTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  standingsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderRadius: 18,
    overflow: 'hidden',
    paddingVertical: 8,
  },
  standingsHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  standingsCol: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  standingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  standingsCell: {
    fontSize: 13,
    color: '#1e293b',
  },
  standingsPlayerName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  standingsPlayerClub: {
    fontSize: 11,
    color: '#64748b',
  },
  matchesList: {
    gap: 12,
  },
  matchCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  matchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  matchNumberBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  matchNumberText: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '700',
  },
  matchRoundText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusPillFinished: {
    backgroundColor: '#f0fdf4',
  },
  statusPillPending: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusPillTextFinished: {
    color: '#16a34a',
  },
  statusPillTextPending: {
    color: '#64748b',
  },
  matchVersusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  playerSide: {
    flex: 1,
    alignItems: 'center',
  },
  playerSideWinner: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: 8,
    paddingVertical: 4,
  },
  matchPlayerName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
  matchPlayerNameWinner: {
    fontWeight: '800',
    color: '#0f172a',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  scoreDigit: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  scoreSeparator: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
  },
  pointsDetailText: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 6,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  recordScoreButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 10,
  },
  recordScoreButtonText: {
    color: '#2563eb',
    fontSize: 12.5,
    fontWeight: '700',
  },
  resetFixtureButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 14,
  },
  resetFixtureButtonText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 440,
    padding: 20,
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
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalMatchInfo: {
    fontSize: 12.5,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
  },
  scoreInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
  },
  scoreInputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    marginBottom: 8,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    minWidth: 20,
    textAlign: 'center',
  },
  quickScoreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  quickScorePill: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  quickScorePillText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '700',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  detailInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#475569',
    fontSize: 13.5,
    fontWeight: '700',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  modalSaveButtonText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
  },
});
