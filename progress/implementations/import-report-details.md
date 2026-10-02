# Implementación — Feature 14 `import-report-details`

> Informe del implementer (2026-09-15). Spec: `specs/14-import-report-details/` (aprobado por
> el humano el 2026-09-15). Estado en `feature_list.json`: **`in_progress`**, sin cambiar; no se
> marca `done` (lo cierra el flujo tras el reviewer). Sin commit.

## Resumen

Debajo de «Needs attention» (F13), el resultado del modal pinta el detalle del informe en orden
fijo: avisos de pasadas finales (siempre abiertos), y cuatro secciones `<details>` cerradas con
título y recuento —«Balance mismatches», «Unread lines», «Transfers to match», «Category rule
conflicts»— bajo el encabezado «Things to check», y al final «Imported files» (también cerrada).
Las vacías no se pintan. Todo de solo lectura, sin peticiones nuevas. `BaseDialog` limita la
altura del panel a la ventana y solo el cuerpo hace scroll: título y botón Close siempre visibles.
Sin dependencias nuevas, sin tocar backend ni tipos/service/store/outcome/summary/fileMessages de
la F13.

## Tareas

| Task | Estado | Nota |
|---|---|---|
| T0 | [x] | F13 `done` y archivos presentes. `./init.sh` verde antes de tocar nada (31 ficheros, 443 tests, e2e chromium). 3 líneas `contrast:` añadidas; `theme-dark.spec.ts` verde: **no hace falta el plan B** (`--ink-muted on --warning-subtle` llega a 4.5). |
| T1 | [x] | Fixtures añadidos al final de `fixtures.ts` (los de la F13 intactos). El «todo limpio» es el `CLEAN_REPORT` que ya existía. |
| T2 | [x] | `details.ts` + `details.spec.ts` (29 tests). |
| T3 | [x] | `ReportSection.vue` + spec. |
| T4 | [x] | `FinalPassAlerts`, `BalanceMismatchList`, `UnreadLineList` + specs. |
| T5 | [x] | `AmbiguousTransferList`, `CategoryConflictList` + specs. |
| T6 | [x] | `ImportedFileList` + spec. |
| T7 | [x] | `ImportDetails.vue` + spec (orden, R14 `it.each`, solo lectura, inglés). |
| T8 | [x] | `<ImportDetails>` en `finished` tras `FileIssueList`; caso nuevo en `ImportDialog.spec.ts`. |
| T9 | [x] | `BaseDialog.vue` con cuerpo con scroll; caso nuevo en `BaseDialog.spec.ts`. |
| T10 | [x] | e2e «large report» en `e2e/import-dialog.spec.ts`. |
| T11 | [x] | Puerta verde, greps y diffs limpios, revisión visual con capturas (ver *Verificación*). |

## Trazabilidad R<n> / C<n> ↔ test

Rutas: `import/` = `src/features/import/__tests__/`.

- **R1** (orden fijo, vacías fuera) → `import/details.spec.ts:38` «lists every section in the fixed
  order…», `:51` «leaves out the empty sections» (limpio → solo `imported-files`; sin archivos →
  nada); `import/ImportDetails.spec.ts:42` «paints every section in the fixed order», `:83`, `:90`;
  `import/ImportDialog.spec.ts:282` «paints the report detail after the files that need attention».
- **R2** (`<details>` cerrado con título y recuento de los totales) → `import/ReportSection.spec.ts:13`,
  `:22`, `:30`; `import/ImportDetails.spec.ts:56` «starts every foldable section closed with the
  report totals as counts»; `import/details.spec.ts:63` «counts from the totals, not from the listed
  items».
- **R3** (avisos de pasadas finales, siempre desplegados, Details `lang="es"`) →
  `import/FinalPassAlerts.spec.ts:22`, `:33`, `:42`, `:49`, `:62`; `import/details.spec.ts:71`–`:103`;
  `import/ImportDetails.spec.ts:75` «keeps the final pass failures outside any fold».
- **R4** (descuadres por archivo, `formatMoney`/`formatDate`, `font-mono tabular-nums`) →
  `import/BalanceMismatchList.spec.ts:19`, `:42`, `:51`; `import/details.spec.ts:135`.
- **R5** (`checkLabel`) → `import/details.spec.ts:114`, `:121`, `:129`;
  `import/BalanceMismatchList.spec.ts:78`.
- **R6** (5 filas por archivo, «and N more line(s)», fallidos incluidos, `reason` `lang="es"`) →
  `import/details.spec.ts:160` (3), `:171` (6), `:182` (42), `:189` (fallido `ALL_ROWS_UNPARSED`);
  `import/UnreadLineList.spec.ts:12`, `:24`, `:32`.
