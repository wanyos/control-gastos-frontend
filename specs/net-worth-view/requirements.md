# Requirements — Feature 9: net-worth-view (Vista de Patrimonio)

> Derivado del bloque `intent` de la feature 9 en `feature_list.json` (fuente de
> verdad) y de su `acceptance`, en EARS estricto según `docs/specs.md`.
> Datos: `../gastos-backend/docs/api-contract.md` → `### GET /api/net-worth`
> (solo lectura). Reutiliza lo que ya existe: tipos y `getNetWorth()` de
> `src/features/net-worth/` (feature 7), shell y rutas (feature 8), `AppError` /
> `toAppError` de `src/shared/errors.ts`.
>
> Las decisiones de producto se cerraron en la puerta del 2026-09-12 (ver
> `decisions.md`); los valores concretos que aquí se citan son ya los aprobados.

## Cobertura del intent

| Punto de `como_se_que_esta_bien` | Requirements |
|---|---|
| «Abro /net-worth… veo el total que devuelve la API y debajo una frase interpretada» | R1, R4, R5 (+ R2, R3 para carga y error) |
| «Reparto por naturaleza con barras horizontales, y los grupos suman exactamente el total» | R7, R8, R9 |
| «Veo el 'dinero parado' señalado dentro de ese reparto» | R10 |
| «Veo el reparto por banco» | R11 |
| «Una ficha por cada banco y producto con valuedAt y 'desde cuándo hay dato'» | R12 (**solo `valuedAt`**: «desde cuándo hay dato» no lo sirve el contrato; fuera por decisión del 2026-09-12) |
| «Los productos con value: null aparecen como hueco, nunca como cero, y no suman» | R13 (+ R8) |
| «Los investments.issues se muestran como avisos legibles» | R14 |
| «Textos en inglés y cifras con el formato fijado en el spec» | R6, R15 |
| «La vista se ve coherente con los tokens del design system» | Restricción C4 (revisión, no test unitario) |
| `acceptance`: errores desde el store (`ApiError`/`toAppError`) | R3 |
| `que_no_quiero`: sin bloques C/D, sin recalcular el total, sin deps de gráficos, e2e sin cambios | R4, C1, C2, C3 |

---

## Carga y estados

## R1
CUANDO el router monta la vista de `/net-worth`, el sistema DEBE pedir el
patrimonio una sola vez a través de la acción `load()` del store
`useNetWorthStore`, que llama a `getNetWorth()` de
`src/features/net-worth/service.ts`.

> Verificación: `src/features/net-worth/__tests__/NetWorthView.spec.ts` — con
> `fetch` mockeado, al montar la vista se hace exactamente 1 petición a
> `/api/net-worth`; y `store.spec.ts` — `load()` guarda el `NetWorth` devuelto.

## R2
MIENTRAS la petición del patrimonio está en curso, el sistema DEBE mostrar un
estado de carga (`data-test="net-worth-loading"`) y NO los bloques A, B ni E.

> Verificación: `NetWorthView.spec.ts` — con `fetch` pendiente, existe el
> indicador y no existen `net-worth-block-a|b|e`.

## R3
SI `getNetWorth()` rechaza (fallo HTTP, de red o `ValidationError`) ENTONCES el
sistema DEBE guardar en el store `error` el resultado de `toAppError(<rechazo>)`
y la vista DEBE mostrar un aviso de error (`data-test="net-worth-error"`) cuyo
texto se construye a partir de ese `AppError` (título fijo en inglés + su
`message`), nunca a partir de un string suelto.

> Verificación: `store.spec.ts` — rechazo con `ApiError` 500 → `store.error` es
> esa instancia (`instanceof AppError`, `code === 'API_HTTP'`); rechazo con un
> valor no-Error → `code === 'UNKNOWN'`. `NetWorthView.spec.ts` — el aviso
> contiene el `message` del error y no se pintan los bloques.

## Bloque A — la cifra

## R4
CUANDO el patrimonio se ha cargado, el bloque A DEBE mostrar el campo `total`
de la respuesta formateado (R6), sin recalcularlo a partir de cuentas ni
productos.

