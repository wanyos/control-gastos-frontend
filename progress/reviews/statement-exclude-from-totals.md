# Review — feature 22 `statement-exclude-from-totals`

**Veredicto:** APPROVED

- **Fecha:** 2026-09-29 · **Agente:** reviewer
- **Spec:** `specs/22-statement-exclude-from-totals/` (5 🔴 aprobadas por el humano sin
  cambios el 2026-09-29)
- **Informe revisado:** `progress/implementation/statement-exclude-from-totals.md`
- **Contrato contrastado hoy:** `../gastos-backend/docs/api-contract.md`, líneas 250
  (`Movement.excludedFromTotals`), 801-872 (`PATCH /api/movements`) y 876-911
  (`PATCH /api/movements/:id`). Leído del fichero, no de memoria.

---

## Puerta ejecutada por mí (no copiada del informe)

| Comando | Resultado |
|---|---|
| `pnpm type-check` | ✅ `vue-tsc --build`, exit 0 |
| `pnpm lint` | ✅ `oxlint . --fix`, exit 0, sin hallazgos |
| `pnpm test:unit` | ✅ **84 ficheros, 1292 tests**, 0 fallos |
| `pnpm build` | ✅ `dist/assets/index-C0l2mQ5d.js` 254,14 kB (80,43 kB gzip) |
| `pnpm test:e2e --project=chromium` | ✅ **34 passed** (11,4 s) |
| `./init.sh` | ✅ «Entorno listo. Puedes empezar a trabajar.» |

Coincide con lo que declara el informe, cifra a cifra.

> Nota de proceso: `docs/verification.md` dice `pnpm test:unit run`. El script es
> `vitest run`, así que ese `run` extra se interpreta como **filtro** y devuelve «No
> test files found». El comando correcto es `pnpm test:unit`. No es de esta feature;
> queda apuntado abajo.

---

## Los seis puntos con lupa

### 1. El cuerpo del PATCH — correcto

- Único camino de escritura (🔴 5): `src/features/statement/service.ts:34`
  `setMovementsExcluded(ids, excluded)` llama a `updateMovements({ ids, excludedFromTotals })`.
  El store **no importa** `updateMovements` (`store.ts:25` importa solo
  `setMovementCategory` y `setMovementsExcluded`); buscando `updateMovements` en
  `features/statement/` solo aparece en `service.ts`. Un solo sitio que vigilar.
- Cuerpo campo a campo: `src/shared/movements.ts:296` `changesBody` copia
  `categoryId` / `status` / `excludedFromTotals` uno a uno; `movements.ts:387` hace
  `patch({ ids, ...changes })`, y ese *spread* es de la **salida** de `changesBody`,
  no de nada que venga de la vista. `status` y `categoryId` no tienen entrada: la firma
  de `setMovementsExcluded` solo admite `number[]` y `boolean`.
- Booleano literal: `movements.ts:303`, `if (typeof changes.excludedFromTotals === 'boolean')`.
  Con `null`, `"true"`, `"false"`, `0` o `1` el campo **no se copia**, el cuerpo queda
  vacío y `movements.ts:384` lanza `ValidationError` **antes de la red**. Es exactamente
  lo que pide el contrato (líneas 825 y 871: esos valores son 400 y no se convierten).
- El test de contrabando prueba lo que dice, no es decorativo:
  `statement/__tests__/service.spec.ts:130` pasa un objeto con `status`,
  `categoryId`, `amount` y `note`, y comprueba que el cuerpo enviado es exactamente
  `{"ids":[10,11],"excludedFromTotals":true}`, con cuatro `not.toContain` y con
  `Object.keys(...)` igual a `['ids','excludedFromTotals']`.
  `service.spec.ts:154` recorre los cinco valores no booleanos y exige **cero**
  peticiones (`api.calls` de longitud 0), no «una petición con otro valor».
  El e2e lo repite en navegador real (`e2e/statement-exclude-from-totals.spec.ts:262-268`).

### 2. Nada sale a `:3000` — correcto, y esta vez importaba

- Unitarios: `mockApi` sustituye `fetch` (`statement/__tests__/fixtures.ts`); el único
  `:3000` que aparece en `src/` es `http.spec.ts` con el host falso `api.test:3000` y
  los tests de `config.ts`. Ningún test hace red.
