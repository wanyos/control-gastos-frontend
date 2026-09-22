# Implementación — Feature 17 `category-rules`

> Implementer (Claude Code), 2026-09-22. Spec: `specs/17-category-rules/`
> (aprobado por el humano sin cambios, las 6 🔴 tal cual).
> Tasks **T0 – T21 en `[x]`**; **T22 (prueba contra el backend real) NO se hizo**:
> necesita el visto bueno explícito del humano y la hará el leader con él delante.
> **Ninguna petición salió a `:3000`**: todos los tests usan cliente falso o
> `page.route`, y el e2e lleva red de seguridad que aborta cualquier `/api` no prevista.

## Qué se construyó

Desde una fila de **Review** nace una regla («lo que contenga este texto va a esta
categoría»); en la pantalla nueva **Rules** (`/rules`, en la barra lateral justo debajo
de Review) se ven, se cambian y se borran; y **Apply rules** pasa todas las reglas sobre
lo pendiente, siempre tras una confirmación, enseñando cuántos se categorizaron, cuántos
quedaron sin regla y **todos** los conflictos.

## Archivos

### Creados

| Archivo | Qué es |
|---|---|
| `src/shared/categories.ts` | `Category`, `CategoryKind`, `CATEGORY_KINDS`, `CATEGORIES_PATH`, `parseCategories`, `getCategories`, movidos de `review` sin cambios de comportamiento. |
| `src/features/category-rules/types.ts` | `RuleCategory`, `CategoryRule`, `NewRule`, `RuleChanges`, `RuleMatch`, `RuleConflict`, `ApplyResult`, `ApplyFlow`. |
| `src/features/category-rules/service.ts` | `getRules`, `createRule`, `updateRule`, `deleteRule`, `applyRules` + `parseRule(s)` y `parseApplyResult`. |
| `src/features/category-rules/rules.ts` | Lógica pura: `normalizeMatchText`, `MIN_MATCH_TEXT`, `BANK_BOILERPLATE`, `proposeMatchText`, `isMatchTextTooShort`, `ruleErrorMessage`, `loadErrorMessage`, `deleteErrorMessage`, `needsRulesReload`, `applyErrorMessage`, `applySummaryLines`. |
| `src/features/category-rules/store.ts` | `useCategoryRulesStore`. |
| `src/features/category-rules/views/RulesView.vue` | Pantalla `/rules`. |
| `src/features/category-rules/components/` | `RuleDialog`, `RuleList`, `RuleRow`, `DeleteRuleDialog`, `RuleCreatedNotice`, `ApplyRulesDialog`, `ApplyResult`, `RuleConflictList`. |
| Tests | `category-rules/__tests__/{fixtures,rules,service,store,RuleDialog,ApplyRulesDialog,ApplyResult,RulesView}.spec.ts`, `src/shared/__tests__/categories.spec.ts`, `e2e/category-rules.spec.ts`. |

### Modificados

| Archivo | Cambio |
|---|---|
| `src/features/review/types.ts`, `service.ts` | Re-exportan `Category`, `CategoryKind`, `parseCategories`, `getCategories`, `CATEGORIES_PATH` desde `@/shared/categories`. Ningún import ni test de la F15/F16 cambió por esto. |
| `src/features/review/components/MovementRow.vue` | Botón `Create rule` (ghost, `WandSparkles`, `aria-label` con la descripción); deshabilitado en `neutral`, sin categorías o con una acción en vuelo. |
| `src/features/review/components/MovementList.vue` | Reenvía `createRule` con el movimiento entero. |
| `src/features/review/views/ReviewView.vue` | Monta `RuleDialog`, `RuleCreatedNotice` y `ApplyRulesDialog`; el aviso más reciente gana (una acción de cola descarta el de la regla). |
| `src/features/review/store.ts` | `refreshAfterRules()` + `watch(rulesStore.applyRun)`: suelta selección y `Undo`, repide la página cargada y el recuento. |
| `src/router/index.ts` | Ruta `/rules` (`WandSparkles`) justo tras `review`. |
| `docs/architecture.md` | Árbol con `features/category-rules/` y `shared/categories.ts` + nota del sentido único `review` → `category-rules`. |
| Tests existentes | `router.spec.ts` (las tres listas de rutas / entradas), `MovementRow.spec.ts` (el test que fijaba los controles de la fila, **sustituido**), `MovementList.spec.ts`, `ReviewView.spec.ts`, `review/__tests__/{store.spec,fixtures}.ts`. |

