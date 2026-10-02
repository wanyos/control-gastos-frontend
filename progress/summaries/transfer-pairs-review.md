# Resumen — feature 24 `transfer-pairs-review`

Fecha de cierre: 2026-10-02
Intención original: `feature_list.json` → feature `transfer-pairs-review`, bloque `intent`
Spec (si SDD): `specs/24-transfer-pairs-review/`

## Qué hace ahora la app que antes no

Hay una pantalla nueva, `Transfers`, donde ves todas las parejas de traspaso que el
programa tiene enlazadas, cada una con sus dos movimientos, y puedes deshacer la que no
sea un traspaso tuyo. Encima van los traspasos dudosos, los que la importación no supo
emparejar: eliges uno de cada lado y los enlazas tú. Antes, una pareja mal casada solo
se podía corregir con `curl`.

## Por dónde se usa (puntos de entrada)

- Barra lateral → `Transfers`, justo debajo de `Rules` (dirección `/transfers`).
- Botón `Unlink` de cada pareja: pregunta antes, y al confirmar manda
  `DELETE /api/transfers/:transferId`. Después queda un `Undo` que la vuelve a enlazar.
- Botón `Link these two` de cada grupo dudoso: manda `POST /api/transfers` con los dos
  ids y nada más. No pregunta, pero deja un `Undo`.
- Al abrir la pantalla solo se lee: `GET /api/transfers` y `GET /api/transfers/ambiguous`.

## Dónde está el código (para revisión directa)

| Qué | Archivo:línea |
|-----|---------------|
| La ruta y la entrada del menú | `src/router/index.ts:66` |
| La pantalla (aviso, dudosos, parejas, diálogo) | `src/features/transfers/views/TransfersView.vue:1` |
| Una pareja con sus dos patas y la etiqueta `Bizum` | `src/features/transfers/components/TransferPairRow.vue:1` (etiqueta en `:51`) |
| Un grupo dudoso en dos columnas | `src/features/transfers/components/AmbiguousGroupCard.vue:1` (botón en `:58`) |
| La pregunta antes de deshacer | `src/features/transfers/components/UnlinkConfirmDialog.vue:1` |
| La línea de aviso con `Undo` | `src/features/transfers/components/TransfersActionNotice.vue:1` |
| Estado y gestos (cargar, deshacer, enlazar, `Undo`) | `src/features/transfers/store.ts:34` (escritura en `:105`, deshacer en `:135`, enlazar en `:161`, `Undo` en `:174`) |
| Las cuatro llamadas a la API | `src/features/transfers/service.ts:75`, `:80`, `:88` (enlazar), `:102` (deshacer) |
| La señal `Bizum` | `src/features/transfers/pairs.ts:38` |
| La comprobación antes de enlazar | `src/features/transfers/pairs.ts:53` |
| Qué dice el aviso tras deshacer | `src/features/transfers/pairs.ts:68` |
| Qué dice el diálogo antes de deshacer | `src/features/transfers/pairs.ts:80` |
| Las frases de error | `src/features/transfers/pairs.ts:96` |
| Las dos rutas de la API, compartidas con el extracto | `src/shared/transfers.ts:5` |
| Test principal del store | `src/features/transfers/__tests__/store.spec.ts:46` |
| Test de extremo a extremo | `e2e/transfer-pairs-review.spec.ts:299` |

## Cumplimiento de la intención

- ✅ "Veo la lista de parejas, con las dos patas de cada una: fecha, cuenta, concepto e
  importe." → se cumple; verificado en
  `src/features/transfers/__tests__/TransferPairRow.spec.ts:15` y en
  `e2e/transfer-pairs-review.spec.ts:299`.
- ✅ "Reconozco de un vistazo las que no cuadran, como las dos multas." → se cumple para
  las que llevan un Bizum: la pareja sale con la etiqueta `Bizum` sin moverse de su
  sitio. Verificado en `src/features/transfers/__tests__/pairs.spec.ts:53` y
  `TransferPairRow.spec.ts:70`. Una pareja falsa que no sea un Bizum no lleva marca;
  para eso está la lista entera a la vista.
- ✅ "Deshago una pareja y sus dos movimientos vuelven a contar en las sumas." → se
  cumple; la pantalla manda la petición correcta y vuelve a pedir las listas
  (`store.spec.ts:130`, `e2e/transfer-pairs-review.spec.ts:340`), y **está probado
  contra tus datos** (T22, 2026-10-02, con tu visto bueno): al deshacer la pareja
  42369/42519 (1.000 € de bankinter a n26, 9 de septiembre de 2026), septiembre pasó
  de 161,82 / 966,84 € a 1.161,82 / 1.966,84 €, exactamente 1.000 € por lado, y
  quedaron 37 parejas. Detalle en «La prueba contra tus datos reales», más abajo.
