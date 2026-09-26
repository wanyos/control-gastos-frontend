# Review — feature 19 `statement-by-month`

**Veredicto:** APPROVED

- **Fecha:** 2026-09-26
- **Agente:** reviewer
- **Spec:** `specs/19-statement-by-month/` (4 archivos; las 6 🔴 aprobadas por el humano
  sin cambios el 2026-09-26)
- **Informe del implementer:** `progress/implementation/statement-by-month.md`
- **Backend:** no tocado. `git -C ../gastos-backend status --short` vacío.

Todo lo que sigue está **verificado por el reviewer ejecutando y leyendo**, no leído del
informe. Los seis comandos de la puerta se lanzaron de nuevo aquí.

## Trazabilidad requirements ↔ tests (SDD)

- **R1** [x] `months.spec.ts:104` («asks for the whole month, page 1, at the contract
  maximum») y `:114` («never carries a status») — comprobado con
  `Object.keys(monthQuery(...))` exacto, no con un `toContain`; `store.spec.ts:31`
  (querystring literal `from=2026-09-01&to=2026-09-30&page=1&pageSize=200`);
  `StatementView.spec.ts:44` (una sola petición al montar, mes en curso). Contrastado
  contra el contrato: `pageSize` 1-200 y `from`/`to` con los dos extremos incluidos
  (`api-contract.md:637`+).
- **R2** [x] `MonthNav.spec.ts:14` (las dos flechas, cruzando año) y `:44` (el selector);
  `store.spec.ts:45` (`shift(-1)` cambia rango y `totals`); `StatementView.spec.ts:79`;
  e2e `statement.spec.ts:196`.
- **R3** [x] `months.spec.ts:95` («reads back what it writes»);
  `StatementView.spec.ts:56`, `:79` (`router.currentRoute.query.month`) y `:101`
  (`router.back()` devuelve a septiembre); e2e `:196` (con `reload()` y `goBack()` reales
  en navegador).
- **R4** [x] `months.spec.ts:79` (5 casos: `2026-13`, `26-09`, `2026-09-11`, vacío,
  `nope`) y `:89` (ausente, `null`, array); `StatementView.spec.ts:65` (3 casos, y además
  afirma que **no** aparece el bloque de error).
- **R5** [x] `MonthTotals.spec.ts:18` (las tres cifras `toBe(formatMoney(TOTALS.x))`) y
  **`:28`, el test que de verdad lo prueba**: suma los movimientos inyectados con
  `sumAmounts` y afirma que ese número **no** aparece en pantalla. Los fixtures están
  construidos a propósito para que `totals` no cuadre con la suma de la página
  (`fixtures.ts:116` vs `:120`). `store.spec.ts:171` (`result.totals` intacto tras
  `loadMore`).
- **R6** [x] `MonthTotals.spec.ts:63` (las cinco afirmaciones de la nota, una por
  cláusula), `:76` (cero `button` en todo el bloque, `title` undefined, `isVisible`),
  `:85`; `StatementView.spec.ts:53` (la nota está al montar); e2e `:149`. **Auditado a
  mano** más abajo.
- **R7** [x] `MonthTotals.spec.ts:52` (`spent`, `earned`, `savings`, `gastado`).
  Verificado además con grep sobre **toda** la carpeta: las palabras solo aparecen en un
  comentario de código de `MonthTotals.vue:53`, nunca en texto renderizado.
- **R8** [x] `months.spec.ts:129` (4 tests, incluido `:144` «never re-sorts», que mete
  una lista desordenada y comprueba que sale desordenada — no es un espejo del código);
  `StatementList.spec.ts:26` (3 cabeceras en orden 11 → 4 → 2 Sept), `:34`;
  `StatementRow.spec.ts:53` (la fila **no** repite la fecha).
- **R9** [x] `StatementRow.spec.ts:21` (los cuatro datos, valor exacto), `:32` (signo
  desde `type`, con `income`/`expense`/`neutral`), `:38` (`Uncategorized`), **`:44`** (el
  fixture trae `balanceAfter: '9954.63'`, se afirma que el parseo lo tiene y que **ni
  `9954` ni `9.954` ni la palabra `balance`** salen en el HTML);
  `StatementView.spec.ts:181` (ídem a nivel de pantalla).
