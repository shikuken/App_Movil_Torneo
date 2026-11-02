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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { SmashTheme } from '../constants/theme';

export default function RegistroScreen() {
  const router = useRouter();

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [cargando, setCargando] = useState(false);

  const handleTelefonoChange = (text: string) => {
    const cleaned = text.replace(/[^0-9+\s-]/g, '');
    setTelefono(cleaned);
  };

  const handleRegistro = async () => {
    const nombreTrim = nombre.trim();
    const apellidoTrim = apellido.trim();
    const telefonoTrim = telefono.trim();
    const emailTrim = email.trim();
    const passTrim = password.trim();

    if (!nombreTrim || !apellidoTrim || !telefonoTrim || !emailTrim || !passTrim) {
      Alert.alert(
        'Campos incompletos',
        'Por favor completa todos los campos requeridos: nombre, apellido, teléfono, correo electrónico y contraseña.'
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrim)) {
      Alert.alert('Correo inválido', 'Por favor ingresa un correo electrónico válido (ej: usuario@ejemplo.com).');
      return;
    }

    if (telefonoTrim.replace(/[^0-9]/g, '').length < 7) {
      Alert.alert('Teléfono inválido', 'Por favor ingresa un número de teléfono válido.');
      return;
    }

    if (passTrim.length < 6) {
      Alert.alert('Contraseña débil', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setCargando(true);
    setError('');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, emailTrim, passTrim);
      const user = userCredential.user;

      await setDoc(doc(db, 'usuarios', user.uid), {
        nombre: nombreTrim,
        apellido: apellidoTrim,
        telefono: telefonoTrim,
        email: emailTrim,
        puntosRanking: 0,
        torneosJugados: 0,
        primerosPuestos: 0,
        segundosPuestos: 0,
        tercerosPuestos: 0,
        creadoEn: new Date().toISOString(),
      });

      Alert.alert(
        '¡Registro Exitoso!',
        `¡Bienvenido a Smash Match, ${nombreTrim} ${apellidoTrim}! Tu cuenta ha sido creada correctamente.`,
        [
          {
            text: 'Entrar a la aplicación',
            onPress: () => {
              router.replace('/(tabs)');
            },
          },
        ]
      );
    } catch (err: any) {
      console.error('Error al registrar usuario:', err);
      let mensajeError = 'No se pudo completar el registro. Intenta nuevamente.';

      if (err.code === 'auth/email-already-in-use') {
        mensajeError = 'Este correo electrónico ya se encuentra registrado.';
      } else if (err.code === 'auth/invalid-email') {
        mensajeError = 'La dirección de correo electrónico no es válida.';
      } else if (err.code === 'auth/weak-password') {
        mensajeError = 'La contraseña debe tener al menos 6 caracteres.';
      } else if (err.code === 'auth/network-request-failed') {
        mensajeError = 'Falla de conexión a internet. Verifica tu red.';
      }

      setError(mensajeError);
      Alert.alert('Error de registro', mensajeError);
    } finally {
      setCargando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      
      {/* Luces de fondo (Aura deportiva) */}
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
          
          {/* Barra superior con volver */}
          <View style={styles.topHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace('/login')}
              activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color={SmashTheme.colors.onSurface} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Crear Cuenta</Text>
              <Text style={styles.headerSubtitle}>Únete a la liga Smash Match</Text>
            </View>
          </View>

          {/* Tarjeta del Formulario */}
          <View style={styles.cardContainer}>
            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={SmashTheme.colors.liveRed} />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}

            {/* Fila Nombre y Apellido */}
            <View style={styles.row}>
              <View style={[styles.formGroup, styles.halfCol]}>
                <Text style={styles.label}>Nombre *</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={18} color={SmashTheme.colors.onSurfaceVariant} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Carlos"
                    placeholderTextColor={SmashTheme.colors.onSurfaceVariant + '80'}
                    autoCapitalize="words"
                    value={nombre}
                    onChangeText={(val) => {
                      setNombre(val);
                      if (error) setError('');
                    }}
                  />
                </View>
              </View>

              <View style={[styles.formGroup, styles.halfCol]}>
                <Text style={styles.label}>Apellido *</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={18} color={SmashTheme.colors.onSurfaceVariant} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Rodríguez"
                    placeholderTextColor={SmashTheme.colors.onSurfaceVariant + '80'}
                    autoCapitalize="words"
                    value={apellido}
                    onChangeText={(val) => {
                      setApellido(val);
                      if (error) setError('');
                    }}
                  />
                </View>
              </View>
            </View>

            {/* Teléfono */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Teléfono móvil *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={18} color={SmashTheme.colors.onSurfaceVariant} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="+57 300 123 4567"
                  placeholderTextColor={SmashTheme.colors.onSurfaceVariant + '80'}
                  keyboardType="phone-pad"
                  value={telefono}
                  onChangeText={(val) => {
                    handleTelefonoChange(val);
                    if (error) setError('');
                  }}
                />
              </View>
            </View>

            {/* Correo electrónico */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Correo Electrónico *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color={SmashTheme.colors.onSurfaceVariant} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="tu.correo@ejemplo.com"
                  placeholderTextColor={SmashTheme.colors.onSurfaceVariant + '80'}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (error) setError('');
                  }}
                />
              </View>
            </View>

            {/* Contraseña */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Contraseña *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={SmashTheme.colors.onSurfaceVariant} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Mínimo 6 caracteres"
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
                    size={18}
                    color={SmashTheme.colors.onSurfaceVariant}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Botón de Registro Volt */}
            <TouchableOpacity
              style={[styles.submitButton, cargando && { opacity: 0.75 }]}
              onPress={handleRegistro}
              activeOpacity={0.85}
              disabled={cargando}>
              {cargando ? (
                <ActivityIndicator color={SmashTheme.colors.onPrimary} size="small" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Registrar mi cuenta</Text>
                  <Ionicons name="checkmark-circle" size={18} color={SmashTheme.colors.onPrimary} />
                </>
              )}
            </TouchableOpacity>

            {/* Enlace para volver al login */}
            <View style={styles.loginPrompt}>
              <Text style={styles.promptText}>¿Ya tienes una cuenta activa? </Text>
              <TouchableOpacity
                onPress={() => router.replace('/login')}
                activeOpacity={0.7}>
                <Text style={styles.loginLink}>Inicia sesión</Text>
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
    paddingTop: 16,
    paddingBottom: 40,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
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
    fontSize: 22,
    fontWeight: '800',
    color: SmashTheme.colors.onSurface,
  },
  headerSubtitle: {
    fontSize: 12,
    color: SmashTheme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  cardContainer: {
    backgroundColor: SmashTheme.colors.surfaceContainerLow,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 6,
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCol: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: SmashTheme.colors.onSurface,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SmashTheme.colors.surfaceContainer,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: SmashTheme.colors.onSurface,
    fontSize: 13,
    height: '100%',
  },
  eyeButton: {
    padding: 6,
  },
  submitButton: {
    backgroundColor: SmashTheme.colors.primary,
    borderRadius: 14,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 18,
    shadowColor: SmashTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  submitButtonText: {
    color: SmashTheme.colors.onPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptText: {
    fontSize: 12,
    color: SmashTheme.colors.onSurfaceVariant,
  },
  loginLink: {
    fontSize: 12,
    fontWeight: '700',
    color: SmashTheme.colors.primary,
  },
});
