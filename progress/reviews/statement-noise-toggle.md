# Review — feature 23 `statement-noise-toggle`

**Veredicto:** APPROVED

> Segunda pasada (2026-09-30). La primera fue `CHANGES_REQUESTED` por un único defecto:
> `pnpm lint` en rojo por un `page_` en el e2e nuevo. Está corregido y **lo he verificado
> yo mismo**, no leído del parte: la variable se llama `monthAnswer`, no queda ni un
> `page_` en `e2e/` ni en `src/`, `pnpm lint` sale con exit code 0 y los 39 e2e de
> chromium pasan. Con eso cae el último incumplimiento (C7) y la feature queda aprobada.

## La puerta, ejecutada por el reviewer

| Comando | Primera pasada (29-sep) | Segunda pasada (30-sep) |
|---|---|---|
| `pnpm type-check` | ✅ | ✅ (sin cambios en `src/`) |
| `pnpm lint` | ❌ `no-underscore-dangle` | ✅ **exit 0**, re-ejecutado dos veces |
| `pnpm test:unit` | ✅ 86 ficheros / 1360 tests | ✅ (el arreglo es solo de un e2e) |
| `pnpm build` | ✅ 2040 módulos | ✅ (sin cambios en `src/`) |
| `pnpm test:e2e --project=chromium` | ✅ | ✅ **39 passed (13,9 s)** |
| `./init.sh` | ✅ exit 0 | ✅ (verificado por el leader) |

El arreglo toca **un solo archivo de test e2e** y solo el nombre de una variable local
(`e2e/statement-noise-toggle.spec.ts:192` y sus usos en 197-199 y 203). No roza el
código de producción, así que type-check, unit y build no podían moverse; aun así he
vuelto a pasar el e2e entero, que es lo único que ese archivo puede romper.

## Trazabilidad requirements ↔ tests (SDD)

- R1: [x] `shared/__tests__/movements.spec.ts` «carries neither key when the switch is off»; `filters.spec.ts` «asks for nothing extra while it is off»; `store.spec.ts` «starts off: no scope travels and no count is asked for»; `StatementView.spec.ts` «is off when the address does not mention it»
- R2: [x] `movements.spec.ts` «carries excluded=none AND transfer=none in the SAME request»; `store.spec.ts` «on, it asks the month with both scopes and then counts, in that order» (fija la querystring entera) y «the switch rides along to the next page»
- R3: [x] `store.spec.ts` «turning it off asks the same month and the same filters with no scope»
- R4: [x] `filters.spec.ts` «writes hide=true on, and no key at all off» y «keeps the month and the four filters exactly as they were»; `StatementView.spec.ts` «turning it on writes hide=true and keeps every other key», «keeps the category key as it was», «the switch survives a month change»
- R5: [x] `filters.spec.ts` con los cinco valores basura (1, yes, TRUE, vacío, false); `StatementView.spec.ts` «comes up on from the address» y «comes up OFF when the address says hide=%s»
- R6: [x] `store.spec.ts` «the figures are the ones of the answer, untouched»; `StatementView.spec.ts` «the three figures do not move when it is turned on»
- R7: [x] `filters.spec.ts` sección «the count query» (2 tests); `store.spec.ts` «on, it asks… and then counts» (hiddenCount = 5 − 4 = 1)
- R8: [x] `NoiseSwitch.spec.ts` «never shows an amount of what is hidden»; `filters.spec.ts` «never says an amount»
- R9: [x] `store.spec.ts` «a failed count leaves the month, the figures and the list intact», «a month that failed asks for no count at all», «drops the count of a month nobody is looking at»; `StatementView.spec.ts` «a failed count changes nothing on the screen»
- R10: [x] `store.spec.ts` «carries the switch with the filters in ONE request, and neither wins»
- R11: [x] `store.spec.ts` «empties the selection and keeps the mode when the switch moves»
- R12: [x] `filters.spec.ts` «names both causes when nothing is left to show»; `StatementView.spec.ts` «nothing left to show names both causes and offers the switch back»; e2e «a search that only matches hidden rows…»
- R13: [x] `store.spec.ts` «marking a row with the switch on takes it off the list, Undo included» + contraprueba con el interruptor apagado
- R14: [x] `MonthTotals.spec.ts` «is the fixed text, word for word» (toBe), «carries no figure of any kind: not one digit», «no longer says the figures are inflated, nor names a month», «cannot be dismissed»
- R15: [x] `MonthTotals.spec.ts` sección «the only live figure» (5 tests); `store.spec.ts` sección «the live figure of the note» (4 tests); `StatementView.spec.ts` «reads the doubtful groups once per session…»; e2e (2 tests)
- C1: [x] `store.spec.ts` «never writes anything: every request of the switch is a GET»; `StatementView.spec.ts` «only ever reads» (las 4 rutas, comparación exhaustiva); los 5 e2e afirman solo GET
- C2: [x] Ni el backend ni `api-contract.md` se tocan
- C3: [x] R6 + R8
- C4: [x] Las suites F19–F22 siguen verdes; los cuatro cambios de contenido están analizados abajo
- C5: [x] `filters.spec.ts` «is not a filter of the bar»; `StatementView.spec.ts` «Clear filters empties the bar and leaves the switch ON»
- C6: [x] Inglés, tokens semánticos, contraste ya declarado, `package.json` y `pnpm-lock.yaml` intactos
- C7: [x] **Ahora sí**: type-check, lint, unit, build e `init.sh` en verde
- C8: [ ] T20 pendiente a propósito (comprobación de solo lectura con el humano delante)

