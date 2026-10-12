# repeated-labels — implementación

Feature 28, flujo simple (sin spec). Queda en `in_progress`; no se ha marcado `done`.

## Dos cosas que el leader tiene que decidir antes de la revisión

1. **He cambiado seis desplegables de categoría, no cinco.** El encargo nombraba cinco
   archivos. Buscando `optgroup` en `src/` salen seis con el mismo patrón: el sexto es
   `src/features/statement/components/StatementCategorySelect.vue`, el filtro
   `Category` de la barra de `Movements`. Es una copia literal de
   `review/components/CategorySelect.vue` y repetía cada categoría igual. El `acceptance`
   no lo nombra en su paréntesis, pero la frase del humano («que en los desplegables de
   categoría cada categoría salga una sola vez») sí lo abarca, y dejarlo era dejar el
   mismo fallo en la pantalla donde lo anotó. Si se prefiere fuera, se deshace con
   `git checkout -- src/features/statement/components/StatementCategorySelect.vue` y
   devolviendo `['Food', 'Salary']` al test `lists the categories as a tree, roots
   pickable too (R14)` de `StatementFilterBar.spec.ts`.
2. **En `Net Worth` los cuatro últimos dígitos siguen saliendo dos veces.** Ver
   «Sitios que he cambiado», fila de `BankCard.vue`. **Resuelto después por decisión
   del leader: ver «Ajuste de Net Worth», al final.**

## Archivos modificados / creados

Código (15):

- `src/shared/accounts.ts` — función nueva `accountLabel`.
- `src/features/statement/components/StatementFilterBar.vue`, `StatementRow.vue`,
  `RowCategoryEditor.vue`, `StatementCategorySelect.vue`
- `src/features/statement/views/StatementView.vue`
- `src/features/review/components/ReviewFilterBar.vue`, `MovementRow.vue`,
  `CategorySelect.vue`, `MovementCategorySelect.vue`, `ReviewActionBar.vue`
- `src/features/transfers/components/TransferPairRow.vue`, `UnlinkConfirmDialog.vue`
- `src/features/net-worth/components/BankCard.vue`
- `src/features/category-rules/components/RuleDialog.vue`

Tests (14 unitarios y 1 de navegador):

- `src/shared/__tests__/accounts.spec.ts`
- `src/features/statement/__tests__/StatementFilterBar.spec.ts`, `StatementRow.spec.ts`,
  `RowCategoryEditor.spec.ts`, `StatementView.spec.ts`
- `src/features/review/__tests__/MovementRow.spec.ts`, `ReviewFilterBar.spec.ts`,
  `ReviewActionBar.spec.ts`, `MovementCategorySelect.spec.ts`, `CategorySelect.spec.ts`
- `src/features/transfers/__tests__/TransferPairRow.spec.ts`, `UnlinkConfirmDialog.spec.ts`
- `src/features/net-worth/__tests__/NetWorthView.spec.ts`
- `src/features/category-rules/__tests__/RuleDialog.spec.ts`
- `e2e/transfer-pairs-review.spec.ts`

Otros: `feature_list.json` (solo `status`: `pending` → `in_progress`),
`progress/current.md` (el plan), este informe. No se ha creado ningún archivo de código
ni de test: todos existían.

## El nombre de una cuenta

`accountLabel(account: { bank: string; iban: string }): string` en
`src/shared/accounts.ts`. Devuelve el nombre legible del banco (`bankLabel`, de
`src/shared/banks.ts`), un espacio, `···` y los cuatro últimos caracteres del IBAN una
vez quitados los espacios: `Bankinter ···6182`. No lee `alias`. Un banco que no está en
la lista de `banks.ts` sale como llega (`sabadell ···9463`), igual que antes.

### Sitios que he cambiado (todos usan `accountLabel`)