- E2E: los **ocho** ficheros de `e2e/` instalan la red de seguridad que aborta cualquier
  `**/api/**` **antes** de declarar las rutas que sí esperan (en el nuevo,
  `statement-exclude-from-totals.spec.ts:125`, con el comentario de por qué). Verificado
  fichero a fichero, no por muestreo. Como el dev server proxya `/api` a `:3000`, esa red
  es lo único que separa la suite de escribir en datos reales; aquí, además, escribiría
  **en bloque**.
- Refuerzo extra del spec nuevo: `spec.ts:277` exige que los métodos vistos en toda la
  sesión sean exactamente `GET` y `PATCH`, y `spec.ts:136` aborta cualquier ruta que
  empiece por `/api/movements` pero no sea exactamente `/api/movements`.

### 3. Tope de 200 e ids repetidos — cubierto en tres capas

- Barrera de UI: `store.ts:368` no añade una casilla por encima de `MAX_IDS`;
  `store.ts:374` `selectAllShown` corta en 200; `store.ts:387` `idsToChange` vuelve a
  cortar. Test: `store.spec.ts:763` (220 filas, 200 seleccionadas, y un clic más no
  cambia nada).
- Barrera de frontera: `movements.ts:379` deduplica con `new Set` y `movements.ts:380`
  rechaza 0 o más de 200 con `ValidationError` antes de la red. Tests:
  `service.spec.ts:168` (vacío y 201 ids, cero llamadas) y, para el dedup, el test
  heredado `review/__tests__/service.spec.ts:318`.
- Los `selectedIds` no pueden repetirse por construcción (`store.ts:364`).

### 4. La nota permanente de la F19 — verificado con git, no leyendo

`git status --porcelain` y `git diff --stat` sobre
`src/features/statement/components/MonthTotals.vue` y
`src/features/statement/__tests__/MonthTotals.spec.ts` devuelven **vacío**: los dos
ficheros no tienen ni una línea de diff. Además hay dos aserciones nuevas de que la
nota sigue en pantalla: una en `StatementView.spec.ts` y otra en el e2e
(`spec.ts:276`, el bloque de la nota contiene `raw bank movements`). C4 cumplido.

### 5. Las sumas — una sola relectura, en segundo plano, y cero aritmética en cliente

- `store.ts:409`: tras adoptar los movimientos devueltos se llama **una** vez a
  `refreshQuietly()` (`store.ts:242`), que no toca `isLoading` ni vacía `result`, y
  adopta `totals` y `pagination` de esa respuesta. También tras el `Undo`, porque el
  `Undo` pasa por el mismo `applyExclusion`.
- Conteo real: `store.spec.ts:846` exige exactamente 2 lecturas del mes (la inicial más
  la de después de escribir) y `isLoading === false`; el e2e mide `monthReads` de 1 a 2
  (`spec.ts:247` y `spec.ts:271`).
- C3 probado en serio: `store.spec.ts:1034` devuelve unos `totals` que **no** cuadran
  con las filas de pantalla y exige que la pantalla pinte los del backend. Un cliente
  que restara importes fallaría ese test. En el e2e el falso servidor recalcula el gasto
  del lado servidor (`spec.ts:181-188`) y la pantalla pasa de `240,00` a `210,00`.
- No hay ninguna suma en `MonthTotals.vue` ni en la vista: `StatementView.vue:21` le
  pasa `store.result.totals` tal cual.

### 6. Las tres desviaciones — las tres aceptables

1. **`writeErrorMessage(error, gesture)` con segundo parámetro** (`actions.ts:88`), en
   vez de reescribir la frase del 400. **Aceptable, y mejor que lo escrito en el design**:
   el `design.md` §7.2 habría cambiado el mensaje de la F21. Con el parámetro por defecto
   (`'category'`) las frases de la F21 quedan palabra por palabra, y hay test de las dos
   familias. Ninguna pinta el `message` del backend (R15).
2. **`review/__tests__/service.spec.ts` gana una línea.** Verificado con `git diff`: es
   **exactamente** `excludedFromTotals: false` dentro de un `toEqual` exhaustivo del
   movimiento ya parseado (línea 116). **Ninguna aserción de conducta cambia**: es el
   dato que el campo obligatorio exige. Aceptable.
