# Resumen — feature 38 `deposit-earnings`

Fecha de cierre: 2026-11-02
Intención original: `feature_list.json` → feature `deposit-earnings`, bloque `intent`
Spec: `specs/38-deposit-earnings/`

## Qué hace ahora la app que antes no

`Net Worth` tiene debajo de `Details` una tarjeta `Deposits` con todos tus depósitos (vivos,
vencidos, cancelados y dudosos): lo que metiste, cuándo lo abriste, cuándo vence o venció, lo
que esperabas y lo que ganó cada vencido, y arriba el total ganado que manda el backend. Antes
ninguna pantalla usaba `GET /api/investments/deposits`. Ese total no se suma a ninguna cifra
del patrimonio.

## Por dónde se toca (puntos de entrada)

| Cómo se usa | Código |
| --- | --- |
| Pide `GET /api/investments/deposits` y comprueba la respuesta | [service.ts:255](../../src/features/net-worth/service.ts#L255) → `getDepositEarnings` |
| El store pide patrimonio y depósitos a la vez | [store.ts:50](../../src/features/net-worth/store.ts#L50) → `load` |
| La tarjeta dentro de la pantalla `Net Worth` | [NetWorthView.vue:62](../../src/features/net-worth/views/NetWorthView.vue#L62) → `<DepositEarnings>` |
| Vuelve a pedirlo tras una importación (código anterior, ahora también trae depósitos) | [import/store.ts:102](../../src/features/import/store.ts#L102) → `netWorthStore.load` |

## Dónde está el código

### Tipos y lectura del backend

| Qué hace | Dónde |
| --- | --- |
| Tipos de la respuesta | [types.ts](../../src/features/net-worth/types.ts) → `DepositStatus`, `DepositMaturity`, `DepositEarning`, `DepositEarnings` |
| Ruta de la petición | [service.ts](../../src/features/net-worth/service.ts) → `DEPOSITS_PATH` |
| Valida la respuesta (estados, `earned` solo en vencidos, `maturity` donde toca, total = suma en céntimos) | [service.ts](../../src/features/net-worth/service.ts) → `parseDepositEarnings` |

### Estado

| Qué hace | Dónde |
| --- | --- |
| Datos, carga y error propios de los depósitos, sin afectar al patrimonio | [store.ts](../../src/features/net-worth/store.ts) → `deposits`, `depositsLoading`, `depositsError`, `loadDeposits` |

### Textos y pantalla

| Qué hace | Dónde |
| --- | --- |
| Etiqueta y color de cada estado (solo `Doubtful` lleva color, ámbar) | [deposits.ts](../../src/features/net-worth/deposits.ts) → `statusBadge`, `isDoubtful` |
| Datos de la fila y fecha con su verbo; un dato que falta sale como `—` | [deposits.ts](../../src/features/net-worth/deposits.ts) → `depositFacts`, `maturityLabel`, `moneyOrDash`, `dateOrDash` |
| Columna de lo ganado y línea del motivo | [deposits.ts](../../src/features/net-worth/deposits.ts) → `earnedCell`, `extraLine` |
| Enlace `See in Movements` al mes del vencimiento | [deposits.ts](../../src/features/net-worth/deposits.ts) → `movementsLink` |
| La tarjeta: cargando, error, vacía, total y lista | [DepositEarnings.vue](../../src/features/net-worth/components/DepositEarnings.vue) → `DepositEarnings` |
| Una fila | [DepositRow.vue](../../src/features/net-worth/components/DepositRow.vue) → `DepositRow` |

### Pruebas de navegador y documentos

| Qué hace | Dónde |
| --- | --- |
| Los 9 specs que responden `**/api/net-worth` responden también `**/api/investments/deposits` (lista vacía) | `e2e/app-boot.spec.ts`, `expenses-by-category`, `import-dialog`, `overview`, `statement`, `statement-exclude-from-totals`, `statement-fix-category`, `statement-noise-toggle`, `transfer-pairs-review` |
| Guía de uso, sección `Net Worth`, pasos 8 a 11 | [guia-de-uso.md](../../docs/guia-de-uso.md) |
| La segunda petición del store de `net-worth` | [architecture.md](../../docs/architecture.md), [stack.md](../../docs/stack.md) |

### Tests

| Qué cubre | Dónde |
| --- | --- |
| Petición, mapeo del contrato, rechazos (estado desconocido, `earned` fuera de vencidos, total que no cuadra), error 500 | [service.spec.ts](../../src/features/net-worth/__tests__/service.spec.ts) → `asks the deposits path…`, `maps every deposit field…`, `rejects …` |
| Las dos peticiones a la vez y que un fallo no tumba la otra | [store.spec.ts](../../src/features/net-worth/__tests__/store.spec.ts) → `load() asks the net worth and the deposits at the same time`, `a failed deposits request leaves the net worth loaded` |
| Textos, colores, guion de los huecos, enlace | [deposits.spec.ts](../../src/features/net-worth/__tests__/deposits.spec.ts) → `names the status of each deposit` y siguientes |
| Filas por estado, cifra en verde y etiqueta sin color, total tal cual, vacío, error, cargando | [DepositEarnings.spec.ts](../../src/features/net-worth/__tests__/DepositEarnings.spec.ts) → todos |
| Sitio de la tarjeta, cifras del patrimonio iguales, error solo en la tarjeta | [NetWorthView.spec.ts](../../src/features/net-worth/__tests__/NetWorthView.spec.ts) → `paints the Deposits part below Details`, `keeps every net worth figure…`, `keeps the rest of the screen…` |
| Recarga tras importar | [import/store.spec.ts](../../src/features/import/__tests__/store.spec.ts) → `asks the deposits again after an import when the net worth was loaded` |
| Datos de prueba inventados | [fixtures.ts](../../src/features/net-worth/__tests__/fixtures.ts) → `depositEarnings`, `emptyDepositEarnings` |

## Cumplimiento de la intención

Resultado real de `./init.sh --checks 38` el 2026-11-02: exit 0, 13 de 13 en verde.

- ✅ «Veo todos mis depósitos…» → `paints one row per deposit of every status in the order the backend sends`. Check 1: ✅
- ✅ «Un vencido enseña lo que ganó; el total, solo esos» → `shows what a matured deposit earned, in green`, `shows the total exactly as the backend sent it`, `rejects a response whose total is not the sum of the matured deposits`. Checks 2, 3 y 4: ✅
- ✅ «Un vivo enseña lo esperado y cuándo vence…» → `shows an active deposit with its expected gain, its maturity date and not earned yet`. Check 5: ✅
- ✅ «Un cancelado se distingue y no entra en el total» → `shows a cancelled deposit in grey, with its cancel date and not in the total`. Check 6: ✅
- ✅ «Un dudoso se ve con su motivo y fuera del total» → `shows each doubtful deposit in amber with its reason and not in the total`. Check 7: ✅
- ✅ «Sin depósitos, lo dice» → `says there are no deposits instead of an empty part`. Check 8: ✅
- ✅ «El total no se suma a nada» → `keeps every net worth figure as the backend sends it when deposits earned something`. Check 9: ✅
- ✅ «Inglés, oscuro, todo en verde» → type-check, lint, formato, `test:unit`, build e `./init.sh` (con el e2e de chromium). Check 10: ✅. Si se ve bien en oscuro lo dices tú.
- ✅ (añadidas) error solo en la tarjeta, enlace a `Movements`, recarga tras importar → checks 11, 12 y 13: ✅

## Decisiones que se tomaron por ti

- (delegado) Sitio: tarjeta propia a todo el ancho, debajo de `Details`.
- (delegado) Orden del backend en una sola lista; solo la cifra ganada de un vencido en verde, solo `Doubtful` en ámbar, cancelados en gris (corregido el 2026-11-02 tras tu decisión «sin color, como la hoja»).
- (delegado) Textos en inglés de la tabla de la hoja.
- (delegado) Enlace `See in Movements` al mes del vencimiento cuando hay un único cobro.
- (añadido) Un dudoso que devolvió menos dice cuánto devolvió.
- (añadido) Si fallan los depósitos solo lo dice la tarjeta; tras importar se vuelven a pedir.

## Qué NO se tocó / quedó fuera

- El backend y el resto de `Net Worth`: ninguna cifra del patrimonio cambia.
- Desde la tarjeta no se corrige un dudoso ni se elige su cobro.
- `../docs/ideas.md` (fuera de este proyecto) sigue diciendo que esto no existe: te toca a ti.

## Notas para el futuro

- No se ha probado con datos reales (backend apagado): cabo 45 de `docs/roadmap.md`.
- El total puede no coincidir con los intereses de `Overview` (incoherencia heredada del backend, dicha en la hoja y en la guía).
