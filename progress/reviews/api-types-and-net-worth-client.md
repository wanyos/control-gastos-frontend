# Review — feature 7 `api-types-and-net-worth-client`

**Veredicto:** APPROVED

Fecha: 2026-09-12 · Revisor: `reviewer` (pasada independiente) · Feature **no
SDD** (`sdd` no está en `true` y no existe `specs/api-types-and-net-worth-client/`,
como debe ser). El contrato revisado es el bloque `intent` + `acceptance` de la
feature 7 de `feature_list.json`, contrastado campo a campo contra
`../gastos-backend/docs/api-contract.md` → `### GET /api/net-worth`
(líneas 1063-1190, **leído, no editado**).

Todo lo que se afirma aquí está **ejecutado por el revisor en esta sesión**. Lo
que no he podido comprobar yo está dicho como tal, con lo que haría falta.

## Trazabilidad requirements ↔ tests (solo SDD)

**No aplica** — la feature no es SDD. No hay `requirements.md` que trazar y no
debe haberlo.

## Tasks completas (solo SDD)

**No aplica** — la feature no es SDD. No hay `tasks.md`.

## Criterios de aceptación (siempre)

- [x] **1. Tipos propios de la respuesta de `GET /api/net-worth`** —
  `src/features/net-worth/types.ts`: `NetWorth` (`:91`) con `asOf`, `total`,
  `accounts` (`NetWorthAccounts:24` = total + lista) e `investments`
  (`NetWorthInvestments:85` = total + products + issues). La forma del producto
  depende de su `type`: unión discriminada `InvestmentProduct` (`:72`) =
  `MarketProduct` (`:40`, fund/etf/managed_portfolio) | `DepositProduct` (`:52`)
  | `SavingsAccountProduct` (`:63`). Cotejado campo a campo con el contrato:
  coincide exactamente, incluido `stale` en market y savings pero no en deposit,
  y `principal`/`expectedGain`/`maturityDate`/`matured` solo en deposit.
  `NetWorthIssueReason` (`:75`) es el enum cerrado exacto de la tabla del
  contrato; `AccountType` (`:12`) es `checking | savings`, el del modelo
  `Account` (contrato línea 202), sin inventar `cash`.
  Tests: `src/features/net-worth/__tests__/service.spec.ts:122` y `:165`.
- [x] **2. Importes como string decimal, nunca `number`; nullables donde el
  contrato lo permite** — `DecimalString = string` (`types.ts:7`) en todos los
  importes. Comprobado por mí con
  `grep -rn "Number(|parseFloat|parseInt" src/features` → **ningún resultado**:
  no hay ni una conversión numérica. Además `asDecimal` (`service.ts:87`)
  **rechaza** un número donde el contrato promete string, así que una deriva no
  entra en silencio. Nullables: `value`, `marketValue`, `uninvestedCash`,
  `valuedAt` en market (`types.ts:43-48`); `value` y `valuedAt` en savings
  (`:66-67`); `valuedAt` del issue (`:82`). `DepositProduct.value` no nullable es
  correcto: el contrato dice que un depósito vale su `principal` mientras vive.
  Tests: `service.spec.ts:143` (todo importe es string de dos decimales y al
  menos uno es `null`) y `:209` (producto sin valoración → `null`, no cero).
- [x] **3. Tipar otros endpoints era opcional** — no se hizo, y está justificado
  en `progress/implementation/api-types-and-net-worth-client.md` (D6). No
  bloquea el cierre.
- [x] **4. Servicio tipado que reutiliza `src/services/http.ts` y expone
  `getNetWorth()`** — `service.ts:218`, `getNetWorth(client: HttpClient = http)`,
  importando `http` de `@/services/http` (`service.ts:7`). Test
  `service.spec.ts:112`.
- [x] **5. `vite.config.ts` proxya `/api` a `http://localhost:3000`** —
  `vite.config.ts:20-29` (`changeOrigin: true`). Comprobado en ejecución, no
  leyendo: con el dev server ya levantado,
  `curl http://localhost:5173/api/net-worth` → **200**, y el cuerpo es
  **byte a byte idéntico** al de `curl http://localhost:3000/api/net-worth`
  (`cmp` → IDENTICAL). Un dev server sin el proxy devolvería el index de Vite,
  no un JSON igual al del backend.
