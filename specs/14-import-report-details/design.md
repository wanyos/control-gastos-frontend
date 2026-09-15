# Design — Feature 14: import-report-details

> Cómo se construye. Se apoya en `docs/architecture.md` (componentes tontos, lógica
> pura fuera de los `.vue`), `docs/conventions.md` (inglés, solo oscuro con tokens
> semánticos y líneas `contrast:`, cifras con `money.ts`) y, sobre todo, en el
> diseño de la F13 (`specs/13-import-dialog/design.md`), del que esta feature es una
> capa encima. Aquí van solo las piezas nuevas y los dos puntos donde toca código de
> la F13.

## 0. Punto de partida (lo que ya deja la F13)

- `src/features/import/types.ts` con el informe **completo** parseado: `ImportReport`,
  `FileReport` (`StatementFileReport` | `ProductFileReport` | `SkippedFileReport`),
  `BalanceMismatch`, `UnparsedRow`, `TransferDetection`, `AmbiguousMovement`,
  `Categorization`, `CategoryConflict`, `FileError`. **No se añade ni cambia ningún
  tipo**: esta feature solo los lee.
- `ImportDialog.vue` pinta en `finished` → `ImportSummary` + `FileIssueList`.
- `importOutcome` (titular, incluido `Imported, with a few things to check`),
  `bankLabel`, `formatMoney`, `formatDate`, `BaseBadge`, `BaseDialog`.
- Si al empezar la F14 la F13 no está `done`, **se para** (T0): no se construye sobre
  un spec sin implementar.

## 1. Archivos

### Se crean

| Archivo | Qué es |
|---|---|
| `src/features/import/details.ts` | Lógica pura: visibilidad y recuentos de secciones, agrupaciones, textos y plurales (§3). |
| `src/features/import/components/ImportDetails.vue` | Orquesta las secciones en orden (R1); `data-test="import-details"`. |
| `src/features/import/components/ReportSection.vue` | `<details>` genérico con título + recuento en el `<summary>` (R2). |
| `src/features/import/components/FinalPassAlerts.vue` | Avisos de `transfers.error` / `categorization.error` (R3). |
| `src/features/import/components/BalanceMismatchList.vue` | R4, R5. |
| `src/features/import/components/UnreadLineList.vue` | R6. |
| `src/features/import/components/AmbiguousTransferList.vue` | R7. |
| `src/features/import/components/CategoryConflictList.vue` | R8. |
| `src/features/import/components/ImportedFileList.vue` | R9, R10, R11. |
| Tests | `src/features/import/__tests__/{details,ImportDetails,ReportSection,FinalPassAlerts,BalanceMismatchList,UnreadLineList,AmbiguousTransferList,CategoryConflictList,ImportedFileList}.spec.ts`. |

### Se modifican

| Archivo | Cambio |
|---|---|
| `src/features/import/components/ImportDialog.vue` | En `finished`, `<ImportDetails :report="flow.report" />` detrás de `FileIssueList`. Nada más. |
| `src/shared/components/BaseDialog.vue` | Altura máxima del panel y cuerpo con scroll (§5). Sin cambios de props, eventos ni ARIA. |
| `src/shared/components/__tests__/BaseDialog.spec.ts` | Caso nuevo de R13; los existentes intactos. |
| `src/features/import/__tests__/ImportDialog.spec.ts` | Caso nuevo de R1 (orden `FileIssueList` → `ImportDetails`). |
| `src/features/import/__tests__/fixtures.ts` | Informes nuevos: «todo limpio», uno por disparador de R14, conflictos y grupos por encima del tope, archivo con 42 filas no leídas, informe grande para el e2e. Los existentes no se tocan. |
| `src/assets/theme-dark.css` | Solo líneas `contrast:` nuevas (§7). |
| `e2e/import-dialog.spec.ts` | Escenario nuevo «informe grande» (R13). |

No se tocan: `types.ts`, `service.ts`, `store.ts`, `outcome.ts`, `summary.ts`,
`fileMessages.ts` de la F13, `src/assets/styles/`, `design-system/`, `package.json`,
`../gastos-backend/`.

## 2. Orden y visibilidad de secciones (R1, R2, R14)

