# deposit-earnings — implementación

## Lote A — implementación

Implementer del Lote A, 2026-11-02. Nada escrito en la base de datos ni en carpetas de datos
del humano. Ningún dato real en fixtures ni en tests: nombres como los del ejemplo del
contrato (`Deposito 1m`…, `myinvestor`) y cifras inventadas.

### Archivos modificados / creados

Todos dentro de la cabecera `Archivos:` del Lote A.

Nuevos:
- `src/features/net-worth/deposits.ts` — funciones puras: `isDoubtful`, `statusBadge`,
  `maturityLabel`, `depositFacts`, `earnedCell`, `extraLine`, `movementsLink`, y
  `moneyOrDash` / `dateOrDash` (un `null` sale como `—`).
- `src/features/net-worth/components/DepositEarnings.vue` — la tarjeta `Deposits` (solo props).
- `src/features/net-worth/components/DepositRow.vue` — una fila.
- `src/features/net-worth/__tests__/deposits.spec.ts`
- `src/features/net-worth/__tests__/DepositEarnings.spec.ts`

Modificados:
- `src/features/net-worth/types.ts` — `DepositStatus`, `DepositMaturity`, `DepositEarning`,
  `DepositEarnings` (design §2).
- `src/features/net-worth/service.ts` — `DEPOSITS_PATH`, `parseDepositEarnings`,
  `getDepositEarnings`, con su propio `createValidators('GET /api/investments/deposits')`.
- `src/features/net-worth/store.ts` — `deposits`, `depositsLoading`, `depositsError`; `load()`
  lanza las dos peticiones con `Promise.all` de dos funciones internas que no relanzan.
- `src/features/net-worth/views/NetWorthView.vue` — `<DepositEarnings>` justo después de la
  sección `net-worth-block-e`, dentro del `v-else-if="netWorth"`.
- `src/features/net-worth/__tests__/fixtures.ts` — `depositEarnings()` (7 depósitos: los seis
  `status`, dos `matured`; `total` 25.65 = 7.25 + 18.40) y `emptyDepositEarnings()`.
- `src/features/net-worth/__tests__/service.spec.ts`, `store.spec.ts`, `NetWorthView.spec.ts`
- `src/features/import/__tests__/store.spec.ts` — test de R14 y la constante `GET_DEPOSITS`.
- `specs/38-deposit-earnings/tasks.md` — T1–T8 marcadas `[x]`.
- `progress/current.md` — plan del lote.

`src/shared/components/__tests__/AppShell.spec.ts` **no se ha tocado**: su imitación de
`fetch` deja pendiente cualquier ruta que no sea la de dudosos, así que la ruta nueva no la
rompe (comprobado: `pnpm exec vitest run src/features/import/__tests__/store.spec.ts
src/shared/components/__tests__/AppShell.spec.ts` → `Test Files 2 passed (2)`,
`Tests 51 passed (51)`).

### Decisiones tomadas

- **Comprobaciones de coherencia en el service (design §3):** `matured` exige `earned` decimal
  y `maturity`; cualquier otro estado exige `earned: null`; `below_principal` exige `maturity`
  y los otros cuatro `maturity: null`; `total` en céntimos tiene que ser la suma de los `earned`
  (que solo pueden venir en `matured`). Un `earned` o `maturity` ausente (no `null`) también se
  rechaza. Mensajes con el mismo formato que el resto (`GET /api/investments/deposits:
  <campo> is not <lo esperado>`).
- **Una función más que las sugeridas en design §4:** `depositFacts(deposit)` devuelve las
  cuatro líneas de datos de la fila (`Put in` · `Opened` · fecha con verbo · `Expected`), para
  probar el `—` sin montar. El banco va aparte con `bankLabel` de `@/shared/banks` (se importa,
  no se cambia).
- **Colores:** cancelado → nombre, datos, línea extra y columna de lo ganado en `text-ink-muted`;
  datos de las demás filas en `text-ink-body`; lo ganado de un vencido en `text-positive` con
  `font-mono tabular-nums`; dudosos en `text-warning`. Etiquetas con `BaseBadge` (`info`,
  `positive`, `neutral`, `warning`). Todos esos pares ya tienen su línea `contrast:` en
  `theme-dark.css`; no se añade ningún color ni icono.
- **Enlace:** `RouterLink` sin clases de color (lo pinta `base.css` con `--ink-link`, par ya
  medido sobre `--surface-card`).
