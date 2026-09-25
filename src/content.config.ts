import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Tipos "nivel" compartidos (Alto / Moderado / Bajo)
 */
const nivel = z.enum(['alto', 'moderado', 'bajo', 'es-ley']);

/**
 * Colección `proyectos`: una entrada por proyecto de ley en seguimiento.
 * Cada archivo es `src/content/proyectos/<boletin>.md` (frontmatter YAML).
 */
const proyectos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/proyectos' }),
  schema: z.object({
    /** Slug del boletín, p. ej. "12100-07". Se usa para la URL /proyecto/<boletin>/ */
    slug: z.string(),
    /** Número visible, p. ej. "Nº 12100-07" */
    numero: z.string(),
    /** Título del proyecto de ley */
    titulo: z.string(),
    /** Slugs de los temas (ver colección `temas`) */
    temas: z.array(z.string()),
    /** Estado de la tramitación, texto libre, p. ej. "Segundo trámite" */
    estado: z.string(),
    /** Badge opcional de la tarjeta/listado */
    badge: z.enum(['refundida', 'descartado']).nullable().optional(),
    /** Texto del tooltip que acompaña al badge */
    tooltip: z.string().optional(),
    /** Indica si el proyecto se muestra en el listado público */
    publicado: z.boolean().default(true),
    /** Posición en el listado de "Seguimiento legislativo" */
    orden: z.number(),
    posibilidadAvance: nivel,
    /** Texto explicativo del estado de avance (detalle) */
    descripcionAvance: z.string().optional(),
    impactoCiudadania: nivel,
    impactoOSC: nivel,
    impactoCiudadaniaDescripcion: z.string().optional(),
    impactoOSCDescripcion: z.string().optional(),
    fechaPresentacion: z.string().optional(),
    patrocinadores: z.array(z.string()).optional(),
    comision: z.string().optional(),
    /** Enlaces de la ficha del proyecto (PDF local, boletín en camara.cl, etc.) */
    enlaces: z
      .array(z.object({ texto: z.string(), url: z.string() }))
      .optional(),
    /** Ruta legislativa: trámites → secciones → hitos con fecha y enlaces */
    ruta: z.array(
      z.object({
        tramite: z.string(),
        secciones: z.array(
          z.object({
            nombre: z.string(),
            descripcion: z.string().optional(),
            items: z.array(
              z.object({
                fecha: z.string(),
                links: z.array(z.object({ texto: z.string(), url: z.string() })),
              }),
            ),
          }),
        ),
      }),
    ),
  }),
});

/**
 * Colección `temas`: metadatos de los filtros (Transparencia, Participación, …).
 * Cada archivo es `src/content/temas/<slug>.md`.
 */
const temas = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/temas' }),
  schema: z.object({
    nombre: z.string(),
    descripcion: z.string().optional(),
    orden: z.number(),
  }),
});

export const collections = { proyectos, temas };