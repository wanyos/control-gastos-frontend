# Design — Feature 13: import-dialog

> Cómo se construye. Se apoya en `docs/architecture.md` (vista → store → service,
> componentes tontos, tipos propios) y `docs/conventions.md` (inglés, solo oscuro con
> tokens semánticos y líneas `contrast:`, Lucide por nombre, sin `@apply`). Aquí van
> solo los puntos donde la feature roza esas reglas y las decisiones propias. El
> patrón de referencia es `src/features/net-worth/`.

## 1. Archivos

### Se crean

| Archivo | Qué es |
|---|---|
| `src/shared/validation.ts` | `createValidators(context)`: los validadores privados de `net-worth/service.ts`, extraídos con los mismos mensajes. |
| `src/shared/banks.ts` | `bankLabel(slug)` y su mapa, movidos desde `net-worth/breakdown.ts`. |
| `src/shared/components/BaseButton.vue` | Port de `design-system/components/forms/Button.jsx` (variantes `primary`/`secondary`/`ghost`, tamaños `sm`/`md`, `loading`). |
| `src/shared/components/BaseSpinner.vue` | El `Spinner` interno de `Button.jsx`, suelto y reutilizable. |
| `src/shared/components/BaseDialog.vue` | Modal hecho a mano a partir de `AddModal` (`ui_kits/web/App.jsx`): Teleport, scrim, panel, título, X (port de `IconButton` ghost), trampa de foco, `dismissible`. |
| `src/features/import/types.ts` | Tipos de pendientes, del informe completo y la unión `ImportFlow`. |
| `src/features/import/service.ts` | `getPendingFiles`, `runImport`, `parsePendingFiles`, `parseImportReport`, `isDriveError`. |
| `src/features/import/store.ts` | `useImportStore`: `pending`, `flow`, `isImporting`, `refreshPending`, `open`, `start`, `close`, `retry`. |
| `src/features/import/outcome.ts` | Titular y tono del resultado (puro). |
| `src/features/import/fileMessages.ts` | Explicación en inglés por `error.code` y para `skipped` (puro). |
| `src/features/import/summary.ts` | Contadores, línea de pasadas finales, frase de revisión, textos de fase (puro). |
| `src/features/import/components/ImportButton.vue` | Aviso + botón de la barra; monta `ImportDialog`; `refreshPending()` al montar. |
| `src/features/import/components/ImportDialog.vue` | Orquesta las fases sobre `BaseDialog` según `store.flow`. |
| `src/features/import/components/ImportPhases.vue` | Las dos fases (Check Drive · Import files) con su estado. |
| `src/features/import/components/PendingList.vue` | Lista banco → año → archivos, plegable. |
| `src/features/import/components/ImportSummary.vue` | Titular, contadores, línea final, frase de revisión. |
| `src/features/import/components/FileIssueList.vue` | «Needs attention»: fallidos y omitidos con «Details». |
| Tests | `src/shared/__tests__/validation.spec.ts`, `banks.spec.ts`; `src/shared/components/__tests__/BaseDialog.spec.ts` y casos nuevos en `BaseComponents.spec.ts` (`BaseButton`, `BaseSpinner`); `src/features/import/__tests__/{fixtures,service,store,outcome,fileMessages,summary,ImportButton,ImportDialog,PendingList,ImportSummary,FileIssueList}.spec.ts` (`fixtures.ts` sin `.spec`); `e2e/import-dialog.spec.ts`. |

### Se modifican

