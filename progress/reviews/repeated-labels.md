# repeated-labels — revisión

> Hubo una primera revisión el 2026-10-12 con veredicto `CHANGES_REQUESTED`, por
> cuatro motivos: los `comando` de los `checks` 3, 4 y 6 solo ejecutaban el test
> de la mitad de su frase; `src/features/import/details.ts` nombraba la cuenta
> recién creada con el `alias` teniendo `bank` e `iban`;
> `src/shared/__tests__/accounts.spec.ts` llevaba cinco números de cuenta
> completos bajo un comentario que decía que eran los del usuario; y la prueba
> con datos reales no estaba hecha ni apuntada en `docs/roadmap.md`. Lo de abajo
> es la segunda revisión, que la sustituye.

## Review (2026-10-12, segunda)

**Veredicto:** APPROVED
Comprobado: acceptance ↔ tests, arquitectura, convenciones, verificación,
CHECKPOINTS C1-C6 y C8 (C7 no aplica: no es SDD). Checks: 8 de 8 en verde.
Sin hallazgos que bloqueen.
Resumen de cierre: `progress/summaries/repeated-labels.md`.

### Notas que no bloquean

1. `feature_list.json:1323` y `:1328` — el ejemplo del texto de la feature 28
   lleva los cuatro últimos dígitos de una de las cuentas que estaban en el
   archivo de tests. Son cuatro dígitos, no un número de cuenta completo, y uno
   de los dos sitios es una respuesta escrita por el humano; ya están
   commiteados (`1abeb59`). En `docs/roadmap.md` y `docs/guia-de-uso.md` esos
   mismos cuatro dígitos sí se han sustituido. Que se sustituyan también aquí o
   no lo decide el leader con el humano; el `implementer` no puede tocar ese
   archivo.
2. `docs/architecture.md:158-165` sigue sin listar `shared/accounts.ts`. Ya
   faltaba antes de esta feature.
3. Con la regla nueva, dos cuentas del mismo banco cuyo `iban` no acabe en
   cuatro dígitos se leerían igual (solo el banco). No ocurre con ningún dato de
   los tests; con los datos reales no está comprobado (cabo 32 de
   `docs/roadmap.md`).

### Comprobado sin hallazgos, con qué comando y qué salió

- **`./init.sh` completo**, lanzado por mí: código de salida 0. `Test Files 105
  passed (105)`, `Tests 1751 passed (1751)`, `pnpm lint:oxlint:check` OK,
  `pnpm format:check` OK, `pnpm type-check` OK, el paso de Playwright en
  chromium OK, `[OK] Entorno listo`.
- **`./init.sh --checks 28`**, lanzado por mí: código de salida 0, `Checks: 8 de
  8 en verde`.
- **Cada `comando` ejecuta un test por cada mitad de su frase.** Lancé los ocho
  comandos, escritos tal cual están en `feature_list.json`, en una copia
  desechable de `src/` (ver «Cómo lo comprobé»). Los checks 1, 2, 5, 7 y 8 dan
  una línea `Tests 1 passed | N skipped`. Los checks 3, 4 y 6 dan dos, una por
  archivo: check 3, `1 passed | 14 skipped (15)` y `1 passed | 13 skipped (14)`;
  check 4, `1 passed | 7 skipped (8)` y `1 passed | 22 skipped (23)`; check 6,
  `1 passed | 8 skipped (9)` dos veces.
- **Cada mitad pone el check en rojo si se rompe.** Devolviendo un componente
  cada vez a su versión commiteada y lanzando el `comando` entero:
  `ReviewFilterBar.vue` → check 3 `exit 1` (primera mitad pasa, segunda
  `1 failed`); `review/MovementRow.vue` → check 3 `exit 1`; `BankCard.vue` →
  check 4 `exit 1` (primera mitad pasa, segunda `1 failed`);
  `TransferPairRow.vue` → check 4 `exit 1`; `MovementCategorySelect.vue` →
  check 6 `exit 1` (primera mitad pasa, segunda `1 failed`);
  `ReviewActionBar.vue` → check 6 `exit 1`. Y los que no cambiaban:
  `StatementFilterBar.vue` → check 1 `exit 1`; `StatementRow.vue` → check 2
  `exit 1`; `RowCategoryEditor.vue` → check 5 `exit 1`. Con `accountLabel`
  repitiendo el banco: checks 1, 2, 3, 4 y 7 `exit 1`.
- **El dato del `implementer` sobre `vitest run -t` es cierto.** Con el nombre
  entero, paréntesis de `(feature 28)` incluido, sobre `NetWorthView.spec.ts`:
  `Tests 23 skipped (23)` y `exit 0`. Con los paréntesis escapados:
  `1 passed | 22 skipped (23)`. Los `comando` de los checks 4 y 6 llevan el `-t`
  sin el paréntesis y el `grep -qF` con el nombre entero.
- **La cuenta que crea una importación.** `src/features/import/details.ts:228`
  usa `accountLabel`. Con `details.ts` devuelto a su versión commiteada, los dos
  tests nuevos (`details.spec.ts` e `ImportedFileList.spec.ts`, filtrados con
  `-t "feature 28"`) dan `Tests 2 failed | 36 skipped (38)`, `exit 1`;
  restaurado, `2 passed`. `git grep` de `new-account-alias`, `last four
  characters` y `Alias of the account` fuera de `progress/` y `specs/`: sin
  resultados.
