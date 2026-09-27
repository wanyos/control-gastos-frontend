# Resumen — feature 20 `statement-filters`

Fecha de cierre: 2026-09-27
Intención original: `feature_list.json` → feature `statement-filters`, bloque `intent`
Spec: `specs/20-statement-filters/`

## Qué hace ahora la app que antes no

En **Movements** (`/movements`), encima de la lista del mes, hay ahora una barra con
cuatro cosas: un buscador por un trozo del concepto, un desplegable de cuenta, uno de
categoría y una casilla **Uncategorized**. Afinan el mes que estás mirando sin sacarte de
él, y las tres cifras (`Money in`, `Money out`, `Difference`) pasan a ser las de lo
filtrado — calculadas por el backend, como siempre. Debajo de las cifras aparece una línea
que te dice qué has filtrado y cuántos movimientos son, por ejemplo *«12 movements match
these filters in March 2026 · Uncategorized · "luz"»*.

Antes el extracto solo sabía enseñarte el mes entero: para preguntarle algo concreto
(«qué me queda sin categoría de marzo», «cuánto me costó la luz») había que irse a la cola
de revisión, que es una lista de trabajo, no tu histórico.

## Por dónde se usa (puntos de entrada)

- `/movements` — la pantalla del extracto, con la barra nueva entre las flechas de mes y
  las cifras.
- `/movements?month=2026-03&account=2&uncategorized=true&q=luz` — el mes y los cuatro
  filtros viven **solo** en la dirección, con las mismas claves que ya usa la cola de
  revisión. Recargar, compartir el enlace o darle a atrás devuelve exactamente lo mismo.
- Botón **Clear filters** (en la barra y también en el mensaje de «no hay nada») — quita
  los cuatro filtros y **deja el mes donde estaba**.
- La pantalla lee tres cosas del backend y **no escribe ninguna**:
  `GET /api/movements` (el mes filtrado), `GET /api/accounts` y `GET /api/categories`
  (para llenar los dos desplegables, una vez al entrar).

## Dónde está el código (para revisión directa)

| Qué | Archivo:línea |
|-----|---------------|
| Las reglas del buscador (mínimo 2, máximo 100, aviso) y los dos lectores tolerantes de la dirección, compartidos con la cola | `src/shared/movement-filters.ts:21`, `:32`, `:38` |
| La lista de cuentas: tipo, validación y la petición | `src/shared/accounts.ts:28`, `:44` |
| La cola de revisión ahora los re-exporta, sin cambiar de comportamiento | `src/features/review/filters.ts:23` |
| Los cuatro filtros y qué cuenta como «filtro activo» | `src/features/statement/filters.ts:28`, `:44` |
| La petición: el mes **y** los filtros en una sola, con «sin categoría» ganando siempre a la categoría | `src/features/statement/filters.ts:59` |
| Los filtros hacia la dirección, y de vuelta corrigiendo lo imposible antes de pedir nada | `src/features/statement/filters.ts:85`, `:105` |
| Las dos frases nuevas: la línea de alcance y «no hay nada con estos filtros» | `src/features/statement/filters.ts:134`, `:157` |
| El mensaje de error con el botón que toca (404 y 400 ofrecen quitar filtros) | `src/features/statement/months.ts:163` |
| El estado: filtros, las dos listas, `applyFilters` y las cargas de una vez por sesión | `src/features/statement/store.ts:66`, `:98`, `:129`, `:140` |
| La barra de cuatro controles (temporizador de 350 ms, exclusión en los dos sentidos) | `src/features/statement/components/StatementFilterBar.vue:118`, `:128`, `:135` |
| El selector de categoría (copia del de la cola, para no cruzar features) | `src/features/statement/components/StatementCategorySelect.vue` |
| La línea de alcance, **fuera** de la nota permanente | `src/features/statement/components/MonthTotals.vue:42` |
| Las dos frases de vacío y su botón | `src/features/statement/components/StatementList.vue:6`, `:95` |
| La pantalla: la dirección es la única que manda, `replace` al filtrar y `push` al cambiar de mes | `src/features/statement/views/StatementView.vue:104`, `:119`, `:124` |
| Test principal de la lógica pura (25 casos) | `src/features/statement/__tests__/filters.spec.ts` |
| Test principal de la barra (16 casos) | `src/features/statement/__tests__/StatementFilterBar.spec.ts` |
| Test de la pantalla entera con filtros | `src/features/statement/__tests__/StatementView.spec.ts:197` |
| E2E en el navegador: filtrar, y la dirección imposible | `e2e/statement.spec.ts:290`, `:333` |

## Cumplimiento de la intención