No se tocó: `src/features/import/`, `net-worth/`, `services/http.ts`, `shared/validation.ts`,
`src/assets/`, `design-system/`, `package.json`, `pnpm-lock.yaml`, `../gastos-backend/`.
**Sin dependencias nuevas** (`git diff package.json` vacío). No hizo falta ninguna línea
`contrast:` nueva: todas las parejas ya estaban medidas (T0.4).

## Decisiones de implementación

- **Sentido único `review` → `category-rules`** (design §1): el store de Review observa
  `applyRun` del de reglas. `category-rules` no importa nada de `review` ni de `import`
  (comprobado con grep, T19). Por eso las categorías subieron a `shared/`.
- **Cuerpos campo a campo** (`ruleBody`): solo `matchText` y/o `categoryId`, nunca un
  spread; `updateRule` con body vacío lanza `ValidationError` antes de la red.
  `applyRules` manda **exactamente** `{ method: 'POST' }` (sin body ni `Content-Type`),
  como `runImport`.
- **Un solo envío a la vez**: `isSaving` y el paso `applying` se ponen antes del primer
  `await` (doble clic sin segunda petición, probado en el store).
- **Del `error` de apply solo se guarda el `code`**: el `message` del backend ni siquiera
  entra en el modelo, así que no hay nada que pintar por descuido.
- **Recarga tras fallo**: 409, 400 y red no recargan («no se guardó nada»); 404, respuesta
  ilegible y cualquier otro sí (`needsRulesReload`).
- Los tests de `ReviewView` ahora limpian `document.body` entre casos: los diálogos viven
  en un `Teleport` y sobreviven a su wrapper (contaminaban el caso siguiente).

## Desviación respecto al spec (una, documentada)

**R4 / `isMatchTextTooShort('á b')`.** El cuerpo de R4 manda normalizar «como el backend»
y el backend (`normalizeForMatch` + `minimumMatchTextLength`, `category-rules.service.ts`)
cuenta los caracteres del texto normalizado **incluyendo los espacios interiores**: `á b`
→ `a b`, tres caracteres, y lo acepta. La nota de verificación de R4 esperaba `true`
(demasiado corto). Se implementó **la paridad con el backend** —lo que el requisito pide
de forma normativa— y el test correspondiente usa ` á ` (un carácter) para el caso corto,
más un caso explícito que fija que `á b` se acepta, con el porqué en un comentario.
Rechazarlo habría hecho la pantalla más estricta que el contrato. Se avisa al reviewer y
al humano por si prefiere lo contrario (sería cambiar `isMatchTextTooShort` a contar solo
letras y dígitos, y el 400 de R6 seguiría cubriendo la divergencia).

Añadidos menores no listados en `design.md` §6, dentro de su espíritu: `deleteErrorMessage`,
`needsRulesReload` y `loadErrorMessage` viven en `rules.ts` (los textos de las tablas de
borrado y de carga tenían que estar en algún sitio puro y testeable).

## Trazabilidad `R<n> → test`