3. **Los cinco e2e previos ganan una línea de fixture.** Verificado con `git diff`: 2
   líneas cada uno, y son **un comentario más el dato `excludedFromTotals: false`**
   dentro del constructor de movimiento. **Ninguna aserción cambia** en ninguno de los
   cinco. Y el campo **es** obligatorio según el contrato de hoy: la línea 250 dice que
   todo movimiento lo trae, también los anteriores a la feature 49, y la 744 que ningún
   campo anterior desaparece. Hacerlo opcional con `false` por defecto habría sido peor:
   una lista entera se leería como «nada marcado» si el backend dejara de mandarlo.
   Aceptable, y el test `service.spec.ts:190` fija esa decisión (un movimiento **sin** el
   campo falla nombrándolo).

Cambios menores también declarados y comprobados: `mockApi().queries()` filtra ahora por
método `GET` (antes en esa ruta solo había GET, así que ningún test anterior cambia de
resultado), y el texto del `ValidationError` de `updateMovement(s)` menciona los tres
campos. Ninguno afecta a conducta.

### T23

**No exigida y no ejecutada**, como pide el spec (C8) y el encargo. Queda pendiente del
visto bueno explícito del humano. `tasks.md` la deja en `[ ]` con la justificación
escrita en la propia línea y en el informe §8: justificación válida.

---

## Trazabilidad requirements ↔ tests (SDD)

- R1: [x] `statement/__tests__/service.spec.ts:95,110,121` (cuerpo literal en los dos
  sentidos, y bloque también para uno solo) + `store.spec.ts:832` + e2e `:242`
- R2: [x] `store.spec.ts:860` (solo viajan los que cambian) y `:763` (tope de 200);
  `service.spec.ts:168` (vacío y 201 antes de la red)
- R3: [x] `store.spec.ts:875` (**cero** peticiones y aviso) + `actions.spec.ts` (`NOTHING_TO_CHANGE`)
- R4: [x] `StatementRow.spec.ts:165`, `StatementList.spec.ts`, `StatementView.spec.ts`, e2e `:213`
- R5: [x] `StatementRow.spec.ts:172`, `StatementSelectionBar.spec.ts:15,22`, e2e `:228`
- R6: [x] `StatementRow.spec.ts:190,202`, `store.spec.ts:721`, e2e `:230`
- R7: [x] `store.spec.ts:733,794,810,1076`, e2e `:370`
- R8: [x] `StatementRow.spec.ts:221,233,240,255`
- R9: [x] `StatementList.spec.ts`, `store.spec.ts:921` (mismas filas, mismo orden), e2e `:273`
- R10: [x] `store.spec.ts:907` (un `neutral` y una pierna de traspaso)
- R11: [x] `store.spec.ts:832` (filas sustituidas al instante), `StatementView.spec.ts`
- R12: [x] `store.spec.ts:846` (dos lecturas, sin `isLoading`) y `:1052`; e2e `:271`
- R13: [x] `ExcludeConfirmDialog.spec.ts` (5 casos), `StatementView.spec.ts`, e2e `:308`
- R14: [x] `store.spec.ts:934,954`, `actions.spec.ts` (`exclusionSummary`), e2e `:282`
- R15: [x] `store.spec.ts:986` y `:1006` (comprueban que el texto español del backend no
  aparece), `actions.spec.ts`; e2e `:348,364`
- R16: [x] `store.spec.ts:986,1006,1022` (400 no recarga, 404 sí, red no) y e2e `:333`
- C1: [x] `service.spec.ts:130,154` + e2e `:263`
- C2: [x] no existe ningún escritor automático: la única entrada a `setExcluded` es
  `StatementView.vue:284`, colgada de la barra. Verificado por lectura; no hay nada que simular
- C3: [x] `store.spec.ts:1034`
- C4: [x] `git diff` vacío en `MonthTotals.{vue,spec.ts}` más dos aserciones nuevas
- C5: [x] `store.spec.ts:969`, `StatementSelectionBar.spec.ts:60`, `StatementRow.spec.ts:211`
- C6: [x] `service.spec.ts:182,190`; sin dependencias nuevas (`package.json` sin diff);
  todo el texto de cara al usuario en inglés
- C7: [x] puerta completa repetida por mí
- C8: [x] T23 no ejecutada, correctamente

**Ningún `R<n>` queda sin test.**

