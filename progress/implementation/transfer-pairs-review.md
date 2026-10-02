# Implementación — Feature 24 `transfer-pairs-review`

- **Fecha:** 2026-10-02
- **Agente:** implementer
- **Spec:** `specs/24-transfer-pairs-review/` (aprobado por el humano el 2026-10-02)
- **Estado en `feature_list.json`:** `in_progress` (no se toca: falta la revisión y la T22)
- **Tasks:** T0–T21 hechas y marcadas. **T22 sin hacer a propósito**: escribe en la base
  real, es del leader con el humano delante y necesita su visto bueno explícito.
- **Commits:** ninguno.

## Lo que NO se hizo contra el backend real

Ninguna escritura. Las únicas peticiones a `http://localhost:3000` de esta sesión fueron
tres `GET` con `curl`: uno a `/api/transfers` para copiar en las fixtures tres parejas
buenas reales, y al terminar otro a `/api/transfers` y otro a
`/api/transfers/ambiguous` para comprobar que todo sigue igual: **38 parejas y 0 grupos
dudosos**, lo mismo que al empezar. Ningún `POST`, ningún `DELETE`.

## Segunda pasada — cambios pedidos por el reviewer (2026-10-02)

Tres arreglos, con el spec ya enmendado por el leader (R6, design §5 y fixtures, T5). Lo
que sigue en este informe está actualizado a como queda el código.

1. **Fuera los nombres de terceros.** Los dos conceptos de Bizum de las multas son ahora
   `BIZUM DE <persona> CONCEPTO multa` en `__tests__/fixtures.ts` (las dos multas y el
   comentario de cabecera), `__tests__/TransferPairRow.spec.ts` y
   `e2e/transfer-pairs-review.spec.ts` (dos sitios). Los ids reales se quedan. Un `grep`
   sin distinguir mayúsculas de los dos nombres y del apellido sobre
   `src/features/transfers/` y `e2e/` no devuelve nada.
   **Lo que sí queda, y no he tocado:** el nombre del **titular** (el propio humano, no
   un tercero) en los conceptos de ingreso de las tres parejas buenas —fixtures y e2e—,
   tal cual lo escribe el banco. Ya estaba en el repo antes de esta feature
   (`category-rules/__tests__/preview-rules.spec.ts:119`). Si también debe salir, es un
   cambio de dos ficheros; lo dejo a decisión del leader.
2. **El aviso tras deshacer sale de las marcas.** Nueva `unlinkedNotice(pair)` en
   `pairs.ts`, junto a `unlinkConsequence` y leyendo las mismas dos marcas; sustituye a
   la constante `UNLINKED_NOTICE`, que desaparece. `store.confirmUnlink` la llama con la
   pareja que se acaba de deshacer. Tests: tres casos en `pairs.spec.ts` (bloque
   `unlinkedNotice (R6)`, con la pierna marcada en cualquiera de los dos lados) y uno en
   `store.spec.ts` («the notice follows the marks of the pair…», una y dos marcadas; el
   de ninguna ya estaba).
3. **La aserción del puerto, sustituida por una que puede fallar.** Fuera
   `expect(call.url.port).not.toBe('3000')`. Ahora cada `abort()` del spec —la red de
   seguridad y las dos ramas no previstas— pasa por `stop(route)`, que apunta método y
   ruta en `watch.aborted`, y los cuatro casos exigen que esa lista acabe vacía.
   **Comprobado que falla:** con la ruta de `/api/ingestion/pending` quitada en una copia
   temporal del spec, los cuatro casos se ponen rojos nombrando la llamada. `docs/stack.md`
   corregido: dice que lo que impide llegar a `:3000` es la red de seguridad y que mirar
   el puerto no prueba nada.
   Un intento previo con el evento `requestfailed` se descartó: Chromium da por fallida
   la respuesta 204 simulada del `DELETE`, así que marcaba en rojo llamadas bien atendidas.

## T0 — Comprobaciones previas

- **(a) 204 sin cuerpo.** `src/services/http.ts` devuelve `undefined as T` ante un 204
  antes de intentar leer nada (`if (response.status === 204) return undefined as T`), y
  `deleteRule` de `category-rules/service.ts` ya lo usa así
  (`await client(path, { method: 'DELETE' })`). `unlinkPair` hace lo mismo.
