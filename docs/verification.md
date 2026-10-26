# Verificación de la demo

## 26 de octubre de 2026 — Propuesta de hero fullscreen

- Aislada en `codex/hero-fullscreen-seo`, sobre el commit de navegación de `main`. H1 de texto “CDs y discos de vinilo: venta e importación”, sin logo en el hero; descripción en párrafo sobre ediciones nacionales/importadas, Almagro y envíos. Título y meta descripción consistentes. Botón “Importar álbumes” junto al catálogo, con el mismo ícono de WhatsApp existente y mensaje de importación.
- Escena de V1 con altura mínima `100svh` menos el header. Tipografía y vinilo ampliados; adaptación para móvil y tablet vertical. El script original de extracción y fijación se conserva. No modifica el hero de V2.
- Chrome local: 320×568, 360×640, 390×844, 430×932, 768×1024, 1024×768, 1366×768, 1366×900 y 1920×1080 llenan la pantalla sin desbordes ni contenido recortado. Escena fija al 40% y 85% del recorrido; extracción terminada al 85%, liberación posterior y un único H1. En 844×390 funciona el fallback sin fijación. Movimiento reducido y JavaScript desactivado comprobados. Sin errores JavaScript. Capturas y mediciones en `reports/hero-fullscreen/`, ignorado por Git.
- Builds V1/V2 correctos. No se publicaron estos cambios ni se activó la indexación de la demo.

## 26 de octubre de 2026 — Importación y contador del footer

- Header y footer enlazan “Importación” a `/#importacion`, disponible en ambas variantes. La sección conserva “Explorar el catálogo” y suma “Consultar importación”, con mensaje editable de artista, álbum y edición hacia el número configurado. Ícono existente de Simple Icons, copia local CC0; procedencia en `src/assets/icons/README.md`.
- Footer conectado al estado compartido del carrito: `Carrito (0 items)`, singular `Carrito (1 item)` y plural, incluidos recarga, navegación y eventos de almacenamiento.
- 46 pruebas aprobadas; Astro check sin errores, advertencias ni hints; builds V1/V2 correctos.
- Chrome local: clic desde header y desde otra página, ancla libre del header fijo, menú móvil cerrado al navegar, URL/mensaje/ícono de WhatsApp, agregar dos productos y persistencia tras recarga comprobados en ambas variantes. Layouts de 320, 390, 768, 1366 y 1920 px sin desbordes y con ambos botones de al menos 44 px de alto. Sin errores JavaScript. Capturas y mediciones en `reports/import-navigation/`, ignorado por Git.
- Cambios locales; sin publicar, enviar consultas ni modificar catálogo o hosting.

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

## Actualización del 14 de octubre de 2026

Se corrigió la medición del hero móvil para excluir el indicador inferior absoluto y reservar su espacio. El disco comienza cerrado; las pantallas que requieren una escena estática también comienzan cerradas, salvo la preferencia de movimiento reducido. Se conserva el recorrido acortado de 45svh en móvil y 60svh en escritorio.

Revisión visual en 320 × 568, 375 × 667, 390 × 844 y 1366 × 900: sin overflow horizontal, progreso inicial 0 y extracción reversible en móvil. El header muestra «Nosotros» y «Catálogo» abre `/catalogo/`. «Ver catálogo completo» tiene fondo, «Los 255 títulos» conserva el subrayado y Babasónicos mantiene la información debajo de la portada grande.

Sincronización manual correcta: 255 productos, con fecha del 14 de octubre. Los datos comerciales coinciden con el snapshot anterior. Tipos y build correctos, sin errores de consola durante la revisión. La automatización sigue desactivada por decisión del propietario hasta confirmar la venta; no se creó ni conectó un repositorio.

## 17 de octubre de 2026 — Dos demos y carrito de consulta

