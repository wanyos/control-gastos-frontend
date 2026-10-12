# Requirements — F29 `statement-readable`

Pantalla `Movements` (`src/features/statement/`). 15 requirements.

**Definición usada en todo el documento.** Un movimiento **no cuenta en las sumas**
cuando `movement.excludedFromTotals === true` **o** `movement.transferId !== null`.
En cualquier otro caso **cuenta** (también el de `type: 'neutral'`, que es un importe 0
y esta feature no toca).

## La línea de un movimiento (`StatementRow.vue`)

## R1
MIENTRAS un movimiento no cuenta en las sumas, el sistema DEBE pintar su importe
(`data-test="statement-row-amount"`) con las clases `text-ink-faint` y `line-through`,
sea cual sea su `type`.

## R2
MIENTRAS un movimiento no cuenta en las sumas, el sistema DEBE pintar su concepto
(`data-test="statement-row-description"`) con `text-ink-muted` en lugar de
`text-ink-strong`.

## R3
MIENTRAS un movimiento cuenta en las sumas, el sistema DEBE pintar su importe sin
`line-through` y con el color que tiene hoy: `text-positive` si `type` es `income`,
`text-ink-strong` si es `expense`, `text-ink-muted` si es `neutral`.

## R4
MIENTRAS un movimiento no cuenta en las sumas, el sistema DEBE seguir pintando su
etiqueta de categoría (`data-test="statement-row-category"`) con el nombre de su
categoría, o `Uncategorized` si no tiene.

## R5
El sistema DEBE pintar las etiquetas `Transfer` (`data-test="statement-row-transfer"`)
y `Not counted` (`data-test="statement-row-excluded"`) como texto en el segundo renglón
de la línea, a continuación del nombre de la cuenta
(`data-test="statement-row-account"`), y no como `BaseBadge` junto a la etiqueta de
categoría; cada una conserva su `title` y su condición de aparición actuales.

## R6
MIENTRAS un movimiento tiene categoría, el sistema DEBE pintar su etiqueta de categoría
con `BaseBadge` en `tone="neutral"`, tanto si `type` es `income` como si es `expense`, y
tanto si la etiqueta es un botón como si no lo es.

## R7
MIENTRAS un movimiento no tiene categoría, el sistema DEBE pintar la etiqueta
`Uncategorized` con borde discontinuo (`border-dashed border-line-default`), sin fondo
(sin ninguna clase `bg-*`) y con `text-ink-muted`.

## La explicación de debajo de las cifras (`MonthTotals.vue`)

## R8
El sistema DEBE pintar siempre a la vista, dentro de
`data-test="statement-totals-note"`, la frase exacta
`These figures leave out the movements labelled "Transfer" or "Not counted".`

## R9
El sistema DEBE pintar el resto de la explicación dentro de un elemento `<details>`
(`data-test="statement-totals-more"`) que aparece cerrado (sin atributo `open`) y cuyo
`<summary>` dice `More about what counts`.

## R10
El sistema DEBE pintar dentro de ese `<details>`, en este orden y con este texto exacto,
cinco frases, cada una en su propio elemento de lista:

1. `They stay in the list, with the amount crossed out. Tick "Hide what does not count" to take them off the list.`
2. `"Transfer" is put by the app on the two movements of a transfer between your accounts. "Not counted" is put by you.`
3. `A movement that is left out keeps its category: the category says what it was, the label says it is not in the sums.`
4. `If only one of the two movements of a transfer was imported, it still counts until you mark it as "Not counted".`
5. `The app can pair two movements that are not a transfer. Unlink them in "Transfers".`

## R11
CUANDO `ambiguousGroups` es un número mayor que 0, el sistema DEBE pintar la frase de
los grupos sin emparejar (`data-test="statement-ambiguous-note"`, texto actual sin
cambios) como último elemento de la lista de dentro del `<details>`; con `null` o `0`
ese elemento no existe.

