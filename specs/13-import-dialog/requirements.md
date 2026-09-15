# Requirements — Feature 13: import-dialog (botón Import, modal por fases y aviso de archivos nuevos)

> Derivado del bloque `intent` de la feature 13 en `feature_list.json` (fuente de
> verdad), de sus 12 criterios de `acceptance` y del plan aprobado por el humano el
> 2026-09-15. EARS estricto según `docs/specs.md`.
>
> Datos (solo lectura): `../gastos-backend/docs/api-contract.md` →
> `### GET /api/ingestion/pending`, `### POST /api/import` (informe completo,
> formas de `files[]`, códigos por archivo y 503) y
> `### POST /api/category-rules/apply` (forma de `conflicts`). Contrastado además con
> `gastos-backend/src/modules/import/import.types.ts` y `import.service.ts`: un
> archivo de producto fallido llega con `product: null` y `snapshot: null`; un
> `skipped` trae `reason` y no trae `error`; un `failed` puede no traer `error`.
>
> **Fuera de alcance (feature 14, `import-report-details`):** el detalle de filas
> no leídas, descuadres, traspasos ambiguos, conflictos de categoría, fallos de las
> pasadas finales y la lista de archivos importados. Esta feature **parsea** el
> informe completo, pero solo **pinta** titular, contadores, la línea de pasadas
> finales, la frase de revisión y la lista de archivos no importados.

## Cobertura del intent

| Punto de `como_se_que_esta_bien` | Requirements |
|---|---|
| «Veo arriba a la derecha el botón Import y, si hay archivos nuevos en Drive, un aviso con cuántos son» | R1, R2, R3 |
| «Al pulsar Import, el modal me dice en qué fase está… y no me deja cerrarlo a medias» | R4, R5, R8, R15 (+ R14) |
| «Si no hay nada que importar, me lo dice y no lanza nada» | R5 |
| «Al terminar veo un resumen: movimientos nuevos, ya estaban, archivos de inversión, archivos no importados y por qué, en inglés» | R9, R10, C3 |
| «Si Drive o el servidor fallan, me lo dice claramente, me deja reintentar y no me engaña» | R6, R11 (+ R13) |
| «Después de importar, el aviso y la vista de Patrimonio se actualizan solos» | R2, R12 |
| `que_no_quiero`: sin tocar backend, sin lista cerrada de bancos, sin doble importación, sin español ni claros, sin detalle fino | R7, R9, C3, C5, R10 (slug desconocido) y alcance de arriba |
| `acceptance` 2: la ruta `/import` y la entrada Import de la sidebar desaparecen | C1 |
| `acceptance` 8: `ApiError` conserva el `code`; validación compartida con net-worth | R13, C2 |
| `acceptance` 9: accesibilidad del modal | R14, R15 |
| `acceptance` 10-12: inglés/oscuro/contraste, e2e sin backend, puerta | C3, C4, C6 |

---

## Barra superior y aviso

## R1
El sistema DEBE mostrar en la barra superior, en todas las rutas, un botón primario
«Import» con el icono `FileUp` (`data-test="import-button"`), que MIENTRAS hay una
importación en curso muestra «Importing…» y está deshabilitado.

> Verificación: `AppShell.spec.ts` — el botón existe dentro de `header` en
> `/net-worth`, `/overview` y una ruta desconocida. `ImportButton.spec.ts` — con el
> store en `importing`, el texto es `Importing…` y el botón tiene `disabled`.

## R2
CUANDO se monta el shell, se abre el modal de importación o termina una
importación (con cualquier resultado), el sistema DEBE pedir
`GET /api/ingestion/pending` y guardar el resultado como los pendientes conocidos,
sin ninguna consulta periódica.

> Verificación: `store.spec.ts` — `refreshPending()` hace 1 GET y guarda
> `totalPending`; `open()` hace 1 GET y actualiza `pending`; tras `start()` con 200,
> con 503 y con informe ilegible hay un GET más. `ImportButton.spec.ts` — al montar,
> 1 GET a `/api/ingestion/pending`; con timers falsos avanzados 10 min no hay más.

## R3
MIENTRAS el último `totalPending` conocido es mayor que 0, el sistema DEBE mostrar
junto al botón Import un aviso `info` con el número (`3 new files`, `1 new file`;
`data-test="pending-badge"`); con 0, o si la última consulta falló, NO DEBE mostrar
ni el aviso ni ningún error en la barra.

> Verificación: `ImportButton.spec.ts` — `totalPending: 3` → `3 new files`; `1` →
> `1 new file`; `0` → no existe el aviso; GET que responde 503 → no existe el aviso y
> el `header` no contiene texto de error.

## Modal: comprobación

