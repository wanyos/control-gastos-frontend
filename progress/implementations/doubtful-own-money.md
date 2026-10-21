# doubtful-own-money — implementación

No se ha escrito nada en la base de datos ni en las carpetas de datos del humano. La única
petición al backend real fue de lectura (ver «Prueba real»).

## Lote A — implementación

### Estado: bloqueado en dos pruebas de otras features

Todo el Lote A está escrito y sus pruebas pasan, salvo **dos aserciones de pruebas de otras
features que el propio spec vuelve falsas**. No las he tocado (la orden era parar y
decirlo). Mientras no se decida, `./init.sh` sale en rojo y `./init.sh --checks 27` también.

1. **Feature 27, el aviso de `Transfers` está justo encima de `Doubtful transfers`.**
   `design.md §4` pone la sección nueva entre la línea de aviso y `Doubtful transfers`, así
   que el elemento que sigue a la línea de aviso ya no es `doubtful-section`. Falla en dos
   sitios:
   - `src/features/transfers/__tests__/TransfersView.spec.ts`, prueba
     `puts the summary and its Undo inside the block after unlinking, with no row to keep clear (R3)`,
     línea 295:
     `expect(block.element.nextElementSibling?.matches('[data-test="doubtful-section"]')).toBe(true)`
     → `AssertionError: expected false to be true`.
   - `e2e/action-notice-in-view.spec.ts`, prueba
     `at the top of the page the notice sits between the same blocks as before` (está en
     los `checks` de la feature 27), línea `await expectBetween(page, 'h1', '[data-test="doubtful-section"]')`
     → `expect(now.belowIsTheExpectedOne).toBe(true)`, recibido `false`.
   Arreglo que propondría: cambiar en las dos el vecino de abajo a
   `[data-test="ownership-section"]`. Es cambiar lo que comprueban, por eso no lo he hecho.
2. **Feature 13, una sola petición `POST /api/import`.** `design.md §7` dice que la lectura
   de dudosos de antes va **con `await` antes** del `POST /api/import`. La prueba
   `makes exactly one POST however many times it is called`
   (`src/features/import/__tests__/store.spec.ts`) cuenta el `POST` justo después de llamar
   a `start()`, sin esperar: ahora todavía no ha salido → `AssertionError: expected +0 to be 1`.
   Arreglo que propondría: comprobar el número después de `await flushPromises()` (la prueba
   sigue comprobando que sale un solo `POST` por tres llamadas). Tampoco lo he tocado.

Dos cosas más que no son bloqueo pero conviene que el leader vea, porque tocan aserciones de
otras features:

- **`<div role="region">` y no `<section>` para la sección nueva** de `Transfers`. La prueba
  de la feature 24 `asks for each list once, doubtful section first, and writes nothing by itself (R2, R8, C7)`
  comprueba que los `<section>` de la pantalla son exactamente
  `['doubtful-section', 'pairs-section']`. Con un `<section>` más, falla. He usado un
  `div` con `role="region"` y `aria-labelledby` (lo mismo para un lector de pantalla) para no
  cambiar esa aserción. Si se prefiere `<section>`, hay que cambiar esa línea.
- **`src/features/transfers/__tests__/store.spec.ts`, prueba
  `uses no method but GET, POST and DELETE and no path outside the two shared ones`**: la lista
  de rutas `GET` esperada pasa de `[/api/transfers, /api/transfers/ambiguous]` a esas dos más
  `/api/movements`, con comentario. `tasks.md` T8 autoriza cambiar los números de lecturas;
  esto es la misma consecuencia (la pantalla lee una lista más), pero no es un número, así que
  lo digo. Lo mismo en esa prueba: su nombre dice «the two shared ones» y no se renombra.
  También quedan con nombre impreciso, sin renombrar, `a 204 reloads both lists and offers Undo`
  y `a network failure reloads both lists: the write may have been heard (2026-10-16)`: ahora
  recargan las tres listas.

### Tasks

T1–T11 y T13 marcadas `[x]` en `specs/35-doubtful-own-money/tasks.md`. **T12 sin marcar**:
los 13 archivos de `e2e/` están adaptados, pero la prueba de la feature 27 del punto 1 no
pasa. **T14 sin marcar**: `./init.sh` y `--checks 27` en rojo por los bloqueos.