## Un mes en el que la lista sale vacía con la casilla puesta

«La casilla» es `Hide what does not count` (`hide=true` en la URL, `store.hideNoise`).
«La lectura sin esconder» es la petición que el store ya hace hoy con la casilla puesta
(`hiddenCountQuery`: el mismo mes y los mismos filtros, sin esconder nada, una fila), de
la que hoy solo guarda la resta.

## R12
CUANDO la casilla está puesta, la respuesta del mes trae `pagination.total` 0 y la
lectura sin esconder trae `pagination.total` 0, el sistema DEBE pintar el mismo bloque
de lista vacía que pinta con la casilla sin poner: `No movements in <mes>.` sin botón si
no hay filtros activos, y `No movements match these filters in <mes>.` con `Clear
filters` si los hay; en ningún caso el botón `Show everything`.

## R13
CUANDO la casilla está puesta, la respuesta del mes trae `pagination.total` 0 y la
lectura sin esconder trae `pagination.total` mayor que 0, el sistema DEBE pintar el
bloque actual `data-test="statement-nothing-left"` (la frase `Nothing left to show in
<mes>: …is hidden.` en sus dos variantes de hoy) con el botón `Show everything`.

## R14
SI la casilla está puesta, la respuesta del mes trae `pagination.total` 0 y el resultado
de la lectura sin esconder no se conoce (aún no ha llegado, o falló) ENTONCES el sistema
DEBE pintar un bloque `data-test="statement-nothing-shown"` con la frase
`Nothing to show in <mes> while "Hide what does not count" is ticked.` y el botón
`Show everything`.

## R15
MIENTRAS la lectura sin esconder dice que el mes (con sus filtros) tiene 0 movimientos,
el sistema NO DEBE pintar la línea `Hiding N movements`
(`data-test="statement-hidden-count"`).

## Restricciones (no son requirements; se comprueban igual)

- **C1 — Ninguna petición nueva.** Con la casilla puesta, cargar un mes sigue haciendo
  exactamente dos `GET /api/movements` (el mes y la lectura sin esconder); con la
  casilla sin poner, una. Test: `asks the backend for nothing new to tell an empty month
  from a hidden one`.
- **C2 — Contraste.** Cada par de color que la feature pone sobre un fondo nuevo tiene
  su línea `contrast:` en `src/assets/theme-dark.css` (ver `design.md §4`).
- **C3 — `Review` no cambia.** No se toca nada de `src/features/review/` ni
  `src/shared/components/BaseBadge.vue`.
- **C4 — Lo de la feature 27 sigue igual.** `StatementRow.vue` conserva
  `:data-movement-id="movement.id"` en su `<li>`, y `StatementView.vue` conserva el
  bloque `StickyBelowTopBar` con `StatementActionNotice`, sin cambios.
- **C5 — No cambia ninguna cifra ni qué cuenta.** No se toca `service.ts`,
  `actions.ts` ni `src/shared/movements.ts`; en `store.ts` solo se guarda un dato más
  de una respuesta que ya se pedía.

## Cobertura de `como_se_que_esta_bien`

| Frase del humano | Requirements |
|---|---|
| Un movimiento que no cuenta se distingue a simple vista, sin leer su etiqueta | R1, R2 |
| Su importe no se confunde con el de uno normal | R1, R3, C2 |
| Sé por qué una etiqueta de categoría tiene el color que tiene, o todas el mismo | R6 |
| Un movimiento sin categoría se distingue de uno que la tiene | R7 |
| Entiendo qué quiere decir `Not counted` y una categoría a la vez | R4, R5, R10 (frase 3) |
| Leo la explicación de debajo de las cifras y sé qué incluyen y qué no | R8, R9, R10, R11 |
| Mes sin movimientos con la casilla puesta: dice que no tiene movimientos | R12, R15 |
| Mes con todo escondido: dice que está escondido, con la forma de enseñarlo | R13 |

