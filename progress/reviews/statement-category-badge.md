## Review — 2026-11-05

**Veredicto:** APPROVED
Cabo 34 (a) de `docs/roadmap.md`, no es una feature de `feature_list.json` (no hay acceptance, spec ni `checks`). Comprobado: lo decidido por el humano el 2026-11-04 ↔ código y pruebas, arquitectura, convenciones, verificación, CHECKPOINTS C1-C5 y C8 (C4 bis, C6 y C7 no aplican). Checks: no hay. Sin hallazgos.
Resumen de cierre: `progress/summaries/statement-category-badge.md`.

### Lo que he comprobado yo, con qué comando y qué salió

- **Medida en Chromium** (una prueba temporal mía en `e2e/`, borrada al acabar, con datos inventados y todas las llamadas a `/api` contestadas con `page.route`; 4 líneas: gasto `Food`, ingreso `Pay`, ingreso `Pay` que no cuenta, sin categoría). Fondo de la línea frente al de la etiqueta:
  - sin el ratón: línea `rgb(20, 27, 34)` (`--surface-card`), etiqueta `rgb(56, 67, 79)` (`--surface-hover`), cociente **1,72**;
  - con el ratón encima: línea `rgb(11, 17, 22)` (`--surface-sunken`), etiqueta `rgb(56, 67, 79)`, cociente **1,88** (antes del arreglo era 1,00);
  - texto de la etiqueta sobre su fondo: 8,17.
- **`Uncategorized`:** fondo `rgba(0, 0, 0, 0)`, borde `dashed rgb(155, 166, 178)`, con y sin el ratón.
- **Importe que no cuenta:** `rgb(155, 166, 178)` (`--ink-faint`) con `line-through`, con y sin el ratón; `amountClass` no está en el diff.
- **Ninguna otra pantalla cambia:** `git diff --stat` no incluye `BaseBadge.vue`, `MovementRow.vue` ni `RuleRow.vue`; la clase nueva `CATEGORY_CLASS` es local a `StatementRow.vue`. El cambio de `theme-dark.css` es una línea dentro del comentario de cabecera: no cambia ningún valor.
- **Solo tokens:** `CATEGORY_CLASS` usa `bg-surface-hover`, `text-ink-body`, `rounded-pill`, `text-2xs`; los valores sueltos (`px-[7px] py-[2px] leading-[1.4]`) son medidas copiadas de la etiqueta pequeña de `BaseBadge`, no colores.
- **La prueba nueva falla sin el arreglo:** con `StatementRow.vue` del `HEAD` puesto temporalmente (copia de seguridad en la carpeta temporal y restaurado después, `cmp` idéntico): `npx playwright test e2e/statement.spec.ts:346 --project=chromium` → `1 failed`, `Expected: "rgb(56, 67, 79)"`, `Received: "rgb(11, 17, 22)"`. Igual con `npx vitest run src/features/statement/__tests__/StatementRow.spec.ts` → `1 failed | 42 passed`, la de `gives every category the same label look for income and for expense`.
- **`npx playwright test`** (chromium, firefox, webkit): exit 0, **`273 passed (2.5m)`**; la prueba nueva sale 3 veces, una por navegador.
- **`./init.sh`:** exit 0. `Test Files 133 passed (133)`, `Tests 2151 passed | 1 expected fail (2152)`, `pnpm lint:oxlint:check` OK, `pnpm format:check` OK, `pnpm type-check` OK, `E2E smoke verde (chromium)`, `Entorno listo`.
- `npx vitest run src/features/statement src/assets` → `19 passed`, `643 passed`.
- Sin servidor que cerrar al acabar (Playwright arrancó y cerró el suyo; nada escuchando en `:5173`), y sin archivos temporales en el repositorio.

### Por qué se tocó `src/assets/theme-dark.css`

`docs/conventions.md` (línea 302) pide una línea `contrast:` cada vez que se pone un token sobre un fondo nuevo, y `theme-dark.spec.ts` mide cada una. La etiqueta pone ahora `--ink-body` sobre `--surface-hover`; ese par ya estaba medido (`(hovered rows)`), así que la línea nueva repite la medida con otro motivo y solo deja escrito el uso nuevo. Es un comentario: ningún color cambia.

### Lo que no se puede separar del todo

En `e2e/statement.spec.ts`, la prueba nueva y el cambio de la cabecera de `the month picker reads legibly…` (cabo 44: `browserName`, `const watch = await prepare(page)`) caen en el mismo bloque de `git diff`. Por contenido se distinguen (la prueba nueva va de la línea 346 a la 413), pero para hacer commits separados hay que partir ese bloque a mano. En `docs/` no hay nada de este arreglo: `docs/guia-de-uso.md:516` («todas grises… `Uncategorized` … sin fondo») sigue siendo verdad.

### Comprobado sin hallazgos
Lo decidido el 2026-11-04 (a) y (b) ↔ código, pruebas que comprueban valores concretos y se lanzan contra la página real sin backend, arquitectura (clase local, como `UNCATEGORIZED_CLASS`), convenciones (tokens, línea `contrast:`), documentos que hayan quedado falsos (`git grep` de `BaseBadge`, `surface-sunken`, «etiqueta… categoría» en `docs`, `README.md` y `src`), ningún dato real, vocabulario, `docs/lessons.md` (ninguna entrada activa del `implementer`), CHECKPOINTS C1-C5 y C8.
