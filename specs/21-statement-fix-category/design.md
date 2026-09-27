# Design — Feature 21: statement-fix-category

> Cómo se construye lo que pide `requirements.md`. Se apoya en
> `docs/architecture.md` (feature-based, lo que necesitan dos features vive en
> `shared/`) y en `docs/conventions.md` (`@/` para cruzar features, relativos dentro
> de la misma). Aquí solo se documentan los puntos donde esta feature roza esas
> reglas.

## 1. El cambio de fondo: el extracto deja de ser de solo lectura

`docs/architecture.md` dice hoy que `features/statement/` es de **solo lectura** y
que **no importa nada** de otra feature. Las dos frases dejan de ser ciertas:

- la carpeta manda un `PATCH` (R1);
- monta el diálogo de reglas de `category-rules` (R16), como ya hace `review`.

El sentido de la dependencia es el mismo que el existente (`review → category-rules`),
así que no aparece ningún ciclo: `category-rules` sigue sin conocer a nadie.
**T14 actualiza esa nota de `architecture.md`**; dejarla como está sería mentir en el
único sitio donde se documenta el mapa de dependencias.

## 2. La mitad de escritura baja a `shared/` (igual que la de lectura en la F18)

`src/shared/movements.ts` ya tiene la mitad de lectura (mudada en la F18 cuando la
previsualización de reglas necesitó el mismo `GET`). Ahora una segunda pantalla
necesita el mismo `PATCH`, así que se muda **sin cambiarla**:

- `changesBody`, `patch`, `parseUpdatedMovement` y `updateMovement` pasan de
  `src/features/review/service.ts` a `src/shared/movements.ts`.
- `needsReload(error)` pasa de `src/features/review/actions.ts` a
  `src/shared/movements.ts`: describe el contrato del `PATCH` (es todo o nada, y solo
  un 400 y un fallo de red garantizan que no se escribió), no la cola de revisión.
- `review/service.ts` y `review/actions.ts` **re-exportan** los cuatro nombres, así
  que ni un import ni un test de las F15–F18 cambia (C6).
- `updateMovements` (el PATCH en bloque) **se queda en `review`**: el extracto no hace
  acciones en bloque (C1) y bajarlo a `shared/` invitaría a usarlo desde aquí.

### La barrera que impide que `status` viaje

`features/statement/service.ts` (nuevo, 20 líneas) expone **una sola función**:

```ts
/** The only write of the whole statement: the category of one movement (R1). */
export function setMovementCategory(
  id: number,
  categoryId: number | null,
  client?: HttpClient,
): Promise<Movement>
```

Llama a `updateMovement(id, { categoryId }, client)` con el objeto literal escrito
aquí dentro. El store del extracto **no importa `updateMovement`**: no hay ninguna
forma de que un `status` entre en el cuerpo, ni por descuido ni por un *spread* de
algo que venga de la vista. Un test comprueba el cuerpo exacto enviado
(`{"categoryId":4}` y `{"categoryId":null}`) y que no contiene la clave `status`.

## 3. Archivos

### Nuevos

| Archivo | Qué es |
|---|---|
| `src/features/statement/service.ts` | La única escritura del extracto (§2). |
| `src/features/statement/actions.ts` | Lógica pura: frases del aviso, mapeo de errores y `matchesCategoryFilter` (§4). |
| `src/features/statement/components/RowCategoryEditor.vue` | El selector de una línea + el botón `Create rule` (R3, R4, R5, R16). |
| `src/features/statement/components/StatementActionNotice.vue` | La línea sobre la lista con el `Undo` (R11, R14). |
| `src/features/statement/__tests__/service.spec.ts` | Cuerpo exacto del `PATCH` (R1). |
| `src/features/statement/__tests__/actions.spec.ts` | Las frases y `matchesCategoryFilter` (R8, R14, R15). |
| `src/features/statement/__tests__/RowCategoryEditor.spec.ts` | R3, R4, R5, R16. |
| `src/features/statement/__tests__/StatementActionNotice.spec.ts` | R11, R14. |
| `e2e/statement-fix-category.spec.ts` | Los cinco recorridos de §8. |

