# Design — Feature 24: transfer-pairs-review

> Cómo se construye lo que pide `requirements.md`. Se apoya en
> `docs/architecture.md` y `docs/conventions.md`: aquí solo se documentan los puntos
> donde esta feature roza sus fronteras.

## 1. Los hechos del contrato que ordenan el diseño

1. **Deshacer deja memoria.** Tras `DELETE /api/transfers/:transferId` la detección no
   vuelve a unir esas dos piernas, y `GET /api/transfers/ambiguous` usa la misma
   función de emparejado: la pareja deshecha **no reaparece como dudosa**. El único
   camino de vuelta desde la web es el `Undo` inmediato (R7), que usa
   `POST /api/transfers` — el contrato dice que ese enlace manual no consulta la
   memoria.
2. **Enlazar y deshacer mueven las sumas del histórico**, no las de esta pantalla:
   aquí no se enseña ninguna cifra agregada, ni se calcula. Lo que se promete en
   pantalla (R5, R6, R12) es lo que el contrato dice que pasa; la comprobación de que
   pasa de verdad se hace en el extracto (T final).
3. **Los dudosos se calculan en cada petición.** Tras cualquier escritura se vuelven a
   pedir las dos listas (R6, R7, R12, R13), nunca se parchea la lista a mano: una
   pareja deshecha puede crear un grupo nuevo, y un enlace puede deshacer uno.
4. **El `amount` de un grupo dudoso es del grupo.** Todos sus movimientos lo tienen,
   así que la única validación de cliente que queda por hacer es la de cuenta (R11);
   la de tipo la hace la forma de la pantalla (R10: una columna por tipo).

## 2. Archivos

### Nuevos — `src/features/transfers/`

| Archivo | Qué |
|---|---|
| `types.ts` | `TransferPair { transferId: string; expense: Movement; income: Movement }`; `AmbiguousMovement { id; accountId; accountAlias; type: 'expense' \| 'income'; bookingDate; description }`; `AmbiguousGroup { key: string; amount: DecimalString; out: AmbiguousMovement[]; in: AmbiguousMovement[] }`; `LinkChoice { outId: number \| null; inId: number \| null }`. |
| `service.ts` | Las cuatro llamadas de la feature (§3). Ninguna otra. |
| `pairs.ts` | Puras: `mentionsBizum(pair)`, `linkProblem(group, choice)`, `unlinkConsequence(pair)`, `groupKey(ids)`, los textos fijos y `transferWriteError(error, gesture)`. |
| `store.ts` | `useTransfersStore` (setup store), §4. |
| `views/TransfersView.vue` | La página: línea de aviso arriba, sección `Doubtful transfers`, sección `Linked pairs (N)`, y el diálogo. |
| `components/TransferPairList.vue`, `TransferPairRow.vue` | Lista y pareja (dos piernas + etiqueta `Bizum` + botón `Unlink`). |
| `components/AmbiguousGroupList.vue`, `AmbiguousGroupCard.vue` | Grupos dudosos: dos columnas con radios, frase de R11, `Link these two`. |
| `components/UnlinkConfirmDialog.vue` | Copia adaptada de `statement/components/ExcludeConfirmDialog.vue` sobre `BaseDialog`; `Cancel` con `data-autofocus`. |
| `components/TransfersActionNotice.vue` | Copia de `statement/components/StatementActionNotice.vue` (C5). |
| `__tests__/*.spec.ts` + `__tests__/fixtures.ts` | Ver `tasks.md`. Las fixtures incluyen **las dos multas reales** (ids, conceptos y fechas tal cual) y **tres parejas buenas reales**, y grupos dudosos **fabricados** de 2, 3 y 4 movimientos. |
| `e2e/transfer-pairs-review.spec.ts` | Con `/api/transfers*` interceptado y la red de seguridad que aborta cualquier otro `/api`. |

### Nuevo — `src/shared/transfers.ts`

Solo las dos rutas: `TRANSFERS_PATH = '/api/transfers'` y
`AMBIGUOUS_TRANSFERS_PATH = '/api/transfers/ambiguous'`. Motivo:
`docs/architecture.md` baja una pieza a `shared/` cuando la **segunda** feature la
pide, y el extracto ya lee `/api/transfers/ambiguous` desde la F23.

### Modificados

- `src/router/index.ts` — ruta `{ path: '/transfers', name: 'transfers', component:
  TransfersView, meta: { label: 'Transfers', icon: Link2 } }` **justo después de
  `rules`** (R1).
