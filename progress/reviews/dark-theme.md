# Review — feature 10 `dark-theme`

**Veredicto:** APPROVED (segunda ronda, 2026-09-13; la primera fue CHANGES_REQUESTED, ver abajo)

Fecha: 2026-09-13 · Revisor: reviewer · Flujo simple (no SDD): contrato = `intent` + 12 `acceptance`.

> Resumen: el trabajo es sólido y la app queda oscura de verdad; verificado en
> build, en Chromium y con mutaciones del test. Se rechaza **solo** por un punto
> de trazabilidad: la reclasificación de la inicial de banco (texto a 3:1 en vez
> de 4.5:1) es legítima, pero no está justificada donde se mide (el propio
> `theme-dark.css`, que es la entrada del test) ni en el test, y
> `docs/conventions.md` no la menciona. Además hay una cifra errónea en el informe.
> Arreglarlo son comentarios y documentación; no hay que tocar valores ni componentes.

## Trazabilidad requirements ↔ tests (solo SDD)

No aplica (`"sdd": false`).

## Tasks completas (solo SDD)

No aplica.

## Criterios de aceptación (siempre)

- [x] 1. Tokens semánticos redefinidos en archivo propio global, sin parchear componentes → `src/assets/theme-dark.css:91-134`, import en `src/assets/main.css:32` detrás de `tokens/base.css`; tests `theme-dark.spec.ts:158` (orden) y `:167` (solo alias existentes, sin literales). `git status`: ningún `.vue` modificado. En el CSS de `pnpm build` todas las utilidades de color usan la variable (`.bg-surface-card{background-color:var(--surface-card)}`, `.border-line-subtle{border-color:var(--border-subtle)}`; `bg-surface-app/85`, `bg-accent/15`, `text-ink-on-dark/70` y el hover `bg-ink-on-dark/5` vía `color-mix(in oklab, var(--token) N%, transparent)`); ningún hex fuera de los `:root` de paleta. En el bundle `--surface-card:var(--neutral-0)` aparece antes que `--surface-card:var(--neutral-900)` y `--ink-link:var(--blue-500)` antes que `var(--chart-3)`: gana el tema. `base.css` (`body`, `h1-h5`, `a`) solo lee alias, así que sigue al tema.
- [x] 2. Ningún fondo claro → test `:190` (11 fondos con luminancia ≤ `neutral-700`). Verificado por mí en Chromium sobre `vite preview` (puerto 8123, build de producción; API respondida con `page.route` porque `:3000` no respondía durante la revisión): escaneo del `backgroundColor` computado de `html`, `body` y todos los nodos en `/net-worth`, `/overview`, `/movements`, `/investments` e `/import`. Lo único más claro que `neutral-700` son rellenos de datos `bg-chart-*` (barras, puntos, fichas de banco); los dos translúcidos son la topbar (oklab L 0.289 al 85 %) y la entrada activa (accent al 15 %), ambos oscuros. `color-scheme: dark`, `body rgb(35,44,54)`. **Vue DevTools no aparece en el build** (su contenedor no existe en el DOM). Capturas `after-*.png` revisadas: sin blancos salvo el botón de DevTools de `pnpm dev`.
- [x] 3. Revisión de los 14 `.vue` listada → tabla «Componentes revisados» del informe; contrastada leyendo los 14 SFC: correcta.
- [x] 4. Sin colores crudos en SFC → test `:238` (14 casos: hex, funciones de color, paleta de serie de Tailwind). Leídos: ninguno.
- [x] 5. Sin tocar `src/assets/styles/` ni `design-system/` → `git diff --stat` vacío en ambos; `styles.spec.ts` verde.
- [ ] 6. Contraste medido automáticamente → **el mecanismo cumple** (pares leídos del archivo del tema, no copiados; resuelve `var()`, `rgba`, `color-mix` srgb, opacidad `/NN` y `over`). Mutaciones hechas por mí y deshechas (verificado con `diff` contra copia):
  - `--surface-card: var(--neutral-100)` → 14 o más fallos (fondos y contrastes).
  - `--ink-muted: var(--neutral-600)` → 2 fallos (sobre `--surface-app` y sobre `--surface-card`).
  - línea `contrast:` mal escrita (`onn`) → 2 fallos (pares malformados y cobertura del puente).
  - `--surface-app` con hex literal → 1 fallo (sin literales).
  Los pares medidos corresponden a usos reales leídos en los SFC: topbar sobre app y sobre tarjeta, loading sobre app, subtítulos y fechas `ink-muted` sobre card, `ink-faint` de No valuation, `text-negative` de importes y frase de descuadre, badges neutral/negative/warning sobre su fondo, puntos y barras `chart-*` sobre `surface-sunken`, fichas `chart-*` sobre card, entrada activa/hover/reposo de la sidebar. Los pares extra (botones de marca, info) son de futuro y no estorban.
  **Pendiente (motivo del rechazo):** la inicial de banco se mide a 3:1 sin justificarlo junto a la medición. Ver «Cambios requeridos» 1 y 2.