- **R7** (traspasos ambiguos, tope 10, Out/In, `description` `lang="es"`) →
  `import/details.spec.ts:207`, `:231` (`directionLabel` expense/income/neutral);
  `import/AmbiguousTransferList.spec.ts:45` (grupo del contrato, 3 movimientos, 500,00 €), `:73`,
  `:83` (12 → 10 y `and 2 more groups`).
- **R8** (conflictos, tope 10, reglas, `lang="es"`) → `import/details.spec.ts:216`, `:225`;
  `import/CategoryConflictList.spec.ts:14`, `:30`, `:43` (11 → 10 y `and 1 more movement`).
- **R9** (extractos importados, recuentos, New account + alias, slug desconocido) →
  `import/ImportedFileList.spec.ts:26`, `:41`, `:51`, `:58`; `import/details.spec.ts:243`, `:254`,
  `:275`.
- **R10** (productos: tipo legible o tal cual, New product, Value as of) →
  `import/ImportedFileList.spec.ts:82`, `:93`; `import/details.spec.ts:279`, `:298`.
- **R11** (notas de ancla y saldos rellenados, sin totales) → `import/ImportedFileList.spec.ts:66`;
  `import/details.spec.ts:264`; `import/ImportDetails.spec.ts:140` «does not show the anchored or
  filled balances totals as counters».
- **R12** (solo lectura, sin HTTP) → `import/ImportDetails.spec.ts:123` (todas desplegadas: 0
  `button`, 0 `a`, `fetch` sin llamadas); `import/AmbiguousTransferList.spec.ts:83`,
  `import/CategoryConflictList.spec.ts:43`.
- **R13** (altura máxima, cuerpo con scroll) → `src/shared/components/__tests__/BaseDialog.spec.ts:68`
  «caps the panel to the viewport and scrolls only the body»; `e2e/import-dialog.spec.ts:244`
  «keeps the title and Close in view with a large report fully unfolded» (1280×720, 40 extractos,
  30 filas no leídas, 12 grupos, 11 conflictos, todo desplegado y cuerpo al final: Close y título
  `toBeInViewport()`, panel ≤ 720, cuerpo realmente desbordado, sin errores de consola).
- **R14** (el titular «things to check» siempre tiene respaldo visible) →
  `import/ImportDetails.spec.ts:112` `it.each` sobre los 7 disparadores de `outcome.ts`
  (`THINGS_TO_CHECK_REPORTS`, `fixtures.ts:569`): skipped, unread, mismatch, ambiguous, conflict,
  `transfers.error`, `categorization.error`.
- **C1** (inglés, oscuro, contraste) → `import/ImportDetails.spec.ts:153` (texto propio sin
  `línea`/`importe`/`cuenta`/`traspaso` fuera de `lang="es"`); `src/assets/__tests__/theme-dark.spec.ts`
  verde con las 3 líneas nuevas y «no raw colors» sobre los `.vue` nuevos.
- **C2** → grep sin `Intl.`, `Number(`, `parseFloat`, `parseInt` en `details.ts` y los 9 `.vue` nuevos.
- **C3** → `git diff package.json pnpm-lock.yaml` y de `types.ts`, `service.ts`, `store.ts`,
  `outcome.ts`, `summary.ts`, `fileMessages.ts`: **vacíos**. Nada fuera de `gastos-frontend/`.
- **C4** → tests de la F13 verdes; solo se **añadieron** casos a `ImportDialog.spec.ts` (+19/−0) y
  `BaseDialog.spec.ts` (+20/−0); `fixtures.ts` +181/−0.
- **C5** → ver *Verificación*; `e2e/app-boot.spec.ts` sin cambios.

## Adaptaciones al código real de la F13 (y a lo que el spec no previó)

Ninguna cambia lo que decidió el humano ni lo que ve el usuario respecto a `decisions.md`.

1. **Texto libre vacío (la F13 lo acepta tras su revisión).** Si `transfers.error.message` o
   `categorization.error.message` llegan vacíos, el aviso se pinta igual (título + «Your imported
   movements are safe.») pero **sin «Details»**, igual que hace `fileIssueDetails` en la F13.
   `FinalPassFailure.details` es `string | null` (`details.ts:43`). Test:
   `FinalPassAlerts.spec.ts:62`, `details.spec.ts:103`.
2. **Producto importado sin `product`.** El tipo de la F13 permite `product: null` también con
   `status: 'imported'`; en `ImportedFileRow` de producto, `product` y `typeLabel` son `string | null`
   y la línea de producto no se pinta si falta (`details.ts:207`). El contrato no lo produce; es
   defensivo.
