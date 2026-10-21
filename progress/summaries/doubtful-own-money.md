# Resumen — feature 35 `doubtful-own-money`

Fecha de cierre: 2026-10-21
Intención original: `feature_list.json` → feature `doubtful-own-money`, bloque `intent`
Spec: `specs/35-doubtful-own-money/`

## Qué verás distinto

**En `Transfers`:** arriba del todo hay una sección nueva, `Doubtful: between your accounts?`.
Cada movimiento dudoso sale en una tarjeta con fecha, cuenta, concepto, importe con signo y
el motivo (qué banco nombra y de qué cuenta tuya), y dos botones: `It's mine` y `Not mine`.
Un clic responde, sin pregunta. La línea verde de arriba lo confirma y trae `Undo`, que
deshace solo esa última respuesta. Si no hay ninguno, lo dice con una frase.

**En el menú:** junto a `Transfers` sale un número con los dudosos que quedan, igual que el
de `Review`. Con 0 no sale nada.

**Al importar:** si han entrado dudosos que antes no estaban, el informe trae una línea en
ámbar: `2 new doubtful movements: say in Transfers whether they are yours.`

**En `Movements`:** lo que el backend reconoce como dinero entre tus cuentas sale tachado y
en gris, con `Between your accounts` junto a la cuenta. Un dudoso sale con
`Doubtful · names … · counts until you answer in Transfers` en ámbar y el importe sin
tachar, porque cuenta. La casilla `Hide what does not count` esconde también lo de entre
tus cuentas y lo suma a `Hiding`; un dudoso no lo esconde.

**Con tus datos de hoy** (comprobado solo leyendo): no hay ningún dudoso, así que no sale el
número y `Transfers` dice que no hay ninguno. Hay 68 movimientos `Between your accounts`;
todos son además parejas de traspaso o están marcados como que no cuentan, así que llevan
también `Transfer` o `Not counted`. Las cifras de arriba siguen siendo las de la API.

## Qué no hace

- No toca el backend ni las cifras: que «es mío» deje de contar lo decide el backend.
- No responde nada solo, ni varios a la vez: siempre uno, y siempre con tu clic.
- No hay lista de lo ya respondido: pasado el `Undo`, se corrige desde la API.
- La lista enseña como mucho 200 dudosos; el número del menú dice el total.
- `Review` no pinta nada de esto, y la nota plegada bajo las cifras de `Movements` no lo
  menciona (incoherencia conocida, dicha en la hoja).
- Un dudoso real no se ha podido probar: hoy no hay ninguno (cabo suelto 42 de
  `docs/roadmap.md`).

## Por dónde se toca (puntos de entrada)

