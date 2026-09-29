# Design — Feature 22: statement-exclude-from-totals

> Cómo se construye lo que pide `requirements.md`. Se apoya en
> `docs/architecture.md` y `docs/conventions.md`: aquí solo se documentan los puntos
> donde esta feature roza sus fronteras.

## 1. El cambio de fondo: la primera acción del extracto que mueve las cifras

La F21 dejó el extracto escribiendo **una** cosa (`categoryId`) y apoyándose en una
garantía del contrato: categorizar **no cambia** los `totals`. Esta feature escribe
`excludedFromTotals`, que es **exactamente el campo que sí los cambia**. Dos
consecuencias de diseño:

1. Tras cada escritura con éxito hay **siempre** un refresco del mes (§6), no
   condicionado a ningún filtro como en la F21.
2. El cuerpo de la petición importa más que nunca: se escribe **en bloque** y sobre
   movimientos **ya confirmados**. Si un `status` o un `categoryId` se colara, el
   estropicio sería de N movimientos, no de uno (§3).

## 2. Un único camino de escritura: `PATCH /api/movements`

Aunque haya un solo movimiento seleccionado, la petición es la del bloque
(`ids: [id]`). El contrato admite `ids` de longitud 1, y así hay **un** cuerpo, **una**
función y **un** test que lo lee letra por letra. `PATCH /api/movements/:id` sigue
existiendo para la F21 (categoría) y no se usa aquí.

## 3. La barrera que impide que `status` y `categoryId` viajen

Igual que la F21 con `setMovementCategory`, el cuerpo se construye literalmente en el
`service.ts` del extracto, no con un *spread*:

```ts
// src/features/statement/service.ts
export function setMovementsExcluded(
  ids: number[],
  excluded: boolean,
  client?: HttpClient,
): Promise<BulkResult> {
  return updateMovements({ ids, excludedFromTotals: excluded }, client)
}
```

Y en `shared/movements.ts`, `changesBody` copia campo a campo:

```ts
if (typeof changes.excludedFromTotals === 'boolean') {
  body.excludedFromTotals = changes.excludedFromTotals
}
```

El `typeof === 'boolean'` es deliberado: el contrato responde **400** a `null`,
`"true"`, `0` y `1`, y nunca los convierte. Un valor que no sea booleano **no sale**
de aquí. Test: el cuerpo serializado es exactamente
`{"ids":[210,211],"excludedFromTotals":true}` y no contiene `status` ni `categoryId`.

## 4. El PATCH en bloque baja a `shared/` (igual que el de uno en la F21)

`features/statement` **no puede importar de `features/review`** (`docs/architecture.md`;
la dependencia solo va en un sentido). Se repite el movimiento de la F21, sin cambiar
una línea de lógica:

| Qué | De dónde | A dónde | Re-export |
|---|---|---|---|
| `updateMovements`, `parseBulkResult` | `features/review/service.ts` | `shared/movements.ts` | `review/service.ts` |
| `MAX_IDS` (= 200) | `features/review/actions.ts` | `shared/movements.ts` | `review/actions.ts` y `review/service.ts` |
| `BulkUpdate`, `BulkResult` | `features/review/types.ts` | `shared/movements.ts` | `review/types.ts` |

`BULK_CONFIRM_THRESHOLD` **no baja**: es una decisión de interfaz de cada pantalla, y
el extracto declara la suya (§7.2) con el mismo valor, 20. Las suites de `review` y de
`category-rules` deben pasar **sin tocar ni un test**.

## 5. `excludedFromTotals` entra en el parseo de frontera (ADR-002)

`src/shared/movements.ts`:

- `interface Movement` gana `excludedFromTotals: boolean`.
- `parseMovement` gana
  `excludedFromTotals: v.asFlag(movement.excludedFromTotals, \`${path}.excludedFromTotals\`)`
  (`asFlag` ya existe en `shared/validation.ts`). Campo **obligatorio**: el backend lo
  manda desde su feature 49, y si desapareciera queremos un `ValidationError` que lo
  nombre, no una pantalla que dé por no marcado todo el mes.
- `interface MovementChanges` gana `excludedFromTotals?: boolean`.
- Las fixtures de los tests (`review`, `statement`, `category-rules`) añaden el campo.

## 6. Qué se refresca, cuándo, y por qué no parpadea (R11, R12)

Secuencia exacta de una acción con éxito:

