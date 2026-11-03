# Administración del catálogo desde Google Sheets

Fuente: [Google Sheets del catálogo](https://docs.google.com/spreadsheets/d/1RUfWYnwu8UeFVyGasognSvI9-lZnM4rZjOxpHlRghcw/edit?usp=sharing), archivo `1RUfWYnwu8UeFVyGasognSvI9-lZnM4rZjOxpHlRghcw`.
La exportación CSV selecciona explícitamente la pestaña comercial con `gid=1738630085`. Antes de cambiar de pestaña, revisar la fuente de sincronización. El dueño confirmó que el script y botón de sincronización ya funcionan con producción.
Sitio comercial: https://veganrecords.com.ar.

## Guía para el dueño

1. Editá precios y stock en la pestaña del catálogo.
2. Para destacar un disco, pegá una URL HTTPS directa a su imagen en **O**. Borrarla quita el destacado. “Dale una vuelta” muestra los discos elegidos que no están en preventa, en orden alfabético. Si todos los discos con imagen están en preventa, se usa la selección fija anterior sin repetir preventas. El carrito muestra esos destacados cuando no hay campaña de preventa.
3. Para activar una preventa, escribí **PREVENTA** en **I** y completá **O** (imagen) y **P** (producto de Empretienda). En el inicio de V1, la preventa aparece antes del hero y “Dale una vuelta” sigue debajo de él. En el carrito, la preventa sí reemplaza el slider. Al quitar la marca de todas las preventas desaparece la apertura de preventa y vuelven los destacados de O al carrito; si no hay imágenes, vuelve la selección fija anterior.
4. Abrí **Vegan Store Music → Sincronizar web** y pulsá **Sincronizar web**. Si se agregó un dibujo como botón, abre el mismo panel.
5. “Solicitud enviada” confirma el pedido. El enlace permite revisar su ejecución en GitHub; sólo al finalizar la publicación estará actualizada la web. Puede tardar unos minutos. No hace falta repetir el clic: hay un intervalo mínimo de 60 segundos.

Los respaldos automáticos se solicitan a las **09:00 y 19:00 de Argentina**, todos los días. GitHub puede demorarlos. La fecha del catálogo cambia cuando cambian los datos; no cambia por una revisión sin novedades. Los visitantes no consultan Sheets.

Usá URLs de imágenes accesibles sin iniciar sesión, no enlaces a una página de Drive. No muevas I, O ni P. El formato `$63.130` equivale a 63.130 pesos. La hoja contiene información comercial pública.

## Instalar el botón — administrador

El archivo `scripts/google-sheets-sync.gs` es un **Apps Script vinculado a la hoja**, no un servidor ni una aplicación web pública.

1. En la hoja correcta, abrí **Extensiones → Apps Script**. Si ya hay código, conservá las funciones existentes e integrá el menú con su `onOpen`; no reemplaces otros scripts.
2. Copiá el código de `scripts/google-sheets-sync.gs` a un archivo de script y guardalo. Usa `@OnlyCurrentDoc` para limitar el acceso de Sheets al documento actual.
3. En GitHub, creá una credencial fine-grained limitada a **ramiro-gp/VeganMusicStore**, con **Actions: Read and write** y fecha de vencimiento. No otorgues permisos generales de cuenta o de escritura de contenido. El administrador debe completar la creación y conservar la fecha para renovarla.
4. En **Configuración del proyecto → Propiedades del script**, agregá **VMS_GITHUB_TOKEN** con esa credencial. Nunca la pegues en celdas, código versionado o chats. Los editores del script pueden acceder a estas propiedades: mantené la edición del documento/script sólo entre personas de confianza y revisá sus permisos de uso compartido.
5. Volvé a abrir la hoja y ejecutá **Vegan Store Music → Sincronizar web**. Completá la autorización inicial con la cuenta administradora. El panel muestra el botón y el resultado de solicitar la ejecución.
6. Opcional: insertá un dibujo que diga **Sincronizar web** y asignale la función **mostrarSincronizacion**. Los botones de dibujo funcionan desde navegador de computadora, no desde la aplicación móvil de Sheets.
7. Probá una solicitud; comprobá la ejecución de `catalog-sync.yml` en `main` y, si cambió el catálogo, la publicación en Hostinger. Repetir inmediatamente debe mostrar la espera de 60 segundos.

No reutilizar la credencial general de Git almacenada en la computadora para instalar este botón. Si GitHub rechaza la conexión, revisar acceso, permisos y vencimiento sin mostrar el token.

## Configuración de GitHub y publicación

- `CATALOG_CSV_URL`: `https://docs.google.com/spreadsheets/d/1RUfWYnwu8UeFVyGasognSvI9-lZnM4rZjOxpHlRghcw/export?format=csv&gid=1738630085`.
- `CATALOG_AUTOMATION_ENABLED=true` y `DEPLOY_TARGET=hostinger`.
- El cron de `catalog-sync.yml` es `0 12,22 * * *` en UTC.
- Comparar datos normalizados; sin cambios no generar commit, build ni despliegue. Con cambios validar pruebas, tipos y build antes de promover el snapshot.
- Las consultas o ventas no descuentan inventario: el dueño mantiene el stock en Sheets.

## Excepción temporal acordada el 1 de noviembre de 2026

`CATALOG_QUARANTINE_INCOMPLETE=true` permite avanzar mientras el dueño corrige las filas pendientes. Omite **todo el grupo de identidad contradictorio** y **cada preventa sin O/P**, informa las omisiones en los logs y en el resumen de Actions y publica los demás productos válidos. No elige una fila ganadora, no suma stock y no elimina filas de Sheets. Si no queda ningún producto válido, falla y conserva el catálogo anterior. Otros errores de formato siguen bloqueando la sincronización.

Sin esa variable, la validación es estricta y esas situaciones bloquean la actualización. Localmente puede solicitarse la excepción con `pnpm catalog:sync --verify --quarantine-incomplete`.

Actualización posterior del 1 de noviembre: el dueño corrigió los enlaces e imágenes de los vinilos de Demonios de Tasmania, completó las cuatro preventas de Sin Ley y resolvió los duplicados de Nepal Ideologia y Nueva Etica. Esos productos ya pueden importarse. El importador respeta los enlaces corregidos sin aplicarles la corrección temporal de valores cruzados.

Queda pendiente **Nepal Raza De Traidores**, filas 434/435: $50.000 con stock 1 frente a $48.150 con stock 2. Se omiten ambas filas hasta confirmar sus datos.

Las filas corregidas vuelven automáticamente en la siguiente sincronización. Cuando no haya omisiones, desactivar la excepción con `CATALOG_QUARANTINE_INCOMPLETE=false`.

## Costos y límites

El repositorio es público y usa un runner estándar de GitHub: la ejecución de Actions es gratuita en ese caso. Apps Script tiene cuotas de uso; unos pocos clics diarios no requieren un servicio nuevo. Hosting y dominio mantienen sus costos actuales. El botón no cobra ni publica directamente: solicita el mismo proceso validado de actualización.

Referencias: [Apps Script: menús y botones](https://developers.google.com/apps-script/guides/menus), [cuotas de Apps Script](https://developers.google.com/apps-script/guides/services/quotas), [GitHub: ejecutar workflows por API](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event), [costos de Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions).