### Archivos modificados / creados

Código:
- `src/shared/movements.ts` — `OwnershipStatus`, `MovementOwnership`, `Movement.ownership?`,
  `parseOwnership`; `parseMovement(..., 'required')` exige `ownership` además de `deposit`;
  `MovementQuery.ownership` y `buildMovementsQuery` (`ownership=doubtful`).
- `src/shared/ownership.ts` (nuevo) — `isBetweenOwnAccounts`, `isDoubtfulOwnership`,
  `ownershipLine`, `withKnownOwnership`, `OWN_MONEY_HINT`.
- `src/features/statement/components/StatementRow.vue` — `statement-row-ownership`, y lo de
  entre tus cuentas tachado y en gris.
- `src/features/statement/store.ts` — `hiddenBySwitch` (casilla) y `withKnownOwnership` en
  `adoptUpdated`.
- `src/features/transfers/types.ts`, `service.ts`, `pairs.ts`, `store.ts` — tipos, las dos
  lecturas y la escritura con cuerpo literal, textos, la tercera lista, el número, la
  respuesta y su `Undo`. `reloadBoth` pasa a llamarse `reloadLists` (design §4); no tenía
  más usos.
- `src/features/transfers/components/DoubtfulOwnershipRow.vue`, `DoubtfulOwnershipList.vue`,
  `DoubtfulOwnershipCountBadge.vue` (nuevos).
- `src/features/transfers/views/TransfersView.vue` — la sección nueva arriba del todo.
- `src/shared/components/AppSidebar.vue` — solo el número junto a `Transfers`, con
  `TRANSFERS_ROUTE_NAME` local (design §8). `src/router/index.ts` sin tocar.
- `src/features/import/service.ts` (`readDoubtfulIds`), `store.ts` (`newDoubtfulCount`,
  lecturas de antes y después, refresco del número), `summary.ts` (`newDoubtfulLine`),
  `components/ImportDialog.vue` (la línea).

Pruebas (solo archivos de la cabecera):
- Nuevas: `src/shared/__tests__/ownership.spec.ts`,
  `src/features/transfers/__tests__/DoubtfulOwnershipRow.spec.ts`,
  `src/features/transfers/__tests__/DoubtfulOwnershipCountBadge.spec.ts`,
  `e2e/doubtful-own-money.spec.ts`.
- Ampliadas: `src/shared/__tests__/movements.spec.ts`,
  `src/shared/components/__tests__/AppShell.spec.ts`,
  `src/features/statement/__tests__/{fixtures,StatementRow.spec,StatementView.spec,store.spec}.ts`,
  `src/features/transfers/__tests__/{fixtures,service.spec,store.spec,TransfersView.spec}.ts`,
  `src/features/import/__tests__/{fixtures,store.spec,summary.spec,ImportDialog.spec}.ts`.
- Solo `ownership: null` en movimientos de `GET` y quitar `ownership` en respuestas de
  `PATCH`: `src/features/{category-rules,overview,review}/__tests__/fixtures.ts`,
  `src/features/review/__tests__/service.spec.ts` (el objeto leído esperado gana
  `ownership: null`).
- `e2e/`: los 13 archivos de la cabecera salvo `app-boot.spec.ts` (ya contestaba página
  vacía a todo `/api/movements`; sin tocar). En cada uno: `ownership: null` en sus
  movimientos, una ruta que contesta página vacía a `GET /api/movements?ownership=doubtful`
  registrada después de cada ruta de `/api/movements`, y esa petición fuera de las listas
  de peticiones que vigila cada prueba.
- Sin tocar por no necesitar nada: `src/shared/__tests__/deposits.spec.ts`,
  `src/features/statement/__tests__/{StatementList,MonthTotals,service}.spec.ts`,
  `src/features/review/__tests__/{store,MovementRow,ReviewView}.spec.ts`,
  `e2e/app-boot.spec.ts`.

### Decisiones tomadas

- **Pruebas del store de importación que cuentan `GET /api/movements`**: en vez de cambiar
  sus números (design §7 lo preveía), el `mockApi` de `src/features/import/__tests__/fixtures.ts`
  apunta las lecturas con `ownership=doubtful` aparte (`GET_DOUBTFUL`) y las contesta con su
  propia respuesta (`doubtful`). Así ninguna aserción existente cambia; las pruebas nuevas
  miran `GET_DOUBTFUL` y `doubtfulQueries`.