1. `PATCH /api/movements` → `200 { updated, movements }`.
2. **Al instante**: cada movimiento devuelto sustituye a su fila con `adoptUpdated`
   (ya existe, F21). La etiqueta `Not counted` y el importe atenuado aparecen aquí.
   `totals` y `pagination` **no se tocan** en este paso.
3. **Una** llamada a `refreshQuietly()` (ya existe, F21): pide la página 1 del mismo
   mes con los mismos filtros, **sin `isLoading`** y sin vaciar `result`, y adopta
   `totals` y `pagination`. Es la única forma de que las cifras sean las del backend
   (C3) sin restar importes en el cliente.
4. Si ese refresco falla, se traga el error (como en la F21): las filas ya dicen la
   verdad y las cifras se corregirán en el siguiente movimiento. Nunca se calcula una
   cifra aquí.

No hay parpadeo porque el paso 2 ya dejó la lista en su estado final y el paso 3 la
reemplaza por los mismos movimientos en el mismo orden; lo único que cambia a la vista
son las tres cifras y el recuento. **Un solo refresco por acción**, también tras el
`Undo`. Se aprovecha el guarda `loadRun` que ya evita que una respuesta vieja pise a
una nueva.

## 7. Estado y componentes

### 7.1 `store.ts` (feature/statement)

Nuevo estado:

```ts
const isSelecting = ref(false)          // modo selección encendido (R4, R5)
const selectedIds = ref<number[]>([])   // ids marcados con la casilla (R2, R7)
const lastExclusion = ref<{ ids: number[]; excluded: boolean; summary: string } | null>(null)
```

Nuevas funciones:

- `startSelecting()` / `stopSelecting()` — la segunda vacía `selectedIds` (R7).
  `startSelecting()` cierra el editor de categoría abierto (`editingId = null`, R6).
- `toggleSelected(id)` — añade o quita; no añade por encima de `MAX_IDS` (R2).
- `selectAllShown()` — todos los de `days`, hasta `MAX_IDS`.
- `clearSelection()`.
- `idsToChange(excluded)` — los seleccionados cuyo `excludedFromTotals` difiere (R2, R3).
- `setExcluded(excluded, client?)` — el gesto: `runWrite` (carril único, ya existe) →
  `setMovementsExcluded` → `adoptUpdated` por cada movimiento devuelto → aviso +
  `lastExclusion` → `refreshQuietly` → `clearSelection()`. En el `catch`, el mismo
  camino de la F21: `writeErrorMessage(failure)` y, si `needsReload(failure)`, recarga
  el mes antes de pintar nada (R15, R16).
- `undoExclusion(client?)` — un `PATCH` con `!lastExclusion.excluded` sobre
  `lastExclusion.ids` (exactos, por eso R2 solo manda los que cambian) y `lastExclusion`
  a `null` al terminar bien (R14).

`show()` ya olvida el contexto al cambiar de mes o de filtro: se le añade
`selectedIds = []`, `isSelecting` se conserva (el humano sigue en faena, solo cambia de
mes) y `lastExclusion` se olvida con el resto (`forgetAction`).

### 7.2 `actions.ts` (feature/statement)

- `STATEMENT_BULK_THRESHOLD = 20` con su comentario apuntando a la F16 (R13).
- `countOf(n)` — copia de la de `review/actions.ts` (`1 movement` / `3 movements`);
  cuatro líneas, para no importar de otra feature.
- `exclusionSummary(count, excluded)` →
  `3 movements excluded from totals` / `3 movements back in totals`.
- `NOTHING_TO_CHANGE = 'Nothing to change: those movements are already like that.'` (R3).
- `writeErrorMessage` (ya existe) gana el matiz del plural para el 400:
  `"Nothing changed. The server rejected that change."` — sigue sin pintar el mensaje
  del backend (R15).

### 7.3 `components/StatementSelectionBar.vue` (nuevo, ~70 líneas)

Copia reducida de `review/components/ReviewActionBar.vue` (mismo motivo que la F21 para
copiar en vez de compartir: el extracto no importa de `review` y bajar un componente con
el vocabulario de una pantalla al cajón `Base*` ataría las dos). Props:
`selectedCount`, `shownCount`, `busy`. Eventos: `exclude`, `include`, `select-all`,
`clear`, `done`. Vive **entre la línea de aviso y la lista**, en el mismo sitio donde la
F21 puso `StatementActionNotice`, para no empujar las cifras.

Fuera del modo selección, ese hueco lo ocupa un solo botón `Select movements`.

