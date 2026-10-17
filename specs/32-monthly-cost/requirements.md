# Requirements — F32 `monthly-cost`

Pantalla nueva `Monthly cost` (`src/features/monthly-cost/`, ruta `/monthly-cost`).
17 requirements (dos por encima del tope: R4 y R12, los dos `(añadido)`; dicho en
`decisions.md`). Fuente: el `intent` de la feature 32 y el contrato
`gastos-backend/docs/api-contract.md` → `GET /api/recurring-expenses` (feature 58 del
backend, commit `72a5357`), leído el 2026-10-17.

**Definiciones usadas en todo el documento.**

- **La respuesta:** el cuerpo de `GET /api/recurring-expenses`, ya validado y mapeado por
  `service.ts` (design §2).
- **Recibo:** un elemento de `bills`. **Recibo sin cargos en el periodo:** el que tiene
  `monthlyCost` igual a `"0.00"`.
- **Transferencias a personas:** el objeto `transfersToPeople`.
- **Gasto variable:** la lista `variable`, un elemento por categoría (o `category: null`).
- **Una entrada:** un recibo, el grupo de transferencias a personas o un elemento de
  `variable`. Cada una trae su `monthlyCost` y sus `movements` (sus cargos).
- **Los cargos de una entrada:** sus `movements`, en el orden en que llegan (del más
  reciente al más antiguo, según el contrato).

Los textos exactos de pantalla están en `design.md §4`; los requirements los citan por su
`data-test` o por su nombre en `texts.ts`.

## Entrar en la pantalla

## R1
El sistema DEBE tener en el menú lateral una entrada `Monthly cost`, con el icono
`ReceiptEuro`, justo debajo de `Overview`, que lleva a la ruta `/monthly-cost` y monta
`MonthlyCostView`.

## R2
CUANDO se monta `MonthlyCostView`, el sistema DEBE hacer exactamente una petición
`GET /api/recurring-expenses`, sin parámetros ni cuerpo, y ninguna petición de otro método
desde esta pantalla.

## R3
MIENTRAS esa petición no ha respondido, el sistema DEBE enseñar la frase
`LOADING_LINE` (`data-test="monthly-cost-loading"`) y ninguna cifra.

## Arriba: la cifra

## R4
CUANDO la respuesta llega, el sistema DEBE enseñar arriba, en una `StatCard` con la
etiqueta `What a month costs`, `monthlyTotal` con `formatMoney`, y debajo la frase del
periodo `periodLine(period)`, que nombra el primer y el último mes de `period.months` con
`formatMonthLabel` y dice que son los 12 meses completos anteriores al actual
(`data-test="monthly-cost-period"`).

## R5
CUANDO la respuesta llega con al menos un recibo, el sistema DEBE enseñar debajo de la
frase del periodo la línea `increasedLine(subidos, total)`
(`data-test="monthly-cost-increased"`), donde `subidos` es el número de recibos con
`hasIncreased: true` y `total` el número de recibos.

## Los recibos

## R6
El sistema DEBE pintar cada recibo en una fila (`data-test="bill-row"`) con: su nombre
(`billTitle(key)`: la `key` con la primera letra en mayúscula) y debajo, pequeño, su `name`
tal cual; su `periodicityLabel(periodicity)`; su `usualAmount` con `formatMoney` seguido de
`usualSuffix(periodicity)`; `lastDate` con `formatDate`; su cambio (R8); y su `monthlyCost`
con `formatMoney`.

## R7
El sistema DEBE traducir `periodicity` con la tabla de `design.md §4`
(`monthly` → `Monthly`, `annual` → `Yearly`…), y SI llega un valor que no está en la tabla
ENTONCES DEBE enseñar ese valor tal cual, sin error.

## R8
El sistema DEBE enseñar el cambio de un recibo así: con `hasIncreased: true`, un
`BaseBadge` de tono `negative` con `Up <change>` (`data-test="bill-increase"`) y debajo
`was <previousMonthAmount>`; con `change` negativo, el texto atenuado `Down <|change|>`;
con `change` `"0.00"`, `Same`; con `change` `null`, `No earlier charge`. Solo los recibos
con `hasIncreased: true` llevan el badge.

## R9
El sistema DEBE pintar primero, en el orden en que llegan, los recibos con `monthlyCost`
distinto de `"0.00"`, y después, dentro de un `<details>` cerrado al cargar
(`data-test="bills-without-charges"`) cuyo `<summary>` es
`noChargesSummary(n, period)`, los recibos sin cargos en el periodo, también en el orden en
que llegan. SI no hay ninguno sin cargos ENTONCES ese `<details>` NO DEBE existir.

## R10
CUANDO se pulsa el botón `Show charges` de un recibo, el sistema DEBE enseñar debajo de su
fila la lista de sus cargos (`data-test="charge-list"`), uno por línea con
`bookingDate` (`formatDate`), `amount` (`formatMoney`) y `description`, con el
encabezado `chargesHeading('bill', n)`, y el botón DEBE pasar a decir `Hide charges`;
pulsarlo otra vez la cierra.

## Lo que envío a personas y el gasto variable

## R11
El sistema DEBE pintar, después de los recibos, un bloque `Sent to people`
(`data-test="people-block"`) con una fila `Transfers to people` y el
`monthlyCost` de `transfersToPeople` con `formatMoney`.

## R12
El sistema DEBE dejar abrir con `Show charges` el grupo de transferencias a personas y
cada fila del gasto variable, con la misma lista de R10 y el encabezado
`chargesHeading('period', n)`.