- **`NetWorthView.spec.ts` monta ahora con un router en memoria** (las filas con enlace usan
  `RouterLink`) y su imitación de `fetch` contesta por ruta: `/api/net-worth`, y
  `/api/investments/deposits` con `emptyDepositEarnings()` por defecto; cualquier otra ruta se
  rechaza. Lo que comprobaba cada test antiguo no cambia; el de R1 de la F9 pasa a comprobar
  que `/api/net-worth` sale exactamente una vez y que no hay ninguna otra petición salvo la de
  depósitos.
- **Test de R14 con la imitación de `fetch` de `import/__tests__/fixtures.ts`** (fuera de mi
  lote, no se toca): esa imitación contesta a cualquier ruta desconocida con la respuesta de
  `netWorth`, así que la petición de depósitos recibe el cuerpo del patrimonio y la tarjeta la
  rechaza. El test solo cuenta que se vuelva a pedir (1 antes de importar, 2 después), que es
  lo que pide R14. Lo dice un comentario en el test.

### Trazabilidad

- R1 → `asks the deposits path with no method, body or query` (service),
  `load() asks the net worth and the deposits at the same time` (store),
  `asks the deposits once on mount, only with GET` (vista)
- R2 → `paints the Deposits part below Details`
- R3 → `paints one row per deposit of every status in the order the backend sends`,
  `maps every deposit field of the contract example`
- R4 → `shows an active deposit with its expected gain, its maturity date and not earned yet`,
  `writes the maturity date with the verb of its status`,
  `paints a missing field as a dash, never as zero`, `maps every deposit field of the contract example`
- R5 → `shows what a matured deposit earned, in green`, `names the status of each deposit`
- R6 → `shows the total exactly as the backend sent it`,
  `rejects a response whose total is not the sum of the matured deposits`
- R7 → `shows an active deposit with its expected gain, its maturity date and not earned yet`,
  `names the status of each deposit`
- R8 → `shows a cancelled deposit in grey, with its cancel date and not in the total`,
  `names the status of each deposit`
- R9 → `shows each doubtful deposit in amber with its reason and not in the total`,
  `writes the reason of each doubtful deposit`
- R10 → `says there are no deposits instead of an empty part`
- R11 → `keeps every net worth figure as the backend sends it when deposits earned something`
- R12 → `rejects an unknown deposit status`, `rejects earned on a deposit that is not matured`,
  `a failed deposits request leaves the net worth loaded`,
  `says the deposits could not be loaded with the error message`,
  `keeps the rest of the screen when the deposits request fails`
- R13 → `offers See in Movements on a deposit with its maturity movement`,
  `links to the month of the maturity only when there is one`
- R14 → `asks the deposits again after an import when the net worth was loaded`
- R15 → `says it is loading the deposits`

Tests extra (no los pedía `tasks.md`): `keeps the gaps of a deposit as null and the candidates of
an ambiguous one`, `accepts no deposits at all, with the total at "0.00"`, `rejects a matured
deposit without its earned figure or its maturity`, `rejects a maturity on a status that does
not carry one`, `lets the ApiError of a failed deposits request through untouched`, `a failed net
worth request leaves the deposits loaded`, `shows a deposits answer that breaks the contract as
the error of the part only`.

### Documentos actualizados

Ninguno: los documentos que esta feature cambia son del Lote B (`docs/guia-de-uso.md`,
`docs/architecture.md`) o del leader (`docs/roadmap.md`).

Búsqueda lanzada:

```
git grep -n -e "investments/deposits" -e "ganó cada" -e "una sola petición" -e "GET /api/net-worth" -- . ':!progress' ':!specs' ':!src/features/net-worth/__tests__'
```

Líneas que el Lote A vuelve falsas, **fuera de los archivos de mi lote** (no corregidas):

1. `docs/guia-de-uso.md:176` — «**No enseña lo que ganó cada depósito.** Es lo siguiente que
   está previsto.» → Lote B, T10 (lo nombra design §9).
2. `docs/guia-de-uso.md:1839-1840` — «**Lo que ganó cada depósito**, en `Net Worth`. Es lo
   siguiente previsto. El backend ya lo sirve; el frontend no lo usa.» → mismo archivo del
   Lote B, pero **design §9 no lo nombra**: solo cita la línea 176.