- [x] 7. Estados visibles → `after-state-loading.png`, `after-state-error.png`, `after-state-edge-cases.png` (3 avisos Warning legibles, No valuation en `ink-faint` 7.02:1, `-250,00 €` en coral, badge Mismatch y frase), entrada activa en todas. Confirmado en mi render: negativos `rgb(239,108,90)`, activa `rgb(18,184,134)` sobre accent al 15 %.
- [x] 8. Sidebar oscura y distinta → `--surface-inverse: neutral-950` (#0B1116) frente a `--surface-app: neutral-800` (#232C36); computado en Chromium `aside rgb(11,17,22)`; par mínimo 1.25 (da 1.34) en `theme-dark.css:85`. Se distingue bien en las capturas.
- [x] 9. Documentación → `docs/conventions.md:270-293` (solo oscura, alias semánticos al portar, prohibidos fondos claros, cómo añadir un par); `docs/stack.md:187-220` (dónde vive, orden del import, por qué basta). Ver cambio 2 para la excepción.
- [x] 10. Chromium real con capturas antes/después → 10 capturas en `progress/implementation/dark-theme/` referenciadas en el informe; `before-net-worth.png` claro frente a `after-net-worth.png` oscuro con los mismos datos.
- [x] 11. Sin cambios de texto, distribución ni datos; e2e intacto → `before-*` y `after-*` idénticas en contenido y posiciones; `e2e/` sin diff; smoke verde dentro de `./init.sh`.
- [x] 12. Verificaciones verdes (ejecutadas por mí) → `pnpm type-check` sin errores; `pnpm lint` sin errores y sin cambios por `--fix`; `pnpm test:unit` 17 archivos / 249 tests verdes; `pnpm build` correcto (CSS 24.95 kB); `./init.sh` exit 0 con «E2E smoke verde (chromium)».

## El punto discutible: inicial de la ficha de banco a 3:1

**Juicio: la reclasificación es legítima.** La letra está en un `<span aria-hidden="true">` (`src/features/net-worth/components/AccountCard.vue:6-12`) y repite la inicial del nombre del banco, que va escrito como título de la misma tarjeta (`src/features/net-worth/components/BankCard.vue:2`). Funciona como monograma o logotipo, no como información: WCAG 1.4.3 exime el texto puramente decorativo y los logotipos, así que exigirle 3:1 (criterio no-texto de 1.4.11) es más estricto de lo que pide WCAG.

No hay alternativa razonable dentro de la paleta sin tocar componentes: con `neutral-950` da índigo 4.25 y púrpura 4.48; con blanco, 4.47 y 4.23 (recalculado). `--chart-*` son colores de datos, el test prohíbe redefinir peldaños de paleta y el design system no tiene índigo ni púrpura más claros. Renderizado en Chromium con 8 bancos: la «M» sobre índigo y la «T» sobre púrpura se leen bien.

Lo que falta es que la excepción **quede escrita donde se mide** y en la regla futura.

## Arquitectura (docs/architecture.md)

- [x] Estructura respetada: tema en `src/assets/`, test en `src/assets/__tests__/` junto a `styles.spec.ts` y `tailwind-sources.spec.ts`.
- [x] Sin dependencias nuevas (`package.json` y lockfile sin diff).
- [x] El frontend no toca el backend ni el contrato.

## Convenciones (docs/conventions.md)

- [x] Estilo, nombres, imports: comentarios en inglés que explican el porqué (`main.css:30-31`, cabecera del tema); test con entorno node como los otros specs de assets.
- [x] Solo alias semánticos en SFC; sin `@apply`.
- [x] Manejo de errores: el resolvedor del test lanza ante valores no soportados o tokens desconocidos en vez de dar un ratio falso.

## Verificación (docs/verification.md)

- [x] Tests usan recursos reales: leen los CSS reales del repo, sin mocks.
- [x] Tests verifican valores concretos (ratios, luminancias, orden de imports) y fallan de verdad (4 mutaciones comprobadas).

## CHECKPOINTS.md

- [x] C1 — Arnés completo: archivos base y docs existen; `./init.sh` exit 0.
- [x] C2 — Estado coherente: una sola feature `in_progress` (10); `progress/current.md` describe la sesión activa.
- [x] C3 — Arquitectura: estructura respetada, sin dependencias nuevas, sin logs de debug ni TODOs, convenciones respetadas.
- [x] C4 — Verificación real: 91 tests nuevos, suite verde, caminos de fallo comprobados con mutaciones.
- [x] C5 — Sesión (lo que toca al reviewer): sin archivos sin trackear sospechosos (`dist/` ignorado; scripts de captura fuera del repo); estado `in_progress` correcto antes del veredicto. La entrada de `history.md` corresponde al cierre.
- [x] C6 — Proyectos hermanos: no afecta al contrato de la API.
- [ ] C7 — SDD: no aplica.
- [ ] C8 — Resumen de cierre: no se escribe (CHANGES_REQUESTED).

## Resumen de cierre (si APPROVED)

- Escrito en `progress/summaries/dark-theme.md` → no (rechazado).

## Cambios requeridos

1. **`src/assets/theme-dark.css:12-13` y `:70-77`**: la cabecera enumera los umbrales («4.5 text, 3 bars, badges' dots, borders and icons») y las 8 líneas de la inicial solo dicen «(bank tile initial, aria-hidden)». Añade junto a esas líneas un comentario que justifique por qué un texto se mide a 3: letra `aria-hidden` que duplica el nombre del banco escrito en el título de la tarjeta, tratada como monograma decorativo (WCAG 1.4.3 exime texto decorativo y logotipos; se aplica 3:1 como no-texto); con la tinta más oscura de la paleta, índigo da 4.25 y púrpura 4.48, y ninguna tinta llega a 4.5 en los 8 colores. Deja claro que **la excepción solo vale para texto `aria-hidden` y redundante**: cualquier otro texto va a 4.5. En `src/assets/__tests__/theme-dark.spec.ts` (cabecera `:7-8` o junto al `it.each` de `:206`) añade una línea que remita a esa excepción, para que quien lea el test no tome el 3 de esas líneas por un error.
2. **`docs/conventions.md:291-292`**: «falla por debajo de 4.5:1 (texto) o 3:1 (barras, bordes, iconos)». Añade la excepción acotada: una letra decorativa `aria-hidden` que repite un texto visible (como la inicial de banco) se mide como icono; el resto del texto, siempre 4.5:1.
3. **`progress/implementation/dark-theme.md:88-90`**: «sobre las tarjetas oscuras, `--red-500` y `--blue-500` no llegan a 4.5:1 (dan 3.6 y 2.9)» es incorrecto. 3.61 y 2.93 son los ratios sobre la **zona central** (`neutral-800`); sobre la tarjeta (`neutral-900`) dan 4.47 y 3.63 (el propio informe dice 4.46 en `:199`). Corrige la frase y recoge en el informe los cambios 1 y 2.

No hace falta tocar valores del tema, componentes ni capturas.

## Notas no bloqueantes

- Lightning CSS emite para cada `-subtle` un fallback sin `color-mix` (p. ej. `--brand-subtle:var(--green-500)` fuera del `@supports`): en un navegador sin `color-mix` los badges quedarían en verde vivo con texto verde. Tailwind v4 ya exige navegadores con `color-mix` (lo usa para `/85`), así que hoy no es un problema real.
- La pista de `ShareBar` (`surface-sunken` sobre `surface-card`) apenas se ve (~1.1:1), igual que en claro; la información está en el relleno y en el porcentaje escrito.
- Durante la revisión `gastos-backend/` tenía cambios sin commitear que se estaban modificando (`package.json`, `prisma.config.ts` y otros, 08:23-08:27). No son de esta feature (el diff del frontend no sale de su repo); se anota por si hay trabajo en paralelo.

---

# Segunda ronda — 2026-09-13

**Veredicto:** APPROVED

Alcance acordado: verificar solo los tres cambios pedidos y que no ha cambiado nada más. La
primera ronda ya dio por buenos el mecanismo, la ausencia de fondos claros, el contraste,
los estados y el alcance; no se repite.

## Cambios requeridos → estado

1. [x] **Excepción escrita donde se mide.** `src/assets/theme-dark.css:12-14`: la cabecera
   dice que la única excepción de texto se explica junto a las iniciales. `:71-77`: explica
   por qué se mide a 3 (`aria-hidden`, repite la inicial del nombre escrito al lado, monograma;
   WCAG exime texto decorativo; 3 es el mínimo no-texto; índigo 4.25 y púrpura 4.48) y la
   acota: «applies ONLY to text hidden from assistive technology (aria-hidden) AND redundant
   with visible text beside it; any other text stays at 4.5». El test remite a ella en
   `src/assets/__tests__/theme-dark.spec.ts:131`, junto a la regex `PAIR`.
2. [x] **Regla futura.** `docs/conventions.md:293-298`: «Única excepción de texto a 3:1»,
   con las dos condiciones (oculto a tecnologías de asistencia **y** repite un texto visible
   al lado), «tienen que cumplirse las dos», el resto del texto a 4.5:1, y remite a la
   justificación en `theme-dark.css`.
3. [x] **Cifra corregida.** `progress/implementation/dark-theme.md:89-90`: sobre tarjetas
   (`neutral-900`) 4.47 y 3.63; sobre la zona central 3.6 y 2.9. Sección «Cambios tras la
   revisión» en `:340-355`.

## Nada más ha cambiado

- [x] **Valores de color idénticos.** Los 31 alias de `:root` (`theme-dark.css:99-143`)
  coinciden uno a uno con la tabla «Tokens redefinidos» del informe (`dark-theme.md:51-83`)
  que se revisó en la primera ronda: mismos peldaños de paleta y mismos porcentajes de mezcla
  (brand-subtle 16 %, brand-subtle-2 22 %, positive 16 %, negative red 20 %, warning 16 %,
  info blue 16 %). El bloque `:root` solo se ha desplazado 8 líneas (de `:91` a `:99`) por
  el comentario añadido.
- [x] **Pares iguales.** 61 líneas `contrast:`, con los mismos mínimos (las 8 de la inicial
  siguen a `>= 3`). La ejecución verbose del test lista 61 casos «contrast: --…»;
  `theme-dark.spec.ts` da 91 tests, como en la primera ronda.
- [x] **Ningún `.vue` modificado.** `git status --short`: solo `docs/conventions.md`,
  `docs/stack.md`, `feature_list.json`, `progress/current.md`, `src/assets/main.css`
  modificados y, sin trackear, el tema, su test, el informe, las capturas y esta review.

## Verificaciones (ejecutadas por mí)

- `pnpm lint` → exit 0 (oxlint + eslint, sin errores).
- `pnpm test:unit` → 17 archivos / 249 tests verdes.
- `./init.sh` → exit 0; «Todos los tests pasan», «E2E smoke verde (chromium)», «Entorno listo».

## CHECKPOINTS.md (actualizado)

- [x] C1 a C6 — sin cambios respecto a la primera ronda.
- [ ] C7 — SDD: no aplica.
- [x] C8 — Resumen de cierre escrito en `progress/summaries/dark-theme.md`.

## Resumen de cierre

- Escrito en `progress/summaries/dark-theme.md` → sí.

## Notas no bloqueantes

- Por el comentario añadido, algunas referencias de línea del informe han quedado
  desplazadas: en `theme-dark.css` las líneas `contrast:` van ahora de `:18` a `:96` (el
  informe dice `:17-88`) y `:root` empieza en `:99` / `color-scheme` en `:101` (dice `:91` /
  `:93`); en el test, contraste `:207`, cobertura del puente `:211`, sin colores crudos `:239`
  (dice `:206`, `:210`, `:238`). No afecta a nada; el resumen de cierre usa las líneas buenas.