- `mockApi` de `transfers` gana `doubtful` (las dos lecturas, vacía por defecto) y `answer`
  (`PATCH /api/movements/:id`), y apunta la `query` de cada llamada solo cuando la hay (las
  aserciones `toEqual` existentes no cambian).
- La prueba de `ImportDialog` con 0 dudosos nuevos va en una prueba aparte
  (`paints no line of new doubtful movements when the import brought none`); el nombre que
  piden los `checks` (`says how many new doubtful movements the import brought`) existe tal
  cual.
- Un movimiento de depósito con `ownership` se pinta exactamente igual que sin él (la prueba
  compara el HTML de los dos).

### Trazabilidad

- R1 → `reads the ownership of every movement and rejects a missing one`, `asks only the doubtful movements when the ownership filter is set`
- R2 → `keeps the ownership a PATCH answer does not carry`, `keeps the ownership of a line after changing its category`
- R3 → `shows the date, account, description, signed amount and reason of a doubtful movement`, `lists the doubtful movements of own money above the doubtful transfers`, `asks the doubtful movements with the ownership filter and 200 per page`
- R4 → `says there are no doubtful movements when the list is empty`
- R5 → `a failed read of the doubtful movements offers Try again and leaves the other sections alone`
- R6 → `answering it is mine sends mine for that movement and reloads the doubtful list`, `sends only the ownership decision of one movement`, e2e `answering it is mine sends one PATCH with mine and the movement leaves the list`
- R7 → `answering not mine sends not_mine for that movement and reloads the doubtful list`, e2e `answering not mine and then undo puts the movement back in the list`
- R8 → `undo sends a null decision for the same movement and reloads`, e2e `answering not mine and then undo puts the movement back in the list`
- R9 → `a rejected answer says why and leaves the list as it was`, `a network failure on an answer says so and reloads`
- R10 → `a second answer while one is in flight sends nothing`, `loading and reloading the screen send no answer`, `disables both answers while a write is in flight`
- R11 → `shows the number of doubtful movements only when there are some`, `puts the doubtful count next to Transfers and nowhere else`, e2e `the number next to Transfers says how many doubtful movements there are`
- R12 → `the doubtful count follows the last read of the list`, `a failed count leaves the number unknown`, `refreshes the doubtful count after an import`
- R13 → `counts the doubtful movements that were not there before the import`, `leaves no new doubtful count when a read of the doubtful movements fails`, `writes the line of new doubtful movements in singular and plural`, `says how many new doubtful movements the import brought`
- R14 → `crosses out money between your accounts and says so next to the account`, `writes the line of each ownership status and nothing on a deposit`, `leaves a deposit movement and a not mine movement painted as before`
- R15 → `paints a doubtful movement of own money with Doubtful in amber and its amount not crossed out`
- R16 → `the checkbox hides money between your accounts and keeps a doubtful one`, `counts the hidden movements between your accounts in Hiding`

### Documentos actualizados

`git grep -n "reloadBoth\|both lists\|two reads\|four calls" -- . ':!progress' ':!specs'`:
el comentario de cabecera de `src/features/transfers/service.ts` («The four calls…») se ha
corregido. Quedan dos nombres de prueba con «both lists» (ver arriba: no se renombran).
`git grep -n "ownership\|AppSidebar\|ReviewCountBadge" -- docs README.md`:
`docs/architecture.md` (líneas 75, 219, 418-419) no nombra todavía los componentes nuevos ni
el segundo número del menú; es el Lote B (T16), no es de este lote. `docs/guia-de-uso.md`
también es Lote B (T15).

### Prueba real

Solo lecturas (`GET`) al backend local en `localhost:3000`, guardadas en el directorio
temporal de la sesión (fuera de git) y borradas al acabar:

- `GET /api/movements?ownership=doubtful&page=1&pageSize=200`: 0 movimientos, `total` 0
  (lo que dice la hoja: hoy hay 0 dudosos).
- `GET /api/movements?page=1&pageSize=200`: 200 movimientos de 1667; los 200 traen la clave
  `ownership`.

