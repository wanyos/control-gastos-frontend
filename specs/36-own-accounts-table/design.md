# Design — F36 `own-accounts-table`

Una feature nueva, `src/features/own-accounts/`, con la forma de siempre
(`docs/architecture.md`, principios 1-6): `types.ts`, `service.ts` (las cinco peticiones
y su lectura), `texts.ts` (todo lo puro: comparación, comprobaciones, diferencias y
textos), `store.ts`, componentes y una vista. Fuera de la carpeta solo se toca el router
y sus pruebas, una prueba de navegador nueva y dos documentos.

## 1. Archivos

**Nuevos** (`src/features/own-accounts/`):

| Archivo | Qué tiene |
|---|---|
| `types.ts` | `OwnAccountType`, `OwnAccount`, `OwnAccountDraft`, `OwnAccountChanges`, `NewOwnAccount`, `LoadState` |
| `service.ts` | `OWN_ACCOUNTS_PATH`, `HOLDER_NAMES_PATH`, `parseOwnAccount`, `parseOwnAccounts`, `parseHolderNames`, `getOwnAccounts`, `createOwnAccount`, `updateOwnAccount`, `getHolderNames`, `putHolderNames` |
| `texts.ts` | `normalizeOwnText`, `isOwnTextTooShort`, `OWN_ACCOUNT_TYPES`, `TYPE_LABELS`, `emptyDraft`, `draftOf`, `draftProblems`, `newAccountBody`, `changesOf`, `cleanList`, los mensajes de error y todos los textos de §6 |
| `store.ts` | `useOwnAccountsStore` (§5) |
| `components/OwnAccountTable.vue` | la tabla: cabecera y una fila por cuenta, botón `Edit` por fila |
| `components/OwnAccountDialog.vue` | la ventana de cuenta, para dar de alta y para cambiar |
| `components/TextListField.vue` | una lista de campos de texto con `Remove` cada uno y `Add text` (la usan las dos ventanas) |
| `components/HolderNames.vue` | el bloque de las formas del nombre |
| `components/HolderNamesDialog.vue` | la ventana de formas del nombre |
| `views/OwnAccountsView.vue` | la pantalla |
| `__tests__/fixtures.ts`, `texts.spec.ts`, `service.spec.ts`, `store.spec.ts`, `OwnAccountDialog.spec.ts`, `HolderNamesDialog.spec.ts`, `OwnAccountsView.spec.ts` | pruebas unitarias |
| `e2e/own-accounts-table.spec.ts` | prueba de navegador con el backend simulado |

**Modificados:**

- `src/router/index.ts` — **solo** tres cosas: el import de `Landmark` en la lista de
  iconos de `@lucide/vue`, el import de `OwnAccountsView`, y **un objeto de ruta nuevo**
  insertado en `routes` **entre el objeto de `transfers` y el de `overview`**:
  `{ path: '/own-accounts', name: 'own-accounts', component: OwnAccountsView, meta: { label: 'My accounts', icon: Landmark } }`.
  No se toca el objeto de ruta de `transfers` ni nada que la feature 35 haya añadido
  junto a él (su número junto a `Transfers`), ni `src/shared/components/AppSidebar.vue`:
  la entrada sale sola de `navEntries`. Se añade una línea al comentario de encima de
  `routes` (feature 36: `/own-accounts`, debajo de `Transfers`).
- `src/router/__tests__/router.spec.ts` — las tres listas fijas de rutas y entradas
  (`declares the … navigable routes`, el `it.each` de rutas y
  `exposes one navigation entry per navigable route, in sidebar order`) ganan
  `/own-accounts` / `own-accounts` / `My accounts` en el quinto puesto, y un test nuevo
  (tasks T9).
- `e2e/transfer-pairs-review.spec.ts` — recorre el menú por posición (`nth(2)` es
  `Rules`, `nth(3)` es `Transfers`). La entrada nueva va después, así que no debería
  cambiar; está en la cabecera del lote por si la feature 35 la ha tocado y hay que
  ajustarla.
- `docs/architecture.md` y `docs/guia-de-uso.md` (§8).

`src/shared/components/__tests__/AppShell.spec.ts` compara con `navEntries` y no lleva
lista fija: no hay que tocarlo.

