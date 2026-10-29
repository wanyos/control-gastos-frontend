# Pruebas con datos reales, cabos 32 y 40 (2026-10-29)

Hechas en Chromium de Playwright (sin ventana, 1400×1000) contra el frontend de
`http://localhost:5173` y el backend real de `http://localhost:3000`, con el permiso
del humano del 2026-10-29. Solo las pruebas que no dejan nada cambiado.

Scripts, capturas y fotos de estado en
`C:\Users\roybe\AppData\Local\Temp\claude\c--Users-roybe-Escritorio-proyectos-control-gastos-gastos-frontend\71c5d0bd-86c9-4aee-902f-83199fb10eec\scratchpad\real-tests\`
(`run.mjs`, `run2.mjs`, `snapshot.mjs`, `candidates-api.mjs`, `before.json`,
`after.json`, `run-result.json`, `run2-result.json` y las `*.png`).

Cómo se limitaron las escrituras: el script intercepta toda llamada a `/api/**`;
los `GET` pasan, y cualquier otra petición se **aborta** salvo la que el paso en
curso tiene permitida (`POST /api/category-rules/apply` durante el paso 1;
`PATCH /api/movements/<id del movimiento elegido>` durante el paso 2). No se abortó
ninguna: la lista de bloqueadas salió vacía en las dos ejecuciones.

## Foto de antes (16:33:58 UTC)

`GET /api/movements?page=1..9&pageSize=200`: 9 páginas, 1.667 movimientos. 0
`pending_review`, 0 pendientes sin categoría, 0 elegibles para aplicar reglas.
`categorySource`: 812 `manual`, 699 `rule`, 79 `closing`, 77 `null`.
`GET /api/category-rules`: 131 reglas.

## 1. Cabo 32 — aplicar las reglas (guía §6, pasos 14–15)

Comprobación previa, dentro del mismo script e inmediatamente antes de pulsar:
recorridas las 9 páginas de la API, **0** movimientos `pending_review` sin
categoría. Se siguió.

| Paso | Lo que dice la guía | Lo que se vio |
|---|---|---|
| Antes | — | En `Rules` no había recuadro (`last-apply`: 0) |
| `Apply rules` | Una pregunta | Ventana `Apply your rules?` con `Only pending movements without a category are touched.` / `Confirmed and already categorized movements are never changed.` / `This can't be undone from the app.` y `Cancel` / `Apply rules` (`01-apply-confirm.png`) |
| Confirmar (14) | `Rules applied` y tres líneas | `Rules applied` / `0 movements categorized` / `0 still without a matching rule` / `0 conflicts` / `Close`. Sin lista de choques (no hay) (`02-apply-result.png`) |
| Cerrar (15) | Recuadro bajo el título que empieza por `Rules applied at`, la hora y `no movements were categorized.` si no fue ninguno; debajo sin regla y choques | `Rules applied at 17:36: no movements were categorized.` y debajo `0 still without a matching rule · 0 conflicts`, con `Dismiss`. No salen `Show the … movements` ni `Show the … conflicts` (0 y 0) (`03-rules-last-apply.png`) |
| Ir a `Review` sin recargar (pulsando el menú) | El mismo recuadro | El mismo texto: `Rules applied at 17:36: no movements were categorized.` / `0 still without a matching rule · 0 conflicts` / `Dismiss`. `Review` vacío: `0 movements`, In/Out/Net `0,00 €`, `You're all caught up. Nothing is waiting for review.` (`04-review-last-apply.png`) |
| `Dismiss` en `Review` | Quita el recuadro de las dos pantallas | En `Review` desaparece; vuelto a `Rules` por el menú, tampoco está (`05-rules-after-dismiss.png`) |

Coincide con la guía. Con 0 elegibles no se pudo ver la lista de `Show the …
movements` ni la de choques, ni que `Review` cambie: no había nada que cambiar.

## 2. Cabo 40 — cambiar a mano la categoría en `Movements` (guía §4, paso 15)

**La pregunta no salió con ningún movimiento manual, y con los datos de hoy no
puede salir.** La pantalla saca el texto con `suggestionTextOf`
(`src/features/category-rules/rules.ts`) y abre la pregunta solo si
`GET /api/category-rules/preview` dice que movería al menos uno. Para buscar
candidato pregunté ese `GET` (solo lectura) por el texto de **cada** movimiento
`manual`: 212 textos distintos (9 movimientos manuales no dan texto). Resultado: 23
textos responden `409` (ya hay una regla con ese texto, y la guía dice que entonces
no sale) y los 189 restantes responden `categorized: 0`. Ningún texto movería otro
movimiento (`candidates-api.mjs`).

Probados en el navegador los 3 permitidos, todos de octubre de 2026 (el mes que
abre `Movements`) y con `categorySource: "manual"`:

| Movimiento | Antes | Cambiado a | Línea verde | Pregunta | `Undo` |
|---|---|---|---|---|---|
| 43007 `BIZUM A FAVOR DE Cristina R B CONCEPTO: Sin concepto` | `Transferencias a personas` | `Compras` | `Categorized as Compras` + `Undo` | no sale | vuelve a `Transferencias a personas`, texto `Change undone`, sin botón |
| 43006 `DECATHLON XANADU` | `Compras` | `Ocio` | `Categorized as Ocio` + `Undo` | no sale (preview `decathlon xanadu` → `categorized=0`) | vuelve a `Compras`, `Change undone` |
| 43011 `BIZUM A FAVOR DE Monica U G CONCEPTO: Limpieza` | `Transferencias a personas` | `Compras` | `Categorized as Compras` + `Undo` | no sale (preview `bizum a favor de monica u g` → `categorized=0`) | vuelve a `Transferencias a personas`, `Change undone` |

Capturas: `06-manual-before.png`, `07-after-change.png`, `11-after-undo.png`,
`13-43006-after-change.png`, `14-43006-after-undo.png`, `13-43011-after-change.png`,
`14-43011-after-undo.png`.

Lo que coincide con la guía: la etiqueta cambia sola al elegir, sale la línea verde
`Categorized as …` con `Undo`, y `Undo` deja la categoría anterior con
`Change undone` sin botón (paso 16). Que no salga la pregunta también coincide con
la guía («No sale la pregunta si ningún otro movimiento se movería…»).

**No se ha podido probar** con datos reales: `Show the N movements`, cambiar el
texto del campo y ver el recuento, ni `No, only this one`, porque la pregunta no
llega a abrirse. Para probarlo haría falta un movimiento con un texto que comparta
con otro que esté sin categoría o con `categorySource: "closing"` y que ninguna
regla use ya. (Un aparte: con el texto corto `cristina r` sí movería uno, el 24446,
pero la pantalla no propone ese texto, propone `bizum a favor de cristina r b`.)

**La parte de `Review` del cabo 40 no se ha probado**: `Review` tiene 0 pendientes.

## 3. Cabo 40 — texto `Set when the import was closed` (solo lectura)

Movimiento 42873 `ISHARE DEVLP REAL ESTATE INDX` (`categorySource: "closing"`,
`Otros gastos`, octubre de 2026). Su línea de cuenta dice
`MyInvestor ···1320` · `Not counted` · `Set when the import was closed`. El texto
está en la línea de la cuenta bajo el concepto, a 12 px, color `rgb(205, 213, 221)`
(clase del contenedor `text-xs text-ink-muted`) (`12-closing-row.png`). En octubre
de 2026 salen 8 líneas con ese texto. En el movimiento manual 43007 no sale (0),
como dice la guía. Coincide.

## Peticiones de escritura que se mandaron

Todas las que no eran `GET`, por orden (hora UTC):

| Hora | Método | URL | Cuerpo |
|---|---|---|---|
| 16:36:32.663 | POST | `/api/category-rules/apply` | (sin cuerpo) |
| 16:36:33.503 | PATCH | `/api/movements/43007` | `{"categoryId":13621}` |
| 16:36:42.127 | PATCH | `/api/movements/43007` | `{"categoryId":13628}` (el `Undo`) |
| 16:38:13.388 | PATCH | `/api/movements/43006` | `{"categoryId":13626}` |
| 16:38:16.507 | PATCH | `/api/movements/43006` | `{"categoryId":13621}` (el `Undo`) |
| 16:38:17.431 | PATCH | `/api/movements/43011` | `{"categoryId":13621}` |
| 16:38:20.539 | PATCH | `/api/movements/43011` | `{"categoryId":13628}` (el `Undo`) |

Ningún `POST /api/category-rules` (no se pulsó `Create rule`). Peticiones abortadas
por el script: ninguna.

## Errores

- Respuestas ≥ 400 en el navegador: **ninguna** en las dos ejecuciones.
- Errores de consola y errores de página: **ninguno**.
- Fuera del navegador, los `GET /api/category-rules/preview` de la búsqueda de
  candidato dieron 23 `409` (texto ya usado por una regla): es lo que dice el
  contrato, no un fallo.

## Foto de después (16:38:29 UTC) y comparación

9 páginas, 1.667 movimientos, 131 reglas. Comparados `id → {categoryId,
categorySource, status, excludedFromTotals, transferId}` de los 1.667: **0
diferencias**. Las reglas: **idénticas** (mismo JSON). Mismos recuentos por
`categorySource` (812 / 699 / 79 / 77).

Lo único que cambió, y que la foto no mira: el `updatedAt` de 43007, 43006 y 43011
(de `2026-10-16T11:05:05.638Z` a la hora de su `Undo`). Su `categoryId` y su
`categorySource: "manual"` son los de antes.
