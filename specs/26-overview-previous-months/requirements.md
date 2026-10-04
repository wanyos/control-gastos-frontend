# Requirements — Feature 26: overview-previous-months (los meses anteriores, debajo del mes, en Overview)

> Derivado del bloque `intent` de la feature 26 en `feature_list.json` (fuente de
> verdad, incluidas sus cuatro `respuestas_del_humano`; texto aprobado por el humano el
> 2026-10-03) y de sus 11 criterios de `acceptance`. EARS estricto según
> `docs/specs.md`. **Segunda feature de la E8.** Es de **solo lectura**: no manda ni un
> `POST`, `PATCH` o `DELETE`. Va **debajo** de lo que construyó la F25, en la misma
> pantalla `/overview`, y no cambia ni el comportamiento ni los textos de la parte del mes.
>
> **Tamaño: 15 requirements + 9 restricciones**, en el tope de ~15 (regla 2 de
> `docs/specs.md`). No se parte: las filas de los meses y la frase del ahorro son el mismo
> bloque y leen lo mismo.
>
> **Entradas reales leídas antes de redactar** (regla 4 de `docs/specs.md`):
>
> - `../../../gastos-backend/docs/api-contract.md` §`GET /api/movements`: `from` / `to`
>   (`YYYY-MM-DD`, extremos incluidos) y `pageSize` (1–200). `totals` (`income`,
>   `expense`, `net`, strings decimales) se calculan **sobre todas las coincidencias del
>   filtro**, así que con un `from` y un `to` de meses distintos son las sumas del rango
>   entero, hechas por el backend. `pagination.total` cuenta todos los movimientos del
>   filtro. Orden `bookingDate DESC`. No hay endpoint que devuelva una serie de meses.
> - `specs/25-month-at-a-glance/` entero y el código que dejó: `src/features/overview/`
>   (`store.ts`, `reading.ts`, `service.ts`, `types.ts`, `views/OverviewView.vue`, los
>   cuatro componentes y sus cinco archivos de test), `src/features/statement/months.ts`,
>   `src/shared/money.ts`, `src/shared/movements.ts`, `src/shared/components/`
>   (`ShareBar`, `BaseBadge`, `BaseCard`, `BaseButton`), `src/assets/theme-dark.css` (las
>   líneas `contrast:` ya declaradas) y `e2e/overview.spec.ts`.
> - **Datos reales:** los que midió el leader el 2026-10-02 (33 meses, de 2024-01 a
>   2026-09; septiembre de 2026 incompleto, sus datos acaban el día 11) y los `totals`
>   reales de 2025-03 a 2026-09 que ya están en
>   `src/features/overview/__tests__/fixtures.ts`. Sumados aparte para esta spec
>   (aritmética sobre esas cifras, no una lectura nueva): de 2025-03 a 2026-08 (18 meses
>   completos) entran `60135.60`, salen `80934.73`, neto `-20799.13`, 863 movimientos; de
>   2025-09 a 2026-08 (12 meses) el neto es `4017.44`; la cifra más alta de esos 18 meses
>   es `11527.15` (gasto de 2025-07); 9 de los 18 tienen `net` negativo.
> - **Lo que NO se pudo leer.** El 2026-10-03 el backend no responde en
>   `http://localhost:3000` (`curl` a `GET /api/movements?pageSize=1`: sin conexión). Los
>   `totals` de 2024-10 a 2025-02 —cinco de los 24 meses— no están en el repositorio:
>   solo se conoce el gasto de 2024-11 (11.117 €, dicho por el leader). El comportamiento
>   no depende de esas cifras; los tests tratan esos cinco meses como lo que la fixture
>   dice de ellos (sin movimientos). La cifra real del ahorro de los 24 meses sale en la
>   comprobación final con el humano (T15).
> - `../../../docs/ideas.md` §4 («lo primero que se lee es una frase, no un gráfico»,
>   «barras horizontales», «cada vista dice de qué se fía»), `docs/vocabulary.md` (sin
>   términos aprobados) y `docs/lessons.md` (sin entradas).

## Cobertura del intent

