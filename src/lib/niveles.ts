export type Nivel = 'alto' | 'moderado' | 'bajo' | 'es-ley';

export interface NivelInfo {
  /** Clase de color utilizada en el diseño (rojo/amarillo/verde) */
  clase: string;
  /** Etiqueta visible */
  etiqueta: string;
}

export const NIVELES: Record<Nivel, NivelInfo> = {
  alto: { clase: 'rojo', etiqueta: 'Alto' },
  moderado: { clase: 'amarillo', etiqueta: 'Moderado' },
  bajo: { clase: 'verde', etiqueta: 'Bajo' },
  'es-ley': { clase: 'rojo', etiqueta: 'Es Ley' },
};

export function nivelInfo(nivel: string): NivelInfo {
  return NIVELES[nivel as Nivel] ?? NIVELES.bajo;
}

export type Badge = 'refundida' | 'descartado' | null;

export const BADGES: Record<string, string> = {
  refundida: 'Refundida',
  descartado: 'Descartado',
};

export function badgeEtiqueta(badge?: string | null): string | null {
  if (!badge) return null;
  return BADGES[badge] ?? badge;
}