# Review — feature 17 `category-rules`

**Veredicto:** APPROVED

Revisor: agente `reviewer`, 2026-09-22. Verificado por mí mismo: la puerta entera
ejecutada de nuevo (no me fío del informe), los tests leídos uno a uno, y el
contrato del backend contrastado endpoint por endpoint. **El backend no se ha
tocado**: `git status` no muestra nada fuera de `gastos-frontend/`.

## Las tres cosas que se pidieron mirar con lupa

### 1. Ninguna petición real sale a `:3000` — confirmado

- **Tests unitarios.** `src/features/category-rules/__tests__/fixtures.ts:132`
  (`fakeClient`) es un doble que nunca toca `fetch` y **lanza** ante cualquier ruta
  no declarada (línea 145). Los tests de pantalla usan `mockFetch`
  (`fixtures.ts:170`), que espía `globalThis.fetch` y **rechaza** cualquier `/api`
  no enrutada (línea 192). Una llamada imprevista sale como fallo de test, no como
  tráfico.
- **e2e.** `e2e/category-rules.spec.ts:122` registra **primero**
  `page.route('**/api/**', (route) => route.abort())` y después las rutas concretas
  (en Playwright gana la última registrada), así que todo lo no previsto se aborta y
  nunca se proxea al `:3000` del `vite.config.ts:23`. Además `/api/movements*` aborta
  explícitamente cualquier método que no sea `GET` (líneas 127-131), y cada test
  compara la lista completa de escrituras con la esperada.
- **Grep de cierre.** Ni en `src/` ni en `e2e/` hay una URL a `:3000`; el único
  `3000` real es el proxy de `vite.config.ts`, que no se tocó.
- La T22, la única task que hablaría con el backend real, está **sin hacer**.

### 2. Los cuerpos son exactamente los del contrato — confirmado

Contrastado contra `../gastos-backend/docs/api-contract.md:509-628`:

| Endpoint | Lo que manda el código | Contrato |
|---|---|---|
| POST `/api/category-rules` | `ruleBody()` copia campo a campo solo `matchText` y `categoryId` (`service.ts:115`), con `Content-Type: application/json` | correcto: cualquier otra propiedad es un 400 |
| PATCH `/api/category-rules/:id` | solo lo que cambió; body vacío lanza `ValidationError` **antes** de la red (`service.ts:147`) | correcto: un body vacío es un 400 |
| DELETE `/api/category-rules/:id` | `{ method: 'DELETE' }`, sin body; acepta el 204 vacío | correcto |
| POST `/api/category-rules/apply` | **exactamente** `{ method: 'POST' }`, sin body y sin `Content-Type` (`service.ts:166`) | correcto: sin body, y así se evita el 400 por cuerpo vacío declarado JSON |

Probado de verdad, no de palabra: `service.spec.ts:55` fija que las claves del body
son `['matchText','categoryId']`; `service.spec.ts:60` mete a propósito `id` y
`status` de contrabando y comprueba que **no viajan**; `service.spec.ts:116` fija la
llamada de apply como `{ path, method: 'POST', body: undefined, contentType: undefined }`.
En e2e, `category-rules.spec.ts:247` comprueba `body: null` en el POST de `/apply`
desde un navegador real, y la línea 304 fija las dos únicas escrituras de la pantalla
`Rules`, sin ninguna a `/api/movements`.

### 3. La desviación de R4 — la paridad con el contrato es lo correcto

Fui a la fuente: `gastos-backend/src/modules/category-rules/category-rules.service.ts:30`
(`normalizeForMatch`: NFD, fuera marcas, minúsculas, `trim`; **no** colapsa espacios
interiores) y las líneas 39-47 (`minimumMatchTextLength = 3`, medido sobre
`normalized.length`). El texto `á b` normaliza a `a b`, tres caracteres: **el backend
lo acepta**.

El **cuerpo normativo** de R4 dice «normalizado como el backend, queda con menos de 3
caracteres». La implementación lo cumple al pie de la letra; lo que está mal es el
**ejemplo de la nota de verificación** de R4, que esperaba `true`. Rechazarlo haría la
pantalla más estricta que el contrato y prohibiría guardar una regla perfectamente
válida, sin ganancia ninguna. Se aprueba la paridad. El test lo deja explícito y
razonado (`rules.spec.ts:83-86`) y el caso corto de verdad se cubre con un solo
carácter (`rules.spec.ts:74`). **Acción no bloqueante:** corregir el ejemplo de la nota
de R4 en `specs/17-category-rules/requirements.md:99` para que el spec no se contradiga.

