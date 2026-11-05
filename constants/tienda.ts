import { SmashTheme } from './theme';

export interface Producto {
  id: string;
  name: string;
  category: string;
  description: string;
  price: string;
  badge?: string;
  fotoUrl?: string | null;
  color?: string;
  creadoEn: number;
}

export const WHATSAPP_TIENDA = '573100293724';

export const CATEGORIAS_PRODUCTOS = [
  'RAQUETAS',
  'PELOTAS',
  'ACCESORIOS',
  'PROTECCIÓN',
  'ROPA',
  'KITS',
  'OTRO',
] as const;

export const DEFAULT_PRODUCTS: Producto[] = [
  {
    id: 'default_1',
    name: 'Raqueta Pro Carbon X',
    category: 'RAQUETAS',
    description: 'Madera de 5 capas con doble inserto de fibra de carbono para máxima velocidad y control ofensivo.',
    price: '$189.900 COP',
    badge: 'MÁS VENDIDO',
    color: SmashTheme.colors.primary,
    fotoUrl: 'https://images.unsplash.com/photo-1534158914592-062992fbe900?w=800&auto=format&fit=crop&q=80',
    creadoEn: 1710000000000 + 6,
  },
  {
    id: 'default_2',
    name: 'Pelotas 3 Estrellas ITTF (Pack x6)',
    category: 'PELOTAS',
    description: 'Pelotas de 40+ mm sin celuloide, con rebote homogéneo y homologadas para torneos oficiales.',
    price: '$29.900 COP',
    badge: 'COMPETICIÓN',
    color: SmashTheme.colors.secondary,
    fotoUrl: 'https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?w=800&auto=format&fit=crop&q=80',
    creadoEn: 1710000000000 + 5,
  },
  {
    id: 'default_3',
    name: 'Goma Spin Attack Ultra',
    category: 'ACCESORIOS',
    description: 'Goma de alta tensión elástica para topspins fulminantes y excelente adherencia en servicios.',
    price: '$79.900 COP',
    badge: 'NUEVO INGRESO',
    color: '#c084fc',
    fotoUrl: 'https://images.unsplash.com/photo-1511067007398-7e4b90cfa4bc?w=800&auto=format&fit=crop&q=80',
    creadoEn: 1710000000000 + 4,
  },
  {
    id: 'default_4',
    name: 'Red Profesional Clip-On',
    category: 'ACCESORIOS',
    description: 'Sistema de ajuste rápido de mordaza de acero y medidor de altura reglamentario.',
    price: '$49.900 COP',
    color: '#fb923c',
    fotoUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&auto=format&fit=crop&q=80',
    creadoEn: 1710000000000 + 3,
  },
  {
    id: 'default_5',
    name: 'Estuche Térmico Doble',
    category: 'PROTECCIÓN',
    description: 'Protege las gomas contra cambios de temperatura e incluye compartimiento exterior para pelotas.',
    price: '$39.900 COP',
    color: '#f472b6',
    fotoUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80',
    creadoEn: 1710000000000 + 2,
  },
  {
    id: 'default_6',
    name: 'Kit Completo Entrenamiento Smash',
    category: 'KITS',
    description: 'Incluye 2 raquetas todoterreno, red extensible portátil y 4 pelotas de entrenamiento.',
    price: '$69.900 COP',
    badge: 'RECOMENDADO',
    color: '#38bdf8',
    fotoUrl: 'https://images.unsplash.com/photo-1534158914592-062992fbe900?w=800&auto=format&fit=crop&q=80',
    creadoEn: 1710000000000 + 1,
  },
];
