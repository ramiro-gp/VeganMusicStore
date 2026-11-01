# Administración del catálogo desde Google Sheets

Fuente: archivo `1ev9w0mKaMnLavvfRfqYRYZ-jFpj0_o5T`, pestaña `507485430`.
Sitio comercial: https://veganrecords.com.ar.

## Guía para el dueño

1. Editá precios y stock en la pestaña del catálogo.
2. Para destacar un disco, pegá una URL HTTPS directa a su imagen en **O**. Borrarla quita el destacado. Los discos elegidos aparecen en ambos sliders, en orden alfabético.
3. Para activar una preventa, escribí **PREVENTA** en **I** y completá **O** (imagen) y **P** (producto de Empretienda). Las preventas reemplazan ambos sliders. Al quitar la marca de todas las preventas vuelven los destacados de O; si no hay imágenes, vuelve la selección fija anterior.
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

- `CATALOG_CSV_URL`: `https://docs.google.com/spreadsheets/d/1ev9w0mKaMnLavvfRfqYRYZ-jFpj0_o5T/export?format=csv&gid=507485430`.
- `CATALOG_AUTOMATION_ENABLED=true` y `DEPLOY_TARGET=hostinger`.
- El cron de `catalog-sync.yml` es `0 12,22 * * *` en UTC.
- Comparar datos normalizados; sin cambios no generar commit, build ni despliegue. Con cambios validar pruebas, tipos y build antes de promover el snapshot.
- Las consultas o ventas no descuentan inventario: el dueño mantiene el stock en Sheets.

## Excepción temporal acordada el 1 de noviembre de 2026

`CATALOG_QUARANTINE_INCOMPLETE=true` permite avanzar mientras el dueño corrige las filas pendientes. Omite **todo el grupo de identidad contradictorio** y **cada preventa sin O/P**, informa las omisiones en los logs y en el resumen de Actions y publica los demás productos válidos. No elige una fila ganadora, no suma stock y no elimina filas de Sheets. Si no queda ningún producto válido, falla y conserva el catálogo anterior. Otros errores de formato siguen bloqueando la sincronización.

Sin esa variable, la validación es estricta y esas situaciones bloquean la actualización. Localmente puede solicitarse la excepción con `pnpm catalog:sync --verify --quarantine-incomplete`.

Consultas pendientes para el dueño:

- **Nepal Ideologia**: decidir cuál fila corresponde o identificar las ediciones distintas.
- **Nepal Raza De Traidores**: $50.000 con stock 1 frente a $48.150 con stock 2.
- **Nueva Etica Inquenbrantable**: $50.000 con stock 10+ frente a $55.000 con stock 1; confirmar si son ediciones distintas.
- **Sin Ley 1000 del 3000, Mafísima y sus versiones CD**: completar O y P.
- **Demonios de Tasmania, vinilos Sexcalextric y Modelo 96**: corregir los enlaces cruzados en P. El importador mantiene la corrección puntual de los dos valores erróneos conocidos y respeta correcciones futuras de la hoja.

Las filas corregidas vuelven automáticamente en la siguiente sincronización. Cuando no haya omisiones, desactivar la excepción con `CATALOG_QUARANTINE_INCOMPLETE=false`.

## Costos y límites

El repositorio es público y usa un runner estándar de GitHub: la ejecución de Actions es gratuita en ese caso. Apps Script tiene cuotas de uso; unos pocos clics diarios no requieren un servicio nuevo. Hosting y dominio mantienen sus costos actuales. El botón no cobra ni publica directamente: solicita el mismo proceso validado de actualización.

Referencias: [Apps Script: menús y botones](https://developers.google.com/apps-script/guides/menus), [cuotas de Apps Script](https://developers.google.com/apps-script/guides/services/quotas), [GitHub: ejecutar workflows por API](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event), [costos de Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions).