- [x] **6. En `pnpm dev` la petición sale contra el origen del dev server y no
  da CORS** — verificado en tres piezas ejecutadas por mí: (a) la ruta `/api/*`
  del origen `:5173` llega al backend y devuelve el mismo byte (punto 5);
  (b) `.env.development` = `VITE_API_URL=/` y el test
  `src/shared/__tests__/config.spec.ts:26` comprueba **literalmente** que `/`
  resuelto contra `http://localhost:5173` da
  `http://localhost:5173/api/net-worth`, no `:3000`; (c) el path del servicio es
  absoluto (`service.ts:27`) y `http.ts:39` lo resuelve contra esa base.
  **Lo que NO he comprobado yo:** abrir un navegador real en `:5173`, invocar
  `getNetWorth()` y mirar la pestaña de red y la consola. Mis herramientas aquí
  son Read/Grep/Bash, sin navegador, y la app todavía no tiene UI que dispare la
  llamada; haría falta una sesión de navegador ejecutando `getNetWorth()` desde
  la consola. El implementer dice haberlo hecho con ese resultado; yo lo
  respaldo por equivalencia (a+b+c), no por observación directa. La ausencia de
  CORS es además estructural: una petición same-origin no dispara CORS.
- [x] **7. La decisión `VITE_API_URL` es coherente con `loadConfig` y está
  documentada** — `src/shared/config.ts:30-33` (origen inyectable) y `:49-66`
  (rama relativa / rama absoluta). **El fail-fast de la feature 2 no se rompe**,
  comprobado en los tests que acabo de ejecutar: siguen verdes los de variable
  ausente/vacía (`config.spec.ts:14,19`), URL impaseable (`:40`) y el singleton
  que revienta al importar (`:54`); y se añade base relativa sin origen →
  `ConfigError` (`:35`). Documentado en `docs/stack.md`, sección nueva *Acceso a
  la API en desarrollo: proxy + base relativa*, con la tabla de las dos formas,
  el trade-off frente a apuntar al puerto 5173 y la consecuencia en los paths;
  la tabla de variables de entorno y la nota de ADR-004 quedan actualizadas.
- [x] **8. Tests unitarios con la llamada HTTP mockeada, sin backend real** —
  `service.spec.ts:101` mockea **solo** `globalThis.fetch` y deja correr el
  cliente `http` real, así que también se verifica la URL construida. 11 tests.
- [x] **9. `pnpm type-check`, `pnpm lint`, `pnpm test:unit` y `./init.sh` en
  verde** — reejecutado todo por mí (evidencia abajo).
- [x] **10. No se crea un segundo cliente HTTP** — comprobado por mí:
  `grep -rn "fetch(" src --include=*.ts --include=*.vue` fuera de `__tests__`
  devuelve **una sola línea**: `src/services/http.ts:43`. Y `src/services/http.ts`
  no se ha modificado (no aparece en `git status`).

### Evidencia ejecutada en esta revisión

```
pnpm run type-check            → vue-tsc --build, exit 0, sin errores
pnpm run lint                  → oxlint + eslint, exit 0 (árbol sin cambios después)
pnpm run test:unit             → Test Files 7 passed (7) | Tests 62 passed (62)
pnpm run build                 → vue-tsc + vite build ✓ built in 166ms (87.84 kB)
bash ./init.sh                 → secciones 1-7 en verde, [OK] Entorno listo (exit 0)
CI=true pnpm test:e2e --project=chromium  → 1 passed (build de producción en preview)
curl :3000/api/net-worth       → 200
curl :5173/api/net-worth       → 200
cmp de los dos cuerpos         → IDENTICAL
```

Y contra los **datos reales** de hoy (no solo el ejemplo del contrato): volqué
el payload de `:3000` y comprobé con un script propio que cumple **todas** las
reglas que impone `parseNetWorth` — campo a campo, tipo a tipo, sin ningún campo
extra que los tipos no declaren. Resultado: `VIOLACIONES: ninguna`.
`asOf "2026-09-12"`, `total "90162.46"` (**string**), `accounts.total
"28061.72"` con 4 cuentas, `investments.total "62100.74"` con 7 productos
(`savings_account`, `managed_portfolio`, `deposit`×2, `etf`, `fund`×2 — los tres
constructores de la unión ejercitados con datos reales) y `issues: []`. Los
únicos `null` reales fueron tres `uninvestedCash`, justo el hueco que el
contrato permite.

> Precisión honesta: **no ejecuté `parseNetWorth` sobre ese payload**, porque
> hacerlo exigía crear un spec temporal dentro de `src/` y tengo prohibido
> escribir código o tests. Lo que hice es comprobar el payload contra las mismas
> reglas del parser con un script externo. Para la comprobación literal haría
> falta ese spec temporal en `src/features/net-worth/__tests__/`, que es
> exactamente lo que el implementer dice haber hecho y borrado.

## Arquitectura (docs/architecture.md)

