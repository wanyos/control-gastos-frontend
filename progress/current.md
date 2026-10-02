# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

- **Feature en curso:** 23 — statement-noise-toggle (implementación)
- **Inicio:** 2026-09-29
- **Agente:** leader (Claude Code) → implementer

## Plan

El interruptor del ruido y la nota que ya no miente (F23): las tasks **T0–T19** de
`specs/23-statement-noise-toggle/tasks.md` en orden. La **T20 no es del implementer**
(comprobación con el humano delante, de solo lectura; la hace el leader con él).

La feature es de **solo lectura**: el interruptor no escribe nada, solo añade
`excluded=none` y `transfer=none` a la pregunta que ya se le hace a
`GET /api/movements`. Las tres cifras siguen siendo las de `totals` del backend
(no se calcula ni se ajusta ninguna aquí), lo escondido se dice **en número y nunca
en importe** (resta de dos `pagination.total`), y la nota fija nueva no lleva
**ninguna cifra**: la única cifra viva es `ambiguousCount` de
`GET /api/transfers/ambiguous`, una petición por sesión, que si falla o vale 0 no
pinta nada. Ninguna llamada real sale a `:3000` en tests ni en e2e (red de seguridad
que aborta cualquier `/api` no prevista).

## Bitácora de la sesión

- `./init.sh` de partida en **verde** (84 ficheros, 1292 tests, e2e chromium OK).
- **T0** comprobado: (a) `buildMovementsQuery` admite parámetros nuevos sin mover el
  orden que esperan los tests de `review` (solo viajan si se piden); (b) el icono
  `Info` **no se usaba todavía** — se usa igualmente y se documenta: no es dependencia
  nueva (`@lucide/vue` ya está y cada icono se importa por nombre) y ningún icono ya
  importado significa «información»; el que sale, `TriangleAlert`, es la alarma que
  esta feature viene a quitar; (c) el par `--ink-muted on --surface-card >= 4.5` ya
  está declarado en `theme-dark.css`, así que la nota gris no necesita línea nueva.
- **T1–T2**: `MovementScope` y los campos `transfer` / `excluded` entran por
  `src/shared/movements.ts` de forma aditiva; `features/review` no cambia ni una línea.
  Tests nuevos en `src/shared/__tests__/movements.spec.ts`.
- **T3–T5**: `filters.ts` gana `HideNoise`, el 4º parámetro de `monthQuery`,
  `hiddenCountQuery`, el `hide=true` de la URL en las dos direcciones,
  `hiddenCountLine` y `nothingLeftLine`. Dos tests de la F20 pasan a incluir
  `hideNoise: false` en sus comparaciones exhaustivas de `fromRouteQuery`.
- **T6–T10**: el store lleva `hideNoise`, `hiddenCount` y `ambiguousGroups`;
  `loadHiddenCount()` resta los dos `pagination.total` bajo el guardián `loadRun` y
  falla en silencio; `adoptUpdated()` retira la fila que el interruptor esconde.
  17 tests nuevos, incluido el de que **ninguna petición usa otro método que `GET`**.
- **T11–T14**: `NoiseSwitch.vue` (nuevo), la vista lo pinta entre filtros y cifras y lo
  escribe en la URL con `router.replace`, y `StatementList` gana el tercer vacío
  `nothingLeft` con `Show everything`. `Clear filters` **no** apaga el interruptor.
- **T15–T18**: la nota se reescribe entera (texto fijo sin una sola cifra, gris con
  `Info`, sin cerrar) y `getAmbiguousCount()` trae la única cifra viva, una vez por
  sesión. Hay un test que fija el **texto literal**, como lo tenía la F19.
- Los **tres e2e del extracto** interceptan ahora `**/api/transfers/ambiguous` y apuntan
  al texto nuevo de la nota; se añade `e2e/statement-noise-toggle.spec.ts` (5 casos, de
  solo lectura, con la red de seguridad y `['GET']` como único método).
- **T19 / puerta completa en verde**: `type-check`, `lint`, `test:unit`
  (86 ficheros, **1360 tests**), `build`, e2e chromium (**39 tests**) y `./init.sh`.
- Informe con la trazabilidad `R1…R15 → test`:
  `progress/implementation/statement-noise-toggle.md`.
- **Pendiente:** revisión (`reviewer`) y la **T20**, que es la comprobación de solo
  lectura con el humano delante. La feature sigue en `in_progress`; sin commits.- 2026-09-30 — reviewer **pide cambios** en la F23: `pnpm lint` en rojo por un `page_`
  en el e2e nuevo. **Hallazgo de fondo: `./init.sh` no ejecuta oxlint**, solo type-check,
  tests y e2e; por eso salió «Entorno listo» con el lint roto, y por eso el leader había
  estado reportando la puerta como completa sin serlo. Pendiente de decisión del humano
  si se añaden lint y formato a `init.sh`.