- V1 publicada READY: https://vegan-store-music.vercel.app/ (dpl_BRrT61ygrf2nroRHXEqC5SryRWfD).
- V2 publicada READY: https://vegan-store-music-v2.vercel.app/ (dpl_9ZkUwJnEwUgv9mc1iQWvX132dMPX).
- Ambas URLs respondieron HTTP 200 sin cookies ni autenticación; variante y noindex comprobados.
- Sheets sincronizado: schemaVersion 3, 255 productos, 194 con stock informado. Fecha UTC del snapshot: 2026-10-17T20:47:25.980Z. Tres precios cero se normalizaron a null.
- 24 pruebas aprobadas: parser, recuperación del snapshot, precios, cantidades, stock, origen, reconciliación, mensaje y fallo de escritura del almacenamiento.
- Tipos: 0 errores, 0 advertencias, 0 hints. Builds V1 y V2 correctos.
- Validación de HTML generado: 79 enlaces internos V1 y 113 V2 válidos, canonical/noindex y JSON-LD revisados. Cuatro HTML V1 y siete V2, incluyendo 404 y redirección.
- Todos los módulos JS del build suman 5878 bytes gzip, una cota superior al JavaScript de cualquier página individual.
- Navegador: V1 y V2 sin desbordes en 320, 390, 768 y 1366 px. V1 comienza con progreso 0 y conserva el recorrido previo; V2 permite ver el comienzo del catálogo en la primera pantalla. Carrito adicionalmente revisado en 320, 768 y 1366 px.
- Flujo comprobado: búsqueda y origen combinados, origen vacío sólo en Todas, stock marcado inicialmente, agregar, incrementar, límite 1/10, persistencia tras recarga, radios y totales, cierre del menú con Escape, páginas de V2 y redirección inmediata /catalogo/.
- Demo pública V2: dos Airbag generaron 3 cuotas de $40.426 y total $121.278, idénticos al texto codificado para WhatsApp. No se enviaron mensajes. Los productos de prueba se quitaron al terminar. Consola sin errores.
- Captura de V2 publicada: reports/v2-desktop.jpg (artefacto local ignorado por Git).
- HTML sin JS: los 255 registros y consultas directas están presentes. Las reglas CSS de movimiento reducido fueron revisadas; no se realizó una prueba en un iPhone/Safari físico ni una nueva auditoría Lighthouse.
- El WhatsApp sigue siendo el número temporal de Ramiro. No se creó GitHub ni se activó automatización.

## 17 de octubre de 2026 — Contacto, mensajes y estabilidad del header

- WhatsApp reemplazado por 5491158974298 en la configuración central. Ambas portadas y /carrito/ publicados responden HTTP 200 y usan ese número; no quedan referencias al anterior en src ni en los builds.
- Normalización de teléfono: formato internacional, string de dígitos, separadores conocidos opcionales, validación de longitud; letras, extensiones, URLs y entradas inválidas se rechazan. Mensajes normalizados con espacios legibles, NFC, saltos LF y codificación URL una sola vez.
- 27 pruebas aprobadas; tipos sin errores, advertencias ni hints; builds y validación de enlaces/canonical/JSON-LD correctos para V1/V2.
- El mensaje de una sola unidad se comprobó como: 1 × Airbag Airbag — $ 49.220. Sin c/u ni subtotal repetido en esa línea. Las cantidades mayores conservan unitario y subtotal, consistentes con cuotas/total.
- Carrito: una unidad muestra el medio de pago y un único precio de línea; disponibilidad como 1 disponible o X disponibles, con 10+ preservado cuando corresponde.
- Hover real comprobado sobre el botón de Asunto: el signo más queda con transform none. Las flechas diagonales mantienen su transición.
- Header: no se observó variación de geometría previa, por lo que se aplicó una corrección de composición al sticky (translateZ(0), backface-visibility). En escritorio, header top=0 y logo top=14 permanecen estables en V1 y V2 durante scroll por teclado; ninguna animación del hero fue cambiada.
- V1 READY: dpl_9zfb1yEvu5kUkW6KFPw13G6E2YdY. V2 READY: dpl_CrnHFjwQvEfiQ6DDW7DsVrAatLVw. Ambas conservan noindex.
- Captura: reports/cart-whatsapp-update.jpg. No se enviaron mensajes de WhatsApp.