## Tasks completas

T0 a T22: todas `[x]`, y comprobadas contra el código, no solo contra la casilla.
T23: `[ ]` **con justificación documentada** en la propia task, en `decisions.md`
(bloque 📌, primera viñeta) y en el informe §8. No bloquea.

## Criterios de aceptación (`feature_list.json`)

- [x] 1 — Se marca y desmarca desde el extracto. Se usa **solo** `PATCH /api/movements`,
  también para uno: es la 🔴 5 que el humano aprobó y que deroga a propósito la mención a
  `/:id` de este criterio. Queda dicho aquí para que no se lea como incumplimiento
- [x] 2 — Booleano literal: `movements.ts:303` + `service.spec.ts:154`
- [x] 3 — Cuerpo campo a campo: `service.spec.ts:130`
- [x] 4 — Las sumas se vuelven a pedir: `store.spec.ts:846`, e2e `:271`
- [x] 5 — Se distingue y sigue visible: `StatementRow.spec.ts:221`, `store.spec.ts:921`
- [x] 6 — Cualquier `type`, `neutral` y piernas incluidos: `store.spec.ts:907`
- [x] 7 — Tope de 200 y sin repetidos: `store.spec.ts:763`, `service.spec.ts:168`
- [x] 8 — Errores en inglés y recarga cuando pudo escribir: `store.spec.ts:986,1006,1022`
- [x] 9 — Nada marca solo: no existe ningún camino automático
- [x] 10 — El editor de la F21 sigue igual: `StatementRow.spec.ts:202` y su suite verde
- [x] 11 — Inglés, tema oscuro con tokens semánticos, sin dependencias nuevas
      (`theme-dark.css` y `package.json` sin diff; solo alias semánticos en el markup nuevo)
- [x] 12 — Puerta en verde, repetida por mí

## Arquitectura (docs/architecture.md)

- [x] Organización por feature: todo lo nuevo vive en `src/features/statement/`
- [x] La UI no habla con la API: no hay `fetch(` en ningún `.vue` nuevo; la barra y el
      diálogo son tontos (props y events, cero lógica)
- [x] El store guarda estado, el service trae datos: el cuerpo se construye en `service.ts:34`
- [x] Tipos propios mapeados en frontera (ADR-002): `parseMovement` gana el campo con
      `asFlag` (`movements.ts:215`), obligatorio a propósito
- [x] Sin ciclos: `features/statement` **no importa nada de `features/review`**
      (búsqueda de `@/features/review` en esa carpeta: vacía). Lo común bajó a
      `shared/movements.ts`; el umbral de confirmación se declara aparte a propósito
- [x] La mudanza del PATCH en bloque es **idéntica línea a línea** (comprobado con
      `git diff`): lo único que cambia es el texto del `ValidationError`

## Convenciones (docs/conventions.md)

- [x] Estilo, nombres e imports: `import type` donde toca, orden vendor → `@/` →
      relativos, identificadores y textos de usuario en inglés, contenido de `docs/` y
      `progress/` en español
- [x] Manejo de errores: nunca se pinta el `message` del backend; `AppError` normalizado;
      sin `console.log` en los ficheros nuevos y sin `TODO` sueltos
- [x] Estilos: solo alias semánticos (`text-ink-muted`, `border-line-subtle`,
      `bg-surface-card`); ni un color de la paleta de serie de Tailwind ni un hex suelto;
      `theme-dark.css` y `src/assets/styles/` sin tocar
- [x] Tests co-localizados en `__tests__/*.spec.ts`, nombres en inglés, patrón AAA

## Verificación (docs/verification.md)

- [x] Los tests usan los recursos correctos: se mockea **solo** la frontera HTTP. El falso
      servidor `fakeMonth` recalcula las cifras del lado servidor, que es justo lo que
      permite distinguir un refresco de una resta hecha en el cliente
- [x] Nada de «no lanza excepción»: se comprueba el cuerpo serializado carácter a
      carácter, el número exacto de peticiones, las cifras concretas y la ausencia del
      texto español del backend
- [x] Caminos de error reales: 400, 404, red, `ValidationError`, refresco silencioso que
      falla, segundo clic en vuelo, y respuesta sin el campo nuevo

## CHECKPOINTS.md