- `src/router/__tests__/router.spec.ts` — las dos listas exhaustivas de nombres y
  etiquetas ganan la entrada en su sitio.
- `src/features/statement/service.ts` — importa `AMBIGUOUS_TRANSFERS_PATH` de
  `@/shared/transfers` y lo **re-exporta** con el mismo nombre; `getAmbiguousCount`
  **no cambia** (sigue leyendo solo `ambiguousCount`). Ningún test del extracto se
  toca.
- `docs/architecture.md` — la carpeta `features/transfers/` y `shared/transfers.ts` en
  el árbol, y una nota: esta es la pantalla que escribe `transferId`.

## 3. El service: cuatro funciones, cuerpos literales

```ts
export function getTransferPairs(client?: HttpClient): Promise<TransferPair[]>
export function getAmbiguousGroups(client?: HttpClient): Promise<AmbiguousGroup[]>
export function linkMovements(expenseId: number, incomeId: number, client?: HttpClient): Promise<string> // transferId
export function unlinkPair(transferId: string, client?: HttpClient): Promise<void>
```

- `linkMovements` escribe el literal `{ movementIds: [expenseId, incomeId] }` con
  `method: 'POST'` (C1, R15). Recibe dos números: no hay por dónde colar otro campo.
  Devuelve solo el `transferId` del 201 (validado como string no vacío); los
  `movements` del 201 no se usan porque después se recargan las listas.
- `unlinkPair` → `DELETE ${TRANSFERS_PATH}/${encodeURIComponent(transferId)}`. El 204
  llega sin cuerpo: se comprueba en T0 qué devuelve `http.ts` ante un 204 y, si
  intentara leer JSON, se lee con la forma que ya use otro `DELETE` de la app
  (`category-rules/service.ts` borra reglas).
- `getTransferPairs` valida con `createValidators('GET /api/transfers')`: `pairs` es
  array; cada entrada tiene `transferId` string y `movements` de longitud 2; cada
  pierna pasa por `parseMovement` de `@/shared/movements`; la primera es `expense` y
  la segunda `income`. Si no, `ValidationError` (el orden lo garantiza el contrato;
  si no llega, la pantalla no se inventa cuál es cuál).
- `getAmbiguousGroups` valida la forma del contrato y reparte en `out` / `in` por
  `type`, **conservando el orden recibido** dentro de cada columna. `key` =
  ids ordenados unidos por `-` (los grupos no traen id y hace falta una clave para
  la elección y para Vue).

## 4. El store

Estado: `pairs`, `pairsStatus` (`'loading' | 'ready' | 'error'`), `groups`,
`groupsStatus`, `choices: Record<groupKey, LinkChoice>`, `pendingUnlink:
TransferPair | null` (abre el diálogo), `busy: boolean`, y el aviso
`notice: { summary: string | null; error: string | null; undo: Undo | null }` con
`Undo = { kind: 'relink'; expenseId; incomeId } | { kind: 'unlink'; transferId }`.

- `load()` lanza las dos lecturas **en paralelo y por separado** (R14): cada una
  pone su propio estado; `retryPairs()` / `retryGroups()` repiten solo la suya.
- `reloadBoth()` tras cada escritura: vuelve a pedir las dos, **sin** poner
  `loading` (la lista no parpadea; mismo criterio que el refresco en segundo plano de
  la F22) y vacía `choices`.
- `confirmUnlink()` → `unlinkPair` → aviso de R6 con `undo: relink` → `reloadBoth()`.
- `link(groupKey)` → comprueba `linkProblem(...) === null` **otra vez** antes de
  mandar (el botón desactivado no es la única barrera) → `linkMovements` → aviso de
  R12 con `undo: unlink` → `reloadBoth()`.
- `undo()` ejecuta la inversa y deja `undo: null` (R7: tras deshacer no se ofrece
  rehacer).
- **Mientras `busy`**, todos los botones que escriben (`Unlink`, `Link these two`,
  `Undo`, el `Yes, unlink` del diálogo) están desactivados: una escritura a la vez.
- El aviso vive hasta la siguiente escritura o hasta salir de la pantalla. Sin cuenta
  atrás (mismo criterio que la F22).
- En error: `notice.error = transferWriteError(error, gesture)`; si
  `needsReload(error)` → `reloadBoth()` (R13). `gesture` ∈ `'unlink' | 'link' |
  'relink' | 'undo-link'` solo para elegir la frase.

