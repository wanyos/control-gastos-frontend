# Requirements — Feature 25: month-at-a-glance (el mes de un vistazo: una frase, tres cifras y si fue un mes normal)

> Derivado del bloque `intent` de la feature 25 en `feature_list.json` (fuente de
> verdad, incluidas sus cuatro `respuestas_del_humano`) y de sus 12 criterios de
> `acceptance`. EARS estricto según `docs/specs.md`. **Primera feature de la E8.**
> Es de **solo lectura**: no manda ni un `POST`, `PATCH` o `DELETE`.
>
> **Tamaño: 15 requirements + 9 restricciones**, en el tope de ~15 (regla 2 de
> `docs/specs.md`). No se parte: la frase, las cifras, la comparación y la línea de
> honestidad son la misma lectura de un mes, y la tira del año —lo único separable—
> ya está fuera, en una feature posterior.
>
> **Entradas reales leídas antes de redactar** (regla 4 de `docs/specs.md`):
>
> - `../../../gastos-backend/docs/api-contract.md`:
>   - §`GET /api/movements` — `from`/`to` (`YYYY-MM-DD`, extremos incluidos), `type`,
>     `uncategorized=true`, `transfer=none`, `excluded=none`, `pageSize` (1–200).
>     Responde `{ movements, pagination, totals }`; `totals` (`income`, `expense`,
>     `net`, strings decimales) se calculan **sobre todas las coincidencias del
>     filtro**, y dejan fuera los `neutral`, las dos piernas de un traspaso, las
>     aportaciones a producto y lo marcado con `excludedFromTotals`.
>     `pagination.total` cuenta **todos** los movimientos del filtro, cuenten o no en
>     las sumas. El orden es `bookingDate DESC`: el primero de la lista sin filtros es
>     el movimiento más reciente de toda la base. Un filtro sin coincidencias es 200
>     con totales a `"0.00"`.
>   - §`GET /api/overview` — `month=YYYY-MM`; `period.totals` es **la misma suma** que
>     los `totals` de `GET /api/movements`. Trae además `totalBalance` y las cinco
>     cuentas en cada respuesta, y **no trae recuento de movimientos**.
>   - No existe ningún endpoint de serie de meses, de medias ni de medianas.
> - **Datos reales, leídos con `GET` contra `http://localhost:3000` el 2026-10-02**
>   (cero escrituras), los 36 meses de 2023-11 a 2026-10:
>   - `GET /api/movements?pageSize=1` → el movimiento más reciente es del
>     **2026-09-11**; 1.607 movimientos en total.
>   - Agosto de 2026: `totals` `2590.26` / `4003.89` / `-1413.63`, 70 movimientos, e
>     idénticos a `period.totals` de `GET /api/overview?month=2026-08`.
>   - Septiembre de 2026: `161.82` / `966.84` / `-805.02`, 28 movimientos (incompleto).
>   - Octubre de 2026 y todo lo anterior a enero de 2024: `0.00` los tres, 0 movimientos.
>   - Gasto sin categoría de agosto de 2026 (`type=expense&uncategorized=true`):
>     `totals.expense` = `3036.33`. Con `transfer=none&excluded=none` el importe **no
>     cambia** (lo excluido ya no suma) y `pagination.total` pasa de 51 a **48**: solo
>     así el recuento habla de los mismos movimientos que el importe.
>   - **Coste medido:** 108 peticiones (36 meses × 3) en 0,7 s en local; ~5 ms cada una.
>   - **Las medias de doce meses, con datos reales.** Gasto del mes frente a la media de
>     sus doce anteriores: 2025-10 −58 %, 2025-11 −69 %, 2025-12 −48 %, 2026-01 −65 %,
>     2026-02 −63 %, 2026-03 −46 %, 2026-04 +5 %, 2026-05 +20 %, 2026-06 +20 %,
>     2026-07 −8 %, 2026-08 +4,5 % (media 3.833,05 €). **Con la mediana** (la que se
>     usa, corrección del 2026-10-02), gasto: 2025-10 −58,5 %, 2025-11 −69,6 %, 2025-12
>     −45,1 %, 2026-01 −53,5 %, 2026-02 −36,8 %, 2026-03 −6,1 %, 2026-04 +72,2 %,
>     2026-05 +89,1 %, 2026-06 +90,0 %, 2026-07 +38,0 %, 2026-08 +34,9 % (mediana
>     2.967,58 €); entrada: −8,8, −8,8, +119,3, +35,4, −13,1, +91,0, +10,3, +195,1,
>     +82,1, −1,4 y −12,2 % (mediana 2.950,00 €). **La media está arrastrada por
>     meses anteriores a los doce «limpios»:** 2025-07 lee 11.527,15 € de gasto,
>     2025-08 10.941,80 €, 2024-11 11.117,32 € y 2024-08 20.680,32 €.
> - Código: `src/features/statement/months.ts` y `components/MonthNav.vue` (el mes en
>   la URL y la navegación), `src/shared/movements.ts` (`getMovements`,
>   `MovementQuery`, `Totals`), `src/shared/money.ts` (`toCents`, `fromCents`,
>   `sharePermille`, `formatMoney`, `formatPercent`, `formatDate`),
>   `src/features/net-worth/sentence.ts` (cómo se redacta una frase interpretada),
>   `src/shared/components/{StatCard,BaseCard,BaseBadge,ShareBar}.vue`,
>   `src/router/index.ts` (la ruta `/overview` existe hoy con `PlaceholderView`) y
>   `src/features/import/store.ts` (cómo refresca a `net-worth` tras importar).
> - `docs/intent-e8-draft.md` y `../../../docs/ideas.md` §4 (refinada el 2026-08-22).