### Modificados

| Archivo | Cambio |
|---|---|
| `src/shared/movements.ts` | Recibe la mitad de escritura y `needsReload` (§2). |
| `src/features/review/service.ts` | Re-exporta lo mudado; deja de definirlo. |
| `src/features/review/actions.ts` | Re-exporta `needsReload`; deja de definirlo. |
| `src/features/statement/store.ts` | Editor abierto, acción, deshacer y refresco (§4). |
| `src/features/statement/components/StatementRow.vue` | La insignia pasa a ser pulsable y abre el editor (R2, R3). |
| `src/features/statement/components/StatementList.vue` | Pasa hacia abajo `editingId`, `categories` y `busy`; sube los eventos. |
| `src/features/statement/views/StatementView.vue` | Monta el aviso y el `RuleDialog` de la F17 (R11, R16). |
| `docs/architecture.md` | La nota del §1. |
| `src/features/statement/__tests__/{store,StatementRow,StatementList,StatementView}.spec.ts` | Casos nuevos; los existentes siguen. |

## 4. Estado nuevo en `features/statement/store.ts`

```ts
/** The row whose category editor is open, or null: only one at a time (C2). */
const editingId = ref<number | null>(null)
/** One write at a time: a second click while one is in flight does nothing (C2). */
const isActing = ref(false)
const actionError = ref<AppError | null>(null)
/** The English sentence of a failed write, never the backend's own message (R14). */
const actionMessage = ref<string | null>(null)
/** What the last successful write did, and how to put it back (R11, R12). */
const lastAction = ref<StatementAction | null>(null)

interface StatementAction {
  summary: string            // `Categorized as Supermercado` / `Category removed`
  movementId: number
  previousCategoryId: number | null
}
```

Funciones nuevas: `openEditor(id)`, `closeEditor()`, `categorize(id, categoryId)`,
`undoLast()`. `show()` (y por tanto `shift()` y `applyFilters()`) limpian
`editingId`, `lastAction`, `actionError` y `actionMessage` — ahí se cumple R13.

### `categorize(id, categoryId)` paso a paso

1. Si `isActing` está a `true`, no hace nada (C2).
2. Busca la fila en `result.movements` y en `extra`; si no está, no hace nada.
   Guarda su `categoryId` actual: es el plan de deshacer (R12).
3. `await setMovementCategory(id, categoryId)`.
4. Con la respuesta: `adoptUpdated(updated)` (§5), `editingId = null`,
   `lastAction = { summary: actionSummary(updated, categoryId, name), … }`.
5. `if (hasCategoryFilter(filters)) await refreshQuietly()` (R9, §6).
6. En el `catch`: `actionMessage = writeErrorMessage(failure)` y, si
   `needsReload(failure)`, `await show(month, filters)` — recarga completa, con su
   spinner, porque la pantalla podría estar mintiendo (R15).

`undoLast()` hace lo mismo con `previousCategoryId`, y al terminar bien pone
`lastAction = null`: nada se rehace, igual que en la F16.

## 5. `adoptUpdated(updated: Movement)` — qué se toca de la lista

```ts
function adoptUpdated(updated: Movement): void
```

- Sustituye la fila por el movimiento devuelto, esté en `result.movements` o en
  `extra` (R7). Es el objeto completo del contrato, no un remiendo de campos.
- Si `hasCategoryFilter(filters)` y `!matchesCategoryFilter(updated, filters)`, la
  quita de donde estuviera (R8). El resto de filtros (`accountId`, `q`) **no puede
  dejar de cumplirse** cambiando la categoría, así que no se mira.