## Trazabilidad requirements ↔ tests (SDD)

Verificada abriendo los tests, no leyendo la tabla del implementer.

- R1: [x] `review/__tests__/MovementRow.spec.ts:84-113` (botón, `aria-label`, emite
  `create-rule` sin emitir `categorize` ni `confirm`, deshabilitado en `neutral` y sin
  categorías); `MovementList.spec.ts`; `ReviewView.spec.ts`; e2e test 1.
- R2: [x] `rules.spec.ts:47-68` (los cuatro ejemplos, más que ninguna palabra de
  trámite se propone sola); `RuleDialog.spec.ts:68`; e2e (campo con `iberdrola`).
- R3: [x] `RuleDialog.spec.ts:82-114` (solo el `kind` del movimiento, preselección,
  `Choose a category…` y el botón deshabilitado sin categoría).
- R4: [x] `rules.spec.ts:71-90`; `RuleDialog.spec.ts:116`; `store.spec.ts:74`
  (`create` con `ab` hace **cero** llamadas).
- R5: [x] `service.spec.ts:46` y `:60`; `store.spec.ts:84` (tras el 201, cero llamadas
  a `/apply` y cero a `/api/movements`); `store.spec.ts:102` (doble clic, una sola
  petición); `ReviewView.spec.ts`; e2e test 1.
- R6: [x] `rules.spec.ts:93-132` (los seis textos, uno por caso, y ninguno contiene el
  `message` en español); `store.spec.ts:116` y `:133` (el 409 no recarga; el 404 y la
  respuesta ilegible sí); `RuleDialog.spec.ts:140`; e2e test 3.
- R7: [x] `router.spec.ts:19` y `:72` (seis rutas, `Rules` entre `Review` y `Overview`);
  `RulesView.spec.ts:26`, `:45`, `:54` (orden, vacío, fallo con `Try again`).
- R8: [x] `service.spec.ts:71`, `:81`, `:89`; `store.spec.ts:161` y `:177` (sin cambios,
  cero llamadas; `IBERDROLA` en mayúsculas no cuenta como cambio);
  `RulesView.spec.ts:77`; e2e test 4.
- R9: [x] `service.spec.ts:100`; `store.spec.ts:192` y `:207`; `RulesView.spec.ts:99`,
  `:117`, `:133`; e2e test 4. En todos: cero llamadas a `/api/movements`.
- R10: [x] `ApplyRulesDialog.spec.ts:30`; `store.spec.ts:224` (abrir y cerrar, cero
  llamadas); `RulesView.spec.ts:150`; e2e test 2, que comprueba que antes de confirmar
  **no** hay POST a `/apply`.
- R11: [x] `service.spec.ts:111`; `store.spec.ts:248` (segundo clic en vuelo, una sola
  petición, y el diálogo no cierra); `ApplyRulesDialog.spec.ts:48`; e2e test 2.
- R12: [x] `ApplyResult.spec.ts:18`, `:28`, `:35`, `:48`, `:54`, `:64` (las tres cifras,
  **14** conflictos pintados sin recorte, `and N more not listed`, y cero `button`,
  `select`, `input` o `a` en la lista); `rules.spec.ts:192`.
- R13: [x] `rules.spec.ts:157-189`; `store.spec.ts:263` y `:279` (el `error` del 200 y
  la excepción llevan a `failed`, sin cifras y sin el `message`);
  `ApplyRulesDialog.spec.ts:77`.
- R14: [x] `review/__tests__/store.spec.ts:716` y `:742` — tras subir `applyRun` hay
  exactamente dos GET (`page=1&pageSize=100` y `pageSize=1`), `selectedIds` vacío,
  `lastAction` a `null` y **ningún** PATCH nuevo; sin página cargada, solo el del
  recuento. e2e test 2: la fila cambia de categoría sin recargar el navegador.
- C1: [x] `git diff package.json` vacío; grep sin `POST`, `PATCH` ni `DELETE` a
  `/api/categories`; `ApplyResult.spec.ts:54`.
- C2: [x] las tres respuestas pasan por `createValidators` (`service.ts:28-31`), con
  tests que fijan la **ruta del campo** que falla (`service.spec.ts:33` y `:143`).
- C3: [x] `theme-dark.spec.ts` verde y sin líneas `contrast:` nuevas; textos en inglés;
  solo alias semánticos (`text-ink-body`, `text-negative`, `text-positive`, `font-mono`).