## R4
CUANDO el usuario pulsa Import sin una importación en curso, el sistema DEBE abrir
el modal en la fase de comprobación («Checking Drive for new files…»,
`data-test="import-step-checking"`) con un único `GET /api/ingestion/pending`.

> Verificación: `ImportDialog.spec.ts` — tras el clic, el modal existe con la fase
> de comprobación y `fetch` se ha llamado 1 vez con esa ruta.

## R5
CUANDO la comprobación responde, el sistema DEBE pasar a «You're up to date» con
solo el botón Close y sin ningún `POST /api/import` si `totalPending` es 0, o a la
confirmación si es mayor que 0: «N new files found», la lista agrupada por banco
(nombre legible, o el slug tal cual si es desconocido) → año → nombres de archivo,
la nota «Files are moved to the processed folder in Drive once imported» y los
botones Cancel e «Import N files».

> Verificación: `store.spec.ts` — `totalPending: 0` → `flow.step === 'upToDate'` y
> ningún POST; `2` → `confirm` con los pendientes. `ImportDialog.spec.ts` — textos
> exactos de ambas fases; `PendingList.spec.ts` — agrupación, slug desconocido
> (`newbank`) mostrado tal cual, y con más de 8 archivos cada banco plegado en un
> `<details>` cerrado con su recuento.

## R6
SI la comprobación falla ENTONCES el sistema DEBE mostrar «Couldn't reach Google
Drive» (cuando `apiCode` es `DRIVE_CONNECTION_ERROR`) o «Couldn't reach the server»
(cualquier otro fallo: HTTP, red o respuesta que no valida), con la frase «Nothing
has been imported» y los botones Close y Try again, y Try again DEBE volver a
comprobar.

> Verificación: `store.spec.ts` — 503 `DRIVE_CONNECTION_ERROR` → `checkFailed` con
> `kind: 'drive'`; 500, fallo de red y JSON inválido → `kind: 'server'`; `retry()` →
> `checking` y 1 GET más. `ImportDialog.spec.ts` — textos de las dos variantes.

## Modal: importación

## R7
CUANDO el usuario confirma, el sistema DEBE hacer exactamente un `POST /api/import`
sin cuerpo y sin cabecera `Content-Type`, aunque el botón de confirmar se pulse
varias veces o se invoque `start()` de nuevo antes de la respuesta.

> Verificación: `service.spec.ts` — la llamada a `fetch` lleva `method: 'POST'`,
> `body` indefinido y ninguna cabecera `Content-Type`. `store.spec.ts` — tres
> `start()` seguidos con el POST pendiente → 1 POST. `ImportDialog.spec.ts` — doble
> clic en «Import 2 files» → 1 POST. `e2e/import-dialog.spec.ts` — en navegador
> real, 1 petición POST con `postData()` nulo y sin `content-type`.

## R8
MIENTRAS la importación está en curso, el sistema DEBE mostrar la fase «Importing N
files…» con «This can take a few seconds» (`data-test="import-step-importing"`) y
NO DEBE cerrar el modal ni con Esc, ni con clic en el fondo, ni con un botón de
cierre (la X no se muestra y el botón de acción está deshabilitado).

> Verificación: `store.spec.ts` — `close()` en `importing` no cambia `flow`.
> `ImportDialog.spec.ts` — con el POST pendiente: Esc en `document`, clic en el scrim
> → el modal sigue; no existe `[data-test="dialog-close"]`; el botón de acción tiene
> `disabled`.

## R9
CUANDO `POST /api/import` responde 200 con un informe válido, el sistema DEBE
mostrar el titular de resultado según `design.md` §6 (Import complete / Imported,
with a few things to check / Partially imported / Nothing was imported), los
contadores New movements, Already imported, Investment files updated y Files not
imported, la línea de pasadas finales («2 transfers matched · 12 categorized · 1 new
account», omitiendo las partes a 0) y, si `importedCount > 0`, la frase «N new
movements are waiting for your review» sin enlace.

> Verificación: `outcome.spec.ts` — titular exacto para los cuatro casos y sus
> bordes (informe sin archivos; todos duplicados; solo productos). `summary.spec.ts`
> — contadores y línea con plurales y partes omitidas; frase en singular y plural.
> `ImportSummary.spec.ts` — la frase existe sin `<a>` y no existe con
> `importedCount: 0`.

## R10
CUANDO el informe trae archivos `failed` o `skipped`, el sistema DEBE listarlos bajo
«Needs attention» (`data-test="file-issue"` por archivo) con banco, año y nombre, la
explicación en inglés que corresponde a su `error.code` según `design.md` §7 (texto
genérico para un código desconocido o ausente; «This bank or file type isn't
supported yet» para `skipped`) y el texto original del backend (`error.message` o
`reason`) plegado en un «Details» con `lang="es"`.