- **R10** [x] `StatementRow.spec.ts:58` (la marca con `transferId`, su `aria-label`, y
  **que no está** sin `transferId`); e2e `:152` (`toHaveCount(1)` con un solo traspaso
  entre tres filas).
- **R11** [x] `StatementList.spec.ts:42` (frase exacta + cero filas + cero cabeceras +
  cero `Load more`); `store.spec.ts:94` (un mes vacío deja `error` en `null`);
  `StatementView.spec.ts:123`; e2e `:222`.
- **R12** [x] `months.spec.ts:176` (las cuatro frases, una por rama) y `:193` (ninguna
  contiene «parámetro»); `store.spec.ts:106` (4 tests: red, 400, contrato roto y olvido
  del fallo anterior); `StatementView.spec.ts:135` (frase + `Try again` que **recarga de
  verdad**: la segunda petición se cuenta) y `:155` (el `message` español del backend no
  se pinta).
- **R13** [x] `store.spec.ts:151` (4 tests: concatena sin mover `totals` ni
  `pagination.total`, no pide nada si el mes cabe, `show` tira lo traído, y un `loadMore`
  fallido deja el mes puesto); `StatementList.spec.ts:51` (`Load more` solo con
  `totalPages > 1`, `Showing 2 of 412`) y `:65`.
- **R14** [x] `store.spec.ts:80` (`isLoading` en vuelo, `result` null);
  `StatementView.spec.ts:115` (con una respuesta diferida: sale `Loading September 2026…`
  y **cero** `statement-row`).
- **R15** [x] `store.spec.ts:61`: lanza julio, lanza septiembre, **resuelve julio
  después** y afirma que el mes, las sumas y los días siguen siendo los de septiembre. Es
  el test que de verdad ejercita el `loadRun` de `store.ts:32`.

**Ningún `R<n>` queda sin cobertura.** Ningún test de la feature es un espejo del código:
los de `months.ts` fijan valores literales, y los de componente y vista pasan los
payloads crudos por `parseMovementPage` antes de montar (`MonthTotals.spec.ts:10`,
`StatementList.spec.ts:10`, `StatementRow.spec.ts:13`), así que la frontera de ADR-002 se
ejercita de verdad.

## Tasks completas (SDD)

T0-T17 [x], verificadas una a una contra el código. **T18 [ ]** — es la comprobación con
el humano delante contra el backend real: no es del implementer, está justificada en
`progress/implementation/statement-by-month.md:7` y en `tasks.md:114` («si el backend no
está levantado, se anota como pendiente y **no bloquea el cierre**»). **No se exige para
aprobar**; queda para el leader con el humano.

## Las cuatro lupas del encargo

### 1. La 🔴 2, la nota sobre las sumas infladas — CUMPLE

Leída carácter a carácter en `MonthTotals.vue:71-76` y su montaje en `:40-46`.

- **Siempre visible:** la nota vive en el **mismo** `BaseCard` que las tres cifras
  (`MonthTotals.vue:2-47`), en un `<p>` sin `v-if`, sin `v-show` y sin estado. No existe
  ninguna forma de renderizar las cifras sin la nota: el componente es uno.
- **Sin botón de cerrar:** `MonthTotals.vue` no contiene ni un `<button>` ni un `emit`. El
  test `MonthTotals.spec.ts:79` lo mide con `findAll('button')` sobre **todo** el
  componente, no solo sobre la nota.
- **Sin tooltip:** el `<p>` de la nota no lleva `title`; el texto va en un `<span>` hijo
  visible (`:45`), no en un atributo. `MonthTotals.spec.ts:81` afirma que `title` es
  `undefined`. El único `title` de la feature está en el badge `Transfer`
  (`StatementRow.vue:24`), que es otra cosa y la manda design §6.