| Pantalla | Archivo | Qué se leía | Qué se lee ahora |
|---|---|---|---|
| `Movements`, desplegable `Account` | `StatementFilterBar.vue` | `Bankinter · bankinter ···0236` | `Bankinter ···0236` |
| `Movements`, cada línea | `StatementRow.vue` | `Bankinter · bankinter ···0236` | `Bankinter ···0236` |
| `Movements`, la frase que resume los filtros activos | `StatementView.vue` | `… · Account bankinter ···0236 · …` | `… · Account Bankinter ···0236 · …` |
| `Review`, desplegable de cuenta | `ReviewFilterBar.vue` | `Bankinter · bankinter ···0236` | `Bankinter ···0236` |
| `Review`, cada fila | `MovementRow.vue` | `Bankinter · bankinter ···0236` | `Bankinter ···0236` |
| `Transfers`, las dos líneas de cada pareja | `TransferPairRow.vue` | `n26 ···7719` (el `alias` solo) | `N26 ···7719` |
| `Transfers`, el diálogo que pregunta antes de desenlazar | `UnlinkConfirmDialog.vue` | `n26 ···7719` | `N26 ···7719` |
| `Net Worth`, la fila de cada cuenta dentro de la ficha de su banco | `BankCard.vue` | el `alias` | `Bankinter ···1332` |

La frase de los filtros de `Movements` no estaba en la pista del encargo: la encontré
buscando `alias`. Su comentario dice que tiene que leerse como los desplegables, así
que la cambié con ellos.

**`Net Worth`, lo que queda repetido.** `AccountCard.vue` pinta, debajo del nombre, el
tipo de cuenta y los cuatro últimos dígitos (`···· 1332`). Eso ya era así: con el
`alias` real del backend la fila decía `bankinter ···1332` y debajo `···· 1332`. Ahora
dice `Bankinter ···1332` y debajo `···· 1332`, dentro de una ficha titulada
`Bankinter`. Cumple el `acceptance` (se nombra igual que en las demás pantallas), pero
los dígitos siguen dos veces y el banco está en el título y en la fila. No he quitado
la línea `···· 1332` porque es quitar un elemento de la ficha y nadie lo ha pedido.

### Sitios que he dejado como estaban, y por qué

| Pantalla | Archivo | Qué se lee | Por qué no lo he cambiado |
|---|---|---|---|
| `Transfers`, los movimientos de un grupo dudoso | `AmbiguousGroupCard.vue` | `n26 ···7719` | `GET /api/transfers/ambiguous` da de cada movimiento `accountId` y `accountAlias`, sin `bank` ni `iban`. `accountLabel` no tiene de qué partir. Sacarlo haría falta otra petición (`GET /api/accounts`) o trocear el texto del `alias`; lo primero está prohibido en esta feature y lo segundo es adivinar |
| Informe de importación, saldos que no cuadran | `import/components/BalanceMismatchList.vue` | `accountAlias` | El informe solo trae `accountAlias` |
| Informe de importación, traspasos dudosos | `import/components/AmbiguousTransferList.vue` | `accountAlias` | Ídem |
| Informe de importación, cuenta creada por la importación | `import/details.ts` → `ImportedFileList.vue` | `alias` de la cuenta nueva | Aquí sí llegan `bank` e `iban`, pero el dato que el informe está contando es el `alias` que el backend le ha puesto a la cuenta recién creada, y las otras dos líneas del mismo informe solo pueden enseñar el `alias`. Cambiar una de tres dejaba el informe nombrando la misma cuenta de dos formas |

Consecuencia que se ve: en `Transfers`, la lista de parejas dice `N26 ···7719` y la de
grupos dudosos `n26 ···7719`. Para igualarlas hace falta que el backend mande `bank` e
`iban` en `GET /api/transfers/ambiguous` (y en el informe de importación), o que el
frontend pida la lista de cuentas en esas pantallas.

## Los desplegables de categoría

En los seis, el `<optgroup v-for>` pasa a ser un `<template v-for>` con dos ramas: si
la categoría tiene subcategorías, el mismo `<optgroup>` de antes (ella primero, luego
sus subcategorías); si no las tiene, un `<option>` suelto con el mismo `value`. No
cambian el orden (el del array recibido), los `value`, ni el filtro por `kind` de los
que lo tenían.

| Desplegable | Archivo |
|---|---|
| El de una línea de `Movements` | `statement/components/RowCategoryEditor.vue` |
| El de cada fila de `Review` | `review/components/MovementCategorySelect.vue` |
| El de la barra que sale al marcar varias en `Review` | `review/components/ReviewActionBar.vue` |
| El filtro de `Review` | `review/components/CategorySelect.vue` |
| El diálogo de reglas | `category-rules/components/RuleDialog.vue` |
| El filtro `Category` de `Movements` (el sexto, ver arriba) | `statement/components/StatementCategorySelect.vue` |

