# Resumen — feature 36 `own-accounts-table`

Fecha de cierre: 2026-10-21
Intención original: `feature_list.json` → feature `own-accounts-table`, bloque `intent`
Spec: `specs/36-own-accounts-table/`

## Qué hace ahora la app que antes no

Hay una entrada nueva en el menú, `My accounts`, justo debajo de `Transfers`. Ahí ves la
tabla de tus cuentas y productos (nombre, banco, número, tipo, apertura, cierre y los
textos con los que aparecen en los conceptos) y, encima, las formas de tu nombre. Puedes
dar de alta una cuenta (`Add account`), cambiar una existente (`Edit` en su fila: textos,
fecha de cierre o cualquier otro dato) y cambiar la lista de formas de tu nombre. Antes
esta tabla solo se podía tocar desde la sesión del backend.

Al guardar, la tabla (o la lista) se vuelve a pedir y enseña lo que guardó el servidor.
La ventana no deja guardar un nombre o banco vacíos, sin tipo, un texto de menos de 3
letras o cifras, o un cierre anterior a la apertura, y dice por qué junto al campo. Si
guardar falla, la ventana se queda abierta con lo que escribiste y una frase que dice
qué pasó; sin conexión, te pide recargar la página.

## Qué no hace

- No borra filas: el backend no lo permite. Una fila que no sirve se deja sin textos.
- No dice qué movimientos cambian al guardar: lo ves al entrar en `Movements`, `Review`,
  `Overview`, `Monthly cost` o `Transfers`, que vuelven a pedir sus datos.
- El número junto a `Transfers` en el menú puede no cambiar hasta que se vuelva a pedir.
- El banco se escribe a mano; la tabla no se ordena, filtra ni busca (sale en el orden
  del backend). Una cuenta cerrada se ve igual que una abierta, con su fecha en `Closed`.
- Guardar la lista de formas de tu nombre vacía las borra todas sin preguntar.
- No toca el backend.

## Por dónde se toca (puntos de entrada)