## 2. Tipos (`types.ts`)

```ts
export type OwnAccountType = 'checking' | 'savings' | 'investment' | 'deposit' | 'crypto' | 'other'

export interface OwnAccount {
  id: number
  name: string
  bank: string
  accountNumber: string | null
  type: OwnAccountType
  openedAt: DateOnly | null   // DateOnly de net-worth/types.ts, como las demás features
  closedAt: DateOnly | null
  texts: string[]
}

/** What the account window holds while typing: every field as the input gives it. */
export interface OwnAccountDraft {
  name: string
  bank: string
  accountNumber: string   // '' = none
  type: OwnAccountType | ''
  openedAt: string        // '' = none, else YYYY-MM-DD from <input type="date">
  closedAt: string
  texts: string[]         // may hold blank fields; cleanList drops them
}

export interface NewOwnAccount {        // the POST body
  name: string; bank: string; type: OwnAccountType
  accountNumber?: string; openedAt?: string; closedAt?: string; texts?: string[]
}

export type OwnAccountChanges = Partial<{   // the PATCH body
  name: string; bank: string; type: OwnAccountType
  accountNumber: string | null; openedAt: string | null; closedAt: string | null
  texts: string[]
}>

export type LoadState = 'idle' | 'loading' | 'loaded' | 'failed'
```

`createdAt` y `updatedAt` no se leen: la pantalla no los enseña.

## 3. Lo puro (`texts.ts`)

- `normalizeOwnText(text)`: `text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()`.
  Es la del contrato; comprobado leyendo el backend que la longitud se mide así, con los
  espacios interiores incluidos (`a b` mide 3). **No** se reutiliza
  `normalizeMatchText` de `category-rules/rules.ts`: es otra regla (no cambia
  símbolos por espacios).
- `isOwnTextTooShort(text)`: `normalizeOwnText(text).length < 3`.
- `cleanList(list)`: quita los campos que solo tienen espacios; el resto viaja **tal como
  se escribió** (el contrato guarda los textos «tal cual se escribieron»).
- `draftProblems(draft)`: `{ name?, bank?, type?, texts: (string | null)[], closedAt? }`
  con las frases de `FIELD_MESSAGES`; vacío = se puede guardar (R10). Un texto en blanco
  no es un problema (se descarta).
- `newAccountBody(draft)`: el body del `POST` (R5): `name` y `bank` sin espacios en los
  extremos, `type`, y `accountNumber`, `openedAt`, `closedAt`, `texts` solo si no están
  vacíos.
- `changesOf(row, draft)`: el body del `PATCH` (R6, R7, R9): compara `name` y `bank`
  recortados, `accountNumber` recortado (`''` → `null`), `type`, las dos fechas
  (`''` → `null`) y `cleanList(draft.texts)` contra `row.texts` elemento a elemento; un
  campo igual no viaja. `{}` = nada cambió.
- `loadErrorMessage`, `namesLoadErrorMessage`, `saveErrorMessage`,
  `namesSaveErrorMessage`: frases por tipo de fallo (§6), con el mismo criterio que
  `category-rules/rules.ts`: nunca se pinta el `message` del backend.
- `TYPE_LABELS: Record<OwnAccountType, string>` y `OWN_ACCOUNT_TYPES` (el orden del
  desplegable, el del contrato).

## 4. Componentes

Todos tontos (principio 6): reciben props y emiten eventos; quien manda es el store.

- **`OwnAccountTable`** — props `accounts: OwnAccount[]`, `busy: boolean`; emite
  `edit(account)`. Un `<table>` con cabeceras `Name`, `Bank`, `Number`, `Type`, `Opened`,
  `Closed`, `Appears as`, y una columna sin título con `Edit` (`BaseButton` `secondary`
  `sm`). Cada fila lleva `data-test="own-account-row"` y `data-own-account-id`. Los
  textos van uno por línea (`<ul>`), cada uno con `lang="es"`. El número en
  `font-mono tabular-nums`, entero, tal como llega. Las fechas con `formatDate` de
  `shared/money.ts`. Envuelta en un `div` con `overflow-x-auto` para pantallas estrechas.
  **No hay botón de borrar** (R15).