| `como_se_que_esta_bien` | Requirements |
|---|---|
| Debajo del mes veo los meses anteriores, cada uno con lo que entró y lo que salió. | R1, R2, R3 |
| Distingo de un vistazo qué meses gasté más de lo que ingresé. | R4 (+ R3) |
| El mes que tengo arriba está señalado entre los demás. | R5, R6 |
| Pulso otro mes y pasa a ser el de arriba. | R7, R8 |
| Un mes incompleto está marcado como incompleto. | R9 |
| Un mes sin movimientos se ve como vacío, no como un cero. | R10 |
| Las cifras de cada mes son las mismas que veo si entro en ese mes. | R2, R15 |
| Veo lo que he ahorrado a lo largo de esos meses. | R11, R12, R14 |

## Definiciones (para este documento; no son términos de pantalla)

- **Mes de arriba:** el de `?month=YYYY-MM`, el que enseña la parte del mes de la F25.
- **Fecha del último dato**, **cifras de un mes**, **mes vacío / incompleto / completo:**
  las de `specs/25-month-at-a-glance/requirements.md`, sin cambios. Las cifras de un mes
  son `totals` y `pagination.total` de
  `GET /api/movements?from=<día 1>&to=<último día>&pageSize=1`, sin ningún otro filtro.
- **Los 24 meses:** los veinticuatro meses naturales consecutivos que **terminan en el
  mes de la fecha del último dato**, incluido. Hoy: de 2024-10 a 2026-09. No dependen
  del mes de arriba ni del reloj. Por construcción, solo el último puede estar incompleto.
- **Periodo sumado:** desde el día 1 del más antiguo de los 24 meses hasta el último día
  del más reciente que **no** está incompleto (el último de los 24 si la fecha del último
  dato es su último día; si no, el anterior). Hoy: del 2024-10-01 al 2026-08-31.
- **Cifras del periodo:** `totals` y `pagination.total` de
  `GET /api/movements?from=<inicio del periodo>&to=<fin del periodo>&pageSize=1`.

## El bloque y sus filas

### R1
MIENTRAS la fecha del último dato está cargada y no es nula, el sistema DEBE mostrar en
`/overview`, como último bloque de la página y debajo de todo lo que pinta la parte del
mes, un bloque con el título `Month by month` y una fila por cada uno de los 24 meses,
del más reciente al más antiguo.

### R2
MIENTRAS un mes de los 24 no está vacío, su fila DEBE mostrar el nombre del mes
(`formatMonthLabel`) y `totals.income`, `totals.expense` y `totals.net` de las cifras de
ese mes, con sus céntimos y sin recalcularlos, bajo las cabeceras `Money in`,
`Money out` y `Savings`.

### R3
MIENTRAS un mes de los 24 está completo, su fila DEBE mostrar dos barras horizontales,
una para `income` y otra para `expense`, cada una con un ancho igual a la parte que esa
cifra representa de la cifra más alta (`income` o `expense`) de todos los meses
completos de los 24, en décimas de punto porcentual.

### R4
MIENTRAS un mes de los 24 está completo, su fila DEBE pintar la cifra de `Savings` con
el token `negative` y el atributo `data-net="negative"` si `net` es menor que 0, con el
token `positive` y `data-net="positive"` si es mayor, y con `ink-strong` y
`data-net="zero"` si es 0.

## El mes de arriba

### R5
MIENTRAS el mes de arriba es uno de los 24, el sistema DEBE marcar su fila, y solo esa,
con `aria-current="true"`, un borde izquierdo de color `brand` y la etiqueta
`Shown above`.

### R6
SI el mes de arriba no es ninguno de los 24 ENTONCES el sistema DEBE mostrar sobre las
filas el texto `{Month} is not one of these months.` y no marcar ninguna fila.

### R7
CUANDO el usuario pulsa el nombre de un mes en una fila, el sistema DEBE navegar a
`/overview?month=<ese mes>` con una entrada nueva en el historial del navegador.

### R8
CUANDO el usuario pulsa el nombre de un mes en una fila, el sistema DEBE desplazar la
página hasta dejar a la vista la navegación de mes de la parte de arriba.

## Meses que no son un mes corriente

### R9
MIENTRAS un mes de los 24 está incompleto, su fila DEBE mostrar la etiqueta
`Incomplete`, sus tres cifras y, en el sitio de las barras, el texto
`Data ends on {date}` (la fecha del último dato con `formatDate`), sin ninguna barra y
sin atributo `data-net`.