> Verificación: `NetWorthView.spec.ts` — fixture **inconsistente a propósito**
> (`total: "999.99"` con partes que suman otra cifra): el bloque A muestra
> `999,99 €`. Además grep del reviewer: la vista no suma para el bloque A.

## R5
CUANDO el patrimonio se ha cargado, el bloque A DEBE mostrar debajo del total
la frase interpretada con la plantilla aprobada (design.md §6; sin
histórico: solo total y reparto, nunca si creció), con los casos de borde de
`design.md` §Frase del bloque A.

> Verificación: `sentence.spec.ts` (función pura) — texto exacto para el caso
> normal, para 1 banco (singular), sin cuentas `checking` y con total ≤ 0.
> `NetWorthView.spec.ts` — la frase aparece en `net-worth-block-a`.

## R6
El sistema DEBE formatear toda cifra de la vista —importes y porcentajes— en
formato es-ES con separador de miles **también en números de 4 cifras**
(importes `1.234,56 €`, EUR, dos decimales; porcentajes `38,3 %`, un decimal),
calculada desde el string decimal o desde céntimos enteros, sin pérdida de
céntimos, y pintada con `font-mono tabular-nums`.

> Verificación: `src/shared/__tests__/money.spec.ts` — `formatMoney("1234.56")`
> → `1.234,56 €` (regresión de la trampa CLDR: sin `useGrouping: 'always'` sale
> `1234,56 €`); `"-5.00"` → `-5,00 €`; `"0.00"` → `0,00 €`;
> `"90071992547409.93"` → `90.071.992.547.409,93 €` (más allá de la precisión de
> `number`); `formatPercent(383)` → `38,3 %`. **El espacio antes de `€` y de `%`
> es U+00A0 (no separable)**: los textos esperados se escriben con `\u00a0`.
> `NetWorthView.spec.ts` — todo nodo `data-test="money"` lleva las clases
> `font-mono` y `tabular-nums` (comparadas con nombres compuestos en tiempo de
> ejecución, ver design.md §8).

## Bloque B — de qué está hecho

## R7
CUANDO el patrimonio se ha cargado, el bloque B DEBE mostrar el reparto por
naturaleza con la partición fijada en `design.md` §4 (aprobada): una fila por grupo no
vacío, con su nombre en inglés, su importe (suma exacta en céntimos de sus
miembros) y una barra horizontal cuyo ancho es su proporción sobre el `total`.

> Verificación: `breakdown.spec.ts` — `groupByNature(fixture)` devuelve los
> grupos esperados con sus importes y miembros; cuentas `savings` y productos
> `savings_account` caen donde fija la partición. `NetWorthView.spec.ts` — una
> `data-test="nature-row"` por grupo, con el `style.width` esperado.

## R8
El sistema DEBE asignar cada cuenta y cada producto con `value` no nulo a
exactamente un grupo de naturaleza y a exactamente un grupo de banco, de modo
que, con una respuesta coherente con el contrato, la suma exacta de los grupos
de cada reparto sea igual a `total`.

> Verificación: `breakdown.spec.ts` — con una fixture coherente que incluye los
> cinco `type` de producto, cuentas `checking` y `savings`, un saldo negativo y
> un `value: null`: `Σ grupos (céntimos) === toCents(total)` para ambos repartos,
> y cada `id` aparece en un solo grupo.

## R9
SI la suma exacta de los grupos de un reparto no coincide con el `total` de la
respuesta ENTONCES el sistema DEBE mostrar en el bloque B un aviso de descuadre
(`data-test="breakdown-mismatch"`) con las dos cifras, sin corregir ninguna.

> Verificación: `NetWorthView.spec.ts` — fixture inconsistente de R4 → existe el
> aviso con `999,99 €` y la suma de grupos; fixture coherente → no existe.

## R10
CUANDO el patrimonio se ha cargado, el bloque B DEBE señalar como «dinero
parado» (badge `Idle money`, `data-test="idle-money"`) el grupo de las cuentas
`checking`.

> Verificación: `NetWorthView.spec.ts` — el badge está dentro de la fila de
> ese grupo y en ninguna otra; sin cuentas `checking` no aparece.

