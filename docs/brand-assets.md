# Identidad de Vegan Music Store

Los originales permanecen intactos en `img/`. No se movieron ni se sobrescribieron.

- `src/assets/brand/vegan-music-store.png`: copia PNG sin pérdida. Se conserva el recorte superior de 5016 × 3200 y se agregan 975 px de fondo inferior para obtener 5016 × 4175. El texto tiene márgenes superior e inferior de 1095 px. La extensión usa zonas limpias del fondo original, conservando su textura y franja lila; no reintroduce Instagram ni envíos.
- `src/assets/brand/vegan-records.png`: copia PNG sin pérdida a 997 × 1210; se retira la dirección web debajo del marco.
- `src/assets/brand/provenance.json`: hashes SHA-256 de los originales, coordenadas y verificación de igualdad de los píxeles conservados.

Para reproducir y verificar: `node scripts/prepare-brand.mjs`. No hay retoque generativo ni cambio de color en esas copias. Astro genera tamaños WebP más livianos exclusivamente para su presentación web, sin filtros CSS.

Color principal `#9c84c3`, tomado de la franja lila del original; texto violeta oscuro `#694784`, papel `#f5f1f7`, tinta `#211c27`, superficies `#eee7f2`. Los tonos de contraste pertenecen a la interfaz, no alteran el arte de los logos.

El nombre público es Vegan Music Store (VMS). Se conservan los dominios de las demos y la clave histórica del carrito para no perder selecciones existentes.

Los sliders usan el mismo componente y el mismo estado del carrito que el catálogo. Las fundas son composiciones tipográficas identificadas como ilustrativas. Los precios y límites proceden del snapshot; sólo se seleccionan títulos con stock y precio válido. La selección combina cuatro ediciones argentinas y cuatro de otros orígenes. No representa popularidad ni ventas.

La V1 mantiene la escena del hero sticky durante la extracción y una pausa final breve, con un recorrido aproximado de 18svh. La altura visible se mide según el contenido; si no cabe en la pantalla o hay movimiento reducido, se muestra en flujo normal. Los sliders permiten desplazamiento manual, botones y teclado; no avanzan solos. El del carrito no tiene enlaces de salida al catálogo.

Un título agotado se puede agregar a pedido para consultar su costo, con hasta 99 unidades por consulta. Se presenta aparte y no suma precios históricos al total ni a las cuotas. El estado del stock vigente determina su apartado; cualquier cambio entre pedido y stock se comunica al recuperar el carrito. Los títulos retirados y los de stock desconocido conservan la validación anterior. Los botones agregan una unidad y pasan a «En el carrito»; las cantidades se ajustan en el carrito.
