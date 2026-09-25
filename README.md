# Transparentes · Sitio (Astro + Tailwind)

Sitio institucional del proyecto **Transparentes** (Ciudadanía Inteligente + Chile Transparente),
migrado desde HTML plano (Bootstrap 5) a [Astro](https://astro.build) + [Tailwind CSS v4](https://tailwindcss.com)
con colecciones de contenido tipadas. Se despliega en **Netlify** desde el repositorio de GitHub
(y el dominio custom `transparentes.cl` se mantiene vía `public/CNAME`).

## Stack

- **Astro** (SSG, salida estática) + `@astrojs/sitemap`
- **Tailwind CSS v4** (vía `@tailwindcss/vite`) con tokens de marca en `src/styles/global.css`
- **Content Collections** con esquema Zod en `src/content.config.ts`
- JS vanilla (sin React) para acordeones, tabs de trámites, modales y el grid masonry
- Sin Bootstrap: el sistema de diseño original se portó a `@layer components` + utilities

## Comandos

```bash
npm install
npm run dev       # desarrollo (http://localhost:4321)
npm run build     # build estático a dist/
npm run preview   # previsualiza el build
npm run check     # astro check (tipos + contenido)
```

## Estructura

```
public/                     # estáticos: img/, *.pdf, CNAME, favicon, robots
legacy/                     # el sitio HTML original (referencia; no se despliega)
src/
  content.config.ts         # esquemas de las colecciones (Zod)
  content/
    proyectos/<boletin>.md  # 17 proyectos de ley en seguimiento
    temas/<slug>.md         # 5 temas (filtros)
  layouts/Layout.astro      # head, fuentes, GA, layout global
  components/               # Header, Footer, tarjetas, filtros, simbología, modales
  components/proyecto/      # resumen, avance, impacto, ruta (detalle)
  pages/                    # rutas (ver abajo)
  lib/niveles.ts            # mapeo alto/moderado/bajo -> color + etiqueta
```

## Rutas

| URL | Página |
|---|---|
| `/` | Portada |
| `/el-proyecto/` | Sobre el proyecto |
| `/seguimiento-legislativo/` | Listado de todos los proyectos |
| `/seguimiento-legislativo/<tema>/` | Listado filtrado por tema (transparencia, participacion, probidad, justicia, medio-ambiente) |
| `/proyecto/<boletin>/` | Detalle del proyecto (p. ej. `/proyecto/12100-07/`) |
| `/404` | Error 404 |

Las URLs antiguas (`proyecto1.html`, `transparencia.html`, …) se redirigen con **301** desde
`netlify.toml`.

## Colección `proyectos`

Cada proyecto vive en `src/content/proyectos/<boletin>.md`. Frontmatter:

```yaml
---
slug: "12100-07"
numero: "Nº 12100-07"
titulo: "Modifica la ley N°20.285, sobre acceso a la información pública."
temas: [transparencia]
estado: "Segundo Trámite Constitucional"
publicado: true          # false = se conserva el detalle pero no aparece en el listado
orden: 3                 # posición en el listado
posibilidadAvance: bajo  # alto | moderado | bajo | es-ley
impactoCiudadania: alto
impactoOSC: alto
impactoCiudadaniaDescripcion: "..."
impactoOSCDescripcion: "..."
descripcionAvance: "..."
fechaPresentacion: "12 de agosto de 2018"
patrocinadores: ["Ministerio Secretaría General de la Presidencia"]
comision: "Hacienda del Senado"
enlaces:
  - texto: "Proyecto Final"
    url: "/12100-07.pdf"
ruta:
  - tramite: "Primer trámite"
    secciones:
      - nombre: "Avance de la discusión parlamentaria"
        descripcion: "Actas, videos y documentos"
        items:
          - fecha: "12/09/2018"
            links:
              - texto: "Texto inicial"
                url: "https://www.camara.cl/verDoc.aspx?..."
---
El resumen ejecutivo va aquí como Markdown.
```

> **Agregar un proyecto nuevo = crear un `.md` nuevo.** El listado, los filtros por tema y el
> detalle se generan automáticamente. `badge` (`refundida`/`descartado`) y `tooltip` agregan la
> etiqueta de la tarjeta.

### Conversión desde el HTML legacy

Solo si hay que re-importar contenido desde el sitio antiguo:

```bash
node scripts/convert-proyectos.mjs   # lee legacy/proyectoN.html y regenera src/content/proyectos
```

Los campos curados a mano (orden, badges, tooltips, publicación) viven en el mapa `OVERRIDES` del script.

## Deploy en Netlify (GitHub)

1. Sube la rama `astro-migration` a GitHub y haz merge a `main` (o crea un PR).
2. En Netlify: **Add new site → Import an existing project → GitHub**, selecciona el repo
   `ciudadanointeligente/proyectotransparentes`.
3. Los ajustes ya vienen en `netlify.toml`:
   - build: `npm run build` · publish: `dist`
   - `NODE_VERSION = 20` (además hay `.nvmrc`)
   - redirects 301 de las URLs antiguas · headers de seguridad
4. Custom domain: `transparentes.cl` (el DNS ya apunta a Netlify; `public/CNAME` es referencia).

## Analytics

Google Analytics (`G-07VCJGSMEQ`) se carga desde `src/layouts/Layout.astro`.