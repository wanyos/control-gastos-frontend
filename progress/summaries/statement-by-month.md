# Resumen — feature 19 `statement-by-month`

Fecha de cierre: 2026-09-26
Intención original: `feature_list.json` → feature `statement-by-month`, bloque `intent`
Spec (SDD): `specs/19-statement-by-month/`

## Qué hace ahora la app que antes no

La pantalla **Movements**, que hasta hoy estaba vacía, es tu extracto. Entras y ves **el
mes en curso entero** —lo pendiente y lo confirmado, sin filtrar nada— con lo que entró, lo
que salió y la diferencia, y la lista de movimientos agrupada por días, como un extracto de
banco. Con dos botones saltas al mes anterior o al siguiente, y con un selector de mes
saltas de golpe a enero de 2024 sin dar veinte clics. El mes que estás mirando va en la
dirección (`/movements?month=2026-03`), así que recargar, el botón de atrás y guardar un mes
en favoritos funcionan.

Y lo más importante: **debajo de las tres cifras hay una nota que no se puede cerrar**
explicando que esas cifras están infladas, con el ejemplo de julio de 2026 (57.949 € de
entrada y 59.096 € de salida, que es casi todo un depósito renovándose). Antes de esta
pantalla no tenías ningún sitio donde mirar «qué pagué en marzo».

## Por dónde se usa (puntos de entrada)

- **Menú lateral → `Movements`**, o directamente la dirección `/movements`.
- `/movements?month=2026-03` — abre marzo de 2026 directamente. Si escribes un mes
  imposible (`2026-13`), abre el mes en curso sin darte un error.
- Los botones **`Previous` / `Next`** y el campo **`Jump to month`**.
- **`Load more`**, que solo aparece si un mes tuviera más de 200 movimientos (tu mes más
  cargado tiene 93, así que en la práctica no lo verás).
- **`Try again`**, si la carga de un mes falla.
- Por debajo, la pantalla hace **una sola** llamada y siempre de lectura:
  `GET /api/movements?from=<1º del mes>&to=<último>&page=1&pageSize=200`.

## Dónde está el código (para revisión directa)

| Qué | Archivo:línea |
|-----|---------------|
| La página de `/movements` (lee el mes de la URL, monta las tres piezas) | `src/features/statement/views/StatementView.vue:76` |
| La ruta: `/movements` deja de ser placeholder | `src/router/index.ts:72` |
| Las tres cifras y la **nota que no se cierra** | `src/features/statement/components/MonthTotals.vue:71` (el texto) y `:40` (dónde se pinta) |
| Los botones de mes y el selector de mes | `src/features/statement/components/MonthNav.vue:3` |
| La lista con una cabecera por día, el mes vacío y `Load more` | `src/features/statement/components/StatementList.vue:8` |
| Una línea del extracto (concepto, cuenta, categoría, importe, marca `Transfer`) | `src/features/statement/components/StatementRow.vue:2` |
| El estado: mes, carga, error, y que gane la última petición | `src/features/statement/store.ts:49` (`show`) y `:32` (el contador `loadRun`) |
| Toda la cuenta de meses, sin aritmética de fechas | `src/features/statement/months.ts:54` (`monthRange`) y `:65` (`shiftMonth`) |
| La agrupación por días, que **no** reordena nada | `src/features/statement/months.ts:123` |
| Las frases de error, en inglés y sin el mensaje del backend | `src/features/statement/months.ts:163` |
| Test principal de que las sumas **no** se calculan aquí | `src/features/statement/__tests__/MonthTotals.spec.ts:28` |
| Test principal de la nota permanente | `src/features/statement/__tests__/MonthTotals.spec.ts:60` |
| Test de que solo se lee, nunca se escribe | `src/features/statement/__tests__/StatementView.spec.ts:167` |
| La prueba en navegador real (4 escenarios) | `e2e/statement.spec.ts:138` |

## Cumplimiento de la intención

Los siete puntos de tu `como_se_que_esta_bien`, uno por uno:

- ✅ **«Entro y veo el mes en curso con sus movimientos y sus sumas, sin tocar nada.»** Se
  cumple. Verificado en `src/features/statement/__tests__/StatementView.spec.ts:44` (al
  montar sale **una** petición, la del mes de hoy, y salen las cifras, las cinco filas y la
  nota) y en navegador real en `e2e/statement.spec.ts:138`, entrando por el menú.
