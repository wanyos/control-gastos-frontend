# Resumen — feature 22 `statement-exclude-from-totals`

Fecha de cierre: 2026-09-29
Intención original: `feature_list.json` → feature `statement-exclude-from-totals`, bloque `intent`
Spec: `specs/22-statement-exclude-from-totals/`

## Qué hace ahora la app que antes no

Ahora puedes decirle a un movimiento del extracto que **no cuenta en tus sumas**, y
hacerlo con varios a la vez. En `/movements` aparece un botón `Select movements`: al
pulsarlo, cada línea saca una casilla y arriba sale una barra. Marcas las que quieras y
pulsas `Exclude from totals`; para devolverlas, `Include in totals`. Lo marcado **sigue
en la lista** —con una etiqueta gris `Not counted` y el importe apagado— y las tres
cifras del mes se vuelven a pedir al backend en ese momento, así que bajan de verdad.

Es la primera vez que el extracto mueve las cifras. Antes solo podía corregir una
categoría, y eso no cambiaba ninguna suma.

Con esto ya puedes apartar el ruido de tus sumas: filtras por la cuenta, mes a mes, y vas
marcando. Los 29 apuntes de depósito de myinvestor (el 58 % del ruido) **ya están
marcados** desde la sesión del backend; te quedan los 17 traspasos propios sin pareja.

## Por dónde se usa (puntos de entrada)

- Pantalla `/movements` → botón **`Select movements`** (aparece debajo de las cifras).
- Con el modo encendido: casilla en cada línea, `Select all shown`, `Clear selection`,
  `Exclude from totals`, `Include in totals`, `Done`.
- De 20 movimientos en adelante sale una pregunta con el número exacto antes de escribir.
- Tras cada acción, una línea encima de la lista dice lo que hizo (`3 movements excluded
  from totals`) con un **`Undo`** sin cuenta atrás que devuelve exactamente esos.
- Contra la API: **una sola** petición `PATCH /api/movements` con el cuerpo
  `{ ids, excludedFromTotals }`, y después un `GET /api/movements` del mes para traer las
  cifras nuevas.

## Dónde está el código (para revisión directa)

| Qué | Archivo:línea |
|-----|---------------|
| La única función que escribe la marca (construye el cuerpo) | `src/features/statement/service.ts:34` |
| El campo nuevo en el tipo del movimiento | `src/shared/movements.ts:76` |
| Validación en frontera (obligatorio, booleano) | `src/shared/movements.ts:215` |
| La barrera que impide que viaje algo que no sea un booleano | `src/shared/movements.ts:303` |
| El PATCH en bloque (mudado aquí desde `review`) | `src/shared/movements.ts:375` |
| Tope de 200 del contrato | `src/shared/movements.ts:344` |
| Modo selección (encender, apagar, marcar filas) | `src/features/statement/store.ts:347-375` |
| «Solo viajan los que de verdad cambian» | `src/features/statement/store.ts:382` |
| El gesto completo: escribir, adoptar filas, repedir el mes | `src/features/statement/store.ts:396` |
| Deshacer la última tanda | `src/features/statement/store.ts:441` |
| La selección se vacía al cambiar de mes o de filtro | `src/features/statement/store.ts:141` |
| Umbral de 20 y las frases en inglés | `src/features/statement/actions.ts:64-106` |
| Casilla, etiqueta `Not counted` e importe apagado | `src/features/statement/components/StatementRow.vue:8,44,189` |
| La barra del modo selección | `src/features/statement/components/StatementSelectionBar.vue` |
| La pregunta a partir de 20 | `src/features/statement/components/ExcludeConfirmDialog.vue` |
| Dónde se monta todo y se decide si preguntar | `src/features/statement/views/StatementView.vue:40,119,284` |
| Test principal del cuerpo de la petición | `src/features/statement/__tests__/service.spec.ts:130` |
| Test de «una petición y una relectura del mes» | `src/features/statement/__tests__/store.spec.ts:832` |
| Test de que las cifras no se calculan aquí | `src/features/statement/__tests__/store.spec.ts:1034` |
| Recorridos en navegador real | `e2e/statement-exclude-from-totals.spec.ts` |

## Cumplimiento de la intención

Por cada punto de `como_se_que_esta_bien`:

- ✅ «Marco un movimiento y las sumas del mes bajan al momento en ese importe» → se
  cumple; verificado en `src/features/statement/__tests__/store.spec.ts:832` (las cifras
  pasan a ser las nuevas del backend) y en `e2e/statement-exclude-from-totals.spec.ts:270`
  (de `240,00` a `210,00` en pantalla).
- ✅ «Marco varios de una vez, sin repetir el gesto uno por uno» → se cumple; una sola
  petición con los tres ids, verificado en `store.spec.ts:844` y en el e2e `:262`.
- ✅ «Un movimiento marcado se ve distinto en la lista» → se cumple; etiqueta `Not
  counted` e importe apagado, verificado en
  `src/features/statement/__tests__/StatementRow.spec.ts:221` y `:240`.
- ✅ «Le quito la marca y las sumas vuelven a incluirlo» → se cumple; verificado en
  `store.spec.ts:893` y `:934` (el `Undo` devuelve las cifras exactas del principio).