- **Dice lo que el spec ordena**, las cinco cláusulas de la 🔴 2 y las cuatro de R6:
  (a) «These are **raw bank movements**»; (b) «Deposit openings and maturities, and
  transfers to accounts not imported here, **count as money in and out**»; (c) el ejemplo:
  «**July 2026** reads **57.949 €** in and **59.096 €** out, almost all of it **one deposit
  rolling over**» — números contrastados contra `requirements.md:31` (2026-07: 59.096 € de
  gasto, 57.949 € de ingreso): **el sentido es el correcto**, entrada 57.949 y salida
  59.096, no están invertidos; (d) «**Paired transfers are already out of these figures**,
  but you still see them in the list below»; (e) «A clean view needs the **noise switch**,
  which comes in a later step». El literal coincide **palabra por palabra** con
  `design.md:206`.
- **Etiquetas:** `Money in` (`:10`), `Money out` (`:19`), `Difference` (`:28`). Ni
  «spent», ni «earned», ni «savings», ni «gastado» en ningún texto renderizado de la
  feature (grep sobre `src/features/statement/` y `e2e/statement.spec.ts`: un único
  acierto, y es un comentario de código en `MonthTotals.vue:53`).

### 2. Nada se escribe y nada puede salir a `:3000` — CUMPLE

- **Grep de cierre reproducido:** en `src/features/statement/` no aparece `POST`, `PATCH`,
  `DELETE` ni `fetch(`. Cero aciertos.
- **Tests unitarios:** `fixtures.ts:218` mockea `globalThis.fetch` entero y **rechaza**
  cualquier llamada que no sea `GET /api/movements` (`:225`). Ninguna petición real puede
  salir de la suite unitaria, ni a `:3000` ni a ningún sitio.
- **E2E:** `statement.spec.ts:108` registra la red de seguridad
  `page.route('**/api/**', route => route.abort())` **primero**, y encima las tres rutas
  que la pantalla necesita (`:109-123`), que se sirven con `route.fulfill` y por tanto
  **nunca proxyan** al backend. Las reglas posteriores ganan en Playwright, así que
  cualquier `/api` no previsto se aborta en vez de atravesar el proxy de `vite.config.ts`
  hacia `:3000`.
- **Aserción de método** en los cuatro escenarios e2e (`statement.spec.ts:156`, `:218`,
  `:237`): `watch.requests.every(r => r.method() === 'GET')` sobre **todas** las
  peticiones `/api/` de la sesión, no solo las del extracto. Más
  `StatementView.spec.ts:167` (`api.methods()` da `['GET']` tras navegar dos meses).
- **Cero errores de consola y de página** afirmados en e2e (`:157-158`, `:219`, `:238`).

### 3. Las sumas se pintan tal cual vienen del backend — CUMPLE

- `MonthTotals.vue:15`, `:24`, `:34`: `formatMoney(totals.income|expense|net)` **directo
  desde la prop**. No hay ni un `sumAmounts`, ni un `reduce`, ni un `+` sobre importes en
  toda la carpeta.
- El único uso de `toCents` es `MonthTotals.vue:80`, y es **solo para el signo** del
  `Difference` (`< 0n`), exactamente lo que autoriza la decisión ⚙️ 2.
- `StatementView.vue:12-16` inyecta `store.result.pagination` y `store.result.totals` sin
  tocarlos; el store nunca escribe dentro de `totals` (`store.ts:59` asigna la página
  entera tal cual).
- `loadMore` (`store.ts:79-96`) **solo** concatena en `extra`; `result.totals` y
  `result.pagination.total` no se reasignan nunca. Verificado por `store.spec.ts:170-171`.
- Y la red de seguridad contra la erosión: `MonthTotals.spec.ts:28` **falla** si alguien
  algún día sustituye las cifras por una suma de la página.

### 4. Las 7 desviaciones declaradas — 7 de 7 aceptables, ninguna hay que revertirla

1. **Cabecera de día `bg-surface-card` en vez de `bg-surface-app/95`** (design §7) —
   **aceptable, y es la decisión correcta.** Contraste **medido y documentado**: la
   cabecera es `text-ink-muted` sobre `bg-surface-card` (`StatementList.vue:10`), y el par
   `--ink-muted on --surface-card >= 4.5` ya tiene su línea `contrast:` en
   `src/assets/theme-dark.css:30`, que `theme-dark.spec.ts` mide (verde en la suite). Con
   `surface-app/95` habría hecho falta una línea nueva: hoy solo existe la del topbar
   (`theme-dark.css:20`). **Auditado el resto de pares de la feature, ninguno es nuevo:**
   `--warning on --surface-card` (`:35`) y `--warning on --warning-subtle` (`:59`) para la
   nota; `--ink-strong`, `--ink-body`, `--negative` y `--positive` sobre `--surface-card`
   (`:28`, `:29`, `:33`, `:34`); y para la fila con `hover:bg-surface-sunken`:
   `--ink-strong` (`:44`), `--ink-muted` (`:43`), `--positive` (`:41`), `--ink-faint` a 3:1
   para el punto de categoría (`:42`) y `--chart-1..8` a 3:1 (`:66-73`). `theme-dark.css`
   **no se toca**, que es justo lo que pedía T0(a).
