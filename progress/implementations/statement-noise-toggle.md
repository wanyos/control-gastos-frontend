# Implementación — Feature 23 `statement-noise-toggle`

> El interruptor del ruido, y una nota que ya no miente.
> Spec: `specs/23-statement-noise-toggle/{decisions,requirements,design,tasks}.md`
> (aprobado por el humano el 2026-09-29, incluida la segunda vuelta de 🔴 2 y 🔴 3).
> Tasks ejecutadas: **T0–T19**. **T20 queda abierta a propósito**: es la comprobación
> de solo lectura con el humano delante, y no es del implementer.

## Qué se ha construido

Un solo interruptor, `Hide what does not count`, entre la barra de filtros y las tres
cifras. Encendido, manda `excluded=none` **y** `transfer=none` en la **misma** petición
del mes, así que la lista deja de enseñar lo que las cifras nunca contaron; a su lado
sale `Hiding N movements` (número, jamás importe). Vive en la URL como `hide=true`,
empieza siempre apagado y `Clear filters` no lo toca. Y la nota permanente bajo las
cifras se ha reescrito entera: texto fijo **sin una sola cifra**, más una frase viva
que solo aparece si `GET /api/transfers/ambiguous` dice que hay grupos dudosos.

**La feature no escribe nada.** No hay `POST`, `PATCH` ni `DELETE` nuevos: el
interruptor solo cambia la pregunta que ya se le hacía a `GET /api/movements`.

## Archivos

### Nuevos

| Archivo | Qué es |
|---|---|
| `src/features/statement/components/NoiseSwitch.vue` | La casilla (sobre `BaseCheckbox`) y la línea `Hiding N movements`. Tonta: no guarda estado, emite `change`. |
| `src/features/statement/__tests__/NoiseSwitch.spec.ts` | 5 tests del componente. |
| `src/shared/__tests__/movements.spec.ts` | 5 tests de los dos parámetros nuevos en la querystring (el resto de `buildMovementsQuery` se sigue cubriendo donde nació, en `review`). |
| `e2e/statement-noise-toggle.spec.ts` | 5 escenarios en Chromium, **de solo lectura**, con red de seguridad que aborta cualquier `/api` no prevista. |

### Modificados

| Archivo | Qué cambia |
|---|---|
| `src/shared/movements.ts` | `MovementScope = 'only' \| 'none'`, campos `transfer?` / `excluded?` en `MovementQuery` y sus dos `add(...)` en `buildMovementsQuery`. **Aditivo**: `features/review` no cambia ni una línea. |
| `src/features/statement/filters.ts` | Tipo `HideNoise`; 4º parámetro `hideNoise` en `monthQuery`; `hiddenCountQuery`; `hide=true` en `toRouteQuery` y `hideNoise` en `fromRouteQuery`; `hiddenCountLine`; `nothingLeftLine`. |
| `src/features/statement/store.ts` | Refs `hideNoise`, `hiddenCount` y `ambiguousGroups`; `show()` toma el interruptor; `loadMore()` y `refreshQuietly()` lo arrastran; `loadHiddenCount()`; `adoptUpdated()` retira la fila escondida; `loadAmbiguous()` («una vez por sesión»). |
| `src/features/statement/service.ts` | `getAmbiguousCount()` sobre `GET /api/transfers/ambiguous`, validado en frontera. |
| `src/features/statement/components/MonthTotals.vue` | `FIGURES_NOTE` nueva (texto fijo sin cifras), `ambiguousNote(n)` y el envoltorio: de aviso ámbar con `TriangleAlert` a nota gris con `Info`. |
| `src/features/statement/components/StatementList.vue` | Tercer vacío `'nothingLeft'` con el botón `Show everything`. |
| `src/features/statement/views/StatementView.vue` | `syncFromRoute` lee `hideNoise`; `onToggleNoise` hace `router.replace`; `NoiseSwitch` entre filtros y cifras; `loadAmbiguous()` en `onMounted`. |
| `docs/architecture.md`, `docs/stack.md` | Mapa de carpetas, la nota de «el interruptor no escribe» y el icono `Info`. |

