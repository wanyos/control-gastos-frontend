# Resumen — cabo 44 de `docs/roadmap.md`: pruebas de navegador en Firefox y WebKit

Fecha de cierre: 2026-11-04
Origen: cabo 44 de `docs/roadmap.md` (no es una feature de `feature_list.json`) y dos decisiones
del humano del 2026-11-04. Informe: `progress/implementations/e2e-firefox-webkit.md`.

## Qué hace ahora la app que antes no

En Firefox y Safari, donde el campo «Jump to month» se ve como una caja de texto, la caja vacía
dice `YYYY-MM`, así que se sabe cómo escribir el mes. En Chromium se ve igual que antes. Y la suite
de `e2e/` pasa entera en los tres navegadores en este ordenador (252 de 252), sin poner nada en la
consola.

## Por dónde se toca (puntos de entrada)

| Cómo se usa | Código |
| --- | --- |
| El campo «Jump to month» (Movements, Overview, Expenses by category) | [MonthNav.vue:34](../../src/features/statement/components/MonthNav.vue#L34) |
| El proyecto `webkit` de Playwright, con `__COMPAT_LAYER=DpiUnaware` en Windows | [playwright.config.ts:70](../../playwright.config.ts#L70) |
| La prueba del campo de mes en los tres navegadores | [statement.spec.ts:346](../../e2e/statement.spec.ts#L346) |
| El desplazamiento que preparan las pruebas del aviso | [action-notice-in-view.spec.ts:692](../../e2e/action-notice-in-view.spec.ts#L692) |

## Dónde está el código

### Aplicación

| Qué hace | Dónde |
| --- | --- |
| Pista `YYYY-MM` en el campo de mes, con el porqué en el comentario de `onJump` | [MonthNav.vue](../../src/features/statement/components/MonthNav.vue) → `BaseInput` con `placeholder` |
| Pantallas que reutilizan el campo y reciben la pista sin cambios propios | [PeriodPicker.vue](../../src/features/expenses-by-category/components/PeriodPicker.vue) → `MonthNav`; [OverviewView.vue](../../src/features/overview/views/OverviewView.vue) → `MonthNav` |

### Configuración de las pruebas de navegador

| Qué hace | Dónde |
| --- | --- |
| WebKit en Windows arranca sin escalado de pantalla, para ver 1280 × 720 | [playwright.config.ts](../../playwright.config.ts) → proyecto `webkit`, `launchOptions.env` |

### Tests

| Qué cubre | Dónde |
| --- | --- |
| El campo lleva `placeholder` `YYYY-MM` | [MonthNav.spec.ts](../../src/features/statement/__tests__/MonthNav.spec.ts) → `hints the format for browsers that paint the month field as plain text` |
| Qué hace cada navegador con el campo, la pista y escribir `2024-01` | [statement.spec.ts](../../e2e/statement.spec.ts) → `the month picker reads legibly with the design system tokens` |
| La fila cae en el mismo píxel en los tres navegadores | [action-notice-in-view.spec.ts](../../e2e/action-notice-in-view.spec.ts) → `bringUnderTopBar` |

### Documentos

| Qué dice | Dónde |
| --- | --- |
| WebKit en Windows con `DpiUnaware`, y cómo se ve el campo de mes en Firefox y WebKit | [stack.md](../../docs/stack.md) → sección de Playwright |

## Cumplimiento de lo pedido

- ✅ Cada fallo explicado con una comprobación → el reviewer repitió la medida de la ventana de
  WebKit (731 × 411 sin la línea nueva, 1280 × 720 con ella) y la de los decimales del
  desplazamiento (WebKit corta, los otros redondean).
- ✅ Ninguna prueba aflojada, sin reintentos ni navegadores saltados → revisado en el diff; la
  prueba del campo de mes pide más que antes.
- ✅ En Chromium el campo se ve igual → capturas idénticas con y sin la pista, con valor y vacío,
  en `/movements`, `/overview` y `/expenses-by-category`.
- ✅ Suite completa → `npx playwright test`: exit 0, 252 passed. `./init.sh`: exit 0, 2140 tests.
- Sin checks: no es una feature.

## Qué NO se tocó / quedó fuera

- `e2e/category-rules.spec.ts` y el párrafo del cabo 41 en `docs/stack.md` (cabo 41, revisión
  aparte).
- `docs/roadmap.md:488` sigue citando `action-notice-in-view.spec.ts:992`; ahora es `:998`. El
  roadmap lo actualiza el leader.
- No se ha probado en Safari de macOS: el WebKit de Playwright en Windows no es Safari.

## Notas para el futuro

- Sugerencia del implementer, no aplicada: en una ventana baja (731 × 411, también en Chromium) el
  aviso que sale arriba de la lista queda por debajo del borde (`action-notice-in-view.spec.ts:946`).