- ⚠️ "Veo los dudosos y, cuando dos son claramente el mismo dinero, los emparejo." → la
  pantalla lo hace, pero **esta mitad solo está probada con datos fabricados**: grupos
  de 3 y 4 movimientos en `store.spec.ts:263` y `e2e/transfer-pairs-review.spec.ts:391`.
  En tus datos reales hay 0 grupos dudosos, así que no hubo nada que emparejar de
  verdad; verás la frase que lo dice. Lo único real que se sabe de `POST /api/transfers`
  desde la pantalla es el `Undo` de la prueba, que volvió a enlazar una pareja.
- ✅ "Si me equivoco emparejando, puedo deshacerlo." → se cumple; verificado en
  `store.spec.ts:284` (el `Undo`) y además la pareja nueva aparece en la lista con su
  `Unlink`.
- ✅ "Nada de esto cambia importes ni fechas." → se cumple; verificado en
  `store.spec.ts:418`, que recorre todos los gestos y comprueba que solo salen las
  cuatro llamadas y que el único campo que viaja es `movementIds`.

## Decisiones que se tomaron por ti

- (delegado) **Una sola señal, `Bizum`**, que dice lo que ve y no lo que sospecha: si el
  concepto de alguna pata contiene «bizum». No reordena ni esconde nada. Vive en
  `src/features/transfers/pairs.ts:38`.
- (delegado) **Los dudosos en dos columnas, `Money out` y `Money in`**, eligiendo uno de
  cada; el botón no se enciende hasta que hay uno por columna y de cuentas distintas.
  `AmbiguousGroupCard.vue:1` y `pairs.ts:53`.
- (delegado) **Enlazar no pregunta; deshacer sí.** Deshacer deja memoria en el backend
  y, pasado el `Undo`, no se recupera desde la web.
- (delegado) El nombre `Transfers`, su sitio bajo `Rules`, y los dudosos arriba.
- (añadido) **`Undo` tras deshacer una pareja**: sin él, un clic equivocado no tiene
  arreglo desde la web. `store.ts:174`.
- (añadido) **El diálogo y el aviso dicen la verdad si una pata está marcada como que
  no cuenta**: esa sigue fuera de las sumas. El aviso se corrigió en la revisión
  (cambiamos el texto que aprobaste, porque en ese caso habría sido falso).
  `pairs.ts:68` y `:80`.
- (añadido) Si falla una de las dos listas, la otra se ve igual, con su `Try again`.
- (añadido) Texto `Link undone.` tras deshacer un enlace hecho a mano, y los textos de
  carga: el spec no los fijaba.

## Qué NO se tocó / quedó fuera

- No se toca el backend ni su contrato.
- La pantalla no edita nada más de un movimiento: ni importe, ni fecha, ni categoría,
  ni estado, ni la marca de no contar.
- Nada se enlaza ni se deshace solo: cada escritura sale de un clic tuyo.
- La nota del extracto no enlaza a esta pantalla.
- **Las dos multas no las deshizo esta feature.** Ya estaban deshechas antes de
  empezarla: las deshizo la sesión del backend el 2026-09-28. El problema que motivó la
  feature ya no estaba en tus datos; la pantalla queda para la próxima vez que la
  detección se equivoque.
- **No se emparejó ningún dudoso real**, porque no hay ninguno (0 grupos).

## La prueba contra tus datos reales (T22, 2026-10-02)

Hecha con tu visto bueno explícito, porque escribe. **No se hizo como decía el spec**:
el spec proponía volver a enlazar con `curl` la multa de 100 € y deshacerla desde la
pantalla; elegiste no tocar las multas y deshacer y rehacer una pareja **buena**.

- Pareja: 42369/42519, 1.000 € de bankinter a n26, 9 de septiembre de 2026.
- Antes: 38 parejas; septiembre en 161,82 / 966,84 €.
- Tras `Unlink`: 37 parejas; septiembre en 1.161,82 / 1.966,84 € (exactamente 1.000 €
  más por lado).
- Tras `Undo`: 38 parejas; septiembre otra vez en 161,82 / 966,84 €.
- Lo único que cambió en los dos movimientos: `transferId` (uno nuevo, es lo esperado)
  y `updatedAt`. Ni importes ni fechas.
- Dos escrituras en total: `DELETE /api/transfers/:id` y `POST /api/transfers`. Cero
  errores.

## Notas para el futuro (opcional)

- **Datos personales.** Los nombres de terceros se quitaron de los tests de esta
  feature. Fuera de ella aún quedan algunos: `progress/exploration/ruido-traspasos-datos.md:203`,
  `:272` y `:313`, y `../docs/handoff-paginacion-estable.md:36`. Conviene limpiarlos
  antes de subir el repositorio; hay 21 commits locales sin subir.
- **Los tests unitarios no tienen red de seguridad global.** Un test que olvidara
  imitar la API hablaría con tu backend real, porque el entorno de pruebas usa por
  defecto su misma dirección. Hoy ninguno lo olvida. Se cierra con una línea en
  `vitest.config.ts`.
- **Un fallo de red se cuenta como «no cambió nada»** y no recarga. Se corrige solo al
  siguiente gesto, pero la frase afirma algo que la pantalla no sabe. Afecta también a
  las pantallas de revisión y del extracto.
- Pasado el `Undo`, una pareja deshecha no vuelve a salir como dudosa: quedaría `curl`.