| Archivo | Cambio |
|---|---|
| `src/shared/errors.ts` | `ApiError` gana `readonly apiCode?: string` (opción del constructor). `code` sigue siendo `API_HTTP`/`API_NETWORK`. |
| `src/services/http.ts` | `readErrorMessage` pasa a `readErrorBody` → `{ message, apiCode }`; el `message` del `ApiError` no cambia (`HTTP 503: <message>`). |
| `src/services/__tests__/http.spec.ts` | Casos nuevos de `apiCode` (R13); los existentes intactos. |
| `src/features/net-worth/service.ts` | Borra sus validadores privados y usa `createValidators(\`GET ${NET_WORTH_PATH}\`)`. Sin cambio de comportamiento. |
| `src/features/net-worth/breakdown.ts` | Borra `BANK_LABELS`/`bankLabel` y añade `export { bankLabel } from '@/shared/banks'` (los imports existentes siguen valiendo). |
| `src/shared/components/AppTopBar.vue` | Zona de acciones a la derecha: `<div class="ml-auto flex items-center gap-3"><slot name="actions" /></div>`. |
| `src/shared/components/AppShell.vue` | `<AppTopBar><template #actions><ImportButton /></template></AppTopBar>`. |
| `src/router/index.ts` | Se elimina la ruta `/import` y el import de `FileUp` (lo usa ahora `ImportButton`). |
| `src/router/__tests__/router.spec.ts` | 4 rutas navegables; `/import` fuera de `paths`, `it.each` y `navEntries`; caso nuevo «`/import` no resuelve». |
| `src/shared/components/__tests__/AppShell.spec.ts` | El test «moves the active mark…» usa `/investments` en lugar de `/import`; caso nuevo: el botón Import está en `header` (R1). El `fetch` pendiente que ya mockea cubre el GET de pendientes. |
| `src/assets/theme-dark.css` | Solo líneas `contrast:` nuevas (§9). |
| `e2e/app-boot.spec.ts` | `page.route('**/api/ingestion/pending', …)` con `{ totalPending: 0, banks: [] }`. |
| `docs/architecture.md`, `docs/stack.md` | `shared/validation.ts`, `shared/banks.ts`, componentes base nuevos; nota del icono `FileUp` que pasa del router a la barra. |

No se tocan: `src/assets/styles/`, `design-system/`, `package.json`,
`src/features/net-worth/__tests__/`, `../gastos-backend/`.

## 2. Frontera HTTP: `apiCode` y POST sin cuerpo

```ts
// src/shared/errors.ts
export class ApiError extends AppError {
  readonly status?: number
  /** The backend's stable `code` (e.g. DRIVE_CONNECTION_ERROR), when the body carries one. */
  readonly apiCode?: string
  constructor(message: string, code: string,
    options?: { status?: number; apiCode?: string; cause?: unknown })
}
```

- `http.ts` lee `code` del cuerpo solo si es string no vacío; si el cuerpo no es JSON,
  `apiCode` queda `undefined`. Red → `undefined`.
- **Por qué `apiCode` y no reutilizar `code`:** `code` es el vocabulario de la app
  (`API_HTTP`, `API_NETWORK`, `VALIDATION`, `UNKNOWN`) y `formatError` y los tests de
  net-worth lo usan; sobrescribirlo con el del backend rompería ese contrato interno
  (acceptance 8: «sin cambiar el comportamiento actual»).
- **POST sin cuerpo:** `runImport` llama `client('/api/import', { method: 'POST' })`.
  `http.ts` solo añade `Accept`; con `body` indefinido `fetch` no envía
  `Content-Type`. No se añade nada a `http.ts` para esto; lo fija `service.spec.ts`
  y lo confirma el e2e en navegador real.
- **Sin timeout:** el POST es síncrono y puede tardar; `http.ts` no tiene timeout y no
  se le añade (si el navegador corta, llega como `API_NETWORK` → R11).

## 3. Validación compartida

```ts
// src/shared/validation.ts
type RawObject = Record<string, unknown>
export interface Validators {
  reject(path: string, expected: string): never
  asObject(value: unknown, path: string): RawObject
  asArray(value: unknown, path: string): unknown[]
  asText(value: unknown, path: string): string            // non-empty
  asInteger(value: unknown, path: string): number
  asFlag(value: unknown, path: string): boolean
  asDecimal(value: unknown, path: string): string          // /^-?\d+\.\d{2}$/
  asNullableDecimal(value: unknown, path: string): string | null
  asDateOnly(value: unknown, path: string): string          // YYYY-MM-DD
  asNullableDateOnly(value: unknown, path: string): string | null
  asMember<T extends string>(value: unknown, allowed: readonly T[], path: string): T
}
/** Messages read `${context}: ${path} is not ${expected}`, exactly as net-worth had them. */
export function createValidators(context: string): Validators
```

