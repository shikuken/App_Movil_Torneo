import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth } from '../firebaseConfig';
import { db } from '../firebaseConfig';

export default function RegistroScreen() {
  const router = useRouter();

  // Estados exclusivos para los 5 campos solicitados
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [cargando, setCargando] = useState(false);

  // Sanitizado básico de teléfono (solo números y signo +)
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

    // 1. Validar campos obligatorios
    if (!nombreTrim || !apellidoTrim || !telefonoTrim || !emailTrim || !passTrim) {
      Alert.alert(
        'Campos incompletos',
        'Por favor completa todos los campos requeridos: nombre, apellido, teléfono, correo electrónico y contraseña.'
      );
      return;
    }

    // 2. Validación de formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrim)) {
      Alert.alert('Correo inválido', 'Por favor ingresa un correo electrónico válido (ej: usuario@ejemplo.com).');
      return;
    }

    // 3. Validación de teléfono mínimo
    if (telefonoTrim.replace(/[^0-9]/g, '').length < 7) {
      Alert.alert('Teléfono inválido', 'Por favor ingresa un número de teléfono válido.');
      return;
    }

    // 4. Validación de longitud de contraseña
    if (passTrim.length < 6) {
      Alert.alert('Contraseña débil', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setCargando(true);
    setError('');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, emailTrim, passTrim);
      const user = userCredential.user;

      // Guardar el perfil completo del usuario en Cloud Firestore
      await setDoc(doc(db, 'usuarios', user.uid), {
        nombre: nombreTrim,
        apellido: apellidoTrim,
        telefono: telefonoTrim,
        email: emailTrim,
        creadoEn: new Date().toISOString(),
      });

      Alert.alert(
        '¡Registro Exitoso!',
        `¡Bienvenido a Smash Match, ${nombreTrim} ${apellidoTrim}! Tu cuenta ha sido creada correctamente en Firebase.`,
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
      setError(err.message);
      Alert.alert('Error al registrarse', err.message || 'No se pudo crear la cuenta.');
    } finally {
      setCargando(false);
    }
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
            style={styles.keyboardView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
            <ScrollView
              contentContainerStyle={styles.scrollContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}>
              
              {/* Botón Volver a Login */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.push('/login')}
                activeOpacity={0.8}>
                <Ionicons name="arrow-back-circle-outline" size={24} color="#ffffff" />
                <Text style={styles.backButtonText}>Volver al inicio de sesión</Text>
              </TouchableOpacity>

              {/* Tarjeta de Formulario */}
              <View style={styles.cardContainer}>
                <View style={styles.headerTitleContainer}>
                  <Text style={styles.formTitle}>Crear Cuenta</Text>
                  <Text style={styles.formSubtitle}>
                    Regístrate para competir y gestionar torneos
                  </Text>
                </View>

                {/* Banner de error visible si ocurre una falla */}
                {error ? (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={18} color="#ef4444" />
                    <Text style={styles.errorBannerText}>{error}</Text>
                  </View>
                ) : null}

                {/* Campo 1: Nombre */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Nombre</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={20} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Ej: Carlos"
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="words"
                      value={nombre}
                      onChangeText={setNombre}
                    />
                  </View>
                </View>

                {/* Campo 2: Apellido */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Apellido</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={20} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Ej: Gómez"
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="words"
                      value={apellido}
                      onChangeText={setApellido}
                    />
                  </View>
                </View>

                {/* Campo 3: Teléfono */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Teléfono</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="call-outline" size={20} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Ej: +57 312 345 6789"
                      placeholderTextColor="#94a3b8"
                      keyboardType="phone-pad"
                      value={telefono}
                      onChangeText={handleTelefonoChange}
                    />
                  </View>
                </View>

                {/* Campo 4: Correo electrónico */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Correo electrónico</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Ej: carlos@correo.com"
                      placeholderTextColor="#94a3b8"
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

                {/* Campo 5: Contraseña */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Contraseña</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Mínimo 6 caracteres"
                      placeholderTextColor="#94a3b8"
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
                        color="#64748b"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Botón Principal: Registrarse */}
                <TouchableOpacity
                  style={[styles.registerButton, cargando && { opacity: 0.75 }]}
                  onPress={handleRegistro}
                  activeOpacity={0.85}
                  disabled={cargando}>
                  {cargando ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.registerButtonText}>Registrarse</Text>
                      <Ionicons name="checkmark-circle" size={22} color="#ffffff" />
                    </>
                  )}
                </TouchableOpacity>

                {/* Divisor */}
                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>o</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Enlace para volver a Iniciar Sesión */}
                <View style={styles.loginPrompt}>
                  <Text style={styles.promptText}>¿Ya tienes una cuenta? </Text>
                  <TouchableOpacity
                    onPress={() => router.push('/login')}
                    activeOpacity={0.7}>
                    <Text style={styles.loginLink}>Inicia sesión</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
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
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
    alignItems: 'stretch',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  cardContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  headerTitleContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  formSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    gap: 8,
  },
  errorBannerText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  eyeButton: {
    padding: 6,
  },
  registerButton: {
    backgroundColor: '#16a34a',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    elevation: 4,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptText: {
    fontSize: 14,
    color: '#64748b',
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563eb',
  },
});
