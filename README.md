# Vegan Store Music

Demo comercial editorial, mobile-first, con Astro estático. La hoja es la fuente de precios y stock; el navegador nunca consulta Google Sheets.

Demo temporal: [vegan-store-music.vercel.app](https://vegan-store-music.vercel.app/). Validaciones y métricas reales en [docs/verification.md](docs/verification.md).

## Desarrollo

Node 24.12+ y pnpm 11.7. `pnpm install`, `pnpm dev`.

`pnpm test` prueba importación, errores y mensajes. `pnpm check` comprueba tipos. `pnpm build` genera `dist` usando el snapshot versionado, sin acceso a Google. `pnpm preview` sirve ese build.

## Catálogo

`pnpm catalog:sync` descarga y valida el CSV antes de reemplazar atómicamente el snapshot. `pnpm catalog:sync --verify` también ejecuta pruebas, tipos y build contra el candidato, y sólo después lo promueve. Ante errores se conserva el archivo previo. El primer snapshot inspeccionado contiene 255 productos únicos.

La URL del CSV está en `src/config/site.ts`, con override opcional `CATALOG_CSV_URL`. Para entrega comercial: Archivo → Compartir → Publicar en la Web, elegir sólo la pestaña comercial, formato CSV y republicación automática; reemplazar la URL por la que genere Google. Sólo publicar datos comerciales públicos.

Los IDs dependen de título, origen y sello, nunca de precio, stock o orden. Cambiar esos datos de identidad exige revisar el enriquecimiento editorial. `10+` indica stock positivo, no una cantidad exacta. Los duplicados exactos se colapsan, sin sumar stock. Los datos contradictorios y precios inválidos bloquean la sincronización.

`src/data/catalog.editorial.ts` contiene la selección y la separación manual de artista/álbum. Las fundas de catálogo actuales son ilustraciones tipográficas identificadas como tales, no portadas oficiales. Reemplazarlas por imágenes verificadas cuando las entregue el negocio; importarlas desde `src/assets/covers` con `astro:assets` y conservar dimensiones explícitas.

## WhatsApp y marca

Configurar el número exclusivamente en `siteConfig.contact.whatsappNumber`, dentro de `src/config/site.ts`, con código internacional y sólo dígitos. Mientras sea `null`, los CTA llevan a la ubicación y al aviso de contacto pendiente. No hay números falsos en componentes.

La identidad y el copy son provisionales. No se afirman horarios, antigüedad ni condiciones comerciales desconocidas.

## Entornos y SEO

Por defecto `SITE_MODE=demo`: `noindex, follow`, sin sitemap. `SITE_URL` define canonical, Open Graph y Schema; en Vercel se utiliza el dominio estable del proyecto cuando no se define. En producción configurar `SITE_MODE=production` y `SITE_URL=https://DOMINIO-REAL`. El build rechaza producción sin una URL HTTPS real. La página 404 siempre lleva noindex.

La demo con noindex no puede obtener 100 en la auditoría de indexación de Lighthouse. Auditar la configuración de producción localmente y publicar la demo nuevamente con el perfil de demo.

## Hero

Scroll real, CSS sticky y un script pequeño. No se interceptan wheel ni touch. El movimiento afecta transformaciones y opacidad. Reduced motion y pantallas muy bajas utilizan una escena estática. Todo el contenido existe sin JS.

## Despliegue

- **Demo Vercel:** framework Astro, comando `pnpm build`, salida `dist`, sin adaptador. Mantener el modo demo. Por decisión del propietario, esta presentación es temporal y se retirará manualmente en menos de 48 horas.
- **Cloudflare Pages:** repositorio GitHub, comando `pnpm build`, salida `dist`. No añadir adaptador ni Functions.
- **Hostinger:** conectar en hPanel la rama `deploy-static` a `public_html`; contiene únicamente el resultado del build y no necesita Node en el servidor. El workflow preparado publica esa rama al activar `DEPLOY_TARGET=hostinger`.

Después de confirmar la venta, crear el repositorio GitHub y activar la variable de repositorio `CATALOG_AUTOMATION_ENABLED=true`. El workflow preparado ejecuta diariamente a las 12:17 UTC (09:17 Buenos Aires) y permite ejecución manual. Configurar `SITE_MODE`, `SITE_URL` y opcionalmente `CATALOG_CSV_URL`. Para Vercel/Cloudflare vincular el repositorio al proveedor y verificar el primer despliegue del bot. La programación de Actions puede demorarse; no es inventario en tiempo real.

Los fallos se reflejan en el workflow de GitHub y no reemplazan el sitio vigente. No guardar credenciales en este repositorio. La automatización permanece desactivada hasta la confirmación comercial.

## Alcance

No incluye cuentas, administración, base de datos, carrito, pagos, fichas individuales ni stock en tiempo real.