- **`TextListField`** — props `modelValue: string[]`, `label`, `addLabel`,
  `problems: (string | null)[]`; emite `update:modelValue`. Un `BaseInput` por elemento
  (con su problema como `hint` e `invalid`), un `BaseButton` `Remove` por elemento y uno
  `Add text` / `Add a form` al final. Lista vacía: solo el botón de añadir.
- **`OwnAccountDialog`** — props `open`, `mode: 'create' | 'edit'`, `initial: OwnAccountDraft`,
  `busy`, `message: string | null`; emite `save(draft)` y `cancel`. Sobre `BaseDialog`
  (`dismissible`), como `RuleDialog`. Campos: `Name`, `Bank` (texto libre), `Account number`
  (opcional), `Type` (`BaseSelect` con `Choose a type…` vacío y los seis), `Opened on` y
  `Closed on` (`BaseInput type="date"`), y `Appears as` (`TextListField`). Bajo el
  título, la frase `ACCOUNT_HINT`. `Save` desactivado mientras `draftProblems` no esté
  vacío o `busy`. Se rellena al abrirse (mismo patrón de `watch` que `RuleDialog`), así
  que un guardado fallido conserva lo escrito.
- **`HolderNames`** — props `names: string[] | null`, `state: LoadState`,
  `errorMessage: string | null`; emite `edit` y `retry`. Una `BaseCard` con el título
  `NAMES_TITLE`, la frase `NAMES_HINT`, las formas una por línea (`lang="es"`) o
  `NO_NAMES`, y `Edit`.
- **`HolderNamesDialog`** — props `open`, `initial: string[]`, `busy`, `message`; emite
  `save(names)` y `cancel`. Un `TextListField` con `Add a form`, la frase `NAMES_HINT`, y
  `Save` desactivado mientras una forma rellenada sea demasiado corta.

## 5. Store (`useOwnAccountsStore`, setup store)

Estado: `accounts: OwnAccount[] | null`, `loadState`, `loadError: AppError | null`,
`names: string[] | null`, `namesState`, `namesError`, `dialog: { mode: 'create' } | { mode: 'edit'; account: OwnAccount } | null`,
`namesDialogOpen: boolean`, `isSaving: boolean`, `saveMessage: string | null`,
`namesSaveMessage: string | null`.

Acciones (todas aceptan `client?: HttpClient` para las pruebas, como las demás):

- `load()` — lectura de la tabla; nunca lanza; descarta una respuesta que ya no sea la
  última (contador, como `monthly-cost`).
- `loadNames()` — igual con las formas del nombre.
- `openCreate()`, `openEdit(account)`, `closeDialog()` — limpian `saveMessage`.
- `saveAccount(draft): Promise<boolean>` — si `draftProblems` no está vacío, `false` sin
  petición. En alta, `createOwnAccount(newAccountBody(draft))`. En cambio,
  `changesOf(account, draft)`; si es `{}`, cierra y `true` sin petición (R7); si no,
  `updateOwnAccount(id, changes)`. Con éxito: cierra la ventana, `await load()`, `true`.
  Con fallo: `saveMessage = saveErrorMessage(error)`; si no es `ApiError` 400 ni 404,
  `await load()` (R11); `false`. Con 404, también `load()` (la fila ya no existe).
  Mientras guarda, `isSaving` impide un segundo envío.
- `openNames()`, `closeNames()`.
- `saveNames(list): Promise<boolean>` — `putHolderNames(cleanList(list))`; con éxito
  `names = respuesta`, cierra, `true`. Con fallo, `namesSaveMessage`; si no es 400,
  `await loadNames()` (R14); `false`. La lista pintada no cambia hasta tener respuesta.

La vista llama a `load()` y `loadNames()` en `onMounted`. Nada se guarda entre visitas:
volver a la pantalla vuelve a leer.

## 6. Textos de pantalla (inglés; traducción al lado)