## R13
El sistema DEBE pintar, después de `Sent to people`, un bloque `Variable spending`
(`data-test="variable-block"`) con una fila por elemento de `variable`, en el orden en que
llegan (`data-test="variable-row"`), con `category.name` (o `No category` si `category` es
`null`) y su `monthlyCost` con `formatMoney`.

## Que la suma cuadre

## R14
El sistema DEBE enseñar en la cabecera de cada uno de los tres bloques su subtotal con
`formatMoney`: `Bills`, la suma de los `monthlyCost` de todos los recibos (también los sin
cargos); `Sent to people`, el `monthlyCost` del grupo; `Variable spending`, la suma de los
`monthlyCost` de sus filas. Las sumas se hacen en céntimos con `sumAmounts`
(`data-test="block-subtotal"`).

## R15
SI la suma de todos los `monthlyCost` de la respuesta (recibos, grupo y gasto variable)
no es igual a `monthlyTotal` ENTONCES `parseRecurringExpenses` DEBE lanzar
`ValidationError` con el texto `monthly costs do not add up to monthlyTotal`.

## Si falla o no hay nada

## R16
SI la petición falla o la respuesta no se puede leer ENTONCES el sistema DEBE enseñar, en
lugar de las cifras, el mensaje `monthlyCostErrorMessage(error)`
(`data-test="monthly-cost-error"`) y un botón `Try again`
(`data-test="monthly-cost-retry"`) que, al pulsarlo, repite la petición de R2.

## R17
CUANDO la respuesta llega con `bills` y `variable` vacíos y `transfersToPeople.monthlyCost`
`"0.00"`, el sistema DEBE enseñar la cifra y el periodo de R4 y, en lugar de los tres
bloques, la frase `EMPTY_LINE` (`data-test="monthly-cost-empty"`).

## Procedencia

- R1 — (humano) Sale de «va en una entrada nueva del menú, `Monthly cost`»
  (`respuestas_del_humano`, 2026-10-17). **(delegado)** el sitio y el icono: justo
  debajo de `Overview`, porque es la otra pantalla de mirar cifras; `ReceiptEuro`, el
  icono de Lucide de un recibo con euro. Alternativa descartada: al final del menú, debajo
  de `Investments` (queda separada de `Overview`).
- R2 — (humano) Sale de «No quiero que la pantalla escriba nada» y de «No quiero tocar el
  backend: ya calcula todo»: una sola lectura, la que ya existe.
- R3 — (añadido) El humano no dijo qué se ve mientras carga. Propongo una frase, como en
  `Overview`. ← menor; no sube a 🔴.
- R4 — (humano) «Veo arriba lo que me cuesta un mes, y el periodo del que sale.»
- R5 — (añadido) El humano no pidió una línea con cuántos recibos han subido. La propongo
  porque su `por_que` es «enterarme cuando me suben un recibo […] sin tener que ir
  mirándolos uno a uno». ← REVISAR EN APROBACIÓN (🔴 6).
- R6 — (humano) «Veo cada recibo con su nombre, lo que cuesta al mes, cada cuánto se
  cobra, cuándo fue el último cargo, y si ha subido, cuánto.» **(delegado)** el nombre en
  pantalla: la `key` con mayúscula inicial y el concepto del banco debajo. Alternativa
  descartada: solo el concepto del banco (largo y en mayúsculas). **(añadido)** el importe
  habitual de cada cobro (`usualAmount`), para R7.
- R7 — (humano) «Un recibo anual se lee como anual, no como uno mensual al que le faltan
  meses.» Los textos de cada periodicidad los propongo yo (el leader lo pidió). Un valor
  desconocido se enseña tal cual: decisión técnica para que un valor nuevo del backend no
  deje la pantalla en blanco.
- R8 — (humano) «Distingo de un vistazo los recibos que han subido» y «si ha subido,
  cuánto». El texto de bajadas, iguales y sin cargo anterior es (añadido) menor: el
  humano solo habló de subidas, pero la columna tiene que decir algo en las otras filas.
- R9 — (humano) «los recibos, de más caro a más barato al mes» y «los recibos sin cargos
  en el periodo, al final y plegados» (`respuestas_del_humano`, 2026-10-17). El orden de
  más caro a más barato ya lo da el contrato; la pantalla no reordena.
- R10 — (humano) «Puedo abrir un recibo y ver sus cargos, con su fecha y su importe.»
  **(delegado)** desplegados debajo de la fila, no en una ventana. Alternativa descartada:
  ventana (tapa la lista y no deja comparar dos recibos). La descripción del cargo es
  (añadido) menor: el contrato la trae y deja comprobar que es el recibo que toca.
- R11 — (humano) «Veo lo que envío a personas como un grupo aparte, con lo que cuesta al
  mes.»
- R12 — (añadido) El humano solo pidió abrir los recibos. Propongo abrir también el grupo
  de personas y cada categoría: el contrato ya trae sus cargos y sirve para ver qué hay en
  `Otros gastos`. ← REVISAR EN APROBACIÓN (🔴 5).
- R13 — (humano) «Veo el gasto variable por categoría, con lo que cuesta al mes cada una.»
- R14 — (humano) «La suma de lo que veo da la cifra de arriba.» **(delegado)** los
  subtotales por bloque, sumados en la pantalla en céntimos exactos: es la forma de que el
  humano pueda comprobar la suma con tres cifras en vez de veinticuatro.
- R15 — (humano) La misma frase. Decisión técnica: si lo que llega no cuadra, la pantalla
  no lo enseña como si cuadrara.
- R16 — (humano) «Si el backend falla, me lo dice y puedo volver a intentarlo.»
- R17 — (añadido) El contrato define la respuesta vacía; el humano no dijo qué se ve. Una
  frase en lugar de bloques vacíos. ← menor; no sube a 🔴.
