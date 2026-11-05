import React from 'react';
import {
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SmashTheme } from '../constants/theme';
import { useToast } from '../context/ToastContext';
import {
  DEFAULT_PRODUCTS,
  WHATSAPP_TIENDA,
} from '../constants/tienda';

export default function StoreScreen() {
  const router = useRouter();
  const { showWarning } = useToast();

  const productos = DEFAULT_PRODUCTS;

  // WhatsApp
  const handleOrder = async (productName?: string) => {
    const message = productName
      ? `Hola, quiero consultar por ${productName} de la tienda Smash Match.`
      : 'Hola, quiero consultar por los productos de la tienda Smash Match.';
    const whatsappUrl = `https://wa.me/${WHATSAPP_TIENDA}?text=${encodeURIComponent(message)}`;

    try {
      await Linking.openURL(whatsappUrl);
    } catch {
      showWarning(
        `Intenta nuevamente o escribe al +${WHATSAPP_TIENDA}.`,
        'No se pudo abrir WhatsApp'
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Círculos de luz ambiental */}
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBottom} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Barra de Navegación Superior */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.75}>
            <Ionicons name="arrow-back" size={20} color={SmashTheme.colors.onSurface} />
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>

        {/* Encabezado Principal */}
        <View style={styles.heading}>
          <View style={styles.headingIcon}>
            <Ionicons name="basket" size={28} color={SmashTheme.colors.primary} />
          </View>
          <Text style={styles.title}>Tienda Smash</Text>
          <Text style={styles.subtitle}>
            Equípate con lo mejor para tus entrenamientos y torneos oficiales.
          </Text>
        </View>

        {/* Aviso Informativo con HUD styling */}
        <View style={styles.notice}>
          <Ionicons name="shield-checkmark-outline" size={19} color={SmashTheme.colors.primary} />
          <Text style={styles.noticeText}>
            Equipamiento de alta calidad garantizada. Consulta detalles y disponibilidad directa por WhatsApp.
          </Text>
        </View>

        {/* Grilla de Productos (Modo Catálogo: Solo lectura y consulta) */}
        <View style={styles.productGrid}>
          {productos.map((product) => {
            const productColor = product.color || SmashTheme.colors.primary;
            return (
              <View key={product.id} style={styles.productCard}>
                {/* Contenedor de la Foto o Arte */}
                <View style={styles.productArtwork}>
                  {product.fotoUrl ? (
                    <Image
                      source={{ uri: product.fotoUrl }}
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.artworkFallback, { backgroundColor: `${productColor}15` }]}>
                      <Ionicons name="tennisball-outline" size={42} color={productColor} />
                    </View>
                  )}

                  {/* Badge destacado (ej: MÁS VENDIDO) */}
                  {product.badge ? (
                    <View style={[styles.badge, { backgroundColor: productColor }]}>
                      <Text style={styles.badgeText}>{product.badge}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Detalles del Producto */}
                <View style={styles.productDetails}>
                  <Text style={[styles.category, { color: productColor }]}>
                    {product.category}
                  </Text>
                  <Text style={styles.productName} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <Text style={styles.description} numberOfLines={3}>
                    {product.description}
                  </Text>
                  <Text style={styles.price}>{product.price}</Text>

                  {/* Botón Consultar por WhatsApp */}
                  <TouchableOpacity
                    style={styles.orderButton}
                    onPress={() => handleOrder(product.name)}
                    activeOpacity={0.8}>
                    <Ionicons name="logo-whatsapp" size={16} color={SmashTheme.colors.onPrimary} />
                    <Text style={styles.orderButtonText}>Consultar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* Tarjeta WhatsApp Footer */}
        <View style={styles.whatsappCard}>
          <View style={styles.whatsappIcon}>
            <Ionicons name="logo-whatsapp" size={26} color="#25D366" />
          </View>
          <View style={styles.whatsappCopy}>
            <Text style={styles.whatsappTitle}>Atención Personalizada</Text>
            <Text style={styles.whatsappDescription}>
              ¿Buscas una referencia especial? Escríbenos directamente por WhatsApp.
            </Text>
            <Text style={styles.whatsappNumber}>+{WHATSAPP_TIENDA}</Text>
          </View>
          <TouchableOpacity
            style={styles.whatsappButton}
            onPress={() => handleOrder()}
            activeOpacity={0.8}>
            <Text style={styles.whatsappButtonText}>Escribir</Text>
            <Ionicons name="arrow-forward" size={15} color={SmashTheme.colors.onPrimary} />
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
  glowTop: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: SmashTheme.colors.primary,
    opacity: 0.05,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: SmashTheme.colors.secondary,
    opacity: 0.04,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 8,
  },
  backButtonText: {
    color: SmashTheme.colors.onSurface,
    fontSize: 14,
    fontWeight: '700',
  },
  heading: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 16,
  },
  headingIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(195, 244, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(195, 244, 0, 0.25)',
  },
  title: {
    color: SmashTheme.colors.onSurface,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: SmashTheme.colors.onSurfaceVariant,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 5,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: SmashTheme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(195, 244, 0, 0.2)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
  },
  noticeText: {
    flex: 1,
    color: SmashTheme.colors.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 17,
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
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  productArtwork: {
    height: 126,
    width: '100%',
    backgroundColor: SmashTheme.colors.surfaceContainerHighest,
    position: 'relative',
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  artworkFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    zIndex: 2,
  },
  badgeText: {
    color: SmashTheme.colors.onPrimary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  productDetails: {
    padding: 12,
  },
  category: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  productName: {
    color: SmashTheme.colors.onSurface,
    fontSize: 14,
    fontWeight: '800',
    minHeight: 36,
  },
  description: {
    color: SmashTheme.colors.onSurfaceVariant,
    fontSize: 11,
    lineHeight: 16,
    minHeight: 46,
    marginTop: 4,
  },
  price: {
    color: SmashTheme.colors.primary,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 8,
    marginBottom: 10,
  },
  orderButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: SmashTheme.colors.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: 'rgba(195, 244, 0, 0.3)',
    borderRadius: 10,
  },
  orderButtonText: {
    color: SmashTheme.colors.primary,
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
    borderRadius: 18,
    padding: 14,
    marginTop: 22,
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
    marginTop: 2,
  },
  whatsappNumber: {
    color: '#25D366',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: SmashTheme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  whatsappButtonText: {
    color: SmashTheme.colors.onPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
});