- [x] C1 — Arnés completo (`./init.sh` exit 0, docs y ficheros base presentes)
- [x] C2 — Estado coherente: **una sola** feature en `in_progress` (la 22);
      `progress/current.md` describe la sesión activa, sin basura anterior
- [x] C3 — Arquitectura respetada; sin dependencias nuevas; sin logs de debug ni TODOs
- [x] C4 — Verificación real (ver arriba)
- [x] C5 — Sin ficheros sin trackear sospechosos (los seis nuevos son código, test o
      informe). La entrada de `progress/history.md` corresponde al **cierre** de sesión,
      que hace el leader tras este veredicto, igual que en la F19, la F20 y la F21
- [x] C6 — Coherencia con el proyecto hermano: el contrato **no se toca** (es suyo) y no
      se ha inventado nada. Se usan `excludedFromTotals` y `PATCH /api/movements` tal
      como los documenta la feature 49 del backend (2026-09-27), leída hoy del fichero.
      Los filtros `excluded` y `transfer` existen en el contrato y **no** se usan aquí:
      son de la rodaja siguiente
- [x] C7 — SDD: los cuatro ficheros del spec están, `decisions.md` cabe en una página con
      5 🔴, 16 requirements con el exceso justificado por escrito, EARS estricto,
      procedencia completa y cada `R<n>` con test
- [x] C8 — Resumen de cierre escrito

## Sección de procedencia (SDD)

`requirements.md:201-275` tiene la sección y **los 16 requirements están clasificados**:
humano (R1 en parte, R2 en parte, R9, R10, R11, R12 en parte, R15, R16), delegado
(R4, R5, R6, R7, R8, R13, R14, C5) y añadido (R1 en parte, R2 en parte, R3, R12 en parte,
C8). Las cinco marcadas «REVISAR EN APROBACIÓN (🔴 n)» son exactamente las cinco del
bloque 🔴 de `decisions.md`. El humano pudo aprobar con criterio.

## Resumen de cierre

- Escrito en `progress/summaries/statement-exclude-from-totals.md` → **sí**

## Cambios requeridos

**Ninguno que bloquee.** La feature se aprueba tal cual.

## Para el leader, antes de marcar `done` (documentación, no código)

Mismo patrón que en la F21, donde el reviewer señaló dos mentiras de documentación que el
leader corrigió al cerrar. Aquí hay dos más, ambas creadas por esta feature:

1. `docs/architecture.md:106`, `:121-124` y el bloque `:133-143` — dicen que el extracto
   manda «**un** `PATCH /api/movements/:id`, y nada más: ni `POST`, ni `DELETE`, ni
   `PATCH` en bloque» y que «el `PATCH` en bloque se queda en `review`». Desde esta
   feature las dos frases son falsas: el extracto escribe en bloque y `updateMovements`
   vive en `src/shared/movements.ts:375`. Si no se corrige, la rodaja siguiente leerá el
   mapa equivocado.
2. `docs/stack.md:481-489` — dice «La cumplen los **siete** specs de `e2e/`» y enumera
   hasta el séptimo. Ahora son **ocho**: falta
   `e2e/statement-exclude-from-totals.spec.ts`, que además es el primero que escribe en
   bloque y el que más depende de esa red de seguridad.

Y una tercera, ajena a esta feature pero encontrada al ejecutar la puerta:

3. `docs/verification.md:23` recomienda `pnpm test:unit run`. Con
   `"test:unit": "vitest run"`, ese `run` de más es un **filtro**: la suite sale con «No
   test files found» y exit 1. El comando correcto es `pnpm test:unit`.

## Observaciones menores (no bloquean)

- `store.ts:423` — el camino «no hay nada que cambiar» no pasa por el carril `runWrite`,
  así que pulsando mientras hay una escritura en vuelo podría pisar `actionNotice`. No
  escribe nada ni puede corromper datos: es cosmético.
- El aviso `Nothing to change` se pinta en la línea de éxito de `StatementActionNotice`,
  que es verde. El propio implementer ya lo anota como sugerencia fuera de scope.
- `StatementSelectionBar.vue:13` usa `:loading="busy"` y el resto de botones
  `:disabled="… || busy"`. El efecto es el mismo (`BaseButton` deshabilita con
  `loading`), pero conviven dos formas de decir lo mismo en el mismo componente.