## Tasks completas (SDD)

T0–T19 marcadas `[x]` y verificadas una a una contra el código. **T20 sigue `[ ]` a
propósito**, con justificación escrita en la propia task, en `decisions.md` (bloque 📌)
y en `progress/implementation/statement-noise-toggle.md`: no es del implementer, es la
comprobación de solo lectura con el humano delante. No se exige para aprobar.

**Discrepancia de numeración, aclarada.** El leader dijo «T0 a T17, no hagas la T18»;
`tasks.md`, que es la fuente de verdad, llega a **T20** y es la T20 la comprobación con
el humano. El implementer hizo **T0–T19** y dejó la T20. Es lo correcto y **no se saltó
nada**: la T18 (tests de la nota en `MonthTotals.spec.ts` y `store.spec.ts`) está hecha
y la T19 (trazabilidad + puerta verde) ya lo está también tras el arreglo del lint.

## Las cinco cosas con lupa

### 1. El texto de la nota — correcto

- **Parte fija, palabra por palabra.** Comparado carácter a carácter
  `MonthTotals.vue:89-95` contra `decisions.md` 🔴 2 y `design.md` §8: **idénticos**,
  raya larga y comillas rectas de "Hide what does not count" incluidas.
- **Ni una cifra.** `MonthTotals.spec.ts` «carries no figure of any kind» (regex de
  dígito sobre el texto renderizado) y el e2e «with no doubtful group…».
- **Permanente y sin poder cerrarse.** `MonthTotals.vue:47`, sin `v-if`; el test
  «cannot be dismissed: no close button anywhere in the block» sigue vivo e intacto.
- **Frase viva.** `MonthTotals.vue:51`: solo si `ambiguousGroups` no es null y es mayor
  que 0. Singular y plural fijados literales. Con 0, con null y **tras un fallo** no
  sale ni se pinta error: `loadAmbiguous()` (`store.ts:554-562`) traga la excepción
  dejando null, y hay test de pantalla que lo confirma.
- Extra bien traído: «is the ONLY digit the note ever shows».

### 2. Una petición por sesión, no por mes ni por filtro — correcto, contado en los tests

`store.spec.ts` «reads the groups once per session…»: dos `loadAmbiguous()`, un `show()`
de otro mes, un `applyFilters()` y otro `loadAmbiguous()` → **1 sola llamada** a
`/api/transfers/ambiguous`. `StatementView.spec.ts` lo repite montando la vista,
encendiendo el interruptor y cambiando de mes → 1. El e2e lo cuenta en navegador real
tras un cambio de mes → 1. Bandera `ambiguousRequested` (`store.ts:125`), mismo patrón
que `loadAccounts`; se pide en `onMounted` (`StatementView.vue:220`), no en el watcher
de la ruta. No confundir con `loadHiddenCount`, que sí es por mes y por filtro, como
manda R7.

### 3. No escribe nada, y nada puede salir a :3000 — correcto

- `getAmbiguousCount` (`service.ts:63-66`) es un `client(path)` pelado: GET por defecto,
  sin body. Cero POST, PATCH o DELETE nuevos en todo el diff.
- Unitarios: `mockApi` intercepta `globalThis.fetch` y **rechaza con TypeError cualquier
  ruta no prevista**; una llamada de más rompe el test en vez de salir a la red.
