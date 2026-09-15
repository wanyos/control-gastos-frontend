# Requirements — Feature 14: import-report-details (detalle de lo que conviene revisar)

> Derivado del bloque `intent` de la feature 14 en `feature_list.json` (fuente de
> verdad) y de la sección F14 del plan aprobado por el humano el 2026-09-15. Su
> `acceptance` es un marcador; el propuesto va al final. EARS estricto según
> `docs/specs.md`.
>
> Datos (solo lectura): `../gastos-backend/docs/api-contract.md` →
> `### POST /api/import` (formas de `files[]`, `unparsedRows`, `balanceMismatches`,
> `account.created`, `anchored`, `balancesFilled`, producto y `snapshot`, bloques
> `transfers` y `categorization`) y `### POST /api/category-rules/apply` (forma de
> `conflicts`). Contrastado con `gastos-backend/src/modules/import/import.service.ts`:
> `unparsedCount` de un archivo es siempre `unparsedRows.length`.
>
> **Se construye encima de la F13 (`specs/13-import-dialog/`), sin reabrirla.** Usa
> tal cual: los tipos de `src/features/import/types.ts` (el informe ya se parsea
> entero en la F13), `useImportStore` y su `flow` `finished`, `ImportDialog`,
> `ImportSummary`, `FileIssueList`, `importOutcome` de `outcome.ts`, `BaseDialog`,
> `BaseBadge`, `src/shared/money.ts` y `bankLabel` de `src/shared/banks.ts`.
> **No** cambia el titular, los contadores, la línea de pasadas finales ni la
> lista «Needs attention» de la F13.
>
> **Incoherencia del intent resuelta:** «el titular me lo dice» ya lo entrega la
> F13 (`Imported, with a few things to check`). La F14 no toca el titular: añade
> las secciones de detalle y garantiza (R14) que cuando el titular avisa, hay algo
> visible que lo respalde.

## Cobertura del intent

| Punto del `intent` | Requirements |
|---|---|
| «el titular me lo dice y cada tipo de aviso aparece en su sección plegable» | R1, R2, R14 (titular: F13) |
| «qué filas no se leyeron de cada archivo» | R6 |
| «los descuadres de saldo con las dos cifras y la diferencia» | R4, R5 |
| «los traspasos ambiguos y los conflictos de reglas» | R7, R8 |
| «qué archivos se importaron, con cuántos movimientos, y si se creó una cuenta o un producto nuevo» | R9, R10, R11 |
| «los importes y fechas salen con el formato de la app» | R4, R7, R8, R10, C2 |
| `que_quiero`: «fallos de la detección de traspasos o de la categorización automática» | R3 |
| `que_no_quiero`: «no resolver aquí los traspasos ni los conflictos: solo verlos» | R12 |
| `que_no_quiero`: «no tocar el backend» | C3 |
| `delego_en_agente`: «cómo agrupar y plegar para que el modal no se haga eterno» | R2, R6, R7, R8, R13 |

---

## Estructura

## R1
CUANDO el modal está en la fase `finished`, el sistema DEBE pintar debajo de
`FileIssueList` las secciones de detalle en este orden fijo —fallos de las pasadas
finales, «Balance mismatches», «Unread lines», «Transfers to match», «Category rule
conflicts», «Imported files»— omitiendo cada una que no tenga elementos.

> Verificación: `ImportDetails.spec.ts` — con el fixture completo, los
> `data-test="report-section-<id>"` aparecen en ese orden; con el informe de borde
> «todo limpio» solo existe `imported-files`; con el informe sin archivos no existe
> ninguna. `ImportDialog.spec.ts` — en `finished`, `ImportDetails` va después de
> `FileIssueList`.

## R2
El sistema DEBE pintar cada sección de detalle (salvo los fallos de las pasadas
finales) como un `<details>` cerrado al abrirse el resumen, cuyo `<summary>` muestra
el título y el recuento de la sección.

> Verificación: `ReportSection.spec.ts` — `details` sin atributo `open`; el
> `summary` contiene el título y el número. `ImportDetails.spec.ts` — recuentos del
> fixture: mismatches = `balanceMismatchCount`, unread = `unparsedCount`, transfers =
> `transfers.ambiguousCount`, conflicts = `categorization.conflictCount`, imported =
> archivos con `status: 'imported'`.

## Pasadas finales

## R3
SI `transfers.error` o `categorization.error` no es `null` ENTONCES el sistema DEBE
mostrar, siempre desplegado y por cada fallo, un aviso «Transfer matching didn't
finish» o «Automatic categorization didn't finish» con la frase «Your imported
movements are safe.» y el `message` original plegado en «Details» con `lang="es"`.