- C4: [x] las suites de F15 y F16 pasan; los dos tests que fijaban listas fueron
  **sustituidos** (`MovementRow.spec.ts:75`, `router.spec.ts:19`), no borrados;
  `e2e/review-*.spec.ts` y `app-boot.spec.ts` sin tocar y verdes.
- C5: [x] ver la puerta, abajo.
- C6: pendiente **a propósito** (T22, requiere visto bueno del humano). No bloquea.

## Tasks completas (SDD)

T0.1-T0.4 y T1-T21: **todas `[x]`**, y verificadas contra el código que dicen producir.
T22 sigue en `[ ]`, **justificada** en `tasks.md:107` («solo con el visto bueno
explícito del humano»), en la restricción C6 de `requirements.md` y en el informe del
implementer. No se exige para aprobar.

## Las 6 decisiones 🔴, implementadas tal cual

1. **Pantalla propia `Rules` bajo `Review`** — `router/index.ts:57`, con
   `meta.label: 'Rules'` justo tras `review`, y test que fija el orden.
2. **Primera palabra con sentido, saltando el trámite** — `rules.ts:69` y
   `BANK_BOILERPLATE` en `rules.ts:18` (las 25 palabras del spec, ni una más ni una
   menos). `RECIB /IBERDROLA CLIENTES, S.A` propone `iberdrola`, y es editable
   (`RuleDialog.spec.ts:74`).
3. **Crear no aplica nada** — `store.ts:96` no llama a nada más tras el 201, y el aviso
   sale en `RuleCreatedNotice.vue:4-14` con su botón `Apply rules now`.
4. **Aplicar pide confirmación siempre**, con las tres frases exactas y sin prometer
   cifras — `ApplyRulesDialog.vue:11-13`.
5. **Crear no categoriza el propio movimiento** — ni el store ni la vista mandan nada
   sobre movimientos al crear (`store.spec.ts:98`; en e2e la única escritura del test 1
   es el POST de la regla).
6. **Todos los conflictos, no los diez primeros** — `ApplyResult.spec.ts:28` pinta los
   14 y comprueba que **no** aparece el «and N more» cuando la lista viene entera.

## Criterios de aceptación (`feature_list.json`)

- [x] 1 — crear desde Review, con texto propuesto editable y solo categorías del `kind`.
- [x] 2 — lista de reglas, con cambiar y borrar desde `/rules`.
- [x] 3 — aplicar bajo demanda, con `categorized`, `unmatched` y `conflicts` de solo lectura.
- [x] 4 — cola, totales y contador al día sin recargar la página.
- [x] 5 — errores en inglés, sin el `message` del backend, y nada escrito a medias.
- [x] 6 — un `error` dentro del 200 se dice en inglés y se recarga la cola.
- [x] 7 — cuerpos campo a campo; apply sin body.
- [x] 8 — ni categorías ni resolución de conflictos desde la web.
- [x] 9 — respuestas validadas en frontera con tipos propios.
- [x] 10 — inglés, tema oscuro con tokens semánticos, contraste verificado, sin dependencias nuevas.
- [x] 11 — las features 15 y 16 siguen funcionando igual.
- [x] 12 — la puerta termina en verde.

## Arquitectura (docs/architecture.md)

- [x] Feature autocontenida en `src/features/category-rules/` (ADR-001).
- [x] Ningún `fetch(` dentro de un `.vue` (grep limpio en todo `src/`).
- [x] El store guarda estado y el service trae y mapea datos (ADR-002); parsers propios,
      sin JSON crudo paseándose por los componentes.
- [x] Tipos propios derivados del contrato (`types.ts`), no copiados del backend.
- [x] **Sentido único `review` → `category-rules`**: el grep confirma que
      `category-rules/` no importa **nada** de `review/` ni de `import/`. El refresco lo
      hace `review/store.ts:423` observando `applyRun`; no hay ciclo.
- [x] Las categorías subieron a `shared/categories.ts` porque las necesitan dos features:
      exactamente la regla escrita en `architecture.md`.
- [x] `docs/architecture.md` actualizado con el árbol y la nota de dependencia.
- [x] Sin dependencias nuevas: `package.json` y `pnpm-lock.yaml` intactos.

## Convenciones (docs/conventions.md)

- [x] Inglés en el código y en el texto de usuario; español solo en `docs/`, `progress/`
      y `specs/`. Nombres de archivo en inglés.
- [x] `import type` donde toca; orden vendor, luego `@/`, luego relativos; `@/` para
      cruzar features y relativo dentro de la misma.