| # | `id` (`data-test="report-section-<id>"`) | Visible si | Recuento del `summary` | Plegable |
|---|---|---|---|---|
| 1 | `final-passes` | `transfers.error !== null \|\| categorization.error !== null` | — | **No**, siempre visible |
| 2 | `mismatches` · «Balance mismatches» | `balanceMismatchCount > 0` | `balanceMismatchCount` | Sí, cerrada |
| 3 | `unread` · «Unread lines» | `unparsedCount > 0` | `unparsedCount` | Sí, cerrada |
| 4 | `transfers` · «Transfers to match» | `transfers.ambiguousCount > 0` | `ambiguousCount` | Sí, cerrada |
| 5 | `conflicts` · «Category rule conflicts» | `categorization.conflictCount > 0` | `conflictCount` | Sí, cerrada |
| 6 | `imported-files` · «Imported files» | hay archivos con `status: 'imported'` | nº de esos archivos | Sí, cerrada |

- Las secciones 1-5 van bajo un encabezado `h3` «Things to check» que solo se pinta si
  alguna de ellas es visible. «Imported files» va aparte, al final: no es un aviso.
- **Recuentos de los totales del informe, elementos de los arrays.** El `summary` usa
  los contadores (lo mismo que ya usa el titular de la F13, así nunca discrepan); los
  «and N more» se calculan como contador − elementos pintados.
- **R14 por construcción:** los disparadores del titular «things to check» en la F13 son
  `S > 0` (lo pinta `FileIssueList`), `unparsedCount`, `balanceMismatchCount`,
  `ambiguousCount`, `conflictCount` (secciones 3, 2, 4, 5, con la misma condición) y
  los dos `error` (sección 1). El test `it.each` lo fija para que un cambio futuro de
  `outcome.ts` no deje un titular sin respaldo.
- `ReportSection.vue`: `defineProps<{ id: string; title: string; count: number; tone?: 'warning' | 'neutral' }>()`;
  `<details :data-test="`report-section-${id}`">` sin `open`; `<summary>` con el título
  (`text-ink-strong font-semibold`) y `BaseBadge size="sm"` con el número (`warning`
  para 2-5, `neutral` para 6). Marcador nativo del `summary` conservado (accesible,
  sin JS). El `<summary>` ya entra en la trampa de foco de `BaseDialog` (F13 §8).
- **Alternativa descartada:** acordeón propio con `button` + `aria-expanded`. Más código
  y más estado para lo que `<details>` hace nativo; la F13 ya usa `<details>` en
  `PendingList` y «Details».

## 3. Lógica pura (`details.ts`)

```ts
export const UNREAD_LINES_VISIBLE = 5
export const LIST_ITEMS_VISIBLE = 10

export type DetailSectionId = 'final-passes' | 'mismatches' | 'unread' | 'transfers' | 'conflicts' | 'imported-files'
export interface DetailSection { id: DetailSectionId; title: string; count: number }
export function detailSections(report: ImportReport): DetailSection[]      // §2, in order, only visible ones

export interface FinalPassFailure { id: 'transfers' | 'categorization'; title: string; details: string }
export function finalPassFailures(report: ImportReport): FinalPassFailure[]

export interface FileHeading { name: string; bank: string; year: string }   // bank already through bankLabel
export function mismatchGroups(report: ImportReport): { file: FileHeading; mismatches: BalanceMismatch[] }[]
export function checkLabel(check: string): { name: string; explanation: string | null }

export function unreadLineGroups(report: ImportReport):
  { file: FileHeading; rows: UnparsedRow[]; more: string | null }[]       // rows ≤ 5

export function visibleAmbiguous(t: TransferDetection): { groups: TransferDetection['ambiguous']; more: string | null }
export function visibleConflicts(c: Categorization): { conflicts: CategoryConflict[]; more: string | null }
export function directionLabel(type: string): string                     // expense → Out, income → In, else raw

export type ImportedFileRow =
  | { kind: 'statement'; file: FileHeading; counts: string; newAccount: string | null; notes: string[] }
  | { kind: 'product'; file: FileHeading; product: string; typeLabel: string; isNew: boolean; valueAsOf: string | null }
export function importedFileRows(report: ImportReport): ImportedFileRow[]

export function moreLabel(hidden: number, singular: string, plural: string): string | null  // 0 → null
```