### Tests de features anteriores que cambian, y por qué

Cuatro cambios, todos obligados por el spec; ninguna intención se ha tocado:

1. `MonthTotals.spec.ts` — el test «says the four things, with July 2026 as the
   example» (F19) **se sustituye** por los de la nota nueva. R14 manda reescribir ese
   texto entero, así que fijar el viejo era imposible.
2. `StatementView.spec.ts` — la aserción `toContain('July 2026')` de la nota pasa a
   fijar el texto nuevo y a exigir que **no haya ni un dígito**; y la lista de rutas
   del test «only ever reads» suma `/api/transfers/ambiguous` (sigue siendo todo `GET`).
3. `filters.spec.ts` (F20) — dos comparaciones exhaustivas de `fromRouteQuery` llevan
   ahora `hideNoise: false`, porque el objeto de retorno tiene un campo más.
4. Los tres e2e del extracto añaden la ruta `**/api/transfers/ambiguous` (sin ella la
   red de seguridad la abortaría y Chromium lo escribiría como error de consola) y su
   aserción sobre la nota apunta al texto nuevo.

## Decisiones tomadas (y las que no se han tomado)

- **La resta, no dos peticiones.** `hidden = total(sin esconder) − total(en pantalla)`,
  con una sola lectura extra de `pageSize=1` (design §4). Comparte el guardián
  `loadRun`, va **después** de la del mes (la lista ya está en pantalla cuando viaja) y
  si falla deja `hiddenCount` en `null` sin tocar `error`.
- **El número se repinta tras una escritura de la F22.** `refreshQuietly()` vuelve a
  pedirlo: si marcas una fila con el interruptor puesto, esa fila desaparece y el
  `Hiding N` sube al momento. Es lo que R7 y R13 piden juntos.
- **`Math.max(..., 0)`** en la resta: un backend que contestara los dos totales de
  forma incoherente no puede pintar «Hiding -3 movements».
- **`Hiding 0 movements` sí se pinta** cuando el interruptor está puesto y no hay nada
  escondido. R7 dice «mostrar el número» y cero es un número; la ausencia se reserva
  para «no lo sé» (apagado o lectura fallida), que es lo que R9 pide.
- **`ambiguousNote` no se exporta** desde `MonthTotals.vue`: `<script setup>` no admite
  `export`. El design lo dibujaba exportado; el texto es idéntico y se fija desde los
  tests del componente renderizado.
- **`getAmbiguousCount` vive en `features/statement/service.ts`**, no en `shared/`: hoy
  lo necesita una sola feature (design §8).
- **Icono `Info`.** T0(b) pedía comprobar si ya se usaba en el proyecto: **no se usaba**.
  Se usa igualmente y se documenta, porque (a) **no es una dependencia nueva**
  —`@lucide/vue` ya está instalado y cada icono se importa por nombre, tree-shakable—,
  (b) ningún icono del conjunto ya importado significa «información», y (c) el que se
  retira, `TriangleAlert`, es justo la alarma que esta feature viene a quitar. Es la
  única desviación literal respecto a la letra de T0.
- **Un e2e propio** (`e2e/statement-noise-toggle.spec.ts`): las tasks no lo piden
  explícitamente, pero las cuatro features anteriores del extracto tienen el suyo y la
  puerta incluye e2e chromium. Es de solo lectura y afirma en cada test que el único
  método de toda la sesión es `GET`.

## El contraste, y el tema oscuro

La nota pasa a `text-ink-muted` sobre `--surface-card` (sin fondo tintado). El par
`contrast: --ink-muted on --surface-card >= 4.5` **ya estaba declarado** en
`src/assets/theme-dark.css` (T0-c), así que `theme-dark.spec.ts` lo mide sin añadir
nada. Ningún color crudo entra en los `.vue` nuevos.