- Mensajes **idénticos** a los de hoy (`a non-empty string`, `an integer`, `a decimal
  string with two decimals`, `a YYYY-MM-DD date`, `one of a | b`…): los tests de
  net-worth (`/total is not a decimal string/`, `/products\[0\]\.type/`) pasan sin
  tocarlos. Lanzan `ValidationError`.
- Contextos: `GET /api/net-worth`, `GET /api/ingestion/pending`, `POST /api/import`.
- `DecimalString` y `DateOnly` siguen siendo alias de `string` de cada feature
  (`import/types.ts` declara los suyos): los tipos son propios por feature.
- **Alternativa descartada:** librería de schemas (Zod). Con tres endpoints aún no
  paga la dependencia (ADR-004 sigue en pie) y C5 la prohíbe en esta feature.

## 4. Tipos (`src/features/import/types.ts`)

```ts
export type DecimalString = string
export type DateOnly = string

// GET /api/ingestion/pending
export interface PendingFile { fileId: string; name: string }
export interface PendingYear { year: string; pendingCount: number; pending: PendingFile[] }
export interface PendingBank { bank: string; years: PendingYear[] }
export interface PendingFiles { totalPending: number; banks: PendingBank[] }

// POST /api/import — parsed whole; F13 paints part of it, F14 the rest.
export interface FileError { code: string; message: string }    // code: open text

interface FileReportBase { bank: string; year: string; fileId: string; name: string; movedToProcessed: boolean }

export interface ImportAccount {
  id: number; iban: string; bank: string; alias: string
  type: string                                                    // open text
  created: boolean; appliedDefaults: { alias: boolean; type: boolean }
  balanceAnchor: DecimalString | null
}
export interface UnparsedRow { row: number; reason: string }
export interface BalanceMismatch {
  accountId: number; accountAlias: string; date: DateOnly
  computed: DecimalString; fromFile: DecimalString; difference: DecimalString
  check: string                                                   // open text
}
export interface StatementFileReport extends FileReportBase {
  kind: 'statement'; status: 'imported' | 'failed'
  account: ImportAccount | null
  imported: number; duplicates: number; anchored: boolean; balancesFilled: number
  unparsedCount: number; unparsedRows: UnparsedRow[]; balanceMismatches: BalanceMismatch[]
  error: FileError | null                                         // absent in JSON → null
}
export interface ImportProduct { id: number; bank: string; name: string; type: string; created: boolean }
export interface ProductFileReport extends FileReportBase {
  kind: 'product'; status: 'imported' | 'failed'
  product: ImportProduct | null                                   // null when it failed
  snapshot: { date: DateOnly; created: boolean } | null           // null in a deposit or a failure
  error: FileError | null
}
export interface SkippedFileReport extends FileReportBase { kind: 'skipped'; status: 'skipped'; reason: string }
export type FileReport = StatementFileReport | ProductFileReport | SkippedFileReport

export interface AmbiguousMovement {
  id: number; accountId: number; accountAlias: string
  type: string; bookingDate: DateOnly; description: string
}
export interface TransferDetection {
  pairsCreated: number; ambiguousCount: number
  ambiguous: { amount: DecimalString; movements: AmbiguousMovement[] }[]
  error: FileError | null
}
export interface CategoryConflict {
  movementId: number; description: string; bookingDate: DateOnly
  matches: { ruleId: number; matchText: string; categoryId: number; categoryName: string }[]
}
export interface Categorization {
  categorized: number; conflictCount: number; conflicts: CategoryConflict[]
  unmatched: number; error: FileError | null
}
export interface ImportReport {
  importedCount: number; duplicateCount: number; unparsedCount: number
  failedCount: number; skippedCount: number; balanceMismatchCount: number
  importedProductCount: number; anchoredCount: number; balanceFilledCount: number
  files: FileReport[]; transfers: TransferDetection; categorization: Categorization
}

// The dialog's state machine (§5)
export type FailureKind = 'drive' | 'server'
export type ImportFlow =
  | { step: 'closed' }
  | { step: 'checking' }
  | { step: 'upToDate' }
  | { step: 'confirm'; pending: PendingFiles }
  | { step: 'importing'; fileCount: number }
  | { step: 'finished'; report: ImportReport }
  | { step: 'checkFailed'; kind: FailureKind; error: AppError }
  | { step: 'importFailed'; kind: FailureKind; error: AppError }
  | { step: 'reportUnreadable'; error: AppError }
```