## R11
CUANDO el patrimonio se ha cargado, el bloque B DEBE mostrar el reparto por
banco: una fila por banco con su nombre legible, su importe (cuentas + productos
con `value` no nulo de ese banco) y una barra horizontal proporcional al
`total`, ordenadas de mayor a menor importe.

> Verificación: `breakdown.spec.ts` — `groupByBank(fixture)` con los cinco slugs
> reales (`bankinter`, `n26`, `openbank`, `myinvestor`, `trade-republic`) →
> nombres `Bankinter`, `N26`, `Openbank`, `MyInvestor`, `Trade Republic`, orden
> por importe; un slug desconocido se muestra tal cual.

## Bloque E — detalle

## R12
CUANDO el patrimonio se ha cargado, el bloque E DEBE mostrar una ficha por banco
y, dentro, una fila por cada cuenta y cada producto de ese banco con su nombre,
su tipo en inglés, su importe (o el hueco de R13) y la fecha de su dato en
formato en-GB (`29 Aug 2026`):
`valuedAt` en fondos/ETF/carteras/cuentas remuneradas, `maturityDate` en
depósitos y `asOf` en cuentas.

> Verificación: `NetWorthView.spec.ts` — nº de `data-test="bank-card"` = nº de
> bancos; nº de `data-test="holding-row"` = cuentas + productos; la fila del
> fondo muestra `Valued 29 Aug 2026` y la del depósito `Matured 15 Aug 2026`
> (textos esperados construidos con `formatDate`, no escritos a mano: ICU da
> `Sept` en septiembre y puede cambiar entre versiones).

## R13
SI un producto llega con `value: null` ENTONCES el sistema DEBE mostrar en su
fila un hueco visual (`data-test="value-gap"`, texto `No valuation`) en lugar de
un importe, y NO DEBE contarlo en ningún grupo, barra ni porcentaje.

> Verificación: `NetWorthView.spec.ts` — la fila del ETF sin valoración contiene
> el hueco y no contiene `0,00 €`; `breakdown.spec.ts` — el producto no está en
> ningún grupo y los importes no cambian al quitarlo de la fixture.

## R14
CUANDO la respuesta trae `investments.issues` no vacío, el sistema DEBE mostrar
un aviso por cada entrada (`data-test="data-warning"`) con el texto en inglés que
corresponde a su `reason` según `design.md` §Textos de los avisos, incluyendo el
`name` y, si no es `null`, el `valuedAt` formateado.

> Verificación: `issues.spec.ts` (función pura) — texto exacto para
> `no_valuation`, `stale_valuation` y `matured_not_closed`.
> `NetWorthView.spec.ts` — 3 avisos con la fixture de 3 issues; 0 con lista
> vacía (y el panel no se pinta).

## R15
El sistema DEBE mostrar en inglés todo texto propio de la vista (títulos,
etiquetas de grupo, tipos, frase, avisos, estados de carga y error). Los datos
que escribe el humano (`name` de producto, `alias` de cuenta) se muestran tal
como llegan y no se traducen.

> Verificación: `NetWorthView.spec.ts` — con una fixture de nombres neutros
> (`Global Fund`, `Main account`…), el `text()` de la vista cargada no contiene
> ninguna de: `Patrimonio`, `Cuenta`, `Saldo`, `Depósito`, `Fondo`, `Aviso`,
> `Vencido`; y contiene los títulos en inglés de los tres bloques.

---

## Restricciones de cierre (no son EARS: se verifican con comandos)

- **C1 — Sin bloques C y D.** La vista contiene solo `net-worth-block-a`, `-b` y
  `-e`; no hay cascada ni evolución. Verificación: aserción en
  `NetWorthView.spec.ts` sobre los `data-test` de bloque, y revisión.
- **C2 — Sin dependencias nuevas** (ni de gráficos ni de decimales): `git diff
  package.json` no añade entradas a `dependencies` ni `devDependencies`.
- **C3 — e2e de humo.** `e2e/app-boot.spec.ts` sigue pasando en `./init.sh`. Si
  la vista, al llamar a la API sin backend, lo pone en rojo, se aplica lo que
  se aprobó: el smoke responde `/api/net-worth` con una fixture (design.md §9).