## Cobertura del intent

| `como_se_que_esta_bien` | Requirements |
|---|---|
| Lo primero que leo es una frase ya interpretada, no un gráfico. | R4 |
| Veo lo que entró, lo que salió, el ahorro y la tasa de ahorro. | R5, R6, R7 |
| Me dice si gasté más o menos que de costumbre, contra los doce anteriores (mediana, corrección del 2026-10-02). | R10, R11 |
| Me dice qué parte del gasto de ese mes no tiene categoría. | R12 |
| Si el mes está incompleto, me lo dice en vez de una tasa disparatada. | R8, R4 |
| Puedo cambiar de mes y volver, y recargar sin perder el mes. | R2, R3 |
| Las cifras cuadran con las del extracto del mismo mes. | R5, R14, C2 (+ T final con el humano) |

## Vocabulario

- **Mes mostrado:** el de `?month=YYYY-MM`.
- **Cifras del mes:** `totals` y `pagination.total` de
  `GET /api/movements?from=<día 1>&to=<último día>&pageSize=1`, sin ningún otro filtro.
- **Fecha del último dato:** el `bookingDate` del primer movimiento de
  `GET /api/movements?pageSize=1` (sin filtros); `null` si la base está vacía.
- **Mes vacío:** `pagination.total` = 0.
- **Mes incompleto:** no vacío y la fecha del último dato es **anterior** (como texto
  `YYYY-MM-DD`) al último día del mes.
- **Mes completo:** ni vacío ni incompleto.
- **Meses de referencia:** de los doce meses naturales anteriores al mostrado, los que
  no están vacíos. `N` es cuántos son (0–12).
- **Mediana** (en pantalla, «your usual month»): ordenadas las `N` cifras del backend,
  la central si `N` es impar, y la media de las dos centrales si `N` es par (en
  céntimos enteros, redondeada una sola vez, mitad hacia fuera del cero).

## Pantalla y mes

### R1
El sistema DEBE servir en la ruta `/overview` la vista del mes en lugar de
`PlaceholderView`, conservando la entrada `Overview` de la barra lateral con su icono
y en su posición actual.

### R2
CUANDO se abre `/overview` con un `month` que no es un `YYYY-MM` válido o sin él, el
sistema DEBE mostrar el mes natural en curso sin enseñar ningún error.

### R3
CUANDO el usuario cambia de mes con las flechas o con el selector de mes, el sistema
DEBE escribir el mes nuevo en `?month=` con una entrada nueva en el historial del
navegador.

## La frase

### R4
MIENTRAS las cifras del mes y la fecha del último dato están cargadas, el sistema DEBE
mostrar, como primer contenido bajo la navegación de mes y antes de cualquier cifra,
la frase del **primer** caso que se cumpla de esta tabla (importes de la frase en
euros enteros; `{rate}` con un decimal):

| # | Caso | Frase |
|---|---|---|
| 1 | Mes vacío posterior a la fecha del último dato | `No movements in {Month}. Your data ends on {date}.` |
| 2 | Mes vacío (cualquier otro) | `No movements in {Month}.` |
| 3 | Mes incompleto | `{Month} is incomplete: your data ends on {date}. So far, {in} came in and {out} went out.` |
| 4 | `income` = 0 y `expense` = 0 | `In {Month}, nothing that counts came in or went out.` |
| 5 | `income` = 0 | `In {Month}, nothing came in and {out} went out.` |
| 6 | `net` > 0 | `In {Month}, {in} came in and {out} went out: you saved {net}, {rate} of what came in.` |
| 7 | `net` = 0 | `In {Month}, {in} came in and {out} went out: you spent exactly what came in.` |
| 8 | `net` < 0 | `In {Month}, {in} came in and {out} went out: you spent {−net} more than came in.` |