3. **Contenedor de `ImportDetails`.** El design pedía `mt-5`; el bloque `finished` de la F13 ya
   separa sus hijos con `gap-5`, así que `ImportDetails` no lleva margen propio (mismo espacio).
4. **Componente auxiliar `FileHeadingLine.vue`** (no listado en design §1): la cabecera
   «nombre · banco · año» se repetía en tres listas (descuadres, filas no leídas, archivos
   importados); se extrae a un componente tonto en vez de copiarla. Sin lógica.
5. **`productTypeLabel(type)` exportada** (`details.ts:190`): es el guardado con `Set` que describe
   design §3, sacado a función para probar los siete tipos (incluido que `checking`, tipo de cuenta,
   no se etiqueta como producto: el `Set` solo lleva los cinco de producto).
6. **Props de las listas.** El design no fijaba las props de `BalanceMismatchList`,
   `UnreadLineList` e `ImportedFileList`: reciben `report`; `AmbiguousTransferList` recibe
   `transfers` y `CategoryConflictList` `categorization`.
7. **Recuento de `final-passes`.** `DetailSection` exige `title`/`count`; para la sección 1 son
   «Final passes» y el nº de fallos, pero no se pintan (no es plegable).
8. **«and N more» por elementos pintados.** N = contador − elementos visibles. Con el invariante del
   contrato (`unparsedCount === unparsedRows.length`) es exactamente «contador − 5» del spec.
9. **BaseDialog sin pie.** Design §5 no cubría un diálogo sin `footer`: el cuerpo lleva `pb-6` en ese
   caso para conservar el margen inferior. El espacio cuerpo↔pie pasa de `mt-6` a `pt-4` (lo que dice
   §5). Se añaden `data-test="dialog-body"` y `data-test="dialog-footer"`.
10. **Test de C1: palabras enteras.** La lista del spec incluye `importe`, que es subcadena de
    «already **importe**d» y «Your **importe**d movements»: un `toContain` daba falso positivo. El
    test compara palabras completas (`ImportDetails.spec.ts:153`).
11. **e2e: el informe grande se construye en el propio spec**, no se importa de
    `src/features/import/__tests__/fixtures.ts`, porque ese módulo importa `vitest` y rompería
    Playwright (mismo criterio que la F13, que ya definía sus datos en el e2e).
12. **Contraste:** las líneas se añadieron en el bloque *Cards* de `theme-dark.css` (design §7 decía
    «bloque de estados», que no existe).

## Archivos tocados

### Creados

| Archivo | Qué |
|---|---|
| `src/features/import/details.ts` | `moreLabel` `:34`, `finalPassFailures` `:48`, `detailSections` `:69`, `mismatchGroups` `:105`, `checkLabel` `:113`, `unreadLineGroups` `:132`, `visibleAmbiguous` `:147`, `visibleConflicts` `:155`, `directionLabel` `:167`, `productTypeLabel` `:190`, `importedFileRows` `:233` |
| `src/features/import/components/ImportDetails.vue` | orquesta secciones `:5`; encabezado «Things to check» `:3`; avisos `:6` |
| `src/features/import/components/ReportSection.vue:2` | `<details>` cerrado con título y recuento |
| `src/features/import/components/FinalPassAlerts.vue` | avisos `:5`; Details `lang="es"` `:22` |
| `src/features/import/components/BalanceMismatchList.vue` | descuadres por archivo, tres cifras en `<dl>` |
| `src/features/import/components/UnreadLineList.vue` | filas no leídas por archivo |
| `src/features/import/components/AmbiguousTransferList.vue` | traspasos ambiguos |
| `src/features/import/components/CategoryConflictList.vue` | conflictos de categoría |
| `src/features/import/components/ImportedFileList.vue` | archivos importados |
| `src/features/import/components/FileHeadingLine.vue` | cabecera de archivo (adaptación 4) |
| Tests | `import/{details,ReportSection,FinalPassAlerts,BalanceMismatchList,UnreadLineList,AmbiguousTransferList,CategoryConflictList,ImportedFileList,ImportDetails}.spec.ts` |

### Modificados