- ✅ **«Cambio al mes anterior de un clic y las sumas cambian con él.»** Se cumple.
  Verificado en `src/features/statement/__tests__/StatementView.spec.ts:79` (el clic escribe
  la URL, pide el mes anterior y las cifras pasan a ser las suyas) y en
  `e2e/statement.spec.ts:196`, donde las cifras cambian de 59.096,42 a 1.234,56 en el
  navegador.
- ✅ **«Veo todo, tanto lo pendiente como lo que haya confirmado.»** Se cumple: la petición
  **nunca** lleva filtro de estado. Verificado en
  `src/features/statement/__tests__/months.spec.ts:114`, que comprueba la lista exacta de
  parámetros (`from`, `to`, `page`, `pageSize`) y que `status` no está.
- ✅ **«Las sumas son las que calcula el backend, no una cuenta inventada en la pantalla.»**
  Se cumple, y está protegido de que alguien lo estropee en el futuro: el test
  `src/features/statement/__tests__/MonthTotals.spec.ts:28` suma los movimientos que le pasan
  y exige que ese número **no** aparezca en pantalla. La única operación aritmética de toda
  la pantalla es mirar si la diferencia es negativa para pintarla en rojo
  (`MonthTotals.vue:80`).
- ✅ **«Con 1.607 movimientos y 33 meses, la pantalla no se arrastra.»** Se cumple: un mes
  es **una** petición (nunca se piden los 1.607 juntos), hay línea de carga mientras viaja
  —verificado en `src/features/statement/__tests__/StatementView.spec.ts:115`— y si pulsas
  las flechas más rápido que la red, gana la última: la respuesta vieja se tira, verificado
  en `src/features/statement/__tests__/store.spec.ts:61`.
- ✅ **«Lo que veo cuadra con lo que dice mi banco para ese mes.»** Se cumple en lo que el
  frontend puede garantizar: el rango pedido es el mes natural completo con los dos extremos
  incluidos, incluido febrero de un año bisiesto
  (`src/features/statement/__tests__/months.spec.ts:37` y `:43`), las cifras son literalmente
  las del backend y cada línea muestra el dato tal como vino
  (`src/features/statement/__tests__/StatementRow.spec.ts:21`). **Y el contraste final con tus
  cifras reales (la T18) está hecho:** seis meses comprobados contra la API el 2026-09-26,
  coincidiendo al céntimo (abajo).
- ✅ **«Si un mes no tiene movimientos, me lo dice en lugar de enseñarme una tabla vacía.»**
  Se cumple: dice `No movements in September 2026.` y no pinta ni una fila ni una cabecera.
  Verificado en `src/features/statement/__tests__/StatementList.spec.ts:42` y, que es
  distinto de un fallo de carga, en
  `src/features/statement/__tests__/StatementView.spec.ts:123`.

Y tus ocho `que_no_quiero` se respetan todos: no se ha tocado el backend (comprobado: su
repositorio está sin cambios), no se puede editar ni borrar nada, no hay gráficas, no hay
exportar a CSV, no hay columna de saldo —el test
`src/features/statement/__tests__/StatementRow.spec.ts:44` lo comprueba incluso cuando el
movimiento trae el saldo—, la cola de revisión no se duplica ni se toca, y no hay filtros ni
búsqueda ni interruptor del ruido.

## Decisiones que se tomaron por ti

Lo que en el spec iba marcado como `(delegado)` o `(añadido)`, recordado aquí para que lo
tengas presente. Las seis que te enseñamos en `decisions.md` las aprobaste sin cambios;
estas son las mismas, contadas por dónde viven ahora:

- **(añadido) La nota que no se puede cerrar.** Es la pieza más importante de la pantalla y
  **no la pediste**: cuando escribiste la intención creías que esta pantalla traería las
  sumas limpias, y no puede. Vive en `src/features/statement/components/MonthTotals.vue:71`,
  siempre visible, sin botón de cerrar y sin tener que pasar el ratón por encima.
- **(añadido) Las cifras se llaman `Money in`, `Money out` y `Difference`**, no «gastado» ni
  «ingresado»: llamarlas gasto sería mentir mientras los depósitos estén dentro.
  `MonthTotals.vue:10`, `:19`, `:28`.
