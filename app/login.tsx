import React, { useState } from 'react';
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { SmashTheme } from '../constants/theme';
import { storeLoginTimestamp } from '../utils/session';
import { useToast } from '../context/ToastContext';

export default function LoginScreen() {
  const router = useRouter();
  const { showWarning, showError, showInfo } = useToast();

  const navigation = {
    navigate: (screen: string) => {
      if (screen === 'Register' || screen === 'registro') {
        router.push('/registro');
      } else {
        router.push(screen as any);
      }
    },
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [recordarme, setRecordarme] = useState(true);

  const handleLogin = async () => {
    const emailTrimmed = email.trim();
    const passTrimmed = password.trim();

    if (!emailTrimmed || !passTrimmed) {
      showWarning('Por favor ingresa tu correo electrónico y contraseña.', 'Campos incompletos');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      showWarning('Por favor ingresa una dirección de correo electrónico válida.', 'Correo inválido');
      return;
    }

    if (passTrimmed.length < 6) {
      showWarning('La contraseña debe tener al menos 6 caracteres.', 'Contraseña corta');
      return;
    }

    setCargando(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, emailTrimmed, passTrimmed);
      await storeLoginTimestamp();
      router.replace('/(tabs)');
    } catch (err: any) {
      setError('Correo o contraseña incorrectos');
      showError('Correo o contraseña incorrectos', 'Error de inicio de sesión');
    } finally {
      setCargando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      
      {/* Círculos de luz ambiental (Neon HUD Glow) */}
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBottom} pointerEvents="none" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          
          {/* Logo y Encabezado de Marca */}
          <View style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <Image
                source={require('../assets/images/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brandTitle}>
              SMASH <Text style={styles.brandTitleAccent}>MATCH</Text>
            </Text>
            <Text style={styles.brandSubtitle}>Tu plataforma de torneos en tiempo real</Text>
          </View>

          {/* Tarjeta del Formulario */}
          <View style={styles.cardContainer}>
            <View style={styles.cardHeader}>
              <Text style={styles.formTitle}>Iniciar Sesión</Text>
              <Text style={styles.formInstructions}>
                Accede para gestionar tus torneos, cuadros y marcadores en vivo
              </Text>
            </View>

            {/* Banner de error visible si ocurre una falla */}
            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={SmashTheme.colors.liveRed} />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}

            {/* Campo: Correo electrónico */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Correo Electrónico</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={SmashTheme.colors.onSurfaceVariant} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="tu.correo@ejemplo.com"
                  placeholderTextColor={SmashTheme.colors.onSurfaceVariant + '80'}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (error) setError('');
                  }}
                />
              </View>
            </View>

            {/* Campo: Contraseña */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={SmashTheme.colors.onSurfaceVariant} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="••••••••••••"
                  placeholderTextColor={SmashTheme.colors.onSurfaceVariant + '80'}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (error) setError('');
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  activeOpacity={0.7}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={SmashTheme.colors.onSurfaceVariant}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Fila Recordarme & Olvidé contraseña */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberMeContainer}
                onPress={() => setRecordarme(!recordarme)}
                activeOpacity={0.7}>
                <View style={[styles.checkbox, recordarme && styles.checkboxActive]}>
                  {recordarme && <Ionicons name="checkmark" size={14} color={SmashTheme.colors.onPrimary} />}
                </View>
                <Text style={styles.rememberMeText}>Recordarme</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => showInfo('Ingresa tu correo para restablecer tu contraseña.', 'Recuperar Clave')}
                activeOpacity={0.7}>
                <Text style={styles.forgotText}>¿Olvidaste tu clave?</Text>
              </TouchableOpacity>
            </View>

            {/* Botón Principal: Kinetic Volt CTA */}
            <TouchableOpacity
              style={[styles.loginButton, cargando && { opacity: 0.75 }]}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={cargando}>
              {cargando ? (
                <ActivityIndicator color={SmashTheme.colors.onPrimary} size="small" />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
                  <Ionicons name="arrow-forward" size={18} color={SmashTheme.colors.onPrimary} />
                </>
              )}
            </TouchableOpacity>

            {/* Separador */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Enlace para ir al Registro */}
            <View style={styles.registerPrompt}>
              <Text style={styles.promptText}>¿No tienes una cuenta? </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
                activeOpacity={0.7}>
                <Text style={styles.registerLink}>Regístrate gratis</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    opacity: 0.08,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: SmashTheme.colors.secondary,
    opacity: 0.08,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: SmashTheme.colors.surfaceContainerHigh,
    borderWidth: 1.5,
    borderColor: SmashTheme.colors.borderVolt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: SmashTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  logoImage: {
    width: 78,
    height: 78,
    borderRadius: 20,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: SmashTheme.colors.onSurface,
    letterSpacing: 0.5,
  },
  brandTitleAccent: {
    color: SmashTheme.colors.primary,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: SmashTheme.colors.onSurfaceVariant,
    marginTop: 4,
    textAlign: 'center',
  },
  cardContainer: {
    backgroundColor: SmashTheme.colors.surfaceContainerLow,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 6,
  },
  cardHeader: {
    marginBottom: 18,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: SmashTheme.colors.onSurface,
    marginBottom: 4,
  },
  formInstructions: {
    fontSize: 13,
    color: SmashTheme.colors.onSurfaceVariant,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.35)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorBannerText: {
    color: SmashTheme.colors.liveRed,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: SmashTheme.colors.onSurface,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SmashTheme.colors.surfaceContainer,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: SmashTheme.colors.onSurface,
    fontSize: 14,
    height: '100%',
  },
  eyeButton: {
    padding: 6,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 2,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: SmashTheme.colors.outline,
    backgroundColor: SmashTheme.colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: SmashTheme.colors.primary,
    borderColor: SmashTheme.colors.primary,
  },
  rememberMeText: {
    fontSize: 12,
    fontWeight: '500',
    color: SmashTheme.colors.onSurfaceVariant,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '600',
    color: SmashTheme.colors.secondary,
  },
  loginButton: {
    backgroundColor: SmashTheme.colors.primary,
    borderRadius: 14,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: SmashTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  loginButtonText: {
    color: SmashTheme.colors.onPrimary,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: SmashTheme.colors.cardBorder,
  },
  dividerText: {
    marginHorizontal: 12,
    color: SmashTheme.colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  registerPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptText: {
    fontSize: 13,
    color: SmashTheme.colors.onSurfaceVariant,
  },
  registerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: SmashTheme.colors.primary,
  },
});