## Las cifras

### R5
MIENTRAS el mes mostrado no está vacío, el sistema DEBE mostrar `totals.income`,
`totals.expense` y `totals.net` de las cifras del mes, con sus céntimos y sin
recalcularlos, bajo las etiquetas `Money in`, `Money out` y `Savings`.

### R6
MIENTRAS el mes mostrado está completo y su `income` es mayor que 0, el sistema DEBE
mostrar bajo la etiqueta `Savings rate` el cociente `net` / `income` como porcentaje
con un decimal.

### R7
SI el mes mostrado está completo y su `income` es 0 ENTONCES el sistema DEBE mostrar
`—` en `Savings rate` junto al texto `No income this month, so there is no savings rate.`

### R8
MIENTRAS el mes mostrado está incompleto, el sistema DEBE mostrar `—` en `Savings rate`
junto al texto `Not shown: the month is incomplete.` y, en lugar de la comparación, el
texto `No comparison for an incomplete month.`

### R9
MIENTRAS el mes mostrado está vacío, el sistema NO DEBE mostrar ninguna cifra, ni la
comparación, ni la línea del gasto sin categoría.

## Si fue un mes normal

### R10
MIENTRAS el mes mostrado está completo y `N` ≥ 1, el sistema DEBE mostrar, bajo
`Money in` y bajo `Money out`, la mediana de esa cifra en los meses de referencia, la
diferencia del mes con ella en porcentaje (`above` / `below your usual month`) y una de
tres etiquetas: `About usual` si la diferencia no supera el 25 % de la mediana en
ningún sentido, `More than usual` si la supera por arriba, `Less than usual` si la
supera por abajo.

### R11
MIENTRAS el mes mostrado está completo, el sistema DEBE mostrar bajo las cifras una
leyenda que diga con cuántos meses se comparó y que la cifra se calcula en la
pantalla: con `N` = 12, `Your usual month is the middle value of the previous 12
months, worked out here from each month's totals.`; con 2 ≤ `N` < 12, `Your usual
month is the middle value of the {N} previous months with data, worked out here from
each month's totals.`; con `N` = 1, `Your usual month is the only previous month with
data.`; con `N` = 0, `No earlier months to compare with.`

## De qué se fía

### R12
MIENTRAS el mes mostrado no está vacío y su `expense` es mayor que 0, el sistema DEBE
mostrar una línea con el gasto sin categoría del mes —`totals.expense` y
`pagination.total` de `GET /api/movements` con `from`, `to`, `type=expense`,
`uncategorized=true`, `transfer=none`, `excluded=none` y `pageSize=1`—, el gasto del
mes y el porcentaje que representa:
`{uncategorized} of this month's {out} spending has no category yet ({share}, {n} movements).`
(`movement` en singular con 1), y `All of this month's spending has a category.`
cuando ese importe es 0.

## Fallos y salida

### R13
SI falla la carga de las cifras del mes o de la fecha del último dato ENTONCES el
sistema DEBE mostrar, en lugar de la frase y de las cifras, un texto propio en inglés
(nunca el `message` del backend) y un botón `Try again` que repite la carga.

### R14
SI falla la carga de alguno de los meses de referencia o la del gasto sin categoría
ENTONCES el sistema DEBE conservar la frase y las cifras del mes y mostrar, en el sitio
de lo que falló, `Couldn't load the previous months, so there is no comparison.` (con
`Try again`) o `Couldn't check how much of this spending has a category.`, sin
calcular una mediana con los meses que sí llegaron.

### R15
MIENTRAS el mes mostrado no está vacío, el sistema DEBE mostrar un enlace
`See the movements of {Month}` que abre `/movements?month=<mes mostrado>` sin ningún
otro filtro.

## Restricciones

- **C1 — Solo lectura.** Todas las peticiones de la feature son `GET` a
  `/api/movements`. Ningún `POST`, `PATCH` ni `DELETE`, a ninguna ruta.
- **C2 — Las cifras son del backend.** La pantalla nunca suma movimientos. La única
  aritmética de cliente permitida es: (a) la **mediana** de `N` totales mensuales del
  backend; (b) lo que se deriva de **dos** cifras: la tasa (`net`/`income`), el
  porcentaje sin categoría (sin categoría/`expense`), la diferencia de una cifra con
  su mediana, y el cambio de signo de `net` para la frase. Todo en céntimos `bigint` con
  `src/shared/money.ts`; nunca `Number()` ni `parseFloat` sobre un importe.
- **C3 — Lo leído vale para una visita.** Lo que se lee de un mes se guarda en el store
  de la feature (nunca en una variable de módulo) y se reutiliza mientras la pantalla
  está abierta; se descarta al entrar en la pantalla y cuando termina una importación.
