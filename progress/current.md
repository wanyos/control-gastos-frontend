# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

- **Feature en curso:** 19 — statement-by-month (implementación)
- **Inicio:** 2026-09-26
- **Agente:** leader (Claude Code) → implementer

## Plan

El extracto mes a mes (F19): las tasks T0–T17 de
`specs/19-statement-by-month/tasks.md` en orden. La **T18 no es del implementer**
(comprobación con el humano delante, de solo lectura). Pantalla de **solo lectura**:
ninguna petición suya escribe, y ninguna llamada real sale a `:3000` en los tests.

## Plan anterior (F18, implementada)

Previsualización de una regla antes de guardarla (F18): las tasks T0–T17 de
`specs/18-rule-match-preview/tasks.md`.

## Plan anterior (F17, cerrada)

Reglas de categorización (F17): crear una regla desde una fila de Review, verlas,
cambiarlas y borrarlas en la pantalla nueva `Rules`, y pasarlas sobre lo pendiente
con `POST /api/category-rules/apply` bajo confirmación. Las tasks T0–T21 de
`specs/17-category-rules/tasks.md`; la T22 (backend real) queda para el humano.

## Bitácora

- 2026-09-20 — F15 cerrada tras superar la prueba contra el backend real. Roadmap
  E6 a medias e historial al día. Se lanza el spec_author de la F16.
- 2026-09-20 — Spec de la F16 escrito (`specs/16-review-actions/`, 14 requisitos y
  6 decisiones 🔴); feature en `spec_ready`, a la espera de la puerta humana.

- 2026-09-20 — Spec de la F16 aprobado por el humano tal cual (6 🔴: selección
  por página que se suelta al cambiar de filtro, categorizar y confirmar como
  gestos distintos, confirmación a partir de 20, la fila desaparece al
  confirmar, Undo sin cuenta atrás, y filtrado previo de los no elegibles).
  F16 pasa a `in_progress`.
- 2026-09-20 — Acordado con el humano: **después de la F16 se redacta una feature
  de reglas de categorización** (crear regla desde un movimiento, listarlas,
  borrarlas y aplicarlas con `POST /api/category-rules/apply`). Motivo:
  categorizar un movimiento no enseña nada al sistema; lo que se hereda entre
  importaciones son las reglas. El backend ya tiene los endpoints.

- 2026-09-20 — implementer arranca la F16. Plan: las tasks T0..T21 de
  `specs/16-review-actions/tasks.md`. T0 cerrado sin sorpresas: iconos `Check`,
  `Undo2` y `Tag` existen en `@lucide/vue` 1.45.0, y `--brand on --surface-sunken`
  mide 7,44:1 (umbral 3), así que no hace falta el plan B del borde izquierdo.

- 2026-09-20 — F16 implementada: T0.1–T20 de `tasks.md` en `[x]`, 14 requisitos
  con test, +102 tests unitarios (793 en total) y 4 escenarios e2e nuevos con
  todas las llamadas interceptadas. Puerta completa en verde (`type-check`,
  `lint`, `test:unit`, `build`, `./init.sh`, e2e chromium). **T21 pendiente**:
  la comprobación contra el backend real de `:3000` necesita el visto bueno del
  humano y no se hizo (ningún `PATCH` salió de los mocks). Informe en
  `progress/implementation/review-actions.md`. Falta el reviewer.

- 2026-09-22 — reviewer aprueba la F16 sin cambios (793 tests, 12 e2e, build e
  init.sh verificados por él; las 6 🔴 tal cual; la repetición del selector de
  categoría aceptada como maquetado, no lógica).
- 2026-09-22 — **T21 hecha** con el visto bueno del humano, contra el backend real
  y pulsando en la interfaz (Playwright sin interceptar), sobre un solo movimiento:
  42368 (IBERDROLA, 96,29 €, pendiente, Suministros). Categorizar a Vivienda → Undo
  → vuelve a Suministros; Confirm → la fila sale y la cola baja de 1607 a 1606 →
  Undo → vuelve a pendiente y a 1607. Antes/después idénticos salvo `updatedAt`.
  4 PATCH, solo `categoryId`/`status`/`ids`; cero errores de consola.
- 2026-09-22 — F16 en `done` (implementer; init.sh verde). F15 y F16 en un solo
  commit (f427175): la F16 amplió los mismos archivos que creó la F15 sin
  commitear, así que partirlo no daba dos estados reales. Feature de reglas: a la
  espera del `intent` del humano (se le pasó un borrador).