| Constante / sitio | Texto | En español |
|---|---|---|
| título y entrada del menú | `My accounts` | Mis cuentas |
| `INTRO` | `Your accounts and products, in any bank, and the texts each one appears with in the descriptions of your movements. A movement that contains one of these texts, or a form of your name, is money moving between your own accounts and doesn't count in the totals. A text that is just the name of a bank only makes it doubtful.` | Tus cuentas y productos, de cualquier banco, y los textos con los que aparece cada una en los conceptos. Un movimiento que contiene uno de estos textos, o una forma de tu nombre, es dinero entre tus cuentas y no cuenta en las sumas. Un texto que es solo el nombre de un banco solo lo deja dudoso. |
| botón de la cabecera | `Add account` | Dar de alta una cuenta |
| cabeceras | `Name`, `Bank`, `Number`, `Type`, `Opened`, `Closed`, `Appears as` | Nombre, Banco, Número, Tipo, Apertura, Cierre, Aparece como |
| botón de fila y del bloque | `Edit` | Cambiar |
| `NO_TEXTS` | `No texts` | Sin textos |
| `NO_ACCOUNTS` | `No accounts yet.` | Todavía no hay cuentas. |
| `TYPE_LABELS` | `Checking account`, `Savings account`, `Investment`, `Deposit`, `Crypto`, `Other` | Cuenta corriente, Cuenta remunerada, Inversión, Depósito, Cripto, Otro |
| títulos de la ventana | `Add an account` / `Edit account` | Dar de alta una cuenta / Cambiar la cuenta |
| campos | `Name`, `Bank`, `Account number`, `Type`, `Opened on`, `Closed on`, `Appears as` | Nombre, Banco, Número de cuenta, Tipo, Abierta el, Cerrada el, Aparece como |
| opción vacía | `Choose a type…` | Elige un tipo… |
| `ACCOUNT_HINT` | `A row with no texts recognizes nothing. Rows can't be deleted: leave it with no texts instead.` | Una fila sin textos no reconoce nada. Las filas no se borran: déjala sin textos. |
| botones de lista | `Add text`, `Add a form`, `Remove` | Añadir texto, Añadir una forma, Quitar |
| botones | `Save`, `Cancel`, `Try again` | Guardar, Cancelar, Reintentar |
| `FIELD_MESSAGES.blank` | `Write something here.` | Escribe algo aquí. |
| `FIELD_MESSAGES.type` | `Choose a type.` | Elige un tipo. |
| `FIELD_MESSAGES.short` | `Use at least 3 letters or digits.` | Usa al menos 3 letras o cifras. |
| `FIELD_MESSAGES.closedBeforeOpened` | `The closing date can't be before the opening date.` | La fecha de cierre no puede ser anterior a la de apertura. |
| `NAMES_TITLE` | `Forms of your name` | Formas de tu nombre |
| `NAMES_HINT` | `How your name appears in the descriptions: in full, surnames first, cut short by the bank… Only the whole form counts.` | Cómo aparece tu nombre en los conceptos: completo, con los apellidos delante, recortado por el banco… Solo cuenta la forma entera. |
| `NO_NAMES` | `No forms of your name yet.` | Todavía no hay formas de tu nombre. |
| título de la ventana de nombres | `Forms of your name` | Formas de tu nombre |
| `loadErrorMessage` | red: `Couldn't reach the server.`; ilegible: `The server answered, but your accounts couldn't be read.`; resto: `Something went wrong loading your accounts.` | No se pudo llegar al servidor. / El servidor respondió, pero no se pudieron leer tus cuentas. / Algo falló al cargar tus cuentas. |
| `namesLoadErrorMessage` | igual, con `the forms of your name` | igual, con «las formas de tu nombre» |
| `saveErrorMessage` | 400: `Nothing was saved: the server didn't accept one of the fields.`; 404: `Nothing was saved: that account no longer exists.`; resto: `Something went wrong saving. The table now shows what the server has.` | No se guardó nada: el servidor no aceptó uno de los campos. / No se guardó nada: esa cuenta ya no existe. / Algo falló al guardar. La tabla enseña ahora lo que tiene el servidor. |
| `namesSaveErrorMessage` | 400: `Nothing was saved: the server didn't accept one of the forms.`; resto: `Something went wrong saving. The list now shows what the server has.` | No se guardó nada: el servidor no aceptó una de las formas. / Algo falló al guardar. La lista enseña ahora lo que tiene el servidor. |