- [x] Nombres: `useCategoryRulesStore`, componentes en PascalCase, booleanos `is*`.
- [x] SFC en orden `<template>` y luego `<script setup lang="ts">`; solo alias
      semánticos, sin hex sueltos ni paleta de serie de Tailwind.
- [x] Errores con `AppError`, `ApiError` y `ValidationError`, nunca un string; del
      `error` del backend solo se guarda el `code` (`service.ts:107`), así que no hay
      nada en español que pintar por descuido.
- [x] Sin `console.log`, sin TODOs sueltos, sin `debugger`.
- [x] Comentarios en inglés, cortos, explicando el porqué y no el qué.

## Verificación (docs/verification.md)

- [x] Recursos reales ligeros; se mockea **solo** la frontera HTTP.
- [x] Nada de «no lanza excepción»: los tests fijan claves exactas del body, textos
      literales, número de llamadas y ausencia de llamadas prohibidas.
- [x] Camino de error cubierto en todos los módulos: 409, 400, 404, red, respuesta
      ilegible, `error` dentro del 200, doble clic y cancelar.
- [x] E2E de UI en navegador real, con red de seguridad.

## Puerta, ejecutada por el reviewer — 2026-09-22

| Comando | Resultado |
|---|---|
| `pnpm type-check` | verde |
| `pnpm lint` | verde, y no dejó cambios (el `git status` es idéntico antes y después) |
| `pnpm test:unit` | **901 tests, 64 ficheros, todos verdes** |
| `pnpm build` | verde — 216,64 kB de js (71,19 kB gzip) y 31,32 kB de css |
| `pnpm test:e2e --project=chromium` | **16 verdes** (4 nuevos y 12 anteriores sin tocar) |
| `./init.sh` | exit 0 — «Entorno listo. Puedes empezar a trabajar.» |

## CHECKPOINTS.md

- [x] C1 — Arnés completo; `./init.sh` termina en 0.
- [x] C2 — Solo la 17 fuera de `done`, y está en `in_progress`; `progress/current.md`
      describe esta sesión y nada más.
- [x] C3 — Arquitectura respetada, sin dependencias nuevas, sin logs de debug ni TODOs.
- [x] C4 — Un test ejecutable por módulo nuevo, con camino feliz y camino de error.
- [x] C5 — Sin archivos sueltos sospechosos y la feature en su estado correcto. La
      entrada de `progress/history.md` de esta sesión la escribe el leader al cerrar;
      a fecha de esta revisión aún no está, y es lo esperado.
- [x] C6 — Proyecto hermano: el contrato se leyó como fuente de verdad y **no se tocó**;
      no hay endpoints ni campos inventados.
- [x] C7 — SDD: los cuatro archivos en `specs/17-category-rules/`, `decisions.md` de una
      página con 6 puntos 🔴, 14 requirements (por debajo de 15), EARS, sección de
      procedencia con cada `R<n>` clasificado, tasks en `[x]` salvo la T22 justificada,
      y cada `R<n>` con test concreto.
- [x] C8 — Resumen de cierre escrito.

## Resumen de cierre

- Escrito en `progress/summaries/category-rules.md` → **sí**.

## Cambios requeridos

Ninguno. La feature se aprueba tal cual.

## Notas no bloqueantes

1. `specs/17-category-rules/requirements.md:99` — el **ejemplo** de la nota de
   verificación de R4 sigue diciendo que `isMatchTextTooShort('á b')` es `true`, cuando
   el cuerpo normativo del propio R4 (y el backend) dicen lo contrario. Conviene
   corregir esa línea del spec para que no quede una contradicción escrita.
2. `rules.ts` incorpora tres funciones que `design.md` §6 no listaba
   (`loadErrorMessage:107`, `deleteErrorMessage:116`, `needsRulesReload:127`). Están
   dentro del espíritu del diseño —los textos de las tablas de borrado y de carga tenían
   que vivir en algún sitio puro y testeable—, declaradas por el implementer y con test
   propio. Aceptadas.
3. Cosmético: los diálogos usan comillas tipográficas donde el diseño escribía comillas
   rectas. No afecta a nada y tipográficamente es mejor.
4. `e2e/app-boot.spec.ts` es el único e2e sin la red de seguridad que aborta `/api`.
   Es anterior a esta feature y no visita `/review` ni `/rules`, así que no es una
   regresión; añadírsela cuando se toque sería coherente con el resto.
5. **T22 sigue abierta**: la prueba contra el backend real escribe en masa sobre los
   ~1.379 pendientes sin categoría, y `apply` no se deshace desde la API. Que se haga
   con el humano delante, con la foto previa y posterior y la vuelta atrás acordadas.