2. **T0(b) comprobado dentro del e2e y no a mano** — **aceptable y mejor que lo pedido.**
   `statement.spec.ts:161` lee los estilos computados del `input type="month"` real en
   Chromium: `type`, `value` con forma `YYYY-MM`, color distinto del fondo, `color-scheme`
   con `dark` y que los tokens resuelven. Es una comprobación repetible, no una mirada. No
   hizo falta el plan B del `BaseSelect`.
3. **`loadingMonthLine` y `showingLine` de más en `months.ts`** — aceptable. Los dos
   textos **ya estaban** en la tabla de design §6 (`design.md:208-209`); solo faltaba su
   firma en §3. Y están testados (`months.spec.ts:167`, `:171`).
4. **La nota de R6 como constante dentro de `MonthTotals.vue`** — aceptable, es lo que
   design §6 dice («todos en `months.ts` **salvo los rótulos fijos**»), y no la usa nadie
   más. No debilita nada: el test la verifica igual.
5. **El store expone `page` y `shown`** — aceptable y necesario: `store.ts:25` y `:40`
   alimentan qué página pide `loadMore` y el `Showing N of M`. Estado mínimo y derivado
   (`shown` es un `computed`), coherente con el principio 5 de `architecture.md`.
6. **Un `Load more` fallido deja la lista puesta** — aceptable, y es la decisión honesta:
   blanquear un mes cargado porque falló la página 2 sería peor. El comportamiento está
   **testado** (`store.spec.ts:205`), no solo afirmado, y no contradice ningún `R<n>`.
7. **`docs/stack.md` tocado además de `docs/architecture.md`** — **aceptable, no hay que
   revertirlo.** Revisado el diff entero: son dos correcciones de exactitud sobre hechos
   que esta feature cambió, sin ninguna decisión nueva. (a) «los cinco specs de `e2e/`»
   pasa a «los **seis**», con el sexto descrito: es **verdad verificada**, la suite corre
   6 ficheros. (b) una línea en el inventario de iconos diciendo que la #19 **no añade
   ninguno**: también verdad, `MonthNav.vue:49` y `MonthTotals.vue:57` reutilizan
   `ChevronLeft`, `ChevronRight` y `TriangleAlert`. Dejar el doc mintiendo sobre el número
   de specs habría sido peor que tocarlo, y `architecture.md` obliga a anotar en
   `stack.md` justo este tipo de hecho. No se ha colado nada más en el diff.

## Criterios de aceptación (`feature_list.json`, los 11)

- [x] 1 `/movements` deja de ser placeholder y enseña el mes en curso sin `status` →
      `router/index.ts:72`, `router.spec.ts:63`, `StatementView.spec.ts:44`,
      `months.spec.ts:114`.
- [x] 2 Salto de mes en los dos sentidos y el mes en la URL → `MonthNav.spec.ts:14`,
      `StatementView.spec.ts:79` y `:101`, e2e `:196` (recarga y atrás reales).
- [x] 3 Las sumas son las de `totals`, nunca calculadas en cliente →
      `MonthTotals.spec.ts:18` y `:28`. Ver lupa 3.
- [x] 4 Cada línea con concepto, cuenta, categoría e importe con signo desde `type`, sin
      saldo → `StatementRow.spec.ts:21`, `:32`, `:44`. La **fecha** la pone la cabecera del
      día, no la línea: es la 🔴 3 aprobada por el humano y la matización (delegado) de R9
      en `requirements.md:232`, no una desviación silenciosa.