- [x] **P1 — Organización por feature**: todo lo nuevo vive junto en
  `src/features/net-worth/` (`types.ts`, `service.ts`, `__tests__/`). Es la
  primera feature que estrena `src/features/`, y lo hace con la forma que el doc
  describe.
- [x] **P2 — La UI no habla con la API**: no se ha creado ningún `.vue` en esta
  feature y no hay `fetch(` fuera de `src/services/http.ts`.
- [x] **P3 — El service trae datos y no guarda estado**: `service.ts` no tiene ni
  una variable module-level mutable; sus únicas constantes son los enums
  congelados del contrato (`:29-43`). Función pura de entrada → datos.
- [x] **P4 — Tipos propios, y la respuesta cruda se mapea en `services/`**: los
  tipos se escriben aquí leyendo el contrato (cabecera de `types.ts:1-4`) y
  `parseNetWorth` (`service.ts:204`) devuelve objetos nuevos, no el JSON del
  backend. Cumple el «no pasear el JSON crudo por los componentes».
- [x] **P5 — Estado mínimo y explícito**: sin caché improvisada.
- [x] **ADR-002 respetado y ADR-003 usado como estaba previsto**: el service
  lanza `ValidationError` (`src/shared/errors.ts:42`) — el subtipo que ADR-003
  dejó preparado precisamente para validar datos de la API — y deja pasar el
  `ApiError` del cliente sin tocarlo (test `service.spec.ts:271`).
- [x] **ADR-004 revisado, no ignorado**: el ADR pedía «revisar al consumir el
  primer endpoint». Se ha revisado y la respuesta («todavía no una librería de
  schemas, y por qué») está escrita en `docs/stack.md`. **Cero dependencias
  nuevas**: `package.json` no aparece en `git status`.

## Convenciones (docs/conventions.md)

- [x] **Estilo, nombres, imports**: identificadores, comentarios y nombres de
  fichero en inglés; contenido de `progress/` y `docs/` en español. `import type`
  en todos los imports de tipos (`verbatimModuleSyntax`), orden vendor → `@/` →
  relativos (`service.ts:7-24`), sin punto y coma, comillas simples, ≤100
  columnas — y no lo digo por lectura: `pnpm run lint` (oxlint + eslint) y
  `pnpm run type-check` pasan en verde y el árbol no cambia después del `--fix`.
  Tests co-localizados en `src/features/net-worth/__tests__/*.spec.ts`, con
  nombres descriptivos en inglés.
- [x] **Manejo de errores**: nada de `throw` de strings; `ValidationError` con la
  ruta del campo que falla (`service.ts:47`, p. ej.
  `investments.products[0].type is not one of …`), que es lo que hace útil el
  fallo. Sin `console.log` ni TODOs: comprobado con
  `grep -rn "console.log|TODO" src` → ningún resultado.

## Verificación (docs/verification.md)

- [x] **Tests usan los recursos correctos (no mocks innecesarios)**: se mockea
  **solo** la frontera HTTP (`globalThis.fetch`), y el cliente `http` real corre
  de verdad. Un test extra (`service.spec.ts:278`) inyecta un cliente propio sin
  tocar globales.
- [x] **Tests verifican output concreto, no solo «no lanza excepción»**: las
  aserciones son `toEqual` sobre el objeto completo (`:131`, `:175`, `:186`,
  `:197`, `:226`), valores literales (`'23708.90'`), la URL exacta
  (`:118-119`), `expect(savings).not.toHaveProperty('marketValue')` (`:206`) y
  los mensajes de error concretos (`/total is not a decimal string/` `:260`,
  `/products\[0\]\.type/` `:268`).
- [x] **Camino feliz y caminos de error**: además del feliz hay cuatro de borde o
  error — importe numérico donde va string (`:254`), producto con `type`
  desconocido (`:263`), 500 que sale como `ApiError` con `status` (`:271`) y base
  vacía con listas vacías y totales a `"0.00"` (`:238`).

## CHECKPOINTS.md

- [x] **C1 — Arnés completo**: los archivos base y los cinco `docs/` exigidos
  existen; `bash ./init.sh` termina con **exit 0** (ejecutado ahora).
- [x] **C2 — Estado coherente**: ninguna feature en `in_progress` y las `done`
  tienen tests que pasan (62/62). **Nota de estado**: la feature 7 ya figura como
  `done` en `feature_list.json` y `progress/current.md` la da por cerrada y
  aprobada — el cierre se hizo tras una pasada de revisión anterior de hoy, no
  está a la espera de esta. Esta revisión es una **verificación independiente**
  de ese cierre y lo confirma: nada de lo que he ejecutado contradice el `done`.
  No he tocado el `status` ni he commiteado nada.
  Único roce menor: el bloque «Próximo paso» de `progress/current.md` todavía
  dice «pasar la feature 7 por el `reviewer`», que su propia cabecera ya
  contradice. Es residuo de bitácora, no afecta al código; se limpia al cerrar la
  sesión.