### R10
MIENTRAS un mes de los 24 está vacío, su fila DEBE mostrar el nombre del mes y el texto
`No movements`, sin ninguna barra y sin ningún importe.

## Lo ahorrado

### R11
MIENTRAS las cifras de los 24 meses y las cifras del periodo están cargadas, el sistema
DEBE mostrar, como primer contenido del bloque bajo el título y antes de las filas, la
frase del **primer** caso que se cumpla de esta tabla, con `{in}`, `{out}` y `{net}`
tomados de las cifras del periodo en euros enteros (`formatMoneyWhole`), `{first}` el
nombre del más antiguo de los 24 meses y `{last}` el del último mes del periodo:

| # | Caso | Frase |
|---|---|---|
| 1 | `pagination.total` del periodo = 0 | `No complete months to add up yet.` |
| 2 | `net` > 0 | `From {first} to {last}, {in} came in and {out} went out: you saved {net}.` |
| 3 | `net` = 0 | `From {first} to {last}, {in} came in and {out} went out: you spent exactly what came in.` |
| 4 | `net` < 0 | `From {first} to {last}, {in} came in and {out} went out: you spent {−net} more than came in.` |

### R12
MIENTRAS el más reciente de los 24 meses está incompleto, el sistema DEBE mostrar bajo
la frase de R11 el texto `{Month} is left out: it is incomplete.`

## Fallos y coste

### R13
SI falla la lectura de la fecha del último dato o la de las cifras de alguno de los 24
meses ENTONCES el sistema DEBE mostrar, en lugar de la frase y de las filas, el texto
`Couldn't load these months.` y un botón `Try again` que pide solo lo que falta, sin
pintar ninguna fila.

### R14
SI falla la lectura de las cifras del periodo ENTONCES el sistema DEBE conservar las
filas y mostrar, en el sitio de la frase, el texto `Couldn't add up these months.`, sin
sumar en la pantalla las cifras de los meses.

### R15
El sistema NO DEBE pedir más de una vez en una visita las cifras de un mismo mes, las
necesite la parte del mes, este bloque o los dos a la vez.

## Restricciones

- **C1 — Solo lectura.** Todas las peticiones de la feature son `GET` a
  `/api/movements`. Ningún `POST`, `PATCH` ni `DELETE`, a ninguna ruta.
- **C2 — La parte del mes no cambia.** No se modifican `reading.ts`, los cuatro
  componentes de la F25 (`MonthSentence`, `MonthFiguresGrid`, `UsualLine`,
  `UncategorizedLine`), ningún archivo de `src/features/statement/` ni de
  `src/features/import/`, ni los tests `reading.spec.ts`, `store.spec.ts`,
  `service.spec.ts` y `components.spec.ts` de `overview`. Todos los textos y el orden de
  la parte del mes siguen igual. Lo único que cambia en tests de la F25 son las cinco
  aserciones que contaban las peticiones de **toda** la pantalla o que afirmaban que
  debajo del mes no había nada (lista cerrada en `design.md` §7).
- **C3 — Las cifras son del backend.** La pantalla no suma ni movimientos ni meses: las
  cifras de cada fila son las de su mes y las de la frase son las del periodo, tal como
  las da el backend. La única aritmética de este bloque es elegir la cifra más alta de
  los meses completos y dividir cada cifra entre ella para el ancho de su barra, y
  cambiar el signo de `net` en la frase. En céntimos `bigint` con `src/shared/money.ts`;
  nunca `Number()` ni `parseFloat` sobre un importe.
- **C4 — Lo leído vale para una visita.** Lo que este bloque lee vive en el store de
  `overview`, junto a lo de la F25 (nunca en una variable de módulo); se descarta al
  entrar en la pantalla y se vuelve a leer cuando termina una importación, sin tocar
  `src/features/import/`.
- **C5 — Sin entrada de menú ni ruta nuevas.** El bloque vive en `/overview`.
- **C6 — Sin reparto por categoría** ni fijo frente a variable.
- **C7 — Nombres propios.** Ningún elemento del bloque usa un `data-test` de la parte
  del mes (`money`, `overview-figures`, `overview-caption`, `overview-uncategorized*`,
  `overview-statement-link`, `overview-error*`, `overview-retry*`): todos los suyos
  empiezan por `previous-months`.