## 18 de octubre de 2026 — Marca VMS y sliders de V1

- Originales de img intactos. Copias PNG recortadas en src/assets/brand, comprobadas byte por byte en píxeles decodificados dentro del recorte. Coordenadas y hashes en provenance.json. Sin retoque generativo.
- Nombre público Vegan Music Store, sigla VMS. Lila #9c84c3 con tinta #211c27 y violeta de texto #694784. Logos en header, hero y footer; el logo de Vegan Records sólo en su apartado. OG y favicon actualizados.
- Hero en flujo normal, aproximadamente 80svh en escritorio, adaptado en móvil. Extracción reversible con scroll, sin distancia sticky adicional. Movimiento reducido conservado.
- Dos sliders compartidos: cuatro ediciones nacionales y cuatro internacionales, fundas tipográficas ilustrativas, precios y cuotas del snapshot. Agregado con límites de stock mediante lógica única para catálogo y sliders; aviso accesible y contador. Slider del carrito sin enlaces al catálogo y eliminado Seguir explorando junto a las líneas de compra.
- Tipos: 0 errores/advertencias/hints. 27 pruebas aprobadas. El directorio temporal de tests se estableció dentro de reports para evitar EPERM del aislamiento de Windows; no se modificó código por ese fallo del entorno. Builds V1 y V2 correctos. JS total de módulos del build V1: 5496 bytes gzip (cota superior por página).
- Navegador integrado: 320×568, 390×844, 768×1024, 1366×768 y 1366×900 sin desbordes del documento. Primer viewport muestra comienzo del slider; a 390px también asoman fundas. No se realizó auditoría Lighthouse ni prueba física en iPhone.
- Flujo local y online: Jessico desde inicio + Bad Brains desde carrito = $110.210; tres cuotas de $45.260, total $135.780, coincidentes con WhatsApp. Productos de prueba quitados. Consulta no enviada. Búsqueda Virus online devuelve 2 títulos. Consola sin errores en la revisión publicada.
- V1 READY y promovida: dpl_EtpZxXtp6i5512Ksrgde5Yxvm8jn, https://vegan-store-music.vercel.app/. Despliegue construido con SITE_VARIANT=v1, URL definitiva de demo y noindex. Comprobado HTTP 200 en despliegue preparado. Conector Vercel dio 403; se usó sesión válida de CLI oficial 64.5.0 en el mismo equipo/proyecto. V2 no se publicó en esta actualización.
- Capturas en reports/brand-refresh/.

## Correcciones de hero, identidad y consultas a pedido