**Discriminación de `files[]` (orden fijo):** `status === 'skipped'` → `skipped`
(`reason` obligatorio); si el objeto **tiene la clave** `product` (`'product' in raw`,
aunque valga `null`) → `product`; si no → `statement`. `status` es estricto
(`asMember`); `code`, `check` y los `type` son texto abierto (`asText`), para que un
código o un tipo nuevo del backend no tumbe el informe. `error` ausente → `null`;
presente → `{ code: asText, message: asText }`. `transfers.error` y
`categorization.error` igual. Un 200 que no pasa esto lanza `ValidationError` →
`reportUnreadable`.

**Alternativa descartada:** parsear solo lo que pinta la F13. Obligaría a la F14 a
reabrir el service y sus tests; parsearlo entero ahora detecta la deriva del contrato
en la primera importación real.

## 5. Store y máquina de estados (`src/features/import/store.ts`)

```ts
export const useImportStore = defineStore('import', () => {
  const pending = ref<PendingFiles | null>(null)     // null: unknown or last query failed
  const flow = ref<ImportFlow>({ step: 'closed' })
  const isImporting = computed(() => flow.value.step === 'importing')
  async function refreshPending(client?: HttpClient): Promise<void>  // never throws; failure → pending = null
  async function open(client?: HttpClient): Promise<void>            // only from 'closed'
  async function start(client?: HttpClient): Promise<void>           // only from 'confirm'
  function close(): void                                             // no-op while 'importing'
  async function retry(client?: HttpClient): Promise<void>           // only from 'checkFailed' | 'importFailed'
  return { pending, flow, isImporting, refreshPending, open, start, close, retry }
})
```

```
closed ──open()──► checking ──GET ok, total 0──► upToDate ──close()──► closed
                      │     └─GET ok, total >0─► confirm ──close()──► closed
                      │                            │
                      └─GET fails─► checkFailed    └─start()─► importing ──200 valid──► finished
                                     │  └─retry()─► checking        │  ├─HTTP/network──► importFailed ─retry()─► checking
                                     └─close()─► closed             │  └─200 invalid───► reportUnreadable
                                                                    └─ close() ignored
```

- **Comprobación (`check`, privada, la usan `open` y `retry`):** `flow = checking`,
  GET, y el resultado se escribe **también** en `pending` (R2: abrir el modal refresca
  el aviso). En fallo, `pending = null` y `checkFailed` con
  `kind = isDriveError(e) ? 'drive' : 'server'`. Un contador `checkRun` descarta la
  respuesta si mientras tanto el usuario cerró (Cancel) o volvió a abrir: solo la última
  comprobación mueve `flow`; `pending` se actualiza siempre.
- **Un único POST (R7):** `start()` comprueba `flow.step === 'confirm'` y pone
  `flow = importing` **de forma síncrona, antes del primer `await`**. Una segunda
  llamada ve `importing` y sale. No hace falta un flag aparte.
- **Resultado:** 200 válido → `finished`; `ValidationError` → `reportUnreadable`;
  cualquier otro error → `importFailed` con su `kind`. Todos los errores pasan por
  `toAppError`.
- **Después del POST, con cualquier resultado (`finally`):** `void refreshPending()` y,
  si `useNetWorthStore().netWorth !== null`, `void netWorthStore.load()` (R12). El store
  de import importa el de net-worth por alias (`@/features/net-worth/store`): es la
  única dependencia entre features y va en ese sentido (import → net-worth).
- **`isDriveError(e)`** (service): `e instanceof ApiError && e.apiCode === 'DRIVE_CONNECTION_ERROR'`.
- «Try again» **no** relanza el POST: vuelve a comprobar, porque tras un fallo parcial
  la lista de pendientes ha cambiado y el usuario debe verla antes de confirmar.
- **Alternativa descartada:** booleans sueltos (`isChecking`, `isImporting`, `error`,
  `report`). Permiten combinaciones imposibles (report y error a la vez); la unión
  hace que la plantilla solo pueda pintar lo que existe en cada fase.

