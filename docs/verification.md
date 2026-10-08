# Verificación de la demo

Realizada el 7 de octubre de 2026. Demo temporal: https://vegan-store-music.vercel.app/.

## Build y datos

- `pnpm test`: 13 pruebas aprobadas, incluyendo CSV, duplicados, colisiones, errores de red, preservación del snapshot y mensajes de WhatsApp.
- `pnpm check`: 0 errores, advertencias o sugerencias.
- `pnpm catalog:sync --verify`: descarga real, validación, pruebas y build completos de la implementación inicial; 255 productos únicos.
- El snapshot actual usa esquema 2 y 255 títulos. Sincronizado desde la hoja, incluida la columna `Valor cuota`: `2026-10-08T00:31:09.339Z` (21:31 del 7 de octubre en Buenos Aires). Ejemplo real: cuota ARS 20.213 para Airbag. El sitio presenta ese monto tres veces, conservando el valor mensual.
- Los fallos de CSV o build conservan byte por byte el snapshot anterior. Los precios inválidos y fuera de rango bloquean la importación; los importes de cuota en ARS se interpretan con separador de miles local.

## Lighthouse móvil

Lighthouse 13.5.0 sobre el build servido localmente. Perfil de producción con sitemap e indexación habilitada y `https://example.com` como fixture de canonical, exclusivamente durante la auditoría. La demo publicada usa su dominio real y `noindex, follow`; por ello su evaluación de indexación es deliberadamente diferente. Las puntuaciones siguientes corresponden a la medición local de la versión inicial, anterior al mapa y a la revisión, no a PageSpeed Insights del despliegue.

| Página / medición | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---:|---:|---:|---:|---:|---:|---:|
| Inicio 1 | 100 | 100 | 100 | 100 | 1.205 s | 0.000067 | 0 ms |
| Inicio 2 | 100 | 100 | 100 | 100 | 1.207 s | 0.000067 | 0 ms |
| Inicio 3 | 100 | 100 | 100 | 100 | 1.204 s | 0.000067 | 0 ms |
| Catálogo | 100 | 100 | 100 | 100 | 1.356 s | 0 | 0 ms |

El resumen exacto está en `docs/lighthouse-summary.json`. Los informes completos JSON y HTML, además de las capturas, se conservan localmente en `reports/`, excluidos del despliegue.

JavaScript propio extraído del HTML de la implementación inicial y comprimido con gzip: inicio 828 bytes, catálogo 519 bytes. No hay hidratación ni scripts propios de terceros.

## Navegación y presentación

Chromium: 320, 375, 390, 430, 768, 1024, 1366, 1440 y 1920 px. Sin desbordes horizontales; extracción, liberación del sticky y scroll inverso correctos. Búsqueda, estado vacío y filtro comprobados: 194 productos con stock positivo informado. Catálogo completo disponible sin JavaScript.

Firefox 153 y WebKit 26.5: comprobaciones adicionales en 390 × 844 y 1440 × 900. Hero, sticky, movimiento reducido, búsqueda con acentos y filtro aprobados, sin errores de JavaScript.

Sobre la URL pública: gesto táctil nativo, scroll por wheel y teclado, recarga a mitad del recorrido y cambio de orientación aprobados. La recarga conservó `scrollY=510` y el progreso `0.9152651578415891`. Zoom real de Chromium al 200 %, aplicado mediante `chrome.tabs.setZoom` en un perfil de prueba aislado: viewport de 1424 a 712 px, sin overflow en inicio ni catálogo. La escena pasa a flujo normal cuando la altura disponible es insuficiente.

Reduced motion, JavaScript deshabilitado, enlace para saltar al contenido y foco por teclado comprobados. Las fundas son ilustraciones originales identificadas; faltan las portadas verificadas del negocio.

## Publicación

Acceso anónimo confirmado: inicio y catálogo HTTP 200; robots HTTP 200; imagen Open Graph HTTP 200; ruta inexistente HTTP 404 con navegación. Canonical, Open Graph y Schema usan `https://vegan-store-music.vercel.app`. El catálogo contiene 255 filas y 255 productos en JSON-LD, con precios ARS y sin disponibilidad garantizada.

WhatsApp pendiente de confirmar, con fallback a la ubicación. La automatización diaria de GitHub está preparada y desactivada hasta la confirmación comercial. El propietario retirará manualmente esta demo temporal en menos de 48 horas.