- V1 READY y promovida: dpl_33uMYKJa1eoJmmseffvKdUdtgFsE, https://vegan-store-music.vercel.app/. Build preparado consultado por CLI autenticada: catálogo HTTP 200, noindex/canonical/CTA y campos a pedido verificados.
- Hero sticky restaurado: top 93px estable en escritorio durante la extracción. Progreso 0 al entrar, 0.136 a scroll 40, 0.624 a scroll 81 y 0.984 a scroll 121, manteniendo la escena visible. Recorrido breve con permanencia final, sin bloquear wheel/touch/teclado. A 320×568 y 390×844 se mantiene la mejora; fallback natural para pantallas demasiado bajas y movimiento reducido.
- Logo VMS ampliado sólo por abajo con fondo limpio del original: márgenes del texto de 1095px arriba/abajo, tamaño final 5016×4175. Región conservada idéntica, hashes originales iguales. Vegan Records no cambió.
- Ambos paneles de la sección 01 comparten altura: 382.46875px a 1366px y 250px en móvil. Sin desbordes en 320 y 390px. Flecha decorativa construida como una sola silueta, sin líneas ni remates superpuestos; cambia también en Airbag.
- Copys: Tapas ilustrativas; En el carrito después del primer agregado, cantidades desde carrito; CATÁLOGO en header; enlace A pedido con mensaje específico; retirada la frase Varios discos / Una sola consulta.
- Agotados de stock cero: Sin stock · Pedir; precio A cotizar, sin cuotas ni Offer con precio histórico. El filtro de stock conserva su estado inicial marcado; al desmarcarlo se ven también los agotados.
- Carrito separa Con stock en lista y A pedido. Sólo los productos con stock aportan al total, a las cuotas y a la validación de medios. Pedido exclusivo sin precio puede enviarse, sin medio de pago ficticio ni total cero en WhatsApp. Recuperación conserva tipo de línea, notifica cambios de stock y permite pasar entre pedido y stock con validación vigente; retirados/desconocidos siguen bloqueados.
- Navegador local: un Depeche Mode Violator sin stock pudo agregarse a pedido, incrementar a dos y persistir tras recarga; junto con Jessico dio $40.660 total con stock, con los Depeche separados del importe en WhatsApp. Consultas directas agotadas omiten precio histórico. No se enviaron mensajes. Datos locales de prueba quitados; la selección existente del usuario en la demo pública se conservó.
- 31 pruebas aprobadas, tipos sin errores/advertencias/hints, builds V1 y V2 correctos. JS total de módulos: 6302 bytes gzip. Catálogo con 255 registros en HTML. Revisión pública sin errores de consola; header/menú y frase retirada comprobados. Captura: reports/corrections/hero-desktop.jpg.

## 19 de octubre de 2026 — GitHub, Vercel y sincronización

- Repositorio ramiro-gp/VeganMusicStore, rama main, conserva los commits locales anteriores. Logos originales de img incluidos con los mismos hashes. Sin dependencias, .vercel, credenciales, builds ni reportes versionados.
- Proyecto existente Vercel vegan-store-music conectado a main. SITE_VARIANT=v1, SITE_MODE=demo y SITE_URL=https://vegan-store-music.vercel.app establecidos en producción. Primer despliegue nativo Git READY: dpl_GyUkHMvcc59mu3v5HJM7KqqBSguW, commit 4ea730d34733b5df0dcf70f8b9676f1708c9067b. Dominio actual conservado. V2 no se publicó.
- Workflow habilitado con CATALOG_AUTOMATION_ENABLED=true. Horarios UTC 01,12,14,17,20 corresponden a Argentina 22,09,11,14,17. Acciones oficiales fijadas por SHA; ejecución manual disponible.
- 33 pruebas aprobadas. Tipos: 0 errores, advertencias e hints. Builds V1 y V2 correctos. Casos agregados: igualdad ignorando fecha y orden; conservación exacta del archivo y fecha sin cambios; promoción de cambios comerciales después de validar. Se mantiene prueba de rollback ante CSV/build fallido.
- Hoja real sólo leída, sin modificarla: 255 registros y ningún cambio normalizado. Ejecuciones manuales https://github.com/ramiro-gp/VeganMusicStore/actions/runs/39195382336 y https://github.com/ramiro-gp/VeganMusicStore/actions/runs/39195489625 terminadas success. Ambas omiten versionado y despliegue, conservan main en 4ea730d y syncedAt=2026-10-17T20:47:25.980Z. Lista de despliegues sin nuevas publicaciones durante los dos chequeos.
- Inicio, /catalogo/ y /carrito/ públicos: HTTP 200, Vegan Music Store, canonical correcto y noindex, follow. Archivos HTML y log del primer chequeo guardados en reports, excluidos de Git.
- Límite de esta validación: la hoja real no tenía modificaciones, por lo que no se generó un commit de snapshot del bot ni se comprobó su despliegue real. El push normal de main sí disparó Vercel y llegó a READY; el caso de datos modificados se verificó en pruebas locales. No se alteraron precios/stock ni fechas para forzar una publicación.

## 20 de octubre de 2026 — Nombre, redes, densidad y capacidad