### 7.4 `components/StatementRow.vue`

- Prop nueva `selectable` (modo selección) y `selected`; con `selectable` se pinta un
  `BaseCheckbox` a la izquierda, exactamente como en `review/components/MovementRow.vue`,
  con `aria-label` `Select {description}` (R5).
- Con `selectable`, la insignia de categoría **no es un botón** (R6): se pinta como la
  insignia estática que ya existe para los `neutral`.
- Nueva etiqueta, junto a la de `Transfer`:
  `<BaseBadge v-if="movement.excludedFromTotals" size="sm" tone="neutral">Not counted</BaseBadge>`
  con `title` = `Not counted in this month's figures` (R8).
- Con `excludedFromTotals`, el importe usa `text-ink-muted` (atenuado), como ya hace con
  los `neutral`. Sin fondo de color, sin tachado y sin franja lateral: con myinvestor
  filtrado casi todas las filas estarán marcadas (🔴 2).

### 7.5 `components/StatementList.vue` y `views/StatementView.vue`

La lista sigue sin lógica: baja `selectable`, `selectedIds` y sube `toggle`. La vista
monta el botón / la barra, el diálogo de confirmación y conecta los eventos con el store.
El `RuleDialog` de la F17 y el editor de la F21 quedan **intactos** fuera del modo
selección.

### 7.6 `components/ExcludeConfirmDialog.vue` (nuevo, ~45 líneas)

Copia de `review/components/BulkConfirmDialog.vue` con dos títulos:
`Exclude 24 movements from totals?` / `Put 24 movements back in totals?`, cuerpo
`It is all or nothing: either every movement changes or none of them does.` y `Cancel`
con el foco. Solo se abre desde `STATEMENT_BULK_THRESHOLD` (R13).

## 8. Textos (en inglés, escritos aquí, nunca los del backend)

| Sitio | Texto |
|---|---|
| Botón que enciende el modo | `Select movements` |
| Barra | `{n} selected`, `Exclude from totals`, `Include in totals`, `Select all shown`, `Clear selection`, `Done` |
| Etiqueta de la fila | `Not counted` (title: `Not counted in this month's figures`) |
| Aviso de éxito | `3 movements excluded from totals` / `3 movements back in totals` |
| Nada que hacer | `Nothing to change: those movements are already like that.` |
| Error 400 | `Nothing changed. The server rejected that change.` |
| Error 404 | `Nothing changed: one of those movements no longer exists. Reloading the month.` |
| Red | `Couldn't reach the server. Nothing changed.` |
| Otros | `Something went wrong. Reloading the month to show what really happened.` |

## 9. Pruebas de extremo a extremo (`e2e/statement-exclude-from-totals.spec.ts`)

1. Enciendo el modo selección: aparecen casillas y la barra; la insignia de categoría
   deja de ser pulsable. Lo apago: vuelve todo como estaba.
2. Marco tres líneas y pulso `Exclude from totals`: una sola petición con
   `{"ids":[…],"excludedFromTotals":true}`, las tres filas salen con `Not counted`, y
   después llega **un** `GET` del mes con cifras nuevas.
3. `Undo` devuelve exactamente esos tres ids con `false`.
4. Selección de 20: sale el diálogo con el número exacto; `Cancel` no manda nada.
5. Un 404 recarga el mes y pinta la frase en inglés; un 400 no recarga.
6. Cambio de mes con cosas seleccionadas: la selección se vacía.

Red de seguridad heredada: ninguna llamada real sale a `:3000` en los tests ni en el
e2e.

## 10. Alternativas descartadas

- **Casillas siempre visibles, como en la cola.** Un clic menos por tanda, a cambio de
  93 casillas leyendo un mes y de deshacer la decisión que la F21 tomó a propósito.
- **Restar en el cliente el importe de lo que se acaba de marcar** para que las cifras
  cambien sin pedir nada. Instantáneo, pero rompe C3 y cualquier discrepancia con el
  backend se volvería invisible.
- **Dos caminos de escritura** (`:id` para uno, bloque para varios), como sugería el
  `acceptance` 1: dos cuerpos que mantener y dos sitios donde se puede colar un campo.
- **Marcar los 29 depósitos de un botón** («marcar todo lo que ponga DEP.»): lo prohíbe
  el `intent` (`respuestas_del_humano` 4 y `que_no_quiero` 3).
- **Esconder lo marcado al instante**: es la feature siguiente y con su interruptor;
  aquí «apartado no es escondido» (R9).
