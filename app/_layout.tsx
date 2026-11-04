import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { SmashTheme } from '../constants/theme';

export const unstable_settings = {
  anchor: 'login',
};

function RootLayoutNav() {
  const { estaAutenticado, cargandoAuth } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (cargandoAuth) return;

    const enRutaDeAuth = segments[0] === 'login' || segments[0] === 'registro';

    if (!estaAutenticado && !enRutaDeAuth) {
      router.replace('/login');
    } else if (estaAutenticado && enRutaDeAuth) {
      router.replace('/(tabs)');
    }
  }, [estaAutenticado, cargandoAuth, segments]);

  if (cargandoAuth) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: SmashTheme.colors.surface }}>
        <ActivityIndicator size="large" color={SmashTheme.colors.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: SmashTheme.colors.surface },
      }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="registro" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="crear-torneo" options={{ headerShown: false }} />
      <Stack.Screen name="registrar-jugadores" options={{ headerShown: false }} />
      <Stack.Screen name="ver-torneos" options={{ headerShown: false }} />
      <Stack.Screen name="desarrollo-torneo" options={{ headerShown: false }} />
      <Stack.Screen name="ranking" options={{ headerShown: false }} />
      <Stack.Screen name="tienda" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
      <StatusBar style="light" />
    </AuthProvider>
  );
}
