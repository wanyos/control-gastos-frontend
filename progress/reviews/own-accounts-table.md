> Primera revisión (2026-10-21): rechazada por dos puntos — sin conexión, la ventana decía
> que la tabla enseñaba lo que tiene el servidor cuando no se había podido volver a leer;
> y el check 9 no comprobaba nombre o banco vacíos ni la falta de tipo. Queda abajo, entera.

## Review — 2026-10-21 (segunda pasada)

**Veredicto:** APPROVED
Comprobado: acceptance/requirements ↔ tests, arquitectura, convenciones,
verificación, CHECKPOINTS C1-C8. Checks: 9 de 9 en verde.
Sin hallazgos.
Resumen de cierre: `progress/summaries/own-accounts-table.md`.

Cómo se comprobaron los dos puntos del rechazo:

- Frase sin conexión: prueba temporal (montando `OwnAccountsView` con `fetch` simulado,
  borrada al terminar). Control con la segunda lectura bien → `Something went wrong
  saving. The table now shows what the server has.`, 12 filas (la prueba está bien
  montada). Con `PATCH` y la segunda lectura cortadas → `Something went wrong saving, and
  the table couldn't be read again. Reload the page to see what the server has.`, 0 filas,
  `Couldn't reach the server.`. Lo mismo con las formas del nombre (`…the list couldn't be
  read again…`; con la segunda lectura bien, la frase de siempre).
- Check 9: quitando de `draftProblems` cada vez una de las tres líneas (nombre, banco,
  tipo), el `comando` del check 9 sale con exit 1 las tres veces (falla `blank name or
  bank or no type keep Save off`). `texts.ts` restaurado, `sha256sum -c` OK. Sin tocar,
  ese test ejecuta `1 passed | 5 skipped`.
- `timeout 900 ./init.sh` → exit 0, `Test Files 126 passed (126)`, `Tests 2080 passed
  (2080)`, E2E chromium en verde. `timeout 900 ./init.sh --checks 36` → exit 0, `Checks:
  9 de 9 en verde`.
- `docs/guia-de-uso.md`: las 92 líneas `--` del humano idénticas y en el mismo orden que
  en `HEAD`; los 11 bloques «Mis notas de esta prueba» intactos (más el nuevo, vacío, de
  la §7b); las únicas líneas quitadas siguen siendo las 3 del párrafo del menú. La frase
  nueva de la §7b (líneas 1580-1583) dice lo que hace el código.

---

## Primera revisión
### Review — 2026-10-21

**Veredicto:** CHANGES_REQUESTED

### Cambios requeridos

1. `src/features/own-accounts/texts.ts:229` (`saveErrorMessage`, rama «resto») y
   `src/features/own-accounts/texts.ts:237` (`namesSaveErrorMessage`, rama «resto») —
   **sin conexión con el backend, la ventana dice algo falso.** Con un fallo de red al
   guardar, la ventana pinta `Something went wrong saving. The table now shows what the
   server has.` (o `… The list now shows what the server has.`), pero la segunda lectura
   tampoco llega al backend, así que la tabla desaparece y en su lugar sale
   `Couldn't reach the server.` (en las formas del nombre, el bloque pasa a ese mismo
   error). La frase afirma que la tabla enseña lo que tiene el servidor cuando no enseña
   nada. Comprobado con una prueba temporal en
   `src/features/own-accounts/__tests__/` (montando `OwnAccountsView` con `fetch`
   simulado: lectura inicial bien, `PATCH` y la segunda lectura con `TypeError('Failed to
   fetch')`; borrada al terminar): resultado `message: "Something went wrong saving. The
   table now shows what the server has."`, `rows: 0`,
   `tableError: "Couldn't reach the server."`; y en las formas del nombre
   `message: "Something went wrong saving. The list now shows what the server has."`,
   `blockError: "Couldn't reach the server."`. El test
   `a failure that may have written reads the table again`
   (`store.spec.ts:206`, con el bucle de la línea 227) y
   `a failed save of the forms of your name that may have written asks them again`
   (`store.spec.ts:292`) simulan el fallo de red solo en la escritura, con la segunda
   lectura respondiendo bien: no cubren el caso real de «sin conexión», en el que fallan
   las dos. Qué hacer: que la frase no afirme lo que la segunda lectura no ha conseguido
   (por ejemplo, decidirla después de la segunda lectura, o una frase propia para el fallo
   de red), y un test con la escritura **y** la segunda lectura fallando. La frase viene
   de `specs/36-own-accounts-table/design.md §6`, así que el cambio pasa por el spec.