- [x] 5 Mes vacío distinto de fallo de carga → `StatementList.spec.ts:42`,
      `StatementView.spec.ts:123` (afirma que **no** sale el bloque de error) y `:135`.
- [x] 6 Paginación del contrato respetada y mes completo visible → `months.spec.ts:104`
      (`pageSize` 200, el máximo del contrato) y `store.spec.ts:151` (`Load more`).
- [x] 7 Solo lectura, ni un `POST`, `PATCH` ni `DELETE`. Ver lupa 2.
- [x] 8 Validación en frontera reutilizando `shared/movements.ts` → `types.ts:6-16` solo
      re-exporta; `store.ts:7` usa `getMovements`; `store.spec.ts:127` demuestra que es
      **la guarda compartida** la que salta con un `totals` roto.
- [x] 9 Las F15-F18 no cambian → suite completa verde sin tocar sus specs; el único test
      modificado es el de `router.spec.ts:61`, la excepción prevista por C4, y se
      **sustituye** (ahora afirma `toBe(StatementView)` y `not.toBe(PlaceholderView)`), no
      se borra.
- [x] 10 Todo en inglés, tema oscuro con tokens semánticos, contraste verificado, sin
      dependencias nuevas → `package.json` sin cambios en el diff; grep sin un solo hex,
      `rgb(`, `@apply` ni color de la paleta de serie de Tailwind en la carpeta.
- [x] 11 La puerta en verde. Ver abajo.

## Arquitectura (`docs/architecture.md`)

- [x] **1 Organización por feature** — todo en `src/features/statement/` (componentes,
      vista, store, lógica pura, tipos, tests co-localizados).
- [x] **2 La UI no habla con la API** — cero `fetch(` en los `.vue`; la vista va al store
      (`StatementView.vue:74`) y el store al service compartido (`store.ts:7`).
- [x] **3 El store guarda estado, el service trae datos** — `store.ts` no construye
      ninguna URL a mano: delega en `monthQuery` (puro) y `getMovements`.
- [x] **4 Tipos propios** — `types.ts` re-exporta los del frontend y añade `DayGroup`; no
      se declara un `Movement` paralelo ni se pasea JSON crudo por los componentes.
- [x] **5 Estado mínimo y explícito** — todo dentro del setup store; el `loadRun`
      (`store.ts:32`) es un contador local del store, no una variable module-level mutable.
- [x] **6 Componentes tontos** — `MonthNav` **no carga nada**, emite `change`;
      `StatementList` emite `loadMore`; `StatementRow` solo recibe `movement`. La única
      pieza que orquesta es la vista.
- [x] **Estructura de carpetas** — coincide con el árbol, que se ha actualizado
      (`architecture.md:94-99`) junto con la nota de aislamiento (`:123-131`).
- [x] **Sin dependencias nuevas** y sin logs de debug ni TODOs sueltos: grep limpio.
- [x] **C3, un sentido de dependencia** — verificado con grep: `statement` no importa nada
      de `review`, `import`, `category-rules` ni `net-worth`; y los únicos que la importan
      son `router/index.ts:16` y `router/__tests__/router.spec.ts:4`.

## Convenciones (`docs/conventions.md`)

- [x] **Idioma** — identificadores, comentarios y todo el texto de usuario en inglés; los
      docs y el spec en español; los nombres de archivo en inglés.
- [x] **Estilo, nombres, imports** — `pnpm lint` (oxlint) sin hallazgos; orden de imports
      vendor → `@/` → relativos con línea en blanco en los cinco archivos nuevos;
      `import type` en todos los tipos (`verbatimModuleSyntax`); `useStatementStore`,
      `MonthKey`, `STATEMENT_PAGE_SIZE`, `isLoading`/`hasMore`/`isNetNegative`; bloques SFC
      en orden `<template>` → `<script setup>`, sin un solo `<style scoped>` ni `@apply`.
- [x] **Estilos** — solo alias semánticos; cifras en `font-mono tabular-nums`
      (`MonthTotals.vue:12`, `StatementRow.vue:40`); títulos en `font-display`; nombres de
      clase **literales completos** en `StatementRow.vue:68-77`, como exige el whitelist de
      Tailwind.