## 6. Resumen y titular (puros)

```ts
// outcome.ts
export type OutcomeTone = 'positive' | 'warning' | 'negative'
export function importOutcome(report: ImportReport): { headline: string; tone: OutcomeTone }
// summary.ts
export interface SummaryCounter { id: 'new' | 'duplicates' | 'products' | 'notImported'; label: string; value: number }
export function summaryCounters(report: ImportReport): SummaryCounter[]
export function finalPassesLine(report: ImportReport): string | null
export function reviewSentence(report: ImportReport): string | null
export function newAccountCount(report: ImportReport): number
export function pendingCountLabel(total: number): string   // "1 new file" | "3 new files"
export function phaseAnnouncement(flow: ImportFlow): string
```

Sea `I` = archivos con `status: 'imported'`, `F` = `failed`, `S` = `skipped`.

| Condición (en este orden) | Titular | Tono |
|---|---|---|
| `I === 0` (incluye informe sin archivos) | `Nothing was imported` | negative |
| `I > 0 && F > 0` | `Partially imported` | warning |
| `I > 0 && F === 0` y hay algo que mirar: `S > 0`, `unparsedCount > 0`, `balanceMismatchCount > 0`, `transfers.ambiguousCount > 0`, `categorization.conflictCount > 0`, `transfers.error` o `categorization.error` | `Imported, with a few things to check` | warning |
| resto | `Import complete` | positive |

- Contadores: `New movements` = `importedCount`; `Already imported` = `duplicateCount`;
  `Investment files updated` = `importedProductCount`; `Files not imported` =
  `failedCount + skippedCount`. Siempre los cuatro, en `font-mono tabular-nums`.
- Línea de pasadas finales: partes `N transfer(s) matched`, `N categorized`,
  `N new account(s)` (`newAccountCount` = archivos `statement` con
  `account.created === true`), unidas por ` · `, omitiendo las que valen 0; `null` si
  todas son 0.
- Frase de revisión: `importedCount === 1` → `1 new movement is waiting for your review`;
  `> 1` → `N new movements are waiting for your review`; `0` → `null`. Texto plano, sin
  enlace (cerrado el 2026-09-15).
- `phaseAnnouncement`: `Checking Drive for new files…` · `You're up to date. No new files in Google Drive.` ·
  `N new file(s) found.` · `Importing N file(s)…` · el titular · el título del fallo.
- «Things to check» en detalle (qué fila, qué descuadre…) **no** se pinta: es la F14.

## 7. Mensajes por archivo (`fileMessages.ts`)

```ts
export function fileIssueMessage(file: StatementFileReport | ProductFileReport | SkippedFileReport): string
export function fileIssueDetails(file: FileReport): string | null   // error.message | reason | null
export function issueFiles(report: ImportReport): FileReport[]       // failed + skipped, in report order
```

| `error.code` | Texto |
|---|---|
| `MISSING_ACCOUNT_DATA` | `The file has no IBAN and its bank doesn't have exactly one account yet. Add the IBAN to the file once.` |
| `INVALID_IBAN` | `The IBAN in the file isn't valid. Fix it and try again.` |
| `NOT_UTF8` | `The file isn't saved as UTF-8. Save it as UTF-8 and try again.` |
| `UNEXPECTED_ENCODING` | `The file isn't in the encoding its bank uses. See the details for how to fix it.` |
| `EMPTY_STATEMENT` | `The file has no movements. Check that you downloaded the right period.` |
| `ALL_ROWS_UNPARSED` | `None of the file's lines could be read. The bank may have changed its format.` |
| `VALIDATION_ERROR` | `The file doesn't match what this bank's reader expects. See the details.` |
| `DRIVE_CONNECTION_ERROR` | `This file couldn't be downloaded from Google Drive. Try again.` |
| `INTERNAL_SERVER_ERROR` | `Something went wrong on the server with this file. Try again.` |
| desconocido o `error: null` | `This file couldn't be imported.` |
| `status: 'skipped'` | `This bank or file type isn't supported yet.` |