- 2026-09-22 — Spec de la F17 escrito (`specs/17-category-rules/`, 14 requisitos y
  6 decisiones 🔴: pantalla `Rules` propia, texto propuesto = primera palabra con
  sentido, aplicar como gesto aparte, confirmación siempre, la regla no categoriza su
  movimiento, todos los conflictos a la vista); feature en `spec_ready`, a la espera
  de la puerta humana.
- 2026-09-22 — El humano aprueba el spec de la F17 tal cual, las 6 🔴 incluidas
  (pantalla propia Rules, texto propuesto por palabra con sentido, aplicar aparte
  y con confirmación, no categorizar el movimiento de origen, todos los
  conflictos). F17 pasa a `in_progress`.

- 2026-09-22 — implementer arranca la F17. Plan: las tasks T0..T21 de
  `specs/17-category-rules/tasks.md` (la T22, contra el backend real, queda fuera:
  necesita el visto bueno del humano). T0 cerrado sin sorpresas: `http.ts` manda un
  `POST` con `init = { method: 'POST' }` sin `Content-Type` y devuelve `undefined`
  en un 204; un `watch` de un store de Pinia sobre un ref de otro se dispara en los
  tests (no hace falta `$onAction`); la normalización copia la del backend (`Café` →
  `cafe`, espacios interiores intactos); y las parejas de color de §9 ya tienen su
  línea `contrast:` (no se toca `theme-dark.css`).
- 2026-09-22 — T1: las categorías (`Category`, `CategoryKind`, `parseCategories`,
  `getCategories`, `CATEGORIES_PATH`) se mueven a `src/shared/categories.ts`;
  `review/types.ts` y `review/service.ts` las re-exportan y la suite de `review`
  pasa sin tocarla (229 tests).

- 2026-09-22 — F17 implementada: T0–T21 de `tasks.md` en `[x]`, 14 requisitos con
  test, +108 tests unitarios (901 en total) y 4 escenarios e2e nuevos con todas las
  llamadas interceptadas y red de seguridad. Pantalla `Rules` en `/rules`, botón
  `Create rule` en la fila de Review, aviso con `Apply rules now` y diálogo de
  aplicar con confirmación siempre. Las categorías viven ahora en
  `src/shared/categories.ts` (las usan `review` y `category-rules`); el sentido de
  dependencia es único, `review` → `category-rules`. Puerta completa en verde
  (`type-check`, `lint`, `test:unit`, `build`, e2e chromium, `./init.sh`).
  **Una desviación documentada**: `isMatchTextTooShort('á b')` es `false`, no `true`
  como decía la nota de verificación de R4 — el backend cuenta los espacios
  interiores del texto normalizado y lo acepta; se eligió la paridad con el contrato
  (detalle en el informe). **T22 pendiente**: la prueba contra el backend real de
  `:3000` necesita el visto bueno del humano y no se hizo (ninguna petición salió de
  los mocks). Informe en `progress/implementation/category-rules.md`. Falta el reviewer.
- 2026-09-22 — reviewer aprueba la F17 sin cambios (901 tests, 16 e2e, puerta
  repetida por él). Corregido el ejemplo de la nota de R4 en requirements.md.
- 2026-09-22 — **T22 hecha** con el visto bueno del humano («aplicar y dejar lo que
  salga»). Regla `tulotero` → Ocio creada desde la fila de Review y aplicada desde
  el aviso: la pantalla dijo «5 movements categorized · 1372 still without a
  matching rule · 1 conflict» y la API confirma exactamente esos 5 (TULOTERO,
  ids 21750, 33099, 33260, 33371 y 42521). Cero errores de consola; solo dos
  escrituras: POST /api/category-rules y POST /api/category-rules/apply sin body.
  Antes, probando, se creó la regla `mega` (propuesta por defecto), se corrigió a
  `mega deportes` desde Rules (PATCH) y una llamada directa a apply categorizó el
  movimiento 42520 como Salud y deporte. Estado final: 63 reglas, 1.373 pendientes
  sin categoría.
- 2026-09-22 — Dos cosas para decidir: (1) el texto propuesto puede quedar
  demasiado corto (`mega` casaba también con ACADEMIA OMEGA); (2) `data-test` no
  llega a BaseDialog (raíz Teleport, Vue avisa) y el test que comprueba
  `rule-dialog` en RulesView.spec.ts:96 pasa siempre.