| Cómo se usa | Código |
| --- | --- |
| La entrada `My accounts` del menú (`/own-accounts`) | [router/index.ts:80](../../src/router/index.ts#L80) |
| La pantalla | [OwnAccountsView.vue:1](../../src/features/own-accounts/views/OwnAccountsView.vue#L1) |
| Guardar una cuenta (alta o cambio) | [store.ts:111](../../src/features/own-accounts/store.ts#L111) |
| Guardar las formas de tu nombre | [store.ts:156](../../src/features/own-accounts/store.ts#L156) |

## Dónde está el código

### Pantalla y ventanas

| Qué hace | Dónde |
| --- | --- |
| La tabla de cuentas | [OwnAccountTable.vue](../../src/features/own-accounts/components/OwnAccountTable.vue) |
| El bloque de las formas de tu nombre | [HolderNames.vue](../../src/features/own-accounts/components/HolderNames.vue) |
| La ventana de dar de alta y cambiar | [OwnAccountDialog.vue](../../src/features/own-accounts/components/OwnAccountDialog.vue) |
| La ventana de las formas de tu nombre | [HolderNamesDialog.vue](../../src/features/own-accounts/components/HolderNamesDialog.vue) |
| Una lista de campos con `Remove` y `Add text` | [TextListField.vue](../../src/features/own-accounts/components/TextListField.vue) |
| La entrada del menú | [router/index.ts](../../src/router/index.ts) → ruta `own-accounts` |

### Estado y llamadas al backend

| Qué hace | Dónde |
| --- | --- |
| Cargar, guardar y volver a leer | [store.ts](../../src/features/own-accounts/store.ts) → `useOwnAccountsStore` (`load`, `loadNames`, `saveAccount`, `saveNames`) |
| Las cinco llamadas (`GET`/`POST`/`PATCH` de cuentas, `GET`/`PUT` de nombres) | [service.ts](../../src/features/own-accounts/service.ts) → `getOwnAccounts`, `createOwnAccount`, `updateOwnAccount`, `getHolderNames`, `putHolderNames` |
| Leer y validar lo que llega | [service.ts](../../src/features/own-accounts/service.ts) → `parseOwnAccount`, `parseOwnAccounts`, `parseHolderNames` |
| Tipos | [types.ts](../../src/features/own-accounts/types.ts) → `OwnAccount`, `OwnAccountDraft`, `NewOwnAccount`, `OwnAccountChanges` |

### Reglas y frases

| Qué hace | Dónde |
| --- | --- |
| Qué no deja guardar la ventana | [texts.ts](../../src/features/own-accounts/texts.ts) → `draftProblems`, `listProblems`, `hasProblems` |
| Medir un texto como el backend (mínimo 3) | [texts.ts](../../src/features/own-accounts/texts.ts) → `normalizeOwnText`, `isOwnTextTooShort` |
| Qué se manda al dar de alta y al cambiar | [texts.ts](../../src/features/own-accounts/texts.ts) → `newAccountBody`, `changesOf` |
| Frases de error al cargar y al guardar | [texts.ts](../../src/features/own-accounts/texts.ts) → `loadErrorMessage`, `namesLoadErrorMessage`, `saveErrorMessage`, `namesSaveErrorMessage` |

### Tests

| Qué cubre | Dónde |
| --- | --- |
| La pantalla: filas, formas del nombre, fallos al cargar, sin borrar | [OwnAccountsView.spec.ts](../../src/features/own-accounts/__tests__/OwnAccountsView.spec.ts) |
| La ventana de cuenta: lo que no deja guardar, textos, fallo al guardar | [OwnAccountDialog.spec.ts](../../src/features/own-accounts/__tests__/OwnAccountDialog.spec.ts) |
| La ventana de formas del nombre | [HolderNamesDialog.spec.ts](../../src/features/own-accounts/__tests__/HolderNamesDialog.spec.ts) |
| Guardar y volver a leer, y cada fallo | [store.spec.ts](../../src/features/own-accounts/__tests__/store.spec.ts) |
| Llamadas y validación de respuestas | [service.spec.ts](../../src/features/own-accounts/__tests__/service.spec.ts) |
| Frases y reglas | [texts.spec.ts](../../src/features/own-accounts/__tests__/texts.spec.ts) |
| Datos inventados de prueba | [fixtures.ts](../../src/features/own-accounts/__tests__/fixtures.ts) |
| En el navegador | [own-accounts-table.spec.ts](../../e2e/own-accounts-table.spec.ts) |
| El menú | [router.spec.ts](../../src/router/__tests__/router.spec.ts) → `lists My accounts in the menu right below Transfers` |

Documentos tocados: `docs/architecture.md` (carpeta `own-accounts/`), `docs/guia-de-uso.md`
(§7b y el párrafo del menú), `docs/roadmap.md`.

## Cumplimiento de la intención

Resultado real de `./init.sh --checks 36` del 2026-10-21: 9 de 9 en verde.

- ✅ «Veo las 12 filas de la tabla con todos sus datos.» → check 1 ✅
  (`paints one row per account with every field`, en el navegador `reaches My accounts
  from the menu and sees every row with its data`).
- ✅ «Doy de alta una cuenta nueva y aparece.» → check 2 ✅ (`adding an account sends it
  and the new row appears`).
- ✅ «Cambio los textos de una cuenta y se guardan.» → check 3 ✅ (`editing the texts of
  a row sends the whole list and the row shows them`).
- ✅ «Cierro una cuenta poniéndole fecha de cierre.» → check 4 ✅ (`closing an account
  sends its closing date and the row shows it`).
- ✅ «Veo y cambio las formas de mi nombre.» → check 5 ✅ (`changing the forms of your
  name sends them and shows the saved list`).
- ✅ «Si algo falla, me lo dice y no ha cambiado nada.» → check 6 ✅ (fallos al cargar y
  al guardar, en la tabla y en las formas del nombre). Si no se sabe si se guardó, la
  tabla se vuelve a pedir; si tampoco se puede, la ventana lo dice y pide recargar.
- ✅ «No quiero borrar filas.» → check 7 ✅ (`offers no way to delete a row`, `sends no
  DELETE to own accounts`).
- ✅ (añadido) `My accounts` justo debajo de `Transfers` → check 8 ✅.
- ✅ (añadido) La ventana no deja guardar lo que el backend rechazaría → check 9 ✅.

## Decisiones que se tomaron por ti

- (delegado) Dar de alta y cambiar en una ventana, la misma para las dos, con un campo
  por texto.
- (añadido) El nombre `My accounts` y su sitio en el menú; la frase de tabla vacía.
- (añadido) Volver a leer la tabla tras guardar en vez de meter la fila a mano.
- (añadido) Guardar sin cambios no manda nada.
- (añadido) La ventana bloquea antes de mandar lo que el backend rechazaría.
- (añadido, tras la revisión) La frase cuando guardar falla y la tabla tampoco se puede
  volver a leer: `…couldn't be read again. Reload the page to see what the server has.`