## 5. Los textos (en `pairs.ts`, fijados literalmente por test)

| Situación | Texto |
|---|---|
| Etiqueta + frase de R4 | `Bizum` · *A Bizum usually comes from another person, not from one of your accounts.* |
| Título del diálogo | *Unlink this pair?* |
| Consecuencia (R5), ninguna marcada | *Both movements will count in your totals again.* |
| Una marcada | *{Out/In} leg will count in your totals again. The {other} stays out because you marked it as not counted.* (se concreta en T3; el test fija el literal) |
| Las dos marcadas | *Neither will count in your totals: you marked both as not counted.* |
| Memoria (R5, segunda línea) | *The next import won't pair these two again.* |
| Aviso R6 / R7 / R12 | ver `requirements.md` |
| 404 al deshacer | *That pair was already unlinked. Reloading.* |
| 409 al enlazar | *One of those movements is already in a pair. Nothing changed. Reloading.* |
| 404 al enlazar | *One of those movements no longer exists. Nothing changed. Reloading.* |
| 400 | *Nothing changed. The server rejected that pair.* |
| Red | *Couldn't reach the server. Nothing changed.* (convención de `needsReload`) |
| Resto | *Something went wrong. Reloading to show what really happened.* |
| Carga fallida (R14) | *Couldn't load the linked pairs.* / *Couldn't load the doubtful transfers.* + `Try again` |

## 6. La señal `Bizum` (R4)

`mentionsBizum(pair) = /bizum/i.test(pair.expense.description) ||
/bizum/i.test(pair.income.description)`. Nada más: ni ruta, ni fechas, ni importe,
ni lista de nombres. Se pinta **dentro** de la pareja; la lista no se reordena, no se
filtra y no cuenta cuántas hay marcadas.

**Alternativas descartadas** (medidas sobre las 38 parejas reales y las 2 multas):

| Señal | Buenas marcadas por error | Multas cazadas | Por qué no |
|---|---|---|---|
| Ruta poco frecuente (n26 → openbank) | 0 | 2 | Acierta por casualidad: el día que hagas un traspaso n26 → openbank de verdad, sale marcado sin motivo que se pueda explicar. |
| Fechas a más de 1 día | 6 | 2 | 5 buenas a 3 días y 1 a 2. |
| Ninguna pierna nombra al titular ni a un banco propio | 0 | 2 | Exige clavar el nombre del humano y sus bancos en el código; es la «lista de entidades mías» que la exploración dejó como decisión de producto. |
| Sin señal | — | 0 | Válida: la lista ya enseña los dos conceptos. Es la alternativa viva del 🔴 1. |

## 7. El grupo dudoso (R8, R10, R11)

Tarjeta con el importe arriba y dos columnas: `Money out` (radios, `name` =
`out-{key}`) y `Money in` (`in-{key}`). Ninguno marcado al cargar (C7). Debajo, la
frase de R11 cuando toca y `Link these two`. Un grupo con solo una columna poblada
(el contrato no lo produce, pero no se asume) enseña sus movimientos y **no** el
botón.

`linkProblem(group, choice)`: `'incomplete'` si falta uno; `'same-account'` si los
dos `accountId` coinciden; `null` si vale. El importe y el tipo no se comprueban
porque la forma de la tarjeta ya los garantiza (§1.4); aun así, el `POST` que llegue
a dar 400 cae en R13.

**Alternativa descartada:** casillas libres (elige dos cualesquiera) con validación de
tipo al pulsar. Deja pedir lo que el contrato rechaza y obliga a explicar un error
que la forma de la pantalla puede evitar.

## 8. Por qué deshacer pide confirmación y enlazar no

Deshacer una pareja **deja memoria en el backend** y, pasado el `Undo`, no se
recupera desde la web (§1.1). Enlazar un dudoso es el gesto explícito de elegir dos
movimientos y pulsar un botón con nombre; se deshace desde el `Undo` o desde la
lista de parejas, donde aparece al momento. **Alternativa descartada:** confirmar
también al enlazar — un segundo clic para algo que ya tiene dos vías de vuelta.

## 9. Lo que no se toca

- `src/features/import/` (su `AmbiguousTransferList` sigue siendo solo lectura del
  informe de una importación).
- La nota del extracto (F23): ya dice que «a pair the app detected may not be a
  transfer at all». No se enlaza desde ahí a esta pantalla (fuera de alcance).
- `src/shared/movements.ts`: solo se **usa** (`parseMovement`, `needsReload`).