- **`skipped` es un caso defensivo, no esperado:** todos los bancos de Drive tienen
  parser en el backend (`gastos-backend/src/app.ts`) y en Drive solo hay `.csv`, Excel y
  `.json`, así que los pendientes son todos importables y el aviso baja a 0 tras una
  importación correcta. `skipped` solo aparece con un archivo que el backend no
  reconozca (extensión o carpeta de banco desconocida, p. ej. subido por error).

- «Details»: `<details><summary>Details</summary><p lang="es">{{ original }}</p></details>`,
  cerrado; no se pinta si `fileIssueDetails` es `null`. El nombre del banco pasa por
  `bankLabel` (slug desconocido tal cual).
- Mapa cerrado de textos, pero `code` abierto: un código nuevo cae en el genérico con
  su mensaje original en «Details», así que no se pierde información.

## 8. Componentes

### Compartidos (`src/shared/components/`)

```ts
// BaseButton.vue — port of Button.jsx
defineProps<{ variant?: 'primary' | 'secondary' | 'ghost'; size?: 'sm' | 'md'; loading?: boolean; disabled?: boolean; type?: 'button' | 'submit' }>()
// slots: default, icon (left; replaced by BaseSpinner while loading)
// <button :disabled="disabled || loading" :aria-busy="loading || undefined">

// BaseSpinner.vue
defineProps<{ size?: number; label?: string }>()  // aria-hidden unless label → role="status"

// BaseDialog.vue
defineProps<{ open: boolean; title: string; dismissible?: boolean }>()   // dismissible default true
defineEmits<{ close: [] }>()
defineExpose({ focusInitial })   // focuses [data-autofocus] inside the panel, else the panel
// slots: default (body), footer
```

- **Clases (literales, por el escaneo de Tailwind):** primary
  `bg-brand text-ink-on-brand border border-brand hover:bg-brand-hover active:bg-brand-active shadow-xs`;
  secondary `bg-surface-card text-ink-strong border border-line-default hover:bg-surface-hover`;
  ghost `bg-transparent text-ink-muted hover:bg-surface-hover`. Foco:
  `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand`.
  Deshabilitado **sin loading**: `disabled:opacity-50 disabled:cursor-not-allowed`
  (controles inactivos: WCAG no exige contraste). Con `loading` el botón no se
  atenúa: el texto «Importing…» se sigue leyendo al 100 %. `DS --brand-on` → proyecto
  `text-ink-on-brand` (convención).
- **Spinner:** `size-3.5 rounded-full border-2 border-current border-t-transparent animate-spin motion-reduce:animate-none`.
  Con movimiento reducido deja de girar; la fase se sigue leyendo en texto.
- **BaseDialog, hecho a mano:**
  - `<Teleport to="body">` con `v-if="open"`; scrim `fixed inset-0 z-[var(--z-modal)] bg-surface-overlay flex items-center justify-center p-5`.
  - Panel `role="dialog" aria-modal="true" :aria-labelledby="titleId" tabindex="-1"` con
    `w-[440px] max-w-full rounded-xl border border-line-subtle bg-surface-card p-6 shadow-xl`.
    **El borde es obligatorio:** `--surface-card` sobre el scrim da 1,04:1, el panel no
    se distingue sin él (§9).
  - Esc: listener `keydown` en `document` mientras está abierto; clic en el scrim con
    `@click.self`. Ambos emiten `close` solo si `dismissible`. La X (`data-test="dialog-close"`,
    `aria-label="Close"`, icono `X` de Lucide) solo se pinta con `dismissible`.
  - Trampa de foco: en `keydown` Tab, lista de enfocables del panel
    (`button:not([disabled]), [href], summary, [tabindex]:not([tabindex="-1"])`); del
    último al primero y viceversa; sin enfocables, el foco se queda en el panel.
  - Al abrir guarda `document.activeElement` y llama a `focusInitial()` en `nextTick`;
    al cerrar (o desmontar) devuelve el foco a ese elemento si sigue en el documento.
  - Tests con `attachTo: document.body` (el Teleport necesita un `body` real; se buscan
    los nodos en `document`, no en el `wrapper`).
