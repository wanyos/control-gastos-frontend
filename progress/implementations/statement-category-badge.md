# statement-category-badge — implementación

Cabo 34 (a) de `docs/roadmap.md`, decidido por el humano el 2026-11-04 sobre
`progress/explorations/cabo-34/propuesta.md`: la etiqueta con categoría de `Movements`
lleva fondo `--surface-hover`, con una clase local, solo en `Movements`. El (b) se queda
como está: `amountClass` y sus pruebas no se han tocado. No es una feature de
`feature_list.json`, no hay spec. Sin commits; `docs/roadmap.md` sin tocar.

## Archivos modificados / creados

- `src/features/statement/components/StatementRow.vue`: las dos etiquetas con categoría
  (la que se pulsa y la de un movimiento neutro o en modo selección) dejan de ser
  `BaseBadge` y pasan a un `<span>` con la clase local `CATEGORY_CLASS`: las mismas
  medidas que la etiqueta pequeña de `BaseBadge`, con `bg-surface-hover text-ink-body`.
  Fuera el import de `BaseBadge`. Comentario de cabecera: «category badge is neutral» →
  «category label is grey».
- `src/features/statement/__tests__/StatementRow.spec.ts`: la prueba «gives every
  category the same label look…» ahora pide `bg-surface-hover`, que no lleve
  `bg-surface-sunken`, `text-ink-body` y `rounded-pill`. La que comprobaba que
  `Transfer` y `Not counted` no son `BaseBadge` ahora comprueba que el único
  `span.rounded-pill` de la línea es la etiqueta de categoría. Fuera el import de
  `BaseBadge`.
- `e2e/statement.spec.ts`: prueba nueva «the category label keeps its own fill, with and
  without the mouse over its line» (jsdom no calcula `:hover` ni colores). Una línea
  `Food` contestada con `page.route`; lee los tres colores del tema en la propia página;
  sin ratón, el fondo de la etiqueta es `--surface-hover` y el de la línea
  `--surface-card`; con el ratón encima, la línea es `--surface-sunken` y la etiqueta
  sigue en `--surface-hover`. (Este archivo ya tenía cambios sin commit de otro trabajo;
  solo he añadido la prueba.)
- `src/assets/theme-dark.css`: línea `contrast: --ink-body on --surface-hover >= 4.5
  (statement: category label…)`, como pide `docs/conventions.md` al poner un token sobre
  un fondo nuevo. El par ya estaba medido para otra cosa; esta línea deja escrito el uso
  nuevo.

`Review`, `Rules` y `BaseBadge.vue` no se han tocado.

## Decisiones tomadas

- `<span>` con clase local en vez de pasarle `class="bg-surface-hover"` a `BaseBadge`:
  chocaría con su `bg-surface-sunken` y ganaría uno u otro según el orden del CSS
  generado. Es el mismo camino que ya sigue `Uncategorized` (`UNCATEGORIZED_CLASS`).
- La prueba del ratón va en el navegador (Chromium, Firefox y WebKit) porque jsdom no
  aplica `:hover` ni resuelve variables CSS.

## Comprobaciones

- La prueba nueva falla con la línea de antes: puse temporalmente `StatementRow.vue` del
  `HEAD` y `npx playwright test e2e/statement.spec.ts:346 --project=chromium` dio
  `1 failed` (`Expected: "rgb(56, 67, 79)"`, `Received: "rgb(11, 17, 22)"`). Después
  restauré mi versión.
- La línea `contrast:` nueva se mide de verdad: con el mínimo cambiado temporalmente a 99,
  `npx vitest run src/assets/__tests__/theme-dark.spec.ts` dio `1 failed | 203 passed`
  con su nombre; restaurada a 4.5.
- `npx vitest run src/features/statement`: 16 archivos, 417 pruebas, todas pasan.

## Documentos actualizados

`git grep -n -i "etiqueta.*categor\|surface-sunken\|BaseBadge\|fondo gris" -- docs README.md src`
(sin las pruebas, sin `docs/roadmap.md`): ninguna línea queda falsa.
`docs/guia-de-uso.md:516` dice «Las etiquetas de categoría son todas grises… la de
`Uncategorized` se distingue por el borde a rayas y porque no tiene fondo»: sigue siendo
verdad. `docs/architecture.md` nombra `BaseBadge` como componente compartido, que sigue
existiendo. No he corregido ningún documento.

## Último `npx playwright test` (los tres navegadores)

- 1.ª pasada: salida cortada por mí con `tail`; el final decía `182 passed` tras una
  lista de pruebas de Firefox que no llegué a ver con su encabezado. No sé si eran
  fallos, así que no la cuento.
- 2.ª pasada: exit 1, `17 failed`, `256 passed`. Los 17 fallos, todos en Firefox y en
  pantallas que este cambio no toca (`Review`, `Rules`, `Overview`, `My accounts`,
  arranque…), ninguno en `statement.spec.ts`; en el registro aparece
  «Firefox can't establish a connection to the server at ws://localhost:5173». El
  servidor de desarrollo en `:5173` ya estaba arrancado antes de empezar (lo reutiliza
  Playwright). Causa no comprobada.
- `npx playwright test --project=firefox` justo después: exit 0, `91 passed`.
- 3.ª pasada de los tres navegadores: **exit 0, `273 passed (3.1m)`**.

## Último `./init.sh`

Exit 0. `Test Files 133 passed`, `Tests 2151 passed | 1 expected fail`;
`pnpm format:check` OK; `pnpm type-check` OK; `E2E smoke verde (chromium)`;
«Entorno listo».

## Sugerencias fuera de scope (NO aplicadas)

- `Review` (`MovementRow.vue`, la etiqueta `Uncategorized`) y `Rules` (`RuleRow.vue`)
  usan el mismo fondo de etiqueta que el de sus líneas con el ratón encima; leído en el
  código, no medido en el navegador.