- Proyecto trasladado a `C:\Codigo\vegan-store-music`. La carpeta oculta `.git` había quedado en demos; historial y remoto recuperados en la nueva ubicación. Dependencias reinstaladas desde el lockfile para reconstruir sus enlaces.
- V1 sigue siendo la elegida. Vercel se usa para revisión por el dueño con noindex; hosting final Hostinger y dominio pendiente. No se activó producción ni se cambió el destino de despliegue.
- Nombre textual corregido a Vegan Store Music en páginas, SEO, accesibilidad y mensajes de WhatsApp. Sin cambios en `img/`, `src/assets/brand/` ni `public/`: se conservaron los archivos del logo y las imágenes publicadas.
- Secciones 01 y 03 con títulos menores y saltos naturales, márgenes y paneles más compactos. A 1366 px: título 73.764 px, paneles iguales de 259.53 px; sección 01 de 976.17 px y sección 03 de 569.20 px. A 390 px: título 38 px, paneles iguales de 190 px. Mantienen la paleta, tipografías y composición general.
- Instagram de Vegan Store Music y redes de Vegan Records visibles en sus apartados y en el footer. Empretienda se conserva como compra independiente. Sólo Instagram de la tienda figura en el `sameAs` del negocio.
- Enlaces públicos con `noopener` y política de referente limitada al origen. Empretienda y crédito del portfolio tienen UTM con fuente estable `vegan_store_music`, medio `referral`, campaña `website` y ubicación; redes con URLs limpias. No se instaló analítica ni se verificaron informes privados de los destinos.
- GitHub Actions habilitado; ejecuciones programadas recientes success. Última inspeccionada: https://github.com/ramiro-gp/VeganMusicStore/actions/runs/39490263046 (20:14 UTC / 17:14 Argentina). Descarga/comparación correctas, versionado omitido sin cambios. Lectura actual de Sheets: 255 registros, iguales al snapshot. Fecha conservada correctamente: 2026-10-17T20:47:25.980Z. El texto visible ahora aclara que la fecha cambia al actualizar los datos.
- Nueva prueba con 2000 títulos únicos: sin truncar, IDs estables al reordenar y detección de cambios de precio/stock en el último registro. Total 34 pruebas aprobadas. Tipos: 0 errores, advertencias e hints. Builds V1, V2 y copia aislada con 2000 títulos correctos. No se modificó Sheets ni el snapshot real para esa prueba.
- Catálogo con páginas de 50 resultados, búsqueda/filtros sobre todos los registros y enlaces directos que revelan la página correspondiente. Sin JavaScript siguen presentes los 2000 registros y enlaces de consulta. HTML de catálogo de prueba: 4,282,069 bytes, 158,754 bytes gzip; se transfiere completo, la paginación limita lo visible y no descarga páginas desde una API.
- Navegador local en 320, 390, 768 y 1366 px: sin desbordes, paginación, búsqueda, origen, estado vacío, agregado desde segunda página, persistencia y generación de WhatsApp correctos. Copia de 2000: búsqueda del último registro, enlace directo y carrito correctos. Sin errores JavaScript. V2 comprobada como regresión; sólo V1 se publica para revisión. No se enviaron mensajes de WhatsApp.
- Evidencia local ignorada por Git en `reports/customer-update/`: capturas y `qa.json`. La prueba no sustituye una medición de rendimiento en un teléfono físico ni comprueba entrega automática de un cambio real futuro de Sheets.

## 20 de octubre de 2026 — Encabezados del carrito y catálogo

- `TU SELECCIÓN.` sin salto forzado y con tipografía adaptable para conservar un solo renglón entre 320 y 1920 px. No se modificó la lógica del carrito.
- Ilustración vectorial original de un vinilo y su funda a la derecha de `BUSCÁ. ENCONTRÁ.` en V1. Usa la paleta existente, es decorativa y no requiere JavaScript ni imágenes externas. En celular se presenta pequeña junto al título. La composición compacta de V2 conserva su encabezado.
- Tipos sin errores, advertencias ni hints; builds V1/V2 y enlaces internos correctos. Navegador en 320, 390, 768, 1024, 1366 y 1920 px: título del carrito en una línea, sin desbordes ni superposiciones con la ilustración. Búsqueda y lista paginada comprobadas, sin errores JavaScript. Capturas y mediciones en `reports/heading-update/` (ignorado por Git).
- Sin cambios en los logos, archivos de marca, snapshot, dependencias o configuración del hosting. Vercel continúa como entorno de revisión.