> Verificación: `fileMessages.spec.ts` — texto exacto para los 9 códigos del
> contrato, un código desconocido, `error` ausente y `skipped`. `FileIssueList.spec.ts`
> — un `<details>` cerrado por archivo con `lang="es"` y el mensaje original; sin
> archivos no se pinta la sección.

## R11
SI `POST /api/import` falla (HTTP, red) ENTONCES el sistema DEBE mostrar «Couldn't
reach Google Drive» o «Couldn't reach the server» (misma regla que R6) con «Some files
may already have been imported. Trying again is safe: nothing is imported twice» y los
botones Close y Try again, que vuelve a comprobar; y SI responde 200 con un informe
que no valida ENTONCES DEBE mostrar «The import finished, but its report couldn't be
read. Your files may have been imported» con solo Close.

> Verificación: `store.spec.ts` — 503 `DRIVE_CONNECTION_ERROR` → `importFailed`
> `drive`; 500 y red → `server`; 200 con `files` que no es array → `reportUnreadable`;
> `retry()` desde `importFailed` → `checking`. `ImportDialog.spec.ts` — textos exactos;
> ninguna de las dos variantes contiene «Nothing has been imported».

## R12
CUANDO termina una importación, con cualquier resultado, el sistema DEBE recargar la
vista de Patrimonio llamando a `useNetWorthStore().load()` solo si ese store ya tiene
un patrimonio cargado (`netWorth !== null`).

> Verificación: `store.spec.ts` — con `netWorth` cargado: 200, 503 e informe ilegible
> → 1 GET a `/api/net-worth`; con `netWorth === null` → 0.

## Transversal

## R13
El sistema DEBE conservar en `ApiError` el `code` del cuerpo de error del backend como
`apiCode` (o `undefined` si el cuerpo no lo trae), sin cambiar `code`
(`API_HTTP`/`API_NETWORK`), `status` ni `message` de los errores actuales.

> Verificación: `http.spec.ts` — 503 con `{ code: 'DRIVE_CONNECTION_ERROR' }` →
> `apiCode === 'DRIVE_CONNECTION_ERROR'`, `code === 'API_HTTP'`, `status === 503`,
> `message` igual que hoy; cuerpo no JSON → `apiCode` indefinido; red → indefinido.
> Los tests existentes de `http.spec.ts` y `errors.spec.ts` pasan sin cambios.

## R14
MIENTRAS el modal está abierto, el sistema DEBE exponerlo con `role="dialog"`,
`aria-modal="true"` y `aria-labelledby` a su título, poner el foco en la acción
principal de la fase (o en el panel si no hay ninguna habilitada), mantener el
foco dentro con Tab y Shift+Tab, cerrar con Esc y clic en el fondo cuando no importa,
y devolver el foco al botón Import al cerrarse.

> Verificación: `BaseDialog.spec.ts` (con `attachTo: document.body`) — atributos;
> Tab desde el último enfocable va al primero y Shift+Tab al revés; Esc y clic en el
> scrim emiten `close` con `dismissible` y no sin él; al desmontar, el foco vuelve al
> elemento activo previo. `ImportDialog.spec.ts` — foco en «Import 2 files» en
> confirmación y en Close en «up to date»; tras cerrar, `document.activeElement` es el
> botón Import.

## R15
CUANDO cambia la fase del modal, el sistema DEBE anunciar su frase en una región
`aria-live="polite"` (`data-test="import-live"`) que permanece montada mientras el
modal está abierto.

> Verificación: `ImportDialog.spec.ts` — el texto de la región pasa por
> «Checking Drive for new files…», «2 new files found», «Importing 2 files…» y el
> titular final; la región es el mismo nodo en todas las fases.

---

## Restricciones de cierre (se verifican con tests existentes, grep o comandos)

- **C1 — Sin `/import`.** `src/router/index.ts` no declara la ruta ni la entrada;
  `router.spec.ts` y `AppShell.spec.ts` actualizados (4 rutas navegables; `/import`
  no resuelve).
- **C2 — Validación compartida.** Los validadores de `net-worth/service.ts` viven en
  `src/shared/validation.ts` con los **mismos mensajes**; `src/features/net-worth/__tests__/`
  pasa sin editar una línea; `bankLabel` vive en `src/shared/banks.ts` y
  `breakdown.spec.ts` pasa sin cambios.
- **C3 — Inglés y oscuro.** Todo texto propio en inglés (test: el `text()` del modal
  en cada fase, quitando los `lang="es"`, no contiene `importación`, `archivo`,
  `Cerrar`, `Reintentar`); solo alias semánticos; líneas `contrast:` nuevas de
  `design.md` §9 en `theme-dark.css` y `theme-dark.spec.ts` en verde (incluido «no raw
  colors» sobre los `.vue` nuevos).