> Verificación: `FinalPassAlerts.spec.ts` — solo `transfers.error` → 1 aviso con su
> título; ambos → 2 en ese orden; ninguno → no se pinta nada; el `<details>` de
> «Details» lleva `lang="es"` y el mensaje; el aviso no está dentro de un `<details>`.

## Descuadres

## R4
CUANDO el informe trae `balanceMismatches` en algún archivo, el sistema DEBE
listarlos agrupados por archivo (nombre, banco legible y año) y, por descuadre, la
cuenta (`accountAlias`), la fecha con `formatDate` y las cifras «Calculated»
(`computed`), «In file» (`fromFile`) y «Difference» (`difference`) con `formatMoney`
en `font-mono tabular-nums`.

> Verificación: `BalanceMismatchList.spec.ts` — con el descuadre del contrato
> (`-40.00` / `-20.00` / `-20.00`, `2026-07-21`): textos generados con `formatMoney` y
> `formatDate` (no tecleados); dos archivos con descuadres → dos grupos; las cifras
> llevan `font-mono` y `tabular-nums`.

## R5
El sistema DEBE traducir `check` a un nombre y una explicación en inglés:
`per-line` → «Line-by-line check» / «A line's amount doesn't match how the running
balance changed.»; `statement-balance` → «Statement balance check» / «The balance at
the top of the file doesn't match the saved opening balance plus the movements after
it.»; cualquier otro valor → «Balance check» sin explicación.

> Verificación: `details.spec.ts` — `checkLabel` con los tres casos, textos exactos.

## Filas no leídas

## R6
CUANDO algún archivo (importado o fallido) tiene `unparsedCount > 0`, el sistema DEBE
listar por archivo sus primeras 5 filas como «Line <row>» con su `reason` en
`lang="es"` y, si tiene más, la línea «and N more lines» («and 1 more line» en
singular), con N = `unparsedCount` − 5.

> Verificación: `details.spec.ts` — `unreadLineGroups`: archivo con 3 filas → 3 y
> sin resto; con 6 → 5 y `and 1 more line`; con 42 → 5 y `and 37 more lines`; un
> archivo `failed` con `ALL_ROWS_UNPARSED` también aparece. `UnreadLineList.spec.ts`
> — cada `reason` va en un elemento con `lang="es"`.

## Traspasos y conflictos (solo lectura)

## R7
CUANDO `transfers.ambiguousCount > 0`, el sistema DEBE mostrar la frase «These
movements could be transfers between your accounts, but they couldn't be paired
automatically.» y hasta 10 grupos, cada uno con su `amount` en `formatMoney` y, por
movimiento, fecha (`formatDate`), cuenta, sentido («Out» para `expense`, «In» para
`income`, el valor tal cual si es otro) y `description` en `lang="es"`; con más de 10
grupos, «and N more groups».

> Verificación: `details.spec.ts` — `directionLabel` para `expense`, `income` y
> `neutral`; `AmbiguousTransferList.spec.ts` — el grupo del contrato (3 movimientos,
> `500.00`); 12 grupos → 10 pintados y `and 2 more groups`; `description` con
> `lang="es"`.

## R8
CUANDO `categorization.conflictCount > 0`, el sistema DEBE mostrar la frase «These
movements match rules for different categories, so they were left without one.» y
hasta 10 movimientos, cada uno con fecha (`formatDate`), `description` y, por regla
que compitió, `“<matchText>” → <categoryName>`, con los textos del backend en
`lang="es"`; con más de 10, «and N more movements».

> Verificación: `CategoryConflictList.spec.ts` — el conflicto del contrato (2 reglas,
> «Supermercado» y «Compras»); 11 conflictos → 10 y `and 1 more movement`;
> `description`, `matchText` y `categoryName` dentro de elementos con `lang="es"`.

## Archivos importados

## R9
CUANDO el informe trae archivos `statement` con `status: 'imported'`, el sistema DEBE
listarlos en el orden del informe con nombre, banco legible y año, «<imported> new ·
<duplicates> already imported» y, si `account.created` es `true`, un badge «New
account» con el `alias` de la cuenta.

> Verificación: `ImportedFileList.spec.ts` — el extracto del contrato → `39 new · 2
> already imported`, badge `New account` y `bankinter ···0236`; con `created: false`
> no hay badge; un slug desconocido sale tal cual.

## R10
CUANDO el informe trae archivos `product` con `status: 'imported'`, el sistema DEBE
listarlos con nombre del archivo, banco legible y año, nombre del producto y su tipo
legible (etiqueta de Patrimonio, o el valor tal cual si es desconocido), un badge «New
product» si `product.created` es `true` y «Value as of <fecha>» con `formatDate` si
`snapshot` no es `null`.