## 7. Otras pantallas tras guardar

Cambiar la tabla o las formas del nombre cambia, en la siguiente lectura, qué movimientos
cuentan en `Movements`, `Review`, `Overview`, `Monthly cost` y `Transfers`. **No se hace
nada en ellas**: todas piden sus datos cada vez que se entra (comprobado leyendo sus
vistas: `StatementView` y `ReviewView` llaman a `show`/`load` en `onMounted`,
`OverviewView` hace `reset()`, `MonthlyCostView` y `TransfersView` llaman a `load()`), y
esta pantalla es otra ruta, así que para verlas hay que entrar en ellas. Este store no
importa ningún otro store y ninguna feature importa de él; el router lo monta.

La excepción posible es lo que está siempre a la vista, el menú: el número junto a
`Transfers` de la feature 35. Este spec no lo toca (su archivo y cuándo se refresca son
de la feature 35, todavía sin spec al escribir este). Queda en la hoja como incoherencia
conocida para que el leader lo cruce.

## 8. Alternativas descartadas

- **Editar en la propia fila** en vez de en una ventana: siete campos y una lista de
  textos no caben en una fila de 12 sin que la tabla salte de ancho; la ventana ya
  existe (`BaseDialog`) y es como se edita una regla.
- **Insertar la fila de la respuesta en la lista** en vez de volver a leer la tabla:
  ahorra una petición, pero habría que copiar en el cliente el orden del backend (`bank`,
  `name`, `id`) y la forma en que junta textos repetidos. Una lectura más de 12 filas no
  cuesta nada.
- **Un desplegable de bancos** en vez de texto libre: el contrato acepta cualquier banco
  y la tabla incluye bancos que no se importan (Criptan); un desplegable con los ya
  usados no deja dar de alta el primero de un banco nuevo.
- **Reutilizar `normalizeMatchText`** de `category-rules`: compara de otra forma (no
  cambia símbolos por espacios), y mediría distinto que el backend.

## 9. Errores

Ningún tipo de error nuevo. `service.ts` lanza `ApiError` (vía `http`) y `ValidationError`
(vía `createValidators`, con el contexto `GET /api/own-accounts`, `POST /api/own-accounts`,
`PATCH /api/own-accounts/:id`, `GET /api/own-accounts/holder-names` y
`PUT /api/own-accounts/holder-names`). Una respuesta con un `type` fuera de los seis es
`ValidationError`.

## 10. Documentos que la feature vuelve falsos

- `docs/architecture.md`: el árbol de carpetas gana `own-accounts/` (con la descripción
  de cada archivo, como las demás) y un párrafo breve: qué escribe (solo `POST` y
  `PATCH /api/own-accounts` y `PUT /api/own-accounts/holder-names`, nunca `DELETE`), que
  vuelve a leer la tabla tras guardar, y §7 (no avisa a otras pantallas).
- `docs/guia-de-uso.md`: una sección nueva **`## 7b. `My accounts` — mira y escribe`**
  entre el final de la §7 (`Transfers`, tras su bloque «Mis notas de esta prueba» y su
  `---`) y la `## 8.`, con la marca «nueva desde la feature 36», con los apartados de
  siempre (Para qué sirve, Qué probar — primero lo que solo mira, Qué probar — dar de alta
  y cambiar (escribe), Qué escribe y cómo se deshace, Lo que no hace o hace a medias) y su
  bloque vacío de notas; y una fila en la tabla «Mapa de la aplicación».

> **Corrección del leader (2026-10-21), tras la revisión:** (1) cuando una escritura falla y la segunda lectura de la tabla (o de las formas del nombre) **también** falla, la ventana no puede decir que la tabla enseña lo que tiene el servidor. En ese caso dice, en inglés como el resto: «Something went wrong saving, and the table couldn't be read again. Reload the page to see what the server has.» (con las formas del nombre, «…the list couldn't be read again…»). La frase de `texts.ts` de ahora solo sale cuando la segunda lectura funciona. (2) El check 9 exige además el test `blank name or bank or no type keep Save off` en `OwnAccountDialog.spec.ts`: un nombre en blanco, un banco en blanco o sin tipo dejan `Save` apagado.