## Decisiones tomadas

- `accountLabel` vive en `shared/accounts.ts` y no en `shared/banks.ts`: nombra una
  cuenta, no un banco. Recibe solo `bank` e `iban`, así que le sirven los tres tipos de
  cuenta que hay (`AccountSummary`, `MovementAccount`, `NetWorthAccount`) sin tocarlos.
- Corta los cuatro últimos **caracteres** del IBAN, sin comprobar que sean dígitos. Un
  IBAN real termina en dígitos; los tests antiguos que usan `iban: 'ES00'` no se rompen.
- No he sacado el bloque de opciones a un componente compartido. Los seis archivos
  son copias a propósito (lo dicen sus comentarios y `docs/architecture.md`), y juntarlos
  es una decisión que no es de esta feature.
- El orden de las cuentas en los dos desplegables sigue siendo alfabético por el texto
  que se lee. Con dos cuentas del mismo banco, ordena por los cuatro dígitos.

## Tests de los ocho `checks`

Ninguno de los ocho está mal planteado: cada archivo es el del componente que nombra.
Dos notas:

- El check 3 («desplegable de cuenta y cada fila» de `Review`) solo ejecuta el test de
  la fila (`MovementRow.spec.ts`). El del desplegable lo he escrito también, en
  `ReviewFilterBar.spec.ts`, y corre en la suite, pero no en ese check.
- El check 6 («el de cada fila y el de la barra») solo ejecuta el de la barra
  (`ReviewActionBar.spec.ts`). El de la fila está en `MovementCategorySelect.spec.ts`,
  con el mismo texto y `(feature 28)` al final.

Para comprobar que los tests miran lo que cambia, aparté con `git stash` los 15
archivos de código, dejé los tests nuevos y lancé los siete archivos de componente:

```
 Test Files  7 failed (7)
      Tests  7 failed | 1 passed | 93 skipped (101)
```

Los siete que fallaron son los de los checks 1 a 6 y el segundo de
`MovementCategorySelect.spec.ts`. El que pasó es el del check 8, `groups a category
that has subcategories under its name`: es lo esperado, porque agrupar una categoría
con subcategorías ya lo hacía el código anterior y esta feature lo conserva. El del
check 7 (`accounts.spec.ts`) no entró en esa pasada: sin `accountLabel` el archivo no
compila. Después devolví el código con `git stash pop`.

Otros tests añadidos: `accountLabel` (formato, que no usa el `alias`, banco
desconocido e IBAN con espacios), dos cuentas del mismo banco en el desplegable
`Account`, las tres cuentas de `Net Worth`, y los desplegables de `CategorySelect` y
`RuleDialog`.

Tests que afirmaban el texto antiguo y he corregido: `StatementFilterBar.spec.ts` (las
cuentas, y los grupos del filtro de categoría), `StatementRow.spec.ts` (dos),
`StatementView.spec.ts`, `MovementRow.spec.ts`, `ReviewFilterBar.spec.ts`,
`CategorySelect.spec.ts`, `TransferPairRow.spec.ts`, `UnlinkConfirmDialog.spec.ts`,
`NetWorthView.spec.ts` y `e2e/transfer-pairs-review.spec.ts`.

Los IBAN de los tests nuevos están inventados.

## Documentos actualizados

Ninguno. Búsqueda lanzada:

```
git grep -n -i -E "alias|optgroup|bankinter ·|bankLabel|sale dos veces|dos veces" -- docs README.md CHECKPOINTS.md
```

Lo que sale y habla de esto son las filas 16 y 17 de la tabla de `docs/roadmap.md`
(los dos cabos sueltos de los que sale la feature; se tachan al cerrarla, no ahora) y
la nota del humano en `docs/guia-de-uso.md:370`. `docs/architecture.md` y
`docs/stack.md` no dicen nada que haya dejado de ser verdad: no describen el texto de
una cuenta ni la forma de los desplegables.

## Prueba real

No se ha hecho. La feature lee `bank` e `iban` de respuestas del backend, y el encargo
prohíbe arrancar servidores y hablar con el backend real. Lo que **no he comprobado**:
que en los datos reales los cuatro últimos caracteres del `iban` de cada cuenta sean
los mismos cuatro dígitos que hoy enseña su `alias`. Haría falta abrir `Movements` con
el backend real y comparar el desplegable `Account` con el de antes.