- E2E: la red de seguridad `page.route('**/api/**' → abort)` se instala **primero**
  (`statement-noise-toggle.spec.ts:154`) y las rutas concretas después; los 5 tests
  terminan afirmando que el único método de toda la sesión fue GET. Los tres e2e
  anteriores añadieron la ruta de `ambiguous` justo para que la red de seguridad no la
  aborte y Chromium no la escriba como error de consola.

### 4. Los cuatro tests heredados que cambian — inevitables, ninguno debilita

1. **`MonthTotals.spec.ts`, el crítico: la red nueva es MÁS fuerte.** El viejo fijaba la
   nota con siete `toContain` de fragmentos; reescribir el texto era mandato de R14, así
   que sustituirlo era obligado. Lo que ocupa su sitio: `toBe(FIXED_NOTE)` con el texto
   **completo duplicado literalmente en el test**, prohibición de cualquier dígito, lista
   negra de los ocho literales retirados (inflated, raw bank movements, July, 2026, €…),
   seis `toContain` semánticos y el test de «no close button» intacto. Antes se podía
   colar un número nuevo; ahora no.
2. **`StatementView.spec.ts`**: el `toContain('July 2026')` pasa a fijar el arranque del
   texto nuevo **y añade** la prohibición de dígitos. La lista de rutas de «only ever
   reads» suma `/api/transfers/ambiguous` y sigue siendo `toEqual` exhaustivo con la
   aserción de método GET. Amplía, no debilita.
3. **`filters.spec.ts`**: dos `toEqual` exhaustivos añaden `hideNoise: false` porque el
   retorno de `fromRouteQuery` tiene un campo más. Mecánico e inevitable.
4. **Los tres e2e del extracto**: añaden la ruta de `ambiguous` y apuntan al texto nuevo.
   La red de seguridad y las aserciones de método quedan tal cual.

`fixtures.ts` cambia también, de forma aditiva (`HIDDEN_MONTH_PAGE`, `COUNT_PAGE`,
`ambiguousGroups`, y `fakeMonth().movements` honrando los dos scopes y el `pageSize=1`):
hace el doble más fiel al backend. Ninguna suite anterior cambia de intención (C4).

### 5. Las tres desviaciones declaradas — las tres aceptables

- **Icono `Info`** (desviación literal de T0-b): T0-b pedía *comprobar*, y comprobó y
  documentó que no se usaba. **No es dependencia nueva** (`@lucide/vue` ya instalado,
  import por nombre, tree-shakable; `package.json` y lockfile intactos), y el que se
  retira es el `TriangleAlert` que la feature viene a quitar. Anotado en `docs/stack.md`.
- **`ambiguousNote` sin exportar**: **obligado**, `<script setup>` no admite `export`.
  El texto es idéntico al del design y queda fijado literal desde el componente
  renderizado. Cero pérdida de cobertura.
- **E2E propio añadido por su cuenta**: coherente con las cuatro features anteriores del
  extracto, de solo lectura, y cada test afirma que solo hubo GET. Bienvenido.

## Criterios de aceptación

- [x] Puede pedir `excluded=none` y `transfer=none` con los parámetros de la feature 49 del backend → `movements.spec.ts`, `store.spec.ts`
- [x] Las sumas siguen siendo las de `totals` de la respuesta → R6, C3
- [~] Dice cuántos quedan fuera, **sin inventar cifras en el cliente** → R7. El «por
      cuánto» **no se da**, y es correcto: el importe no existe en ninguna respuesta del
      backend (con `excluded=only` o `transfer=only` los tres totals salen a "0.00" por
      construcción) y calcularlo aquí sería la aritmética inventada que el propio
      criterio prohíbe. El humano lo aprobó explícitamente en `decisions.md` 🔴 4
- [x] El interruptor vive en la URL y sobrevive al mes, la recarga y el atrás → R4, R5
- [x] Empieza apagado → R1
- [x] La nota de la F19 reescrita → R14, R15
- [x] Solo lectura → C1
- [x] Convive con los filtros de la F20 y la selección de la F22 → R10, R11, R13
- [x] Inglés, tema oscuro, tokens, sin dependencias nuevas → C6
- [x] type-check, lint, unit, build e `init.sh` en verde → C7

## Arquitectura (docs/architecture.md)

- [x] Organización por feature: todo lo nuevo en `src/features/statement/`
- [x] La UI no habla con la API: ningún fetch en un `.vue`; `NoiseSwitch` es tonto
      (props + evento `change`); la vista delega en el store y el store en el service