- **(b) `Link2`.** Existe en la versión instalada de `@lucide/vue`
  (`dist/esm/icons/link-2.mjs`) y no se usaba en ningún sitio de `src/`.
- **(c) Contraste del aviso.** `contrast: --warning on --warning-subtle >= 4.5 (Warning
  badge)` ya está declarado en `src/assets/theme-dark.css` y lo mide
  `theme-dark.spec.ts`.

## Archivos

### Nuevos

| Archivo | Qué |
|---|---|
| `src/shared/transfers.ts` | `TRANSFERS_PATH` y `AMBIGUOUS_TRANSFERS_PATH`. |
| `src/features/transfers/types.ts` | `TransferPair`, `AmbiguousMovement`, `AmbiguousGroup`, `LinkChoice`, `ListStatus`, `Undo`, `Notice`, `Gesture`. |
| `src/features/transfers/service.ts` | `getTransferPairs`, `getAmbiguousGroups`, `linkMovements`, `unlinkPair` (+ `parseTransferPairs`, `parseAmbiguousGroups`). |
| `src/features/transfers/pairs.ts` | `mentionsBizum`, `linkProblem`, `unlinkConsequence`, `groupKey`, `transferWriteError` y todos los textos. |
| `src/features/transfers/store.ts` | `useTransfersStore`. |
| `src/features/transfers/views/TransfersView.vue` | La página. |
| `src/features/transfers/components/` | `TransferPairList`, `TransferPairRow`, `AmbiguousGroupList`, `AmbiguousGroupCard`, `UnlinkConfirmDialog`, `TransfersActionNotice`. |
| `src/features/transfers/__tests__/` | `fixtures.ts` y 8 specs (83 tests tras la segunda pasada, 79 en la primera; de los otros 9 de la subida total, 2 son del router y el resto no lo he desglosado — probablemente tests ya existentes que generan un caso por cada `.vue`): `service`, `pairs`, `store`, `TransferPairRow`, `UnlinkConfirmDialog`, `AmbiguousGroupCard`, `TransfersActionNotice`, `TransfersView`. |
| `e2e/transfer-pairs-review.spec.ts` | 4 casos, todo `/api` interceptado. |

### Modificados

- `src/router/index.ts` — ruta `transfers` (`/transfers`, `Link2`) justo después de `rules`.
- `src/router/__tests__/router.spec.ts` — las listas exhaustivas ganan la entrada en su
  sitio, y un test nuevo fija vista e icono.
- `src/features/statement/service.ts` — importa `AMBIGUOUS_TRANSFERS_PATH` de
  `@/shared/transfers` y lo re-exporta con el mismo nombre. `getAmbiguousCount` no
  cambia. **Ningún test del extracto se tocó** y pasan todos.
- `docs/architecture.md` — la carpeta y `shared/transfers.ts` en el árbol, y la nota de
  que esta es la pantalla que escribe `transferId`.
- `docs/stack.md` — el décimo spec de `e2e/` y el icono `Link2`.
- `specs/24-transfer-pairs-review/tasks.md` — T0–T21 marcadas.
- `progress/current.md` — bitácora.

## Decisiones de implementación

1. **Nada sale a `:3000` en ningún test.** Los unitarios espían `fetch` y rechazan
   cualquier llamada que no sea una de las cuatro de la feature
   (`unexpected <método> <ruta>`); el e2e monta primero `**/api/**` → `abort()` y encima
   sus rutas. La de traspasos es una imitación **con estado**: el `DELETE` quita la
   pareja y el `POST` la crea, así que lo que se ve tras una escritura solo puede venir
   de volver a pedir las listas.
2. **El cuerpo del `POST` se escribe en un único sitio**: `linkMovements(expenseId,
   incomeId)` recibe dos números y serializa el literal `{ movementIds: [a, b] }`. No hay
   por dónde colar otro campo.
3. **Dos barreras antes de enlazar.** El botón apagado y, además, `store.link()` vuelve
   a pasar `linkProblem`. `linkProblem` busca cada id **en su columna**, así que dos del
   mismo tipo o un id ajeno al grupo dan `incomplete` y no sale ninguna petición.