## Trazabilidad `R<n>` → test

| R | Dónde se comprueba |
|---|---|
| **R1** | `shared/__tests__/movements.spec.ts` «carries neither key when the switch is off»; `statement/__tests__/filters.spec.ts` «asks for nothing extra while it is off»; `store.spec.ts` «starts off: no scope travels and no count is asked for»; `StatementView.spec.ts` «is off when the address does not mention it»; `NoiseSwitch.spec.ts` «is a single box with one label, and it starts off»; e2e «turning it on hides the noise…» |
| **R2** | `shared/…/movements.spec.ts` «carries excluded=none AND transfer=none in the SAME request»; `filters.spec.ts` «adds excluded=none AND transfer=none to the filters already there» y «carries the switch to the later pages»; `store.spec.ts` «on, it asks the month with both scopes and then counts, in that order» y «the switch rides along to the next page»; e2e |
| **R3** | `store.spec.ts` «turning it off asks the same month and the same filters with no scope»; `StatementView.spec.ts` «says how many are held back only while it is on…» (el `uncheck`); e2e |
| **R4** | `filters.spec.ts` «writes `hide=true` on, and no key at all off» y «keeps the month and the four filters exactly as they were»; `StatementView.spec.ts` «turning it on writes hide=true and keeps every other key», «keeps the category key as it was», «the switch survives a month change»; `NoiseSwitch.spec.ts` «does not decide anything»; e2e «it lives in the URL…» |
| **R5** | `filters.spec.ts` «reads `hide=%s` as off» (5 valores) y «reads back what it writes»; `StatementView.spec.ts` «comes up on from the address» y «comes up OFF when the address says hide=%s»; e2e |
| **R6** | `store.spec.ts` «the figures are the ones of the answer, untouched»; `StatementView.spec.ts` «the three figures do not move when it is turned on»; e2e (las tres cifras antes y después) |
| **R7** | `filters.spec.ts` «the count query» (2) y «says how many movements are held back»; `store.spec.ts` «on, it asks the month with both scopes and then counts» y «carries the switch with the filters in ONE request»; `NoiseSwitch.spec.ts` «says how many movements are held back»; `StatementView.spec.ts` «says how many are held back only while it is on»; e2e |
| **R8** | `filters.spec.ts` «never says an amount: there is no «how much» in any response»; `NoiseSwitch.spec.ts` «never shows an amount of what is hidden»; `StatementView.spec.ts` (el `not.toContain('€')`); e2e |
| **R9** | `store.spec.ts` «a failed count leaves the month, the figures and the list intact», «a month that failed asks for no count at all», «drops the count of a month nobody is looking at»; `NoiseSwitch.spec.ts` «says nothing at all with no number»; `StatementView.spec.ts` «a failed count changes nothing on the screen» |
| **R10** | `shared/…/movements.spec.ts` «keeps them next to every other filter, not instead of them»; `store.spec.ts` «carries the switch with the filters in ONE request, and neither wins»; `StatementView.spec.ts` «turning it on writes hide=true and keeps every other key» |
| **R11** | `store.spec.ts` «empties the selection and keeps the mode when the switch moves» |
| **R12** | `filters.spec.ts` «names both causes when nothing is left to show»; `StatementView.spec.ts` «nothing left to show names both causes and offers the switch back»; e2e «a search that only matches hidden rows…» |
| **R13** | `store.spec.ts` «marking a row with the switch on takes it off the list, Undo included» (y su contraprueba «with the switch off a marked row stays exactly where it was») |
| **R14** | `MonthTotals.spec.ts` «is the fixed text, word for word», «carries no figure of any kind: not one digit», «no longer says the figures are inflated, nor names a month», «says what the figures are made of…», «cannot be dismissed»; `StatementView.spec.ts` (nota sin dígitos); e2e «the note is permanent…» |
| **R15** | `MonthTotals.spec.ts` «the only live figure» (5 tests: ausente con null, ausente con 0, singular, plural y «is the ONLY digit the note ever shows»); `store.spec.ts` «reads the groups once per session…», «zero groups is a plain answer», «a failure leaves it unknown and paints no error», «an answer that breaks the contract is a failure like any other»; `StatementView.spec.ts` «reads the doubtful groups once per session and puts them in the note» y «with no doubtful group…»; e2e (2 tests) |