- [x] **Dinero y fechas** — todo por `shared/money.ts`: `formatMoney` para importes y
      `formatDate` para las cabeceras de día (`months.ts:133`). Ni un `Number()`,
      `parseFloat` ni `parseInt` sobre un importe en toda la feature.
- [x] **Manejo de errores** — `ValidationError` para un mes imposible (`months.ts:57`),
      `toAppError` en el store (`store.ts:64`), el fallo vive en `error` y lo pinta la
      vista; nunca un `throw` de string y nunca el `message` del backend en pantalla.
- [x] **Tests** — en `src/**/__tests__/*.spec.ts`, nombres descriptivos en inglés,
      `describe`/`it` y patrón AAA.

## Verificación (`docs/verification.md`)

- [x] **Recursos correctos, sin mocks innecesarios** — se mockea **solo la frontera HTTP**
      (`vi.spyOn(globalThis, 'fetch')` en unit, `page.route` en e2e). El router es real
      (`createMemoryHistory`), Pinia es real, los componentes se montan de verdad y los
      payloads pasan por el parser real.
- [x] **Output concreto, no «no lanza»** — se comparan valores exactos: querystrings
      literales, `11 Sept 2026`, `Showing 2 of 412`, las frases de error completas. El
      único `resolves.toBeUndefined()` (`store.spec.ts:111`) va **acompañado** de tres
      aserciones sobre el estado resultante.
- [x] **Caminos de error y de borde**, no solo el feliz: red caída, 400, contrato roto, mes
      vacío, `Load more` fallido, respuesta tardía, URL basura (8 variantes), mes medio
      teclado en el selector, febrero bisiesto, cruce de año, banco desconocido.
- [x] **Nivel 2 (E2E de UI)**, obligatorio en features de UI: 4 escenarios nuevos.
- [x] **Nivel 4 (trazabilidad)** documentada por el implementer y **re-verificada** aquí
      requisito a requisito.

## La puerta, re-ejecutada por el reviewer

| Comando | Resultado |
|---|---|
| `pnpm type-check` | **OK** (`vue-tsc --build`, exit 0, sin errores) |
| `pnpm lint` | **OK** (`oxlint`, exit 0, sin hallazgos) |
| `pnpm test:unit` | **OK — 74 ficheros, 1060 tests, 1060 pasan, 0 fallos** |
| `pnpm build` | **OK** — `index-5q_mDQPh.js` 231,55 kB (75,49 gzip), CSS 31,70 kB |
| `pnpm test:e2e --project=chromium` | **OK — 21 tests, 21 pasan** (17 anteriores + 4 nuevos) |
| `./init.sh` | **OK, exit 0** — `[OK] Entorno listo. Puedes empezar a trabajar.` |

Las cifras del informe del implementer coinciden con las medidas aquí.
`git -C ../gastos-backend status --short` vacío: **el backend no se ha tocado**.

## CHECKPOINTS.md

- [x] **C1 — Arnés completo.** Están `AGENTS.md`, `init.sh`, `feature_list.json`,
      `progress/current.md` y los cinco `docs/`. `./init.sh` termina con exit code 0.
- [x] **C2 — Estado coherente.** **Una sola** feature en `in_progress` (la 19, verificado
      recorriendo `feature_list.json` entero); toda feature `done` con sus tests verdes
      (1060/1060); `progress/current.md` describe la sesión activa y no arrastra basura de
      sesiones anteriores.
- [x] **C3 — Arquitectura.** Estructura según `architecture.md` (actualizado en el mismo
      cambio); sin dependencias nuevas; sin `console.log` ni TODOs sueltos; convenciones
      respetadas.
- [x] **C4 — Verificación real.** Al menos un test ejecutable por módulo nuevo (7 ficheros,
      +87 tests); corren en el entorno de `verification.md`; camino feliz **y** de error.
- [ ] **C5 — Sesión cerrada bien.** *No es del reviewer y no bloquea la aprobación.* Los
      untracked son todos legítimos (`src/features/statement/`, `e2e/statement.spec.ts`,
      `progress/implementation/statement-by-month.md`), sin temporales ni builds.
      **Pendiente del leader al cerrar:** la entrada en `progress/history.md`, vaciar
      `progress/current.md`, el estado de la E7 en `docs/roadmap.md` y pasar la feature a
      `done` en `feature_list.json`.