Pasados por el código nuevo (`parseMovementPage` y las funciones de `src/shared/ownership.ts`,
con Node y un cargador temporal): los 200 se leen sin error; 190 con `ownership: null`, 10
`own` → 10 líneas `Between your accounts`, 0 dudosos, 0 movimientos de depósito con
`ownership`. No se ha podido probar un dudoso real (no hay ninguno).

### Último ./init.sh

`timeout 900 ./init.sh` → **EXIT 1**. Líneas relevantes (copiadas de la salida, sin colores):

```
[OK]    feature_list.json válido (36 features)
[OK]    Specs presentes para features sdd con estado no-pending
[OK]    Type check OK (tsc sin errores)
[OK]    OK: pnpm lint:oxlint:check
[OK]    OK: pnpm format:check
[INFO]  Ejecutando: pnpm test:unit
 ❯ src/features/import/__tests__/store.spec.ts (37 tests | 1 failed) 152ms
       × makes exactly one POST however many times it is called 9ms
 ❯ src/features/transfers/__tests__/TransfersView.spec.ts (15 tests | 1 failed) 778ms
       × puts the summary and its Undo inside the block after unlinking, with no row to keep clear (R3) 48ms
 Test Files  2 failed | 118 passed (120)
      Tests  2 failed | 2024 passed (2026)
[FAIL]  Hay tests rotos
[OK]    Cabeceras Archivos: de 25 tasks.md: ninguna declara dos rutas que solo se distingan en mayúsculas y minúsculas
[OK]    OK: pnpm type-check (vue-tsc --build, incluye los .vue)
[INFO]  Ejecutando: pnpm test:e2e --project=chromium
[FAIL]  E2E smoke rojo (chromium):
  1) [chromium] › e2ection-notice-in-view.spec.ts:940:1 › at the top of the page the notice sits between the same blocks as before
  1 failed
  74 passed (23.7s)
[FAIL]  Entorno NO está listo. Resuelve los errores antes de avanzar.
EXIT 1
```

Los tres fallos son exactamente los dos bloqueos de arriba; nada más está en rojo.

### Último ./init.sh --checks

Cada uno con `timeout 900 ./init.sh --checks <id>`:

| Feature | Resultado | Código de salida |
|---|---|---|
| 35 | `[OK]    Checks: 12 de 12 en verde.` | 0 |
| 34 | `[OK]    Checks: 12 de 12 en verde.` | 0 |
| 33 | `[OK]    Checks: 11 de 11 en verde.` | 0 |
| 32 | `[OK]    Checks: 14 de 14 en verde.` | 0 |
| 31 | `[OK]    Checks: 10 de 10 en verde.` | 0 |
| 30 | `[OK]    Checks: 9 de 9 en verde.` | 0 |
| 29 | `[OK]    Checks: 11 de 11 en verde.` | 0 |
| 28 | `[OK]    Checks: 8 de 8 en verde.` | 0 |
| 27 | `[FAIL]  Checks: 11 de 12 en verde. La feature no se puede cerrar.` | 1 |

El que falla en la 27 es el check 5 («Si estoy arriba del todo, lo sigo viendo, como hasta
ahora.»), prueba `at the top of the page the notice sits between the same blocks as before`:

```
[FAIL]      exit 1 — últimas líneas (completo en /tmp/harness_check_5.log):
                931 |   expect(now.aboveIsTheExpectedOne).toBe(true)
              > 932 |   expect(now.belowIsTheExpectedOne).toBe(true)
```

Es el bloqueo 1.

### Sugerencias fuera de scope (NO aplicadas)

- `src/features/transfers/__tests__/fixtures.ts` (feature 24) lleva en las descripciones de
  movimientos de `GOOD_1`…`GOOD_3` un nombre completo de persona que parece real. No lo he
  tocado (no es lo que esta feature vuelve falso).

## Lote A — cierre

Segunda sesión del implementer en el Lote A (2026-10-21). No se ha escrito nada en la base de
datos ni en las carpetas de datos del humano. No se ha hecho ninguna petición al backend real.

### Lo cambiado, según las decisiones del leader

