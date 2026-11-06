# Resumen — cabo 34 (a) de `docs/roadmap.md`: la etiqueta de categoría se perdía con el ratón encima

Fecha de cierre: 2026-11-05
Origen: cabo 34 (a) de `docs/roadmap.md`, decidido por el humano el 2026-11-04 sobre
`progress/explorations/cabo-34/propuesta.md` (no es una feature de `feature_list.json`).
Informe: `progress/implementations/statement-category-badge.md`. Revisión:
`progress/reviews/statement-category-badge.md`.

## Qué hace ahora la app que antes no

En `Movements`, la etiqueta de una categoría tiene fondo gris claro (`--surface-hover`) en
vez del gris oscuro de antes. Con el ratón encima de la línea, la línea se oscurece y la
etiqueta se sigue viendo como recuadro (antes desaparecía: mismo color que la línea).
`Uncategorized` sigue con borde a rayas y sin fondo, el importe que no cuenta sigue en gris
tachado, y `Review` y `Rules` no cambian.

## Por dónde se toca (puntos de entrada)

| Cómo se usa | Código |
| --- | --- |
| La etiqueta que se pulsa para cambiar la categoría | [StatementRow.vue:103](../../src/features/statement/components/StatementRow.vue#L103) |
| La etiqueta que no se pulsa (movimiento neutro o modo selección) | [StatementRow.vue:113](../../src/features/statement/components/StatementRow.vue#L113) |
| Las clases de la etiqueta | [StatementRow.vue:238](../../src/features/statement/components/StatementRow.vue#L238) |

## Dónde está el código

### Aplicación

| Qué hace | Dónde |
| --- | --- |
| Clase local de la etiqueta con categoría: medidas de la etiqueta pequeña de `BaseBadge`, fondo `bg-surface-hover`, texto `text-ink-body`; ya no se usa `BaseBadge` en esta línea | [StatementRow.vue](../../src/features/statement/components/StatementRow.vue) → `CATEGORY_CLASS` |
| Línea de contraste del uso nuevo (`--ink-body` sobre `--surface-hover`), solo comentario | [theme-dark.css](../../src/assets/theme-dark.css) → bloque de líneas `contrast:` de la cabecera |

### Tests

| Qué comprueba | Dónde |
| --- | --- |
| Toda etiqueta con categoría lleva `bg-surface-hover`, `text-ink-body` y `rounded-pill`, y no `bg-surface-sunken` | [StatementRow.spec.ts](../../src/features/statement/__tests__/StatementRow.spec.ts) → `gives every category the same label look for income and for expense` |
| `Transfer` y `Not counted` no son etiquetas: la única de la línea es la de categoría | [StatementRow.spec.ts](../../src/features/statement/__tests__/StatementRow.spec.ts) → el test con el comentario `Plain words, not labels` |
| En el navegador, sin y con el ratón, el fondo de la etiqueta es `--surface-hover` y el de la línea `--surface-card` / `--surface-sunken` | [statement.spec.ts](../../e2e/statement.spec.ts) → `the category label keeps its own fill, with and without the mouse over its line` |

## Lo que pidió el humano, punto por punto

| Qué tenía que ser verdad | ¿Se cumple? | Dónde se ve |
| --- | --- | --- |
| Fondo de la etiqueta distinto del de la línea, con y sin ratón (Chromium) | ✅ 1,72 sin ratón, 1,88 con ratón (antes 1,09 y 1,00) | Medida del reviewer; prueba de `statement.spec.ts` |
| `Uncategorized` con borde a rayas y sin fondo | ✅ `dashed`, fondo transparente | Medida del reviewer |
| El importe que no cuenta, sin cambios | ✅ `--ink-faint` tachado | Medida del reviewer; `amountClass` sin tocar |
| Ninguna otra pantalla cambia | ✅ `BaseBadge`, `Review` y `Rules` fuera del diff | `git diff --stat` |
| Solo tokens del sistema de diseño | ✅ | `CATEGORY_CLASS` |
| La prueba nueva falla sin el arreglo | ✅ `1 failed` con el `StatementRow.vue` de antes | Revisión |
| `npx playwright test` y `./init.sh` en verde | ✅ `273 passed`; `./init.sh` exit 0 | Revisión |