- **No toca `pagination.total` ni `totals`** (R10): son del backend. Entre la
  desaparición de la línea y la llegada del refresco (§6) la línea `Showing 12 of 13`
  puede quedar desfasada unas décimas; es el precio de que la línea desaparezca «al
  momento», que es lo que el humano pidió.

`matchesCategoryFilter` vive en `actions.ts` y es pura:

```ts
export function matchesCategoryFilter(movement: Movement, filters: StatementFilters): boolean
// uncategorized → movement.categoryId === null
// categoryId    → movement.categoryId === filters.categoryId
// ninguno       → true
```

## 6. Qué se refresca y qué no (R9, R10) — el punto delicado

El contrato dice, con todas las letras, que categorizar **no cambia los `totals` de
`GET /api/movements`**. Por eso:

| Situación | Se pide de nuevo el mes | Por qué |
|---|---|---|
| Sin filtro de categoría (con o sin `accountId` / `q`) | **No** | Nada puede haber cambiado: ni las cifras, ni el recuento, ni qué filas cumplen el filtro. Pedirlo solo haría parpadear ~93 filas. |
| Con `uncategorized` o `categoryId` puestos | **Sí**, en segundo plano | El conjunto filtrado cambia: `totals` y `pagination.total` son otros. |

`refreshQuietly()` copia el patrón de la F16: **sin spinner y sin vaciar la pantalla**,
con la guarda `loadRun` para que una respuesta vieja no pise un mes nuevo. Pide
`monthQuery(month, filters, 1)` y adopta `result` entero (cifras incluidas). Como
`STATEMENT_PAGE_SIZE` es 200 y el mes más cargado del humano tiene ≈93 movimientos,
en sus datos **nunca hay una segunda página**; aun así, para el caso teórico de un mes
de más de 200, tras adoptar la página 1 se descarta de `extra` cualquier id que la
página 1 ya contenga, para no duplicar filas. Si el refresco falla no se pinta nada:
la escritura sí salió bien, y las cifras se corregirán al siguiente movimiento.

## 7. Componentes

### 7.1 `StatementRow.vue` (R2, R3)

La insignia de categoría que ya existe pasa a ser un `<button>` cuando el movimiento
es categorizable, con `aria-label` `Change category of <description>` y `title`
`Change category`; visualmente idéntica en reposo (mismo `BaseBadge` dentro), con el
realce de foco y de *hover* propio de un control. **No se añade ninguna columna**: el
ancho de la fila no cambia y el mes se sigue leyendo igual (🔴 1). Con
`editingId === movement.id`, la insignia se sustituye por `RowCategoryEditor`.

En un movimiento `neutral` la insignia **no** es un botón: se pinta como hoy, con el
`title` que explica por qué (R5).

### 7.2 `RowCategoryEditor.vue` (R3, R4, R5, R16)

Copia de `review/components/MovementCategorySelect.vue` con dos añadidos: un botón
`Create rule` al lado y un `Close` (o `Esc`) que devuelve la fila a su insignia.
Se copia, no se importa, por la misma razón por la que la F19 copió `MovementRow` y la
F20 copió `CategorySelect`: el extracto no depende de `review`, y bajarlo a `shared/`
metería vocabulario de una pantalla concreta en el cajón de los `Base*`. Son ~45
líneas. **Alternativa descartada:** mudar `MovementCategorySelect` a
`shared/components/` (ahorra la copia; a cambio, cualquier retoque de la cola de
revisión pasa a poder romper el extracto y al revés, que es justo lo que la nota de
`architecture.md` quiso evitar).

Elegir en el selector **guarda solo**: no hay botón de guardar, como en la cola.

### 7.3 `StatementActionNotice.vue` (R11, R14)

Copia de `review/components/ActionNotice.vue`: una línea **fija, sobre la lista y bajo
las cifras**, con lo que hizo la última acción y un `Undo` **sin cuenta atrás**. Vive
hasta la siguiente acción, hasta cambiar de mes o de filtro, o hasta salir de la
pantalla (R13). El mensaje de error gana al de éxito; nunca se ven los dos.