- **Alternativa descartada — `<dialog>` nativo con `showModal()`:** jsdom no lo
  implementa (comprobado en este repo: `typeof dialog.showModal === 'undefined'`), así
  que ni la trampa de foco ni `aria-modal` implícito serían testeables en Vitest sin un
  polyfill; y su `cancel` con Esc hay que interceptarlo igualmente para el bloqueo de
  R8. A mano son ~60 líneas y todo se prueba en jsdom.

### De la feature (`src/features/import/components/`)

- **`ImportButton.vue`** (monta en la barra): `onMounted → store.refreshPending()`;
  `BaseBadge tone="info"` con `pendingCountLabel` si `pending?.totalPending > 0`
  (`data-test="pending-badge"`); `BaseButton variant="primary"` con icono `FileUp`
  (`data-test="import-button"`), texto `Import` / `Importing…` y `:loading="store.isImporting"`;
  clic → `store.open()` (si ya está abierto no hace nada). Contiene `<ImportDialog />`.
- **`ImportDialog.vue`**: `BaseDialog` con `title="Import from Google Drive"`,
  `:open="flow.step !== 'closed'"`, `:dismissible="!store.isImporting"`,
  `@close="store.close()"`. Cuerpo por fase (`data-test="import-step-<step>"`):

  | Fase | Cuerpo | Pie (primera = `data-autofocus`) |
  |---|---|---|
  | `checking` | `ImportPhases` (1 current, 2 pending) | Cancel (secondary) |
  | `upToDate` | `You're up to date` + `No new files in Google Drive.` | Close |
  | `confirm` | `ImportPhases` (1 done: `N new files found`) + `PendingList` + nota | **Import N files** (primary), Cancel |
  | `importing` | `ImportPhases` (1 done, 2 current: `Importing N files…` / `This can take a few seconds.`) | Import N files (primary, `loading`) |
  | `finished` | `ImportSummary` + `FileIssueList` | Close |
  | `checkFailed` | título del fallo + `Nothing has been imported.` | Try again (primary), Close |
  | `importFailed` | título del fallo + `Some files may already have been imported. Trying again is safe: nothing is imported twice.` | Try again (primary), Close |
  | `reportUnreadable` | `The import finished, but its report couldn't be read. Your files may have been imported.` | Close |

  Títulos del fallo: `drive` → `Couldn't reach Google Drive`; `server` → `Couldn't reach the server`.
  Región `<p class="sr-only" aria-live="polite" data-test="import-live">{{ phaseAnnouncement(flow) }}</p>`
  fuera del `v-if` de fase (R15). `watch(() => flow.step)` → `nextTick` →
  `dialogRef.focusInitial()` (el botón que tenía el foco desaparece al cambiar de fase).
- **`ImportPhases.vue`**: `defineProps<{ phases: { label: string; detail?: string; state: 'done' | 'current' | 'pending' }[] }>()`.
  Iconos: `done` → `CircleCheck` `text-positive`; `current` → `BaseSpinner` `text-brand`;
  `pending` → `Circle` `text-ink-faint`. Todos `aria-hidden`; el estado se lee en el texto.
- **`PendingList.vue`**: `defineProps<{ pending: PendingFiles }>()`. Hasta 8 archivos:
  todo desplegado. Más de 8: un `<details>` cerrado por banco con
  `Bankinter · 5 files` en el `summary`. Nombres de archivo en `font-mono text-sm`.
- **`ImportSummary.vue`**: `defineProps<{ report: ImportReport }>()`; titular con
  icono por tono (`CircleCheck` positive / `TriangleAlert` warning / `CircleX` negative,
  `aria-hidden`); rejilla de 4 contadores (`data-test="summary-counter"`), línea final
  (`data-test="final-passes"`) y frase de revisión (`data-test="review-sentence"`).
- **`FileIssueList.vue`**: `defineProps<{ files: FileReport[] }>()`; no pinta nada sin
  archivos; título `Needs attention`; filas en `bg-surface-sunken rounded-md`.

**Iconos nuevos** (import por nombre): `FileUp` (se mueve del router), `X`,
`CircleCheck`, `Circle`, `CircleX`, `TriangleAlert`. Los nombres se confirman contra
`@lucide/vue` instalado en T0 (Lucide renombra: `line-chart` → `ChartLine`).

