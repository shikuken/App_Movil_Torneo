import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  // Función para manejar el clic en el perfil de usuario
  const handleProfilePress = () => {
    Alert.alert('perfil de usuario');
  };

  // Función para manejar los clics de las opciones del menú
  const handleMenuPress = (optionName: string) => {
    if (optionName === 'Crear torneo') {
      router.push('/crear-torneo');
    } else {
      Alert.alert(optionName, `Has seleccionado la opción "${optionName}".`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}>
        
        {/* Encabezado con Título "Smash Match" e Ícono de Perfil */}
        <View style={styles.header}>
          <Text style={styles.title}>Smash Match</Text>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={handleProfilePress}
            activeOpacity={0.7}
            accessibilityLabel="Perfil de usuario">
            <Ionicons name="person-circle-outline" size={38} color="#0f172a" />
          </TouchableOpacity>
        </View>

        {/* Imagen Destacada de Tenis de Mesa */}
        <View style={styles.imageCard}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1534158914592-062992fbe900?auto=format&fit=crop&w=1000&q=80',
            }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay}>
            <Text style={styles.imageOverlayText}>
              Plataforma Oficial de Gestión de Tenis de Mesa
            </Text>
          </View>
        </View>

        {/* Menú Principal con 4 Opciones */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Menú Principal</Text>
          
          <View style={styles.gridContainer}>
            {/* Botón 1: Crear torneo */}
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => handleMenuPress('Crear torneo')}
              activeOpacity={0.8}>
              <View style={[styles.iconContainer, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="trophy-outline" size={30} color="#2563eb" />
              </View>
              <Text style={styles.buttonText}>Crear torneo</Text>
            </TouchableOpacity>

            {/* Botón 2: Buscar torneo */}
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => handleMenuPress('Buscar torneo')}
              activeOpacity={0.8}>
              <View style={[styles.iconContainer, { backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="search-outline" size={30} color="#16a34a" />
              </View>
              <Text style={styles.buttonText}>Buscar torneo</Text>
            </TouchableOpacity>

            {/* Botón 3: Ver ranking de jugadores */}
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => handleMenuPress('Ver ranking de jugadores')}
              activeOpacity={0.8}>
              <View style={[styles.iconContainer, { backgroundColor: '#faf5ff' }]}>
                <Ionicons name="podium-outline" size={30} color="#9333ea" />
              </View>
              <Text style={styles.buttonText}>Ver ranking de jugadores</Text>
            </TouchableOpacity>

            {/* Botón 4: Noticias */}
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => handleMenuPress('Noticias')}
              activeOpacity={0.8}>
              <View style={[styles.iconContainer, { backgroundColor: '#fff7ed' }]}>
                <Ionicons name="newspaper-outline" size={30} color="#ea580c" />
              </View>
              <Text style={styles.buttonText}>Noticias</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  profileButton: {
    padding: 4,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCard: {
    width: '100%',
    height: 190,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    position: 'relative',
    backgroundColor: '#cbd5e1',
    elevation: 4,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlayText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  menuSection: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  menuButton: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
});
