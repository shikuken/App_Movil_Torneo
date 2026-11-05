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
  increment,
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { SmashTheme } from '../constants/theme';
import { useToast } from '../context/ToastContext';

interface JugadorInfo {
  id: string;
  nombre: string;
  club?: string;
  usuarioId?: string | null;
  email?: string | null;
}

interface SiguienteDestino {
  numeroPartido: number;
  posicionEnSiguiente: 1 | 2;
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
  /** Múltiples destinos hacia donde avanza el ganador (ej. Triangular Final) */
  siguientesDestinos?: SiguienteDestino[] | null;
  /** Flag para indicar que el partido forma parte de un Triangular Final */
  esTriangular?: boolean;
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
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const params = useLocalSearchParams<{
    torneoId?: string;
    nombreTorneo?: string;
    modalidad?: string;
    tipoTorneo?: string;
    esPropietario?: string;
  }>();

  const torneoId = params.torneoId || '';

  // Datos del torneo
  const [torneo, setTorneo] = useState<{
    nombreTorneo: string;
    modalidad: string;
    usuarioId: string;
    tipoTorneo?: string;
    puntosAsignados?: boolean;
    categoria?: string;
    organizador?: string;
    lugarSede?: string;
  }>({
    nombreTorneo: params.nombreTorneo || 'Desarrollo del Torneo',
    modalidad: params.modalidad || 'Eliminación directa',
    tipoTorneo: params.tipoTorneo || 'amistoso',
    puntosAsignados: false,
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
          tipoTorneo: d.tipoTorneo || params.tipoTorneo || 'amistoso',
          puntosAsignados: d.puntosAsignados || false,
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
          usuarioId: d.usuarioId || null,
          email: d.email || null,
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
            siguientesDestinos: d.siguientesDestinos || null,
            esTriangular: d.esTriangular || false,
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

  // ─────────────────────────────────────────────────────────────
  //  UTILIDADES PARA LA GENERACIÓN DE FIXTURE
  // ─────────────────────────────────────────────────────────────

  /** Devuelve la siguiente potencia de 2 >= n */
  const siguientePotenciaDe2 = (n: number): number => {
    let p = 1;
    while (p < n) p <<= 1;
    return p;
  };

  /** Comprueba si n es exactamente una potencia de 2 */
  const esPotenciaDe2 = (n: number): boolean => n > 0 && (n & (n - 1)) === 0;

  /** Baraja un array in-place con Fisher-Yates */
  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  /** Nombre de ronda según profundidad restante */
  const nombreRonda = (totalRondas: number, rondaIdx: number): string => {
    const restantes = totalRondas - rondaIdx;
    if (restantes === 1) return 'Gran Final';
    if (restantes === 2) return rondaIdx === 0 ? 'Semifinal' : `Semifinal ${rondaIdx}`;
    if (restantes === 3) return `Cuartos de Final`;
    if (restantes === 4) return `Octavos de Final`;
    return `Ronda ${rondaIdx + 1}`;
  };

  // ─────────────────────────────────────────────────────────────
  //  GENERADOR PRINCIPAL DE FIXTURE (Eliminación Directa)
  //  Maneja 3 casos:
  //    A) N = potencia de 2 exacta   → llaves simétricas
  //    B) N no potencia de 2, con byes → byes aleatorios (avance directo)
  //    C) N no potencia de 2, sin byes → todos juegan R1, luego triangular si quedan 3
  // ─────────────────────────────────────────────────────────────
  const generarFixtureEliminacion = async (
    jugadoresLista: JugadorInfo[],
    allowByes: boolean = true
  ) => {
    const partidosRef = collection(db, 'torneos', torneoId, 'partidos');
    const N = jugadoresLista.length;
    const nextPow2 = siguientePotenciaDe2(N);
    const numByes = nextPow2 - N;

    // ── CASO A: Potencia de 2 perfecta ──────────────────────────
    if (esPotenciaDe2(N)) {
      await generarRondasSimetricas(jugadoresLista, partidosRef, 1);
      return;
    }

    // ── CASO B: Byes aleatorios ──────────────────────────────────
    if (allowByes) {
      const mezclados = shuffle(jugadoresLista);
      const conBye = mezclados.slice(0, numByes);
      const sinBye = mezclados.slice(numByes);

      const numPartidosR1 = sinBye.length / 2;
      const offsetR2 = numPartidosR1 + 1;
      const estructuraR2 = construirEstructura(nextPow2 / 2, offsetR2);

      // Distribuir jugadores con bye y dejar null para ganadores de R1
      const slotsR2: (JugadorInfo | null)[] = [
        ...conBye,
        ...Array(numPartidosR1).fill(null),
      ];
      const slotsR2Mezclados = shuffle(slotsR2);

      estructuraR2[0].forEach((partido, idx) => {
        partido.j1 = slotsR2Mezclados[idx * 2] ?? null;
        partido.j2 = slotsR2Mezclados[idx * 2 + 1] ?? null;
      });

      // Partidos reales de R1
      const partidosR1: {
        num: number;
        sig: number | null;
        pos: 1 | 2 | null;
        j1: JugadorInfo;
        j2: JugadorInfo;
      }[] = [];

      let numPartido = 1;
      for (let i = 0; i < sinBye.length; i += 2) {
        partidosR1.push({
          num: numPartido++,
          sig: null,
          pos: null,
          j1: sinBye[i],
          j2: sinBye[i + 1],
        });
      }

      // Conectar cada partido de R1 con el slot null en R2
      let r1Idx = 0;
      for (const pR2 of estructuraR2[0]) {
        if (pR2.j1 === null && r1Idx < partidosR1.length) {
          partidosR1[r1Idx].sig = pR2.num;
          partidosR1[r1Idx].pos = 1;
          r1Idx++;
        }
        if (pR2.j2 === null && r1Idx < partidosR1.length) {
          partidosR1[r1Idx].sig = pR2.num;
          partidosR1[r1Idx].pos = 2;
          r1Idx++;
        }
      }

      // Escribir partidos R1 en Firestore
      for (const p of partidosR1) {
        const dest: SiguienteDestino[] = p.sig && p.pos ? [{ numeroPartido: p.sig, posicionEnSiguiente: p.pos }] : [];
        await addDoc(partidosRef, {
          numeroPartido: p.num,
          ronda: 'Ronda 1',
          jugador1: { id: p.j1.id, nombre: p.j1.nombre, club: p.j1.club || '' },
          jugador2: { id: p.j2.id, nombre: p.j2.nombre, club: p.j2.club || '' },
          marcador1: 0,
          marcador2: 0,
          puntosDetalle: '',
          ganadorId: null,
          ganadorNombre: null,
          estado: 'pendiente',
          siguientePartidoNumero: p.sig || null,
          posicionEnSiguiente: p.pos || null,
          siguientesDestinos: dest.length > 0 ? dest : null,
          creadoEn: serverTimestamp(),
        });
      }

      // Escribir rondas R2+ en Firestore
      const rondasNombres = construirNombresRondas(estructuraR2.length);
      for (let ri = 0; ri < estructuraR2.length; ri++) {
        const rondaNom = rondasNombres[ri];
        for (const p of estructuraR2[ri]) {
          const dest: SiguienteDestino[] = p.sig && p.sigPos ? [{ numeroPartido: p.sig, posicionEnSiguiente: p.sigPos }] : [];
          await addDoc(partidosRef, {
            numeroPartido: p.num,
            ronda: rondaNom,
            jugador1: p.j1 ? { id: p.j1.id, nombre: p.j1.nombre, club: p.j1.club || '' } : null,
            jugador2: p.j2 ? { id: p.j2.id, nombre: p.j2.nombre, club: p.j2.club || '' } : null,
            marcador1: 0,
            marcador2: 0,
            puntosDetalle: '',
            ganadorId: null,
            ganadorNombre: null,
            estado: 'pendiente',
            siguientePartidoNumero: p.sig ?? null,
            posicionEnSiguiente: p.sigPos ?? null,
            siguientesDestinos: dest.length > 0 ? dest : null,
            creadoEn: serverTimestamp(),
          });
        }
      }
      return;
    }

    // ── CASO C: Sin byes — todos juegan R1, posible Triangular Final ─
    const mezclados = shuffle(jugadoresLista);
    const ganadores_r1_count = Math.ceil(N / 2);
    const esTriangular = ganadores_r1_count === 3;

    if (esTriangular) {
      // 6 jugadores -> 3 partidos en Ronda 1 (#1, #2, #3)
      // Y 3 partidos en Triangular Final (#4, #5, #6)
      const pTriangular1 = 4; // G1 vs G2
      const pTriangular2 = 5; // G1 vs G3
      const pTriangular3 = 6; // G2 vs G3

      // Mapeo de destinos para cada ganador de Ronda 1:
      // Ganador R1-1 (Partido 1) -> Partido 4 (jugador1) y Partido 5 (jugador1)
      // Ganador R1-2 (Partido 2) -> Partido 4 (jugador2) y Partido 6 (jugador1)
      // Ganador R1-3 (Partido 3) -> Partido 5 (jugador2) y Partido 6 (jugador2)
      const destinosR1: SiguienteDestino[][] = [
        [
          { numeroPartido: pTriangular1, posicionEnSiguiente: 1 },
          { numeroPartido: pTriangular2, posicionEnSiguiente: 1 },
        ],
        [
          { numeroPartido: pTriangular1, posicionEnSiguiente: 2 },
          { numeroPartido: pTriangular3, posicionEnSiguiente: 1 },
        ],
        [
          { numeroPartido: pTriangular2, posicionEnSiguiente: 2 },
          { numeroPartido: pTriangular3, posicionEnSiguiente: 2 },
        ],
      ];

      // Escribir los 3 partidos de Ronda 1
      for (let i = 0; i < 3; i++) {
        const j1 = mezclados[i * 2];
        const j2 = mezclados[i * 2 + 1];
        await addDoc(partidosRef, {
          numeroPartido: i + 1,
          ronda: 'Ronda 1',
          jugador1: { id: j1.id, nombre: j1.nombre, club: j1.club || '' },
          jugador2: { id: j2.id, nombre: j2.nombre, club: j2.club || '' },
          marcador1: 0,
          marcador2: 0,
          puntosDetalle: '',
          ganadorId: null,
          ganadorNombre: null,
          estado: 'pendiente',
          siguientePartidoNumero: destinosR1[i][0].numeroPartido,
          posicionEnSiguiente: destinosR1[i][0].posicionEnSiguiente,
          siguientesDestinos: destinosR1[i],
          creadoEn: serverTimestamp(),
        });
      }

      // Escribir los 3 partidos del Triangular Final
      await addDoc(partidosRef, {
        numeroPartido: pTriangular1,
        ronda: 'Triangular Final',
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
        siguientesDestinos: null,
        esTriangular: true,
        creadoEn: serverTimestamp(),
      });

      await addDoc(partidosRef, {
        numeroPartido: pTriangular2,
        ronda: 'Triangular Final',
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
        siguientesDestinos: null,
        esTriangular: true,
        creadoEn: serverTimestamp(),
      });

      await addDoc(partidosRef, {
        numeroPartido: pTriangular3,
        ronda: 'Triangular Final',
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
        siguientesDestinos: null,
        esTriangular: true,
        creadoEn: serverTimestamp(),
      });
      return;
    } else {
      // Caso normal sin byes (potencia de 2 o general)
      const offsetR2 = ganadores_r1_count + 1;
      const estructuraR2 = construirEstructura(ganadores_r1_count, offsetR2);
      const rondasNombres = construirNombresRondas(estructuraR2.length);

      let numPart = 1;
      for (let i = 0; i < mezclados.length; i += 2) {
        const j1 = mezclados[i];
        const j2 = mezclados[i + 1] ?? null;
        const partIdxR1 = Math.floor(i / 2);
        const sigPartido = estructuraR2[0][Math.floor(partIdxR1 / 2)];
        const sigNum = sigPartido?.num ?? null;
        const sigPos = (partIdxR1 % 2 === 0 ? 1 : 2) as 1 | 2;
        const dest: SiguienteDestino[] = sigNum ? [{ numeroPartido: sigNum, posicionEnSiguiente: sigPos }] : [];

        await addDoc(partidosRef, {
          numeroPartido: numPart++,
          ronda: 'Ronda 1',
          jugador1: { id: j1.id, nombre: j1.nombre, club: j1.club || '' },
          jugador2: j2 ? { id: j2.id, nombre: j2.nombre, club: j2.club || '' } : null,
          marcador1: 0,
          marcador2: 0,
          puntosDetalle: '',
          ganadorId: !j2 ? j1.id : null,
          ganadorNombre: !j2 ? j1.nombre : null,
          estado: !j2 ? 'finalizado' : 'pendiente',
          siguientePartidoNumero: sigNum,
          posicionEnSiguiente: sigPos,
          siguientesDestinos: dest.length > 0 ? dest : null,
          creadoEn: serverTimestamp(),
        });
      }

      for (let ri = 0; ri < estructuraR2.length; ri++) {
        const rondaNom = rondasNombres[ri];
        for (const p of estructuraR2[ri]) {
          const dest: SiguienteDestino[] = p.sig && p.sigPos ? [{ numeroPartido: p.sig, posicionEnSiguiente: p.sigPos }] : [];
          await addDoc(partidosRef, {
            numeroPartido: p.num,
            ronda: rondaNom,
            jugador1: p.j1 ? { id: p.j1.id, nombre: p.j1.nombre, club: p.j1.club || '' } : null,
            jugador2: p.j2 ? { id: p.j2.id, nombre: p.j2.nombre, club: p.j2.club || '' } : null,
            marcador1: 0,
            marcador2: 0,
            puntosDetalle: '',
            ganadorId: null,
            ganadorNombre: null,
            estado: 'pendiente',
            siguientePartidoNumero: p.sig ?? null,
            posicionEnSiguiente: p.sigPos ?? null,
            siguientesDestinos: dest.length > 0 ? dest : null,
            creadoEn: serverTimestamp(),
          });
        }
      }
      return;
    }
  };

  // ─────────────────────────────────────────────────────────────
  //  Genera bracket simétrico para N jugadores (N debe ser pot. de 2)
  //  Devuelve el número del siguiente partido libre después de los generados
  // ─────────────────────────────────────────────────────────────
  const generarRondasSimetricas = async (
    jugadoresLista: JugadorInfo[],
    ref: ReturnType<typeof collection>,
    offsetNum: number
  ) => {
    const N = jugadoresLista.length;
    const estructura = construirEstructura(N, offsetNum);
    const rondasNombres = construirNombresRondas(estructura.length);

    // Asignar jugadores a la primera ronda
    estructura[0].forEach((partido, idx) => {
      partido.j1 = jugadoresLista[idx * 2] ?? null;
      partido.j2 = jugadoresLista[idx * 2 + 1] ?? null;
    });

    for (let ri = 0; ri < estructura.length; ri++) {
      const rondaNom = rondasNombres[ri];
      for (const p of estructura[ri]) {
        const dest: SiguienteDestino[] = p.sig && p.sigPos ? [{ numeroPartido: p.sig, posicionEnSiguiente: p.sigPos }] : [];
        await addDoc(ref, {
          numeroPartido: p.num,
          ronda: rondaNom,
          jugador1: p.j1 ? { id: p.j1.id, nombre: p.j1.nombre, club: p.j1.club || '' } : null,
          jugador2: p.j2 ? { id: p.j2.id, nombre: p.j2.nombre, club: p.j2.club || '' } : null,
          marcador1: 0,
          marcador2: 0,
          puntosDetalle: '',
          ganadorId: null,
          ganadorNombre: null,
          estado: 'pendiente',
          siguientePartidoNumero: p.sig ?? null,
          posicionEnSiguiente: p.sigPos ?? null,
          siguientesDestinos: dest.length > 0 ? dest : null,
          creadoEn: serverTimestamp(),
        });
      }
    }
  };

  // ─────────────────────────────────────────────────────────────
  //  Construye la estructura de rondas para N participantes
  //  Devuelve array de rondas, cada ronda con partidos numerados y enlaces
  // ─────────────────────────────────────────────────────────────
  type SlotPartido = {
    num: number;
    j1: JugadorInfo | null;
    j2: JugadorInfo | null;
    sig: number | null;
    sigPos: 1 | 2 | null;
    posLibre: number; // 1 o 2 → qué posición está vacía (para byes)
  };

  const construirEstructura = (N: number, offsetNum: number): SlotPartido[][] => {
    const totalRondas = Math.ceil(Math.log2(N));
    const rondas: SlotPartido[][] = [];
    let contadorPartidos = offsetNum;

    // Generar rondas de atrás hacia adelante para poder asignar vínculos
    // Primero calculamos cuántos partidos hay en cada ronda
    const partidosPorRonda: number[] = [];
    let slots = N;
    for (let r = 0; r < totalRondas; r++) {
      partidosPorRonda.push(Math.floor(slots / 2));
      slots = Math.ceil(slots / 2);
    }

    // Crear los partidos asignando números y vínculos
    const rondasTemp: SlotPartido[][] = [];
    for (let r = 0; r < totalRondas; r++) {
      const rondaPartidos: SlotPartido[] = [];
      for (let i = 0; i < partidosPorRonda[r]; i++) {
        rondaPartidos.push({
          num: contadorPartidos++,
          j1: null,
          j2: null,
          sig: null,
          sigPos: null,
          posLibre: 0,
        });
      }
      rondasTemp.push(rondaPartidos);
    }

    // Asignar vínculos: cada partido apunta al partido de la siguiente ronda
    for (let r = 0; r < totalRondas - 1; r++) {
      const siguienteRonda = rondasTemp[r + 1];
      rondasTemp[r].forEach((partido, idx) => {
        const sigPartido = siguienteRonda[Math.floor(idx / 2)];
        partido.sig = sigPartido.num;
        partido.sigPos = idx % 2 === 0 ? 1 : 2;
      });
    }

    return rondasTemp;
  };

  /** Genera nombres de ronda del más general al más específico */
  const construirNombresRondas = (totalRondas: number): string[] => {
    const nombres: string[] = [];
    for (let i = 0; i < totalRondas; i++) {
      const restantes = totalRondas - i;
      if (restantes === 1) nombres.push('Gran Final');
      else if (restantes === 2) nombres.push('Semifinal');
      else if (restantes === 3) nombres.push('Cuartos de Final');
      else if (restantes === 4) nombres.push('Octavos de Final');
      else nombres.push(`Ronda ${i + 1}`);
    }
    return nombres;
  };

  // ─────────────────────────────────────────────────────────────
  //  HANDLER PRINCIPAL — Detecta modalidad y delega
  // ─────────────────────────────────────────────────────────────
  const handleGenerarFixture = async () => {
    if (jugadores.length < 2) {
      showWarning('Se necesitan al menos 2 jugadores registrados para generar el fixture.', 'Jugadores insuficientes');
      return;
    }

    setGenerando(true);
    try {
      // Limpiar partidos existentes
      const partidosRef = collection(db, 'torneos', torneoId, 'partidos');
      const snap = await getDocs(partidosRef);
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));

      if (torneo.modalidad === 'Todos contra todos') {
        // ── Round Robin ────────────────────────────────────────
        let numeroPartido = 1;
        const addPromises = [];
        for (let i = 0; i < jugadores.length; i++) {
          for (let j = i + 1; j < jugadores.length; j++) {
            addPromises.push(
              addDoc(partidosRef, {
                numeroPartido: numeroPartido++,
                ronda: 'Todos contra todos',
                jugador1: { id: jugadores[i].id, nombre: jugadores[i].nombre, club: jugadores[i].club || '' },
                jugador2: { id: jugadores[j].id, nombre: jugadores[j].nombre, club: jugadores[j].club || '' },
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
        // ── Eliminación Directa — motor dinámico ───────────────
        const N = jugadores.length;
        const allowByes = !esPotenciaDe2(N) && (N % 2 === 0 ? false : true);
        // Para N impar usamos byes; para N par no potencia de 2 usamos todos-juegan (allowByes=false)
        // (ej. 6 → todos juegan, 5 → 1 bye, 7 → 1 bye, 9 → 7 byes... etc.)
        const usarByes = !esPotenciaDe2(N) && N % 2 !== 0;
        await generarFixtureEliminacion(jugadores, usarByes);
      }

      showSuccess('¡Fixture generado con éxito!');
    } catch (e: any) {
      showError(e.message || 'Error al generar los partidos.', 'Error');
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

  // Guardar resultado de partido + avance automático del ganador
  const handleGuardarResultado = async () => {
    if (!partidoActivo) return;

    if (marcador1 === marcador2) {
      showWarning('En tenis de mesa no hay empates. Un jugador debe ganar la serie de sets.', 'Empate no permitido');
      return;
    }

    const ganador = marcador1 > marcador2 ? partidoActivo.jugador1 : partidoActivo.jugador2;
    const perdedor = marcador1 > marcador2 ? partidoActivo.jugador2 : partidoActivo.jugador1;

    if (!ganador) {
      showError('No se ha determinado el jugador ganador.', 'Error');
      return;
    }

    setGuardandoResultado(true);
    try {
      // 1. Guardar resultado en el partido actual
      const partidoRef = doc(db, 'torneos', torneoId, 'partidos', partidoActivo.id);
      await updateDoc(partidoRef, {
        marcador1,
        marcador2,
        puntosDetalle: puntosDetalle.trim(),
        ganadorId: ganador.id,
        ganadorNombre: ganador.nombre,
        estado: 'finalizado',
      });

      // 2. Si tiene siguiente partido o destinos → avanzar ganador automáticamente a todos ellos
      const destinos: SiguienteDestino[] = [];
      if (partidoActivo.siguientesDestinos && partidoActivo.siguientesDestinos.length > 0) {
        destinos.push(...partidoActivo.siguientesDestinos);
      } else if (partidoActivo.siguientePartidoNumero && partidoActivo.posicionEnSiguiente) {
        destinos.push({
          numeroPartido: partidoActivo.siguientePartidoNumero,
          posicionEnSiguiente: partidoActivo.posicionEnSiguiente,
        });
      }

      if (destinos.length > 0) {
        const partidosRef = collection(db, 'torneos', torneoId, 'partidos');
        const snap = await getDocs(partidosRef);

        for (const dest of destinos) {
          const sigPartidoDoc = snap.docs.find(
            (d) => d.data().numeroPartido === dest.numeroPartido
          );

          if (sigPartidoDoc) {
            const updateField =
              dest.posicionEnSiguiente === 1 ? 'jugador1' : 'jugador2';

            const sigData = sigPartidoDoc.data();
            const jugadorEnSig: JugadorInfo | null = sigData[updateField] ?? null;
            const perdedorId = perdedor?.id ?? null;

            // Si se está EDITANDO un resultado previo, limpiar el avance del perdedor anterior
            if (jugadorEnSig && perdedorId && jugadorEnSig.id === perdedorId) {
              await updateDoc(sigPartidoDoc.ref, {
                [updateField]: null,
                ganadorId: null,
                ganadorNombre: null,
                estado: 'pendiente',
                marcador1: 0,
                marcador2: 0,
                puntosDetalle: '',
              });
            }

            // Poner al ganador real en el partido siguiente
            await updateDoc(sigPartidoDoc.ref, {
              [updateField]: {
                id: ganador.id,
                nombre: ganador.nombre,
                club: ganador.club || '',
              },
            });
          }
        }
      }


      setModalVisible(false);
    } catch (e: any) {
      showError(e.message || 'Error al guardar el resultado.', 'Error');
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

  // Flag que indica si el torneo incluye una fase de Triangular Final
  const tieneTriangular = partidos.some((p) => p.esTriangular || p.ronda === 'Triangular Final');

  // Calcular tabla de posiciones exclusivamente para los finalistas del Triangular Final
  const calcularPosicionesTriangular = (): PosicionJugador[] => {
    const partidosTriangular = partidos.filter(
      (p) => p.esTriangular || p.ronda === 'Triangular Final'
    );
    const mapa: { [id: string]: PosicionJugador } = {};

    // Inicializar finalistas presentes en el triangular
    partidosTriangular.forEach((p) => {
      if (p.jugador1 && !mapa[p.jugador1.id]) {
        mapa[p.jugador1.id] = {
          id: p.jugador1.id,
          nombre: p.jugador1.nombre,
          club: p.jugador1.club,
          pj: 0,
          pg: 0,
          pp: 0,
          sf: 0,
          sc: 0,
          puntos: 0,
        };
      }
      if (p.jugador2 && !mapa[p.jugador2.id]) {
        mapa[p.jugador2.id] = {
          id: p.jugador2.id,
          nombre: p.jugador2.nombre,
          club: p.jugador2.club,
          pj: 0,
          pg: 0,
          pp: 0,
          sf: 0,
          sc: 0,
          puntos: 0,
        };
      }
    });

    // Computar resultados de partidos jugados del triangular
    partidosTriangular.forEach((p) => {
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
    // Ordenar: 1) Más partidos ganados (PG), 2) Diferencia de Sets, 3) Sets a favor
    lista.sort((a, b) => {
      if (b.pg !== a.pg) return b.pg - a.pg;
      const difA = a.sf - a.sc;
      const difB = b.sf - b.sc;
      if (difB !== difA) return difB - difA;
      return b.sf - a.sf;
    });

    return lista;
  };

  // ─────────────────────────────────────────────────────────────
  //  DETECCIÓN DE CAMPEÓN Y PODIO DEL TORNEO (Todos los modos)
  // ─────────────────────────────────────────────────────────────
  let campeonFinal: string | null = null;
  let campeonDetalle: string | null = null;

  // 1. Caso Eliminación Directa tradicional (Gran Final)
  const partidoFinal = partidos.find((p) => p.ronda === 'Gran Final');
  if (partidoFinal && partidoFinal.estado === 'finalizado' && partidoFinal.ganadorNombre) {
    campeonFinal = partidoFinal.ganadorNombre;
    campeonDetalle = 'Ganador de la Gran Final';
  }

  // 2. Caso Triangular Final (3 finalistas)
  const posTriangular = calcularPosicionesTriangular();
  const partidosTriangular = partidos.filter((p) => p.esTriangular || p.ronda === 'Triangular Final');

  if (!campeonFinal && tieneTriangular && posTriangular.length > 0) {
    const lider = posTriangular[0];
    const totalPartidosTriangular = partidosTriangular.length;
    const finalizadosTriangular = partidosTriangular.filter((p) => p.estado === 'finalizado').length;

    // Se proclama campeón si ganó 2 partidos o si terminaron los 3 y lidera la tabla
    if (
      lider.pg === 2 ||
      (finalizadosTriangular === totalPartidosTriangular && totalPartidosTriangular > 0 && lider.pj > 0)
    ) {
      campeonFinal = lider.nombre;
      campeonDetalle = `${lider.pg} victorias • 1° Lugar en el Triangular`;
    }
  }

  // 3. Caso Modalidad Todos contra todos (Round Robin general)
  if (!campeonFinal && torneo.modalidad === 'Todos contra todos' && partidos.length > 0) {
    const totalPartidosRR = partidos.length;
    const finalizadosRR = partidos.filter((p) => p.estado === 'finalizado').length;
    const todosFinalizados = finalizadosRR === totalPartidosRR && totalPartidosRR > 0;
    const tablaRR = calcularPosiciones();

    if (todosFinalizados && tablaRR.length > 0 && tablaRR[0].pj > 0) {
      const lider = tablaRR[0];
      campeonFinal = lider.nombre;
      campeonDetalle = `${lider.puntos} pts • ${lider.pg} victorias de ${lider.pj} partidos jugados`;
    }
  }

  // 4. Cálculo de los 3 primeros puestos (Podio)
  const calcularPodio = () => {
    let primero: JugadorInfo | null = null;
    let segundo: JugadorInfo | null = null;
    let tercero: JugadorInfo | null = null;

    if (partidoFinal && partidoFinal.estado === 'finalizado' && partidoFinal.ganadorId) {
      const gId = partidoFinal.ganadorId;
      primero = gId === partidoFinal.jugador1?.id ? partidoFinal.jugador1 : partidoFinal.jugador2;
      segundo = gId === partidoFinal.jugador1?.id ? partidoFinal.jugador2 : partidoFinal.jugador1;

      // Buscar perdedor de semifinales para el 3er puesto
      const semis = partidos.filter((p) => p.ronda.toLowerCase().includes('semifinal'));
      if (semis.length > 0) {
        const perdedores: JugadorInfo[] = [];
        semis.forEach((s) => {
          if (s.estado === 'finalizado' && s.ganadorId) {
            const p = s.ganadorId === s.jugador1?.id ? s.jugador2 : s.jugador1;
            if (p) perdedores.push(p);
          }
        });
        if (perdedores.length > 0) tercero = perdedores[0];
      } else if (jugadores.length >= 3) {
        const restantes = jugadores.filter((j) => j.id !== primero?.id && j.id !== segundo?.id);
        if (restantes.length > 0) tercero = restantes[0];
      }
    } else if (tieneTriangular && posTriangular.length >= 2) {
      const findJ = (id: string) => jugadores.find((j) => j.id === id) || null;
      if (posTriangular.length > 0) primero = findJ(posTriangular[0].id) || { id: posTriangular[0].id, nombre: posTriangular[0].nombre };
      if (posTriangular.length > 1) segundo = findJ(posTriangular[1].id) || { id: posTriangular[1].id, nombre: posTriangular[1].nombre };
      if (posTriangular.length > 2) tercero = findJ(posTriangular[2].id) || { id: posTriangular[2].id, nombre: posTriangular[2].nombre };
    } else if (torneo.modalidad === 'Todos contra todos') {
      const tabla = calcularPosiciones();
      const findJ = (id: string) => jugadores.find((j) => j.id === id) || null;
      if (tabla.length > 0 && tabla[0].pj > 0) primero = findJ(tabla[0].id) || { id: tabla[0].id, nombre: tabla[0].nombre };
      if (tabla.length > 1 && tabla[1].pj > 0) segundo = findJ(tabla[1].id) || { id: tabla[1].id, nombre: tabla[1].nombre };
      if (tabla.length > 2 && tabla[2].pj > 0) tercero = findJ(tabla[2].id) || { id: tabla[2].id, nombre: tabla[2].nombre };
    }

    return { primero, segundo, tercero };
  };

  const podioActual = calcularPodio();

  // Asignar puntos de ranking a los 3 primeros puestos
  const handleAsignarPuntosRanking = async () => {
    if (!podioActual.primero) {
      showWarning('Aún no se ha determinado el ganador del torneo.', 'Torneo no concluido');
      return;
    }

    setGenerando(true);
    try {
      const sumarPuntos = async (jInfo: JugadorInfo | null, pts: number, puesto: 1 | 2 | 3) => {
        if (!jInfo) return;
        const jCompleto = jugadores.find((j) => j.id === jInfo.id) || jInfo;
        if (!jCompleto.usuarioId) return;

        const userDocRef = doc(db, 'usuarios', jCompleto.usuarioId);
        await updateDoc(userDocRef, {
          puntosRanking: increment(pts),
          torneosJugados: increment(1),
          ...(puesto === 1 ? { primerosPuestos: increment(1), torneosGanados: increment(1) } : {}),
          ...(puesto === 2 ? { segundosPuestos: increment(1) } : {}),
          ...(puesto === 3 ? { tercerosPuestos: increment(1) } : {}),
        });
      };

      // 1er Puesto: 3 puntos, 2do Puesto: 2 puntos, 3er Puesto: 1 punto
      await sumarPuntos(podioActual.primero, 3, 1);
      await sumarPuntos(podioActual.segundo, 2, 2);
      await sumarPuntos(podioActual.tercero, 1, 3);

      await updateDoc(doc(db, 'torneos', torneoId), {
        estado: 'finalizado',
        puntosAsignados: true,
      });

      setTorneo((prev) => ({ ...prev, puntosAsignados: true }));

      Alert.alert(
        '🏆 ¡Puntos de Ranking Asignados!',
        `Se han sumado los puntos a los 3 primeros puestos:\n\n🥇 1° Lugar (${podioActual.primero.nombre}): +3 pts\n🥈 2° Lugar (${podioActual.segundo?.nombre || 'N/A'}): +2 pts\n🥉 3° Lugar (${podioActual.tercero?.nombre || 'N/A'}): +1 pt\n\nLos puntajes ya están actualizados en el Ranking Oficial.`,
        [
          { text: 'Ver Ranking Oficial', onPress: () => router.push('/ranking' as any) },
          { text: 'Aceptar' },
        ]
      );
    } catch (err: any) {
      console.error('Error al asignar puntos:', err);
      showError(err.message || 'No se pudieron asignar los puntos de ranking.', 'Error');
    } finally {
      setGenerando(false);
    }
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.glowTop} pointerEvents="none" />

      {/* Encabezado fijo */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={SmashTheme.colors.onSurface} />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Desarrollo del Torneo
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {torneo.nombreTorneo}
          </Text>
        </View>

        <View style={{ width: 40 }} />
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
                    {/* Badge Tipo de Torneo */}
                    <View style={[
                      styles.badgeTipo,
                      torneo.tipoTorneo === 'clasificatorio'
                        ? { backgroundColor: 'rgba(195, 244, 0, 0.15)', borderColor: SmashTheme.colors.borderVolt }
                        : { backgroundColor: 'rgba(76, 215, 246, 0.12)', borderColor: 'rgba(76, 215, 246, 0.3)' }
                    ]}>
                      <Ionicons
                        name={torneo.tipoTorneo === 'clasificatorio' ? 'ribbon' : 'tennisball-outline'}
                        size={11}
                        color={torneo.tipoTorneo === 'clasificatorio' ? SmashTheme.colors.primary : SmashTheme.colors.secondary}
                      />
                      <Text style={[
                        styles.badgeTipoText,
                        { color: torneo.tipoTorneo === 'clasificatorio' ? SmashTheme.colors.primary : SmashTheme.colors.secondary }
                      ]}>
                        {torneo.tipoTorneo === 'clasificatorio' ? 'Clasificatorio (Ranking)' : 'Amistoso'}
                      </Text>
                    </View>

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
                    {campeonDetalle ? (
                      <Text style={styles.championSubtitle}>{campeonDetalle}</Text>
                    ) : null}
                  </View>
                </View>
              )}

              {/* Podio Oficial y Puntos de Ranking */}
              {campeonFinal && podioActual.primero && (
                <View style={styles.podioContainer}>
                  <View style={styles.podioHeader}>
                    <Ionicons name="podium" size={18} color={SmashTheme.colors.primary} />
                    <Text style={styles.podioHeaderTitle}>
                      {torneo.tipoTorneo === 'clasificatorio' ? 'PODIO OFICIAL — PUNTOS DE RANKING' : 'PODIO DE HONOR DEL TORNEO'}
                    </Text>
                  </View>

                  <View style={styles.podioCardsRow}>
                    {/* 1° Lugar */}
                    <View style={[styles.podioCol, styles.podioCol1]}>
                      <Text style={styles.podioMedal}>🥇</Text>
                      <Text style={styles.podioPuestoText}>1° LUGAR</Text>
                      <Text style={styles.podioNombreText} numberOfLines={1}>
                        {podioActual.primero.nombre}
                      </Text>
                      {torneo.tipoTorneo === 'clasificatorio' && (
                        <View style={styles.podioPtsBadge}>
                          <Text style={styles.podioPtsText}>+3 PTS</Text>
                        </View>
                      )}
                    </View>

                    {/* 2° Lugar */}
                    {podioActual.segundo && (
                      <View style={[styles.podioCol, styles.podioCol2]}>
                        <Text style={styles.podioMedal}>🥈</Text>
                        <Text style={styles.podioPuestoText}>2° LUGAR</Text>
                        <Text style={styles.podioNombreText} numberOfLines={1}>
                          {podioActual.segundo.nombre}
                        </Text>
                        {torneo.tipoTorneo === 'clasificatorio' && (
                          <View style={styles.podioPtsBadgeCyan}>
                            <Text style={styles.podioPtsTextCyan}>+2 PTS</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* 3° Lugar */}
                    {podioActual.tercero && (
                      <View style={[styles.podioCol, styles.podioCol3]}>
                        <Text style={styles.podioMedal}>🥉</Text>
                        <Text style={styles.podioPuestoText}>3° LUGAR</Text>
                        <Text style={styles.podioNombreText} numberOfLines={1}>
                          {podioActual.tercero.nombre}
                        </Text>
                        {torneo.tipoTorneo === 'clasificatorio' && (
                          <View style={styles.podioPtsBadgeAmber}>
                            <Text style={styles.podioPtsTextAmber}>+1 PTO</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Acciones de Ranking en Torneos Clasificatorios */}
                  {torneo.tipoTorneo === 'clasificatorio' && (
                    <View style={styles.rankingActionsBox}>
                      {!torneo.puntosAsignados ? (
                        esPropietario ? (
                          <TouchableOpacity
                            style={[styles.btnAsignarPuntos, generando && { opacity: 0.7 }]}
                            onPress={handleAsignarPuntosRanking}
                            disabled={generando}
                            activeOpacity={0.85}>
                            <Ionicons name="sparkles" size={18} color="#161e00" />
                            <Text style={styles.btnAsignarPuntosText}>
                              {generando ? 'Guardando Puntos...' : 'Asignar Puntos al Ranking (+3, +2, +1 pts)'}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <Text style={styles.rankingPendingNotice}>
                            El organizador aún no ha confirmado la asignación de puntos.
                          </Text>
                        )
                      ) : (
                        <View style={styles.puntosAsignadosBadge}>
                          <Ionicons name="checkmark-done-circle" size={18} color={SmashTheme.colors.primary} />
                          <Text style={styles.puntosAsignadosText}>
                            Puntos del torneo acreditados al Ranking Oficial de Jugadores (+3, +2, +1 pts)
                          </Text>
                        </View>
                      )}

                      <TouchableOpacity
                        style={styles.verRankingBtn}
                        onPress={() => router.push('/ranking' as any)}
                        activeOpacity={0.8}>
                        <Ionicons name="podium-outline" size={16} color={SmashTheme.colors.secondary} />
                        <Text style={styles.verRankingBtnText}>Ver Tabla de Ranking Oficial</Text>
                        <Ionicons name="arrow-forward" size={14} color={SmashTheme.colors.secondary} />
                      </TouchableOpacity>
                    </View>
                  )}
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
                {/* Switcher para Todos contra todos O cuando hay Triangular Final */}
                {(torneo.modalidad === 'Todos contra todos' || tieneTriangular) && (
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
                        {tieneTriangular ? 'Tabla Triangular Final' : 'Tabla de Posiciones'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Vista 1: Tabla de posiciones (Round Robin O Triangular Final) */}
                {((torneo.modalidad === 'Todos contra todos' || tieneTriangular) && tabActual === 'posiciones') ? (
                  <View style={styles.standingsCard}>
                    {tieneTriangular && (
                      <View style={styles.standingsBannerTriangular}>
                        <Ionicons name="trophy" size={20} color="#d97706" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.standingsBannerTriangularTitle}>
                            Triangular Final — Todos contra todos
                          </Text>
                          <Text style={styles.standingsBannerTriangularSub}>
                            El jugador con más victorias se consagra Campeón del Torneo.
                          </Text>
                        </View>
                      </View>
                    )}

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

                    {(tieneTriangular ? posTriangular : calcularPosiciones()).map((pos, idx) => {
                      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}°`;
                      return (
                        <View
                          key={pos.id}
                          style={[
                            styles.standingsRow,
                            idx === 0
                              ? styles.standingsRowGold
                              : idx === 1
                                ? styles.standingsRowSilver
                                : idx === 2
                                  ? styles.standingsRowBronze
                                  : idx % 2 === 0
                                    ? styles.standingsRowEven
                                    : null,
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
                  /* Vista 2: Bracket agrupado por Rondas */
                  (() => {
                    // Agrupar partidos por ronda manteniendo el orden original
                    const rondasOrden: string[] = [];
                    const rondasMap: Record<string, Partido[]> = {};
                    partidos.forEach((p) => {
                      if (!rondasMap[p.ronda]) {
                        rondasOrden.push(p.ronda);
                        rondasMap[p.ronda] = [];
                      }
                      rondasMap[p.ronda].push(p);
                    });

                    // Icono y color por nombre de ronda
                    const rondaMeta: Record<string, { icon: string; color: string; bg: string }> = {
                      'Octavos de Final':  { icon: 'grid-outline',       color: '#22d3ee', bg: 'rgba(34, 211, 238, 0.15)' },
                      'Cuartos de Final':  { icon: 'apps-outline',       color: '#c084fc', bg: 'rgba(192, 132, 252, 0.15)' },
                      'Semifinal':         { icon: 'git-branch-outline', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' },
                      'Gran Final':        { icon: 'trophy-outline',     color: '#f87171', bg: 'rgba(248, 113, 113, 0.2)' },
                      'Triangular Final':  { icon: 'git-compare-outline',color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' },
                      'Ronda 1':           { icon: 'layers-outline',     color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' },
                      'Todos contra todos':{ icon: 'people-outline',     color: '#818cf8', bg: 'rgba(129, 140, 248, 0.15)' },
                    };
                    const metaDefault = { icon: 'tennisball-outline', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' };

                    return (
                      <View style={{ gap: 20 }}>
                        {rondasOrden.map((rondaNombre) => {
                          const meta = rondaMeta[rondaNombre] ?? metaDefault;
                          const partidosRonda = rondasMap[rondaNombre];
                          const finalizados = partidosRonda.filter((p) => p.estado === 'finalizado').length;
                          const total = partidosRonda.length;

                          return (
                            <View key={rondaNombre}>
                              {/* ── Encabezado de Ronda ── */}
                              <View style={[styles.roundHeader, { backgroundColor: '#1a2337', borderColor: meta.color + '55' }]}>
                                <View style={[styles.roundHeaderIcon, { backgroundColor: meta.bg, borderColor: meta.color + '40' }]}>
                                  <Ionicons name={meta.icon as any} size={18} color={meta.color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.roundHeaderTitle, { color: meta.color }]}>
                                    {rondaNombre}
                                  </Text>
                                  <Text style={styles.roundHeaderSub}>
                                    {finalizados}/{total} partidos completados
                                  </Text>
                                </View>
                                {finalizados === total && total > 0 && (
                                  <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                                )}
                              </View>

                              {/* ── Si es Triangular Final, mostrar tabla de posiciones en vivo ── */}
                              {rondaNombre === 'Triangular Final' && posTriangular.length > 0 && (
                                <View style={styles.inlineStandingsCard}>
                                  <View style={styles.inlineStandingsHeader}>
                                    <Ionicons name="podium-outline" size={16} color="#38bdf8" />
                                    <Text style={styles.inlineStandingsTitle}>
                                      Tabla en Vivo — Modo Todos contra todos
                                    </Text>
                                  </View>
                                  <View style={styles.standingsHeaderRow}>
                                    <Text style={[styles.standingsCol, { width: 34, textAlign: 'center' }]}>#</Text>
                                    <Text style={[styles.standingsCol, { flex: 1 }]}>Jugador</Text>
                                    <Text style={[styles.standingsCol, { width: 32, textAlign: 'center' }]}>PJ</Text>
                                    <Text style={[styles.standingsCol, { width: 32, textAlign: 'center' }]}>PG</Text>
                                    <Text style={[styles.standingsCol, { width: 32, textAlign: 'center' }]}>PP</Text>
                                    <Text style={[styles.standingsCol, { width: 42, textAlign: 'center' }]}>Sets</Text>
                                    <Text style={[styles.standingsCol, { width: 36, textAlign: 'center', fontWeight: '800', color: '#38bdf8' }]}>Pts</Text>
                                  </View>
                                  {posTriangular.map((pos, idx) => {
                                    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}°`;
                                    return (
                                      <View
                                        key={pos.id}
                                        style={[
                                          styles.standingsRow,
                                          idx === 0
                                            ? styles.standingsRowGold
                                            : idx === 1
                                              ? styles.standingsRowSilver
                                              : idx === 2
                                                ? styles.standingsRowBronze
                                                : idx % 2 === 0
                                                  ? styles.standingsRowEven
                                                  : null,
                                        ]}>
                                        <Text style={[styles.standingsCell, { width: 34, textAlign: 'center', fontWeight: '700' }]}>{medal}</Text>
                                        <View style={{ flex: 1, paddingRight: 4 }}>
                                          <Text style={styles.standingsPlayerName} numberOfLines={1}>{pos.nombre}</Text>
                                          {pos.club ? (
                                            <Text style={styles.standingsPlayerClub} numberOfLines={1}>{pos.club}</Text>
                                          ) : null}
                                        </View>
                                        <Text style={[styles.standingsCell, { width: 32, textAlign: 'center' }]}>{pos.pj}</Text>
                                        <Text style={[styles.standingsCell, { width: 32, textAlign: 'center', color: '#16a34a', fontWeight: '700' }]}>{pos.pg}</Text>
                                        <Text style={[styles.standingsCell, { width: 32, textAlign: 'center', color: '#dc2626' }]}>{pos.pp}</Text>
                                        <Text style={[styles.standingsCell, { width: 42, textAlign: 'center', fontSize: 11.5 }]}>{pos.sf}-{pos.sc}</Text>
                                        <Text style={[styles.standingsCell, { width: 36, textAlign: 'center', fontWeight: '800', color: '#38bdf8' }]}>{pos.puntos}</Text>
                                      </View>
                                    );
                                  })}
                                </View>
                              )}

                              {/* ── Partidos de esta Ronda ── */}
                              <View style={{ gap: 10, marginTop: 8 }}>
                                {partidosRonda.map((partido) => {
                                  const finalizado = partido.estado === 'finalizado';
                                  const sinJugadores = !partido.jugador1 || !partido.jugador2;
                                  const j1Ganador = finalizado && partido.ganadorId === partido.jugador1?.id;
                                  const j2Ganador = finalizado && partido.ganadorId === partido.jugador2?.id;
                                  const esTriangular = partido.esTriangular === true;

                                  return (
                                    <View
                                      key={partido.id}
                                      style={[
                                        styles.matchCard,
                                        sinJugadores && !finalizado && styles.matchCardLocked,
                                      ]}>

                                      {/* Cabecera del partido */}
                                      <View style={styles.matchCardHeader}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                          <View style={[
                                            styles.matchNumberBadge,
                                            { backgroundColor: meta.bg, borderWidth: 1, borderColor: meta.color + '30' },
                                          ]}>
                                            <Text style={[styles.matchNumberText, { color: meta.color }]}>
                                              #{partido.numeroPartido}
                                            </Text>
                                          </View>
                                          {sinJugadores && !finalizado && (
                                            <Ionicons name="lock-closed-outline" size={13} color="#94a3b8" />
                                          )}
                                        </View>

                                        <View style={[
                                          styles.statusPill,
                                          finalizado
                                            ? styles.statusPillFinished
                                            : sinJugadores
                                              ? styles.statusPillLocked
                                              : styles.statusPillPending,
                                        ]}>
                                          <Text style={[
                                            styles.statusPillText,
                                            finalizado
                                              ? styles.statusPillTextFinished
                                              : sinJugadores
                                                ? styles.statusPillTextLocked
                                                : styles.statusPillTextPending,
                                          ]}>
                                            {finalizado ? 'Finalizado' : sinJugadores ? 'Esperando...' : 'Pendiente'}
                                          </Text>
                                        </View>
                                      </View>

                                      {/* Contendientes */}
                                      <View style={[
                                        styles.matchVersusContainer,
                                        sinJugadores && !finalizado && { opacity: 0.5 },
                                      ]}>
                                        {/* Jugador 1 */}
                                        <View style={[styles.playerSide, j1Ganador && styles.playerSideWinner]}>
                                          <Text
                                            style={[styles.matchPlayerName, j1Ganador && styles.matchPlayerNameWinner]}
                                            numberOfLines={1}>
                                            {partido.jugador1 ? partido.jugador1.nombre : 'Por definir'}
                                          </Text>
                                          {partido.jugador1?.club ? (
                                            <Text style={styles.matchPlayerClub} numberOfLines={1}>
                                              {partido.jugador1.club}
                                            </Text>
                                          ) : null}
                                          {j1Ganador && (
                                            <Ionicons name="trophy" size={13} color="#d97706" style={{ marginTop: 2 }} />
                                          )}
                                        </View>

                                        {/* Marcador central */}
                                        <View style={styles.scoreContainer}>
                                          <Text style={[styles.scoreDigit, finalizado && { color: j1Ganador ? '#16a34a' : '#94a3b8' }]}>
                                            {partido.marcador1}
                                          </Text>
                                          <Text style={styles.scoreSeparator}>-</Text>
                                          <Text style={[styles.scoreDigit, finalizado && { color: j2Ganador ? '#16a34a' : '#94a3b8' }]}>
                                            {partido.marcador2}
                                          </Text>
                                        </View>

                                        {/* Jugador 2 */}
                                        <View style={[styles.playerSide, j2Ganador && styles.playerSideWinner]}>
                                          <Text
                                            style={[styles.matchPlayerName, j2Ganador && styles.matchPlayerNameWinner]}
                                            numberOfLines={1}>
                                            {partido.jugador2 ? partido.jugador2.nombre : 'Por definir'}
                                          </Text>
                                          {partido.jugador2?.club ? (
                                            <Text style={styles.matchPlayerClub} numberOfLines={1}>
                                              {partido.jugador2.club}
                                            </Text>
                                          ) : null}
                                          {j2Ganador && (
                                            <Ionicons name="trophy" size={13} color="#d97706" style={{ marginTop: 2 }} />
                                          )}
                                        </View>
                                      </View>

                                      {/* Detalle de sets */}
                                      {partido.puntosDetalle ? (
                                        <Text style={styles.pointsDetailText}>
                                          Sets: {partido.puntosDetalle}
                                        </Text>
                                      ) : null}

                                      {/* Flecha de avance al siguiente partido */}
                                      {finalizado && (partido.siguientePartidoNumero || (partido.siguientesDestinos && partido.siguientesDestinos.length > 0)) && (
                                        <View style={styles.advanceRow}>
                                          <Ionicons name="arrow-forward-circle" size={14} color="#16a34a" />
                                          <Text style={styles.advanceText}>
                                            {partido.ganadorNombre} avanza → {
                                              partido.siguientesDestinos && partido.siguientesDestinos.length > 1
                                                ? `Triangular (Partidos #${partido.siguientesDestinos.map((d) => d.numeroPartido).join(' y #')})`
                                                : `Partido #${partido.siguientePartidoNumero || partido.siguientesDestinos?.[0]?.numeroPartido}`
                                            }
                                          </Text>
                                        </View>
                                      )}

                                      {/* Botón registrar (solo propietario, solo si hay 2 jugadores) */}
                                      {esPropietario && !sinJugadores && (
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
                            </View>
                          );
                        })}
                      </View>
                    );
                  })()

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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: SmashTheme.colors.cardBorder,
    backgroundColor: SmashTheme.colors.surfaceContainerLowest,
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
  headerTitle: {
    color: SmashTheme.colors.onSurface,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerSubtitle: {
    color: SmashTheme.colors.primary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  statusCard: {
    backgroundColor: SmashTheme.colors.surfaceContainerLow,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  statusCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trophyIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: SmashTheme.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: SmashTheme.colors.borderVolt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTournamentName: {
    fontSize: 16,
    fontWeight: '800',
    color: SmashTheme.colors.onSurface,
    marginBottom: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  badgeModality: {
    backgroundColor: 'rgba(195, 244, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(195, 244, 0, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeModalityText: {
    color: SmashTheme.colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  badgePlayers: {
    backgroundColor: 'rgba(76, 215, 246, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgePlayersText: {
    color: SmashTheme.colors.secondary,
    fontSize: 11,
    fontWeight: '700',
  },
  championBanner: {
    marginTop: 12,
    backgroundColor: 'rgba(195, 244, 0, 0.12)',
    borderWidth: 1.5,
    borderColor: SmashTheme.colors.primary,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  championTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: SmashTheme.colors.primary,
    letterSpacing: 0.5,
  },
  championName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  championSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: SmashTheme.colors.secondary,
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: SmashTheme.colors.surfaceContainerLow,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: SmashTheme.colors.onSurface,
    marginTop: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: SmashTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 19,
  },
  generateButton: {
    backgroundColor: SmashTheme.colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  generateButtonText: {
    color: SmashTheme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: SmashTheme.colors.surfaceContainerLowest,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    padding: 4,
    marginBottom: 14,
    gap: 4,
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
    backgroundColor: SmashTheme.colors.surfaceContainerHigh,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: SmashTheme.colors.onSurfaceVariant,
  },
  tabButtonTextActive: {
    color: SmashTheme.colors.primary,
    fontWeight: '800',
  },
  standingsBannerTriangular: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: SmashTheme.colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: SmashTheme.colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  standingsBannerTriangularTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: SmashTheme.colors.primary,
  },
  standingsBannerTriangularSub: {
    fontSize: 11,
    color: SmashTheme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  inlineStandingsCard: {
    backgroundColor: '#161f33',
    borderRadius: 16,
    overflow: 'hidden',
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(76, 215, 246, 0.35)',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  inlineStandingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1e2840',
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(76, 215, 246, 0.3)',
  },
  inlineStandingsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: SmashTheme.colors.secondary,
  },
  standingsCard: {
    backgroundColor: '#161f33',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(76, 215, 246, 0.35)',
    overflow: 'hidden',
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 5,
  },
  standingsHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#202a42',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(76, 215, 246, 0.4)',
  },
  standingsCol: {
    fontSize: 11,
    fontWeight: '800',
    color: SmashTheme.colors.primary,
  },
  standingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  standingsRowGold: {
    backgroundColor: 'rgba(195, 244, 0, 0.16)',
    borderLeftWidth: 4,
    borderLeftColor: '#c3f400',
  },
  standingsRowSilver: {
    backgroundColor: 'rgba(76, 215, 246, 0.14)',
    borderLeftWidth: 4,
    borderLeftColor: '#4cd7f6',
  },
  standingsRowBronze: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  standingsRowEven: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  standingsCell: {
    fontSize: 12,
    color: '#f1f5f9',
  },
  standingsPlayerName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  standingsPlayerClub: {
    fontSize: 11,
    color: SmashTheme.colors.onSurfaceVariant,
  },
  matchesList: {
    gap: 12,
  },
  matchCard: {
    backgroundColor: '#172033',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4,
  },
  matchCardLocked: {
    opacity: 0.5,
    borderStyle: 'dashed',
  },
  roundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#1a2337',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  roundHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roundHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  roundHeaderSub: {
    fontSize: 11,
    color: SmashTheme.colors.onSurfaceVariant,
    fontWeight: '500',
    marginTop: 1,
  },
  matchPlayerClub: {
    fontSize: 10,
    color: SmashTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 1,
  },
  statusPillLocked: {
    backgroundColor: SmashTheme.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    borderStyle: 'dashed',
  },
  statusPillTextLocked: {
    color: SmashTheme.colors.onSurfaceVariant,
  },
  advanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    backgroundColor: 'rgba(195, 244, 0, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  advanceText: {
    fontSize: 11,
    color: SmashTheme.colors.primary,
    fontWeight: '600',
    flex: 1,
  },
  matchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  matchNumberBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: SmashTheme.colors.surfaceContainer,
  },
  matchNumberText: {
    fontSize: 11,
    fontWeight: '700',
  },
  matchRoundText: {
    fontSize: 12,
    fontWeight: '700',
    color: SmashTheme.colors.onSurface,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillFinished: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusPillPending: {
    backgroundColor: SmashTheme.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusPillTextFinished: {
    color: '#10b981',
  },
  statusPillTextPending: {
    color: SmashTheme.colors.onSurfaceVariant,
  },
  triangularBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(76, 215, 246, 0.12)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 8,
  },
  triangularBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: SmashTheme.colors.secondary,
  },
  matchVersusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#20293d',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  playerSide: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  playerSideWinner: {
    backgroundColor: 'rgba(195, 244, 0, 0.16)',
    borderWidth: 1,
    borderColor: SmashTheme.colors.borderVolt,
  },
  matchPlayerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  matchPlayerNameWinner: {
    fontWeight: '800',
    color: SmashTheme.colors.primary,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0c1220',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginHorizontal: 4,
  },
  scoreDigit: {
    fontSize: 20,
    fontWeight: '900',
    color: SmashTheme.colors.primary,
  },
  scoreSeparator: {
    fontSize: 16,
    fontWeight: '600',
    color: SmashTheme.colors.onSurfaceVariant,
  },
  badgeTipo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeTipoText: {
    fontSize: 10,
    fontWeight: '800',
  },
  podioContainer: {
    marginTop: 14,
    backgroundColor: '#161f33',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(195, 244, 0, 0.3)',
    padding: 14,
  },
  podioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  podioHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: SmashTheme.colors.primary,
    letterSpacing: 0.5,
  },
  podioCardsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  podioCol: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1.5,
  },
  podioCol1: {
    backgroundColor: 'rgba(195, 244, 0, 0.12)',
    borderColor: SmashTheme.colors.primary,
  },
  podioCol2: {
    backgroundColor: 'rgba(76, 215, 246, 0.1)',
    borderColor: SmashTheme.colors.secondary,
  },
  podioCol3: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: '#f59e0b',
  },
  podioMedal: {
    fontSize: 22,
    marginBottom: 2,
  },
  podioPuestoText: {
    fontSize: 9,
    fontWeight: '800',
    color: SmashTheme.colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  podioNombreText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 3,
    textAlign: 'center',
  },
  podioPtsBadge: {
    marginTop: 6,
    backgroundColor: SmashTheme.colors.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  podioPtsText: {
    fontSize: 10,
    fontWeight: '900',
    color: SmashTheme.colors.onPrimary,
  },
  podioPtsBadgeCyan: {
    marginTop: 6,
    backgroundColor: SmashTheme.colors.secondary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  podioPtsTextCyan: {
    fontSize: 10,
    fontWeight: '900',
    color: SmashTheme.colors.onSecondary,
  },
  podioPtsBadgeAmber: {
    marginTop: 6,
    backgroundColor: '#f59e0b',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  podioPtsTextAmber: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ffffff',
  },
  rankingActionsBox: {
    marginTop: 12,
    gap: 8,
  },
  btnAsignarPuntos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: SmashTheme.colors.primary,
    borderRadius: 12,
    height: 44,
  },
  btnAsignarPuntosText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: SmashTheme.colors.onPrimary,
  },
  rankingPendingNotice: {
    fontSize: 11,
    color: SmashTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  puntosAsignadosBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(195, 244, 0, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SmashTheme.colors.borderVolt,
    padding: 10,
  },
  puntosAsignadosText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: SmashTheme.colors.primary,
    flex: 1,
  },
  verRankingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  verRankingBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: SmashTheme.colors.secondary,
  },
  pointsDetailText: {
    fontSize: 11,
    color: SmashTheme.colors.secondary,
    marginTop: 6,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  recordScoreButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: SmashTheme.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: SmashTheme.colors.borderVolt,
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 10,
  },
  recordScoreButtonText: {
    color: SmashTheme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
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
    color: SmashTheme.colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: SmashTheme.colors.surfaceContainerLow,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    width: '100%',
    maxWidth: 440,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
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
    color: SmashTheme.colors.onSurface,
  },
  modalMatchInfo: {
    fontSize: 12,
    color: SmashTheme.colors.secondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  scoreInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SmashTheme.colors.surfaceContainer,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    padding: 12,
  },
  scoreInputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: SmashTheme.colors.onSurface,
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
    borderRadius: 10,
    backgroundColor: SmashTheme.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {
    fontSize: 22,
    fontWeight: '900',
    color: SmashTheme.colors.primary,
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
    backgroundColor: SmashTheme.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  quickScorePillText: {
    color: SmashTheme.colors.secondary,
    fontSize: 12,
    fontWeight: '700',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: SmashTheme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  detailInput: {
    backgroundColor: SmashTheme.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: SmashTheme.colors.onSurface,
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
    backgroundColor: SmashTheme.colors.surfaceContainer,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: SmashTheme.colors.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '700',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: SmashTheme.colors.primary,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    color: SmashTheme.colors.onPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
});