## Último ./init.sh

Código de salida 0. Líneas finales:

```
── 4. Type checking (tsc) ──────────────────────────────
[OK]    Type check OK (tsc sin errores)

── 5. Lint y formato ───────────────────────────────────
[OK]    OK: pnpm lint:oxlint:check
All matched files use Prettier code style!
[OK]    OK: pnpm format:check

── 6. Ejecutando tests ─────────────────────────────────
 Test Files  105 passed (105)
      Tests  1747 passed (1747)
[OK]    Todos los tests pasan

── 6b. Pasos propios del proyecto (init.local.sh) ──────
[OK]    Cabeceras Archivos: de 17 tasks.md: ninguna declara dos rutas que solo se distingan en mayúsculas y minúsculas
[OK]    OK: pnpm type-check (vue-tsc --build, incluye los .vue)
[OK]    E2E smoke verde (chromium)

── 7. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

## Último ./init.sh --checks 28

Código de salida 0.

```
── Checks de la feature ───────────────────────────────
[OK]        exit 0
[OK]        exit 0
[OK]        exit 0
[OK]        exit 0
[OK]        exit 0
[OK]        exit 0
[OK]        exit 0
[OK]        exit 0
[OK]    Checks: 8 de 8 en verde.
```

## Sugerencias fuera de scope (NO aplicadas)

- `src/shared/__tests__/accounts.spec.ts` tiene, desde antes de esta feature, un bloque
  comentado como «The five real accounts of the user» con cinco IBAN completos. No he
  comprobado si son reales. Si lo son, contradice la regla de que ningún dato real
  entra en un archivo que va a git.
- `docs/architecture.md` no lista `shared/accounts.ts` ni `shared/movement-filters.ts`
  en el árbol de `shared/`. Ya faltaban antes.

## Ajuste de Net Worth

Hecho por un segundo `implementer`, por decisión del leader, después de todo lo
anterior. Sustituye a lo que dicen arriba el punto 2 de «Dos cosas que el leader tiene
que decidir», el párrafo «`Net Worth`, lo que queda repetido» y las dos secciones
«Último ./init.sh» y «Último ./init.sh --checks 28».

### Qué se ha quitado

En `Net Worth`, la fila de una cuenta decía `Bankinter ···1332` y, en la línea de
debajo, `Checking account`, `···· 1332` y `As of 12 Sep 2026`. Ahora la línea de debajo
dice `Checking account` y `As of 12 Sep 2026`: los cuatro últimos dígitos salen una
sola vez, en el nombre.

**No se ha quitado la línea entera, solo los dígitos.** Esa línea lleva también el tipo
de cuenta y la fecha del dato (`As of …`), que no están en ningún otro sitio de la
fila. Lo quitado es únicamente el `<span>` de `···· 1332`.

El saldo, la fecha, el tipo y la letra de color de la fila no cambian. Las filas de los
productos de inversión tampoco: nunca enseñaron esos dígitos.

### Archivos

- `src/features/net-worth/components/AccountCard.vue` — fuera el `<span>` de los
  dígitos y la propiedad `last4`, que ya no pintaba nada. Una línea de comentario dice
  que esa parte del componente original de `design-system/` no se trae y por qué.
- `src/features/net-worth/components/BankCard.vue` — deja de calcular y de pasar
  `last4` (era el único sitio que lo hacía). El nombre sigue saliendo de `accountLabel`.
- `src/features/net-worth/__tests__/NetWorthView.spec.ts` — un test nuevo.

### Tests

- Nuevo: `shows the last four digits of an account only once in its row (feature 28)`.
  Para las tres cuentas del fixture comprueba que sus cuatro dígitos aparecen
  exactamente una vez en el texto de su fila y que la fecha `As of …` sigue ahí; para
  la de Bankinter, que sigue diciendo `Checking account`.
- Lo lancé **antes** de tocar el componente y falló por lo que tenía que fallar:

  ```
  AssertionError: expected [ 'BBankinter ···', …(2) ] to have a length of 2 but got 3
   Test Files  1 failed (1)
        Tests  1 failed | 22 passed (23)
  ```

  Después del cambio, `pnpm exec vitest run src/features/net-worth`:

  ```
   Test Files  6 passed (6)
        Tests  65 passed (65)
  ```

- Ningún test afirmaba el texto `···· 1332`, así que no ha habido que corregir
  ninguno. El que más se le acercaba, `expect(account.text()).toContain('1332')` en el
  test de R12, sigue siendo verdad por el nombre de la fila y se queda como estaba.

### Lo que el cambio podría haber vuelto falso

```
git grep -n -E "last4|····" -- . ":!progress" ":!specs"
```

Fuera de `src/` solo sale la carpeta `design-system/` (el componente original
`AccountCard.jsx`, sus ejemplos y dos líneas de `design-system/readme.md` sobre el uso
de `····`). Es el diseño de referencia, no describe lo que hace la aplicación, y no se
ha tocado. En `src/` no queda ninguna aparición.

### Prueba real

No se ha hecho, por lo mismo que arriba: el encargo prohíbe arrancar servidores. No he
visto la pantalla `Net Worth` en un navegador con datos reales; lo comprobado es el
test del componente montado con el fixture.

### Último ./init.sh

Código de salida 0. Lanzado después del último cambio de código.

```
── 3. Validando feature_list.json ──────────────────────
[OK]    feature_list.json válido (28 features)
[OK]    Specs presentes para features sdd con estado no-pending

