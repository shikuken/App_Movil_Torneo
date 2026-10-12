/**
 * tournamentBracket.ts
 *
 * Módulo puro de generación y gestión de estructuras de torneos
 * bajo formato de Eliminación Directa, Byes y Triangular/Repechaje.
 * Diseñado y tipado para React Native y TypeScript.
 */

export interface Participante {
  id: string;
  name: string;
  seed?: number;
}

export type EstadoPartido = 'pendiente' | 'bye' | 'en_juego' | 'finalizado';

export interface Partido {
  id: string;
  matchNumber: number;
  roundNumber: number;
  roundName: string;
  player1Id: string | null;
  player1Name: string | null;
  player2Id: string | null;
  player2Name: string | null;
  score1: number;
  score2: number;
  winnerId: string | null;
  winnerName: string | null;
  isBye: boolean;
  status: EstadoPartido;
  nextMatchId?: string | null;
  nextMatchSlot?: 1 | 2 | null;
}

export type TipoRonda = 'eliminacion' | 'triangular_final' | 'round_robin';

export interface Ronda {
  id: string;
  roundNumber: number;
  name: string;
  type: TipoRonda;
  matches: Partido[];
}

export type FormatoTorneo = 'potencia_de_2' | 'con_byes' | 'triangular_repechaje';

export interface EstructuraTorneo {
  totalParticipants: number;
  format: FormatoTorneo;
  allowByes: boolean;
  totalRounds: number;
  rounds: Ronda[];
  // Entidades normalizadas por ID para renderizar en FlatList o consultar en O(1)
  entities: {
    matches: Record<string, Partido>;
    rounds: Record<string, Ronda>;
    participants: Record<string, Participante>;
  };
  orderedRoundIds: string[];
}

export interface GenerarTorneoOptions {
  /**
   * Permite usar pases automáticos ('byes') para alcanzar la siguiente potencia de 2.
   * Si es false y el número de jugadores no es potencia de 2, genera una ronda donde
   * todos juegan y estructura la siguiente como Triangular Final si los ganadores son impares.
   * Default: true.
   */
  allowByes?: boolean;

  /**
   * Si es true, distribuye los byes de forma aleatoria.
   * Si es false, los byes se asignan a los mejores seeds (cabezas de serie).
   * Default: true.
   */
  randomizeByes?: boolean;
}

/**
 * Obtiene la siguiente potencia de 2 mayor o igual a n.
 */
export function getNextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

/**
 * Determina si n es una potencia de 2 perfecta.
 */
export function isPowerOfTwo(n: number): number | boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

/**
 * Genera el orden simétrico de llaves para una potencia de 2 (ej. 1 vs 8, 4 vs 5, etc.)
 * Garantiza que seed 1 y seed 2 solo se crucen en la final.
 */
export function generateSeededBracketOrder(size: number): number[] {
  let order = [1, 2];
  while (order.length < size) {
    const nextOrder: number[] = [];
    const sum = order.length * 2 + 1;
    for (const seed of order) {
      nextOrder.push(seed);
      nextOrder.push(sum - seed);
    }
    order = nextOrder;
  }
  return order;
}

/**
 * Nombre descriptivo de una ronda según el número de participantes restantes.
 */
export function getRoundName(remainingCount: number, roundNumber: number, totalRounds: number): string {
  if (remainingCount === 2 || roundNumber === totalRounds) return 'Gran Final';
  if (remainingCount === 4 || roundNumber === totalRounds - 1) return 'Semifinales';
  if (remainingCount === 8 || roundNumber === totalRounds - 2) return 'Cuartos de final';
  if (remainingCount === 16) return 'Octavos de final';
  return `Ronda ${roundNumber}`;
}

/**
 * Función pura principal: Genera el cuadro del torneo en formato de eliminación directa,
 * manejando casos de potencia de 2 perfecta, byes aleatorios o repechaje/triangular.
 */
