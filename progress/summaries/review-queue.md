# Resumen — feature 15 `review-queue`

Fecha de cierre: 2026-09-18
Intención original: `feature_list.json` → feature `review-queue`, bloque `intent`
Spec: `specs/15-review-queue/`

## Qué hace ahora la app que antes no

Ahora puedes **ver** lo que has importado y todavía no has dado por bueno. La barra
lateral tiene una entrada **Review** con el número de movimientos que te quedan por
revisar, y dentro está la cola: fecha, descripción, cuenta, importe y categoría de cada
uno, de lo más reciente a lo más antiguo, de 100 en 100, con los totales que calcula el
backend. Puedes estrecharla por cuenta, por fechas, por tipo, por categoría, por «los que
no tienen categoría» y buscando un trozo del concepto, sin preocuparte de tildes ni
mayúsculas. Antes esos movimientos existían en la base de datos pero no había ninguna
pantalla donde mirarlos.

**Sigue siendo solo mirar:** no confirma, no categoriza y no escribe nada. Eso es la F16.

## Por dónde se usa (puntos de entrada)

- **Barra lateral → Review**, o la dirección `/review` directamente.
- El **número** junto a Review se actualiza al abrir la app, al terminar una importación y
  cada vez que cargas la cola sin filtros.
- **Los filtros y la página viven en la dirección web**: puedes recargar, darle a atrás y
  guardar el enlace sin perder lo que estabas mirando.
- Por debajo solo se piden dos cosas al backend, las dos de lectura:
  `GET /api/movements` (la lista) y `GET /api/categories` (el desplegable de categorías).

## Dónde está el código (para revisión directa)

| Qué | Archivo:línea |
|-----|---------------|
| La pantalla | `src/features/review/views/ReviewView.vue:1` |
| Estado: filtros, página, datos, error y recuento | `src/features/review/store.ts:53` |
| Reintento único cuando pides una página que ya no existe | `src/features/review/store.ts:97` |
| Qué frase se enseña ante cada fallo | `src/features/review/store.ts:26` |
| El número de la barra lateral se calcula aquí | `src/features/review/store.ts:137` |
| Las dos peticiones y el mapeo de sus respuestas | `src/features/review/service.ts:182` |
| Barrera que impide pedir categoría y sin categoría a la vez | `src/features/review/service.ts:55` |
| Filtros a la URL y de vuelta, y las guardas de la búsqueda | `src/features/review/filters.ts:44` |
| Una fila de la lista | `src/features/review/components/MovementRow.vue:1` |
| Los seis controles de filtro y la espera de 0,35 s | `src/features/review/components/ReviewFilterBar.vue:138` |
| El desplegable de categorías | `src/features/review/components/CategorySelect.vue:1` |
| El número de la barra lateral | `src/features/review/components/ReviewCountBadge.vue:1` |
| Totales y paginador | `src/features/review/components/ReviewTotals.vue:1` y `ReviewPager.vue:1` |
| Campos de formulario reutilizables | `src/shared/components/BaseInput.vue:1`, `BaseSelect.vue:1`, `BaseCheckbox.vue:1` |
| Ruta `/review` en la barra lateral | `src/router/index.ts:42` |
| El recuento se refresca tras importar | `src/features/import/store.ts:77` |
| Tests principales | `src/features/review/__tests__/store.spec.ts:1` y `ReviewView.spec.ts:1` |
| Prueba en navegador de verdad | `e2e/review-queue.spec.ts:1` |

## Cumplimiento de la intención

- ✅ «la barra lateral tiene una entrada Review con cuántos movimientos me quedan por
  revisar» → se cumple; verificado en
  `src/shared/components/__tests__/AppShell.spec.ts:104` y
  `src/features/review/__tests__/ReviewCountBadge.spec.ts:28`.
- ✅ «veo la lista de pendientes ordenada de lo más reciente a lo más antiguo, paginada, y
  sé cuántos hay en total» → se cumple; el orden es el que manda la API y el test lo fuerza
  con un fixture desordenado a propósito
  (`src/features/review/__tests__/MovementList.spec.ts:11`); el total, en
  `src/features/review/__tests__/ReviewTotals.spec.ts:13`.
- ✅ «cuando filtro por cuenta, fechas, tipo, categoría o sin categoría, la lista y los
  totales se ajustan» → se cumple; verificado en
  `src/features/review/__tests__/filters.spec.ts:29`,
  `src/features/review/__tests__/store.spec.ts:103` y
  `src/features/review/__tests__/ReviewView.spec.ts:89`.