## Procedencia

- R1 — (delegado) «Cómo se distingue lo que no cuenta». Decido importe tachado y en el
  gris `--ink-faint`, nunca verde ni blanco, igual para lo marcado por el humano y para
  los dos movimientos de un traspaso emparejado (el `intent` nombra los dos). Descartado:
  bajar la opacidad de toda la línea (el contraste deja de poder medirse con las líneas
  `contrast:` y la categoría, que debe seguir leyéndose, también pierde tinta).
  Sustituye a la decisión 🔴 2 de la feature 22 («ni tachado»), que el humano reabrió en
  su revisión.
- R2 — (delegado) Misma delegación: el concepto baja de blanco a gris claro para que la
  diferencia se vea en toda la línea y no solo en la columna del importe.
- R3 — (humano) «No quiero que cambie ninguna cifra»; el verde «se queda solo en el
  importe, que ya dice si entra o sale» (respuesta del 2026-10-12).
- R4 — (humano) Respuesta del 2026-10-12: «le parece bien que un movimiento que no
  cuenta enseñe su categoría».
- R5 — (añadido) El humano no pidió mover `Transfer` ni `Not counted`. Al quedar todas
  las etiquetas de categoría grises (R6), esas dos serían idénticas a una categoría y
  puestas a su lado; las paso a texto bajo el concepto, junto a la cuenta, para que lo
  que tiene forma de etiqueta sea siempre y solo la categoría. ← REVISAR EN APROBACIÓN.
- R6 — (humano) Respuesta del 2026-10-12: «las etiquetas de categoría, todas iguales y
  sin color».
- R7 — (delegado) «Qué colores quedan y con qué significado». Sin color, la falta de
  categoría se dice con la forma: borde discontinuo y sin fondo. Descartado: etiqueta
  ámbar (vuelve a meter un color en las etiquetas, que es lo que el humano quitó).
- R8 — (delegado) «Cómo queda redactada la explicación»; la forma (una frase a la vista,
  el resto plegado) es (humano), respuesta del 2026-10-12. La frase nombra las dos
  etiquetas que el humano ve en la lista en vez de «paired transfer legs».
- R9 — (humano) «El resto plegado para abrirlo si quiere». El texto del `<summary>` es
  (delegado).
- R10 — (delegado) Redacción. La frase 3 responde a «entiendo qué quiere decir una línea
  que lleva `Not counted` y una categoría a la vez». La frase 5 nombra `Transfers`
  porque esa pantalla tiene el botón `Unlink`
  (`src/features/transfers/components/TransferPairRow.vue`).
- R11 — (añadido) El humano no dijo dónde va la cuarta frase de hoy. La dejo con su
  texto, plegada con el resto. ← REVISAR EN APROBACIÓN.
- R12 — (humano) «Abro un mes sin movimientos con la casilla puesta y la pantalla dice
  que ese mes no tiene movimientos». (añadido) la parte de los filtros: con filtros
  activos y nada que coincida ni siquiera sin esconder, la frase es la de los filtros,
  porque quitar la casilla no enseñaría nada. ← REVISAR EN APROBACIÓN.
- R13 — (humano) «Abro un mes en el que todo lo que hay está escondido por la casilla y
  la pantalla sí dice que está escondido, con la forma de enseñarlo».
- R14 — (añadido) El dato que distingue los dos casos llega en una segunda respuesta,
  después de la del mes, y puede fallar. Mientras no se sabe, la frase no afirma ni «no
  hay» ni «están escondidos». ← REVISAR EN APROBACIÓN.
- R15 — (añadido) El humano señaló `Hiding 0 movements` en el mes vacío como parte del
  fallo. En un mes que sí tiene movimientos, `Hiding 0 movements` se mantiene: ahí es
  cierto y dice que la casilla no está quitando nada. ← REVISAR EN APROBACIÓN.
