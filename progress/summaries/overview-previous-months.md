# Resumen — feature 26 `overview-previous-months`

Fecha de cierre: 2026-10-04 (aprobada por el reviewer; la comprobación contra el backend real, T15, hecha ese mismo día, solo con `GET`)
Intención original: `feature_list.json` → feature `overview-previous-months`, bloque `intent`
Spec (si SDD): `specs/26-overview-previous-months/`

## Qué hace ahora la app que antes no

En `Overview`, debajo del mes que estás mirando, hay ahora una tarjeta `Month by month`
con veinticuatro meses, uno por fila, del más reciente al más antiguo: dos barras (lo que
entró y lo que salió) y tres cifras con céntimos (`Money in`, `Money out`, `Savings`). El
ahorro sale en rojo y con signo menos cuando gastaste más de lo que entró. Encima de las
filas, una frase dice lo ahorrado en todo ese tiempo, con la suma que hace el backend. El
mes de arriba está señalado, y pulsar el nombre de otro mes lo pone arriba. Solo mira: no
escribe nada. La parte del mes no ha cambiado.

## Por dónde se toca (puntos de entrada)

> Los únicos con número de línea, y son clicables.

| Cómo se usa | Código |
| --- | --- |
| La tarjeta en la pantalla `/overview`, como último bloque | [OverviewView.vue:66](../../src/features/overview/views/OverviewView.vue#L66) |
| Leer los 24 meses y su suma (al entrar, al reintentar y tras una importación) | [store.ts:237](../../src/features/overview/store.ts#L237) |
| La única petición de lo ahorrado, con el rango entero | [service.ts:51](../../src/features/overview/service.ts#L51) |
| Pulsar un mes: la página sube hasta la navegación de mes | [OverviewView.vue:153](../../src/features/overview/views/OverviewView.vue#L153) |

## Dónde está el código

> Todo lo que la feature creó o tocó, por tema. Enlace al archivo, sin línea, y el
> símbolo al lado.

### Qué meses, qué periodo, qué escala y todos los textos (sin estado ni peticiones)

| Qué hace | Dónde |
| --- | --- |
| Los 24 meses que acaban en el mes del último dato | [previousMonths.ts](../../src/features/overview/previousMonths.ts) → `shownMonths`, `SHOWN_MONTHS` |
| El periodo que suma el backend (deja fuera el mes incompleto) | [previousMonths.ts](../../src/features/overview/previousMonths.ts) → `summedPeriod` |
| La cifra más alta de los meses completos, que llena una barra | [previousMonths.ts](../../src/features/overview/previousMonths.ts) → `scaleTop` |
| Las filas: estado, anchos de barra, signo del ahorro y cuál está señalada | [previousMonths.ts](../../src/features/overview/previousMonths.ts) → `buildMonthRows` |
| La frase de lo ahorrado, sus cuatro casos | [previousMonths.ts](../../src/features/overview/previousMonths.ts) → `periodSentence` |
| «…is left out: it is incomplete.» | [previousMonths.ts](../../src/features/overview/previousMonths.ts) → `leftOutLine` |
| «…is not one of these months.» | [previousMonths.ts](../../src/features/overview/previousMonths.ts) → `notShownLine` |
| «Data ends on …» | [previousMonths.ts](../../src/features/overview/previousMonths.ts) → `dataEndsLine` |
| Los textos fijos (título, etiquetas, carga y errores) | [previousMonths.ts](../../src/features/overview/previousMonths.ts) → `PREVIOUS_MONTHS_TITLE`, `MONTH_COLUMN_LABEL`, `SHOWN_ABOVE`, `INCOMPLETE`, `NO_MOVEMENTS`, `PREVIOUS_MONTHS_LOADING`, `PREVIOUS_MONTHS_FAILED`, `PERIOD_FAILED`, `NOTHING_TO_ADD_UP` |
| Los tipos nuevos | [types.ts](../../src/features/overview/types.ts) → `PeriodTotals`, `NetSign`, `MonthRow` |

### Lectura y estado

| Qué hace | Dónde |
| --- | --- |
| Pide al backend las sumas de un rango de varios meses, en una petición | [service.ts](../../src/features/overview/service.ts) → `getPeriodTotals` |
| Estado nuevo: carga de los 24 meses, la suma y su carga | [store.ts](../../src/features/overview/store.ts) → `previousLoad`, `period`, `periodLoad` |
| Los 24 meses y sus filas, listas para pintar | [store.ts](../../src/features/overview/store.ts) → `previousMonths`, `monthRows` |
| Lee lo que falte de los 24 meses y de la suma | [store.ts](../../src/features/overview/store.ts) → `loadPreviousMonths`, `loadPreviousFigures`, `loadPeriod` |
| Un mes se pide una sola vez por visita aunque lo pidan las dos partes a la vez | [store.ts](../../src/features/overview/store.ts) → `readFigures`, `readLatest`, `figuresInFlight`, `latestInFlight` |
| Entrar otra vez en la pantalla lo vacía; tras una importación se vuelve a leer | [store.ts](../../src/features/overview/store.ts) → `reset`, `refreshIfLoaded` |

### Pantalla

| Qué hace | Dónde |
| --- | --- |
| La tarjeta: título, frase, las dos notas, cabeceras, carga y error con `Try again` | [PreviousMonths.vue](../../src/features/overview/components/PreviousMonths.vue) → `PreviousMonths` |
| Una fila: nombre del mes (enlace), etiquetas, barras e importes | [PreviousMonthRow.vue](../../src/features/overview/components/PreviousMonthRow.vue) → `PreviousMonthRow`, `onPress` |
| Monta la tarjeta, la lee al entrar, construye la frase y sube la página al pulsar | [OverviewView.vue](../../src/features/overview/views/OverviewView.vue) → `onMounted`, `periodLine`, `onSelect` |
| El `Try again` de la parte del mes vuelve a pedir también los 24 meses si habían fallado | [OverviewView.vue](../../src/features/overview/views/OverviewView.vue) → `onRetry` |

### Tests

| Qué cubre | Dónde |
| --- | --- |
| Las funciones sin estado: meses, periodo, escala, filas y textos (44 tests) | [previousMonthsFunctions.spec.ts](../../src/features/overview/__tests__/previousMonthsFunctions.spec.ts) |
| La petición del periodo: una, con el rango exacto, solo `GET` (7 tests) | [previousMonthsService.spec.ts](../../src/features/overview/__tests__/previousMonthsService.spec.ts) |
| El store: 27 peticiones, ningún mes repetido, fallos, reintentos, nueva visita (25 tests) | [previousMonthsStore.spec.ts](../../src/features/overview/__tests__/previousMonthsStore.spec.ts) |
| Los dos componentes con datos pasados a mano (31 tests) | [PreviousMonths.spec.ts](../../src/features/overview/__tests__/PreviousMonths.spec.ts) |
| La tarjeta dentro de la pantalla, con router y store de verdad (19 tests) | [OverviewPreviousMonths.spec.ts](../../src/features/overview/__tests__/OverviewPreviousMonths.spec.ts) |
| Respuestas imitadas del backend: la del periodo, y rechazo de cualquier otro rango | [fixtures.ts](../../src/features/overview/__tests__/fixtures.ts) → `PERIOD`, `rawPeriodPage`, `readOf`, `mockBackend` |
| Tests de la F25: cuatro aserciones y dos títulos cambiados | [OverviewView.spec.ts](../../src/features/overview/__tests__/OverviewView.spec.ts) |
| En un navegador: un test nuevo, el recuento `2` → `27` y un título cambiado | [overview.spec.ts](../../e2e/overview.spec.ts) → `reads the previous months below the month and moves on a click` |

### Documentos

| Qué | Dónde |
| --- | --- |
| El árbol de `features/overview/`, «cuatro lecturas» y el párrafo de los 24 meses | [architecture.md](../../docs/architecture.md) |
| El e2e de `Overview` (tres tests) y la línea de iconos de la feature | [stack.md](../../docs/stack.md) |

## Cumplimiento de la intención

Resultado real de `./init.sh --checks 26` del 2026-10-04: **11 de 11 en verde**.

- ✅ «Debajo del mes veo los meses anteriores, cada uno con lo que entró y lo que salió.»
  → `OverviewPreviousMonths.spec.ts` › «shows the 24 months below the month, each with
  what came in and what went out». Check 1: ✅.
- ✅ «Distingo de un vistazo qué meses gasté más de lo que ingresé.» →
  `PreviousMonths.spec.ts` › «marks the months that spent more than came in» (nueve filas
  en rojo y con signo menos). Check 2: ✅.
- ✅ «El mes que tengo arriba está señalado entre los demás.» →
  `OverviewPreviousMonths.spec.ts` › «marks the month shown above, and only that one».
  Check 3: ✅.
- ✅ «Pulso otro mes y pasa a ser el de arriba.» → `OverviewPreviousMonths.spec.ts` ›
  «pressing another month puts it above, through the URL» (la dirección, la frase de
  arriba, la página sube y «atrás» vuelve). Check 4: ✅.
- ✅ «Un mes incompleto está marcado como incompleto.» → `PreviousMonths.spec.ts` ›
  «marks an incomplete month as incomplete, with no bars». Check 5: ✅.
- ✅ «Un mes sin movimientos se ve como vacío, no como un cero.» →
  `PreviousMonths.spec.ts` › «shows a month with no movements as empty, not as a zero».
  Check 6: ✅.
- ✅ «Las cifras de cada mes son las mismas que veo si entro en ese mes.» →
  `OverviewPreviousMonths.spec.ts` › «a row shows the same figures as the month does when
  it is above» (check 7: ✅) y `previousMonthsStore.spec.ts` › «asks for each month once
  in a visit, whoever asks» (check 8: ✅).
- ✅ «Veo lo que he ahorrado a lo largo de esos meses.» →
  `OverviewPreviousMonths.spec.ts` › «says what was saved over the complete months, with
  the totals of the backend» (la frase y una sola petición con el rango entero).
  Check 9: ✅.
- ✅ (añadido) «No cambia nada de la parte del mes.» → sus archivos son idénticos a los
  del commit de la F25 y sus cuatro archivos de test pasan (85 tests). Check 10: ✅.
- ✅ (añadido) «Solo mira.» → `e2e/overview.spec.ts`, en un navegador con las respuestas
  imitadas: toda la visita manda solo `GET`. Check 11: ✅ (3 tests).

**Comprobación contra el backend real (T15), hecha el 2026-10-04, solo con `GET`.** El
resultado completo está en la propia task, en `specs/26-overview-previous-months/tasks.md`:

- Las tres cifras de las 24 filas coinciden al céntimo con la API.
- El periodo de 23 meses (2024-10 → 2026-08) da 1.081 movimientos y −41.886,92 €, igual
  que la suma hecha aparte de los meses.
- La barra más ancha es la salida de julio de 2025 (11.527,15 €).
- 29 peticiones al entrar a agosto de 2026, todas `GET`.

**La frase del periodo lee hoy «you spent 41.887 € more than came in».** Sale así porque
los traspasos a cuentas propias de inversión que no tienen pareja ni marca siguen contando
como salida; la frase enseña lo que suma el backend.

Los tests no usan esas cifras sino las que fijó el spec (863 movimientos, −20.799,13 €),
que tratan de octubre de 2024 a febrero de 2025 como meses sin movimientos.

## Decisiones que se tomaron por ti

- (delegado) Se dibuja con las dos cosas en la misma fila: barras y cifras.
- (delegado) Los meses son siempre los 24 que acaban en el mes de tu último dato; no se
  mueven al pulsar.
- (delegado) Todas las barras comparten una escala: la cifra más alta de los meses
  completos llena el ancho.
- (delegado) El mes incompleto no lleva barras ni entra en la escala.
- (delegado) Las peticiones se comparten con la parte del mes: entrar a un mes completo
  pasa de 15 a 27.
- (añadido) La tercera cifra, `Savings`, que es el neto del backend.
- (añadido) Si el mes de arriba no es ninguno de los 24, no se señala ninguno y lo dice.
- (añadido) Al pulsar un mes, la página sube hasta la navegación de mes.
- (añadido) Lo ahorrado se pide al backend en una petición con el rango entero, en vez
  de sumarlo en la pantalla; y el mes incompleto queda fuera de esa suma, y se dice.
- (añadido) Si falla un mes no se pinta ninguna fila; si falla la suma, las filas siguen
  y no se sustituye por una suma hecha en la pantalla.
- (añadido) En tests de la F25 cambiaron cinco aserciones y, tras la revisión, tres
  títulos (`design.md` §7).
- Durante la implementación: cada fila recibe además el texto «Data ends on …»
  (`dataEnds`), que el diseño no listaba; el enlace del mes es un `<a>` propio dentro de
  `RouterLink`, para que solo la fila del mes de arriba lleve `aria-current`.

## Qué NO se tocó / quedó fuera

- El backend y el contrato de la API.
- `reading.ts`, los cuatro componentes de la F25, `src/features/statement/`,
  `src/features/import/`, `src/shared/`, el router y `theme-dark.css`.
- Sin entrada nueva en el menú, sin reparto por categoría, sin dependencias ni iconos
  nuevos.

## Notas para el futuro

- **Lo ahorrado sale muy negativo** hasta que marques los traspasos a tus cuentas de
  inversión; se corrige desde el extracto, sin tocar esta pantalla.
- **Las barras de los meses corrientes quedan cortas** mientras haya meses de más de
  10.000 €.
- Durante la implementación se perdió un archivo de tests porque dos nombres solo se
  distinguían en una mayúscula; se repuso con otro nombre
  (`previousMonthsFunctions.spec.ts`). Nada en el proyecto detecta hoy dos rutas así: los
  implementers sugieren una comprobación en `init.local.sh`.
- `./init.sh --checks` solo imprime las tres últimas líneas de cada comando y no enseña
  cuántos tests ejecutó cada check; hay que lanzar el comando a mano para verlo.
- `./init.sh` no lanza `vue-tsc`: un error de tipos en un test solo lo ve
  `pnpm type-check`.
