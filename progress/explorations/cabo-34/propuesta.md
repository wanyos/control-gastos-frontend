# Cabo 34 (a) y (b) — medida de hoy y propuesta

Fecha: 2026-11-04. Pantalla `Movements`. Solo propuesta: **no hay ningún archivo de
`src/` cambiado**. El «después» de las capturas se ha hecho añadiendo una hoja de
estilos a la página abierta en el navegador de prueba y quitándola después; el código
no se ha tocado (comprobado comparando `git diff src` y los archivos sin seguimiento de
`src/` antes y después: idénticos).

## Cómo se ha medido

- Chromium de Playwright, ventana 1280 × 900, a escala 2, contra el servidor de
  desarrollo en `http://localhost:5173/movements`.
- Todas las llamadas a `/api` contestadas con `page.route` y datos inventados (cinco
  movimientos de noviembre de 2026: un gasto con categoría `Groceries`, un ingreso
  `Not counted` con categoría `Refunds`, una nómina que cuenta, una mitad de traspaso y
  un gasto sin categoría). Cualquier otra llamada se cortaba: no hubo ninguna, ni
  errores en la página.
- Colores leídos con `getComputedStyle` en la línea, la etiqueta de categoría y los
  importes; el fondo efectivo es el del primer antepasado con fondo no transparente.
  Contraste con la fórmula de WCAG (la misma que usa `theme-dark.spec.ts`).
- El script está fuera del repositorio (carpeta temporal de la sesión); no se ha añadido
  a `e2e/`.

## Lo que hay hoy (medido)

| Qué | Sin el ratón | Con el ratón encima de la línea |
|---|---|---|
| Fondo de la línea | `#141B22` (`--surface-card`) | `#0B1116` (`--surface-sunken`) |
| Fondo de la etiqueta de categoría | `#0B1116` (`--surface-sunken`) | `#0B1116` (`--surface-sunken`) |
| Fondo de la etiqueta frente al de la línea | **1,09** | **1,00** (el recuadro desaparece) |
| Texto de la etiqueta sobre su fondo | 15,40 | 15,40 |
| Importe que no cuenta | `#9BA6B2` (`--ink-faint`), tachado | igual |
| Importe de un ingreso que cuenta | `#12B886` (`--positive`) | igual |
| Importe que no cuenta frente al de un ingreso | **1,03** | 1,03 |

Capturas: `before-idle.png` (sin ratón) y `before-hover.png` (ratón encima de la línea
de `MERCADONA AV PUERTO`).

## (a) La etiqueta de categoría — propuesta: fondo `--surface-hover`

**Qué cambia:** la etiqueta de una categoría en `Movements` pasa de fondo
`--surface-sunken` (`bg-surface-sunken`) a fondo `--surface-hover` (`bg-surface-hover`,
`#38434F`). Sigue siendo un fondo gris liso, sin borde y sin color, como aprobó la
decisión 3 de la F29; `Uncategorized` sigue con el borde a rayas y sin fondo.

| Medido en Chromium | Hoy | Propuesta |
|---|---|---|
| Fondo de la etiqueta frente a la línea, sin ratón | 1,09 | **1,72** |
| Fondo de la etiqueta frente a la línea, con ratón | 1,00 | **1,88** |
| Texto de la etiqueta sobre su fondo (`--ink-body`) | 15,40 | 8,17 (mínimo 4,5) |

Capturas: `after-fill-idle.png` y `after-fill-hover.png`.

Ese 1,72 / 1,88 no llega a 3: el recuadro se ve claramente en las capturas, pero un
fondo de etiqueta no tiene mínimo propio en `theme-dark.css`; lo que se mide es el
texto, y ya tiene su línea (`--ink-body on --surface-hover >= 4.5`). No hace falta
añadir ninguna línea `contrast:`.

**Otra opción que he probado (no la recomiendo):** dejar el fondo como está y darle a
la etiqueta un borde liso en `--border-subtle` (`border-line-subtle`, `#6B7785`).
Medido: borde frente a la línea 3,80 sin ratón y 4,16 con ratón (por encima de 3). Pero
entonces la etiqueta con categoría y `Uncategorized` pasan a ser las dos un recuadro
con borde, y solo las separa que uno es liso y el otro a rayas: se parecen más que hoy.
Necesitaría además una línea nueva en `theme-dark.css`
(`--border-subtle on --surface-sunken >= 3`). Capturas: `after-edge-idle.png` y
`after-edge-hover.png`.

## (b) El importe que no cuenta — propuesta: `--ink-muted`

**Qué cambia:** el importe tachado de un movimiento que no cuenta pasa de `--ink-faint`
(`#9BA6B2`) a `--ink-muted` (`#CDD5DD`), sigue tachado. Es el mismo gris que ya lleva el
concepto de esa misma línea.