| Archivo | Cambio |
|---|---|
| `src/features/import/components/ImportDialog.vue:67`, `:160` | `<ImportDetails :report="flow.report" />` tras `FileIssueList` |
| `src/shared/components/BaseDialog.vue:15`, `:18`, `:37`, `:44` | panel `flex max-h-[calc(100dvh-40px)] flex-col`; cabecera `shrink-0 px-6 pt-6 pb-4`; cuerpo `min-h-0 flex-1 overflow-y-auto px-6`; pie `shrink-0 px-6 pt-4 pb-6`. Props, eventos, ARIA y foco sin cambios |
| `src/shared/components/__tests__/BaseDialog.spec.ts:68` | caso R13 |
| `src/features/import/__tests__/ImportDialog.spec.ts:282` | caso R1 |
| `src/features/import/__tests__/fixtures.ts:436` | fixtures F14 (`DETAILS_REPORT` `:443`, `THINGS_TO_CHECK_REPORTS` `:569`, `IMPORTED_FILES_REPORT` `:596`…) |
| `src/assets/theme-dark.css:38-40` | 3 líneas `contrast:` |
| `e2e/import-dialog.spec.ts:244` | escenario «large report» |
| `specs/14-import-report-details/tasks.md` | T0–T11 `[x]` |
| `progress/current.md` | bitácora |

## Verificación (última ejecución, 2026-09-15)

Backend `:3000` y dev server `:5173` del humano **no se pararon ni reiniciaron** (siguen
respondiendo al final). El e2e y `./init.sh` se lanzaron en modo CI contra el build servido en el
puerto libre **8099** (`CI=true E2E_PREVIEW_PORT=8099`), para no reutilizar el `:5173`. **Ningún
`POST /api/import` real**: todo con `fetch` mockeado o `page.route` (con la red de seguridad que
aborta cualquier `/api` no prevista).

| Comando | Resultado |
|---|---|
| `pnpm type-check` | OK |
| `pnpm lint` | OK (exit 0; un `no-shadow` en el e2e nuevo se corrigió) |
| `pnpm test:unit` | **40 ficheros, 529 tests** verdes (antes 31 / 443) |
| `pnpm build` | OK; `index-*.js` 160,36 kB (56,91 kB gzip) |
| `CI=true E2E_PREVIEW_PORT=8099 pnpm test:e2e --project=chromium` | **4/4** verdes (smoke + 2 de la F13 + large report) |
| `CI=true E2E_PREVIEW_PORT=8099 ./init.sh` | exit 0, `[OK] Entorno listo` |
| `npx prettier --check src e2e` | OK |
| grep `Intl.`/`Number(`/`parseFloat`/`parseInt` en archivos nuevos | vacío |
| `grep -rn "fetch(" src --include=*.vue` | vacío |
| `git diff package.json pnpm-lock.yaml` y 6 módulos F13 | vacío |

Salida final de `./init.sh` (resumen):

```
[OK]    feature_list.json válido (14 features)
[OK]    Specs presentes para features sdd con estado no-pending
[OK]    Type check OK (tsc sin errores)
 Test Files  40 passed (40)
      Tests  529 passed (529)
[OK]    Todos los tests pasan
[OK]    E2E smoke verde (chromium)
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**Revisión visual:** capturas en Chromium a 1280×720 con `vite preview` en el puerto libre 8098
(parado al terminar) y la API mockeada, con un informe inventado parecido al real (revolut con 33
duplicados, 1 conflicto, fallo de traspasos): secciones cerradas con badge ámbar; desplegadas, filas
en `surface-sunken`, cifras en mono, badges verdes «New account»/«New product», «Value as of 31 Aug
2026»; el título y Close quedan fijos mientras el cuerpo se desplaza. Capturas fuera del repo.

## Lo que no se pudo probar

- **Informe real del backend** pintado por la F14: no se ejecutó `POST /api/import` real (prohibido).
  Los datos de prueba son inventados con la forma del contrato. Si el humano quiere verlo con datos
  reales, hace falta una importación real con su visto bueno (mismos efectos que en la F13: mueve
  archivos en Drive y recalcula traspasos y categorías), idealmente con un archivo ya importado.
- e2e en Firefox/WebKit (la puerta solo exige chromium). Lector de pantalla real: no.

## Sugerencias fuera de scope (no aplicadas)

1. **`docs/architecture.md`**: el árbol de `features/import/components/` y `details.ts` no recoge los
   componentes nuevos de la F14; conviene actualizarlo al cerrar.
2. **Recorte de contornos de foco en el cuerpo con scroll**: el `overflow-y-auto` puede recortar
   1–2 px del contorno de foco de un `<summary>` pegado al borde superior del cuerpo. No se aprecia
   en las capturas; si molesta, un `py-0.5` en el cuerpo lo evita.
3. **Separadores accesibles**: en filas como «Line 42 · motivo» o «fecha · cuenta · Out · texto» la
   separación visual la da `gap`; un lector de pantalla puede leer los fragmentos seguidos. Podría
   añadirse texto oculto o puntuación si se revisa accesibilidad de lectura.