- 2026-09-22 — Las dos corregidas (encargo acotado, sin reabrir la feature ni tocar
  las 6 🔴): (1) `proposeMatchText` alarga la propuesta con las palabras siguientes
  del concepto, cortando verbatim, mientras no llegue a `MIN_PROPOSAL_LENGTH = 6`
  («MEGA DEPORTES» → `mega deportes`, `iberdrola` igual que antes); R2 y design §6
  actualizados con la nota de T22. (2) `BaseDialog` pasa a `inheritAttrs: false` y
  lleva los atributos al panel `role="dialog"`: el aviso de Vue desaparece y el
  `data-test` del llamante llega al DOM; `RulesView.spec.ts` prueba ahora las dos
  caras (abierto y cerrado) y `RuleDialog.spec.ts` + el e2e del 409 nombran el
  diálogo concreto. Puerta completa verde: 905 tests, 16 e2e, build e `init.sh`.
- 2026-09-22 — Correcciones hechas y puerta repetida por el leader (init.sh:
  «Entorno listo»). F17 en `done`, E6 cerrada, entrada de historial escrita.
- 2026-09-23 — Higiene (sin feature, sin dependencias): (1) `pnpm format` pasa de
  cubrir solo `src/` a una lista explícita de rutas de código (`src/`, `e2e/`,
  configs de raíz, `index.html`, `tsconfig*.json`, `.oxlintrc.json`); reformateó
  `e2e/category-rules.spec.ts`, `index.html`, `playwright.config.ts`,
  `tsconfig.node.json` y `vite.config.ts`. Se deja fuera a propósito el estado del
  harness (`feature_list.json`, `progress/`, `specs/`, `docs/`). (2) `e2e/app-boot.spec.ts`
  estrena la red de seguridad `page.route('**/api/**', route => route.abort())`
  como el resto de specs: **no apareció ninguna llamada nueva**, sus tres rutas ya
  cubrían todo. Comprobado que la red no es decorativa: quitando `**/api/movements*`
  el smoke se pone rojo por la llamada abortada, no por el 502 del proxy. `docs/stack.md`
  gana una sección *Formato (Prettier)* y la convención de red de seguridad en e2e.
  Puerta completa verde: type-check, lint, 905 tests, build, 16 e2e chromium e `init.sh`.

- 2026-09-24 — Spec de la F18 escrito (`specs/18-rule-match-preview/`, 15 requisitos y
  5 decisiones 🔴: aviso de «demasiado amplio» por encima de 50 movimientos sin
  bloquear el guardado, 5 ejemplos —los más recientes— dentro del diálogo, 350 ms
  desde la última tecla reutilizando la espera de Review, propuesta de texto que crece
  mientras la última palabra sea genérica (`servicios selecta`, `juan jose romero`,
  `amazon`) sin tocar `iberdrola`/`mercadona`/`mega deportes`/`tulotero`, y consulta
  fallida que avisa sin impedir guardar). Feature en `spec_ready`, a la espera de la
  puerta humana.

- 2026-09-24 — El humano aprueba el spec de la F18 tal cual, las 5 🔴 incluidas
  (aviso a partir de 50, 5 ejemplos recientes en el diálogo, 350 ms de espera,
  propuesta que crece ante palabras genéricas y de canal, y fallo del recuento que
  no bloquea el guardado). F18 pasa a `in_progress`.

- 2026-09-24 — implementer arranca la F18. T0 cerrado sin sorpresas: las parejas de
  color ya tienen su linea `contrast:` en `theme-dark.css` (no se toca el tema),
  `buildMovementsQuery` admite `type` y `uncategorized=true` juntos, y el temporizador
  de `ReviewFilterBar` se reproduce en `RuleDialog` con `vi.useFakeTimers()`.
- 2026-09-24 — T1/T2: la mitad de **solo lectura** de los movimientos (tipos,
  `buildMovementsQuery`, `parseMovementPage`, `getMovements`, `SEARCH_DEBOUNCE_MS`) se
  mueve a `src/shared/movements.ts`; `review/{types,service,filters}.ts` la re-exportan
  y la suite de `review` pasa sin tocarla (236 tests). Los dos `PATCH` se quedan en
  `review/service.ts`.