## 22 de octubre de 2026 — Preventa “ANTES DE QUE SUENE.”

- Sincronización real validada: 259 productos, cuatro marcados PREVENTA; Modelo 96 y Sexcalextric en CD ($25.000) y LP blanco/violeta ($65.000). Los datos comerciales provienen de Sheets; cada imagen se resolvió desde `og:image` de su página de Empretienda. La hoja no se modificó.
- Confirmados y corregidos al importar los dos enlaces de vinilo cruzados. La corrección sólo aplica a las identidades y URLs erróneas verificadas; una URL corregida o nueva en Sheets prevalece. No hay imágenes de productos asociadas manualmente en el código.
- 46 pruebas aprobadas. Tipos sin errores, advertencias ni hints; builds de V1 y V2 correctos. Casos de importación posicional, encabezados vacíos, prioridad de IMAGEN_URL, metadatos, validación de enlaces, caché por ID/destino, rollback, migración de schema 3 a 4 y carritos externos guardados comprobados.
- Navegador Chromium local en 320, 390, 768, 1024, 1366 y 1920 px: cuatro imágenes cargadas, cuatro destinos correctos con UTM, sin desbordes ni errores JavaScript. Cuatro columnas en escritorio, dos en tablet y desplazamiento horizontal nativo en móvil, incluido teclado. Enlaces disponibles sin JavaScript y transición desactivada con movimiento reducido.
- Compra externa comprobada abriendo un producto público en otra pestaña: no modifica el carrito. Los productos externos previamente guardados no totalizan ni pasan a pedido; bloquean WhatsApp hasta quitarlos y ofrecen su enlace de compra. Tras retirarlos, la consulta de los otros discos vuelve a habilitarse. No se realizaron compras ni se enviaron mensajes.
- Build aislado con todas las marcas PREVENTA desactivadas: restaura el slider original de ocho discos, sin tarjetas de campaña. V2 conserva su portada y catálogo de 259 registros con cuatro enlaces de compra externos.
- Segunda sincronización real: sin cambios, snapshot idéntico byte por byte y fecha conservada en `2026-10-22T19:19:00.406Z`. No genera candidato, build ni publicación adicionales.
- Capturas, mediciones y resultados en `reports/presale/` (ignorado por Git). Cambios y snapshot preparados localmente; no se publicaron ni se modificaron hosting, dominio, SEO de producción o dependencias.

### Correcciones de presentación y navegación

- Título simplificado a “PREVENTA”. La campaña también sustituye el slider “UNO MÁS Y YA ESTÁ…” del carrito, con atribución `presale_cart` y sin agregar las ediciones a la consulta. Al quitar las marcas se restauran ambos sliders de ocho discos.
- Header con Vegan Records antes de Nosotros y sin el enlace Catálogo duplicado; se conserva el botón CATÁLOGO. Descripción de búsquedas/importaciones ampliada de 14 px a un rango adaptable de 16–18 px.
- “SEGUÍ BAJANDO” ahora apunta a `#preventa` cuando hay campaña y al título del slider original cuando no la hay. Click real y desplazamiento comprobados, también con JavaScript desactivado.
- Tipos sin errores, advertencias ni hints; builds V1, V2 y catálogo sin preventa correctos. Navegador local en 320, 390, 768, 1024, 1366 y 1920 px: orden del menú, botón de catálogo, destino del Hero, tamaño del texto y cuatro compras externas en el carrito comprobados, sin desbordes ni errores JavaScript. Evidencia en `reports/presale-corrections/` (ignorado por Git).