export function generarEstructuraTorneo(
  participantesRaw: Participante[],
  options: GenerarTorneoOptions = {}
): EstructuraTorneo {
  const { allowByes = true, randomizeByes = true } = options;
  const N = participantesRaw.length;

  if (N < 2) {
    throw new Error('Se requieren al menos 2 participantes para generar un torneo.');
  }

  // Normalizar orden de participantes según seed
  const participantes: Participante[] = [...participantesRaw].sort((a, b) => {
    if (a.seed != null && b.seed != null) return a.seed - b.seed;
    if (a.seed != null) return -1;
    if (b.seed != null) return 1;
    return 0;
  });

  // Asignar seeds secuenciales si no todos los tenían
  participantes.forEach((p, idx) => {
    if (p.seed == null) {
      p.seed = idx + 1;
    }
  });

  let matchGlobalCounter = 1;
  const rounds: Ronda[] = [];
  let format: FormatoTorneo = 'potencia_de_2';

  // =========================================================================
  // CASO 1 & 2: POTENCIA DE 2 PERFECTA O CON BYES (allowByes === true)
  // =========================================================================
  if (isPowerOfTwo(N) || allowByes) {
    const P = getNextPowerOfTwo(N);
    const numByes = P - N;
    format = numByes === 0 ? 'potencia_de_2' : 'con_byes';
    const totalRounds = Math.log2(P);

    // Determinar qué participantes reciben BYE
    const byeParticipants = new Set<string>();
    if (numByes > 0) {
      if (randomizeByes) {
        // Selección aleatoria de Byes
        const shuffled = [...participantes].sort(() => Math.random() - 0.5);
        for (let i = 0; i < numByes; i++) {
          byeParticipants.add(shuffled[i].id);
        }
      } else {
        // Byes a los mejores cabezas de serie
        for (let i = 0; i < numByes; i++) {
          byeParticipants.add(participantes[i].id);
        }
      }
    }

    if (numByes === 0) {
      // -------------------------------------------------------------
      // 1. Potencia de 2 perfecta: Generación simétrica tradicional
      // -------------------------------------------------------------
      const seedOrder = generateSeededBracketOrder(N);
      const seedToParticipant: Record<number, Participante> = {};
      participantes.forEach((p) => {
        if (p.seed) seedToParticipant[p.seed] = p;
      });

      // Ronda 1
      const r1Matches: Partido[] = [];
      const numMatchesR1 = N / 2;
      const r1Id = `round-1`;
      const r1Name = getRoundName(N, 1, totalRounds);

      for (let i = 0; i < numMatchesR1; i++) {
        const seedA = seedOrder[i * 2];
        const seedB = seedOrder[i * 2 + 1];
        const p1 = seedToParticipant[seedA] || null;
        const p2 = seedToParticipant[seedB] || null;

        r1Matches.push({
          id: `match-${matchGlobalCounter}`,
          matchNumber: matchGlobalCounter++,
          roundNumber: 1,
          roundName: r1Name,
          player1Id: p1 ? p1.id : null,
          player1Name: p1 ? p1.name : null,
          player2Id: p2 ? p2.id : null,
          player2Name: p2 ? p2.name : null,
          score1: 0,
          score2: 0,
          winnerId: null,
          winnerName: null,
          isBye: false,
          status: 'pendiente',
        });
      }

      rounds.push({
        id: r1Id,
        roundNumber: 1,
        name: r1Name,
        type: 'eliminacion',
        matches: r1Matches,
      });

      // Rondas subsecuentes (Ronda 2 hasta la Final)
      let prevRoundMatches = r1Matches;
      for (let r = 2; r <= totalRounds; r++) {
        const currentRoundMatches: Partido[] = [];
        const numMatches = prevRoundMatches.length / 2;
        const roundId = `round-${r}`;
        const roundName = getRoundName(numMatches * 2, r, totalRounds);

        for (let i = 0; i < numMatches; i++) {
          const matchId = `match-${matchGlobalCounter}`;
          const newMatch: Partido = {
            id: matchId,
            matchNumber: matchGlobalCounter++,
            roundNumber: r,
            roundName,
            player1Id: null,
            player1Name: null,
            player2Id: null,
            player2Name: null,
            score1: 0,
            score2: 0,
            winnerId: null,
            winnerName: null,
            isBye: false,
            status: 'pendiente',
          };

          // Enlazar los partidos previos hacia este nuevo partido
          const prevMatch1 = prevRoundMatches[i * 2];
          const prevMatch2 = prevRoundMatches[i * 2 + 1];
          if (prevMatch1) {
            prevMatch1.nextMatchId = matchId;
            prevMatch1.nextMatchSlot = 1;
          }
          if (prevMatch2) {
            prevMatch2.nextMatchId = matchId;
            prevMatch2.nextMatchSlot = 2;
          }

          currentRoundMatches.push(newMatch);
        }

        rounds.push({
          id: roundId,
          roundNumber: r,
          name: roundName,
          type: 'eliminacion',
          matches: currentRoundMatches,
        });

        prevRoundMatches = currentRoundMatches;
      }
    } else {
      // -------------------------------------------------------------
      // 2. Con Byes: Jugadores con pase directo a Ronda 2
      // -------------------------------------------------------------
      const playersInR1 = participantes.filter((p) => !byeParticipants.has(p.id));
      const playersWithBye = participantes.filter((p) => byeParticipants.has(p.id));

      // En Ronda 1 juegan los que NO tienen bye (en parejas de 2)
      const r1Matches: Partido[] = [];
      const numR1Matches = playersInR1.length / 2;
      const r1Id = `round-1`;
      const r1Name = getRoundName(P, 1, totalRounds);

      for (let i = 0; i < numR1Matches; i++) {
        const p1 = playersInR1[i * 2] || null;
        const p2 = playersInR1[i * 2 + 1] || null;

        r1Matches.push({
          id: `match-${matchGlobalCounter}`,
          matchNumber: matchGlobalCounter++,
          roundNumber: 1,
          roundName: r1Name,
          player1Id: p1 ? p1.id : null,
          player1Name: p1 ? p1.name : null,
          player2Id: p2 ? p2.id : null,
          player2Name: p2 ? p2.name : null,
          score1: 0,
          score2: 0,
          winnerId: null,
          winnerName: null,
          isBye: false,
          status: 'pendiente',
        });
      }

      rounds.push({
        id: r1Id,
        roundNumber: 1,
        name: r1Name,
        type: 'eliminacion',
        matches: r1Matches,
      });

      // Ronda 2: Combina ganadores de R1 y los jugadores con BYE
      const r2MatchesCount = P / 4;
      const r2Id = `round-2`;
      const r2Name = getRoundName(P / 2, 2, totalRounds);
      const r2Matches: Partido[] = [];

      // Distribución: emparejar a cada jugador con BYE contra el ganador de un partido de R1
      let r1Index = 0;
      let byeIndex = 0;

      for (let i = 0; i < r2MatchesCount; i++) {
        const matchId = `match-${matchGlobalCounter}`;
        
        // Slot 1: asignar jugador con Bye si hay disponibles, de lo contrario vendrá de R1
        let p1Bye: Participante | null = null;
        if (byeIndex < playersWithBye.length) {
          p1Bye = playersWithBye[byeIndex++];
        }

        // Slot 2: asignar jugador con Bye solo si sobran byes (más byes que partidos), de lo contrario viene de R1
        let p2Bye: Participante | null = null;
        if (byeIndex < playersWithBye.length && (r2MatchesCount - i <= playersWithBye.length - byeIndex)) {
          p2Bye = playersWithBye[byeIndex++];
        }

        const matchR2: Partido = {
          id: matchId,
          matchNumber: matchGlobalCounter++,
          roundNumber: 2,
          roundName: r2Name,
          player1Id: p1Bye ? p1Bye.id : null,
          player1Name: p1Bye ? p1Bye.name : null,
          player2Id: p2Bye ? p2Bye.id : null,
          player2Name: p2Bye ? p2Bye.name : null,
          score1: 0,
          score2: 0,
          winnerId: null,
          winnerName: null,
          isBye: false,
          status: 'pendiente',
        };

        // Si slot 1 no tiene Bye player, lo alimentará un ganador de R1
        if (!p1Bye && r1Index < r1Matches.length) {
          r1Matches[r1Index].nextMatchId = matchId;
          r1Matches[r1Index].nextMatchSlot = 1;
          r1Index++;
        }

        // Si slot 2 no tiene Bye player, lo alimentará un ganador de R1
        if (!p2Bye && r1Index < r1Matches.length) {
          r1Matches[r1Index].nextMatchId = matchId;
          r1Matches[r1Index].nextMatchSlot = 2;
          r1Index++;
        }

        r2Matches.push(matchR2);
      }

      rounds.push({
        id: r2Id,
        roundNumber: 2,
        name: r2Name,
        type: 'eliminacion',
        matches: r2Matches,
      });

      // Rondas restantes desde R3 en adelante
      let prevRoundMatches = r2Matches;
      for (let r = 3; r <= totalRounds; r++) {
        const currentRoundMatches: Partido[] = [];
        const numMatches = prevRoundMatches.length / 2;
        const roundId = `round-${r}`;
        const roundName = getRoundName(numMatches * 2, r, totalRounds);

        for (let i = 0; i < numMatches; i++) {
          const matchId = `match-${matchGlobalCounter}`;
          const newMatch: Partido = {
            id: matchId,
            matchNumber: matchGlobalCounter++,
            roundNumber: r,
            roundName,
            player1Id: null,
            player1Name: null,
            player2Id: null,
            player2Name: null,
            score1: 0,
            score2: 0,
            winnerId: null,
            winnerName: null,
            isBye: false,
            status: 'pendiente',
          };

          const prevMatch1 = prevRoundMatches[i * 2];
          const prevMatch2 = prevRoundMatches[i * 2 + 1];
          if (prevMatch1) {
            prevMatch1.nextMatchId = matchId;
            prevMatch1.nextMatchSlot = 1;
          }
          if (prevMatch2) {
            prevMatch2.nextMatchId = matchId;
            prevMatch2.nextMatchSlot = 2;
          }

          currentRoundMatches.push(newMatch);
        }

        rounds.push({
          id: roundId,
          roundNumber: r,
          name: roundName,
          type: 'eliminacion',
          matches: currentRoundMatches,
        });

        prevRoundMatches = currentRoundMatches;
      }
    }
  } else {
    // =========================================================================
    // CASO 3: REPECHAJE / TRIANGULAR (allowByes === false)
    // =========================================================================
    // Ronda 1: TODOS juegan (N / 2 partidos)
    format = 'triangular_repechaje';
    const numPartidosR1 = Math.floor(N / 2);
    const r1Matches: Partido[] = [];
    const r1Id = `round-1`;
    const r1Name = 'Ronda Eliminatoria Inicial';

    for (let i = 0; i < numPartidosR1; i++) {
      const p1 = participantes[i * 2];
      const p2 = participantes[i * 2 + 1];

      r1Matches.push({
        id: `match-${matchGlobalCounter}`,
        matchNumber: matchGlobalCounter++,
        roundNumber: 1,
        roundName: r1Name,
        player1Id: p1 ? p1.id : null,
        player1Name: p1 ? p1.name : null,
        player2Id: p2 ? p2.id : null,
        player2Name: p2 ? p2.name : null,
        score1: 0,
        score2: 0,
        winnerId: null,
        winnerName: null,
        isBye: false,
        status: 'pendiente',
      });
    }

    rounds.push({
      id: r1Id,
      roundNumber: 1,
      name: r1Name,
      type: 'eliminacion',
      matches: r1Matches,
    });

    const ganadoresEsperados = numPartidosR1;

    // Si los ganadores resultantes son 3 (ej. N = 6): Triangular Final
    if (ganadoresEsperados === 3) {
      const r2Id = `round-2-triangular`;
      const r2Name = 'Triangular Final';
      const r2Matches: Partido[] = [];

      // En el triangular final todos juegan contra todos entre los 3 ganadores (3 cruces)
      // Cruces: Ganador R1-M1 vs Ganador R1-M2, Ganador R1-M2 vs Ganador R1-M3, Ganador R1-M1 vs Ganador R1-M3
      const crucesTriangular = [
        { g1Slot: 1, g2Slot: 2, m1From: 0, m2From: 1 },
        { g1Slot: 2, g2Slot: 3, m1From: 1, m2From: 2 },
        { g1Slot: 1, g2Slot: 3, m1From: 0, m2From: 2 },
      ];

      for (const cruce of crucesTriangular) {
        r2Matches.push({
          id: `match-${matchGlobalCounter}`,
          matchNumber: matchGlobalCounter++,
          roundNumber: 2,
          roundName: r2Name,
          player1Id: null,
          player1Name: `Ganador Partido #${r1Matches[cruce.m1From].matchNumber}`,
          player2Id: null,
          player2Name: `Ganador Partido #${r1Matches[cruce.m2From].matchNumber}`,
          score1: 0,
          score2: 0,
          winnerId: null,
          winnerName: null,
          isBye: false,
          status: 'pendiente',
        });
      }

      rounds.push({
        id: r2Id,
        roundNumber: 2,
        name: r2Name,
        type: 'triangular_final',
        matches: r2Matches,
      });
    } else {
      // Si la cantidad de ganadores es par u otro número, continúa en árbol estándar
      const totalRoundsRestantes = Math.ceil(Math.log2(ganadoresEsperados));
      let prevMatches = r1Matches;

      for (let r = 2; r <= totalRoundsRestantes + 1; r++) {
        const currentRoundMatches: Partido[] = [];
        const numMatches = Math.ceil(prevMatches.length / 2);
        const roundId = `round-${r}`;
        const roundName = getRoundName(numMatches * 2, r, totalRoundsRestantes + 1);

        for (let i = 0; i < numMatches; i++) {
          const matchId = `match-${matchGlobalCounter}`;
          const newMatch: Partido = {
            id: matchId,
            matchNumber: matchGlobalCounter++,
            roundNumber: r,
            roundName,
            player1Id: null,
            player1Name: null,
            player2Id: null,
            player2Name: null,
            score1: 0,
            score2: 0,
            winnerId: null,
            winnerName: null,
            isBye: false,
            status: 'pendiente',
          };

          const p1 = prevMatches[i * 2];
          const p2 = prevMatches[i * 2 + 1];
          if (p1) {
            p1.nextMatchId = matchId;
            p1.nextMatchSlot = 1;
          }
          if (p2) {
            p2.nextMatchId = matchId;
            p2.nextMatchSlot = 2;
          }

          currentRoundMatches.push(newMatch);
        }

        rounds.push({
          id: roundId,
          roundNumber: r,
          name: roundName,
          type: 'eliminacion',
          matches: currentRoundMatches,
        });

        prevMatches = currentRoundMatches;
      }
    }
  }

  // =========================================================================
  // NORMALIZACIÓN DE LA ESTRUCTURA PARA CONSUMO EN REACT NATIVE / FLATLIST
  // =========================================================================
  const matchesMap: Record<string, Partido> = {};
  const roundsMap: Record<string, Ronda> = {};
  const participantsMap: Record<string, Participante> = {};
  const orderedRoundIds: string[] = [];

  participantes.forEach((p) => {
    participantsMap[p.id] = p;
  });

  rounds.forEach((round) => {
    roundsMap[round.id] = round;
    orderedRoundIds.push(round.id);
    round.matches.forEach((m) => {
      matchesMap[m.id] = m;
    });
  });

  return {
    totalParticipants: N,
    format,
    allowByes,
    totalRounds: rounds.length,
    rounds,
    entities: {
      matches: matchesMap,
      rounds: roundsMap,
      participants: participantsMap,
    },
    orderedRoundIds,
  };
}