1. **Feature 27, el bloque de abajo.** Solo se cambia el selector de abajo; los nombres de las
   pruebas y el resto de cada una quedan igual:
   - `src/features/transfers/__tests__/TransfersView.spec.ts`, prueba
     `puts the summary and its Undo inside the block after unlinking, with no row to keep clear (R3)`:
     `[data-test="doubtful-section"]` → `[data-test="ownership-section"]` (el `expect`
     de la línea 303). Prettier la parte en tres líneas porque es demasiado larga (era lo
     único que hacía fallar `pnpm format:check`); la he formateado con
     `pnpm exec prettier --write` solo en ese archivo y el `diff` muestra que solo ha cambiado esa línea.
   - `e2e/action-notice-in-view.spec.ts`, prueba
     `at the top of the page the notice sits between the same blocks as before`:
     `expectBetween(page, 'h1', '[data-test="doubtful-section"]')` →
     `expectBetween(page, 'h1', '[data-test="ownership-section"]')`.
2. **Feature 13, una sola petición `POST`.** `src/features/import/__tests__/store.spec.ts`,
   prueba `makes exactly one POST however many times it is called`: las tres llamadas a
   `start()` se siguen haciendo de forma síncrona, una tras otra; la comprobación del estado `importing`
   sigue justo después de ellas, y ahora va `await flushPromises()` (como ya hace el resto del
   archivo) antes de contar el `POST`, con un comentario de por qué.
   **Prueba de que sigue demostrando lo que dice su nombre.** Cambio temporal en
   `src/features/import/store.ts` para que la segunda y la tercera llamada a `start()` no se
   corten (`if (current.step !== 'confirm' && current.step !== 'importing') return`, y
   `fileCount` sacado del estado `importing`). Se lanzó
   `pnpm exec vitest run src/features/import/__tests__/store.spec.ts -t "makes exactly one POST"`
   y la prueba falla: `AssertionError: expected 3 to be 1`. Después se volvió a dejar el archivo como estaba, a partir de una copia
   (`cmp` sin diferencias) y el archivo entero pasa: `Tests  37 passed (37)`.
   Un primer intento de este cambio temporal estaba mal hecho (rompía en `current.pending`
   antes de llegar al `POST`) y no vale como prueba; el que cuenta es el segundo.
3. `<div role="region" aria-labelledby>` y la ruta `/api/movements` en la lista de `GET` de
   `transfers/store.spec.ts`: sin tocar, como decidió el leader.

### Tasks

T12 y T14 marcadas `[x]` en `specs/35-doubtful-own-money/tasks.md` después de que
`./init.sh` saliera con 0. El Lote A está completo (T1–T14).

### Último ./init.sh

`timeout 900 ./init.sh` → **EXIT 0**. Líneas (sin colores):

```
[OK]    OK: pnpm lint:oxlint:check
[OK]    OK: pnpm format:check
 Test Files  120 passed (120)
      Tests  2026 passed (2026)
[OK]    OK: pnpm type-check (vue-tsc --build, incluye los .vue)
[OK]    E2E smoke verde (chromium)
[OK]    Entorno listo. Puedes empezar a trabajar.
```

(La pasada anterior a formatear salió con EXIT 1 solo por `[FAIL]  Fallido: pnpm format:check`
en `TransfersView.spec.ts`; las pruebas unitarias y las E2E ya estaban en verde en esa pasada.)

### Último ./init.sh --checks

Cada uno con `timeout 900 ./init.sh --checks <id>`; última línea y código de salida:

| Feature | Última línea | Código de salida |
|---|---|---|
| 35 | `[OK]    Checks: 12 de 12 en verde.` | 0 |
| 34 | `[OK]    Checks: 12 de 12 en verde.` | 0 |
| 33 | `[OK]    Checks: 11 de 11 en verde.` | 0 |
| 32 | `[OK]    Checks: 14 de 14 en verde.` | 0 |
| 31 | `[OK]    Checks: 10 de 10 en verde.` | 0 |
| 30 | `[OK]    Checks: 9 de 9 en verde.` | 0 |
| 29 | `[OK]    Checks: 11 de 11 en verde.` | 0 |
| 28 | `[OK]    Checks: 8 de 8 en verde.` | 0 |
| 27 | `[OK]    Checks: 12 de 12 en verde.` | 0 |