> Verificación: `ImportedFileList.spec.ts` — fondo con `snapshot` → `Fund`, `New
> product`, `Value as of` + `formatDate('2026-08-31')`; depósito con `snapshot: null`
> → `Fixed-term deposit` y sin «Value as of»; tipo `crypto` → `crypto`.

## R11
MIENTRAS un extracto importado tiene `anchored: true` o `balancesFilled > 0`, el
sistema DEBE añadir en su fila la nota «Opening balance set from this file» y/o «N
saved balances filled in» («1 saved balance filled in» en singular), sin mostrar los
totales `anchoredCount` ni `balanceFilledCount`.

> Verificación: `ImportedFileList.spec.ts` — `anchored: true` → la nota; `false` →
> no; `balancesFilled: 3` → `3 saved balances filled in`; `1` → singular; `0` → nada.
> `ImportDetails.spec.ts` — el texto del modal no contiene los valores de
> `anchoredCount`/`balanceFilledCount` como contador.

## Transversal

## R12
El sistema NO DEBE ofrecer en las secciones de detalle ningún control de acción ni
enlace (solo los `<summary>` de plegado) ni hacer ninguna petición HTTP al pintarlas o
desplegarlas.

> Verificación: `ImportDetails.spec.ts` — con el fixture completo y todas las
> secciones desplegadas: 0 `button` y 0 `a` dentro de `[data-test="import-details"]`;
> `fetch` mockeado sin llamadas nuevas tras montar y desplegar.

## R13
MIENTRAS el modal está abierto, el sistema DEBE limitar la altura del panel a la del
viewport menos su margen y desplazar solo el cuerpo, de modo que el título y los
botones del pie queden siempre visibles.

> Verificación: `BaseDialog.spec.ts` — el panel lleva las clases de altura máxima y
> columna flexible, y el contenedor del cuerpo `overflow-y-auto`; los tests de la F13
> siguen verdes sin cambios. `e2e/import-dialog.spec.ts` — informe grande (40
> archivos importados, 30 filas no leídas, 12 grupos ambiguos), todas las secciones
> desplegadas, viewport 1280×720: el botón Close `toBeInViewport()` y la altura del
> panel ≤ 720.

## R14
CUANDO `importOutcome(report).headline` es «Imported, with a few things to check»,
el sistema DEBE mostrar al menos una sección de detalle distinta de «Imported files»
o la lista «Needs attention» de la F13.

> Verificación: `ImportDetails.spec.ts` (`it.each`) — un informe por cada condición
> que dispara ese titular en la F13 (`skipped`, `unparsedCount`,
> `balanceMismatchCount`, `ambiguousCount`, `conflictCount`, `transfers.error`,
> `categorization.error`) → existe al menos una de esas secciones o `file-issue`.

---

## Restricciones de cierre (tests existentes, grep o comandos)

- **C1 — Inglés y oscuro.** Todo texto propio en inglés (test: el `text()` de
  `ImportDetails` quitando los nodos `lang="es"` no contiene `línea`, `importe`,
  `cuenta`, `traspaso`); solo alias semánticos; líneas `contrast:` de `design.md` §7
  en `theme-dark.css` y `theme-dark.spec.ts` verde (incluido «no raw colors» sobre
  los `.vue` nuevos).
- **C2 — Formato.** Importes con `formatMoney` y fechas con `formatDate` de
  `src/shared/money.ts`; ningún `Intl.*` ni `Number()` sobre importes en los archivos
  nuevos (grep).
- **C3 — Sin backend ni dependencias.** `git diff package.json` sin entradas nuevas;
  nada fuera de `gastos-frontend/`; `types.ts`, `service.ts`, `store.ts`,
  `outcome.ts`, `summary.ts` y `fileMessages.ts` de la F13 sin cambios.
- **C4 — F13 intacta.** Los tests de la F13 pasan sin editarlos, salvo
  `ImportDialog.spec.ts` (caso nuevo de R1) y `BaseDialog.spec.ts` (caso nuevo de R13).
- **C5 — Puerta.** `pnpm type-check`, `pnpm lint`, `pnpm test:unit`, `pnpm build` y
  `./init.sh` en verde; e2e de humo sin cambios.

---

## Procedencia

- **R1 — (humano)** «cada tipo de aviso aparece en su sección» + `que_quiero` (lista
  de los seis tipos). **(delegado)** el orden fijo (dinero primero: fallos,
  descuadres, filas; luego pasadas globales; archivos al final) y omitir las vacías.
- **R2 — (humano)** «en su sección plegable». **(añadido)** todas cerradas por
  defecto con el recuento en el título → 🔴 1.