Los ocho puntos de tu `como_se_que_esta_bien`, uno a uno:

- ✅ **«Filtro por una cuenta y veo solo la suya, con sus propias sumas.»** Se cumple. La
  cuenta viaja en la misma petición que el mes y las cifras son las que devuelve el
  backend para ese filtro; verificado en `src/features/statement/__tests__/filters.spec.ts:64`
  (la petición completa) y en `__tests__/store.spec.ts` (los totales son los del backend:
  el test está montado para romperse si alguien los sustituyera por una suma de las filas
  en pantalla).
- ✅ **«Filtro por una categoría y veo todo lo que la lleva en ese mes.»** Se cumple; el
  desplegable se llena con tus 16 categorías como árbol y la categoría elegida viaja como
  `categoryId`. Verificado en `__tests__/StatementFilterBar.spec.ts:81` y
  `__tests__/filters.spec.ts:64`.
- ✅ **«Pido los que no tienen categoría y veo cuántos son en ese mes.»** Se cumple: la
  casilla manda `uncategorized=true` y el recuento sale en la línea de alcance.
  Verificado en `__tests__/store.spec.ts` («uncategorized» viaja sola),
  `__tests__/filters.spec.ts:171` (la frase con el recuento) y en el e2e
  `e2e/statement.spec.ts:290`, que ve cambiar las tres cifras y el recuento al marcarla.
- ✅ **«Busco un trozo del concepto y lo encuentro, escriba con tildes o sin ellas.»** Se
  cumple: el texto se manda **tal cual** (recortado de espacios), sin tocar tildes ni
  mayúsculas, porque el backend ya compara sin ellas. Verificado en
  `src/shared/__tests__/movement-filters.spec.ts:26` y `__tests__/filters.spec.ts:76`
  (`  CAFETERÍA ` sale como `CAFETERÍA`).
- ✅ **«Cambio de mes y los filtros que tenía puestos siguen puestos.»** Se cumple;
  verificado en `__tests__/store.spec.ts` (la petición de febrero sigue llevando el filtro)
  y en `__tests__/StatementView.spec.ts:259` (la dirección del mes nuevo conserva las
  claves).
- ✅ **«Si un filtro deja el mes sin nada, me lo dice y distingue eso de que el mes esté
  vacío.»** Se cumple: son dos frases distintas, *«No movements match these filters in
  March 2026.»* con botón de quitar filtros, frente a la de la F19 *«No movements in
  March 2026.»*. Verificado en `__tests__/StatementView.spec.ts:302` (aparece una y **no**
  la otra) y en el e2e con una búsqueda que no casa con nada.
- ✅ **«Puedo quitar todos los filtros de una vez.»** Se cumple, y el mes **no** se
  reinicia. Verificado en `__tests__/StatementFilterBar.spec.ts:157` y en
  `__tests__/StatementView.spec.ts` (tras limpiar, la dirección queda solo con el mes).
- ✅ **«Recargo la página o le doy a atrás y sigo viendo lo mismo que estaba viendo.»** Se
  cumple: mes y filtros viven solo en la dirección. Filtrar **no** llena el botón de atrás
  (se reemplaza la dirección) y cambiar de mes sí deja paso. Verificado en
  `__tests__/filters.spec.ts:127` (escribe y relee lo mismo) y
  `__tests__/StatementView.spec.ts` (el historial no crece al filtrar).

Y las tres cosas que pediste que **no** pasaran, comprobadas también:

- La nota permanente sobre las cifras infladas **no cambió ni una palabra** y sigue sin
  botón de cerrar, también con filtros puestos →
  `__tests__/MonthTotals.spec.ts:107` compara el texto con y sin filtros y exige cero
  botones en todo el componente.
- **Sigue siendo solo mirar**: ni un POST, PATCH ni DELETE en toda la pantalla →
  `__tests__/StatementView.spec.ts:169` mide que los únicos caminos que se piden son los
  tres de lectura y que ningún método es distinto de GET; los dos e2e lo repiten en el
  navegador.
- **La cola de revisión no cambió de comportamiento**: sus 240 tests pasan **sin tocar ni
  uno** (lo único que se movió de sitio es la lógica compartida, que se re-exporta).

## Decisiones que se tomaron por ti

Las cinco que aprobaste el 2026-09-27 (🔴 de `decisions.md`), más las que el spec marcaba
como *delegado* o *añadido*, con el sitio donde viven ahora:

- **(delegado, 🔴 1) La barra de la cola se partió en dos.** Lo delicado —las reglas del
  buscador y la lectura de la dirección— se mudó a `src/shared/movement-filters.ts` y la
  cola de revisión lo re-exporta (`src/features/review/filters.ts:23`), así que no cambió
  de comportamiento. El extracto tiene su propia barra con **solo cuatro** controles: no
  hay tipo, ni estado, ni desde/hasta.