### 7.4 `StatementView.vue` (R16, R17)

Monta `RuleDialog` de `@/features/category-rules/components/RuleDialog.vue` con
exactamente las mismas props que `ReviewView.vue`: `mode="create"`, `description`,
`initial-text="proposeMatchText(description)"`, `kind` derivado del `type`,
`categories` (las que el store ya pide para el filtro), `busy`, `message` y `preview`
de `useCategoryRulesStore()`. `@preview` llama a `rules.previewMatches(...)` (F18) y
`@save` a `rules.create(...)`. **Al guardar no se toca el movimiento de origen** (R17):
el store de reglas solo hace `POST /api/category-rules`, y el diálogo se cierra.

## 8. Textos (en inglés, escritos aquí, nunca los del backend)

| Caso | Texto |
|---|---|
| Éxito con categoría | `Categorized as <name>` |
| Éxito quitando la categoría | `Category removed` |
| Deshacer hecho | `Change undone` |
| 400 | `Nothing changed. That movement doesn't accept that category.` |
| 404 | `Nothing changed: the movement or the category no longer exists. Reloading the month.` |
| Fallo de red | `Couldn't reach the server. Nothing changed.` |
| Respuesta ilegible (`ValidationError`) | `The server answered, but the reply couldn't be read. Reloading the month to show what really happened.` |
| Cualquier otro | `Something went wrong. Reloading the month to show what really happened.` |

Son las frases de `actionErrorMessage` de la F16 en singular: aquí siempre se actúa
sobre **un** movimiento, y decir «some of those movements» sería falso.

## 9. Pruebas de extremo a extremo (`e2e/statement-fix-category.spec.ts`)

1. Cambiar la categoría de una línea del mes: la insignia cambia y las cifras **no**
   se vuelven a pedir (se cuenta una sola petición: el `PATCH`).
2. Lo mismo sobre un movimiento `confirmed`: el cuerpo interceptado es
   `{"categoryId":N}` y el `status` de la fila no cambia.
3. Con `uncategorized=true`: la línea desaparece al momento y llega un `GET` de
   refresco que actualiza cifras y recuento.
4. `Undo` tras un cambio: sale un segundo `PATCH` con el `categoryId` anterior y la
   fila vuelve a su categoría de partida.
5. Un 400 simulado: sale el texto en inglés, la fila **no** cambia y no se recarga el
   mes.

Y comprobar que `e2e/statement.spec.ts`, `e2e/review-actions.spec.ts` y
`e2e/category-rules.spec.ts` siguen verdes sin tocarlos (C6).

## 10. Alternativas descartadas (además de las de §7.2)

1. **Selector de categoría siempre visible en cada línea**, como en la cola de
   revisión. Descartada: el `intent` dice «no quiero que el extracto se convierta en
   otra cola de revisión», y 93 selectores de 16 opciones por mes rompen la lectura
   que es el motivo de existir de la pantalla. (🔴 1)
2. **Refrescar el mes siempre tras escribir**, como la F16. Descartada: el contrato
   garantiza que las cifras no cambian al categorizar, así que sin filtro de categoría
   sería una petición inútil y un parpadeo de toda la lista. (🔴 5)
3. **Deshacer con cuenta atrás en un aviso flotante.** Descartada: la F16 ya cerró
   «sin cuenta atrás», y en una pantalla por la que se baja leyendo, un aviso que se
   va solo se pierde. (🔴 4)
4. **Crear la regla y además categorizar el movimiento de origen en el mismo gesto.**
   Descartada: la F17 decidió lo contrario y el backend tampoco aplica nada al crear
   una regla; dos escrituras por un clic harían el deshacer ambiguo. (🔴 2)
5. **Guardar con un botón explícito por fila.** Descartada: la cola guarda al elegir y
   dos gestos distintos para la misma acción en dos pantallas sería ruido.