- 2026-09-24 — F18 implementada: **T0-T17 en `[x]`**, 15 requisitos con test,
  +68 tests unitarios (973 en total) y un escenario e2e nuevo (17 en chromium) con
  todas las llamadas interceptadas y la red de seguridad. Las 5 🔴 tal cual: aviso a
  partir de 50 sin bloquear el guardado, 5 ejemplos recientes dentro del dialogo,
  350 ms reutilizando la espera de Review, propuesta que crece ante palabras genericas
  y de canal (`servicios selecta`, `juan jose romero`, `amazon`; `iberdrola`,
  `mercadona`, `mega deportes` y `tulotero` fijados como regresion), y fallo del
  recuento que avisa sin impedir guardar. Puerta completa verde (`type-check`, `lint`,
  973 tests, `build`, e2e chromium e `./init.sh`). **Una desviacion documentada**: en
  `RulesView.spec.ts` la asercion «cambiar una regla no toca ningun movimiento» pasa de
  medir la ruta a medir el metodo (`wroteMovements()`), porque ahora el dialogo **lee**
  `GET /api/movements` para contar; ningun otro test de F15/F16/F17 cambio.
  **T18 pendiente**: es la comprobacion con el humano delante, de solo lectura.
  Informe en `progress/implementation/rule-match-preview.md`. Falta el reviewer.

- 2026-09-24 — reviewer aprueba la F18 sin cambios (973 tests, 17 e2e, puerta
  repetida por él).
- 2026-09-24 — **T18 hecha** con el humano delante, solo lectura: 14 conceptos
  reales en el diálogo, cero escrituras y cero errores de consola. Lo que dice la
  pantalla coincide con la API en los 14 (el filtro por tipo explica que «juan jose
  romero» dé 40 como ingreso y 8 como gasto). El aviso salta donde debía:
  `servicios selecta` → 355. Los ceros (`tulotero`, `mega deportes`, `iberdrola`)
  son correctos: ya están categorizados.
- 2026-09-24 — **Deuda anotada, el humano la deja para más adelante:** la propuesta
  arrastra papeleo y puntuación en «ANUL. /VivaGym» → `anul. /vivagym` (debería ser
  `vivagym`, con `anul` en la lista de papeleo), y sigue floja con nombres de canal
  («TRANS INM/ N26» → `trans inm`, que pesca también Openbank; «TPV VIRTUAL» →
  `tpv virtual`). Ninguna rompe nada: el texto es editable y el recuento avisa.

- 2026-09-24 — F18 en `done`, entrada de historial escrita y puerta repetida por el
  leader (init.sh: «Entorno listo»).

- 2026-09-26 — Spec de la F19 escrito (`specs/19-statement-by-month/`, 15 requisitos y
  6 decisiones 🔴: mes con flechas + selector y mes vacío con frase, sumas del backend
  con etiquetas neutras y nota fija no cerrable sobre lo infladas que están por los
  depósitos, lista continua con cabecera por día, un mes en una petición de 200 con
  `Load more` de red de seguridad, marca `Transfer` en los apuntes que no cuentan en las
  sumas, y el mes vivo solo en la URL). Es la **primera rodaja de la E7**: sin filtros,
  sin búsqueda y sin interruptor del ruido. Feature en `spec_ready`, a la espera de la
  puerta humana.

- 2026-09-26 — Investigado el ruido de las sumas (dos exploraciones de solo lectura,
  `progress/exploration/ruido-traspasos-*.md`). Hallazgos: los totales del backend ya
  excluyen los traspasos emparejados, pero los 29 apuntes de depósito de myinvestor
  (285.000 €, 58 % de la base) no tienen arreglo desde el frontend, y 2 de las 40
  parejas detectadas son falsas (multas casadas con Bizums de otra persona). Encargo
  al backend escrito en `../docs/handoff-sumas-honestas.md`.
- 2026-09-26 — Arranca la E7. F19 `statement-by-month` dada de alta con la intención
  del humano (borrador `docs/intent-e7-draft.md`, aprobado) y su spec escrito.
- 2026-09-26 — El humano aprueba el spec de la F19 tal cual, las 6 🔴 incluidas
  (flechas + selector de mes, sumas con etiquetas neutras y nota permanente sobre el
  ruido, lista con cabecera por día, un mes en una petición de 200, marca `Transfer`
  y el mes solo en la URL). F19 pasa a `in_progress`.

