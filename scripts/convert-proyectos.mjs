/**
 * Conversión de las páginas HTML legacy (legacy/proyectoN.html)
 * a entradas de la colección de contenido Astro (src/content/proyectos/<slu>.md).
 *
 * Uso: node scripts/convert-proyectos.mjs
 * Incluye los "overrides" curados a mano (orden, badges, tooltips, publicación).
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'node-html-parser';

const LEGACY_DIR = 'legacy';
const OUT_DIR = 'src/content/proyectos';

const TEMA_MAP = {
  transparencia: 'transparencia',
  participacion: 'participacion',
  probidad: 'probidad',
  justicia: 'justicia',
  medioambiente: 'medio-ambiente',
};

/** Overrides curados a mano (basados en el listado actual y su historial). */
const OVERRIDES = {
  '12100-07': { orden: 3, badge: null },
  '16358-35': { orden: 4 },
  '15643-06': { orden: 5 },
  '16754-06': { orden: 6 },
  '16888-06': { orden: 7, badge: 'refundida', tooltip: 'Ha sido refundida bajo estos boletines: Nº16.593-06 - Nº16.988-06' },
  '16886-12': { orden: 8 },
  '15590-06': { orden: 9 },
  '11364-06': { orden: 16, publicado: false, badge: null, estado: 'Rechazada' },
  '15959-06': { orden: 17, publicado: false, badge: 'descartado', tooltip: 'Proyecto de ley ha sido descartado', estado: 'Descartado' },
  '17253-07': { orden: 10 },
  '13991-07': { orden: 11 },
  '16163-07': { orden: 12, badge: 'refundida', tooltip: 'Ha sido refundida bajo este boletín: 16192-07' },
  '17262-06': { orden: 13 },
  '13105-06': { orden: 14 },
  '15351-07': { orden: 15 },
  '17817-07': { orden: 2, posibilidadAvance: 'alto' },
  '17797-06': { orden: 1 },
};

function nombreArchivo(n) {
  return `proyecto${n}.html`;
}

function extraerBoletin(doc) {
  const activo = doc.querySelector('.breadcrumb-item.active');
  const texto = activo ? activo.text : '';
  const match = texto.match(/(\d+(?:[.,]\d+)*-\d+)/);
  if (!match) throw new Error(`No se encontró el boletín en: ${texto}`);
  return match[1].replace(/[^\d-]/g, '');
}

function nivelesDeImpacto(doc) {
  const cuerpos = doc.querySelectorAll('.impacto .accordion-body');
  const niveles = { impactoCiudadania: 'bajo', impactoOSC: 'bajo' };
  if (cuerpos.length > 0) niveles.impactoCiudadania = nivelDeCuerpo(cuerpos[0]);
  if (cuerpos.length > 1) niveles.impactoOSC = nivelDeCuerpo(cuerpos[1]);
  const descripcion = (c) => {
    const p = c?.querySelector('.descripcion p');
    return p ? limpiar(p.text) : undefined;
  };
  return {
    ...niveles,
    impactoCiudadaniaDescripcion: descripcion(cuerpos[0]),
    impactoOSCDescripcion: descripcion(cuerpos[1]),
  };
}

function nivelDeCuerpo(el) {
  const circulo = el.querySelector('[class*="circulo"]');
  if (!circulo) return 'bajo';
  const clase = circulo.rawAttrs || '';
  if (/circulo(rojo)/i.test(clase)) return 'alto';
  if (/circulo(amarillo)/i.test(clase)) return 'moderado';
  return 'bajo';
}

function extraerResumen(doc) {
  const bloque = doc.querySelector('.resumen-ejecutivo');
  const resumenEl = bloque?.querySelector('p');

  // Párrafo principal sin los <li> (que se modelan como campos/estructura)
  let resumen = '';
  if (resumenEl) {
    const htmlSinLis = resumenEl.innerHTML.replace(/<li[^>]*>[\s\S]*?<\/li>/gi, '');
    resumen = limpiar(
      htmlSinLis.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&'),
    );
  }

  const lis = bloque ? bloque.querySelectorAll('li') : [];
  const liTexts = lis.map((li) => li.text);

  const datos = {
    estado: '',
    fechaPresentacion: '',
    patrocinadores: [],
    comision: '',
    enlaces: [],
  };

  for (const li of lis) {
    const texto = limpiar(li.text);
    const anchors = li.querySelectorAll('a');
    if (anchors.length > 0) {
      for (const a of anchors) {
        datos.enlaces.push({ texto: limpiar(a.text), url: normalizarUrl(a.getAttribute('href') || '') });
      }
      continue;
    }
    const mEstado = texto.match(/^Estado de la discusión\s*parlamentaria\s*:\s*(.*)$/i);
    if (mEstado) {
      datos.estado = mEstado[1].trim();
      continue;
    }
    if (/^Ley publicada/i.test(texto)) {
      datos.estado = 'Es Ley';
      continue;
    }
    const mFecha = texto.match(/^Fecha de (?:presentación|ingreso)\s*:\s*(.*)$/i);
    if (mFecha) {
      datos.fechaPresentacion = mFecha[1].trim();
      continue;
    }
    const mPat = texto.match(/^(?:Patrocinadores?|Autores)\s*:\s*(.*)$/i);
    if (mPat) {
      datos.patrocinadores = mPat[1].split('|').map((s) => s.trim()).filter(Boolean);
      continue;
    }
    const mCom = texto.match(/^Comisi[oó]n\s*:\s*(.*)$/i);
    if (mCom) {
      datos.comision = mCom[1].trim();
    }
  }

  return { resumen, ...datos, liTexts };
}

