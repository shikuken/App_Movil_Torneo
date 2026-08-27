import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function CrearTorneoScreen() {
  const router = useRouter();

  // Estados para los campos de entrada de texto
  const [nombreTorneo, setNombreTorneo] = useState('');
  const [organizador, setOrganizador] = useState('');
  const [lugarSede, setLugarSede] = useState('');
  const [categoria, setCategoria] = useState('');

  // Estado para la opción de modalidad seleccionada
  const [modalidad, setModalidad] = useState<'Eliminación directa' | 'Todos contra todos'>(
    'Eliminación directa'
  );

  // Sanitizado para permitir únicamente caracteres alfanuméricos y espacios
  const handleAlphanumericChange = (text: string, setter: (val: string) => void) => {
    const sanitizedText = text.replace(/[^a-zA-Z0-9\s]/g, '');
    setter(sanitizedText);
  };

  // Manejo del botón de acción "Registrar jugadores"
  const handleRegistrarJugadores = () => {
    if (!nombreTorneo.trim() || !organizador.trim()) {
      Alert.alert(
        'Campos incompletos',
        'Por favor completa la información del torneo (Nombre y Organizador) para continuar.'
      );
      return;
    }

    Alert.alert(
      'Torneo registrado',
      `¡El torneo "${nombreTorneo}" con modalidad "${modalidad}" ha sido creado con éxito! A continuación se abrirá el registro de jugadores.`,
      [
        {
          text: 'Continuar',
          onPress: () => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push('/');
            }
          },
        },
      ]
    );
  };

  // Manejo del botón "Regresar a la página principal"
  const handleRegresar = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <ImageBackground
      source={{
        uri: 'https://images.unsplash.com/photo-1611251126786-291730073574?auto=format&fit=crop&w=1000&q=80',
      }}
      style={styles.backgroundImage}
      resizeMode="cover">
      {/* Capa oscura superpuesta para legibilidad */}
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle="light-content" />

          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}>
            
            {/* Botón para regresar a la página principal */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleRegresar}
              activeOpacity={0.8}
              accessibilityLabel="Regresar a la página principal">
              <Ionicons name="arrow-back-circle-outline" size={26} color="#ffffff" />
              <Text style={styles.backButtonText}>Regresar a la página principal</Text>
            </TouchableOpacity>

            {/* Tarjeta contenedora con fondo semi-transparente */}
            <View style={styles.cardContainer}>
              {/* Título de la pantalla */}
              <Text style={styles.mainTitle}>Crea tu torneo</Text>

              {/* Formulario: Campo 1 - Nombre del torneo */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nombre del torneo</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej: Torneo Smash 2026"
                  placeholderTextColor="#94a3b8"
                  value={nombreTorneo}
                  onChangeText={(text) => handleAlphanumericChange(text, setNombreTorneo)}
                  autoCapitalize="words"
                />
              </View>

              {/* Formulario: Campo 2 - Organizador */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Organizador</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej: Club Tenis de Mesa Cali"
                  placeholderTextColor="#94a3b8"
                  value={organizador}
                  onChangeText={(text) => handleAlphanumericChange(text, setOrganizador)}
                  autoCapitalize="words"
                />
              </View>

              {/* Formulario: Campo 3 - Lugar o Sede */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Lugar / Sede</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej: Coliseo Central Mza 4"
                  placeholderTextColor="#94a3b8"
                  value={lugarSede}
                  onChangeText={(text) => handleAlphanumericChange(text, setLugarSede)}
                  autoCapitalize="words"
                />
              </View>

              {/* Formulario: Campo 4 - Categoría */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Categoría o Nivel</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej: Categoria Avanzada 2026"
                  placeholderTextColor="#94a3b8"
                  value={categoria}
                  onChangeText={(text) => handleAlphanumericChange(text, setCategoria)}
                  autoCapitalize="sentences"
                />
              </View>

              {/* Sección Modalidad */}
              <View style={styles.modalitySection}>
                <Text style={styles.modalityTitle}>Modalidad</Text>
                <View style={styles.modalityButtonsContainer}>
                  {/* Opción 1: Eliminación directa */}
                  <TouchableOpacity
                    style={[
                      styles.modalityButton,
                      modalidad === 'Eliminación directa' && styles.modalityButtonSelected,
                    ]}
                    onPress={() => setModalidad('Eliminación directa')}
                    activeOpacity={0.8}>
                    <Ionicons
                      name="git-commit-outline"
                      size={20}
                      color={modalidad === 'Eliminación directa' ? '#ffffff' : '#2563eb'}
                      style={styles.modalityIcon}
                    />
                    <Text
                      style={[
                        styles.modalityButtonText,
                        modalidad === 'Eliminación directa' && styles.modalityButtonTextSelected,
                      ]}>
                      Eliminación directa
                    </Text>
                  </TouchableOpacity>

                  {/* Opción 2: Todos contra todos */}
                  <TouchableOpacity
                    style={[
                      styles.modalityButton,
                      modalidad === 'Todos contra todos' && styles.modalityButtonSelected,
                    ]}
                    onPress={() => setModalidad('Todos contra todos')}
                    activeOpacity={0.8}>
                    <Ionicons
                      name="grid-outline"
                      size={20}
                      color={modalidad === 'Todos contra todos' ? '#ffffff' : '#2563eb'}
                      style={styles.modalityIcon}
                    />
                    <Text
                      style={[
                        styles.modalityButtonText,
                        modalidad === 'Todos contra todos' && styles.modalityButtonTextSelected,
                      ]}>
                      Todos contra todos
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Botón principal: Registrar jugadores */}
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleRegistrarJugadores}
                activeOpacity={0.85}>
                <Text style={styles.submitButtonText}>Registrar jugadores</Text>
                <Ionicons name="arrow-forward" size={22} color="#ffffff" />
              </TouchableOpacity>

            </View>
          </ScrollView>
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
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
  },
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    justifyContent: 'center',
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 22,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  modalitySection: {
    marginTop: 8,
    marginBottom: 24,
  },
  modalityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
  },
  modalityButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalityButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  modalityButtonSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  modalityIcon: {
    marginRight: 6,
  },
  modalityButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#2563eb',
    textAlign: 'center',
  },
  modalityButtonTextSelected: {
    color: '#ffffff',
  },
  submitButton: {
    backgroundColor: '#16a34a',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
});