── 4. Type checking (tsc) ──────────────────────────────
[OK]    Type check OK (tsc sin errores)

── 5. Lint y formato ───────────────────────────────────
[OK]    OK: pnpm lint:oxlint:check
[OK]    OK: pnpm format:check

── 6. Ejecutando tests ─────────────────────────────────
 Test Files  105 passed (105)
      Tests  1748 passed (1748)
[OK]    Todos los tests pasan

── 6b. Pasos propios del proyecto (init.local.sh) ──────
[OK]    Cabeceras Archivos: de 17 tasks.md: ninguna declara dos rutas que solo se distingan en mayúsculas y minúsculas
[OK]    OK: pnpm type-check (vue-tsc --build, incluye los .vue)
[OK]    E2E smoke verde (chromium)

── 7. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

1748 tests: los 1747 de antes y el nuevo.

### Último ./init.sh --checks 28

Código de salida 0. Los ocho comandos salieron con `exit 0`; línea final:

```
[OK]    Checks: 8 de 8 en verde.
```

### Lo que no se ha tocado

`feature_list.json`, los `checks`, `StatementCategorySelect.vue`, los grupos dudosos de
`Transfers` y el informe de importación. La feature sigue `in_progress`.

## Correcciones tras el rechazo

Hecho por un tercer `implementer` tras el veredicto `CHANGES_REQUESTED` de
`progress/reviews/repeated-labels.md`. Sustituye, de lo escrito arriba: la fila «Informe
de importación, cuenta creada por la importación» de «Sitios que he dejado como
estaban», la decisión «Corta los cuatro últimos caracteres del IBAN, sin comprobar que
sean dígitos», el primer punto de «Sugerencias fuera de scope» y las secciones «Último
./init.sh» y «Último ./init.sh --checks 28». La feature sigue `in_progress`;
`feature_list.json` no se ha tocado.

### 1. Datos reales en los tests

**Archivo que los tenía completos:** `src/shared/__tests__/accounts.spec.ts`. Los cinco
números de cuenta completos estaban en las líneas 12, 25, 32, 39 y 46 de la versión
anterior, y el primero repetido en la 64. Busqué trozos de diez dígitos de cada uno en
todo el repositorio (`git grep`, también `progress/` y `specs/`): no aparecen en ningún
otro archivo. En el histórico de git siguen estando (commit `869e027` en adelante); no
se ha tocado.

Sustituidos en ese archivo, todos por valores inventados desde cero:

- los cinco números de cuenta (líneas 13, 26, 33, 40, 47 y 65 de la versión nueva);
- el `alias` de cada una, que llevaba sus cuatro últimos dígitos;
- los cinco `id`, los dos saldos y las tres fechas de la primera cuenta. **No he
  comprobado que estos fueran reales**: estaban bajo el mismo comentario que decía que
  las cuentas eran las del usuario, y los he cambiado por eso;
- el comentario de cabecera, que ahora dice que todo es inventado.

**Forma de los números inventados:** código de país y longitud correctos (24 caracteres
los `ES`, 22 el `DE`), y **a propósito no pasan** la suma de control de un IBAN (resto
de la división entre 97 distinto de 1; lo calculé para los ocho números nuevos). Así no
pueden ser la cuenta de nadie. Es el mismo criterio que ya seguían los inventados de
esta feature. Si se quiere que además pasen la suma de control, es cambiar dos dígitos
de cada uno.

