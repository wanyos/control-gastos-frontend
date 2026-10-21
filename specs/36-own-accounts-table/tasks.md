# Tasks — F36 `own-accounts-table`

Dos lotes en secuencia: la feature entera con sus pruebas unitarias, y después el menú,
la prueba de navegador y los documentos (la ruta importa la vista del Lote A).

Los nombres de test van entre comillas invertidas tal cual: los `checks` de
`feature_list.json` los filtran por ese nombre exacto. No los cambies. **Ningún dato de
prueba lleva números de cuenta reales, nombres de personas ni comercios reales**: números
como `ES00 0000 0000 0000 0000 0001`, nombres de cuenta como `Cuenta inventada uno` o
`Hucha inventada`, formas del nombre como `Titular Inventado` y `Inventado Titular`, y
textos como `Cuenta Inventada Uno`. Los bancos sí pueden ser los reales (`Bankinter`,
`Criptan`, `ING`, `MyInvestor`, `N26`, `Openbank`, `Revolut`, `Trade Republic`).
**No apuntes nada en `docs/roadmap.md`**: los cabos sueltos los apunta el leader.

Esta feature se implementa **después de la 35**. Antes de empezar, mira qué tocó la 35 en
`src/router/index.ts`, `src/router/__tests__/router.spec.ts`,
`src/shared/components/AppSidebar.vue` y en las pruebas de navegador (qué pide el menú al
cargarse): respétalo y no lo cambies.

## Lote A — la pantalla, sus datos y sus pruebas unitarias
Archivos: `src/features/own-accounts/types.ts`, `src/features/own-accounts/service.ts`, `src/features/own-accounts/texts.ts`, `src/features/own-accounts/store.ts`, `src/features/own-accounts/components/OwnAccountTable.vue`, `src/features/own-accounts/components/OwnAccountDialog.vue`, `src/features/own-accounts/components/TextListField.vue`, `src/features/own-accounts/components/HolderNames.vue`, `src/features/own-accounts/components/HolderNamesDialog.vue`, `src/features/own-accounts/views/OwnAccountsView.vue`, `src/features/own-accounts/__tests__/fixtures.ts`, `src/features/own-accounts/__tests__/texts.spec.ts`, `src/features/own-accounts/__tests__/service.spec.ts`, `src/features/own-accounts/__tests__/store.spec.ts`, `src/features/own-accounts/__tests__/OwnAccountDialog.spec.ts`, `src/features/own-accounts/__tests__/HolderNamesDialog.spec.ts`, `src/features/own-accounts/__tests__/OwnAccountsView.spec.ts`
Depende de: —

- [ ] T1 — `types.ts` (design §2) y `__tests__/fixtures.ts`: una respuesta de
  `GET /api/own-accounts` con **12 filas inventadas** en el orden del contrato (`bank`,
  `name`, `id`), con los seis tipos, al menos tres filas sin textos, dos sin número, una
  con `closedAt`; una respuesta vacía; una de `holder-names` con dos formas; y cuerpos de
  error 400 y 404 con la forma del contrato. Cubre: R2–R15 (soporte).
- [ ] T2 — `texts.ts` (design §3 y §6). Tests en `texts.spec.ts`:
  `normalizes a text the way the contract compares it`,
  `a text shorter than three characters once compared is too short`,
  `the body of a new account carries only the filled fields`,
  `the changes of a row carry only what differs and null for an emptied field`,
  `changing one text sends the whole list of texts`,
  `no change gives an empty body`,
  `a closing date before the opening date is a problem`,
  `blank name bank or type are problems and a blank text is not`. Cubre: R5, R6, R7, R9, R10.
- [ ] T3 — `service.ts` (design §1, §9). Tests en `service.spec.ts`:
  `maps every field of an own account`,
  `rejects a type outside the six of the contract`,
  `posts a new account with only the given fields`,
  `patches an account with only the given fields`,
  `puts the whole list of the forms of your name`,
  `sends no DELETE to own accounts` (recorre los exports del módulo y las peticiones hechas
  en este archivo: ninguna con método `DELETE`). Cubre: R2, R5, R6, R13, R15.
- [ ] T4 — `store.ts` (design §5). Tests en `store.spec.ts`:
  `loads the table and the forms of your name`,
  `creating an account sends only the filled fields and reads the table again`,
  `changing only the texts sends only the texts and reads the table again`,
  `setting the closing date sends only closedAt`,
  `saving with nothing changed sends nothing and closes`,
  `a rejected save keeps the dialog open with a sentence and the table as it was`,
  `a failure that may have written reads the table again`,
  `saving the forms of your name sends the whole list and shows what came back`,
  `a rejected save of the forms of your name keeps the list as it was`,
  `a failed save of the forms of your name that may have written asks them again`. Cubre:
  R5, R6, R7, R9, R11, R13, R14.
