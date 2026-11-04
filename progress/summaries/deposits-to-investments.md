# Resumen — feature 39 `deposits-to-investments`

Fecha de cierre: 2026-11-03
Intención original: `feature_list.json` → feature `deposits-to-investments`, bloque `intent`
Spec: no tiene (flujo simple).

## Qué hace ahora la app que antes no

La pantalla `Investments`, que estaba vacía, enseña la tarjeta `Deposits` (todos tus depósitos y lo
que ganó cada uno), igual que la hizo la feature 38. `Net Worth` vuelve a ser como antes de la 38:
ni pinta la tarjeta ni pide los depósitos al backend.

## Por dónde se toca (puntos de entrada)

| Cómo se usa | Código |
| --- | --- |
| Ruta `/investments` — monta la pantalla | [router/index.ts:106](../../src/router/index.ts#L106) |
| Al abrir la pantalla, pide los depósitos | [InvestmentsView.vue:21](../../src/features/investments/views/InvestmentsView.vue#L21) |
| Lee `GET /api/investments/deposits` y guarda datos, carga y error | [investments/store.ts:21](../../src/features/investments/store.ts#L21) |
| Tras una importación, los vuelve a pedir si ya estaban leídos | [import/store.ts:107](../../src/features/import/store.ts#L107) |

## Dónde está el código

### Pantalla y tarjeta (`src/features/investments/`)

| Qué hace | Dónde |
| --- | --- |
| La pantalla: solo la tarjeta, con el estado del store | [InvestmentsView.vue](../../src/features/investments/views/InvestmentsView.vue) → `InvestmentsView` |
| La tarjeta (carga, error, vacío, total y filas), solo props | [DepositEarnings.vue](../../src/features/investments/components/DepositEarnings.vue) → `DepositEarnings` |
| Una fila de depósito | [DepositRow.vue](../../src/features/investments/components/DepositRow.vue) → `DepositRow` |
| Textos puros: etiqueta del estado, fechas, columna de lo ganado, motivo del dudoso, enlace a Movements | [deposits.ts](../../src/features/investments/deposits.ts) → `statusBadge`, `depositFacts`, `earnedCell`, `extraLine`, `movementsLink` |

### Datos

| Qué hace | Dónde |
| --- | --- |
| Estado de los depósitos y recarga tras importar | [store.ts](../../src/features/investments/store.ts) → `useInvestmentsStore`, `loadDeposits`, `refreshDepositsIfLoaded` |
| Lectura y comprobación de la respuesta (incluido que el total sea la suma de los vencidos) | [service.ts](../../src/features/investments/service.ts) → `getDepositEarnings`, `parseDepositEarnings`, `DEPOSITS_PATH` |
| Tipos propios del contrato | [types.ts](../../src/features/investments/types.ts) → `DepositEarnings`, `DepositEarning`, `DepositStatus`, `DepositMaturity` |

### Lo que se tocó fuera de la carpeta

| Qué hace | Dónde |
| --- | --- |
| `/investments` monta `InvestmentsView`; fuera `PlaceholderView` | [router/index.ts](../../src/router/index.ts) → `routes` |
| La importación avisa al store de investments | [import/store.ts](../../src/features/import/store.ts) → `useImportStore` |
| `Net Worth` sin la tarjeta ni la segunda petición (vuelve a como estaba antes de la 38) | [net-worth/store.ts](../../src/features/net-worth/store.ts) → `useNetWorthStore`; [NetWorthView.vue](../../src/features/net-worth/views/NetWorthView.vue); [net-worth/service.ts](../../src/features/net-worth/service.ts); [net-worth/types.ts](../../src/features/net-worth/types.ts) |
| Borrado: la vista compartida de «not built yet», que ya no usaba ninguna ruta | `src/shared/components/PlaceholderView.vue` (ya no existe) |

### Tests

| Qué cubre | Dónde |
| --- | --- |
| La pantalla por la ruta real: tarjeta, error, contrato roto, cargando, vacío, una sola petición GET | [InvestmentsView.spec.ts](../../src/features/investments/__tests__/InvestmentsView.spec.ts) |
| El store: carga, error sin relanzar, recarga solo si había datos | [investments/store.spec.ts](../../src/features/investments/__tests__/store.spec.ts) |
| La lectura y su comprobación (10 tests trasladados de la 38) | [investments/service.spec.ts](../../src/features/investments/__tests__/service.spec.ts) → `getDepositEarnings` |
| La tarjeta y los textos (trasladados de la 38) | [DepositEarnings.spec.ts](../../src/features/investments/__tests__/DepositEarnings.spec.ts), [deposits.spec.ts](../../src/features/investments/__tests__/deposits.spec.ts) |
| Datos inventados de prueba | [investments/__tests__/fixtures.ts](../../src/features/investments/__tests__/fixtures.ts) → `depositEarnings`, `emptyDepositEarnings` |
| Net Worth ya no la enseña ni la pide | [NetWorthView.spec.ts](../../src/features/net-worth/__tests__/NetWorthView.spec.ts) → `does not show the deposits card`; [net-worth/store.spec.ts](../../src/features/net-worth/__tests__/store.spec.ts) → `does not ask for the deposits` |
| Recarga tras importar, en los dos sentidos | [import/__tests__/store.spec.ts](../../src/features/import/__tests__/store.spec.ts) → `asks the deposits again after an import when they were loaded`, `does not ask the deposits after an import when only the net worth was loaded`; [import/__tests__/fixtures.ts](../../src/features/import/__tests__/fixtures.ts) → `mockApi` |
| La ruta y el menú | [router.spec.ts](../../src/router/__tests__/router.spec.ts) → `mounts the investments screen on /investments (feature 39)`; [AppShell.spec.ts](../../src/shared/components/__tests__/AppShell.spec.ts) |
| En el navegador: Net Worth no la pide, Investments la enseña | [e2e/investments.spec.ts](../../e2e/investments.spec.ts) → `opens investments and sees the deposits card`; los nueve e2e que tocó la 38 vuelven a su versión anterior |

## Cumplimiento de la intención

- ✅ "En Investments veo la tarjeta de depósitos con todo lo que se veía en Net Worth" → `shows the deposits card on the investments page`, más los tests de la 38 trasladados. Check: ✅.
- ✅ "Net Worth ya no enseña la tarjeta ni pide los depósitos al backend" → `does not show the deposits card` y `does not ask for the deposits`. Checks: ✅ ✅.
- ✅ "Si no se pueden leer los depósitos, la pantalla Investments lo dice en vez de quedarse en blanco" → `says the deposits could not be read instead of staying blank`. Check: ✅.
- ✅ "Tras una importación, los depósitos se vuelven a pedir si ya estaban cargados" → `asks the deposits again after an import when they were loaded` (y el caso contrario). Check: ✅.
- ✅ "Las pruebas de navegador que pasan por Net Worth ya no necesitan contestar la petición de los depósitos, y hay una que abre Investments y ve la tarjeta" → `e2e/investments.spec.ts`, 3 navegadores. Check: ✅ (`3 passed`).
- ✅ "Textos en inglés, en oscuro, y pnpm type-check, lint, test:unit, build e ./init.sh en verde" → Check: ✅. Además, `pnpm test:unit` 2121 de 2121 y todos los e2e en chromium, 84 de 84.

## Decisiones que se tomaron por ti

- (delegado) El código vive en `src/features/investments/`, con su propio store; aprobado por ti el 2026-11-03.
- «Ya estaban cargados» quiere decir que hay depósitos leídos: si la última lectura falló, no se piden tras importar; se piden al volver a abrir la pantalla.
- La pantalla no tiene título propio: lo pone la barra de arriba, como en `Net Worth`.
- Se borró `PlaceholderView.vue`, porque ya no la usaba ninguna ruta.

## Qué NO se tocó / quedó fuera

- El backend, y lo que enseña la tarjeta y cómo.
- Los demás productos y el resumen de lo ganado en `Investments`: es la feature siguiente.
- La prueba con tus datos reales en pantalla sigue pendiente (cabo 45 del roadmap): el implementer solo pasó una respuesta real por la comprobación del service (5 depósitos, aceptada).

## Notas para el futuro

- Los `checks` de la feature 38 apuntan a rutas de `net-worth` que esta feature movió y ya no pasan; lo decide el leader contigo.
- `e2e/category-rules.spec.ts:779` falló una vez al implementer por un punto de diferencia de color y pasó al repetirlo (es el cabo 41 del roadmap).
