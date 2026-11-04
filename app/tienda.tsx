import React from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SmashTheme } from '../constants/theme';

const WHATSAPP_NUMBER = '573100293724';

const products = [
  {
    name: 'Raqueta Pro Carbon',
    category: 'RAQUETAS',
    description: 'Madera ligera para un juego rápido y preciso.',
    price: '$189.900',
    icon: 'tennisball-outline' as const,
    color: SmashTheme.colors.primary,
    badge: 'MÁS VENDIDO',
  },
  {
    name: 'Pelotas 3 estrellas',
    category: 'PELOTAS',
    description: 'Pack de 6 pelotas de 40 mm para competición.',
    price: '$29.900',
    icon: 'radio-button-on-outline' as const,
    color: SmashTheme.colors.secondary,
  },
  {
    name: 'Goma Spin Attack',
    category: 'ACCESORIOS',
    description: 'Goma de alto agarre para mejorar el efecto.',
    price: '$79.900',
    icon: 'disc-outline' as const,
    color: '#c084fc',
  },
  {
    name: 'Red de repuesto',
    category: 'ACCESORIOS',
    description: 'Red ajustable, compatible con mesas estándar.',
    price: '$49.900',
    icon: 'git-compare-outline' as const,
    color: '#fb923c',
  },
  {
    name: 'Estuche doble',
    category: 'PROTECCIÓN',
    description: 'Protege y lleva tus raquetas y pelotas.',
    price: '$39.900',
    icon: 'briefcase-outline' as const,
    color: '#f472b6',
  },
  {
    name: 'Kit de entrenamiento',
    category: 'KITS',
    description: 'Raqueta recreativa y pelotas para empezar.',
    price: '$69.900',
    icon: 'fitness-outline' as const,
    color: '#38bdf8',
  },
];

export default function StoreScreen() {
  const router = useRouter();

  const handleOrder = async (productName?: string) => {
    const message = productName
      ? `Hola, quiero consultar por ${productName}.`
      : 'Hola, quiero consultar por los productos de la tienda.';
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

    try {
      await Linking.openURL(whatsappUrl);
    } catch {
      Alert.alert('No se pudo abrir WhatsApp', 'Intenta nuevamente o escribe al +57 310 029 3724.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.75}>
          <Ionicons name="arrow-back" size={20} color={SmashTheme.colors.onSurface} />
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>

        <View style={styles.heading}>
          <View style={styles.headingIcon}>
            <Ionicons name="basket" size={25} color={SmashTheme.colors.primary} />
          </View>
          <Text style={styles.title}>Tienda</Text>
          <Text style={styles.subtitle}>
            Equípate para llevar tu juego al siguiente nivel.
          </Text>
        </View>

        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={19} color={SmashTheme.colors.secondary} />
          <Text style={styles.noticeText}>
            Productos y precios de ejemplo. Consulta disponibilidad al hacer tu pedido.
          </Text>
        </View>

        <View style={styles.productGrid}>
          {products.map((product) => (
            <View key={product.name} style={styles.productCard}>
              <View style={[styles.productArtwork, { backgroundColor: `${product.color}18` }]}>
                <Ionicons name={product.icon} size={38} color={product.color} />
                {product.badge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{product.badge}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.productDetails}>
                <Text style={[styles.category, { color: product.color }]}>{product.category}</Text>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.description}>{product.description}</Text>
                <Text style={styles.price}>{product.price} COP</Text>
                <TouchableOpacity
                  style={styles.orderButton}
                  onPress={() => handleOrder(product.name)}
                  activeOpacity={0.8}>
                  <Ionicons name="logo-whatsapp" size={17} color={SmashTheme.colors.onPrimary} />
                  <Text style={styles.orderButtonText}>Consultar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.whatsappCard}>
          <View style={styles.whatsappIcon}>
            <Ionicons name="logo-whatsapp" size={25} color="#25D366" />
          </View>
          <View style={styles.whatsappCopy}>
            <Text style={styles.whatsappTitle}>Pedidos por WhatsApp</Text>
            <Text style={styles.whatsappDescription}>
              Escríbenos para realizar tu pedido o consultar disponibilidad.
            </Text>
            <Text style={styles.whatsappNumber}>+57 310 029 3724</Text>
          </View>
          <TouchableOpacity
            style={styles.whatsappButton}
            onPress={() => handleOrder()}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Hacer pedido por WhatsApp al +57 310 029 3724">
            <Text style={styles.whatsappButtonText}>Escribir</Text>
            <Ionicons name="arrow-forward" size={16} color={SmashTheme.colors.onPrimary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SmashTheme.colors.surface,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 36,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 8,
  },
  backButtonText: {
    color: SmashTheme.colors.onSurface,
    fontSize: 14,
    fontWeight: '600',
  },
  heading: {
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 22,
  },
  headingIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(195, 244, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    color: SmashTheme.colors.onSurface,
    fontSize: 30,
    fontWeight: '900',
  },
  subtitle: {
    color: SmashTheme.colors.onSurfaceVariant,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: SmashTheme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  noticeText: {
    flex: 1,
    color: SmashTheme.colors.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 18,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  productCard: {
    width: '48.5%',
    overflow: 'hidden',
    backgroundColor: SmashTheme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: SmashTheme.colors.cardBorder,
    borderRadius: 16,
  },
  productArtwork: {
    height: 116,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 9,
    left: 8,
    backgroundColor: SmashTheme.colors.primary,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  badgeText: {
    color: SmashTheme.colors.onPrimary,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  productDetails: {
    padding: 11,
  },
  category: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginBottom: 5,
  },
  productName: {
    color: SmashTheme.colors.onSurface,
    fontSize: 14,
    fontWeight: '800',
    minHeight: 34,
  },
  description: {
    color: SmashTheme.colors.onSurfaceVariant,
    fontSize: 11,
    lineHeight: 16,
    minHeight: 48,
    marginTop: 5,
  },
  price: {
    color: SmashTheme.colors.onSurface,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 10,
  },
  orderButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: SmashTheme.colors.primary,
    borderRadius: 9,
  },
  orderButtonText: {
    color: SmashTheme.colors.onPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  whatsappCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SmashTheme.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.3)',
    borderRadius: 16,
    padding: 14,
    marginTop: 20,
  },
  whatsappIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(37, 211, 102, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappCopy: {
    flex: 1,
  },
  whatsappTitle: {
    color: SmashTheme.colors.onSurface,
    fontSize: 14,
    fontWeight: '800',
  },
  whatsappDescription: {
    color: SmashTheme.colors.onSurfaceVariant,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  whatsappNumber: {
    color: '#25D366',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 5,
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: SmashTheme.colors.primary,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  whatsappButtonText: {
    color: SmashTheme.colors.onPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
});