- 2026-09-26 — implementer arranca la F19. Plan: las tasks T0..T17 de
  `specs/19-statement-by-month/tasks.md`. **T0 cerrado**: (a) el par
  `--warning on --surface-card` y también `--warning on --warning-subtle` ya
  tienen su línea `contrast:` en `theme-dark.css` (F18), así que el tema no se
  toca; (c) `buildMovementsQuery` omite los valores `undefined`, así que una
  query con solo `from`/`to`/`page`/`pageSize` **no** lleva `status`. El punto (b)
  (que `<input type="month">` se lea bien con los tokens) se comprueba en el
  navegador dentro del e2e de la T13, cuando la pantalla ya existe.

- 2026-09-26 — **F19 implementada**: T0–T17 de `tasks.md` en `[x]` (la T18, la
  comprobación con el humano delante contra el backend real, sigue pendiente y no
  bloquea). `/movements` deja de ser placeholder: mes en curso al entrar, tres cifras
  del backend con la nota fija no cerrable, lista con cabecera por día, marca
  `Transfer`, `Load more`, mes vacío, error con reintentar y el mes solo en la URL.
  Los 15 requisitos con test: **+7 ficheros y +87 tests unitarios (74 / 1060)** y 4
  escenarios e2e nuevos (21 en chromium), con todas las llamadas interceptadas y la
  red de seguridad; **ninguna petición distinta de `GET` en toda la pantalla**.
  Puerta completa en verde (`type-check`, `lint`, `test:unit`, `build`, e2e chromium,
  `./init.sh`). Sin dependencias nuevas y sin tocar `theme-dark.css`. Informe en
  `progress/implementation/statement-by-month.md`. Falta el reviewer.

- 2026-09-26 — reviewer aprueba la F19 sin cambios (1.060 tests, 21 e2e, puerta
  repetida por él; las 7 desviaciones declaradas aceptadas una a una).
- 2026-09-26 — **T18 hecha** con el humano delante, solo lectura. Seis meses
  comprobados contra la API (2026-09, 2026-07, 2026-03, 2025-12, 2024-01 y 2023-05,
  este último vacío): las tres cifras y el número de movimientos coinciden **al
  céntimo** en los seis. La nota permanente sale en todos los meses, el mes vacío dice
  «No movements in May 2023.», `Next` está apagado en el mes en curso, un mes inválido
  (2026-13) cae en el mes en curso, y la marca `Transfer` sale en 11 filas de
  diciembre de 2025, las mismas 11 que la API da con `transferId`. Cero escrituras y
  cero errores de consola.

- 2026-09-26 — F19 en `done`, E7 a 🟡 en el roadmap (con la sección «Dónde estás
  ahora mismo» reescrita: llevaba seis features desfasada), historial escrito y
  puerta repetida por el leader (init.sh: «Entorno listo»).

- 2026-09-27 — Spec de la F20 escrito (`specs/20-statement-filters/`, 15 requisitos y
  5 decisiones 🔴: la barra de la cola se parte en dos —cerebro compartido, cara
  copiada— con solo cuatro controles y sin tipo/estado/fechas; línea de alcance con
  recuento del filtro sin pedir el mes sin filtrar; mes y filtros en la URL con las
  claves de la cola y la combinación imposible corregida en el cliente antes de pedir;
  desplegables completos con `GET /api/accounts` (5) y `GET /api/categories` (16); y
  «sin categoría» apagado al entrar). Segunda rodaja de la E7. La nota permanente de
  la F19 no cambia ni una palabra. Feature en `spec_ready`, a la espera de la puerta
  humana.

- 2026-09-27 — El humano elige que **los filtros afinen el mes** (no entra rango libre
  de fechas) y aprueba el spec de la F20 tal cual, las 5 🔴 incluidas: barra partida
  (lógica a `shared/`, componente copiado con cuatro controles), línea de alcance con
  el recuento del filtro, mes y filtros en la URL con corrección en cliente de la
  combinación inválida, desplegables completos con `GET /api/accounts` y
  `GET /api/categories`, y «sin categoría» apagado al entrar. F20 a `in_progress`.

## Próximo paso

Implementar la F20 y pasarla por el reviewer. Después de la E7 quedan el
interruptor del ruido (espera la parte 1 de `../docs/handoff-sumas-honestas.md`) y
corregir categorías desde el extracto.