- [ ] T5 — `TextListField.vue` y `OwnAccountDialog.vue` (design §4). Tests en
  `OwnAccountDialog.spec.ts`:
  `opens empty to add and filled with the row to edit`,
  `adds and removes text fields and drops the blank ones on save`,
  `a text shorter than three characters once compared keeps Save off and says why`,
  `a closing date before the opening date keeps Save off and says why`,
  `blank name or bank or no type keep Save off`,
  `keeps what was typed and shows the message after a failed save`. Cubre: R5, R8, R10, R11.
- [ ] T6 — `HolderNames.vue` y `HolderNamesDialog.vue`. Tests en
  `HolderNamesDialog.spec.ts`:
  `edits the forms of your name as a list and saves them whole`,
  `a form shorter than three characters keeps Save off`,
  `keeps what was typed and shows the message after a failed save of the forms`. Cubre:
  R13, R14.
- [ ] T7 — `OwnAccountTable.vue` y `views/OwnAccountsView.vue` (design §4, §6). Tests en
  `OwnAccountsView.spec.ts` (frontera HTTP simulada):
  `paints one row per account with every field`,
  `paints a dash for an empty number or date and No texts for a row with none`,
  `says there are no accounts when the table is empty`,
  `a failed load says so and offers Try again`,
  `shows the forms of your name above the table`,
  `a failed load of the forms of your name leaves the table alone`,
  `offers no way to delete a row`,
  `adding an account from the header button shows the new row`,
  `editing a row from its Edit button shows the change`. Cubre: R1 (título e intro), R2,
  R3, R4, R5, R6, R12, R15.

## Lote B — la entrada del menú, la prueba de navegador y los documentos
Archivos: `src/router/index.ts`, `src/router/__tests__/router.spec.ts`, `e2e/own-accounts-table.spec.ts`, `e2e/transfer-pairs-review.spec.ts`, `docs/architecture.md`, `docs/guia-de-uso.md`
Depende de: Lote A

- [ ] T8 — `src/router/index.ts`: solo lo que dice design §1 (import de `Landmark`,
  import de la vista, un objeto de ruta entre el de `transfers` y el de `overview`, una
  línea en el comentario). No toques el objeto de `transfers` ni lo que la feature 35
  haya puesto junto a él, ni `AppSidebar.vue`. Cubre: R1.
- [ ] T9 — `router.spec.ts`: añade `/own-accounts` / `own-accounts` / `My accounts` en el
  quinto puesto de las tres listas fijas (y actualiza el número del nombre del test que
  cuenta las rutas navegables) y un test nuevo
  `lists My accounts in the menu right below Transfers` (que la vista sea
  `OwnAccountsView`, que el índice sea el de `transfers` + 1 y que el icono sea
  `Landmark`). Cubre: R1.
- [ ] T10 — `e2e/own-accounts-table.spec.ts`, con el backend simulado y la red de
  seguridad de las demás (cualquier `/api` no prevista se aborta y hace fallar la prueba;
  simula también lo que pida el menú desde la feature 35). Tests:
  `reaches My accounts from the menu and sees every row with its data` (12 filas
  inventadas),
  `adding an account sends it and the new row appears`,
  `editing the texts of a row sends the whole list and the row shows them`,
  `closing an account sends its closing date and the row shows it`,
  `changing the forms of your name sends them and shows the saved list`,
  `a rejected save says so and the table stays as it was`. Comprueba en cada escritura el
  método, la ruta y el cuerpo exacto de la petición. Cubre: R1, R2, R5, R6, R9, R11, R13.
- [ ] T11 — `e2e/transfer-pairs-review.spec.ts`: lánzala; si
  `reaches the screen from the sidebar and sees every pair, only the fine labelled` sigue
  pasando, no la toques. Solo si falla por la entrada nueva, ajusta su forma de llegar a
  `Transfers`, sin cambiar lo que comprueba. Cubre: R1 (no romper lo de antes).
- [ ] T12 — `docs/architecture.md` (design §10): el árbol y el párrafo. Cubre: —.
- [ ] T13 — `docs/guia-de-uso.md` (design §10). **Tiene notas del humano** (líneas que
  empiezan por `--` y bloques «Mis notas de esta prueba»): no se tocan, ni se mueven, ni
  se reescriben. La sección `## 7b.` es **nueva desde la feature 36** (dilo en su primera
  línea), va entre la §7 y la §8, y termina con su bloque vacío de notas:
  `> **Mis notas de esta prueba**` / `> - Falla:` / `> - Quiero cambiar:` /
  `> - No entiendo:`. Añade la fila de `My accounts` a la tabla «Mapa de la aplicación»,
  debajo de la de `Transfers` (¿Escribe?: **Escribe**: da de alta y cambia filas de la
  tabla de tus cuentas y las formas de tu nombre; no borra). Lo que digas de los datos
  reales (12 filas), con su fecha: 2026-10-21. Cubre: —.