- **C4 — e2e.** `e2e/app-boot.spec.ts` responde también `**/api/ingestion/pending`
  y sigue verde sin backend; `e2e/import-dialog.spec.ts` (chromium) cubre pendientes,
  informe parcial y 503 en el POST con `page.route`.
- **C5 — Sin dependencias nuevas ni cambios en el backend.** `git diff package.json`
  sin entradas nuevas; nada fuera de `gastos-frontend/`.
- **C6 — Puerta.** `pnpm type-check`, `pnpm lint`, `pnpm test:unit`, `pnpm build` y
  `./init.sh` en verde.
- **C7 — Comprobación real (con aviso previo al humano).** Con backend en `:3000`:
  primero con 0 pendientes; importar de verdad **solo tras avisar** (mueve archivos en
  Drive, crea cuentas y reescribe traspasos y categorías de toda la BD). Se anota en el
  informe.

---

## Procedencia

- **R1 — (humano).** «veo arriba a la derecha el botón Import»; que va en la barra en
  toda la app lo cerró el humano el 2026-09-15. El estado «Importing…» deshabilitado
  sale del plan aprobado y de «no quiero dos importaciones con un doble clic».
- **R2 — (humano)** «el aviso… se actualiza solo» + acceptance 7. **(añadido)** los
  tres momentos exactos y la ausencia de sondeo; aprobado por el humano el 2026-09-15.
- **R3 — (humano).** Acceptance 1 (oculto con 0 o con fallo, sin error en la barra).
  Texto `N new files` (delegado, plan). El aviso cuenta los pendientes de Drive, que
  son todos importables (todos los bancos tienen parser), y baja a 0 tras una
  importación correcta: confirmado por el humano el 2026-09-15.
- **R4 — (humano).** «el modal me dice en qué fase está (comprobando Drive…)».
- **R5 — (humano)** «si no hay nada que importar, me lo dice y no lanza nada» +
  acceptance 3. **(añadido)** paso intermedio de confirmación con la lista, aprobado el 2026-09-15;
  la nota de que los archivos se mueven y el plegado a partir de 8 archivos son
  (delegado, técnico).
- **R6 — (humano)** «si Drive o el servidor fallan, me lo dice claramente, me deja
  reintentar». La distinción por `apiCode` sale de delego_en_agente («distinguir un
  fallo de Drive de uno del servidor»). Una respuesta que no valida en la comprobación
  se trata como fallo del servidor (añadido menor, técnico).
- **R7 — (humano).** «no quiero que se puedan lanzar dos importaciones a la vez» +
  acceptance 4; sin body ni `Content-Type` lo exige el contrato (si no, 400).
- **R8 — (humano)** «no me deja cerrarlo a medias» + acceptance 4; aprobado el 2026-09-15.
- **R9 — (humano)** «un resumen: cuántos movimientos nuevos, cuántos ya estaban, qué
  archivos de inversión se actualizaron». **(delegado)** los cuatro titulares y la
  línea de pasadas finales (plan). **(añadido)** frase de revisión sin enlace, aprobada el 2026-09-15.
- **R10 — (humano)** «qué archivos no se pudieron importar y por qué, en inglés» +
  acceptance 5. **(añadido)** mostrar además el original en español plegado, aprobado el 2026-09-15.
  Listar `skipped` es (delegado) defensivo: todos los bancos tienen parser, así que solo
  aparece con un archivo que el backend no reconozca (p. ej. subido por error).
- **R11 — (humano)** «no me engaña diciendo que no se hizo nada si pudo hacerse algo» +
  acceptance 6. Que Try again vuelva a comprobar (y no relance el POST) y que el
  informe ilegible solo ofrezca Close son (delegado, técnico).
- **R12 — (humano)** «la vista de Patrimonio se actualiza sola» + acceptance 7.
  «Solo si ya estaba cargada» es (delegado, técnico): evita pedir un patrimonio que
  nadie está mirando.
- **R13 — (humano).** delego_en_agente «conservar el código de error del backend sin
  romper lo existente» + acceptance 8.
- **R14 — (humano).** Acceptance 9. Trampa de foco y cierre con Esc/fondo fuera de la
  importación son (delegado): delego_en_agente «componentes accesibles».
- **R15 — (humano).** Acceptance 9 («anuncio de la fase con aria-live»).
- **C1 — (humano)** intent y acceptance 2. **C2 — (humano)** acceptance 8 y
  delego_en_agente («reutilizar la validación»); `bankLabel` compartido es (delegado).
  **C3 — (humano)** que_no_quiero + acceptance 10. **C4 — (humano)** acceptance 11; el
  e2e de importación es (delegado, plan aprobado). **C5 — (humano)** que_no_quiero.
  **C6 — (humano)** acceptance 12. **C7 — (delegado, plan aprobado).**