**Los cuatro últimos dígitos de las cuentas reales también estaban fuera de ese
archivo**, igual que los `id` y uno de los saldos. Sustituidos (mismos valores
inventados en todos, para que los tests sigan casando entre sí):

| Archivo | Líneas | Qué había |
|---|---|---|
| `src/features/transfers/__tests__/fixtures.ts` | 13-14, 16, 20-21, 23, 27-28, 30 | `id`, cuatro últimos dígitos (en un número relleno de ceros) y `alias` de tres cuentas |
| `src/features/transfers/__tests__/TransferPairRow.spec.ts` | 25, 29, 37 | cuatro últimos dígitos |
| `src/features/transfers/__tests__/UnlinkConfirmDialog.spec.ts` | 31, 32 | cuatro últimos dígitos |
| `src/features/transfers/__tests__/AmbiguousGroupCard.spec.ts` | 46 | cuatro últimos dígitos |
| `src/features/transfers/__tests__/service.spec.ts` | 83, 116, 117 | cuatro últimos dígitos y un `id` |
| `src/features/statement/__tests__/filters.spec.ts` | 37, 68, 73, 110, 112, 134, 170, 214, 223, 228, 250, 257, 284, 288, 298 | un `id` de cuenta |
| `src/features/statement/__tests__/fixtures.ts` | 217 | un saldo |
| `e2e/transfer-pairs-review.spec.ts` | 19, 20, 21, 325, 326 | `id` y cuatro últimos dígitos |
| `e2e/statement.spec.ts` | 116 | un saldo |
| `e2e/statement-noise-toggle.spec.ts` | 124 | un saldo |
| `docs/roadmap.md` | 441 | cuatro últimos dígitos, en el ejemplo del cabo suelto 17 |
| `docs/guia-de-uso.md` | 371 | cuatro últimos dígitos, **dentro de una nota escrita por el humano**. Solo he cambiado los cuatro dígitos; el resto de su frase está igual. Si no debía tocarse, se deshace con `git checkout -- docs/guia-de-uso.md` |
| `progress/implementations/repeated-labels.md` (este informe, sin commitear) | 57, 69, 70, 89, 94, 95 | cuatro últimos dígitos en los ejemplos |

**Sitios que no puedo tocar y siguen teniéndolos:**

- `feature_list.json`, líneas 1323 y 1328: los cuatro últimos dígitos de una cuenta
  real, en el ejemplo del texto de la feature 28.

En `progress/` y `specs/` ya commiteados no aparece ninguno de esos valores (mismo
`git grep`, sin resultados). `progress/reviews/repeated-labels.md` (sin commitear, del
`reviewer`) tampoco los tiene.

**Otros números de cuenta completos en `src/`, `e2e/` y `docs/`.** Saqué todos los que
tienen forma de IBAN español o alemán (21 distintos) y calculé la suma de control de
cada uno. Diecisiete no la pasan: son inventados. **Cuatro sí la pasan y no los he
cambiado**; ninguno coincide con las cinco cuentas reales, ni entero ni en los cuatro
últimos dígitos (comparados antes de sustituir). Los recuerdo como números de ejemplo
de documentación pública, pero **eso no lo he comprobado**; haría falta que el humano
confirme que no son suyos:

- uno, doce veces: `e2e/statement.spec.ts:14`, `e2e/statement-noise-toggle.spec.ts:15`,
  `e2e/statement-fix-category.spec.ts:15`, `e2e/statement-exclude-from-totals.spec.ts:15`,
  `e2e/category-rules.spec.ts:12`, `e2e/review-queue.spec.ts:10`,
  `e2e/review-actions.spec.ts:11`, `src/features/category-rules/__tests__/fixtures.ts:238`,
  `src/features/review/__tests__/service.spec.ts:106`,
  `src/features/review/__tests__/fixtures.ts:10`,
  `src/features/statement/__tests__/fixtures.ts:9` y `:205`;
- otro, cuatro veces: `src/features/net-worth/__tests__/service.spec.ts:20` y `:133`,
  `src/features/net-worth/__tests__/fixtures.ts:25`, `e2e/action-notice-in-view.spec.ts:30`;