- ✅ «cuando escribo un trozo del concepto, encuentro los movimientos aunque escriba sin
  tildes o en minúsculas» → se cumple; quien ignora tildes y mayúsculas es el backend, y la
  prueba de navegador lo comprueba de punta a punta en `e2e/review-queue.spec.ts:169`
  (escribir `cafeteria` encuentra `CAFETERÍA CENTRAL`).
- ✅ «cuando cambio de página o de filtro, no se me pierde lo que estaba mirando» → se
  cumple; todo va en la dirección web, incluido el botón de atrás del navegador
  (`src/features/review/__tests__/ReviewView.spec.ts:139`), y recargar te deja en la misma
  página (`e2e/review-queue.spec.ts:151`).
- ✅ «si no hay nada pendiente, la pantalla me lo dice en lugar de mostrarme una tabla
  vacía» → se cumple, y además distingue que no quede nada de que no haya coincidencias con
  esos filtros: `src/features/review/__tests__/ReviewView.spec.ts:156` y `:165`.

Y lo que dijiste que **no** querías:

- ✅ El backend no se ha tocado: solo se ha leído su contrato.
- ✅ No se confirma ni se categoriza nada, y no hay una sola escritura
  (`store.spec.ts:335`, `ReviewView.spec.ts:279`, y una red de seguridad en el e2e que
  aborta cualquier otra llamada).
- ✅ No se edita importe, fecha ni descripción: la fila no tiene un solo control
  (`MovementRow.spec.ts:70`).
- ✅ Si la API falla, la pantalla te lo dice en cristiano y sigue usable; nunca enseña el
  mensaje en español del backend (`store.spec.ts:303`).

## Decisiones que se tomaron por ti

De lo que aprobaste en `decisions.md`, lo que conviene que recuerdes:

- (delegado) **El número de la barra lateral** no tiene endpoint propio: se pregunta por la
  cola pidiendo un solo movimiento y quedándose con el total. Se refresca al arrancar, al
  terminar una importación y al cargar la cola sin filtros; nunca en bucle.
- (delegado) **Los filtros y la página viven en la dirección web**, que es lo que hace que
  recargar y volver atrás funcionen.
- (delegado) **La búsqueda se lanza sola** 0,35 s después de la última tecla.
- (añadido) **Con menos de 2 letras no se busca**, y **con más de 100 caracteres avisa y no
  manda nada**: son los dos casos que el backend rechazaría con un error.
- (añadido) **Si pides una página que ya no existe**, la pantalla vuelve sola a la primera
  y te lo dice, en vez de quedarse en error.
- (añadido) **`Uncategorized`** es la marca de los movimientos sin categoría; elegir una
  categoría desmarca «sin categoría», y al revés.
- (añadido) **Si el desplegable de categorías no carga**, se deshabilita con el aviso
  `Categories unavailable` y el resto de la pantalla sigue funcionando.
- (añadido) **Si falla la consulta del recuento**, la barra lateral no enseña número, y
  nunca un error.
- (humano) **`/movements` sigue siendo una página vacía** hasta la E7: el extracto completo
  es otra pantalla, distinta de esta cola.

## Qué NO se tocó / quedó fuera

- **Confirmar y categorizar, que es la F16.** El sitio está reservado (el hueco a la
  izquierda de cada fila y el espacio bajo los filtros), pero no hay nada construido.
- **El extracto completo de la E7:** `/movements` sigue como estaba.
- **El desplegable de cuentas** se rellena con las cuentas que aparecen en la página
  cargada, sin pedir el listado completo. Si filtras muy estrecho, enseñará pocas cuentas.
- **La barra de filtros no se queda fija arriba** al bajar por una página de 100 filas.
- Ni el backend, ni `package.json`, ni `src/assets/styles/`, ni la feature de net worth.

## Notas para el futuro

- **Queda una comprobación tuya, de un minuto y sin riesgo** (la pantalla solo lee): con el
  backend levantado y `pnpm dev`, abre `/review` y mira que el número de la barra lateral
  coincida con tus pendientes reales, y que buscar sin tildes encuentre un movimiento con
  tildes. El backend estuvo apagado toda la sesión y no pudo hacerse.
- Mientras no llegue la F16, **el número de la barra lateral solo puede subir**: puedes ver
  la cola, pero todavía no vaciarla.
- Si el desplegable de cuentas se queda corto, o los filtros molestan al bajar por la
  lista, las dos cosas son un cambio pequeño, anotado en el informe del implementer.