4. **Recarga silenciosa tras cada escritura** (`reloadBoth`): no pone `loading`, vacía
   las elecciones y pide las dos listas. Cada lista lleva un contador para descartar una
   respuesta que ya no es la última. Si una recarga falla, esa sección pasa a error con
   su `Try again`: no se deja a la vista una lista que puede no ser cierta.
5. **Una escritura a la vez.** Mientras `busy`, ni `Unlink`, ni `Link these two`, ni
   `Undo`, ni los radios responden; `requestUnlink` tampoco abre el diálogo.
6. **El importe de cada pierna se pinta sin signo**: la etiqueta `Money out` /
   `Money in` dice la dirección, igual que las columnas de los dudosos.
7. **Fixtures.** Las dos multas y tres parejas buenas llevan ids y fechas contables
   reales; los **IBAN son inventados** y los conceptos de Bizum **no llevan el nombre de
   nadie** (segunda pasada).
   Las tres parejas buenas elegidas son las del 2026-09-09, 2026-08-25 y 2026-08-06:
   **no** se usaron las tres iguales del 2026-07-24, y en ningún texto, comentario ni
   test se dice nada sobre ellas.

## Desviaciones y huecos del spec

1. **Texto que el spec no fijaba: el aviso tras el `Undo` de un enlace.** R12 dice qué
   hace ese `Undo` (un `DELETE`), pero ni `requirements.md` ni design §5 dan la frase que
   queda después. Puse **`Link undone.`**, sin botón (design §4: tras deshacer no se
   ofrece rehacer). Es lo mínimo que no afirma nada sobre las sumas. Si el humano quiere
   otra, es una constante: `LINK_UNDONE_NOTICE` en `pairs.ts`.
2. **Texto concretado, como pedía design §5** («se concreta en T3; el test fija el
   literal»), para una sola pierna marcada:
   - gasto marcado: *The money in leg will count in your totals again. The money out leg
     stays out because you marked it as not counted.*
   - ingreso marcado: *The money out leg will count in your totals again. The money in
     leg stays out because you marked it as not counted.*
3. **Textos de carga** (`Loading the doubtful transfers…`, `Loading the linked pairs…`):
   T14 pide el estado de carga pero no su frase. Mismo patrón que `Loading your rules…`.
4. **Título de la sección de parejas sin número mientras no se sabe**: `Linked pairs`
   durante la carga o si falla, `Linked pairs (N)` cuando hay respuesta (también
   `Linked pairs (0)`).
5. **El e2e tiene un cuarto caso que tasks.md no pedía** (dos elegidos de la misma
   cuenta no llegan al servidor) y el caso (d) de T17 va dentro del primero. Lo pedía el
   encargo: que el 400 y el 409 no lleguen a verse.

## Observaciones (no aplicadas)

- ~~La frase de R6 puede no ser exacta si alguna pierna está marcada.~~ **Resuelto en la
  segunda pasada** con R6 enmendado: ver arriba.
- **Un fallo de red se trata como «no cambió nada»**, que es la convención de
  `needsReload` heredada de F16/F21/F22 y la que pide design §5. Si la petición llegó y
  lo que se perdió fue la respuesta, la pantalla no recarga. Fuera de alcance: es de
  `shared/movements.ts`.
- ~~Los conceptos reales de las multas llevan el nombre de terceros.~~ **Resuelto en la
  segunda pasada** en el código de esta feature. Queda el nombre del titular en las
  parejas buenas (ver arriba).

## Contraste (T19)

No hizo falta ninguna línea `contrast:` nueva: todos los pares usados ya estaban
declarados y medidos por `theme-dark.spec.ts` (verde en la puerta).

| Uso | Par |
|---|---|
| Conceptos, importes, títulos de tarjeta | `--ink-strong on --surface-card` |
| Cuerpo del diálogo, movimientos de un grupo | `--ink-body on --surface-card` |
| Fechas, cuentas, frase del Bizum, cabeceras de columna | `--ink-muted on --surface-card` |
| Etiqueta `Bizum` | `--warning on --warning-subtle` |
| Frase de misma cuenta | `--warning on --surface-card` |
| Radios (`accent-brand`) | `--brand on --surface-card` |
| Títulos de sección, textos de vacío y de carga | `--ink-strong` / `--ink-muted on --surface-app` |
| Línea de aviso | `--positive` / `--negative on --surface-app` |