| Req | Dónde se prueba |
|---|---|
| **R1** | `review/__tests__/MovementRow.spec.ts` → «offers one tick box, one category selector, Confirm and Create rule», «names the movement it would come from», «is disabled on a neutral movement», «is disabled while the categories are unknown»; `MovementList.spec.ts` → «passes the whole movement up when a row asks for a rule»; `ReviewView.spec.ts` → «opens the dialog with the movement and the proposed text»; `e2e/category-rules.spec.ts` → «a rule is born from a row…». |
| **R2** | `category-rules/__tests__/rules.spec.ts` → los cuatro ejemplos de `proposeMatchText` + «never proposes a word of the boilerplate list»; `RuleDialog.spec.ts` → «proposes the meaningful word and lets it be edited»; e2e (campo con `iberdrola`). |
| **R3** | `RuleDialog.spec.ts` → «offers only the categories of the movement kind», «offers only income categories…», «starts on the category the movement already has», «starts empty and refuses to save…». |
| **R4** | `rules.spec.ts` → «counts what the backend would store» + «accepts exactly what the backend accepts»; `RuleDialog.spec.ts` → «refuses a text the contract would reject, without sending anything»; `store.spec.ts` → «sends nothing when the text is too short». |
| **R5** | `service.spec.ts` → «sends exactly matchText and categoryId, as JSON» + «never lets a stray property travel»; `store.spec.ts` → «creates the rule, keeps it for the notice and touches nothing else» + «a second click… sends nothing»; `ReviewView.spec.ts` → «creates it with one POST of two fields, and applies nothing by itself»; e2e test 1. |
| **R6** | `rules.spec.ts` → `ruleErrorMessage` (seis casos) + «never paints the backend message»; `store.spec.ts` → «keeps the list untouched after a 409…» y «reloads the rules after a 404 and after an answer it could not read»; `RuleDialog.spec.ts` → «keeps what was typed and shows the failure inside the dialog»; `ReviewView.spec.ts` → «keeps the dialog open with an English message when the text is taken»; e2e test 3. |
| **R7** | `router.spec.ts` → «declares the six navigable routes» + «exposes one navigation entry per navigable route» (Rules entre Review y Overview); `RulesView.spec.ts` → «lists the rules in the API order…», «says there are none…», «explains a failed load in English and tries again on demand». |
| **R8** | `service.spec.ts` → «sends only the field that changed», «sends both when both changed», «refuses an empty body before the network»; `store.spec.ts` → «sends only what changed y replaces the row, touching no movement» + «sends nothing at all when nothing changed»; `RuleDialog.spec.ts` → «changes an existing rule with the same dialog…»; `RulesView.spec.ts` → «changes a rule with a PATCH de solo lo que cambió»; e2e test 4. |
| **R9** | `service.spec.ts` → «does one DELETE with no body y takes the empty 204»; `rules.spec.ts` → `deleteErrorMessage`; `store.spec.ts` → «drops the row and never touches a movement» + «takes a 404 as already gone»; `RulesView.spec.ts` → «asks before deleting… cancelling sends nothing», «deletes on confirmation», «says in English that a rule was already gone»; e2e test 4. |
| **R10** | `ApplyRulesDialog.spec.ts` → «asks first, spelling out what is touched and that it cannot be undone»; `store.spec.ts` → «opening and closing the confirmation sends nothing»; `RulesView.spec.ts` → «always asks before applying, and cancelling sends nothing» + `Apply rules` deshabilitado con 0 reglas; `ReviewView.spec.ts` → «asks before applying…»; e2e test 2. |
| **R11** | `service.spec.ts` → «sends exactly { method: POST }: no body, no Content-Type»; `store.spec.ts` → «a second click while the pass runs adds no request, and the dialog will not close»; `ApplyRulesDialog.spec.ts` → «cannot be dismissed while the pass runs»; e2e test 2 (`body: null`). |
| **R12** | `rules.spec.ts` → `applySummaryLines` (singular y plural); `ApplyResult.spec.ts` → cifras, 14 conflictos pintados, «and N more not listed», «offers no way to resolve a conflict»; `ApplyRulesDialog.spec.ts` → «shows the three figures…»; e2e test 2. |
| **R13** | `rules.spec.ts` → `applyErrorMessage` (error del 200, red, 500, ilegible) + «never paints the backend message»; `store.spec.ts` → «shows no figures when the 200 carries an error» + «bumps applyRun when the request itself fails»; `ApplyRulesDialog.spec.ts` → «shows no figures at all when the pass failed». |
| **R14** | `review/__tests__/store.spec.ts` → «asks for the page and the count again, and drops the selection and the undo» + «asks only for the count when no page has been loaded»; `ReviewView.spec.ts` → tras aplicar se repide la cola y el recuento sin `PATCH`; `e2e/category-rules.spec.ts` test 2 → la fila cambia de categoría sin recargar la página. |
| **C1** | `git diff package.json` vacío; grep: ningún `POST`/`PATCH`/`DELETE` a `/api/categories`; `ApplyResult.spec.ts` «offers no way to resolve a conflict»; nada fuera de `gastos-frontend/`. |
| **C2** | `service.spec.ts` (claves exactas de los cuerpos, `ValidationError` con su ruta en las tres respuestas, `error` ausente/`null`/con `code`). |
| **C3** | `src/assets/__tests__/theme-dark.spec.ts` en verde (sin líneas `contrast:` nuevas); textos en inglés revisados; solo alias semánticos. |
| **C4** | Las suites de F15/F16 pasan; los dos tests que fijaban listas (fila de Review y entradas de la barra lateral) fueron **sustituidos**, no borrados; `e2e/review-queue.spec.ts`, `review-actions.spec.ts` y `app-boot.spec.ts` intactos y verdes. |
| **C5** | Ver la puerta, abajo. |
| **C6** | **Pendiente (T22)**: no se hizo, necesita visto bueno explícito del humano. |