- **C4 — Tokens.** Solo alias semánticos (`bg-surface-card`, `text-ink-muted`,
  `bg-chart-N`…), ningún hex ni paleta de serie de Tailwind; sin editar
  `src/assets/styles/`. Verificación: grep del reviewer + `styles.spec.ts`.
- **C5 — Comprobación real.** Con el backend en `:3000` y `pnpm dev`, la cifra del
  bloque A coincide con el `total` de `curl http://localhost:3000/api/net-worth`
  (la ejecuta implementer o leader y la anota en el informe).
- **C6 — Puerta.** `pnpm type-check`, `pnpm lint`, `pnpm test:unit` y `./init.sh`
  en verde.

---

## Procedencia

- **R1 — (humano).** «Cuando abro /net-worth con el backend arrancado, veo el
  total». Que pase por un store sale de `docs/architecture.md` (vista → store →
  service) y del acceptance («errores del store»).
- **R2 — (añadido).** El humano no dijo qué se ve mientras carga. Propongo un
  estado de carga mínimo en vez de bloques vacíos o a cero (un cero mientras
  carga contradiría «nunca como cero»).
- **R3 — (humano).** Acceptance: «los errores se muestran a partir del error del
  store (ApiError / toAppError), nunca como strings sueltos». El texto del título
  es (delegado): `Couldn't load your net worth`. Sin botón de reintentar
  (recargar la página basta; descartado por alcance).
- **R4 — (humano).** «Veo el total de patrimonio que devuelve la API» +
  que_no_quiero «No recalcular el total».
- **R5 — (delegado).** delego_en_agente: «Qué frase poner en el bloque A sin
  histórico». Plantilla aprobada por el humano el 2026-09-12.
- **R6 — (delegado → humano).** delego_en_agente: «Cómo manejar los importes… sin
  perder céntimos». Formato **es-ES** elegido por el humano el 2026-09-12 (la
  propuesta era en-US); agrupación de 4 cifras obligatoria por la trampa CLDR.
  Porcentajes en es-ES por coherencia (leader). `font-mono tabular-nums` sale del
  acceptance y de `docs/conventions.md`.
- **R7 — (humano)** en la forma («reparto por naturaleza con barras
  horizontales») y **(delegado)** en la partición concreta: el acceptance
  la manda a decisions.md. Aprobada el 2026-09-12 (4 grupos).
- **R8 — (humano).** «Los grupos suman exactamente el total… no hay dinero que se
  quede fuera de ningún grupo». Extendido al reparto por banco (añadido menor:
  mismo invariante, misma función).
- **R9 — (añadido).** El humano no dijo qué pasa si la suma no cuadra. Con el
  contrato no debería ocurrir, pero **el propio ejemplo del contrato no cuadra**
  (12810.75 + 10000.00 + 5208.40 = 28019.15 ≠ `investments.total` 18208.90).
  Aplicando «honestidad del dato», se avisa sin corregir (técnica, en la hoja).
- **R10 — (humano)** «dinero parado señalado» + **(delegado)** qué cuenta como
  tal: cuentas `checking`, aprobado el 2026-09-12.
- **R11 — (humano).** «Veo el reparto por banco (Bankinter, N26, Openbank,
  MyInvestor, Trade Republic)». El mapa slug → nombre y el orden por importe son
  (añadido, técnico).
- **R12 — (humano)** «una ficha por cada banco y producto con valuedAt».
  **Desviación:** «desde cuándo hay dato» NO está en `GET /api/net-worth`; queda
  fuera por decisión del humano (2026-09-12), pendiente de backend.
  Formato de fecha en-GB decidido por el leader. Fecha de cuentas = `asOf` y de depósitos =
  `maturityDate` son (añadido): son lo único que el contrato da.
- **R13 — (humano).** «value: null… hueco, nunca cero, y no suman». Texto
  `No valuation` (delegado).
- **R14 — (humano).** «investments.issues como avisos legibles». Textos exactos
  (delegado). Depósito vencido integrado en su ficha y en la lista de avisos
  (delegado: «aparte o integrados», ver design.md).
- **R15 — (humano).** «Los textos están en inglés».
- **C1–C6 — (humano).** que_no_quiero y acceptance (bloques C/D, dependencias,
  e2e, tokens, curl, puerta).