- [x] **C6 — Coherencia con el proyecto hermano.** No cambia el contrato: la pantalla solo
      consume `GET /api/movements` tal como está en
      `../gastos-backend/docs/api-contract.md:637`+ (`from` y `to` inclusivos, `pageSize`
      máximo 200, `totals` y `pagination.total` sobre todas las coincidencias). Ni un
      endpoint, modelo o campo inventado. `related-projects.md` no necesita cambio. La
      consecuencia que sí es del humano —que estas sumas no se pueden limpiar desde el
      frontend— está dicha en la propia pantalla (R6) y en `decisions.md`.
- [x] **C7 — SDD.** Los **4** archivos en `specs/19-statement-by-month/`; `decisions.md`
      cabe en una página, con los bloques de la plantilla y **exactamente 6** puntos 🔴,
      cada uno con su alternativa concreta; **15 requirements**, dentro del tope; EARS
      estricto (`CUANDO` / `SI…ENTONCES` / `MIENTRAS` / `NO DEBE`, un requisito por `R<n>`);
      **sección de Procedencia presente** (`requirements.md:185-260`) con **los 15**
      clasificados (`humano` / `delegado` / `añadido`) y los seis
      `← REVISAR EN APROBACIÓN` que el humano aprobó; cada `R<n>` con test concreto. Tasks:
      T0-T17 `[x]`, T18 `[ ]` con justificación escrita.
- [x] **C8 — Resumen de cierre escrito.** `progress/summaries/statement-by-month.md`.

## Resumen de cierre

- Escrito en `progress/summaries/statement-by-month.md` → **sí**.

## Cambios requeridos

**Ninguno.** No hay nada que arreglar para aprobar: la puerta está verde, los 15
requisitos tienen test real, las 6 🔴 están implementadas tal como el humano las aprobó —la
nota de la 🔴 2, palabra por palabra— y las 7 desviaciones son menores y todas defendibles.

## Observaciones para la rodaja siguiente (no bloquean, no se piden ahora)

Tres cosas vistas al leer, que no incumplen ningún `R<n>` ni ninguna decisión aprobada y
que **no** hay que tocar en esta feature:

1. **Las sumas del mes anterior siguen en pantalla mientras carga el nuevo.** `store.show`
   (`store.ts:51-54`) pone `month` al mes nuevo de inmediato pero no vacía `result`, y
   `StatementView.vue:12` monta `MonthTotals` con `v-if="store.result"`. Entre el clic y la
   respuesta, la etiqueta dice «August 2026» y las cifras son todavía las de septiembre. La
   lista **sí** se oculta (`StatementView.vue:37`), que es lo que R14 exige literalmente, y
   la línea de carga nombra el mes que viene (`Loading August 2026…`), así que no hay
   engaño silencioso — pero es el mismo tipo de discordancia que la decisión ⚙️ 4 quiere
   evitar. Si la feature de filtros toca esta vista, atenuar o esconder las cifras mientras
   `isLoading` cierra el hueco con una línea.
2. **La prohibición de R7 se mide solo sobre `MonthTotals`.** El grep de cierre confirma
   que las palabras no están en **ninguna** parte de la feature, así que el requisito se
   cumple hoy; pero la red que lo protege del futuro cubre un solo componente. Una aserción
   equivalente en `StatementView.spec.ts` lo blindaría cuando lleguen los filtros y el
   interruptor del ruido, que es cuando volverá la tentación de escribir «spent».
3. **El espacio antes del `€` en la nota es U+0020, no U+00A0** (`MonthTotals.vue:73-74`).
   Es el literal exacto que manda design §6 y no pasa por `formatMoney` a propósito (son
   cifras medidas, escritas a mano), así que el implementer hizo lo pedido; pero la regla de
   `conventions.md` para el `€` es el espacio no separable, y con el ancho de la nota el
   símbolo puede quedarse solo al final de una línea. Cosmético.

Y la de siempre, ya anotada por el implementer y fuera de su alcance: el aviso de `vitest`
sobre `pool: 'vmThreads'` (jsdom creado 74 veces, ~100 s, el 70 % del tiempo de la suite)
merece su propia tarea de higiene de tooling.