function normalizarUrl(url) {
  if (/^(https?:|mailto:|tel:|#)/i.test(url)) return url;
  if (url.startsWith('/')) return url;
  // URLs relativas a archivos que vivían en la raíz ahora viven en /public
  return '/' + url.replace(/^\.\.?\//, '');
}

function extraerPosibilidadAvance(doc) {
  const el = doc.querySelector('.posibilidad-de-avance p.dato');
  if (!el) return { posibilidadAvance: 'bajo', descripcionAvance: '' };
  const clase = el.rawAttrs || '';
  const texto = limpiar(el.text).toLowerCase();
  let nivel = 'bajo';
  if (/rojo/.test(clase) || texto.startsWith('alt') || texto === 'es ley') nivel = texto === 'es ley' ? 'es-ley' : 'alto';
  else if (/amarillo/.test(clase) || texto.startsWith('moder')) nivel = 'moderado';
  else if (/verde/.test(clase) || texto.startsWith('baj')) nivel = 'bajo';
  const descripcion = doc.querySelector('.posibilidad-de-avance p.descripcion');
  return { posibilidadAvance: nivel, descripcionAvance: descripcion ? limpiar(descripcion.text) : '' };
}

function extraerRuta(doc, htmlCrudo) {
  // Algunas páginas tienen el árbol HTML desbalanceado y el parser recoloca
  // la zona de la ruta fuera de .ruta-del-proyecto. Para robustez, extraemos
  // el fragmento en crudo delimitado por los comentarios del template.
  const inicio = htmlCrudo.search(/<!--\s*RUTA DEL PROYECTO/i);
  const fin = htmlCrudo.search(/<!--\s*FIN RUTA DEL PROYECTO/i);
  let fragmento = '';
  if (inicio !== -1) {
    fragmento = fin !== -1 && fin > inicio ? htmlCrudo.slice(inicio, fin) : htmlCrudo.slice(inicio);
  } else {
    const idx = htmlCrudo.indexOf('class="ruta-del-proyecto');
    if (idx !== -1) {
      const cierreFooter = htmlCrudo.indexOf('<footer');
      fragmento = htmlCrudo.slice(idx, cierreFooter !== -1 ? cierreFooter : undefined);
    }
  }
  if (!fragmento) return [];

  const rutaDoc = parse(fragmento);
  const pills = rutaDoc.querySelectorAll('.nav-pills button').map((b) => limpiar(b.text));
  const panes = rutaDoc.querySelectorAll('.tab-pane');

  return pills.map((tramite, i) => {
    const pane = panes[i];
    const secciones = pane
      ? pane.querySelectorAll('.accordion-item').map((item) => {
          const boton = item.querySelector('.accordion-header button');
          const nombre = boton ? limpiar(boton.text) : 'sin título';
          const cuerpo = item.querySelector('.accordion-body');
          const descripcionEl = cuerpo?.querySelector('h5.title');
          const items = cuerpo
            ? cuerpo
                .querySelectorAll('li')
                .map((li) => {
                  const fechaEl = li.querySelector('p');
                  const fecha = fechaEl ? limpiar(fechaEl.text) : '';
                  const links = li
                    .querySelectorAll('a')
                    .map((a) => ({ texto: limpiar(a.text), url: normalizarUrl(a.getAttribute('href') || '') }));
                  return { fecha, links };
                })
                .filter((item) => item.links.length > 0)
            : [];
          return {
            nombre,
            ...(descripcionEl ? { descripcion: limpiar(descripcionEl.text) } : {}),
            items,
          };
        })
      : [];
    return { tramite, secciones };
  });
}

function limpiar(s = '') {
  return s
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+$/g, '')
    .trim();
}

function yamlEscapar(s = '') {
  // Evita caracteres problemáticos en YAML
  return s.replace(/"/g, '\\"');
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const archivos = fs
    .readdirSync(LEGACY_DIR)
    .filter((f) => /^proyecto(\d+)\.html$/.test(f))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

  const generados = [];
  for (const archivo of archivos) {
    const html = fs.readFileSync(path.join(LEGACY_DIR, archivo), 'utf8');
    const doc = parse(html);

    const boletin = extraerBoletin(doc);
    const resumen = extraerResumen(doc);
    const avance = extraerPosibilidadAvance(doc);
    const impactos = nivelesDeImpacto(doc);
    const ruta = extraerRuta(doc, html);

    const temasRel = doc
      .querySelectorAll('.seccion-proyecto .temas a')
      .map((a) => a.getAttribute('href') || '');
    const temas = temasRel
      .map((href) => {
        const m = href.match(/\/(transparencia|participacion|probidad|justicia|medioambiente)\.html/);
        return m ? TEMA_MAP[m[1]] : null;
      })
      .filter(Boolean);

    const tituloEl = doc.querySelector('.titulo-1 h2');
    const titulo = tituloEl ? limpiar(tituloEl.text) : '';

    const override = OVERRIDES[boletin] || {};
    const estado = override.estado || resumen.estado || '';
    const publicado = override.publicado !== false;

    const yaml = [
      '---',
      `slug: "${boletin}"`,
      `numero: "Nº ${boletin}"`,
      `titulo: "${yamlEscapar(titulo)}"`,
      `temas: ${JSON.stringify(temas)}`,
      `estado: "${yamlEscapar(estado)}"`,
      `publicado: ${publicado}`,
      `orden: ${override.orden ?? 999}`,
      `posibilidadAvance: ${override.posibilidadAvance ?? avance.posibilidadAvance}`,
      `impactoCiudadania: ${impactos.impactoCiudadania}`,
      `impactoOSC: ${impactos.impactoOSC}`,
    ];

    if (impactos.impactoCiudadaniaDescripcion)
      yaml.push(`impactoCiudadaniaDescripcion: "${yamlEscapar(impactos.impactoCiudadaniaDescripcion)}"`);
    if (impactos.impactoOSCDescripcion)
      yaml.push(`impactoOSCDescripcion: "${yamlEscapar(impactos.impactoOSCDescripcion)}"`);
    if (avance.descripcionAvance) yaml.push(`descripcionAvance: "${yamlEscapar(avance.descripcionAvance)}"`);

    if (override.badge) yaml.push(`badge: ${override.badge}`);
    if (override.tooltip) yaml.push(`tooltip: "${yamlEscapar(override.tooltip)}"`);
    if (resumen.fechaPresentacion) yaml.push(`fechaPresentacion: "${yamlEscapar(resumen.fechaPresentacion)}"`);
    if (resumen.patrocinadores.length > 0)
      yaml.push(`patrocinadores: ${JSON.stringify(resumen.patrocinadores)}`);
    if (resumen.comision) yaml.push(`comision: "${yamlEscapar(resumen.comision)}"`);
    if (resumen.enlaces.length > 0)
      yaml.push(`enlaces:\n${resumen.enlaces.map((e) => `  - texto: "${yamlEscapar(e.texto)}"\n    url: "${yamlEscapar(e.url)}"`).join('\n')}`);

    if (ruta.length === 0) {
      yaml.push('ruta: []');
    } else {
      yaml.push('ruta:');
      for (const tramite of ruta) {
        yaml.push(`  - tramite: "${yamlEscapar(tramite.tramite)}"`);
        if (tramite.secciones.length === 0) {
          yaml.push(`    secciones: []`);
          continue;
        }
        yaml.push(`    secciones:`);
        for (const sec of tramite.secciones) {
          if (sec.items.length === 0) {
            yaml.push(`      - nombre: "${yamlEscapar(sec.nombre)}"`);
            if (sec.descripcion) yaml.push(`        descripcion: "${yamlEscapar(sec.descripcion)}"`);
            yaml.push(`        items: []`);
            continue;
          }
          yaml.push(`      - nombre: "${yamlEscapar(sec.nombre)}"`);
          if (sec.descripcion) yaml.push(`        descripcion: "${yamlEscapar(sec.descripcion)}"`);
          yaml.push(`        items:`);
          for (const item of sec.items) {
            yaml.push(`          - fecha: "${yamlEscapar(item.fecha)}"`);
            yaml.push(`            links:`);
            for (const link of item.links) {
              yaml.push(`              - texto: "${yamlEscapar(link.texto)}"`);
              yaml.push(`                url: "${yamlEscapar(link.url)}"`);
            }
          }
        }
      }
    }

    const cuerpo = resumen.resumen || '';

    const md = `${yaml.join('\n')}\n---\n\n${cuerpo}\n`;
    const salida = path.join(OUT_DIR, `${boletin}.md`);
    fs.writeFileSync(salida, md, 'utf8');
    generados.push({ archivo, boletin, temas, estado, publicado, tamSecciones: ruta.reduce((a, t) => a + t.secciones.length, 0) });
    console.log(`✔ ${archivo} → ${boletin}.md`);
  }

  console.log(`\nTotal: ${generados.length} proyectos`);
}

main();