- otro, dos veces: `src/features/net-worth/__tests__/fixtures.ts:33`,
  `src/features/review/__tests__/fixtures.ts:18`;
- otro, una vez: `e2e/action-notice-in-view.spec.ts:22`.

No he encontrado nombres de personas ni otros datos de cuenta con aspecto de reales en
esas tres carpetas; lo buscado fueron números con forma de IBAN, los cuatro últimos
dígitos, los `id` y los saldos del bloque sustituido, y la palabra `real` junto a
`account`, `iban` o `user`.

### 2. La cuenta que crea una importación

`src/features/import/details.ts` nombra ahora la cuenta nueva con `accountLabel`
(`Bankinter ···0236` en vez de `bankinter 0236`). En
`src/features/import/components/ImportedFileList.vue` el atributo de test pasa de
`new-account-alias` a `new-account-name`, porque ya no pinta el `alias` (solo lo usaba
un test).

Tests nuevos:

- `src/features/import/__tests__/details.spec.ts` —
  `names the new account as the bank and its last four digits, not by its alias (feature 28)`
- `src/features/import/__tests__/ImportedFileList.spec.ts` —
  `names the account it created as the bank and its last four digits, not by its alias (feature 28)`

Con `details.ts` devuelto a la versión commiteada, los dos fallan
(`AssertionError: expected 'bankinter 0236' to be 'Bankinter ···0236'`, `exit 1`);
restaurado, pasan.

Las otras dos listas del informe de importación (`BalanceMismatchList.vue`,
`AmbiguousTransferList.vue`) siguen con `accountAlias`: es lo único que el backend manda
ahí.

### 3. IBAN que no acaba en cuatro dígitos

**Decisión: si, quitados los espacios, los cuatro últimos caracteres del IBAN no son
cuatro dígitos, `accountLabel` devuelve solo el nombre del banco (`N26`), sin `···`.**
Motivo: `···` seguido de algo que no es el final de un número de cuenta (`···ES00`,
`···123`, `···4-63`) dice una cosa que no es verdad; el banco solo es lo que sí se sabe.

Test nuevo en `src/shared/__tests__/accounts.spec.ts`:
`names only the bank when the IBAN does not end in four digits` (IBAN de cuatro
caracteres con letras, de tres dígitos, de solo espacios, con guiones, y banco
desconocido). Con la condición quitada de `accountLabel` falla
(`AssertionError: expected 'N26 ···ES00' to be 'N26'`, `exit 1`); restaurada, pasa.

Consecuencia: dos cuentas del mismo banco con IBAN así se leerían igual. No pasa con
ningún dato de los tests actuales (la suite entera sigue en verde).

### 4. La otra mitad de los checks 3, 4 y 6

Los tres tests ya existían. Para cada uno devolví el componente a su versión commiteada
(`git show HEAD:<archivo>`), lancé el test solo, y restauré el componente:

| Check | Archivo del test | Nombre literal del test | Componente devuelto a lo de antes | Resultado con el componente antiguo | Restaurado |
|---|---|---|---|---|---|
| 3 | `src/features/review/__tests__/ReviewFilterBar.spec.ts` | `names each account as the bank and its last four digits, without repeating the bank` | `review/components/ReviewFilterBar.vue` | `Tests 1 failed \| 13 skipped (14)`, `expected 'All accounts Bankinter · bankinter ··…' not to contain 'bankinter'` | `Tests 1 passed \| 13 skipped (14)` |
| 4 | `src/features/net-worth/__tests__/NetWorthView.spec.ts` | `names each account as the bank and its last four digits, not by its alias (feature 28)` | `net-worth/components/BankCard.vue` | `exit 1`, `Tests 1 failed \| 22 skipped (23)` | `exit 0`, `Tests 1 passed \| 22 skipped (23)` |
| 6 | `src/features/review/__tests__/MovementCategorySelect.spec.ts` | `offers a category without subcategories once, with no group title (feature 28)` | `review/components/MovementCategorySelect.vue` | `exit 1`, `Tests 1 failed \| 8 skipped (9)`, `expected [ DOMWrapper{ …(3) } ] to have a length of +0 but got 1` | `exit 0`, `Tests 1 passed \| 8 skipped (9)` |