### Documentos actualizados

`git grep -n 'doubtful-section' -- e2e src`: además del código de la vista, solo quedan dos
usos en `TransfersView.spec.ts` (línea 69, la lista de `<section>` de la feature 24, y
línea 352, el orden de las secciones de la prueba nueva). Siguen siendo ciertos; no se tocan.
Los documentos que esta feature vuelve falsos son del Lote B (T15, T16).

## Lote B — implementación

Sesión del implementer en el Lote B (2026-10-21). No se ha escrito nada en la base de datos
ni en las carpetas de datos del humano. No se ha hecho ninguna petición al backend real.
Solo se han tocado `docs/guia-de-uso.md` y `docs/architecture.md` (cabecera `Archivos:` del
Lote B), más `[x]` en T15 y T16 de `tasks.md` y el plan en `progress/current.md`.

### Tasks

T15 y T16 marcadas `[x]`. Con el Lote A, las 16 tasks de la feature están cerradas.

### Archivos modificados

**`docs/guia-de-uso.md` (T15)** — 148 líneas añadidas, 13 quitadas (las 13 quitadas son
texto escrito por agentes, ninguna es una nota del humano):
- «Qué verás si el backend no está arrancado»: la fila de `Transfers` añade
  `Couldn't load the doubtful movements.` y que el menú sale sin número.
- «Tres cosas que valen para toda la aplicación»: el número junto a `Transfers`, y que la
  aplicación guarda también la respuesta a si un movimiento dudoso es tuyo.
- «Mapa de la aplicación»: filas de `Transfers` (también los dudosos de dinero propio; escribe
  `It's mine` / `Not mine`) y del botón `Import` (la línea de dudosos nuevos).
- `4. Movements`: bloque nuevo después del de la feature 34, «Nuevo desde la feature 35, sin
  probar en tu primera revisión: el dinero entre tus cuentas y los movimientos dudosos»
  (`Between your accounts`, `Doubtful …` en ámbar, depósitos sin cambios, la línea sigue
  tachada tras cambiar la categoría; dice que el 2026-10-21 no había ningún dudoso). En el
  paso 5 (casilla), párrafo aparte **debajo** del párrafo de la feature 31, que a su vez está
  debajo del `-- ok` del humano. En «Lo que no hace»: el recuento sin casilla cuenta también
  `Between your accounts`; «Nada se marca solo» dice que el backend decide lo de entre tus
  cuentas; el límite de 200 vale también para ellos; y la nota gris bajo las cifras no habla
  de ellos (incoherencia heredada que dice `decisions.md`).
- `5. Review`, «Lo que no hace»: no enseña `Between your accounts` ni `Doubtful`.
- `7. Transfers`: párrafo nuevo en «Para qué sirve» (la sección nueva, y que no es lo mismo
  que `Doubtful transfers`); en el paso 1, párrafo aparte debajo del `-- ok`, que empieza por
  «Nuevo desde la feature 35, sin probar en tu primera revisión:» (ahora son tres
  secciones); subsección nueva «Qué probar — los movimientos dudosos de dinero propio»
  (pasos 13 a 20: número del menú, frase vacía, tarjeta, `It's mine`, `Undo`, `Not mine`,
  botones apagados mientras se guarda, respuesta rechazada y corte de red), con un aviso
  arriba: «El 2026-10-21 no había ningún movimiento dudoso en tus datos»; dos filas nuevas en
  la tabla «Qué escribe y cómo se deshace»; tres puntos nuevos en «Lo que no hace».
- `8. El botón Import`: párrafo aparte bajo el paso 7 (la línea en ámbar de dudosos nuevos,
  singular y plural) y bajo el paso 10 (el número de `Transfers` se pone al día); en «Lo que
  no hace», los dudosos se responden en `Transfers`. Estos pasos no tenían nota del humano.
- «Trabajo A»: el paso 4 (sin nota) añade `Between your accounts`; párrafo final sobre lo que
  ahora hace el backend.