## Trazabilidad

Rutas relativas a `src/features/transfers/__tests__/` salvo que se diga otra cosa.

- **R1** → `src/router/__tests__/router.spec.ts`: «declares the seven navigable routes
  with English paths», «exposes one navigation entry per navigable route, in sidebar
  order», «mounts the transfers screen on /transfers, with the Link2 icon»; e2e «reaches
  the screen from the sidebar…» (la entrada va justo después de `Rules`).
- **R2** → `service.spec.ts` «reads every pair in the order received, expense leg
  first»; `store.spec.ts` «asks for each list once and keeps the backend order»;
  `TransfersView.spec.ts` «asks for each list once, doubtful section first, and writes
  nothing by itself»; `TransferPairRow.spec.ts` «with one fine among three good pairs,
  only the fine is labelled and the order stays».
- **R3** → `TransferPairRow.spec.ts` «shows both legs, money out first, each with date,
  account, description and amount» y «paints the bank description as it comes, marked as
  Spanish»; `service.spec.ts` «refuses a pair whose first leg is not the expense, or
  with 1 or 3 legs».
- **R4** → `pairs.spec.ts` bloque `mentionsBizum` (las dos multas reales, las tres buenas
  reales, mayúsculas y minúsculas, cualquiera de las dos piernas, «BIZ» sin «UM»);
  `TransferPairRow.spec.ts` «labels a pair with a Bizum leg and says the fact, not a
  verdict», «puts no label on a pair without a Bizum» y el de la lista (orden intacto).
- **R5** → `pairs.spec.ts` bloque `unlinkConsequence` (0, 1 y 2 piernas marcadas);
  `UnlinkConfirmDialog.spec.ts` (los cuatro tests, incluido el foco en `Cancel`);
  `TransfersView.spec.ts` «Unlink asks first; Cancel sends nothing»; `store.spec.ts`
  «asking opens the question and sends nothing; cancelling closes it».
- **R6** → `pairs.spec.ts` bloque `unlinkedNotice (R6)` (0, 1 y 2 marcadas);
  `store.spec.ts` «a 204 reloads both lists and offers Undo» y «the notice follows the
  marks of the pair: it never says a marked leg counts again»;
  `TransfersView.spec.ts` «confirming unlinks, repaints from the backend and offers
  Undo…»; e2e «unlinking asks first, Cancel sends nothing, and Undo links the pair back».
- **R7** → `store.spec.ts` «Undo links that same pair again, expense first, and offers
  nothing after»; el mismo de la vista y el mismo e2e
  (`{"movementIds":[33339,24377]}`).
- **R8** → `service.spec.ts` «splits a group of 3 in out and in, keeping the received
  order» y «splits an interleaved group of 4 without reordering either column»;
  `AmbiguousGroupCard.spec.ts` «shows the amount of the group and its movements in two
  columns» y «a group of 4 keeps two movements per column».
- **R9** → `TransfersView.spec.ts` «says each empty list with its fixed sentence»;
  `pairs.spec.ts` «are these, letter by letter»; e2e (primer caso).
- **R10** → `AmbiguousGroupCard.spec.ts` «picks nothing beforehand, not even in a group
  of exactly two», «each column is one radio group of its own…», «keeps the button off
  with only one column picked», «turns the button on with one of each column…»;
  `pairs.spec.ts` bloque `linkProblem`; `store.spec.ts` «keeps at most one pick per
  column, and each group apart».
- **R11** → `AmbiguousGroupCard.spec.ts` «keeps the button off and says why when both
  are in the same account»; `store.spec.ts` «an invalid choice sends no request at all»;
  `TransfersView.spec.ts` «links two picked movements of a group of 4…» (clic con la
  elección inválida: cero escrituras); e2e «two picks from the same account never reach
  the server».
- **R12** → `store.spec.ts` «a valid choice sends the POST, reloads, empties the choices
  and offers Undo» y «Undo unlinks with the transferId the 201 gave»; la vista y el e2e
  «pairs two movements of a doubtful group of three, and Undo unlinks them».