- [x] El store guarda estado, el service trae datos; `getAmbiguousCount` valida en
      frontera con `createValidators` (ADR-002) y devuelve solo el número
- [x] `MovementScope` en `shared/movements.ts` es aditivo: `features/review` no cambia
- [x] `getAmbiguousCount` se queda en `statement/service.ts`: correcto, se baja a
      `shared/` cuando lo pide la **segunda** feature
- [x] Estado mínimo y explícito: `hideNoise` fuera de `StatementFilters`, como el mes
- [x] `docs/architecture.md` actualizado con el mapa y la nota de «el interruptor no escribe»

## Convenciones (docs/conventions.md)

- [x] Inglés en código y en texto de usuario; docs y specs en español
- [x] Imports ordenados, `import type`, alias para cruzar features
- [x] Orden de bloques del SFC: template, script setup, estilos
- [x] Tokens semánticos (`text-ink-muted`); ningún hex ni paleta de serie de Tailwind
- [x] Sin logs de debug ni TODOs sueltos
- [x] **Linter limpio**: `pnpm lint` exit 0

## Verificación (docs/verification.md)

- [x] Recursos reales ligeros; solo se mockea la frontera HTTP (fetch y page.route)
- [x] Los tests verifican output concreto: querystrings enteras con `toBe`, el texto de
      la nota con `toBe`, listas de ids, recuentos de llamadas. Nada de «no lanza»
- [x] Caminos de error cubiertos: recuento que falla, mes que falla, `ambiguous` que
      falla y `ambiguous` con el contrato roto
- [x] La puerta completa de «Verificación final antes de cerrar», en verde

## CHECKPOINTS.md

- [x] C1 — Arnés completo; `./init.sh` exit code 0
- [x] C2 — Una sola feature `in_progress` (la 23); `progress/current.md` describe la sesión
- [x] C3 — Arquitectura y estructura respetadas, sin dependencias nuevas, sin logs de
      debug, convenciones y linter limpios
- [x] C4 — Verificación real: test por módulo nuevo, caminos felices y de error
- [x] C5 — Sesión cerrada bien: sin archivos sospechosos sin trackear (los untracked son
      los cinco de la feature y el informe). **Queda al leader** escribir la entrada de
      `progress/history.md` y pasar la feature a `done`
- [x] C6 — Coherencia con el backend: `excluded` / `transfer` y
      `GET /api/transfers/ambiguous` verificados contra
      `../gastos-backend/docs/api-contract.md` (§GET /api/movements, líneas 662-771, y
      §GET /api/transfers/ambiguous, líneas 1039-1056). Ningún endpoint ni campo
      inventado; el contrato no se toca
- [x] C7 — SDD: los 4 archivos del spec existen, la procedencia está clasificada
      (humano / delegado / añadido), los 15 requirements están en el tope declarado
      explícitamente, y cada `R<n>` tiene test
- [x] C8 — Resumen de cierre escrito en `progress/summaries/statement-noise-toggle.md`

## Resumen de cierre

- Escrito en `progress/summaries/statement-noise-toggle.md` → **sí**

## Cambios requeridos

Ninguno bloqueante. El único de la primera pasada está corregido y verificado.

### Limpieza pendiente (no bloquea el cierre, pero no debe quedarse así)

1. `progress/implementation/statement-noise-toggle.md`, tabla «La puerta»: sigue
   declarando `pnpm lint ✅ verde (oxlint, 0 avisos)`, y en el momento de escribirla
   **no lo estaba**. Hoy el lint sí está verde, así que la línea ya no miente sobre el
   estado actual, pero sí sobre lo que se midió entonces. **No la toco yo** —es el
   informe del implementer y el reviewer no edita su trabajo—: que la corrija el leader
   o el propio implementer, dejando constancia de que el lint se arregló en una segunda
   vuelta. Es exactamente la clase de nota clavada a mano que esta feature ha venido a
   combatir.

### Observación menor (no bloqueante, no pido cambio)

- `StatementView.vue:300-303`: con el interruptor encendido, `emptyState` es siempre
  `'nothingLeft'`, también cuando el mes está **realmente vacío** y no hay nada
  escondido; entonces se lee «Nothing left to show in X: everything in this month is
  hidden», que atribuye al interruptor un vacío que no es suyo. Cae dentro de la letra
  de R12 y el botón `Show everything` sigue siendo la salida correcta. Queda anotado por
  si el humano lo ve en la T20.