Para el check 4, `AccountCard.vue` no nombra la cuenta (recibe el nombre de
`BankCard.vue`), así que el componente que se devolvió fue `BankCard.vue`.

**Aviso para escribir los `comando`: el paréntesis de `(feature 28)` no puede ir en
`-t`.** `vitest run -t` trata el texto como expresión regular. Lo lancé con el nombre
entero del test de `NetWorthView.spec.ts`, paréntesis incluidos: no ejecutó ningún test
(`Tests 23 skipped (23)`) **y salió con `exit 0`**. Un check escrito así estaría en
verde sin mirar nada. Las pasadas de la tabla de los checks 4 y 6 se hicieron con el
nombre sin el final ` (feature 28)`:

- check 4: `-t "names each account as the bank and its last four digits, not by its alias"`
- check 6: `-t "offers a category without subcategories once, with no group title"`

El `grep -qF` del principio de cada `comando` sí admite el nombre entero.

### Documentos actualizados

```
git grep -n -i -E "new-account-alias|accountLabel|last four characters|New account" -- . ":!progress" ":!specs" ":!src/**/__tests__/**" ":!feature_list.json"
```

Corregido: el comentario de `accountLabel` en `src/shared/accounts.ts` (decía «last four
characters») y el del campo `newAccount` en `src/features/import/details.ts` (decía
«Alias of the account»). En `docs/` y `README.md` esa búsqueda no devuelve nada.
`docs/roadmap.md` y `docs/guia-de-uso.md` solo cambian en los cuatro dígitos de la tabla
del punto 1.

### Prueba real

No se ha hecho: el encargo prohíbe hablar con el backend real. Sigue sin comprobar por
mí que el `iban` de cada cuenta real acabe en los mismos cuatro dígitos que su `alias`.
El punto 4 del veredicto (apuntarlo en `docs/roadmap.md` como deber del humano) no
estaba en este encargo y no lo he hecho.

### Último ./init.sh

Código de salida 0. Lanzado después del último cambio de código.

```
── 4. Type checking (tsc) ──────────────────────────────
[INFO]  Ejecutando: npx tsc --noEmit --incremental
[OK]    Type check OK (tsc sin errores)

── 5. Lint y formato ───────────────────────────────────
[INFO]  Ejecutando: pnpm lint:oxlint:check
[OK]    OK: pnpm lint:oxlint:check
[INFO]  Ejecutando: pnpm format:check
All matched files use Prettier code style!
[OK]    OK: pnpm format:check

── 6. Ejecutando tests ─────────────────────────────────
[INFO]  Ejecutando: pnpm test:unit
 Test Files  105 passed (105)
      Tests  1751 passed (1751)
[OK]    Todos los tests pasan

── 6b. Pasos propios del proyecto (init.local.sh) ──────
[OK]    Cabeceras Archivos: de 17 tasks.md: ninguna declara dos rutas que solo se distingan en mayúsculas y minúsculas
[INFO]  Ejecutando: pnpm type-check
[OK]    OK: pnpm type-check (vue-tsc --build, incluye los .vue)
[INFO]  Ejecutando: pnpm test:e2e --project=chromium
[OK]    E2E smoke verde (chromium)

── 7. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

1751 tests: los 1748 de antes y los tres nuevos (dos del informe de importación, uno
del IBAN que no acaba en cuatro dígitos).

### Último ./init.sh --checks 28

Código de salida 0.

```
── Checks de la feature ───────────────────────────────
[OK]        exit 0
[OK]        exit 0
[OK]        exit 0
[OK]        exit 0
[OK]        exit 0
[OK]        exit 0
[OK]        exit 0
[OK]        exit 0
[OK]    Checks: 8 de 8 en verde.
```

### Archivos tocados en esta pasada

Código: `src/shared/accounts.ts`, `src/features/import/details.ts`,
`src/features/import/components/ImportedFileList.vue`.
Tests: `src/shared/__tests__/accounts.spec.ts`,
`src/features/import/__tests__/details.spec.ts`,
`src/features/import/__tests__/ImportedFileList.spec.ts` y los diez de la tabla del
punto 1. Documentos: `docs/roadmap.md`, `docs/guia-de-uso.md`, `progress/current.md`,
este informe.

### Sugerencias fuera de scope (NO aplicadas)

- `docs/architecture.md:158-165` sigue sin listar `shared/accounts.ts` (nota del
  `reviewer` que no bloquea).