- 2026-09-30 — El implementer aplica la corrección y se queda colgado justo después. El
  leader verifica la puerta entera **con lint incluido** (exit 0, 1.360 tests, 39 e2e,
  build e init.sh) y el reviewer **aprueba**. Corregida la tabla «La puerta» del informe
  del implementer, que declaraba el lint en verde cuando se midió en rojo.
- 2026-09-30 — **T20 hecha** con el humano delante, solo lectura. Cinco vistas contra la
  API (julio y diciembre con y sin interruptor, y agosto filtrado por n26): las cifras
  coinciden en las cinco y **al esconder el ruido bajan los movimientos pero no las
  sumas**, que es lo correcto. Julio pasa de 93 a 79 filas, diciembre de 49 a 36. La
  nota nueva sale **sin un solo dígito** y sin botón de cerrar. El recuento de dudosos
  es **una sola petición por sesión**, medido navegando tres meses y accionando el
  interruptor. La pega que anotó el reviewer (mes vacío culpando al interruptor) **no se
  reproduce**: mayo de 2023 con el interruptor puesto dice «No movements in May 2023.».
  Cero escrituras y cero errores.



- 2026-09-30 — **Higiene (no es feature): la puerta ya incluye lint y formato.**
  `./init.sh` declaraba «Entorno listo» sin pasar el linter (era el hallazgo del
  reviewer en la F23). Ahora tiene dos pasos nuevos: **5. Lint** (`pnpm
  lint:oxlint:check` → `oxlint .` **sin `--fix`**) y **6. Formato** (`pnpm
  format:check` → `prettier --check` sobre las mismas rutas que `pnpm format`);
  los dos paran la puerta en rojo. Tests, e2e y resumen pasan a ser 7, 8 y 9.
  `pnpm lint` (con `--fix`) se queda igual para el uso a mano: la variante de
  comprobación se llama `lint:oxlint:check` porque el glob `lint:*` de `run-s`
  **sí** captura un `lint:check` y habría cambiado `pnpm lint`. `format:check`
  no encontró **ningún** archivo sin formatear, así que no se reformateó nada.
  Actualizados `docs/verification.md` (tabla «Qué comprueba la puerta» y las dos
  parejas arregla/comprueba) y `docs/stack.md`. Sin dependencias nuevas, sin
  tocar el backend, sin commits.
- 2026-09-30 — **F24 `transfer-pairs-review` → `spec_ready`.** spec_author escribe
  `specs/24-transfer-pairs-review/` (15 requirements + 8 restricciones, 5 puntos 🔴).
  Lectura real (solo `GET`): **38 parejas, no 40** — las dos multas ya están deshechas
  desde el 2026-09-28 16:46 — y 0 grupos dudosos. La prueba final (T22) escribe y
  necesita visto bueno: re-enlazar con `curl` solo la multa de 100 € y deshacerla desde
  la pantalla. Espera aprobación del humano sobre `decisions.md`.- 2026-10-02 — Higiene cerrada (f0a1661): `init.sh` comprueba ya lint y formato.
- 2026-10-02 — F24 `transfer-pairs-review` dada de alta con el tercer borrador del
  humano (pantalla propia, verlas todas, emparejar dudosos dentro) y su spec escrito.
  **El humano aprueba el spec.** F24 pasa a `in_progress`.
- 2026-10-02 — Verificado por el leader contra el backend real, solo lectura: **las dos
  multas ya están deshechas** (`transferId: null`, modificadas el 2026-09-28 16:46 por
  la sesión del backend), hay **38 parejas** y **0 grupos dudosos**. El problema que
  motivó la feature ya no está en los datos; la feature sigue teniendo sentido para
  cuando la detección vuelva a equivocarse.
- 2026-10-02 — **Corregido el spec**: afirmaba que las tres parejas iguales del
  2026-07-24 eran «duplicados por una reimportación». No hay base: cada lado entró en
  una sola importación con `daySequence` distinto (1-2-3 y 2-3-4) y lo traen dos bancos
  por separado. Lo más probable son tres transferencias reales; lo sabe el humano.
- 2026-10-02 — **Fallo del backend encontrado: la paginación de `GET /api/movements`
  pierde y repite filas.** Con `pageSize=100` salen 1.605 distintos de 1.607: dos
  movimientos no aparecen nunca (21728, un vencimiento de depósito de 25.000 €, y
  24276) y otros dos salen dos veces, siempre en una frontera de página. Causa casi
  segura: el orden empata entre cuentas distintas con la misma fecha y el mismo
  `daySequence`, sin desempate único. Con `pageSize=200` no se nota por casualidad.
  **Afecta a la cola de revisión**, que pagina de 100 en 100. Encargo escrito en
  `../docs/handoff-paginacion-estable.md`.
- 2026-10-02 — Pendiente de decidir con el humano **cómo se prueba la F24 en real**: el
  spec propone volver a enlazar la multa de 100 € con `curl` para luego deshacerla
  desde la pantalla; el leader prefiere deshacer y rehacer una pareja buena y no tocar
  las multas. Se pregunta al llegar a la prueba, que exige visto bueno explícito.