| C | Dónde se comprueba |
|---|---|
| **C1** | `store.spec.ts` «never writes anything: every request of the switch is a GET»; `StatementView.spec.ts` «only ever reads: no request of the whole screen uses another method»; los 5 tests del e2e nuevo afirman `['GET']` |
| **C2** | No se ha tocado el backend ni el contrato; `excluded` y `transfer` son los de su feature 49 |
| **C3** | `store.spec.ts` «the figures are the ones of the answer, untouched»; `filters.spec.ts` «never says an amount» |
| **C4** | Las suites de la F19–F22 siguen verdes; los únicos cambios de contenido son los cuatro listados arriba, todos derivados de R14/R15 y del campo nuevo de `fromRouteQuery` |
| **C5** | `filters.spec.ts` «is not a filter of the bar»; `StatementView.spec.ts` «`Clear filters` empties the bar and leaves the switch ON» |
| **C6** | Todo en inglés, tokens semánticos, contraste ya declarado; **cero dependencias nuevas** (`package.json` y `pnpm-lock.yaml` intactos) |
| **C7** | Ver la puerta, abajo |
| **C8** | **T20, pendiente**: es la comprobación de solo lectura con el humano delante |

## La puerta

| Comando | Resultado |
|---|---|
| `pnpm type-check` | ✅ verde |
| `pnpm lint` | ⚠️ **rojo al escribir esta tabla** (`no-underscore-dangle` por un `page_` en el e2e nuevo), lo cazó el reviewer; verde tras renombrarlo a `monthAnswer` en la segunda vuelta, verificado por el leader y por el reviewer |
| `pnpm test:unit` | ✅ **86 ficheros, 1360 tests** (antes: 84 / 1292) |
| `pnpm build` | ✅ 2040 módulos, `index.js` 257,30 kB (81,77 kB gzip), CSS 31,88 kB |
| `pnpm test:e2e --project=chromium` | ✅ **39 tests** (antes: 34) |
| `./init.sh` | ✅ verde de punta a punta |

Último `./init.sh`:

```
── 4. Type checking (tsc) ──────────────────────────────
[OK]    Type check OK (tsc sin errores)

── 5. Ejecutando tests ─────────────────────────────────
 Test Files  86 passed (86)
      Tests  1360 passed (1360)
[OK]    Todos los tests pasan

── 6. E2E smoke (chromium) ─────────────────────────────
[OK]    E2E smoke verde (chromium)

── 7. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

## Sugerencias fuera de scope (NO aplicadas)

- **Deshacer una pareja detectada que no es un traspaso** necesita
  `DELETE /api/transfers/:id`, que ninguna pantalla usa. Es la feature de revisar
  parejas que ya está en la E7; sería también quien mueva `getAmbiguousCount` a
  `shared/`.
- **El importe de lo escondido** no existe en ninguna respuesta del backend (los tres
  `totals` salen a `"0.00"` con `excluded=only` / `transfer=only`). Si el humano lo
  quiere de verdad, la vía honesta es una feature del backend.
- La cola de revisión (`/review`) no tiene interruptor; esto es solo del extracto.

## Estado en `feature_list.json`

Sigue en **`in_progress`**. No se marca `done` hasta que el `reviewer` apruebe y exista
`progress/summaries/statement-noise-toggle.md`. No se ha hecho ningún commit.