- **IBAN que no acaba en cuatro dígitos.** Con la condición quitada de
  `accountLabel`, el test `names only the bank when the IBAN does not end in
  four digits` falla (`AssertionError: expected 'N26 ···ES00' to be 'N26'`,
  `Tests 1 failed | 8 passed (9)`, `exit 1`); restaurada, `9 passed`. La suite
  entera sigue en verde con la regla puesta, así que ningún test de los que ya
  había dependía del comportamiento anterior.
- **Números de cuenta.** Con un programa que lee los cinco números de la versión
  commiteada de `src/shared/__tests__/accounts.spec.ts` y recorre los 569
  archivos del árbol de trabajo que no están ignorados (incluidos `progress/`,
  `specs/` y `docs/`), sin imprimir ningún número:
  - ninguno de los cinco aparece completo, ni con espacios o guiones quitados;
  - buscando todos los trozos de ocho dígitos seguidos de cada uno, hay una sola
    coincidencia: `src/features/net-worth/__tests__/fixtures.ts:41` comparte
    nueve dígitos con uno de ellos. Son el código de la entidad y el de la
    oficina, seguidos en esa línea de `0123456789`; esa línea está desde el
    commit `5128520` y ese número no pasa la suma de control. No es un número de
    cuenta real;
  - los cinco `id` y los dos saldos de la versión commiteada no aparecen en
    ningún archivo;
  - los cuatro últimos dígitos de cada uno solo aparecen en los dos sitios de
    `feature_list.json` de la nota 1, y como medida en píxeles en tres archivos
    de estilos y de `design-system/`, que no tienen que ver.
- **Los cuatro IBAN de los tests que pasan la suma de control.** Saqué todos los
  textos con forma de IBAN español o alemán del árbol de trabajo: 22 distintos,
  4 pasan la suma de control (resto 1 al dividir entre 97). De esos cuatro,
  ninguno coincide con los cinco de la versión commiteada, ni entero ni en sus
  cuatro últimos dígitos. Descargando páginas públicas y buscando en ellas sin
  enviar nada: uno está en `https://www.iban.es/ejemplos.html`; otros dos están
  en `https://docs.stripe.com/testing`, y uno de esos dos además en
  `https://www.ecbs.org/iban/spain-bank-account-number.html`. **El cuarto (el
  que usan once archivos, entre ellos `src/features/statement/__tests__/fixtures.ts:9`)
  no lo encontré en ninguna de las trece páginas públicas que respondieron.** Lo que sí
  comprobé de él: su código de entidad no es el del banco que el test le pone;
  entró en el commit `f427175` (features 15 y 16); y el backend lo usa en su
  `README.md`, en su `docs/verification.md` y lo tiene en la lista de permitidos
  de `gastos-backend/src/no-real-data.test.ts:57` con el comentario «Synthetic
  IBAN used across fixtures and docs/api-contract.md since feature 8». No he
  comprobado contra la API que no sea una cuenta del humano; el leader dice en
  el cabo 31 que confirmó contra la API cuáles eran las reales, y este no
  coincide con ninguna de ellas.
- **Coherencia de los tests tras la sustitución.** La suite entera (1751) y el
  paso de Playwright, que incluye los tres archivos de `e2e/` tocados, pasan en
  el `./init.sh` de arriba.
- **Prueba con datos reales (C4 bis).** No hecha; el informe dice por qué y
  `docs/roadmap.md` la tiene apuntada (fila 32 de la tabla de cabos sueltos).
  Los números reales en el histórico de git están en la fila 31.
- **Lo ya dado por bueno en la primera revisión sigue igual.** `git grep` de
  `.alias` y `accountAlias` en `src/` fuera de los tests: solo quedan los
  lectores de las respuestas y los tres sitios que solo reciben `accountAlias`
  (`AmbiguousGroupCard.vue`, `BalanceMismatchList.vue`,
  `AmbiguousTransferList.vue`). `accountLabel` se usa en nueve sitios. El diff
  de `feature_list.json` solo toca los `comando` de los checks 3, 4 y 6 y el
  `status`. En las líneas añadidas de `src/` y `e2e/` no hay `console.`,
  `debugger`, `TODO` ni `.only(`. Una sola feature `in_progress`. Archivos sin
  seguimiento: solo el informe y esta revisión.
- Arquitectura (`details.ts` importa la función de `shared/`), convenciones,
  `docs/lessons.md` (ninguna entrada dirigida al `implementer`), vocabulario del
  informe, documentos fuera de `progress/` y `specs/` (solo habla del texto
  antiguo la fila 17 de `docs/roadmap.md`, que se cierra al cerrar la feature).

### Cómo lo comprobé

Para no tocar el código revisado, copié `src/` y los archivos de configuración a
una carpeta temporal fuera del repositorio, enlazada al `node_modules` del
proyecto. La copia era idéntica (`diff -rq`) antes de empezar y después de cada
restauración. Dos pasadas mías salieron mal montadas y las repetí: en la primera
la copia no tenía `.env.test` y ningún comando ejecutó tests (`Tests no tests`,
`exit 1` en todos); en la del IBAN que no acaba en cuatro dígitos, el primer
intento de quitar la condición no cambió el archivo (el `diff` contra el
original no dio nada) y el test pasó, lo que no decía nada; lo repetí
comprobando antes con `diff` que la línea había cambiado. Al terminar quité el
enlace a `node_modules`; `git status` da los mismos 48 archivos que al empezar.
No he tocado ningún proceso de los puertos 5173 ni 3000.
