# Arquitectura — Qué significa "hacer un buen trabajo"

> **Este documento es TUYO (humano) y está confirmado.** Recoge las decisiones
> de arquitectura de `gastos-frontend`, derivadas de las convenciones del stack
> (Vue 3 + Pinia + Vue Router + Vite) y del propósito de la app (control de
> gastos/ingresos que consume la API del backend hermano). Revisado y aceptado
> el 2026-07-08; evoluciónalo cuando tomes una decisión nueva.

---

## Principios

1. **Organización por feature, no por tipo técnico.**
   El código de una funcionalidad (componentes, composables, store, servicio,
   tipos) vive junto en `src/features/<feature>/`, no repartido en carpetas
   globales `components/` + `stores/` + `services/`. Un revisor puede decir
   "esto pertenece a una feature y está todo junto / no lo está".

2. **La UI no habla con la API directamente.**
   Los componentes `.vue` no llaman a `fetch`. Van contra un *composable* o un
   *store*, y el acceso HTTP se aísla en una capa `services/` (o `api/`). Regla
   verificable: **no hay `fetch(` dentro de un `.vue`**.

3. **El store guarda estado, el service trae datos.**
   Pinia mantiene estado de UI/dominio y orquesta; los `services/` construyen
   requests, mapean la respuesta de la API a los tipos del frontend y no
   guardan estado. Un service es una función pura de "entrada → datos".

4. **Los tipos del frontend son propios.**
   El frontend define sus interfaces a partir del contrato
   (`gastos-backend/docs/api-contract.md`), no copia tipos del backend.
   La respuesta cruda de la API se mapea a la forma que usa la UI en la capa
   `services/`; no se pasea el JSON del backend por los componentes.

5. **Estado mínimo y explícito.**
   Sin estado global mutable fuera de los stores de Pinia designados. Nada de
   variables module-level mutables como caché improvisada.

6. **Componentes tontos por defecto.**
   Un componente recibe `props` y emite `events`; la lógica de negocio vive en
   composables/stores. Si un `.vue` acumula lógica, se extrae a un
   `useXxx()`.

## Estructura de carpetas