2. `feature_list.json`, check [9] de la feature 36 («la ventana no deja guardar lo que el
   backend rechazaría y dice por qué») — **no demuestra su frase entera.** La hoja
   (🔴 4) cuenta como rechazos nombre o banco vacíos y sin tipo, y el check solo lanza
   los tests del texto corto, la fecha de cierre y la forma corta. Comprobado rompiendo a
   propósito `draftProblems` (quitando las tres líneas de nombre, banco y tipo en
   `src/features/own-accounts/texts.ts`, copia guardada y restaurada después; `sha256sum
   -c` OK): las tres partes del check [9] siguen saliendo `1 passed` con exit 0, mientras
   que `blank name or bank or no type keep Save off` (`OwnAccountDialog.spec.ts`) falla.
   Qué hacer: añadir ese test al `comando` del check [9].

### Comprobado sin hallazgos

- `timeout 900 ./init.sh` → exit 0: tipos, oxlint, formato, `Test Files 126 passed (126)`,
  `Tests 2078 passed (2078)`, `vue-tsc --build`, `pnpm test:e2e --project=chromium` en verde.
- `timeout 900 ./init.sh --checks 36` → exit 0, `Checks: 9 de 9 en verde`. Como el resumen
  solo enseña la última línea, lancé por separado cada `vitest -t` / `playwright -g` de
  los 9 checks: las 27 partes ejecutan exactamente un test cada una (`1 passed`), ninguna
  sale con 0 sin ejecutar nada. Los checks coinciden con la tabla 🧪 de `decisions.md`
  salvo lo dicho en el punto 2.
- `timeout 900 ./init.sh --checks N` de las features 27 a 35, todas exit 0: F35 12 de 12,
  F34 12 de 12, F33 11 de 11, F32 14 de 14, F31 10 de 10, F30 9 de 9, F29 11 de 11,
  F28 8 de 8, F27 12 de 12 en verde.
- Trazabilidad: R1–R15 tienen cada uno al menos un test que lo verifica; las 13 tasks
  están en `[x]`; `decisions.md` cabe en una página con 6 puntos en 🔴; 15 requirements;
  procedencia completa.
- Validación de la ventana contra el contrato y el backend (leído, solo lectura,
  `own-accounts.service.ts` y `.schema.ts`): `normalizeOwnText` es idéntica a la del
  backend; mínimo de 3 caracteres medido igual; nombre y banco en blanco, tipo vacío y
  cierre anterior a la apertura se bloquean como los rechaza el backend. Los duplicados no
  son un rechazo del backend (los guarda una vez) y la ventana no los bloquea, como debe.
- Cuerpos: `POST` con `name`, `bank`, `type` y solo lo rellenado; `PATCH` solo con lo que
  difiere (`null` al vaciar número o fecha, `texts` entera si cambia cualquiera, nada si no
  cambia nada); `PUT` con la lista entera sin campos en blanco. Comprobado en los tests
  unitarios y en el navegador con el cuerpo exacto.
- 400 y 404: la ventana queda abierta con lo escrito y una frase propia, nunca el
  `message` del backend; con 400 no se vuelve a pedir la tabla.
- Menú: `My accounts` en el puesto 4, justo debajo de `Transfers` (3), 9 entradas;
  `e2e/transfer-pairs-review.spec.ts` y los checks de la F35 en verde.
- Con los datos reales, solo `GET` (servidor de desarrollo arrancado en el puerto 5199 y
  parado al acabar; cualquier método que no fuera `GET` hacia `/api` se cortaba, y no hubo
  ninguno): la pantalla pinta 12 filas y coinciden con `GET /api/own-accounts` en orden,
  nombre, banco, número, tipo, fechas, textos y `No texts`; las 2 formas del nombre
  coinciden con `GET /api/own-accounts/holder-names`; la ventana de cambiar la primera fila
  se abrió con sus datos y se cerró con `Cancel` sin mandar nada. Sin errores de consola.
- Contraste medido en el navegador (tema oscuro, el único de la app): el más bajo de lo
  nuevo es la frase bajo un campo vacío (`Write something here.`), 5.76:1; el resto, entre
  6.13:1 y 16.45:1. El rojo de la frase de error de la ventana es el par
  `--negative on --surface-card`, que ya mide `theme-dark.spec.ts`.
- `docs/guia-de-uso.md`: las 92 líneas `--` del humano, idénticas y en el mismo orden que
  en `HEAD`; los 11 bloques «Mis notas de esta prueba» intactos, y uno nuevo y vacío en la
  §7b; las únicas líneas quitadas son las 3 del párrafo del menú (sin notas); la §7b queda
  entre el `---` del final de la §7 y la `## 8.`, no encima de ningún `-- ok`.
- Datos de prueba: comparados los números de cuenta, nombres, textos y formas del nombre
  reales con todos los archivos nuevos o cambiados: ninguno aparece, salvo un texto real
  que es el nombre de un banco (permitido por `tasks.md`). Ninguna prueba habla con
  `localhost:3000`: las unitarias simulan `fetch` o el cliente HTTP, y la de navegador
  corta todo `/api` no previsto.
- Arquitectura, convenciones, documentos que la feature vuelve falsos (`git grep` de
  «ocho/eight», del orden del menú y de `own-accounts`), vocabulario, CHECKPOINTS C1–C7.