- **Textos exactos** (inglés):
  - Pasadas finales: `Transfer matching didn't finish` / `Automatic categorization didn't finish`;
    cuerpo común `Your imported movements are safe.`; `details` = `error.message`.
  - `checkLabel`: `per-line` → `Line-by-line check` + `A line's amount doesn't match how the running balance changed.`;
    `statement-balance` → `Statement balance check` + `The balance at the top of the file doesn't match the saved opening balance plus the movements after it.`;
    otro → `Balance check`, `null`.
  - Más: `and 1 more line` / `and N more lines`; `and 1 more group` / `and N more groups`;
    `and 1 more movement` / `and N more movements`.
  - Frases de sección: transfers → `These movements could be transfers between your accounts, but they couldn't be paired automatically.`;
    conflicts → `These movements match rules for different categories, so they were left without one.`
  - Extracto: `counts` = `<imported> new · <duplicates> already imported`; `newAccount` =
    `account.alias` si `account.created`; `notes`: `Opening balance set from this file`
    (si `anchored`), `1 saved balance filled in` / `N saved balances filled in` (si
    `balancesFilled > 0`).
  - Producto: `typeLabel` = `holdingTypeLabel(type)` de `@/features/net-worth/issues`
    si `type` es uno de sus siete tipos conocidos, si no el valor tal cual;
    `valueAsOf` = `Value as of ${formatDate(snapshot.date)}` o `null`.
- `unreadLineGroups` recorre `files` en orden, toma los `statement` (importados **y**
  fallidos) con `unparsedCount > 0`; `more` = `moreLabel(unparsedCount − 5, …)`.
- `mismatchGroups` recorre los `statement` con `balanceMismatches.length > 0`.
- `importedFileRows` recorre `files` con `status === 'imported'` en orden del informe.
- Importes y fechas **solo** con `formatMoney` / `formatDate` (C2). Ninguna aritmética de
  importes: `difference` llega calculada del backend y se pinta tal cual.
- **Dependencia entre features:** `details.ts` importa `holdingTypeLabel` de net-worth
  (mismo sentido que la dependencia import → net-worth de la F13). Se guarda con un
  `Set` de tipos conocidos para no forzar el tipo cerrado de net-worth sobre el texto
  abierto del informe.
- **Alternativa descartada:** calcular estos datos dentro de los `.vue`. Viola
  «componentes tontos» y obliga a probar textos y plurales montando componentes.

## 4. Componentes de la feature

Todos reciben datos por props y no emiten eventos. Filas en
`rounded-md bg-surface-sunken px-3 py-2`; textos secundarios `text-ink-muted text-sm`.

- **`ImportDetails.vue`**: `defineProps<{ report: ImportReport }>()`; recorre
  `detailSections(report)` y pinta cada lista dentro de su `ReportSection` (la 1, sin
  él). Contenedor `data-test="import-details"`, `mt-5 flex flex-col gap-3`.
- **`FinalPassAlerts.vue`**: `defineProps<{ failures: FinalPassFailure[] }>()`; por fallo
  un bloque sin `role` propio (el titular ya se anuncia por la región `aria-live` de la
  F13 y un segundo anuncio lo duplicaría); `rounded-md bg-warning-subtle p-3`, icono
  `TriangleAlert` `text-warning` `aria-hidden`, título `text-warning font-semibold`,
  cuerpo `text-ink-body`, `<details><summary>Details</summary><p lang="es">…</p></details>`
  como en `FileIssueList` (F13 §7). `data-test="final-pass-failure"`.
- **`BalanceMismatchList.vue`**: por grupo, cabecera `name` (`font-mono text-sm`) +
  `bank · year`; por descuadre (`data-test="balance-mismatch"`): `accountAlias · fecha`,
  nombre de la comprobación (`text-ink-strong`) y su explicación (`text-ink-muted`), y
  una `<dl>` de tres pares en columna (`grid grid-cols-[auto_1fr] gap-x-3`):
  `Calculated`, `In file`, `Difference`, cifras `font-mono tabular-nums text-ink-strong
  text-right`. En columna, no en fila: caben en los 440 px del panel sin ensancharlo.
- **`UnreadLineList.vue`**: por grupo (`data-test="unread-group"`), cabecera de archivo y
  `<ul>` de filas `Line 42` (`font-mono`) + `<span lang="es">{{ reason }}</span>`; `more`
  al final en `text-ink-muted`.
- **`AmbiguousTransferList.vue`**: frase de sección; por grupo
  (`data-test="ambiguous-group"`) cabecera con `formatMoney(amount)` en `font-mono`, y
  `<ul>` de movimientos: fecha · alias · `BaseBadge size="sm" tone="neutral"` con
  `Out`/`In` · `<span lang="es">{{ description }}</span>`.
- **`CategoryConflictList.vue`**: frase de sección; por conflicto
  (`data-test="category-conflict"`) fecha · `<span lang="es">{{ description }}</span>` y
  `<ul>` de reglas `<li><span lang="es">“{{ matchText }}”</span> → <span lang="es">{{ categoryName }}</span></li>`.