| | Hoy | Propuesta |
|---|---|---|
| Frente al verde de un ingreso (medido en Chromium) | 1,03 | **1,72** |
| Sobre el fondo de la línea sin ratón (medido) | 7,02 | 11,70 |
| Sobre el fondo de la línea con ratón (calculado con los valores de los tokens) | 7,68 | 12,80 |
| Frente al blanco de un gasto que cuenta, `--ink-strong` (calculado) | 2,34 | **1,41** |

Las capturas de (a) llevan ya este cambio: en las cuatro `after-*.png` está el
`312,80 €` tachado junto a la nómina `1.847,26 €` en verde.

**Lo que cuesta, y por qué no hay algo mejor con los tokens de hoy:**

- El importe que no cuenta se separa del verde, pero **se acerca al blanco** de un
  gasto que cuenta (de 2,34 a 1,41). Sigue distinto por el color y el tachado.
- `--ink-muted` es también el color del importe de un vencimiento de depósito y de un
  movimiento neutro (`StatementRow.vue`, `amountClass`), que no van tachados. Pasarían a
  distinguirse de lo que no cuenta solo por el tachado; hoy además por el tono (1,67).
- Ningún gris más oscuro que `--ink-faint` llega a 4,5 sobre la tarjeta: `--neutral-500`
  (el de `--border-subtle`) da 3,80. Más claro, `--ink-body` se separaría más del verde
  (2,07) pero casi igual que el blanco de un gasto (1,18). **No hay token que se separe
  bien de los dos a la vez.** Si se quisiera, habría que añadir un peldaño de gris entre
  `--neutral-400` y `--neutral-500` (luminosidad en torno a 0,24, que da 4,5 sobre la
  tarjeta y ~1,4 frente al verde y ~3,4 frente al blanco); no existe en la paleta del
  sistema de diseño, y `theme-dark.css` solo apunta a peldaños de esa paleta. No lo
  propongo; lo dejo dicho por si lo prefieres a la propuesta.

Sin línea `contrast:` nueva: `--ink-muted on --surface-card` y
`--ink-muted on --surface-sunken` ya están medidas en `theme-dark.css`.

## Qué otras pantallas cambiarían

**Con la propuesta tal cual, solo `Movements`.** Los dos cambios se harían en
`src/features/statement/components/StatementRow.vue`, sin tocar nada compartido:

- (a) La etiqueta de categoría se pinta hoy con `BaseBadge` (`tone="neutral"`), que es
  compartido. Cambiar su tono neutro (`src/shared/components/BaseBadge.vue`) cambiaría
  también las etiquetas grises de `Rules` (`RuleRow.vue`, `SuggestedRuleRow.vue`),
  `Expenses by category` (`CategoryLine.vue`), la ventana de importación
  (`AmbiguousTransferList.vue`, `ImportDetails.vue`/`ReportSection.vue`), `Net Worth`
  (`BreakdownList.vue`), `Overview` (`UsualLine.vue`, que usa el tono por defecto) y
  `Review` (`MovementRow.vue`, la etiqueta `Uncategorized`). Lo que aprobaste en la F29
  («`Review` no cambia», `specs/29-statement-readable/decisions.md`) lleva a hacerlo solo en `Movements`: una clase local en
  `StatementRow.vue` con las mismas medidas que la etiqueta pequeña, como ya se hizo con
  `Uncategorized`. Pasarle la clase de fondo a `BaseBadge` desde fuera no vale: chocaría
  con su `bg-surface-sunken` y ganaría uno u otro según el orden del CSS generado.
- (b) `text-ink-faint line-through` está en `StatementRow.vue` (`amountClass`) y, por
  separado, en `src/features/review/components/MovementRow.vue`. Cambiando solo el
  primero, `Review` se queda como hoy.

**Lo que `Review` y `Rules` tienen igual (leído en el código, no medido en el
navegador):** sus líneas también toman `--surface-sunken` con el ratón encima
(`MovementRow.vue`, `RuleRow.vue`) y pintan etiquetas con el tono neutro de `BaseBadge`,
así que con toda probabilidad allí la etiqueta gris también desaparece con el ratón; y
`Review` tacha en `--ink-faint` lo que no cuenta junto a ingresos en `--positive`. No
lo he comprobado en esas pantallas; con esta propuesta no cambian.

## Qué habría que tocar al aplicarlo (paso 2, cuando decidas)

- `StatementRow.vue`: la clase local de la etiqueta con categoría y
  `amountClass` → `text-ink-muted line-through`.
- Pruebas que hoy piden lo de antes y habría que actualizar:
  `src/features/statement/__tests__/StatementRow.spec.ts` (nombra `text-ink-faint` en
  siete líneas y `bg-surface-sunken` en la etiqueta) y `e2e/statement.spec.ts` (espera
  el color de `--ink-faint` en el importe tachado). Y añadir la prueba de que, con el
  ratón encima, el fondo de la etiqueta es distinto del de la línea.
- `specs/29-statement-readable/` es histórico y no se toca; esta propuesta cambia lo
  que allí se eligió en R1 (`--ink-faint`) y en R6 (`BaseBadge` en tono neutro).