- **R3 — (humano)** `que_quiero` «fallos de la detección de traspasos o de la
  categorización» + plan («your imported movements are safe»). **(añadido)** que
  vayan siempre desplegados, no plegados → 🔴 1. Original plegado con `lang="es"`:
  mismo patrón que la F13 (🔴 5 de la F13).
- **R4 — (humano)** «descuadres de saldo con las dos cifras y la diferencia» + «formato
  de la app». **(delegado)** agrupar por archivo y rotular las tres cifras → 🔴 5.
- **R5 — (humano)** plan «tipo de comprobación traducido». **(delegado)** textos
  exactos y el genérico para un `check` futuro (contrato con `check` abierto en F13).
- **R6 — (humano)** «qué filas no se leyeron de cada archivo» + plan («máximo visible y
  and N more»). **(añadido)** el número 5 → 🔴 2; incluir archivos fallidos
  (`ALL_ROWS_UNPARSED` remite a `unparsedRows`) es (delegado, técnico).
- **R7 — (humano)** «los traspasos ambiguos» + `que_no_quiero` «solo verlos».
  **(añadido)** tope de 10 grupos → 🔴 2; frase explicativa y «Out/In» (delegado).
- **R8 — (humano)** «los conflictos de reglas». **(añadido)** tope de 10 → 🔴 2; frase
  y formato de las reglas (delegado).
- **R9 — (humano)** «qué archivos se importaron, con cuántos movimientos, y si se creó
  una cuenta». **(añadido)** la lista va siempre, plegada, también en «Import complete»
  → 🔴 3.
- **R10 — (humano)** «o un producto nuevo». **(delegado)** tipo legible reutilizando
  las etiquetas de Patrimonio y «Value as of» con la fecha de la foto.
- **R11 — (añadido)** el humano no nombró `anchored`/`balancesFilled`; propongo notas
  por archivo y no los totales → 🔴 4.
- **R12 — (humano)** `que_no_quiero` «no resolver aquí los traspasos ni los conflictos:
  solo verlos».
- **R13 — (delegado)** «que el modal no se haga eterno con importaciones grandes»;
  decido cuerpo con scroll y pie fijo, tocando `BaseDialog` de la F13 → 🔴 6.
- **R14 — (humano)** «cuando una importación deja cosas por revisar, el titular me lo
  dice»: el titular es de la F13; este requirement garantiza que lo que anuncia se ve.
- **C1 — (humano)** convenciones (inglés, oscuro, contraste). **C2 — (humano)** «formato
  de la app». **C3 — (humano)** «no tocar el backend» + plan. **C4 — (delegado)**
  construir encima de la F13 sin reabrirla. **C5 — (humano)** puerta del harness.

---

## Acceptance propuesto para feature_list.json

> El leader lo copia al `acceptance` de la feature 14 tras la aprobación.

1. En el resumen final del modal, debajo de la lista «Needs attention» de la F13, aparecen en orden fijo las secciones de detalle con elementos: fallos de las pasadas finales, Balance mismatches, Unread lines, Transfers to match, Category rule conflicts e Imported files; las vacías no se pintan
2. Cada sección (salvo los fallos de las pasadas finales, que van siempre visibles) es plegable, empieza cerrada y muestra su título y su recuento
3. Un fallo de `transfers.error` o `categorization.error` se muestra con «Your imported movements are safe.» y el mensaje original plegado con `lang="es"`
4. Los descuadres muestran cuenta, fecha, cifra calculada, cifra del archivo y diferencia con `money.ts`, y el tipo de comprobación (`per-line` / `statement-balance`) traducido a inglés
5. Las filas no leídas se agrupan por archivo, con un máximo de 5 visibles y «and N more lines»; traspasos ambiguos y conflictos de categoría muestran hasta 10 elementos y «and N more»; los textos del backend van en `lang="es"`
6. La lista de archivos importados muestra por archivo los movimientos nuevos y ya existentes (o el producto, su tipo y la fecha de la foto) y marca «New account» / «New product» cuando se crearon
7. Las secciones son de solo lectura: sin botones ni enlaces de acción y sin llamadas HTTP nuevas
8. Con un informe grande, el modal no supera la altura de la ventana: el cuerpo hace scroll y el título y el botón Close siguen visibles (e2e)
9. Todo en inglés, tema oscuro con tokens semánticos y contraste verificado en `theme-dark.spec`; sin cambios en el backend ni dependencias nuevas; tipos, service y store de la F13 sin cambios
10. `pnpm type-check`, `pnpm lint`, `pnpm test:unit`, `pnpm build` y `./init.sh` terminan en verde