- **(delegado, 🔴 2) Con filtros puestos las cifras se siguen llamando igual** y se añade
  **una línea** que dice qué has filtrado y cuántos son (`filters.ts:134`). **No** se pide
  el mes sin filtrar para poder decir «12 de 93»: eso costaría una petición extra cada vez
  que tocas un filtro.
- **(añadido, 🔴 3) Una dirección escrita a mano con categoría y «sin categoría» a la vez
  se corrige aquí antes de pedir nada** y gana «sin categoría» (`filters.ts:105`). La
  petición que el backend rechazaría **no sale nunca**, así que ese error no puedes verlo.
  Si la dirección nombra una cuenta o categoría **borrada**, eso sí es un error real del
  backend y se te ofrece el botón de quitar filtros (`months.ts:163`).
- **(delegado, 🔴 4) Los dos desplegables se llenan con todo lo que existe** (tus 5 cuentas
  y tus 16 categorías), pedidas **una sola vez al entrar** (`store.ts:129`, `:140`). Eso
  añadió una llamada que el frontend no hacía todavía, `GET /api/accounts`. Si una de las
  dos listas no carga, se apaga **solo ese** desplegable con su aviso y el resto sigue
  funcionando.
- **(🔴 5) «Sin categoría» arranca apagado**: entrar en el extracto sigue enseñándote el
  mes entero (`filters.ts:36`).
- **(añadido) Al cambiar un filtro se vuelve al principio del mes** y se tira lo que
  hubiera traído `Load more`: esa lista era del filtro anterior (`store.ts:66`).
- **(delegado) El buscador espera 350 ms** desde la última tecla, la misma espera que la
  cola y que la previsualización de reglas; menos de 2 letras no viaja (no es un error,
  simplemente no se pide nada) y más de 100 avisa junto al campo sin llamar al backend.
- **(añadido) Quitar los filtros no reinicia el mes**, y la dirección de los filtros se
  **reemplaza** en vez de apilarse, para que escribir en el buscador no te llene el botón
  de atrás.

## Qué NO se tocó / quedó fuera

- **El backend no se tocó**: ni una línea, ni el contrato. Su repositorio está limpio.
- **Esta pantalla no escribe nada**: sigue siendo solo mirar.
- **No entra un rango libre de fechas**: el mes manda, como pediste.
- **No entra el interruptor del ruido** (los traspasos emparejados siguen viéndose en la
  lista sin contar en las cifras): es otra rodaja de la E7 y espera la parte 1 del encargo
  al backend.
- **No se corrige la categoría desde el extracto**: es la última rodaja de la E7.
- **La cola de revisión sigue llenando su desplegable de cuentas con la página cargada**,
  no con la lista completa. Cambiarlo sería cambiar el comportamiento de la F15: feature
  aparte.
- **Filtrar por una categoría no arrastra sus subcategorías** (el backend pide la categoría
  exacta). Si eso te molesta, es una feature del backend.

## Notas para el futuro

- **Cuidado con una lectura fácil:** filtrar por una cuenta o por «sin categoría» **no**
  limpia el ruido de los depósitos. Si filtras por myinvestor verás las cifras más
  infladas de tu base, no las más limpias; por eso la nota permanente sigue ahí.
- `StatementCategorySelect.vue` es hoy una copia literal del selector de la cola. Si una
  tercera pantalla necesita el mismo control, ese es el momento de moverlo a
  `src/shared/components/`.
- Cuatro detalles menores anotados por el revisor (ninguno bloquea, ninguno afecta a lo que
  ves): están al final de `progress/reviews/statement-filters.md`.
- **Comprobada con el humano delante el 2026-09-27 (T17)**: ocho combinaciones de filtros
  contra el backend real, con las cifras y el recuento cuadrando en las ocho, la línea de
  alcance diciendo lo que tocaba, y una dirección escrita a mano con la combinación
  imposible (categoría + «sin categoría») corregida aquí antes de que saliera la petición.
  Cero escrituras. El detalle está en `progress/current.md`.
- **Lo que salió de esa prueba, y es información de producto:** julio de 2026 en la cuenta
  **n26** son **221,45 €** de entrada y **1.038,07 €** de salida, mientras el mes entero
  lee **57.948 €** y **59.096 €**; filtrando por **myinvestor** salen **55.169 €** y
  **55.357 €**, que es el depósito rodando. O sea: **hasta que llegue la marca del backend,
  filtrar por cuenta es la única forma de ver el gasto real.**