## Puerta (C5) — toda verde, 2026-09-22

| Comando | Resultado |
|---|---|
| `pnpm type-check` | OK (`vue-tsc --build`, sin errores) |
| `pnpm lint` | OK (`oxlint . --fix`, sin avisos) |
| `pnpm test:unit` | **901 tests, 64 ficheros, todos verdes** (eran 793 al cerrar la F16: **+108**) |
| `pnpm build` | OK — `dist/assets/index-DoMWJ8ZT.js` 216,64 kB (71,19 kB gzip), CSS 31,32 kB |
| `pnpm test:e2e --project=chromium` | **16 tests verdes** (4 nuevos de `category-rules`, 12 anteriores sin tocar) |
| `./init.sh` | «Entorno listo. Puedes empezar a trabajar.» |

## Sugerencias fuera de scope (no aplicadas)

- La `BANK_BOILERPLATE` está escrita sin mirar extractos reales, como la semilla del
  backend: conviene repasarla con conceptos de verdad la primera vez que proponga mal.
- El contador de pendientes se repide tras aplicar aunque el contrato no toque `status`;
  si alguna vez se moviera, sería señal de que la pasada hizo algo no previsto.
- `MovementCategorySelect` (F16) y el selector de `RuleDialog` repiten el maquetado de
  `optgroup`; extraerlo a `shared/` sería una feature de limpieza, no de esta.

## Estado en `feature_list.json`

Sigue en **`in_progress`**. No se marca `done` ni se hace commit: falta el reviewer
(y su `progress/summaries/category-rules.md`).

---

## Nota — dos correcciones tras la prueba contra el backend real (2026-09-22, post-review)

Encargo acotado del líder: nada de reabrir la feature, ninguna de las 6 decisiones 🔴
cambia, sin dependencias nuevas, sin tocar el backend y sin salidas reales a `:3000`
(los e2e siguen interceptando todas las rutas).

### Corrección 1 — el texto propuesto se queda corto

Con el concepto «MEGA DEPORTES» la pantalla proponía `mega`, y como el backend compara
con «contiene», `mega` casaba también con «ACADEMIA OMEGA SL»: dos movimientos que no
tienen nada que ver.

- `src/features/category-rules/rules.ts`: `proposeMatchText` sigue buscando **la primera
  palabra con sentido** (🔴 2 intacta), pero cuando esa palabra no llega a la nueva
  constante `MIN_PROPOSAL_LENGTH = 6` alarga la propuesta hasta el final de las palabras
  siguientes. La propuesta se obtiene **cortando la descripción normalizada**, no uniendo
  palabras con espacios: así sale verbatim del concepto y el «contiene» del backend la
  encuentra aunque el separador no sea un espacio simple («MEGA - DEPORTES»). La
  ampliación se detiene ante una palabra con dígitos (número de tarjeta, fecha: son de un
  solo movimiento), así que `BAR 5540XXXXXXXX1234 PEPE` se queda en `bar` antes que
  arrastrar un número. El porqué del 6 está comentado junto a la constante. El texto sigue
  siendo editable antes de guardar.