**`docs/architecture.md` (T16)**: estructura de carpetas (`import`: `newDoubtfulCount`,
`readDoubtfulIds`, `newDoubtfulLine`; `statement/store.ts`: la casilla y el `ownership` tras
un `PATCH`; `transfers`: los tres componentes nuevos, la tercera lista, el número, las tres
funciones nuevas del servicio, `OwnershipDecision` y `Gesture`; `shared/movements.ts` lee
`ownership`; `shared/ownership.ts` nuevo). El párrafo «La pantalla que escribe
`transferId`» decía que `transfers` **no escribe nada más** y ningún `PATCH`: ahora dice que
desde la #35 escribe `PATCH /api/movements/:id` con solo `ownershipDecision`, y que se
vuelven a pedir las tres listas. Párrafo nuevo «Lo de entre tus cuentas (feature #35)» junto
al de los depósitos. Y en «Dependencias nuevas de la feature #15», que `AppSidebar.vue` pinta
un segundo número montando `DoubtfulOwnershipCountBadge` y que `import/store.ts` refresca ese
número.

### Las notas del humano en `docs/guia-de-uso.md`

Antes de editar se guardó una copia del archivo en el directorio temporal de la sesión. Con un
script de `awk` se sacaron las notas del humano (las líneas que empiezan por `--`, que no sean
`---`, con sus líneas de continuación con sangría, y los bloques «Mis notas de esta prueba»
hasta la primera línea en blanco, también con sus continuaciones sin `>`), y se compararon
antes y después con `cmp`, sin los números de línea:

- **Antes: 153 líneas de nota. Después: 153.** `cmp` sin diferencias: las mismas, letra por
  letra (también el espacio final de un `-- ok `) y en el mismo orden.
- Líneas que empiezan por `--` (sin `---`): 92 antes, 92 después. Bloques «Mis notas de esta
  prueba»: 11 antes, 11 después.
- La línea que hay justo encima de cada nota es la misma antes y después (comparado con
  `diff`): no se ha puesto texto nuevo encima de ningún `-- ok`.
- `git diff docs/guia-de-uso.md`: las 13 líneas quitadas son filas de tabla y frases de
  agente (filas de `Transfers` y `Import` del mapa y de la tabla de fallos, la frase del menú,
  la de lo que escribe la aplicación, dos de «Lo que no hace» de `Movements`, una de `Import`
  y el paso 4 del trabajo A). Ninguna es una nota.

### Documentos actualizados

`git grep -n -i "not counted\|dos listas\|las dos secciones\|ReviewCountBadge\|únic[ao] pantalla que escribe\|ownership" -- . ':!progress' ':!specs' ':!src' ':!e2e' ':!docs/guia-de-uso.md'`
y `git grep -n -i "transfers\|sidebar\|menú lateral" -- README.md docs/stack.md docs/conventions.md docs/verification.md docs/related-projects.md`:
fuera de los dos archivos del lote solo salen entradas históricas de `docs/roadmap.md` (no se
toca) y párrafos de `docs/stack.md` sobre otras pruebas de `e2e/` que siguen siendo ciertos.
Ninguna línea fuera del lote queda falsa por esta feature.

### Último ./init.sh

`timeout 900 ./init.sh` → **EXIT 0**. Última línea: `[OK]    Entorno listo. Puedes empezar a trabajar.`
(`Test Files  120 passed (120)`, `Tests  2026 passed (2026)`, `E2E smoke verde (chromium)`).

### Último ./init.sh --checks

`timeout 900 ./init.sh --checks 35` → **EXIT 0**. Última línea: `[OK]    Checks: 12 de 12 en verde.`

Después de las dos pasadas solo se cambió una línea de `docs/architecture.md` (la de
«Sugerencias» de abajo). `./init.sh` no mira `docs/` (el `format:check` de `package.json`
cubre `src/`, `e2e/` y la configuración), así que no se ha vuelto a lanzar.
`pnpm exec prettier --check` sobre los dos documentos avisa de formato, igual que sobre su
versión de `HEAD` (comprobado: los dos salen con 1 también en `HEAD`).

### Sugerencias fuera de scope (NO aplicadas)

Ninguna. Una corrección de más, dentro de `docs/architecture.md`: el párrafo de las features
#17 y #18 decía que `review/service.ts` es «la única pantalla que escribe movimientos». Ya
era falso desde la #21 (`Movements`), y con la #35 escribe también `Transfers`. Ahora dice
«que entonces era la única…» y nombra las dos.