- **`ImportedFileList.vue`**: `<ul>` de `ImportedFileRow` (`data-test="imported-file"`).
  Extracto: nombre, `bank · year`, `counts` en `font-mono tabular-nums`, badge
  `positive` `New account` + alias, notas en `text-ink-muted`. Producto: nombre,
  `bank · year`, `product · typeLabel`, badge `positive` `New product` si `isNew`,
  `valueAsOf`.
- **Qué va con `lang="es"`:** los textos que escribe el backend o el usuario en español:
  `reason`, `error.message`, `description`, `matchText`, `categoryName`. **No** los
  alias de cuenta (`bankinter ···0236`, generados) ni los nombres de archivo o de
  producto (identificadores).
- **Iconos:** solo `TriangleAlert` (ya confirmado en la F13).

## 5. Altura del modal (R13) — cambio en `BaseDialog.vue`

La F13 deja el panel con `p-6` y sin límite de altura: un informe con varias secciones
desplegadas empuja el pie fuera de la pantalla. Cambio mínimo, sin tocar la API del
componente:

- Scrim: se mantiene `p-5` (20 px por lado).
- Panel: añade `flex max-h-[calc(100dvh-40px)] flex-col` y pasa el `p-6` a sus hijos.
- Cabecera (título + X): `shrink-0 px-6 pt-6`.
- Cuerpo (slot default): `min-h-0 flex-1 overflow-y-auto px-6` (con `data-test="dialog-body"`).
- Pie (slot footer): `shrink-0 px-6 pb-6 pt-4`.
- El foco y la trampa no cambian: los `<summary>` dentro del cuerpo con scroll siguen
  en la lista de enfocables; el navegador desplaza al enfocar.
- Tests: `BaseDialog.spec.ts` comprueba las clases (jsdom no maqueta); el e2e mide el
  resultado real en Chromium.
- **Alternativa descartada:** ensanchar el panel (`w-[600px]`) solo en `finished`. El
  salto de anchura entre fases es brusco y no resuelve la altura; las cifras de un
  descuadre caben en 440 px apiladas (§4).
- **Alternativa descartada:** mostrar el informe en una página propia. Reabre la
  decisión de la F13 de retirar `/import` y deja el informe fuera del modal.

## 6. Datos que no se muestran y por qué

- `anchoredCount` y `balanceFilledCount`: el detalle por archivo (R11) ya lo dice y con
  contexto; un contador suelto «1 anchored» no se entiende (🔴 4).
- `account.appliedDefaults`, `account.balanceAnchor`, `account.iban`, `snapshot.created`,
  `movedToProcessed`, `fileId`, ids de movimiento, cuenta y regla: datos técnicos sin
  acción posible en esta feature (no se resuelve nada).
- `categorization.unmatched`: no es un aviso (movimientos sin regla, pendientes de la
  E6); la F13 tampoco lo pinta.

## 7. Contraste: líneas `contrast:` nuevas en `theme-dark.css`

Se añaden al bloque de estados; T0 las confirma con el test:

```
contrast: --ink-strong on --surface-sunken >= 4.5 (import report: figures and headings inside a report row)
contrast: --ink-body on --warning-subtle >= 4.5 (import report: final pass failure body)
contrast: --ink-muted on --warning-subtle >= 4.5 (import report: Details summary inside a failure)
```

- Ya medidos y reutilizados (no se duplican): `--ink-body on --surface-sunken` (texto de
  fila), `--ink-muted on --surface-sunken` (F13), `--positive on --positive-subtle`
  (badges `New account`/`New product`), `--warning on --warning-subtle` (título e icono
  del aviso, badges de recuento), `--ink-strong on --surface-card` (títulos del
  `summary`).
- Si `--ink-muted on --warning-subtle` no llega a 4.5, el «Details» del aviso usa
  `text-ink-body` y esa línea no se añade; se anota en el informe.

## 8. e2e

`e2e/import-dialog.spec.ts`, escenario nuevo «large report» (chromium en `./init.sh`):
`page.route` de `/api/import` con el informe grande de `fixtures` (40 extractos
importados, un archivo con 30 filas no leídas, 12 grupos ambiguos, 11 conflictos);
viewport 1280×720; tras `finished`, se despliegan todos los `summary`, se desplaza el
cuerpo al final y se comprueba `expect(close).toBeInViewport()` y
`panel.boundingBox().height <= 720`. Sin errores de consola. Los escenarios de la F13 no
se tocan.