3. `docs/stack.md:503-507` — «Desde la feature #9 la home (`/net-worth`) pide
   `GET /api/net-worth` al montar … el smoke intercepta `**/api/net-worth`». Ahora la home pide
   también `GET /api/investments/deposits`, y el smoke tendrá que responderla (Lote B, T9).
   **`docs/stack.md` no está en ninguno de los dos lotes.**
4. `docs/roadmap.md:74` — «`GET /api/investments/deposits` … está servido y **sin usar**». Lo
   corrige el leader al cerrar (design §9, `tasks.md`).

### Prueba real

No se ha podido hacer. El backend no está levantado: `curl -s -m 5 -o /dev/null -w
"%{http_code}" http://localhost:3000/api/investments/deposits` → `000`, curl exit 7 (conexión
rechazada); lo mismo para `http://127.0.0.1:3000/api/net-worth`. El proxy de Vite apunta a
`http://localhost:3000` (`vite.config.ts:20`). No lo he arrancado: es el otro proyecto.

Para hacerla: con el backend en marcha, `curl -s http://localhost:3000/api/investments/deposits`
y pasar la respuesta por `parseDepositEarnings` (o abrir `Net Worth` con `pnpm dev`), y apuntar
cuántos depósitos hay de cada `status`, si el `total` cuadra y si la tarjeta sale sin error.
Es lo mismo que pide la hoja en «📌 Consecuencias que te tocan a ti».

### Último ./init.sh

`./init.sh` → **exit 1**. Pasos 3, 4, 5 y 6 en verde; `pnpm type-check` del paso 6b en verde;
**rojo el e2e de chromium (paso 6b): 10 failed, 73 passed.**

```
── 6. Ejecutando tests ─────────────────────────────────
 Test Files  128 passed (128)
      Tests  2113 passed (2113)
[OK]    Todos los tests pasan
── 6b. Pasos propios del proyecto (init.local.sh) ──────
[OK]    OK: pnpm type-check (vue-tsc --build, incluye los .vue)
[FAIL]  E2E smoke rojo (chromium):
  10 failed
    [chromium] › e2e\app-boot.spec.ts:40:1 › app boots: shell mounts with the design system applied and no console errors
    [chromium] › e2e\expenses-by-category.spec.ts:299:1 › reaches Expenses by category from the menu, sees the month and opens a category
    [chromium] › e2e\expenses-by-category.spec.ts:360:1 › switches to a year and sees the monthly average of each category
    [chromium] › e2e\expenses-by-category.spec.ts:403:1 › the old Monthly cost address opens the net worth
    [chromium] › e2e\import-dialog.spec.ts:158:1 › imports with one POST without body or Content-Type and shows a partial result
    [chromium] › e2e\import-dialog.spec.ts:181:1 › warns that some files may be in when the import gets a Drive 503
    [chromium] › e2e\import-dialog.spec.ts:277:1 › keeps the title and Close in view with a large report fully unfolded
    [chromium] › e2e\overview.spec.ts:230:1 › reads a month at a glance, moves between months and matches the statement
    [chromium] › e2e\statement.spec.ts:218:1 › opens on the current month with its figures, its note and its days
    [chromium] › e2e\transfer-pairs-review.spec.ts:320:1 › reaches the screen from the sidebar and sees every pair, only the fine labelled
  73 passed (30.7s)
── 7. Resumen ──────────────────────────────────────────
[FAIL]  Entorno NO está listo. Resuelve los errores antes de avanzar.
```

Es lo que anuncia `tasks.md` para el Lote B (T9): en 8 de los 10 fallos la salida nombra la
petición `GET /api/investments/deposits` (abortada por la ruta de cada spec que corta las
`/api` no previstas, o como error de consola). En los otros 2 (`app-boot.spec.ts:40` y
`statement.spec.ts:218`) la salida solo dice `"Failed to load resource: net::ERR_FAILED"` sin
la URL: **no he comprobado** que sea la misma petición; se comprueba en el Lote B al responder
la ruta y relanzar. Los 6 specs que fallan están en la cabecera `Archivos:` del Lote B. No he
tocado `e2e/`.

Por separado (T8):

```
pnpm type-check          → $ vue-tsc --build                 EXIT 0
pnpm lint:oxlint:check   → $ oxlint .                        EXIT 0
pnpm format:check        → All matched files use Prettier code style!   EXIT 0
pnpm test:unit           → Tests 2113 passed (2113)          EXIT 0
pnpm exec vitest run src/assets/__tests__/theme-dark.spec.ts → Tests 202 passed (202)
```

