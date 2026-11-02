import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Configuración de Timeout de Sesión ────────────────────────────────────────
// Tiempo en milisegundos. Por defecto: 30 minutos.
// Cambia este valor para ajustar el tiempo de expiración de sesión.
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos

const SESSION_KEY = '@smash_match_login_timestamp';
const LAST_ACTIVE_KEY = '@smash_match_last_active';

/**
 * Almacena el timestamp del momento de login.
 * Debe llamarse inmediatamente después de un inicio de sesión exitoso.
 */
export async function storeLoginTimestamp(): Promise<void> {
  try {
    const now = Date.now().toString();
    await AsyncStorage.setItem(SESSION_KEY, now);
    await AsyncStorage.setItem(LAST_ACTIVE_KEY, now);
  } catch (error) {
    console.warn('Error al guardar timestamp de sesión:', error);
  }
}

/**
 * Actualiza el timestamp de última actividad.
 * Útil para resetear el contador cuando la app vuelve al foreground.
 */
export async function updateLastActive(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
  } catch (error) {
    console.warn('Error al actualizar última actividad:', error);
  }
}

/**
 * Verifica si la sesión ha expirado basándose en la última actividad.
 * Retorna `true` si el tiempo transcurrido supera SESSION_TIMEOUT_MS.
 */
export async function isSessionExpired(): Promise<boolean> {
  try {
    const lastActive = await AsyncStorage.getItem(LAST_ACTIVE_KEY);
    if (!lastActive) {
      // Si no hay registro, verificamos con el timestamp de login
      const loginTimestamp = await AsyncStorage.getItem(SESSION_KEY);
      if (!loginTimestamp) return true; // Sin registro → sesión expirada
      const elapsed = Date.now() - parseInt(loginTimestamp, 10);
      return elapsed > SESSION_TIMEOUT_MS;
    }
    const elapsed = Date.now() - parseInt(lastActive, 10);
    return elapsed > SESSION_TIMEOUT_MS;
  } catch (error) {
    console.warn('Error al verificar expiración de sesión:', error);
    return true; // En caso de error, forzar re-login por seguridad
  }
}

/**
 * Limpia los timestamps de sesión almacenados.
 * Debe llamarse al hacer logout manual.
 */
export async function clearSessionTimestamps(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([SESSION_KEY, LAST_ACTIVE_KEY]);
  } catch (error) {
    console.warn('Error al limpiar timestamps de sesión:', error);
  }
}