- **C8 — Inglés, tema oscuro, tokens semánticos** y contraste declarado en
  `theme-dark.css` para cada par nuevo; números en `font-mono tabular-nums`; sin
  dependencias nuevas.
- **C9 — `./init.sh` termina con exit 0** y los `checks` de la feature, en verde.

## Procedencia

- R1 — (humano) «Debajo del mes… quiero ver los meses anteriores»; **veinticuatro** por
  su respuesta. (delegado) «Qué meses se enseñan… lo que sea más fácil»: decido que son
  siempre los 24 que terminan en el mes del último dato, y que no se mueven con el mes
  de arriba. Alternativa: los 24 anteriores al mes de arriba. (delegado) el orden, del
  más reciente al más antiguo, y el título `Month by month`. ← REVISAR.
- R2 — (humano) «lo que entró y lo que salió en cada uno» y «las cifras de cada mes son
  las mismas que veo si entro en ese mes». (añadido) la tercera cifra, `Savings`, que es
  el `net` del backend y es lo que permite R4.
- R3 — (delegado) «Cómo se dibuja: barras, una tabla con cifras, o las dos cosas»: las
  dos, en la misma fila. (delegado) la escala: una sola, hasta la cifra más alta de los
  meses completos. Alternativa: recortar la escala. ← REVISAR.
- R4 — (humano) «Distingo de un vistazo qué meses gasté más de lo que ingresé».
  (delegado) cómo: el color y el signo de `Savings`.
- R5 — (humano) «El mes que tengo arriba está señalado entre los demás». (delegado) cómo
  se señala, incluida la etiqueta `Shown above`.
- R6 — (añadido) El humano no dijo qué pasa cuando el mes de arriba no está entre los
  24 (hoy: octubre de 2026, que es donde abre la pantalla, y de enero a septiembre de
  2024). Sale de fijar los meses en R1. ← REVISAR.
- R7 — (humano) «Pulso otro mes y pasa a ser el de arriba». Lo propuso el agente en el
  borrador y el humano lo aprobó el 2026-10-03.
- R8 — (añadido) El humano no pidió que la página suba. Sin ello, quien pulsa la fila 20
  no ve qué cambió. ← REVISAR.
- R9 — (humano) «Un mes incompleto está marcado como incompleto». Criterio de la F25,
  por el `acceptance`. (delegado) que no lleve barras ni entre en la escala.
- R10 — (humano) «Un mes sin movimientos se ve como vacío, no como un cero». Lo propuso
  el agente en el borrador y el humano lo aprobó el 2026-10-03.
- R11 — (humano) «Veo lo que he ahorrado a lo largo de esos meses». (delegado) que sea
  una frase y lo primero del bloque (`ideas.md` §4). (añadido) que las cifras se pidan
  al backend en una sola petición con el rango entero, en vez de sumar aquí los 24
  `net`: así no hay nada calculado en la pantalla que avisar. El `acceptance` del leader
  preveía la otra vía («si se calcula en el cliente… la pantalla lo dice»); el humano no
  ha visto ninguna de las dos. (añadido) el caso 1. ← REVISAR.
- R12 — (añadido) dejar el mes incompleto fuera de lo ahorrado, y decirlo. Sale de «que
  un mes incompleto se vea como incompleto, no como un mes en el que casi no gasté».
  ← REVISAR.
- R13 — (añadido) El humano no habló de fallos. Mismo criterio que R14 de la F25: nada a
  medias.
- R14 — (añadido) Si falla la suma, no se sustituye por una hecha aquí. ← REVISAR con R11.
- R15 — (delegado) «Cuántas peticiones más cuesta y si se aprovechan las que ya hace la
  parte del mes»: se comparten. Entrar a un mes completo pasa de 15 a 27 peticiones.
- C1, C5, C6 — (humano) «solo mira», «no quiero otra entrada en el menú», «no quiero
  reparto por categoría ni fijo frente a variable».
- C2 — (humano) «no quiero que cambie nada de la parte del mes». (añadido) la lista de
  las cinco aserciones de test que sí cambian. ← REVISAR.
- C3 — (humano) heredado de la F25 («no quiero cifras inventadas»).
- C4, C7, C8, C9 — (delegado) criterios ya vigentes en la F25 y el `acceptance`.
