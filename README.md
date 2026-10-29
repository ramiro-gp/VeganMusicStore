# Vegan Store Music

Web de Vegan Store Music, con Astro estático y catálogo/carrito de consulta. La versión elegida es V1 con hero fullscreen, integrada en `main` el 28/10/2026. Google Sheets es la fuente de precios y stock; el navegador nunca consulta la hoja. Desarrollo local en `C:\Codigo\vegan-store-music`.

El sitio comercial se publica como Astro estático en Hostinger para `https://veganrecords.com.ar`, con `SITE_MODE=production`. Vercel se conserva para revisión de cambios, con `SITE_MODE=demo` y noindex. El registro del dominio se mantiene en NIC Argentina.

V1: [vegan-store-music.vercel.app](https://vegan-store-music.vercel.app/). V2 se publica en el proyecto independiente `vegan-store-music-v2`. Validaciones y métricas reales en [docs/verification.md](docs/verification.md).

## Desarrollo

Node 24.12+ y pnpm 11.7. `pnpm install`, `pnpm dev`.

`pnpm test` prueba importación, carrito, almacenamiento y mensajes. `pnpm check` comprueba tipos. `pnpm build` genera `dist` usando el snapshot versionado, sin acceso a Google. `pnpm preview` sirve ese build.

### Variantes y rutas

`SITE_VARIANT=v1|v2` selecciona la propuesta al iniciar o construir. Si se omite, se utiliza V1; cualquier otro valor produce un error. No es un selector para visitantes: cada despliegue tiene una variante y un dominio propios.

| Ruta | V1 | V2 |
|---|---|---|
| `/` | Landing con hero de scroll y accesos a tienda y sello | Hero compacto y catálogo completo |
| `/catalogo/` | Catálogo completo | Redirección a `/#catalogo` |
| `/nosotros/` | Contenido en `/#tienda` | Página institucional |
| `/contacto/` | Contenido en `/#contacto` | Contacto y mapa |
| `/vegan-records/` | Bloque en `/#vegan-records` | Presentación del sello |
| `/carrito/` | Carrito de consulta | Carrito de consulta |

En V1 las tres páginas institucionales de V2 no se generan; la navegación utiliza las anclas indicadas. `src/config/variant.ts` centraliza los destinos internos y la URL de Empretienda.

Ejemplo en PowerShell para construir y revisar cada variante con salidas separadas:

```powershell
$env:SITE_MODE = 'demo'
$env:SITE_VARIANT = 'v1'
$env:SITE_URL = 'http://localhost:4321'
pnpm check
pnpm build --outDir dist-v1
pnpm preview --outDir dist-v1 --port 4321
```

En otra terminal, para V2:

```powershell
$env:SITE_MODE = 'demo'
$env:SITE_VARIANT = 'v2'
$env:SITE_URL = 'http://localhost:4322'
pnpm check
pnpm build --outDir dist-v2
pnpm preview --outDir dist-v2 --port 4322
```

Para desarrollo, configurar las mismas variables y ejecutar `pnpm dev`; para despliegue, utilizar `pnpm build` sin `--outDir`, conservando `dist` como directorio de salida.

## Catálogo

`pnpm catalog:sync` descarga y valida el CSV antes de reemplazar atómicamente el snapshot. `pnpm catalog:sync --verify` también ejecuta pruebas, tipos y build contra el candidato, y sólo después lo promueve. Ante errores se conserva el archivo previo. El primer snapshot inspeccionado contiene 255 productos únicos.

La URL del CSV está en `src/config/site.ts`, con override opcional `CATALOG_CSV_URL`. Para entrega comercial: Archivo → Compartir → Publicar en la Web, elegir sólo la pestaña comercial, formato CSV y republicación automática; reemplazar la URL por la que genere Google. Sólo publicar datos comerciales públicos.

Los IDs dependen de título, origen y sello, nunca de precio, stock o orden. Cambiar esos datos de identidad exige revisar el enriquecimiento editorial. `10+` indica stock positivo, no una cantidad exacta. Los duplicados exactos se colapsan, sin sumar stock. Los datos contradictorios y precios inválidos bloquean la sincronización.

El snapshot utiliza `schemaVersion: 4`; los lectores aceptan y migran en memoria la versión 3 durante la transición. Importa `PRECIO EFT/TRAN` para efectivo/transferencia, `TARJETA 1 PAGO` para tarjeta en un pago y `Valor cuota` para cada una de las tres cuotas. El total en tres cuotas es **3 × Valor cuota**; no se utiliza `TARJETA 3 PAGOS` para ese cálculo. Puede existir una diferencia por redondeo respecto de esa columna. Los importes cero o vacíos se tratan como precio no informado; los valores inválidos bloquean la importación.

La búsqueda se combina con “Con stock informado”, marcado inicialmente, y con el filtro de origen, inicialmente en Todas. `Argentina`, normalizada sin distinguir mayúsculas, es Nacional; otro origen informado es Internacional. Un origen vacío se identifica como “Origen sin informar” y aparece únicamente en Todas. El filtro describe el origen de la edición, no la nacionalidad del artista.

Todo el catálogo está presente en el HTML inicial; el JavaScript mejora la búsqueda, los filtros y el carrito, y presenta hasta 50 resultados por página. Buscar o cambiar un filtro vuelve a la primera página; la búsqueda abarca todos los títulos. Sin JavaScript se muestra la lista completa y siguen disponibles las consultas directas. El importador no tiene un límite de 255 ni 1500 filas; se prueba con 2000 productos, incluyendo cambios al final de la lista. `src/data/catalog.editorial.ts` conserva el enriquecimiento manual de artista/álbum.

### Preventa y compras en Empretienda

La columna **I** activa una edición cuando contiene `PREVENTA` (sin distinguir mayúsculas). La columna **P** contiene su URL HTTPS de producto en Empretienda. Las columnas se leen por posición: los encabezados vacíos intermedios no desplazan ni sobrescriben datos. No mover I ni P sin actualizar el importador.

Una columna opcional con encabezado **`IMAGEN_URL`**, por ejemplo Q, permite elegir una imagen HTTPS directamente desde Sheets y tiene prioridad. Si falta esa URL, la sincronización lee `og:image` de la página de Empretienda y guarda la URL en el snapshot. No se consultan páginas de productos durante visitas ni builds normales. Si Empretienda falla, se conserva la imagen anterior sólo para el mismo ID y destino; sin imagen previa válida se rechaza el candidato. No se publica una preventa sin enlace ni imagen.

En el inicio de V1, los productos marcados sustituyen temporalmente “DALE UNA VUELTA” por “PREVENTA”. La misma campaña reemplaza “UNO MÁS Y YA ESTÁ…” en el carrito. Para terminarla, quitar `PREVENTA` de **todas** las filas correspondientes: la próxima sincronización y publicación restaura ambos sliders originales. “SEGUÍ BAJANDO” apunta a la preventa mientras está activa y al slider habitual cuando termina. Los enlaces de compra pueden conservarse después del cierre, y continúan abriendo Empretienda. No hay fecha automática de finalización.

Todos los productos con enlace de Empretienda muestran “COMPRAR AHORA”, también en el catálogo, sin depender de JavaScript. No se agregan al carrito de consulta. Si ya estaban guardados, no totalizan y bloquean el envío por WhatsApp hasta quitarlos; se muestra el enlace de compra externo.

**Corrección temporal del 22/10/2026:** las filas de Sexcalextric LP violeta y Modelo 96 LP blanco traían sus URLs cruzadas. `scripts/catalog-presale.ts` corrige sólo las dos identidades y valores erróneos verificados, sin modificar Sheets. Cuando la hoja tenga el enlace correcto u otro nuevo, ese dato prevalece. Las imágenes y los precios de los cuatro productos no están asociados manualmente en el código.

### Vegan Records

El catálogo de Vegan Store Music y la [Empretienda de Vegan Records](https://veganrecords.empretienda.com.ar/) son destinos independientes. La tienda del sello se abre en otra pestaña y gestiona sus propios productos y compras. No se copian productos ni se sincroniza inventario desde Empretienda. Los títulos del sello que ya figuren en Sheets permanecen en el catálogo general.

## Carrito de consulta

`/carrito/` reúne los discos elegidos y genera una sola consulta por WhatsApp. Cada producto mantiene también “Consultar ya” para preguntar por ese título sin modificar el carrito.

- Efectivo/transferencia es el medio inicial. Los radios permiten elegir tarjeta en un pago o tres cuotas y recalculan precios unitarios, subtotales y total en centavos.
- El resumen y el mensaje comparten el mismo cálculo. En tres cuotas se muestra y envía el importe de cada cuota y su total. Un medio se deshabilita si falta su precio en algún producto.
- Los discos con stock positivo y precio informado aportan al total. La cantidad máxima es el entero de stock; para `10+` el carrito permite hasta diez unidades. Los agotados pueden sumarse como consultas a pedido, separados del total y con costo a confirmar.
- El navegador guarda IDs, cantidades, tipo de línea, medio y fecha del catálogo en `localStorage`. Al recuperar la selección se resuelven precios actuales, se ajustan cantidades que superen el stock y se informa el cambio. Un producto agotado pasa a pedido; uno retirado, de stock desconocido o sin precio válido para una compra con stock bloquea el envío hasta quitarlo.
- Los carritos de V1 y V2 son independientes por origen/dominio. Si el navegador impide guardar, se muestra un aviso; la selección puede perderse al navegar y las consultas directas siguen disponibles.
- “Enviar consulta por WhatsApp” y “Copiar consulta” incluyen títulos, cantidades, medio elegido y total. Abrir WhatsApp no vacía el carrito ni descuenta inventario. El envío o retiro se coordina con el negocio.

El carrito no reserva productos ni cobra. El dueño confirma disponibilidad y precio, envía alias/CVU o link de pago, concreta la venta y actualiza el stock en Google Sheets.

## WhatsApp y marca

El número activo se configura en `siteConfig.contact.whatsappNumber`, dentro de `src/config/site.ts`, con código internacional y sólo dígitos. Actualizarlo ahí si cambia; los CTA generan mensajes según el contexto.

La ubicación incorpora un mapa de Google Maps con carga diferida al llegar a esa sección.

El nombre textual es **Vegan Store Music**. Los archivos del logo se conservan tal como los entregó el dueño. Las redes se centralizan en `siteConfig.social`, con tienda y sello separados; sólo el Instagram de la tienda se incluye en el `sameAs` del negocio.

Los enlaces externos públicos conservan `noopener` y permiten enviar únicamente el origen mediante `strict-origin-when-cross-origin`, también declarado en un meta para el futuro hosting estático. Empretienda y el crédito del portfolio llevan `utm_source=vegan_store_music`, `utm_medium=referral`, `utm_campaign=website` y una ubicación en `utm_content`. La fuente estable funciona mientras se decide el dominio; no se usa ramita.dev como fuente del tráfico de la tienda. Las URLs de redes permanecen limpias. Los parámetros sólo permiten atribuir visitas si el destino los conserva y dispone de analítica; no crean estadísticas propias ni garantizan medición en Instagram/Facebook.

Las estrellas y figuras de las fundas se dibujan como SVG originales para que Safari/iOS, Android y desktop compartan la misma forma y color. Evitar reemplazarlas por glifos tipográficos en `src/components` o en la portada Open Graph.

La identidad y el copy son provisionales. No se afirman horarios, antigüedad ni condiciones comerciales desconocidas.

## Entornos y SEO

Por defecto `SITE_MODE=demo`: `noindex, follow`, sin sitemap. `SITE_URL` define canonical, Open Graph y Schema; configurar la URL propia de cada variante. En Vercel se utiliza el dominio estable del proyecto cuando no se define. En producción configurar `SITE_MODE=production` y `SITE_URL=https://DOMINIO-REAL`. El build rechaza producción sin una URL HTTPS real. La página 404 y el carrito siempre llevan noindex; ambos se excluyen del sitemap, al igual que la redirección `/catalogo/` de V2.

La demo con noindex no puede obtener 100 en la auditoría de indexación de Lighthouse. Auditar la configuración de producción localmente y publicar la demo nuevamente con el perfil de demo.

## Hero

El hero fullscreen de V1 es la versión aprobada y forma parte de `main`. Reemplaza el logo del hero por el H1 “CDs y discos de vinilo venta e importación”, una descripción en párrafo y dos CTA: catálogo e importación por WhatsApp. El título y la meta descripción de la portada acompañan ese contenido. La composición ocupa `100svh` incluyendo el header, con altura mínima que permite crecer si el contenido lo necesita. V2 conserva su hero compacto.

V1 conserva scroll real, CSS sticky y un script pequeño. La escena permanece fija durante la extracción completa del vinilo y se libera después de una breve permanencia final. No se interceptan wheel ni touch. El movimiento afecta transformaciones y opacidad. Reduced motion y pantallas muy bajas utilizan una escena estática; sin JavaScript el contenido y ambos botones siguen disponibles.

V2 utiliza una composición propia de aproximadamente `40svh`, sin sticky ni recorrido adicional, para mostrar el comienzo del catálogo en la primera pantalla. La extracción breve al cargar se realiza con CSS; con movimiento reducido la escena permanece estática. En pantallas muy bajas se prioriza la legibilidad. Todo el contenido existe sin JavaScript.

## Despliegue

- **Demos Vercel:** framework Astro, comando `pnpm build`, salida `dist`, sin adaptador. Proyecto existente `vegan-store-music` con `SITE_VARIANT=v1`; segundo proyecto `vegan-store-music-v2` con `SITE_VARIANT=v2`. Mantener `SITE_MODE=demo` y `SITE_URL` propio en cada proyecto. Ambas propuestas se presentan mediante enlaces independientes.
- **Cloudflare Pages:** repositorio GitHub, comando `pnpm build`, salida `dist`. No añadir adaptador ni Functions.
- **Hostinger:** sitio estático en `veganrecords.com.ar`, con destino en `.hostinger/site.json`. Construir con `SITE_VARIANT=v1`, `SITE_MODE=production` y `SITE_URL=https://veganrecords.com.ar`. El contenido de `dist/` va directamente a `public_html`, sin requerir Node en el servidor. `public/.htaccess` configura el 404 propio, desactiva el listado de directorios y redirige `www` al dominio principal.
- **Publicación automática de Hostinger:** habilitar la variable de repositorio `DEPLOY_TARGET=hostinger` y conectar en hPanel la rama `deploy-static` del repositorio. `hostinger-deploy.yml` genera esa rama con sólo el build de producción, luego de pruebas, tipos y build. Se ejecuta por pushes a `main`, manualmente o desde la sincronización del catálogo. Conserva un historial lineal en `deploy-static`, no crea commits si el build no cambia y evita publicar un build si `main` avanzó durante su preparación. El primer despliegue también puede hacerse subiendo el build estático por la API de Hostinger.

El repositorio es `ramiro-gp/VeganMusicStore`, rama `main`, conectado al proyecto existente `vegan-store-music`. GitHub Actions comprueba el CSV a las **09:00, 11:00, 14:00, 17:00 y 22:00 de Argentina**: `0 1,12,14,17,20 * * *` en UTC. La ejecución de las 01:00 UTC corresponde a las 22:00 del día anterior en Argentina. Se habilita con la variable de repositorio `CATALOG_AUTOMATION_ENABLED=true`. También puede ejecutarse desde Actions → Sincronizar catálogo → Run workflow. El botón de Sheets queda para una etapa posterior.

Se compara el catálogo normalizado sin considerar fecha ni orden de filas. Sin cambios se conserva el archivo y su fecha; la sincronización no genera commit, build ni despliegue. Con cambios se valida el candidato con pruebas, tipos y build, y sólo entonces se reemplaza y versiona el snapshot. Con `DEPLOY_TARGET=hostinger`, el workflow invoca explícitamente la publicación de producción para `deploy-static`; no depende de que el commit del bot dispare un segundo evento `push` de Actions. Los cambios de código en `main` también publican. Vercel conserva su configuración de demo. La fecha visible indica la última actualización de datos, no el último chequeo. La programación puede demorarse y la publicación requiere completar el build; no es inventario en tiempo real. Las visitas al sitio no generan consultas a Sheets.

Los fallos se reflejan en el workflow de GitHub y no reemplazan el sitio vigente. No guardar credenciales en este repositorio. GitHub puede deshabilitar horarios en repositorios públicos tras 60 días sin actividad; revisar Actions si ocurre.

## Alcance

Incluye catálogo, filtros y carrito de consulta por WhatsApp. No incluye cuentas, administración, base de datos, cobro online, reservas, fichas individuales ni stock en tiempo real.

## Demos publicadas

- V1: https://vegan-store-music.vercel.app/
- V2: https://vegan-store-music-v2.vercel.app/

La configuración de cada proyecto contiene SITE_VARIANT, SITE_MODE=demo y su propio SITE_URL. El enlace local .vercel/project.json sigue apuntando a V1. Para desplegar V2 desde el mismo código se usaron VERCEL_PROJECT_ID=prj_hPRKV4G07q7y95mAxYvefnEzHSwz y VERCEL_ORG_ID=team_R1YVYDstAQFiKxZ8jPg5mo8A en el entorno del comando, sin cambiar el enlace local. Los IDs de proyecto/equipo no son credenciales. SITE_VARIANT se configura como variable del proceso de build, consistente entre Astro y las páginas.

## Identidad y sliders — 18 de octubre de 2026

V1 elegida por el cliente. Logos originales en `img/`, copias recortadas verificadas en `src/assets/brand/`. Ver `docs/brand-assets.md`. La interfaz usa el lila de VMS y el nombre Vegan Store Music. El slider del inicio y el del carrito comparten `RecordSlider.astro` y la lógica central de agregado al carrito. El segundo no enlaza al catálogo.