- **R13** → `pairs.spec.ts` bloque `transferWriteError` (400, 404 al deshacer y al
  enlazar, 409, red, `ValidationError`, 500 y «never carries a word of the backend
  message»); `store.spec.ts` «a 404 says the pair was already unlinked and reloads», «a
  network failure says nothing changed and does not reload», «a failed Undo…», «a 409…»,
  «a 400 … does NOT reload», «a 500 promises a reload…», «never puts a backend message
  in the notice»; `TransfersView.spec.ts` «a failed write is said in English and the
  backend message is never painted».
- **R14** → `store.spec.ts` «a failed read of the pairs leaves the doubtful groups ready,
  and retries alone» y su simétrico; `TransfersView.spec.ts` «a failed list of pairs
  leaves the doubtful groups painted, and retries alone» y su simétrico.
- **R15 / C1** → `service.spec.ts` «links with a body that is letter by letter the two
  ids, expense first» y «unlinks with a DELETE, no body, and the transferId encoded in
  the path»; `store.spec.ts` «uses no method but GET, POST and DELETE and no path
  outside the two shared ones» (recorre todos los gestos de la pantalla y comprueba
  además que ningún cuerpo nombra `amount`, `categoryId`, `status`,
  `excludedFromTotals` ni `note`); e2e `expectOnlyTransferWrites` en los cuatro casos.
- **C5** → los tests del extracto pasan sin tocarlos; `transfers/` no importa de ninguna
  otra feature (solo de `@/shared` y `@/services`).
- **C7** → «picks nothing beforehand…» (tarjeta), «asks for each list once… and writes
  nothing by itself» (vista), «Opening the screen wrote nothing» (e2e).
- **C8** → la puerta, abajo.

## La puerta

Medido al terminar la **segunda pasada**, sobre el árbol final:

| Paso | Resultado |
|---|---|
| `pnpm type-check` (`vue-tsc --build`) | exit 0 |
| `pnpm build` | exit 0 (CSS 32,09 kB, JS 273,10 kB) |
| `./init.sh` | exit 0, los nueve pasos en verde |
| ↳ 4. Type check (`tsc`) | OK |
| ↳ 5. Lint (`pnpm lint:oxlint:check`, sin `--fix`) | OK |
| ↳ 6. Formato (`pnpm format:check`) | OK |
| ↳ 7. Unitarios | **94 ficheros, 1.452 tests** (1.448 en la primera pasada; antes de la feature, 86 y 1.360) |
| ↳ 8. E2E chromium | OK (en la primera pasada, lanzado aparte: 43 passed; antes 39). En la segunda no se añadió ningún caso |

Sobre el lint: la primera pasada salió en **rojo** con 7 errores en dos de mis tests
(`no-conditional-expect` en `store.spec.ts` y `no-unsafe-optional-chaining` en
`TransferPairRow.spec.ts`) y 6 ficheros sin formatear. Se arreglaron a mano los tests y
se pasó Prettier **solo sobre los ficheros de esta feature**; después, las dos
comprobaciones de la puerta salieron limpias. T21 nombra `pnpm lint` (con `--fix`): se
usó la variante que no escribe, `lint:oxlint:check`, que mira lo mismo.

Última salida de `./init.sh` (resumida):

```
[OK]    feature_list.json válido (24 features)
[OK]    Specs presentes para features sdd con estado no-pending
[OK]    Type check OK (tsc sin errores)
[OK]    Lint OK (oxlint sin errores)
[OK]    Formato OK (Prettier sin diferencias)
 Test Files  94 passed (94)
      Tests  1452 passed (1452)
[OK]    Todos los tests pasan
[OK]    E2E smoke verde (chromium)
[OK]    Entorno listo. Puedes empezar a trabajar.
```

## Pendiente

- **Revisión** (`reviewer`): la lanza el leader; este agente no tiene cómo lanzarla.
- **T22**, la prueba contra el backend real: del leader con el humano, con su visto
  bueno explícito y con la variante que decidan. No se ha hecho nada de ella.
- La feature sigue en `in_progress`. Sin commits.