- **C4 — Gana la última.** Si el mes cambia antes de que llegue una respuesta, la
  respuesta vieja se descarta y no pinta nada.
- **C5 — No cambia nada de lo anterior.** `/` sigue redirigiendo a `net-worth`; el
  orden y las etiquetas de la barra lateral no cambian; ningún test de `statement`,
  `net-worth`, `review`, `transfers` o `category-rules` se modifica. Únicas ediciones
  fuera de la carpeta nueva: `src/router/index.ts`, `src/shared/money.ts` (una función
  añadida) y `src/features/import/store.ts` (una llamada añadida).
- **C6 — Sitio para la tira del año, sin construirla.** La vista es una columna cuyo
  último bloque es el del mes; no se pinta ningún hueco, título ni texto de «próximamente».
- **C7 — Sin reparto por categoría** ni ningún gráfico por categoría.
- **C8 — Inglés, tema oscuro, tokens semánticos** y contraste declarado en
  `theme-dark.css` para cada par nuevo; números en `font-mono tabular-nums`; sin
  dependencias nuevas.
- **C9 — `./init.sh` en verde**, con lint y formato incluidos.

## Procedencia

- R1 — (delegado) «Dónde va en el menú y cómo se llama». Decido usar la entrada
  `Overview`, que ya está en el menú y hoy está vacía, sin moverla. Alternativas:
  llamarla `Month`, o subirla justo debajo de `Net Worth`. ← REVISAR.
- R2 — (humano) «recargar sin perder el mes que miraba». La caída silenciosa al mes en
  curso con una URL inválida repite la decisión ya aprobada en la F19.
- R3 — (humano) «Puedo cambiar de mes y volver».
- R4 — (humano) la frase como primer contenido y el caso de déficit, que es su ejemplo
  literal traducido al inglés. (delegado) el texto de los casos 3, 5, 6 y el uso de
  euros enteros en la frase. (añadido) los casos 1, 2, 4 y 7, que el humano no
  nombró. ← REVISAR.
- R5 — (humano) «Veo lo que entró, lo que salió, el ahorro». (delegado) las etiquetas.
- R6 — (humano) «y la tasa de ahorro».
- R7 — (delegado) «mes sin ingresos»: no hay tasa que enseñar; se dice por qué.
- R8 — (delegado) «Cómo se decide que un mes está incompleto» y qué se enseña. Decido
  el criterio del vocabulario (fecha del último dato anterior al último día del mes),
  que no finge saber hasta cuándo se importó. ← REVISAR.
- R9 — (añadido) El humano no dijo qué se ve en un mes sin movimientos. ← REVISAR.
- R10 — (humano) «si gasté más o menos que de costumbre», comparado con los doce meses
  anteriores; **mediana y no media por corrección expresa del humano en la puerta
  (2026-10-02)**, que sustituye a la frase del `intent`. (delegado) «cómo se enseña sin llenar la pantalla de
  números»: tres etiquetas y un umbral del 25 %. (añadido) aplicar la misma
  comparación a lo que entró, no solo al gasto. ← REVISAR.
- R11 — (delegado) «Qué se hace cuando no hay doce meses anteriores»: se compara con
  los que haya y se dice con cuántos. La mención de que la cifra se calcula en la
  pantalla sale del `acceptance` («queda dicho así») y de «que me diga de qué se fía».
- R12 — (humano) «cuánto del gasto de ese mes todavía no tiene categoría». (delegado)
  de dónde sale la cifra; (añadido) el recuento de movimientos y los dos filtros que
  lo hacen coincidir con el importe.
- R13 — (añadido) El humano no habló de fallos de carga. Mismo criterio que F19.
- R14 — (añadido) Si falla lo secundario, no se inventa una mediana parcial. Sale de «si
  algo no se sabe, que lo diga».
- R15 — (añadido) El enlace al extracto del mismo mes. El humano no lo pidió; sirve
  para comprobar que las cifras cuadran. ← REVISAR.
- C1, C7 — (humano) «solo mira», «no quiero un reparto por categoría».
- C2 — (humano) «no quiero cifras inventadas» y el `acceptance` («lo único que se
  calcula en el cliente es esa media»; desde la corrección, esa mediana).
- C3 — (añadido) refrescar tras una importación toca `import/store.ts`. ← REVISAR.
- C4, C8, C9 — (delegado) criterios ya vigentes en F19–F24.
- C5 — (humano) «no quiero que sustituya a Patrimonio como pantalla de inicio».
- C6 — (humano) «el mes arriba y, en una feature posterior, la tira del año debajo».