### Último ./init.sh --checks

`./init.sh --checks 38` → **exit 1, 12 de 13 en verde.**

```
[OK]   x9  (los nueve primeros: DepositEarnings.spec, service.spec y NetWorthView.spec por nombre)
[FAIL] [10] pnpm type-check && pnpm lint:oxlint:check && pnpm format:check && pnpm test:unit && pnpm build-only && ./init.sh
       exit 1 — Entorno NO está listo.
[OK]   x3  (keeps the rest of the screen…, offers See in Movements…, asks the deposits again after an import…)
[FAIL] Checks: 12 de 13 en verde. La feature no se puede cerrar.
```

El check 10 cae solo por el `./init.sh` del final (el e2e de arriba); dentro de su log
(`/tmp/harness_check_10.log`) `pnpm build-only` terminó con `✓ built in 743ms`. Se pondrá en
verde cuando el Lote B responda la ruta nueva en los e2e.

### Sugerencias fuera de scope (NO aplicadas)

- `docs/stack.md:503-507` necesita una frase sobre la segunda petición de la home y la ruta que
  responde el smoke; no está en ningún lote. Lo puede añadir el Lote B si el leader amplía su
  cabecera, o el leader por la vía de cambios en `docs/`.
- `src/features/import/__tests__/fixtures.ts` (`mockApi`) contesta a cualquier ruta desconocida
  con la respuesta de `netWorth`; si se le añadiera una respuesta propia para
  `/api/investments/deposits`, el test de R14 podría comprobar además que la tarjeta queda
  cargada tras importar. Archivo fuera de este lote.

## Lote B — implementación

Implementer del Lote B, 2026-11-02. Nada escrito en la base de datos ni en carpetas de datos
del humano. Ningún dato real: la respuesta de depósitos de los e2e es la de design §8 (lista
vacía, `total` `"0.00"`).

**Ampliación del lote:** el leader añadió `docs/stack.md` a la cabecera `Archivos:` del Lote B
(lo señalaba el informe del Lote A, punto 3 de «Documentos actualizados»). Es el único archivo
tocado fuera de la cabecera de `tasks.md`.

### Archivos modificados

- `e2e/app-boot.spec.ts`, `e2e/import-dialog.spec.ts`, `e2e/overview.spec.ts`,
  `e2e/statement-exclude-from-totals.spec.ts`, `e2e/statement-fix-category.spec.ts`,
  `e2e/statement-noise-toggle.spec.ts`, `e2e/statement.spec.ts`,
  `e2e/transfer-pairs-review.spec.ts` — justo después de su ruta `**/api/net-worth`, una ruta
  `**/api/investments/deposits` que responde `{ asOf: '2026-06-15', deposits: [], total: '0.00' }`.
- `e2e/expenses-by-category.spec.ts` — lo mismo, pero como su ruta de `net-worth` solo contesta
  a `GET` y pasa el resto a `stop`, la de depósitos hace igual.
- `docs/guia-de-uso.md` — sección `Net Worth`: pasos 8 a 11 nuevos (la tarjeta `Deposits`, lo que
  enseña cada estado, el total que no se suma al patrimonio, el enlace `See in Movements`, la
  tarjeta vacía, el error solo en la tarjeta y la recarga tras importar). En «Lo que no hace o
  hace a medias», fuera la línea «No enseña lo que ganó cada depósito…» y dentro dos: que desde
  la tarjeta no se corrige un dudoso, y la incoherencia heredada con los intereses de `Overview`
  (copiada de la hoja). En «Lo que está pendiente», fuera la entrada «Lo que ganó cada depósito».
- `docs/architecture.md` — párrafo nuevo tras «Dependencias entre features y con `shared/`»: la
  segunda petición del store de `net-worth`, sus estados propios, solo lectura, el total que no
  entra en ninguna cifra y la recarga tras importar.
- `docs/stack.md` — párrafo nuevo tras el de la feature #9: la home pide también
  `GET /api/investments/deposits` y las specs de `e2e/` la responden.
- `specs/38-deposit-earnings/tasks.md` — T9, T10, T11 marcadas `[x]`.
- `progress/current.md` — plan del lote.