- [x] **C3 — Arquitectura**: estructura conforme a `docs/architecture.md`; cero
  dependencias nuevas; sin logs de debug ni TODOs (grep hecho); convenciones
  respetadas (lint verde).
- [x] **C4 — Verificación real**: cada módulo nuevo tiene su test ejecutable, en
  el entorno que describe `docs/verification.md` (Vitest/jsdom), todos pasan, y
  cubren camino feliz más cuatro de error.
- [x] **C5 — Sesión cerrada bien**: los untracked son trabajo legítimo
  (`src/features/net-worth/` y los tres
  `progress/…/api-types-and-net-worth-client.md`); ni temporales, ni logs, ni
  builds fuera del ignore (`dist/`, `playwright-report/`, `test-results/` no
  asoman en `git status`). Mover la entrada a `progress/history.md` y vaciar
  `current.md` sigue pendiente: es el cierre de sesión del leader, no trabajo de
  esta feature.
- [x] **C6 — Coherencia con proyectos hermanos**: no se ha tocado **nada** de
  `gastos-backend` (el contrato se leyó, no se editó). Ningún campo inventado:
  cotejé los tipos contra el contrato y además contra la respuesta real del
  backend en marcha, y no hay ni un campo declarado que la API no mande ni un
  campo enviado que los tipos no declaren. `docs/related-projects.md` recoge el
  proxy de Vite y la regla de tipos no compartidos.
- [ ] **C7 — SDD**: **no aplica** (la feature no es SDD). No hay carpeta
  `specs/api-types-and-net-worth-client/` y no debe haberla.
- [x] **C8 — Resumen de cierre escrito**: sí, ver abajo.

## Resumen de cierre (si APPROVED)

- Escrito en `progress/summaries/api-types-and-net-worth-client.md` → **sí**
  (reescrito por esta pasada, siguiendo `docs/summary-template.md` y cerrando el
  círculo con los cinco puntos del `como_se_que_esta_bien`).

## Cambios requeridos (si aplica)

**Ninguno.** Los diez criterios de `acceptance` se cumplen, el punto caliente
(base root-relativa frente al fail-fast de la feature 2) está resuelto sin
relajar ni una validación y con su trade-off escrito, no hay un segundo cliente
HTTP, los importes no se convierten a número en ningún sitio, y toda la puerta de
verificación está verde ejecutada por el revisor.

## Observaciones no bloqueantes (nada que arreglar ahora)

1. **`investments.issues` solo está cubierto por el ejemplo del contrato.** Lo
   confirmé: la base real devuelve `issues: []`. Lo considero **suficiente para
   esta feature** y no una carencia que haya que tapar: `parseIssue`
   (`service.ts:180`) es una función pura y el test `service.spec.ts:221`
   ejercita los **tres** `reason` del enum con aserción `toEqual` exacta,
   incluido el `valuedAt: null` de `no_valuation`; el caso de lista vacía también
   tiene su test (`:238`). Provocar issues reales exigiría escribir en la base
   del backend, que es de otro proyecto y de otra sesión. Lo que sí dejo anotado:
   cuando la feature 9 pinte los avisos, conviene ver uno real una vez (basta un
   producto sin valoración) antes de darlos por buenos en pantalla.
2. `asText` (`service.ts:65`) rechaza la cadena vacía. Si el backend llegara a
   serializar un `alias` o un `name` vacíos —hoy no ocurre, el contrato dice que
   el alias se deriva— saldría un `ValidationError` en vez de un dato pobre. A
   vigilar, no a cambiar.
3. `bank` se tipa como `string` y no como enum cerrado. Es lo prudente: el
   contrato descubre los bancos dinámicamente. La feature 9 puede querer cerrarlo
   al pintar el reparto por banco; que sea decisión consciente.
4. Un `VITE_API_URL` que empezara por doble barra (`//host`) se resolvería como
   URL protocol-relative en vez de como ruta. Caso irreal en los `.env`
   committeados; se anota por completitud.
5. Ya anotado por el implementer y confirmado por mí: `vite.config.ts` no pasa
   `prettier --check` porque `pnpm format` solo cubre `src/`. Viene de antes de
   esta feature y merece su propia tarea de mantenimiento.