**Dependencia shared → feature:** `AppShell.vue` (shared) importa `ImportButton` de
la feature. Ya hay precedente (`router/index.ts` importa `NetWorthView`); la
alternativa (montarlo en `App.vue` con Teleport a la barra) complica el layout sin
ganar nada.

## 9. Contraste: líneas `contrast:` nuevas en `theme-dark.css`

Se añaden a la sección `Overlays` (y una a `Cards`). Valores estimados con la paleta
real en la redacción; T0 los confirma con el test:

```
contrast: --border-subtle on --surface-overlay over --surface-app >= 3 (dialog panel edge over the scrim; the card fill alone is 1.04)      ~3.64
contrast: --border-subtle on --surface-overlay over --surface-inverse >= 3 (dialog panel edge where the scrim covers the sidebar)            ~4.16
contrast: --ink-muted on --surface-hover >= 4.5 (dialog close button and ghost buttons, hovered)
contrast: --ink-strong on --surface-hover >= 4.5 (secondary buttons, hovered)                                                               ~9.55
contrast: --ink-muted on --surface-sunken >= 4.5 (Details: original backend message in an issue row)                                         ~12.8
contrast: --brand on --surface-app >= 3 (focus outline of the Import button in the topbar)                                                  ~5.54
```

- Ya medidos y reutilizados: `--info on --info-subtle` (aviso), `--ink-on-brand on
  --brand/-hover/-active` (botón primario), `--ink-strong/--ink-body/--ink-muted/--ink-faint on
  --surface-card`, `--positive/--warning/--negative on --surface-card` (iconos de tono),
  `--brand on --surface-card` (spinner y foco dentro del panel), `--border-default on
  --surface-card` (botón secundario), `--ink-body on --surface-sunken` (filas de aviso).
- Si alguna línea no llega (p. ej. el borde sobre el scrim), se sube el borde del panel
  a `border-line-default` (~6,7:1) en vez de tocar tokens; lo que se elija queda en su
  línea.

## 10. e2e

- **Humo (`e2e/app-boot.spec.ts`):** el shell pide pendientes al montar. Sin backend el
  proxy responde 502 y Chromium lo escribe como error de consola → el smoke se pondría
  rojo. Se añade junto a la ruta de net-worth:
  `await page.route('**/api/ingestion/pending', (route) => route.fulfill({ json: { totalPending: 0, banks: [] } }))`.
  T0 comprueba primero que sin ella falla (para no añadir código sin motivo).
- **`e2e/import-dialog.spec.ts` (nuevo, chromium en `./init.sh`):** con `page.route`
  para `/api/net-worth`, `/api/ingestion/pending` (2 archivos) y `/api/import`:
  1. informe parcial (1 importado, 1 `failed` con `NOT_UTF8`) → titular `Partially
     imported`, 1 `file-issue`, se registra **1** POST con `request.postData() === null`
     y sin cabecera `content-type`;
  2. 503 `{ statusCode: 503, code: 'DRIVE_CONNECTION_ERROR', message: '…' }` en el POST →
     `Couldn't reach Google Drive` y el aviso de «may already have been imported».
  Sin errores de consola salvo el 503 esperado (se filtra por URL).

## 11. Alternativas descartadas (resumen)

| Alternativa | Por qué no |
|---|---|
| Progreso archivo a archivo | Exige tocar el backend (jobs o streaming); el humano lo descartó. |
| `<dialog>` nativo | jsdom no implementa `showModal` (§8). |
| Reutilizar `code` para el código del backend | Rompe el vocabulario interno de `AppError` (§2). |
| Consultar `/health/drive` antes de importar | Una petición más y otro formato de cuerpo; el propio GET de pendientes ya devuelve 503 `DRIVE_CONNECTION_ERROR`. |
| Sondear pendientes cada N minutos | Cerrado por el humano el 2026-09-15; Drive no avisa y el coste no compensa en una app de un usuario. |
| «Try again» relanzando el POST directamente | Tras un fallo parcial la lista cambió; volver a comprobar enseña lo que queda. |
| Comunicar el informe ilegible como fallo | Falso: el backend respondió 200, los archivos probablemente se importaron (R11). |