- ✅ «El importe, la fecha, la descripción y el saldo no cambian nunca» → se cumple; el
  cuerpo que sale es exactamente `{ ids, excludedFromTotals }` y nada más, verificado
  letra por letra en `src/features/statement/__tests__/service.spec.ts:130` y en el e2e
  `:263`. El contrato garantiza además que esa escritura no toca importes ni saldos.
- ✅ «Si algo falla, me lo dice y no me deja la pantalla diciendo algo que no es» → se
  cumple; frases en inglés escritas aquí (nunca las del backend, que vienen en español y
  nombran ids) y recarga del mes cuando el fallo pudo haber escrito algo; verificado en
  `store.spec.ts:986` (400, no recarga), `:1006` (404, recarga) y `:1022` (red).
- ✅ «Puedo encontrar rápido lo que quiero marcar filtrando por myinvestor» → se cumple;
  los filtros de la F20 siguen intactos, y la selección se vacía al cambiar de filtro para
  que no marques algo que ya no ves (`store.spec.ts:810`).

## Decisiones que se tomaron por ti

- (delegado) **Las casillas solo salen cuando las pides.** Con el modo apagado el
  extracto se ve como siempre; encendido, la etiqueta de categoría deja de ser pulsable
  para que un clic no signifique dos cosas. Vive en `store.ts:347` y
  `StatementRow.vue:69`.
- (delegado) **Un movimiento marcado se ve con una etiqueta gris y el importe apagado**,
  sin fondo de color ni tachado: filtrando por myinvestor casi todas las líneas del mes
  estarán marcadas. `StatementRow.vue:44` y `:189`.
- (delegado) **Se pregunta a partir de 20 movimientos**, el mismo umbral de la cola de
  revisión. Tu tanda típica (de 1 a 10) no verá nunca el diálogo. `actions.ts:64`.
- (delegado) **Hay `Undo` además de «vuelve a pulsar»**, sin cuenta atrás y sobre
  exactamente los movimientos que cambiaron. `store.ts:441`.
- (añadido) **Un único camino de escritura**: siempre la petición de bloque, también
  cuando has marcado uno solo. Un solo cuerpo que vigilar. `service.ts:34`.
- (añadido) **Solo viajan los que de verdad cambian**: si seleccionas 10 y siete ya
  estaban marcados, la petición lleva tres. `store.ts:382`.
- (añadido) **Si todo lo seleccionado ya está como lo pides, no se manda nada** y la
  pantalla dice `Nothing to change`. `store.ts:425`.
- (añadido) **El campo nuevo es obligatorio al leer la respuesta**: si el backend dejara
  de mandarlo, la pantalla avisa en vez de dar por no marcado el mes entero.
  `movements.ts:215`.

## Qué NO se tocó / quedó fuera

- **El backend no se toca.** El campo y los dos endpoints ya existían (su feature 49).
- **No se esconde lo marcado.** Apartado de las sumas no es escondido: sigue en la lista.
  El interruptor del ruido (y los filtros `excluded` / `transfer` del contrato, que aquí
  no se usan) son la rodaja siguiente.
- **La nota permanente del mes sigue diciendo que las cifras están infladas**, sin cambiar
  ni una palabra. Es deliberado: la reescribe la feature siguiente. Verificado con `git`:
  `MonthTotals.vue` y su test no tienen ni una línea de diff.
- **No se puede marcar desde la cola de revisión**, solo desde el extracto.
- **Nada marca nada por su cuenta**: ni reglas, ni heurísticas, ni «marcar todos los
  DEP.». La marca la escribes siempre tú.
- **Marcar es trabajo tuyo, a mano**, filtrando por cuenta y mes. Los 29 depósitos ya
  quedaron marcados desde el backend (ver «Notas para el futuro»); los 17 traspasos
  propios sin pareja siguen a tu cargo, y también los movimientos nuevos de myinvestor
  cada vez que importes.

## Notas para el futuro

- **Probado contra tus datos reales (T23), el 2026-09-29 y con tu visto bueno.** Se
  marcó y se desmarcó el movimiento 42373 desde la pantalla: la entrada de agosto bajó de
  **2.590,26 € a 2.240,26 €** al marcarlo y volvió exacta al deshacer. Salieron dos
  `PATCH` en bloque con el cuerpo justo (`ids` y `excludedFromTotals`, nada más), y el
  antes y el después del movimiento son idénticos salvo la hora de modificación.
- **Los 29 apuntes de depósito ya están marcados.** No tienes que marcarlos tú: los marcó
  la sesión del backend al probar su feature 49 contra los datos reales. El efecto ya se
  nota en las cifras: el histórico pasa de **446.014 / 439.372 €** a **170.512 /
  154.522 €**, y julio de 2026 de **57.948 / 59.096 €** a **2.785,90 / 4.096,05 €**. Lo
  que queda a mano son los traspasos propios sin pareja.
- El recuento y las cifras dejan de cuadrar a ojo: «93 movements» sigue contando los
  marcados, pero las tres cifras ya no los incluyen. Lo explicará el interruptor.
- `Undo` deshace solo la última tanda, y muere al cambiar de mes o de filtro.
- Las líneas de documentación que quedaron desfasadas con este cambio **ya están
  corregidas** al cerrar: `docs/architecture.md`, `docs/stack.md` y
  `docs/verification.md`. Detalle en `progress/reviews/statement-exclude-from-totals.md`.