- **(añadido) La marca `Transfer` en las líneas de traspaso.** Sin ella la pantalla mentiría
  por omisión: esos apuntes **se ven en la lista pero no están en las sumas**, así que sumar
  las líneas a mano no cuadraría y nada lo explicaría. `StatementRow.vue:20`.
- **(delegado) El mes se elige con dos botones y un selector de mes** (`Jump to month`), en
  vez de solo flechas o de un rango libre de fechas. `MonthNav.vue:3`.
- **(delegado) Una cabecera por día y la fecha ahí, no en cada línea.** Es la consecuencia
  de leerlo como un extracto: la fecha deja de repetirse 93 veces. La agrupación está en
  `src/features/statement/months.ts:123`.
- **(delegado) `Load more` en vez de páginas numeradas**, y el mes entero en una petición de
  200 (el máximo que permite el backend). Con 93 movimientos en tu mes peor, el botón es una
  red de seguridad que no vas a ver. `src/features/statement/store.ts:79`.
- **(añadido) Una URL con un mes imposible cae al mes en curso sin decir nada**, en vez de
  dar un error. `src/features/statement/months.ts:100`.
- **(añadido) Si pulsas las flechas más rápido que la red, gana la última.** Sin esto la
  pantalla podría acabar enseñando septiembre con las sumas de julio.
  `src/features/statement/store.ts:32`.
- **(delegado) Los errores se cuentan con frases propias en inglés**, nunca con el mensaje
  del backend (que viene en español y nombra ids), y con un botón de reintentar.
  `src/features/statement/months.ts:163`.

## Qué NO se tocó / quedó fuera

- **El backend, nada.** Su repositorio está sin un solo cambio.
- **Esta pantalla no escribe.** Ni una petición suya puede cambiar un dato: se comprobó por
  grep (en toda la carpeta no aparece `POST`, `PATCH` ni `DELETE`) y con una aserción en los
  cuatro escenarios de navegador de que **todas** las llamadas son de lectura.
- **Las sumas infladas siguen infladas, y esta pantalla no puede arreglarlo.** Los 29
  apuntes de depósito de myinvestor (285.000 € de gasto y 275.652 € de ingreso, el 58 % de
  toda tu base) siguen contando porque así los calcula el backend, y no existe ningún campo
  que el frontend pueda escribir para sacarlos. Lo arregla **la feature del backend que ya
  está encargada**; hasta entonces, lo honesto es la nota.
- **No hay filtros, ni búsqueda, ni interruptor del ruido**: son las rodajas siguientes.
- **Corregir la categoría desde el extracto**, feature posterior (tú lo decidiste así).
- **La cola de revisión (`/review`) y las reglas siguen exactamente igual.** La feature es
  una carpeta nueva y aislada que no importa nada de ellas. El único test de una feature
  anterior que cambió es el que afirmaba que `/movements` era un placeholder a propósito:
  ese es justo el que esta feature viene a jubilar.
- **Ninguna dependencia nueva** y **ningún icono nuevo**.

## Notas para el futuro

- **La T18 está hecha (2026-09-26), contigo delante y sin escribir nada:** seis meses
  comprobados contra el backend real (2026-09, 2026-07, 2026-03, 2025-12, 2024-01 y
  2023-05, este último vacío). Las tres cifras y el número de movimientos coinciden **al
  céntimo** en los seis. La nota permanente sale en todos los meses, el mes vacío dice
  `No movements in May 2023.`, `Next` está apagado en el mes en curso, un mes imposible
  (`2026-13`) cae en el mes en curso, y las 11 marcas `Transfer` de diciembre de 2025 son
  las mismas 11 filas que la API da con `transferId`. Cero escrituras y cero errores de
  consola. El guion está en `specs/19-statement-by-month/tasks.md:92`.
- **Septiembre de 2026 se verá corto:** tus datos acaban el día 11.
- Dos cosas anotadas para la rodaja siguiente, ninguna es un fallo: mientras carga un mes
  nuevo, las cifras del anterior siguen un instante en pantalla (la lista sí desaparece y la
  línea de carga nombra el mes que viene); y conviene extender a toda la vista el test que
  prohíbe las palabras «spent» / «earned» / «savings», hoy medido solo sobre el bloque de
  cifras. El detalle está en `progress/reviews/statement-by-month.md`.
- Deuda de tooling ya conocida: la suite unitaria tarda ~110 s y el 70 % es levantar el
  entorno de navegador simulado 74 veces. Merece su propia tarea de higiene.
