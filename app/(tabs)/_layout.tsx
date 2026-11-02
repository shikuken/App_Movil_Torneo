import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SmashTheme } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

function StitchBottomBar({ state, descriptors, navigation }: any) {
  const router = useRouter();
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);

  const handleProfile = () => {
    if (Platform.OS === 'web') {
      const conf = window.confirm('¿Deseas cerrar tu sesión actual en Smash Match?');
      if (conf) {
        logout().then(() => router.replace('/login'));
      }
      return;
    }
    Alert.alert('Perfil de Usuario', '¿Deseas cerrar tu sesión actual?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: async () => {
        await logout();
        router.replace('/login');
      }},
    ]);
  };

  return (
    <View style={[styles.navBar, { height: 60 + bottomInset, paddingBottom: bottomInset }]}>
      {/* 1. Inicio */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => router.replace('/(tabs)')}
        activeOpacity={0.7}>
        <Ionicons name="home" size={22} color={SmashTheme.colors.primary} />
        <Text style={[styles.navLabel, { color: SmashTheme.colors.primary, fontWeight: '800' }]}>
          INICIO
        </Text>
      </TouchableOpacity>

      {/* 2. Torneos */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => router.push('/ver-torneos' as any)}
        activeOpacity={0.7}>
        <Ionicons name="trophy-outline" size={22} color={SmashTheme.colors.onSurfaceVariant} />
        <Text style={styles.navLabel}>TORNEOS</Text>
      </TouchableOpacity>

      {/* 3. Botón Central Elevado (+ Crear en Kinetic Volt) */}
      <View style={styles.centerButtonContainer}>
        <TouchableOpacity
          style={styles.floatingVoltBtn}
          onPress={() => router.push('/crear-torneo')}
          activeOpacity={0.85}>
          <Ionicons name="add" size={30} color={SmashTheme.colors.onPrimary} />
        </TouchableOpacity>
      </View>

      {/* 4. Ranking Oficial */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => router.push('/ranking' as any)}
        activeOpacity={0.7}>
        <Ionicons name="podium-outline" size={22} color={SmashTheme.colors.onSurfaceVariant} />
        <Text style={styles.navLabel}>RANKING</Text>
      </TouchableOpacity>

      {/* 5. Perfil */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={handleProfile}
        activeOpacity={0.7}>
        <Ionicons name="person-outline" size={22} color={SmashTheme.colors.onSurfaceVariant} />
        <Text style={styles.navLabel}>PERFIL</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <StitchBottomBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  navBar: {
    backgroundColor: SmashTheme.colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: SmashTheme.colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  navLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: SmashTheme.colors.onSurfaceVariant,
    letterSpacing: 0.5,
    marginTop: 3,
  },
  centerButtonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingVoltBtn: {
    position: 'absolute',
    top: -24,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: SmashTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: SmashTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: SmashTheme.colors.surface,
  },
});