- Resultado: «MEGA DEPORTES» → `mega deportes`; «RECIB /IBERDROLA CLIENTES, S.A` →
  `iberdrola` (sin cambio); «COMPRA TARJ. 5540… MERCADONA VALENCIA» → `mercadona`
  (sin cambio); «RECIBO 12/08» → la descripción entera (sin cambio).
- Tests: `__tests__/rules.spec.ts` — casos nuevos para la ampliación, para el corte
  verbatim (se comprueba que el concepto normalizado **contiene** la propuesta), para la
  parada ante dígitos y para la palabra que ya es larga. El caso «normalizes before
  proposing» pasa a «Almacén Ñandú» → `almacen`, porque «Café Ñandú» ahora propone
  `cafe nandu` (tiene su propio caso).
- Spec: se actualizó el texto de **R2** en `requirements.md` y la descripción de
  `proposeMatchText` en `design.md §6`, ambos con la nota de que viene de T22. La
  decisión 🔴 2 no se toca: sigue siendo «la primera palabra con sentido, editable».

### Corrección 2 — un test que pasaba siempre

`BaseDialog` monta su raíz con `Teleport`, así que el `data-test` que le pasaban sus
usuarios (`rule-dialog`, `apply-dialog`, `delete-rule-dialog`, `bulk-confirm` de la F16 y
los de la F13) no llegaba al DOM y Vue avisaba: «Extraneous non-props attributes
(data-test) … teleport root nodes». Consecuencia: `RulesView.spec.ts` comprobaba que
`[data-test="rule-dialog"]` era `null` y eso era cierto siempre, con el diálogo abierto o
cerrado.

- `src/shared/components/BaseDialog.vue`: `defineOptions({ inheritAttrs: false })` y
  `v-bind="$attrs"` en el panel (el que ya lleva `role="dialog"`), **después** del
  `data-test="dialog-panel"`, de modo que el `data-test` del llamante lo sustituye. El
  aviso de Vue desaparece (verificado: ni un «Extraneous» en la salida de los tests de
  `category-rules`, `review`, `import` y `shared/components`).
- `RulesView.spec.ts`: el caso de cambiar una regla ahora comprueba las dos caras —con el
  diálogo abierto `[data-test="rule-dialog"]` existe, y tras guardar es `null`—, que es lo
  que decía que probaba.
- Tests que se apoyaban en el panel genérico y ahora nombran el diálogo concreto (ya no
  llevan `dialog-panel` porque el llamante lo sustituye): `RuleDialog.spec.ts` (dos
  aserciones) y `e2e/category-rules.spec.ts` (el caso del 409, que era justo uno de los
  que localizaba el diálogo por el panel genérico). El resto de usos de `dialog-panel` /
  `dialog-scrim` (`BaseDialog.spec.ts`, `ImportDialog.spec.ts`, `ApplyRulesDialog.spec.ts`)
  siguen válidos: el scrim no cambia y `ImportDialog` no pasa `data-test` propio.
- Ningún otro test dependía de que la marca no existiera.

### Puerta tras las correcciones — toda verde (2026-09-22)

| Comando | Resultado |
|---|---|
| `pnpm type-check` | OK |
| `pnpm lint` | OK (`oxlint . --fix`, sin avisos) |
| `pnpm test:unit` | **905 tests, 64 ficheros, todos verdes** |
| `pnpm build` | OK — `dist/assets/index-Cxm45649.js` 216,87 kB (71,33 kB gzip) |
| `pnpm test:e2e --project=chromium` | **16 tests verdes** |
| `./init.sh` | «Entorno listo. Puedes empezar a trabajar.» |

La feature sigue en `in_progress` y no se ha hecho ningún commit.

### Sugerencia fuera de scope (no aplicada)

- `e2e/category-rules.spec.ts` tiene tres líneas de más de 100 columnas que Prettier
  reformatearía; vienen de la implementación original y no de esta corrección. `pnpm
  format` solo pasa por `src/`, así que `e2e/` nunca se formatea: o se amplía el script o
  se deja como está, pero es decisión aparte.