> Estructura *feature-based* establecida (feature #1 creó el esqueleto;
> la feature #2 pobló `shared/` y `services/` con los módulos transversales).
> `@` es alias de `src/`.

```
src/
  main.ts                 # bootstrap: createApp + Pinia + Router
  App.vue                 # raíz: envuelve AppShell
  router/
    index.ts              # todas las rutas; su meta.label/meta.icon alimenta la sidebar (feature #8)
  features/
    <feature>/            # p.ej. expenses, incomes, dashboard
      components/         # componentes de presentación de la feature
      composables/        # useXxx() con la lógica reutilizable
      views/              # componentes-página montados por el router
      store.ts            # store Pinia de la feature (setup store)
      service.ts          # acceso a la API + mapeo a tipos del frontend
      types.ts            # tipos/interfaces propios (derivados del contrato)
      __tests__/          # tests co-localizados (*.spec.ts)
    import/               # features #13-#14: botón Import de la barra, aviso de pendientes y modal
      components/         # ImportButton, ImportDialog, ImportPhases, PendingList, ImportSummary, FileIssueList (#13);
                          # ImportDetails, ReportSection, FinalPassAlerts, BalanceMismatchList, UnreadLineList,
                          # AmbiguousTransferList, CategoryConflictList, ImportedFileList, FileHeadingLine (#14)
      store.ts            # useImportStore: pendientes + máquina de estados del modal;
                          # `newDoubtfulCount`: cuántos movimientos dudosos de dinero propio
                          # hay justo después de importar que no estaban justo antes (#35)
      service.ts          # GET /api/ingestion/pending, POST /api/import (informe completo);
                          # `readDoubtfulIds`: GET /api/movements?ownership=doubtful (#35)
      outcome.ts, summary.ts, fileMessages.ts   # textos y titular, funciones puras (#13);
                          # `newDoubtfulLine` en summary.ts (#35)
      details.ts          # agrupa y recorta el detalle del informe, funciones puras (#14)
    review/               # feature #15: la cola de pendientes; feature #16: categorizar y confirmar
      components/         # MovementList, MovementRow, ReviewFilterBar, CategorySelect,
                          # ReviewTotals, ReviewPager, ReviewCountBadge (#15);
                          # ReviewActionBar, MovementCategorySelect, ActionNotice,
                          # BulkConfirmDialog (#16);
                          # UncategorizedCount (#30: la frase de la cabecera que dice cuántos
                          # pendientes siguen sin categoría)
      views/              # ReviewView (ruta /review)
      store.ts            # useReviewStore: filtros, página, datos, categorías y recuento (#15);
                          # selección, acciones y deshacer (#16);
                          # `uncategorizedCount` y `refreshUncategorizedCount`: cuántos
                          # pendientes no tienen categoría, con una petición propia de
                          # `pageSize=1` al abrir la pantalla y tras cada acción (#30);
                          # `knownDeposits`: el `deposit` de la última lectura de cada
                          # movimiento, que se vuelve a poner en la línea tras un PATCH (#31)
      service.ts          # GET /api/movements, GET /api/categories (#15);
                          # PATCH /api/movements (#16). El PATCH de UN movimiento bajó a
                          # shared/movements.ts en la #21 y se re-exporta desde aquí
      filters.ts          # filtros ↔ querystring de la API y de la URL, guardas de `q` (puras)
      actions.ts          # elegibilidad, plan de deshacer y textos de acción, puras (#16)
    category-rules/       # feature #17: reglas de categorización («lo que contenga X va a Y»)
      components/         # RuleDialog (crear y editar), RuleList, RuleRow, DeleteRuleDialog,
                          # RuleCreatedNotice, ApplyRulesDialog, ApplyResult, RuleConflictList,
                          # RuleMatchPreview (a cuántos afecta el texto, feature #18);
                          # LastApplyReport (qué hizo la última aplicación de las reglas; lo
                          # pintan `Rules` y `Review`) y CategorizedMovementList (sus filas,
                          # una por movimiento categorizado) (#30); SuggestedRuleList y
                          # SuggestedRuleRow (las reglas propuestas de `Rules`, una fila por
                          # propuesta con su desplegable de categoría y `Create rule`) (#33);
                          # OtherMovementsQuestion (la pregunta tras cambiar a mano la
                          # categoría de un movimiento: si la categoría va también a los
                          # otros movimientos que contienen un texto; la pintan `Review` y
                          # `Movements`) (#34)
      views/              # RulesView (ruta /rules); desde la #33 pinta también las reglas
                          # propuestas, encima de las reglas propias
      store.ts            # useCategoryRulesStore: lista, diálogos y la pasada bajo demanda;
                          # `lastApply` (la respuesta de la última aplicación y su hora, solo
                          # en memoria) y `dismissLastApply` (#30); desde la #33, las
                          # propuestas (`loadSuggestions`, `createFromSuggestion`), y
                          # `lastCreated` y `lastApply` guardan también lo que movió crear o
                          # cambiar una regla; desde la #34, `question`, `offerRule`,
                          # `checkQuestionText`, `acceptQuestion` y `dismissQuestion` (la
                          # pregunta tras un cambio a mano de la categoría de una fila)
      service.ts          # GET/POST /api/category-rules, PATCH y DELETE /:id, POST /apply;
                          # `parseApplyResult` valida también `categorizedMovements` y que
                          # tenga tantos elementos como `categorized` (#30); desde la #33,
                          # `getSuggestions` (GET /api/category-rules/suggestions) y
                          # `parseSavedRule`, que exige `categorization` en la respuesta del
                          # POST y del PATCH (la lee `parseCategorization`, la misma de /apply);
                          # desde la #34, `getRulePreview` (GET /api/category-rules/preview,
                          # solo lectura: qué movería una regla sin crearla) y
                          # `parseRulePreview`, que se queda solo con los movimientos que
                          # lleva la regla nueva (`ruleId: null`)
      rules.ts            # normalización del backend, texto propuesto, umbrales y textos de la
                          # previsualización y de los errores (puras; #17 y #18);
                          # `lastApplyHeadline`, `lastApplyFigures` y `signedAmount` (#30);
                          # textos de las propuestas y de la regla guardada (#33);
                          # `suggestionTextOf` (el texto que propondría la lista de
                          # propuestas para una descripción, pasos 1 a 5 del contrato),
                          # `TOO_SHORT` y los textos de la pregunta (#34)
      types.ts            # CategoryRule, NewRule, ApplyResult…; desde la #30, AppliedRule,
                          # CategorizedMovement, `ApplyResult.categorizedMovements` y LastApply;
                          # desde la #33, SuggestedRule, SavedRule y `LastApply.cause`;
                          # desde la #34, PreviewMovement, RulePreview, QuestionCheck,
                          # OtherMovementsQuestionState y ManualChange
    statement/            # feature #19: el extracto, mi histórico mes a mes; desde la #21
                          # también corrige la categoría de una línea (su única escritura)
      components/         # MonthNav, MonthTotals, StatementList, StatementRow,
                          # StatementFilterBar, StatementCategorySelect (#20);
                          # RowCategoryEditor, StatementActionNotice (#21);
                          # NoiseSwitch (#23: el interruptor del ruido y el `Hiding N`)
      views/              # StatementView (ruta /movements)
      store.ts            # useStatementStore: mes, página del mes, carga, error, Load more,
                          # filtros (#20), editor abierto, escritura y deshacer (#21);
                          # `totalWithoutHiding`: cuántos movimientos tiene el mes sin
                          # esconder nada, tomado de la lectura que ya hacía `hiddenCount` (#29);
                          # `visibleMovements`, `hiddenInBrowser` y `visibleTotal`: con la
                          # casilla puesta, quita de lo cargado las aperturas y cancelaciones
                          # de depósito y las cuenta; `hiddenCount` pasa a computed (#31);
                          # desde la #35 quita y cuenta también lo de entre tus cuentas
                          # (`isBetweenOwnAccounts` de shared/ownership.ts), y tras un PATCH
                          # vuelve a poner en la línea el `ownership` de la última lectura
      months.ts           # todo lo puro del mes: rango, salto, URL, agrupación por día y textos
      filters.ts          # los cuatro filtros ↔ querystring de la API y de la URL (#20);
                          # el interruptor `hideNoise` (`hide=true` en la URL, `excluded=none`
                          # y `transfer=none` en la API), `hiddenCountQuery`,
                          # `hiddenCountLine` y `nothingLeftLine` (#23); `nothingShownLine`,
                          # la frase de la lista vacía mientras no se sabe por qué (#29)
      actions.ts          # filtro de categoría, textos del aviso y de los errores, puras (#21)
      service.ts          # setMovementCategory: PATCH /api/movements/:id con solo `categoryId` (#21);
                          # setMovementsExcluded: PATCH /api/movements con solo ids y
                          # excludedFromTotals (#22); getAmbiguousCount: GET
                          # /api/transfers/ambiguous, solo lectura, una vez por sesión (#23)
      types.ts            # re-export de los tipos de shared/movements + DayGroup
    transfers/            # feature #24: revisar las parejas de traspaso; la ÚNICA pantalla
                          # que escribe `transferId`
      components/         # TransferPairList, TransferPairRow, AmbiguousGroupList,
                          # AmbiguousGroupCard, UnlinkConfirmDialog, TransfersActionNotice;
                          # DoubtfulOwnershipList y DoubtfulOwnershipRow (la sección de los
                          # movimientos dudosos de dinero propio, una tarjeta por movimiento
                          # con `It's mine` y `Not mine`) y DoubtfulOwnershipCountBadge (el
                          # número de esos dudosos junto a `Transfers` en el menú, que monta
                          # AppSidebar) (#35)
      views/              # TransfersView (ruta /transfers, justo debajo de Rules); desde la
                          # #35 la sección de dudosos de dinero propio va arriba del todo
      store.ts            # useTransfersStore: las listas (cada una con su estado),
                          # la elección de cada grupo, el diálogo, el aviso y el deshacer;
                          # desde la #35 una tercera lista (los dudosos de dinero propio),
                          # `doubtfulCount` y `refreshDoubtfulCount` (el número del menú),
                          # `answerOwnership` y su deshacer
      service.ts          # GET /api/transfers, GET /api/transfers/ambiguous,
                          # POST /api/transfers (solo `movementIds`), DELETE /:transferId;
                          # desde la #35, `getDoubtfulOwnership` y `countDoubtfulOwnership`
                          # (GET /api/movements?ownership=doubtful, con pageSize 200 y 1) y
                          # `setOwnershipDecision` (PATCH /api/movements/:id con solo
                          # `ownershipDecision`)
      pairs.ts            # lo puro: la señal Bizum, la validación previa a enlazar y
                          # todos los textos, incluidos los de error (también los de los
                          # dudosos de dinero propio desde la #35)
      types.ts            # TransferPair, AmbiguousGroup, LinkChoice, Notice, Undo;
                          # OwnershipDecision y Gesture (#35)
    overview/             # feature #25: el mes de un vistazo (ruta /overview); SOLO LECTURA.
                          # Feature #26: debajo del mes, 24 meses, uno por fila
      components/         # MonthSentence, MonthFiguresGrid, UsualLine, UncategorizedLine (#25);
                          # PreviousMonths (el bloque `Month by month`) y PreviousMonthRow
                          # (una fila de su tabla) (#26)
      views/              # OverviewView (la URL es la única que escribe el mes; monta
                          # PreviousMonths como último hijo)
      store.ts            # useOverviewStore: el mes, lo leído en esta visita (por mes), la
                          # fecha del último dato y un estado de carga por grupo de lecturas;
                          # desde la #26, además, las filas de los 24 meses y la suma del
                          # periodo, cada una con su estado, y las lecturas que aún no han
                          # respondido (para no pedir dos veces el mismo mes)
      service.ts          # cuatro lecturas, las cuatro `GET /api/movements` con `pageSize=1`:
                          # las cifras del mes, el gasto sin categoría, la fecha del último
                          # dato y, desde la #26, las sumas de un rango de varios meses
      reading.ts          # lo puro de la #25: los doce meses anteriores, si el mes está
                          # incompleto, la mediana, la tasa, el veredicto y TODOS sus textos
      previousMonths.ts   # lo puro de la #26: qué 24 meses se enseñan, el rango que suma el
                          # backend, la escala de las barras, las filas y TODOS sus textos
      types.ts            # MonthFigures, Uncategorized, MonthState, Verdict, Comparison,
                          # LoadState (#25); PeriodTotals, NetSign, MonthRow (#26)
    monthly-cost/         # feature #32: lo que cuesta un mes (ruta /monthly-cost, justo debajo
                          # de Overview en el menú); SOLO LECTURA, una petición
      components/         # BillRow (una fila de recibo y, abierta, sus cargos), BillList (los
                          # recibos con cargos y el `<details>` de los que no tienen cargos en
                          # el periodo), GroupRow (una fila con nombre, cifra al mes y
                          # `Show charges`: el grupo de lo enviado a personas y cada categoría
                          # del gasto variable), ChargeList (la lista de cargos con su
                          # encabezado), BlockHeading (título del bloque y su subtotal)
      views/              # MonthlyCostView (qué filas están abiertas es estado de la vista:
                          # un `Set` con `bill:<key>`, `people` y `variable:<i>`)
      store.ts            # useMonthlyCostStore: `data`, `loadState`, `error` y `load()`, que
                          # nunca lanza y descarta la respuesta de una carga que ya no es la
                          # última; se llama al montar la vista y desde `Try again`
      service.ts          # GET /api/recurring-expenses (sin método ni cuerpo):
                          # `RECURRING_EXPENSES_PATH`, `parseRecurringExpenses` (valida, mapea y
                          # comprueba que los `monthlyCost` sumen `monthlyTotal`) y
                          # `getRecurringExpenses`
      texts.ts            # todo lo puro: todos los textos, el nombre de cada periodicidad, el
                          # cambio de un recibo en palabras, el reparto de los recibos con y sin
                          # cargos, los subtotales de cada bloque y si no hay nada que contar
      types.ts            # Charge, Bill, ChargeGroup, VariableEntry, MonthlyCost, LoadState
    own-accounts/         # feature #36: la tabla de tus cuentas propias y las formas de tu
                          # nombre (ruta /own-accounts, entrada `My accounts` justo debajo de
                          # Transfers en el menú); da de alta y cambia filas, nunca borra
      components/         # OwnAccountTable (una fila por cuenta, con `Edit`; sin botón de
                          # borrar), OwnAccountDialog (la ventana para dar de alta y para
                          # cambiar una fila), TextListField (una lista de campos de texto
                          # con `Remove` y un botón de añadir; la usan las dos ventanas),
                          # HolderNames (el bloque de las formas del nombre, encima de la
                          # tabla) y HolderNamesDialog (la ventana de las formas del nombre)
      views/              # OwnAccountsView (pide la tabla y las formas del nombre al montarse)
      store.ts            # useOwnAccountsStore: la tabla y las formas del nombre, cada una con
                          # su estado; qué ventana está abierta; `saveAccount` y `saveNames`,
                          # que tras guardar vuelven a pedir lo que cambió
      service.ts          # GET y POST /api/own-accounts, PATCH /api/own-accounts/:id,
                          # GET y PUT /api/own-accounts/holder-names; ningún DELETE
      texts.ts            # todo lo puro: cómo compara un texto el backend (`normalizeOwnText`),
                          # las comprobaciones de la ventana, el cuerpo del POST, lo que cambió
                          # de una fila para el PATCH, y todos los textos, incluidos los de error
      types.ts            # OwnAccountType, OwnAccount, OwnAccountDraft, NewOwnAccount,
                          # OwnAccountChanges, LoadState
  shared/                 # componentes/composables/utils reutilizables entre features
    components/           # AppShell, AppSidebar, AppTopBar, PlaceholderView (feature #8);
                          # BaseCard, BaseBadge, StatCard, ShareBar (feature #9);
                          # BaseButton, BaseSpinner, BaseDialog (feature #13);
                          # BaseInput, BaseSelect, BaseCheckbox (feature #15;
                          # BaseSelect.labelHidden y BaseCheckbox indeterminate/disabled/ariaLabel, #16;
                          # BaseInput.type admite 'month', #19);
                          # StickyBelowTopBar (feature #27): un `div` con `position: sticky`
                          # que deja lo que envuelve justo debajo de la barra superior
                          # cuando la página está bajada
    config.ts             # AppConfig tipada + loadConfig() + singleton appConfig (feature #2)
    errors.ts             # AppError y subtipos (ApiError.apiCode desde la #13), toAppError, formatError…
    validation.ts         # createValidators(context): guardas de respuestas de la API (feature #13)
    banks.ts              # bankLabel(slug): nombre legible de banco, lista abierta (feature #13)
    money.ts              # importes exactos y formato es-ES / en-GB (feature #9);
                          # `formatMoneyWhole`, euros enteros para una frase (feature #25);
                          # `formatClock`, la hora local `HH:MM` de una fecha (feature #30)
    categories.ts         # árbol de categorías: tipos, parseo y GET /api/categories (feature #17)
    movements.ts          # movimientos: tipos (con `MovementScope` y los parámetros
                          # `transfer` / `excluded` de la #23), parseo, GET /api/movements y la espera tras la
                          # última tecla (#18); y la escritura de uno solo —changesBody,
                          # patch, parseUpdatedMovement, updateMovement, MovementChanges y
                          # needsReload— desde la #21, y el PATCH en bloque desde la #22;
                          # desde la #31 lee `deposit` (obligatorio en GET /api/movements,
                          # ausente en las respuestas de los PATCH); desde la #34 lee
                          # `categorySource` (`manual`, `rule`, `closing` o `null`; ausente
                          # se lee como `null`) y `closingSourceLine` da el texto
                          # `Set when the import was closed` solo cuando es `closing`;
                          # desde la #35 lee `ownership` (obligatorio en GET /api/movements,
                          # ausente en las respuestas de los PATCH) y el parámetro
                          # `ownership=doubtful`
    deposits.ts           # lo puro de los movimientos de depósito (#31): qué esconde la
                          # casilla, si cuentan 0, sus textos y `withKnownDeposit`. Vive en
                          # shared/ porque lo usan `statement` y `review`, que no se importan
    ownership.ts          # lo puro del dinero entre tus cuentas (#35): qué es de entre tus
                          # cuentas y qué es dudoso (un movimiento de depósito no es ninguna
                          # de las dos), el texto junto a la cuenta en `Movements` y
                          # `withKnownOwnership`. Lo usa `statement`; vive en shared/ como
                          # deposits.ts
    transfers.ts          # las dos rutas de la API de traspasos (feature #24): las leen
                          # el extracto (recuento de dudosos, #23) y la pantalla Transfers
  services/
    http.ts               # cliente HTTP base: createHttp(config) + http (feature #2)
```

> El scaffold de ejemplo (`src/stores/counter.ts`) se retiró en el bootstrap.
> Un `src/stores/` global se reintroduciría solo para estado verdaderamente
> transversal (p. ej. sesión); lo demás va por feature.

> **La frase de la última acción se ve con la página bajada (feature #27).** En `Review`,
> `Movements` y `Transfers`, la línea que dice qué hizo la última acción, con su botón
> `Undo`, o por qué falló, va envuelta en `shared/components/StickyBelowTopBar.vue`. En
> `Review` envuelve también la línea de la regla recién creada (`RuleCreatedNotice`), que
> sigue sin salir a la vez que la otra. Desde la feature #33 esa línea ya no lleva el botón
> `Apply rules now`: dice cuántos movimientos movió crear la regla, y `Rules` la pinta
> también, dentro del mismo `StickyBelowTopBar`. Desde la feature #34 `Movements` también
> la pinta, en su `StickyBelowTopBar` y en lugar de `StatementActionNotice` mientras está,
> como `Review`; y en `Review` y en `Movements` la pregunta tras cambiar a mano la
> categoría de una fila (`OtherMovementsQuestion`) va en ese mismo `StickyBelowTopBar`,
> debajo de la línea de la última acción y de su `Undo`. Ese componente es un
> `div` con `position: sticky`, `top` igual al alto de la barra superior
> (`--topbar-h`), el fondo de la página (`bg-surface-app`, opaco) y el nivel
> `--z-sticky`: el mismo de la barra superior, por encima de las etiquetas de día del
> extracto y por debajo de los diálogos (`--z-modal`). Con la página arriba del todo está
> en el flujo, entre los mismos dos bloques que antes; con la página bajada se queda con
> su borde superior en el borde inferior de la barra superior. No tiene estado ni sabe qué
> envuelve: cada pantalla lo pinta con un `v-if` solo mientras hay algo que decir, porque
> con fondo opaco no puede existir vacío. En la feature #27, los cuatro componentes que
> envolvía (`ActionNotice`, `StatementActionNotice`, `TransfersActionNotice` y
> `RuleCreatedNotice`) siguieron siendo uno por pantalla, y **ningún** `store.ts`,
> `service.ts`, `actions.ts` ni `pairs.ts` cambió: qué hace cada acción y qué deshace
> el `Undo` es lo de antes.
> Recibe una prop opcional, `keepClearOf`: el selector CSS de la única fila sobre la que
> se acaba de actuar (`[data-movement-id="<id>"]`, atributo que llevan `MovementRow` y
> `StatementRow` desde esta feature). Al montarse, cada vez que esa prop cambia y cada vez
> que Vue vuelve a pintar lo que envuelve (`onUpdated`: una segunda acción sobre la misma
> fila cambia la frase pero no la prop), espera a que Vue actualice el DOM y a un
> `requestAnimationFrame`, y si la fila está en la página, empieza por encima del borde
> inferior del `div` y no queda entera por encima de él, sube la página esa diferencia,
> redondeada hacia arriba a píxeles enteros, con `window.scrollBy`. Se redondea porque
> las filas miden píxeles con decimales y Chromium deja la página en un píxel entero: sin
> redondear, la fila quedaba tapada menos de un píxel. Varias de esas causas en el mismo
> instante dan una sola medida. No escucha el evento `scroll`. La prop es estado de la vista, no del store: `ReviewView` la escribe al
> confirmar una fila, al cambiarle la categoría y al abrir desde ella el diálogo de regla;
> `StatementView`, al cambiar la categoría de una línea y al abrir desde ella el diálogo
> de regla. Las dos la ponen a `null` en las acciones sobre varias filas.
> `TransfersView` no la pasa: enlazar y desenlazar quitan de su lista lo que se tocó. El
> botón `Undo` de los tres avisos es la palabra sola en la
> variante `secondary` de `BaseButton`, sin icono.
>
> **El mes de un vistazo solo lee, y calcula una única cifra (feature #25).**
> `features/overview/` no manda ni un `POST`, `PATCH` o `DELETE`: sus cuatro lecturas son
> `GET /api/movements` (`service.ts` no acepta método ni cuerpo; eran tres hasta la
> feature #26, que añadió la del rango de varios meses). Las cifras del mes salen
> de **la misma petición que hace el extracto** (`from`, `to`, sin filtros), así que
> cuadran con `/movements` por construcción. **La mediana de los meses anteriores es la
> única cifra que calcula el cliente** (`medianAmount` en `reading.ts`, en céntimos
> `bigint`): no hay endpoint que la dé. Lo demás sale de dos cifras del backend (la tasa,
> el porcentaje sin categoría, la diferencia con la mediana); nunca se suman movimientos.
> «Incompleto» se decide sin reloj: el movimiento más reciente de toda la base es anterior
> al último día del mes. Lo leído vive en el store durante una visita (`figuresByMonth`) y
> se tira al entrar en la pantalla y al terminar una importación.
> Dependencias, las dos en un solo sentido: `overview` → `statement` (monta `MonthNav` y
> usa las funciones del mes de `months.ts`, sin tocar ni un archivo suyo; `statement` no
> conoce `overview`) e `import` → `overview` (una llamada a `refreshIfLoaded` tras cada
> importación, igual que `import` → `net-worth`). `shared/money.ts` gana
> `formatMoneyWhole` (euros enteros, solo para la frase).
>
> **Debajo del mes, 24 meses que no suman nada en el cliente (feature #26).** El bloque
> `Month by month` de `/overview` enseña siempre los 24 meses naturales que terminan en el
> mes de la fecha del último dato: no dependen del mes de `?month=` ni del reloj, así que
> pulsar un mes solo cambia cuál está marcado. Cada fila pinta el **mismo objeto** de
> `figuresByMonth` que pinta la parte del mes cuando ese mes está arriba; por eso las
> cifras coinciden por construcción, y cada mes se pide **una sola vez por visita** aunque
> lo pidan las dos partes a la vez (el store guarda las lecturas que todavía no han
> respondido y se las da a quien llegue después). **Lo ahorrado en el periodo lo suma el
> backend**, en una petición con `from` = día 1 del mes más antiguo y `to` = último día
> del último mes completo: es la cuarta lectura. **La mediana sigue siendo la única cifra
> que calcula el cliente**; la aritmética de este bloque (`previousMonths.ts`, en céntimos
> `bigint`) se queda en elegir la cifra más alta de los meses completos, dividir cada
> cifra entre ella para el ancho de su barra y cambiar el signo del neto en la frase. Un
> mes incompleto no lleva barras ni entra en la escala ni en la suma. Si falla un mes no
> se pinta ninguna fila; si falla la suma, las filas siguen y no se sustituye por una suma
> hecha aquí. Entrar a un mes completo pasa de 15 a 27 peticiones (11 meses que la parte
> del mes no pedía y 1 del periodo); después, ir a un mes cuyos doce anteriores están
> entre los 24 cuesta 1. `store.loadPreviousMonths` no forma parte de `show`: la vista la
> llama al montarse, después de pedir el mes de arriba, y `refreshIfLoaded` la repite tras
> una importación si el bloque se había leído. `reading.ts`, los cuatro componentes de la
> #25, `features/statement/` y `features/import/` no cambian.
>
> **Lo que cuesta un mes solo lee, y solo suma los subtotales de cada bloque (feature
> #32).** `features/monthly-cost/` hace una sola petición, `GET /api/recurring-expenses`,
> cada vez que se entra en la pantalla y al pulsar `Try again`; `getRecurringExpenses` no
> acepta método ni cuerpo, así que no hay forma de escribir desde ella. Todas las cifras
> son del backend: la de arriba (`monthlyTotal`), lo que cuesta al mes cada recibo, el
> grupo de lo enviado a personas y cada categoría del gasto variable, y el cambio de cada
> recibo. La única aritmética del cliente son los subtotales de los tres bloques
> (`blockSubtotals` en `texts.ts`), sumas en céntimos con `sumAmounts` de cifras que el
> backend ya mandó redondeadas. Para que esas sumas no puedan contradecir la cifra de
> arriba, `parseRecurringExpenses` rechaza con `ValidationError` una respuesta cuyos
> `monthlyCost` no sumen `monthlyTotal`, y la pantalla lo dice en vez de enseñarla. Los
> recibos se pintan en el orden en que llegan (el backend ya los ordena de más caro a más
> barato al mes); no se reordena en el cliente. No pinta la cuenta de cada cargo (haría
> falta una segunda petición) ni recarga tras una importación: se vuelve a leer al entrar.
> No importa código de ninguna otra feature salvo `features/statement/months.ts`
> (`formatMonthLabel`, y el tipo `MonthKey`); de `features/net-worth/types.ts` toma solo
> los tipos `DecimalString` y `DateOnly`, como las demás. Ninguna feature importa de ella;
> el router la monta.
>
> **La tabla de tus cuentas propias escribe solo en su tabla (feature #36).**
> `features/own-accounts/` manda tres escrituras y ninguna más: `POST /api/own-accounts`
> (dar de alta una fila, con `name`, `bank`, `type` y solo los demás campos que estén
> rellenos), `PATCH /api/own-accounts/:id` (solo los campos que difieren de la fila; `texts`
> viaja entera si cambió cualquiera de sus textos) y `PUT /api/own-accounts/holder-names`
> (la lista entera de las formas del nombre). Nunca `DELETE`: el contrato no lo tiene, y
> una fila que ya no sirve se deja sin textos. Antes de mandar, la ventana no deja guardar
> lo que el backend rechazaría con 400. Tras guardar una fila **se vuelve a pedir la tabla
> entera** en vez de insertar la respuesta, para que salga en el orden del backend y con
> los textos como él los guardó; tras un fallo que pudo haber escrito (todo salvo el 400)
> también. **No avisa a ninguna otra pantalla**: cambiar la tabla o las formas del nombre
> cambia qué movimientos cuentan en `Movements`, `Review`, `Overview`, `Monthly cost` y
> `Transfers`, y todas ellas vuelven a pedir sus datos cada vez que se entra. No importa
> código de ninguna otra feature (de `features/net-worth/types.ts` toma solo `DateOnly`,
> como las demás) ni ninguna importa de ella; el router la monta.
>
> **La pantalla que escribe `transferId` (feature #24).** `features/transfers/` es el
> único sitio de la app que enlaza y desenlaza parejas de traspaso, y hasta la feature
> #35 **no escribía nada más**: `POST /api/transfers` con un cuerpo cuyo único campo es
> `movementIds` (`linkMovements` recibe dos números y escribe el literal) y
> `DELETE /api/transfers/:transferId`. Ningún `PATCH`: ni importes, ni categorías, ni
> `status`, ni `excludedFromTotals`. Tras cada escritura se vuelven a pedir las listas
> en vez de parchearlas, porque los grupos dudosos los calcula el backend en cada
> petición. **Desde la feature #35** escribe además una cosa: la respuesta del humano a
> un movimiento dudoso de dinero propio, con `PATCH /api/movements/:id` y un cuerpo cuyo
> único campo es `ownershipDecision` (`mine`, `not_mine` o `null` para deshacer), escrito
> literal en `setOwnershipDecision` y nunca en bloque. Las escrituras vuelven a pedir las
> tres listas (los grupos dudosos, las parejas y los dudosos de dinero propio). No importa de ninguna otra feature ni ninguna importa de ella: el aviso con
> `Undo` y el diálogo de confirmación están **copiados** del extracto, y lo único
> compartido son las dos rutas de `shared/transfers.ts`, que `statement/service.ts`
> re-exporta con el nombre que ya tenía. (Desde la feature #27 el aviso sigue copiado,
> pero lo que lo deja a la vista con la página bajada es común:
> `shared/components/StickyBelowTopBar.vue`.)
>
> **El interruptor del ruido no escribe (feature #23).** Es de **solo lectura**: cambia
> la pregunta que se le hace a `GET /api/movements` —`excluded=none` y `transfer=none`
> juntos, un solo interruptor— y nada más. Esconder se hace en el servidor, nunca
> filtrando aquí la lista ya descargada, para que `pagination.total`, el `Load more` y
> las tres cifras sigan siendo del backend. Lo escondido se dice **en número** (la resta
> de dos `pagination.total`) y **nunca en importe**: con `excluded=only` o
> `transfer=only` el contrato devuelve los tres `totals` a `"0.00"` por construcción, así
> que el importe no existe en ninguna respuesta y calcularlo aquí sería justo la
> aritmética inventada que esta pantalla lleva cinco features evitando.
>
> **La excepción de los movimientos de depósito (feature #31).** El backend no tiene
> filtro por depósito, así que, con la casilla puesta, las aperturas y cancelaciones de
> depósito (las que suman 0 según `deposit`) se quitan **en el navegador** de lo ya
> cargado (`hiddenWhenHiding` de `shared/deposits.ts`). Se cuentan en número, nunca en
> importe: `hiddenInBrowser` se suma al `Hiding` y se resta de `pagination.total` para el
> número de movimientos, la lista vacía y `Showing x of y`. Las tres cifras siguen siendo
> las del backend tal cual. Límite: con más de 200 movimientos en un mes, lo de las
> páginas aún no cargadas no se resta hasta `Load more`.
>
> **Lo de entre tus cuentas (feature #35).** El backend tampoco tiene filtro para los
> movimientos entre tus cuentas (`ownership.status` `own` o `mine`), así que la casilla
> los quita también **en el navegador**, con la misma cuenta y el mismo límite que los
> depósitos: `isBetweenOwnAccounts` de `shared/ownership.ts` se suma a
> `hiddenWhenHiding` en el store. Un movimiento de depósito no entra (manda lo de la #31)
> y un dudoso tampoco, porque cuenta.
>
> **Lo que el extracto escribe, y nada más.** Nació de solo lectura (feature #19). Desde
> la #21 manda `PATCH /api/movements/:id` con **solo** `categoryId`, y desde la #22
> `PATCH /api/movements` con **solo** `ids` y `excludedFromTotals`. Ni `POST` ni
> `DELETE`. Cada cuerpo se construye en un único sitio —`setMovementCategory` y
> `setMovementsExcluded`, los dos en `statement/service.ts`—, así que el `status` no
> puede viajar ni por descuido: importa más aquí que en la cola, porque el extracto
> enseña también los confirmados. La escritura de un movimiento (`changesBody`, `patch`,
> `parseUpdatedMovement`, `updateMovement`, `MovementChanges` y `needsReload`) vive en
> `shared/movements.ts` desde la #21, junto a la de lectura, y el `PATCH` en bloque bajó
> ahí desde la #22: lo usan la cola y el extracto.
>
> **Y desde la feature #21 tiene una dependencia, en el mismo sentido que ya existía:**
> `statement/views/StatementView.vue` monta `RuleDialog` de `category-rules`, igual que
> lo hace `ReviewView`. Es `statement` → `category-rules`; `category-rules` sigue sin
> conocer a nadie, así que no aparece ningún ciclo. Desde la feature #33,
> `statement/store.ts` además **observa** `applyRun` del store de reglas, igual que
> `review/store.ts`, y vuelve a pedir el mes en pantalla cuando sube (crear o cambiar una
> regla mueve movimientos, y aplicar las reglas también); el sentido sigue siendo el mismo. De `review` **no importa nada** (ni
> `review` de él): lo que las dos pantallas comparten sale de `shared/`, y lo que es
> vocabulario de una pantalla (la fila, el selector de la fila, el aviso de deshacer)
> está **copiado** a propósito —`StatementRow`, `RowCategoryEditor`,
> `StatementActionNotice`— para no atar dos pantallas por cuatro `v-if`. El único que
> monta su vista sigue siendo el router, en `/movements`. Desde la feature #27 el aviso
> de deshacer sigue copiado; lo que lo deja a la vista con la página bajada no es
> vocabulario de ninguna pantalla y vive en `shared/components/StickyBelowTopBar.vue`.

> **Dependencias nuevas de la feature #15.** `AppSidebar.vue` (shared) monta
> `ReviewCountBadge` de `features/review`, igual que `AppShell` monta `ImportButton`.
> Y `import/store.ts` refresca el recuento de pendientes tras cada importación
> (`import` → `review`, un solo sentido; `review` no conoce `import`). **La feature #35
> repite las dos con `transfers`:** `AppSidebar.vue` pinta un segundo número, el de los
> movimientos dudosos de dinero propio, montando `DoubtfulOwnershipCountBadge` de
> `features/transfers` junto a la entrada `Transfers` (con `TRANSFERS_ROUTE_NAME` local
> en `AppSidebar.vue`), y `import/store.ts`, que ya volvía a pedir las listas de
> `Transfers` tras importar, refresca también ese número (`import` → `transfers`, un solo
> sentido; `transfers` no conoce `import`).

> **La pantalla ya escribe (feature #16).** `features/review/` dejó de ser de solo
> lectura: `service.ts` manda `PATCH /api/movements/:id` y `PATCH /api/movements` con
> cuerpos construidos campo a campo (solo `ids`, `categoryId` y `status`). Es la
> primera pantalla que escribe en la base de datos; el hecho bancario —importe, fecha,
> descripción— sigue sin poder tocarse.

> Revisado el 2026-10-13 por la feature 30 `rules-applied-result`: la respuesta de
> `POST /api/category-rules/apply` trae la lista de lo que categorizó y lo que hizo la
> última aplicación se queda a la vista en `Rules` y en `Review` (última frase del párrafo).
>
> **La pantalla de reglas y su sentido de dependencia (feature #17).** `review` monta
> los componentes de `category-rules` (el diálogo de nueva regla, el aviso y el de
> aplicar) y su store **observa** `applyRun` del store de reglas para refrescar la cola
> tras cada pasada. El sentido es único, `review` → `category-rules`: la feature de
> reglas no importa nada de `review` ni de `import` (lo contrario cerraría un ciclo).
> Por eso las categorías, que necesitan las dos, viven ahora en `shared/categories.ts`;
> `review/types.ts` y `review/service.ts` las re-exportan. **La feature #18 repite la
> jugada con la lectura de movimientos**: la previsualización del diálogo de regla
> necesita `GET /api/movements`, que vivía en `review/service.ts`, así que la mitad de
> **solo lectura** (tipos, `buildMovementsQuery`, `parseMovementPage`, `getMovements` y
> `SEARCH_DEBOUNCE_MS`) se mueve a `shared/movements.ts` y `review/{types,service,filters}.ts`
> la re-exportan con el mismo nombre; los dos `PATCH` que escriben se quedan en
> `review/service.ts`, que entonces era la única pantalla que escribe movimientos (después
> los escriben también `Movements`, desde la #21, y `Transfers`, desde la #35). El frontend no
> escribe nada sobre ningún movimiento al crear una regla, pero **desde la feature #33**
> (feature 60 del backend) el `POST` y el `PATCH` de una regla hacen que el backend pase las
> reglas y la respuesta trae `categorization`, con la misma forma que la de aplicar: el
> store la guarda en `lastApply` (con `cause` `create` o `update` y la regla) y sube
> `applyRun`. La escritura en masa que se pide a mano es `POST /api/category-rules/apply`,
> y siempre pasa por una confirmación. **Desde la feature
> #30** la respuesta de esa petición trae la lista de los movimientos que categorizó
> (`categorizedMovements`, tantos como `categorized`; si no cuadra, la respuesta se trata
> como ilegible), el store de reglas la guarda **solo en memoria** como resultado de la
> última aplicación (`lastApply`, con la hora; se borra con `Dismiss`, al confirmar otra
> aplicación y al recargar la página) y `Rules` y `Review` la enseñan con el mismo
> componente, `category-rules/components/LastApplyReport.vue`, que no lee ningún store.
> Aplicar sigue costando una sola petición. `Review` lo monta fuera de
> `StickyBelowTopBar`, y el sentido de la dependencia sigue siendo `review` →
> `category-rules`.

> **Dependencias entre features y con `shared/` (features #13-#14).** `AppShell.vue`
> (shared) monta `ImportButton` de `features/import`, igual que el router monta
> `NetWorthView`. Entre features las dependencias van en un solo sentido,
> `import` → `net-worth`, y son dos: el store de `import` recarga el de
> `net-worth` tras importar (solo si ya estaba cargado, #13), y `details.ts` usa
> `holdingTypeLabel` de `net-worth/issues.ts` para nombrar el tipo de producto
> (#14). `net-worth` no conoce `import`. Si una tercera pieza hiciera falta en
> las dos, se mueve a `shared/`.

## Flujo de datos

```
  vista (.vue) ──► composable (useXxx) ──► store (Pinia) ──► service ──► HTTP ──► API backend
       ▲                                      │                                     │
       └──────────── render reactivo ◄────────┴──────── mapea respuesta ◄───────────┘
```

- La **vista** monta y muestra; delega acciones en un composable o en el store.
- El **store** mantiene el estado (lista de gastos, filtros, loading, error) y
  llama al service.
- El **service** construye la request, llama a `services/http.ts`, y **mapea**
  la respuesta de la API a los tipos del frontend antes de devolverla.
- El estado reactivo de Pinia vuelve a la vista.

## Decisiones de arquitectura (ADRs)

> Las ADRs recogen decisiones de arquitectura ya tomadas. Añade una nueva
> cuando tomes una decisión que quieras dejar registrada.

### ADR-001: Organización por feature

- **Fecha:** 2026-07-08
- **Estado:** aceptada
- **Contexto:** app pequeña pero con varias áreas (gastos, ingresos,
  dashboards) que crecerán.
- **Decisión:** organizar `src/features/<feature>/` en vez de
  carpetas por tipo técnico.
- **Alternativas:** estructura plana por tipo (`components/`, `stores/`,
  `services/`) — más simple al inicio, peor a escala.
- **Consecuencias:** cada feature es autocontenida; el scaffold por defecto
  (`src/stores/`) se reserva para estado transversal.

### ADR-002: Capa de acceso a la API aislada

- **Fecha:** 2026-07-08
- **Estado:** aceptada
- **Contexto:** el frontend consume la API del backend hermano y no comparte
  tipos con él.
- **Decisión:** un cliente HTTP base en `services/http.ts` + un
  `service.ts` por feature que mapea la respuesta a tipos propios.
- **Alternativas:** `fetch` disperso por componentes (rechazado: acopla UI y
  transporte); instalar axios (pendiente de decidir; hoy no hay cliente HTTP).
- **Consecuencias:** un solo punto donde tocar baseURL, headers y manejo de
  error de red.

### ADR-003: Manejo de errores centralizado (jerarquía + manejador global)

- **Fecha:** 2026-07-10 (feature #2, `fundamentos`)
- **Estado:** aceptada
- **Contexto:** cada feature necesita reportar errores con un formato
  consistente en toda la app, sin `console.log` disperso.
- **Decisión:** jerarquía en `src/shared/errors.ts` según el patrón de
  `docs/conventions.md`: `AppError extends Error` con `code: string`;
  subtipos `ConfigError` (`CONFIG_INVALID`), `ApiError` (`API_HTTP` /
  `API_NETWORK`, con `status`) y `ValidationError` (`VALIDATION`). Un
  normalizador `toAppError(unknown) → AppError` (código `UNKNOWN` para
  valores ajenos, preservando `cause`) y un manejador global
  `handleGlobalError` registrado en `app.config.errorHandler` (mecanismo
  oficial de Vue 3). Formato único de reporte: `[<code>] <message>`, con
  `console.error` como único sink (sustituible por toast/telemetría).
- **Alternativas:** plugin de Vue (`app.use(errorPlugin)`) — descartado:
  misma capacidad con más ceremonia y sin estado que instalar.
- **Consecuencias:** la capa `services/` lanza siempre `ApiError`; los errores
  no capturados de componentes pasan por un único punto con formato
  consistente. `ValidationError` queda definido para la futura validación de
  datos de la API.

### ADR-004: Validación manual de configuración (sin librería de schemas)

- **Fecha:** 2026-07-10 (feature #2, `fundamentos`)
- **Estado:** aceptada (revisar al consumir el primer endpoint de la API)
- **Contexto:** la configuración por entorno (`VITE_API_URL`) debe validarse
  al arrancar, fail-fast y con mensaje claro.
- **Decisión:** validación a mano en `src/shared/config.ts`: `loadConfig(raw)`
  pura (testable con entornos inyectados) que valida presencia y URL
  parseable, lanza `ConfigError` listando todas las variables inválidas, y un
  singleton congelado `appConfig` evaluado al importar el módulo — `main.ts`
  lo importa antes de `mount`, así un entorno inválido impide el arranque.
- **Alternativas:** Zod (u otra librería de schemas) — descartada *por ahora*:
  dependencia nueva y peso en bundle para validar una sola variable; su
  beneficio real (schemas declarativos + tipos inferidos) aparece al validar
  respuestas de la API, que aún no se consumen. **Revisar esta decisión
  cuando la primera feature consuma la API.**
- **Consecuencias:** cero dependencias nuevas; el fallo de configuración
  ocurre en el arranque, no en mitad de una interacción.

## Qué NO hacer

- **No llamar a `fetch` / la API desde un componente `.vue`.** Pasa por un
  composable/store y la capa `services/`.
- **No devolver el JSON crudo del backend a la UI.** Mapéalo a los tipos del
  frontend en `services/`.
- **No mezclar lógica de negocio con presentación.** Si un `.vue` crece en
  lógica, extráela a un composable.
- **No usar `console.log` para errores.** Define un manejo de error
  consistente (ver `docs/conventions.md`).
- **No añadir librerías nuevas** (cliente HTTP, validación, UI kit) sin
  discutir el trade-off primero y anotarlo en `docs/stack.md`; si bloquea,
  cambia el status a `blocked` en `feature_list.json`.