### Decisiones tomadas

- En `expenses-by-category.spec.ts` la ruta nueva sigue el patrón de su vecina (`GET` contesta,
  cualquier otro método va a `stop`), para que ese spec siga rechazando escrituras.
- `docs/guia-de-uso.md:1839-1840` (entrada de «Lo que está pendiente») no la nombraba design §9,
  pero estaba en un archivo del lote y ya era falsa: se ha quitado.

### T9 — pruebas de navegador

Antes del cambio, `pnpm test:e2e --project=chromium` → **exit 1**, `10 failed`, `73 passed`
(los mismos 10 que lista el informe del Lote A: app-boot:40, expenses-by-category:299/360/403,
import-dialog:158/181/277, overview:230, statement:218, transfer-pairs-review:320).

Después del cambio, cuatro ejecuciones de `pnpm test:e2e --project=chromium`:

1. **exit 1**, `75 passed`; los fallos que se vieron en la cola de la salida eran de
   `e2e/action-notice-in-view.spec.ts:1316` y `:1374` y `e2e/statement.spec.ts:430` y `:473`
   (los demás no los capturé: solo guardé las últimas líneas). `action-notice-in-view.spec.ts`
   no responde `**/api/net-worth` ni está en la cabecera.
2. **exit 0**, `83 passed (26.3s)`
3. **exit 0**, `83 passed (25.2s)`
4. **exit 0**, `83 passed (28.0s)`

Y dentro de `./init.sh` y del check 10, dos ejecuciones más en verde (`E2E smoke verde
(chromium)`). **No he comprobado la causa** de los fallos de la ejecución 1: no se repitieron
en cinco ejecuciones seguidas sin cambiar nada, y uno de los specs que fallaron no pasa por la
home. Para averiguarlo habría que relanzar en bucle guardando la salida entera hasta que vuelva
a pasar. Lo dejo dicho por si el reviewer lo ve.

### Documentos actualizados

```
git grep -n -i -e "investments/deposits" -e "ganó cada" -e "lo que ganó" -e "una sola petición" -e "GET /api/net-worth" -e "no enseña lo que" -- . ':!progress' ':!specs' ':!src' ':!e2e'
```

Líneas que siguen saliendo y siguen siendo verdad, o no son mías:
- `docs/architecture.md:394`, `:548` — otras features (una sola petición de lo suyo). Verdad.
- `docs/stack.md:503` — la de la feature #9; sigue siendo verdad y el párrafo nuevo va detrás.
- `docs/roadmap.md:74-79`, `:357`, `:379` — dicen que `GET /api/investments/deposits` está sin
  usar / pendiente. **Ya son falsas**; las corrige el leader al cerrar (design §9, `tasks.md`).
- `feature_list.json` — textos de las features 7, 9 y 38. Verdad.

Corregidas: `docs/guia-de-uso.md:176` y `:1839-1840`, y `docs/stack.md` (párrafo añadido).

### Prueba real

No se ha podido hacer: el backend sigue sin estar levantado
(`curl -s -m 5 -o /dev/null -w "%{http_code}" http://localhost:3000/api/investments/deposits`
→ `000`, curl exit 7). Igual que en el Lote A: hace falta el backend en marcha y abrir
`Net Worth` con `pnpm dev`.

### Último ./init.sh (T11)

`pnpm build-only` → exit 0:

```
dist/assets/index-C3Tf9KBK.css   34.96 kB │ gzip:   7.89 kB
dist/assets/index-DeSv4kmI.js   382.81 kB │ gzip: 113.81 kB
✓ built in 778ms
```

`./init.sh` → **exit 0**:

```
 Test Files  128 passed (128)
      Tests  2113 passed (2113)
[OK]    Todos los tests pasan
── 6b. Pasos propios del proyecto (init.local.sh) ──────
[OK]    Cabeceras Archivos: de 27 tasks.md: ninguna declara dos rutas que solo se distingan en mayúsculas y minúsculas
[OK]    OK: pnpm type-check (vue-tsc --build, incluye los .vue)
[OK]    E2E smoke verde (chromium)
── 7. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

### Último ./init.sh --checks

`./init.sh --checks 38` → **exit 0**:

```
[OK]        exit 0   (x13; el 10 termina con «[OK] Entorno listo. Puedes empezar a trabajar.»)
[OK]    Checks: 13 de 13 en verde.
```

T1–T11 marcadas `[x]`. La feature queda en `in_progress`: según mi protocolo no la paso a
`done` yo; espera al reviewer.

### Sugerencias fuera de scope (NO aplicadas)

- `docs/roadmap.md:74-79`, `:357`, `:379` son ya falsas (ver arriba); las corrige el leader.
- `../docs/ideas.md` dice en dos sitios que `Net Worth` no enseña lo que ganó cada depósito
  (lo anuncia la hoja como consecuencia para el humano); fuera de este proyecto.

## Corrección tras la revisión — 2026-11-02

Hallazgo 1 de `progress/reviews/deposit-earnings.md`. Decisión del humano (2026-11-02):
las etiquetas `Active` y `Matured` van sin color, como dice la decisión 2 de la hoja; el
único estado con color es `Doubtful` (ámbar); `Cancelled` sigue en gris. El hallazgo 2
(roadmap) lo resolvió el leader; `docs/` no se ha tocado.

### Archivos modificados
- `src/features/net-worth/deposits.ts` — `statusBadge`: `active` y `matured` pasan de tono
  `info` / `positive` a `neutral` (el mismo que ya usaba `cancelled`). Comentario de la
  función con el porqué.
- `src/features/net-worth/__tests__/DepositEarnings.spec.ts` — función de ayuda
  `expectUncoloured` (la etiqueta lleva `text-ink-body` y ninguno de `text-positive`,
  `text-info`, `text-warning`, `text-negative`, `text-brand`). La usan
  `shows what a matured deposit earned, in green` (etiqueta `Matured`) y
  `shows an active deposit with its expected gain, its maturity date and not earned yet`
  (etiqueta `Active`). Los nombres de los tests no cambian, así que los `checks` siguen
  apuntando a ellos.
- `src/features/net-worth/__tests__/deposits.spec.ts` — `names the status of each deposit`
  espera `neutral` para `Active` y `Matured`.
- `specs/38-deposit-earnings/design.md §4` — la tabla dice tono `neutral`, sin color, para
  `Active` y `Matured`, y una frase bajo la tabla: solo `Doubtful` lleva color; lo único
  verde es la cifra ganada de un `matured`.
- `src/features/net-worth/components/DepositRow.vue` — sin cambios: pinta el tono que
  devuelve `statusBadge`, así que no hacía falta tocarlo.

### Comprobación de que los tests nuevos detectan el fallo
Devolví a mano los tonos antiguos (`info` / `positive`) en `deposits.ts` y lancé
`pnpm exec vitest run src/features/net-worth/__tests__/DepositEarnings.spec.ts`:
`Tests  2 failed | 8 passed (10)` — fallan justo `shows what a matured deposit earned, in green`
y `shows an active deposit with …`. Restaurado el archivo: `Tests  10 passed (10)`.
`deposits.spec.ts` + `DepositEarnings.spec.ts` con el cambio: `Tests  15 passed (15)`.

### Documentos
`git grep -n "Matured.*positive\|Active.*info" -- ':!progress' ':!specs'` → sin resultados.
`requirements.md` R5 («la etiqueta `Matured` y su `earned` formateado, en verde, en la
columna de lo ganado») no se ha tocado: no estaba en los archivos asignados; se lee como
que lo verde es la cifra, coherente con la corrección.

### Último ./init.sh --checks 38
Exit 0. Final de la salida:

```
[INFO]  [2] … $ grep -qF "shows what a matured deposit earned, in green" … && pnpm exec vitest run … -t "shows what a matured deposit earned, in green"
[OK]        exit 0
[INFO]  [5] … $ … -t "shows an active deposit with its expected gain, its maturity date and not earned yet"
[OK]        exit 0
[INFO]  [10] … $ pnpm type-check && pnpm lint:oxlint:check && pnpm format:check && pnpm test:unit && pnpm build-only && ./init.sh
[OK]        exit 0
          ── 7. Resumen ──
          [OK]    Entorno listo. Puedes empezar a trabajar.
[INFO]  [11] … [OK] exit 0
[INFO]  [12] … [OK] exit 0
[INFO]  [13] … [OK] exit 0
[OK]    Checks: 13 de 13 en verde.
```

El check 10 incluye `./init.sh` completo (con la suite y el e2e), en verde.

### Sugerencias fuera de scope (NO aplicadas)
- Ninguna.