| Cómo se usa | Código |
| --- | --- |
| La sección de dudosos en `Transfers` | [TransfersView.vue:21](../../src/features/transfers/views/TransfersView.vue#L21) |
| Responder `It's mine` / `Not mine` | [store.ts:250](../../src/features/transfers/store.ts#L250) |
| El número junto a `Transfers` | [AppSidebar.vue:47](../../src/shared/components/AppSidebar.vue#L47) |
| `Between your accounts` / `Doubtful` en `Movements` | [StatementRow.vue:46](../../src/features/statement/components/StatementRow.vue#L46) |
| Lectura de dudosos antes y después de importar | [store.ts:79](../../src/features/import/store.ts#L79) |
| Lectura de `ownership` que manda la API | [movements.ts:286](../../src/shared/movements.ts#L286) |

## Dónde está el código

### Lectura y pintado comunes

| Qué hace | Dónde |
| --- | --- |
| Tipos, lectura obligatoria de `ownership` y filtro `ownership=doubtful` | [movements.ts](../../src/shared/movements.ts) → `OwnershipStatus`, `MovementOwnership`, `parseOwnership`, `parseMovement`, `buildMovementsQuery` |
| Qué es de entre tus cuentas, qué es dudoso, el texto, conservarlo tras un PATCH | [ownership.ts](../../src/shared/ownership.ts) → `isBetweenOwnAccounts`, `isDoubtfulOwnership`, `ownershipLine`, `withKnownOwnership` |
| El número en el menú | [AppSidebar.vue](../../src/shared/components/AppSidebar.vue) → `TRANSFERS_ROUTE_NAME` |

### `Transfers`

| Qué hace | Dónde |
| --- | --- |
| Las dos lecturas y la respuesta con cuerpo literal | [service.ts](../../src/features/transfers/service.ts) → `getDoubtfulOwnership`, `countDoubtfulOwnership`, `setOwnershipDecision` |
| Lista, número, responder y deshacer | [store.ts](../../src/features/transfers/store.ts) → `fetchOwnership`, `refreshDoubtfulCount`, `answerOwnership`, `undo`, `reloadLists` |
| Textos y motivo | [pairs.ts](../../src/features/transfers/pairs.ts) → `OWNERSHIP_HEADING`, `MINE_NOTICE`, `NOT_MINE_NOTICE`, `ANSWER_UNDONE_NOTICE`, `ownershipReason`, `ownershipWriteError` |
| Tipos | [types.ts](../../src/features/transfers/types.ts) → `OwnershipDecision`, `Undo`, `Gesture` |
| La tarjeta, la lista y el número | [DoubtfulOwnershipRow.vue](../../src/features/transfers/components/DoubtfulOwnershipRow.vue), [DoubtfulOwnershipList.vue](../../src/features/transfers/components/DoubtfulOwnershipList.vue), [DoubtfulOwnershipCountBadge.vue](../../src/features/transfers/components/DoubtfulOwnershipCountBadge.vue) |
| La sección en la pantalla | [TransfersView.vue](../../src/features/transfers/views/TransfersView.vue) → `ownership-section` |

### `Movements`

| Qué hace | Dónde |
| --- | --- |
| Tachado, gris y textos de la línea | [StatementRow.vue](../../src/features/statement/components/StatementRow.vue) → `ownershipText`, `isDoubtfulOwn`, `isLeftOut` |
| La casilla y conservar `ownership` tras cambiar la categoría | [store.ts](../../src/features/statement/store.ts) → `hiddenBySwitch`, `adoptUpdated` |

### Importación

| Qué hace | Dónde |
| --- | --- |
| Leer los ids de los dudosos | [service.ts](../../src/features/import/service.ts) → `readDoubtfulIds` |
| Contar los nuevos y poner al día el número | [store.ts](../../src/features/import/store.ts) → `newDoubtfulCount`, `start` |
| La línea del informe | [summary.ts](../../src/features/import/summary.ts) → `newDoubtfulLine`; [ImportDialog.vue](../../src/features/import/components/ImportDialog.vue) → `import-new-doubtful` |

### Tests

| Qué cubre | Dónde |
| --- | --- |
| Lectura de `ownership` y el filtro | [movements.spec.ts](../../src/shared/__tests__/movements.spec.ts), [ownership.spec.ts](../../src/shared/__tests__/ownership.spec.ts) |
| Responder, deshacer, fallos, uno a la vez, el número | [store.spec.ts](../../src/features/transfers/__tests__/store.spec.ts), [service.spec.ts](../../src/features/transfers/__tests__/service.spec.ts) |
| La tarjeta, la sección, el número | [DoubtfulOwnershipRow.spec.ts](../../src/features/transfers/__tests__/DoubtfulOwnershipRow.spec.ts), [TransfersView.spec.ts](../../src/features/transfers/__tests__/TransfersView.spec.ts), [DoubtfulOwnershipCountBadge.spec.ts](../../src/features/transfers/__tests__/DoubtfulOwnershipCountBadge.spec.ts), [AppShell.spec.ts](../../src/shared/components/__tests__/AppShell.spec.ts) |
| `Movements` | [StatementRow.spec.ts](../../src/features/statement/__tests__/StatementRow.spec.ts), [StatementView.spec.ts](../../src/features/statement/__tests__/StatementView.spec.ts), [store.spec.ts](../../src/features/statement/__tests__/store.spec.ts) |
| Importación | [store.spec.ts](../../src/features/import/__tests__/store.spec.ts), [summary.spec.ts](../../src/features/import/__tests__/summary.spec.ts), [ImportDialog.spec.ts](../../src/features/import/__tests__/ImportDialog.spec.ts) |
| En un navegador, sin backend | [doubtful-own-money.spec.ts](../../e2e/doubtful-own-money.spec.ts); los otros 13 archivos de `e2e/` contestan vacío la lectura nueva |

## Cumplimiento de la intención

Resultados reales de `./init.sh --checks 35` (12 de 12 en verde):

- ✅ «Veo la lista de dudosos con su concepto, importe, fecha y el motivo» →
  `shows the date, account, description, signed amount and reason of a doubtful movement`,
  `lists the doubtful movements of own money above the doubtful transfers`. Check ✅.
- ✅ «Digo "es mío" y deja de contar; digo "no es mío" y cuenta y deja de salir como
  dudoso» → la pantalla manda exactamente esa respuesta y lo quita de la lista
  (`answering it is mine sends mine…`, `answering not mine sends not_mine…`, y en el
  navegador `answering it is mine sends one PATCH with mine…`). Que deje de contar lo hace
  el backend. Check ✅.
- ✅ «Puedo deshacer lo que acabo de decidir» → `undo sends a null decision for the same
  movement and reloads` y, en el navegador, `answering not mine and then undo puts the
  movement back in the list`. Check ✅.
- ✅ «Si no hay ninguno, me lo dice» → `says there are no doubtful movements when the list
  is empty`; visto también con tus datos. Check ✅.
- ✅ «Me entero sin tener que buscarlos» → el número (`shows the number of doubtful
  movements only when there are some`, `puts the doubtful count next to Transfers and
  nowhere else`, y en el navegador) y la línea del informe (`counts the doubtful movements
  that were not there before the import`, `says how many new doubtful movements the import
  brought`). Check ✅.
- ✅ «Si falla, me lo dice y no ha cambiado nada» → `a rejected answer says why and leaves
  the list as it was`, `a failed read of the doubtful movements offers Try again and leaves
  the other sections alone`. Check ✅.
- ✅ (añadidos) uno a uno y nada sin tu clic; tachado, ámbar y la casilla en `Movements`;
  error si el backend dejara de mandar el dato; sigue tachado tras cambiar la categoría.
  Checks 7 a 12 ✅.

## Decisiones que se tomaron por ti

- (delegado) Cómo se dibujan la sección, la tarjeta y los dos botones.
- (delegado) `Undo` solo de la última respuesta, en la línea de aviso de la pantalla.
- (delegado) La línea del informe cuenta los dudosos de después que no estaban antes.
- (delegado) La casilla esconde lo de entre tus cuentas y no los dudosos.
- (añadido) El número cuenta solo estos dudosos, no los grupos de `Doubtful transfers`;
  `mine` se pinta como `own`; un movimiento de depósito no cambia.
- (técnico) Si el backend dejara de mandar `ownership`, `Movements`, `Review`,
  `Overview`, `Rules` y `Transfers` dan error en vez de pintar mal.

## Notas para el futuro

- La sección es un bloque con `role="region"` y no un `<section>`, para no cambiar una
  prueba de la feature 24 (decisión del leader).
