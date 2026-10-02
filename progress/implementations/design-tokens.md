# Informe de implementación — #4 `design-tokens`

- **Feature:** #4 `design-tokens` — Integrar los tokens del design system con Tailwind
- **Tipo:** sin `sdd` → se trabaja del `intent` + `acceptance` de `feature_list.json`
- **Fecha:** 2026-07-14
- **Agente:** implementer
- **Estado final en `feature_list.json`:** `done` (reviewer **APPROVED** el 2026-07-20;
  cerrada tras restaurar `vueDevTools()` en `vite.config.ts` — ver punto 1 de
  *Pendiente / sugerencias fuera de scope*, resuelto por decisión del humano)

---

## Resumen

Los tokens del design system **control·cuentas** están cargados y disponibles como
utilidades de Tailwind. La app arranca con el fondo, la tipografía y la escala del
diseño. La carpeta de referencia se movió íntegra a `design-system/` y quedó fuera
del type-check, del lint, de Prettier y del escaneo de Tailwind.

Se implementó el enfoque **híbrido** decidido por el humano: copia literal de los
CSS de tokens + capa `@theme inline` encima. No se añadió ninguna dependencia.

---

## Archivos creados

| Archivo | Qué es |
|---|---|
| `src/assets/styles/fonts.css` | copia **idéntica** de `design-system/fonts.css` |
| `src/assets/styles/tokens/typography.css` | copia **idéntica** |
| `src/assets/styles/tokens/spacing.css` | copia **idéntica** |
| `src/assets/styles/tokens/colors.css` | copia + renombrado `--text-*` → `--ink-*` (7 alias) |
| `src/assets/styles/tokens/base.css` | copia + usos de esos 7 alias |
| `src/assets/__tests__/styles.spec.ts` | 10 tests que vigilan las invariantes de la feature |
| `.prettierignore` | no existía; excluye las copias y la referencia |

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/assets/main.css` | imports de tokens + capa `@theme inline` + `@source not` |
| `src/App.vue` | `bg-gray-50 text-gray-900` → `bg-surface-app text-ink-body` |
| `src/__tests__/App.spec.ts` | el test afirmaba `bg-gray-50`; ahora afirma los tokens |
| `eslint.config.ts` | `globalIgnores` + `design-system/**` |
| `.oxlintrc.json` | `ignorePatterns: ['design-system/**']` |
| `docs/stack.md` | sección *Design system y tokens* + tabla de equivalencias |
| `docs/conventions.md` | *Estilos / UI*: se maqueta con tokens; guía de contenido NO adoptada |
| `feature_list.json` | `pending` → `in_progress` |
| `progress/current.md` | plan y bitácora |

## Movimiento

`src/design-system-source/` → `design-system/` (83 archivos, íntegra). Estaba
**untracked**, así que se usó `mv` (no `git mv`), como indicaba el encargo.

---

## Hallazgos: dos supuestos del plan que resultaron falsos

Ambos se detectaron **verificando el CSS generado**, no leyendo la doc. Son la
parte no obvia de la feature y los dos habrían fallado en silencio.

### 1. `--shadow-*` NO "encaja solo" (el plan decía que sí)

El plan daba por hecho que `--radius-*` y `--shadow-*` caen en namespaces nativos
y encajan sin mapeo. **Cierto para radius, falso para shadow.** Compilado real:

```css
/* rounded-md → lee el token: el override por :root funciona ✅ */
.rounded-md{border-radius:var(--radius-md)}
/* shadow-sm → Tailwind incrusta SU valor e ignora el :root del diseño ❌ */
.shadow-sm{--tw-shadow:0 1px 3px 0 var(--tw-shadow-color,#0000001a),…}
```

Sin mapeo explícito, cada `shadow-sm` de cada tarjeta habría pintado la sombra de
Tailwind en vez de la del diseño — exactamente lo que la feature existe para
evitar. **Solución:** mapear los 7 pasos (`xs`…`xl` + `brand` + `inset`) en
`@theme inline`. Verificado: ahora `.shadow-sm{--tw-shadow:var(--shadow-sm)}` y el
computed style en Chromium da la sombra del diseño.

Lo mismo aplicaba, en menor grado, a los tokens que Tailwind no tiene en su theme
por defecto y que por tanto **no generaban utilidad ninguna**: `--font-display`,
`--text-2xs`, `--text-md`, `--radius-pill`, `--shadow-brand`, `--shadow-inset`.
También están mapeados.

### 2. Las webfonts NO se cargaban

`fonts.css` solo contiene un `@import` remoto a Google Fonts. Importado en el
orden natural (después de `@import 'tailwindcss'`), **el `@import` remoto
desaparece del build**: 0 coincidencias de `googleapis` en el CSS compilado, 0
`@font-face`. La app habría caído a `system-ui` en silencio, incumpliendo el
acceptance, y con `--font-sans` pareciendo correcto en el CSS.

**Causa:** un `@import` remoto solo sobrevive si no le precede nada (regla CSS:
`@import` debe ir antes de cualquier regla). **Solución:** `fonts.css` va **el
primero de todo**, antes que Tailwind. Verificado: en el build el `@import` queda
en el índice 0, y en Chromium `document.fonts` lista las tres familias.

### 3. (Extra) La referencia contaminaba el CSS de la app

Tailwind autodetecta fuentes desde la raíz y estaba escaneando `design-system/`,
emitiendo **3.114 bytes (~21%)** de utilidades muertas (`.flex`, `.grid`,
`.container`, `.shadow`…) sacadas de sus JSX/HTML de ejemplo. Añadido
`@source not '../../design-system'`. CSS final: 14.895 → 11.781 bytes.

---

## Decisiones que he tomado yo (marcadas como mías)

1. **Nombres de utilidad de los bordes: `line-*`, no `border-*`.** El encargo
   sugería que se leyera `border-subtle`. Eso exige un color llamado literalmente
   `subtle`/`default`/`strong`, y ahí está la trampa: `--color-strong` genera
   también **`text-strong`**, que sería el color de *borde* fuerte y colisiona
   semánticamente con `text-ink-strong` (el color de *texto* fuerte). Un
   generador de bugs silenciosos. Mapear 1:1 daría `border-border-subtle`
   (tartamudea). Elegido `--color-line-*` → **`border-line-subtle`**: sin
   colisiones, coherente con "un prefijo por grupo" (`surface-`, `ink-`, `line-`)
   y legible. **Es la única desviación respecto a los ejemplos del encargo.**
2. **Estructura de la copia: `src/assets/styles/tokens/*.css`**, espejo exacto de
   la fuente, en vez de plano. Motivo: re-copiar es un `cp -r` y la comprobación
   es un `diff -r` directo, que es justo el punto del enfoque híbrido.
3. **`--brand-on` no se expone como utilidad.** Es el mismo valor que
   `--ink-on-brand` (ambos `--neutral-0`); exponer los dos daría dos utilidades
   para lo mismo. Se expone `text-ink-on-brand`. La var cruda sigue disponible.
4. **`ring-brand` no necesita mapeo**: sale gratis de `--color-brand`. El foco del
   diseño se reproduce con `focus-visible:ring-3 focus-visible:ring-brand/30`.
5. **`.prettierignore` nuevo.** `pnpm format` (`prettier --write src/`) reformateaba
   las copias (alineación multi-espacio), rompiendo la identidad byte a byte con la
   fuente y convirtiendo cada re-copia en un diff eterno. Sin esto, la propiedad
   "re-copiable" duraba hasta el siguiente `pnpm format`.
6. **`src/App.vue` entra en scope.** Tenía `bg-gray-50 text-gray-900`, que tapaba
   el `--surface-app` del `body`. El acceptance pide que la app se vea con el fondo
   del diseño, así que se cambió a los tokens. Además Tailwind v4 solo genera las
   utilidades que **se usan**, así que esto es también lo que hace verificable que
   `bg-surface-app` se emite.
7. **Exclusiones de lint: comprobadas, no supuestas.** Mover la carpeta fuera de
   `src/` arregló el type-check por sí solo (`tsconfig.app.json` incluye `src/**/*`),
   pero **no** el lint: ESLint y oxlint glob-ean desde la raíz. Medido: ESLint
   linteaba 15 `.d.ts` + `data.js`, y **oxlint salía con código 1** (`pnpm lint`
   estaba **rojo** antes de esta feature, por los `.jsx` de la referencia). Se
   añadieron solo esas dos exclusiones, ambas necesarias. **No** se añadió ninguna
   exclusión a `tsconfig.app.json`, porque no hace falta.

---

## Tests

`src/assets/__tests__/styles.spec.ts` (10 tests). No son humo: cada uno fija una
invariante que este informe demuestra que se puede romper en silencio.

| Test | Qué protege |
|---|---|
| `loads the webfonts before Tailwind…` | el hallazgo 2: reordenar mata las fuentes |
| `imports the tokens after Tailwind…` | el orden que hace `text-base` = 14px |
| `maps every theme entry to a token var…` | que nadie incruste un hex en `@theme` (mataría la re-copia) |
| `copies the color tokens verbatim, renaming only the 7…` | valores intactos **y** rename aplicado (compara pares `--x: valor` contra la fuente) |
| `keeps %s byte-identical…` (×3) | `typography.css`, `spacing.css`, `fonts.css` idénticos a la fuente |
| `keeps the type scale on the --text-* namespace…` | `--text-base` sigue siendo tamaño |
| `points base.css at the renamed color aliases…` | colores renombrados, tamaños intactos |
| `leaves the design system reference untouched…` | `design-system/` sigue con `--text-strong` (re-copiable) |

`src/__tests__/App.spec.ts`: el test de la feature #3 afirmaba `bg-gray-50`;
reescrito para afirmar los tokens y **que no vuelva** la paleta de serie.

**Sobre el criterio `require_tests_to_close`:** los tests unitarios no pueden
demostrar lo esencial de una feature de CSS (que el navegador pinte los valores
correctos): jsdom no computa Tailwind ni resuelve la cascada de custom properties.
Por eso los tests cubren lo que **sí** es verificable y frágil —el cableado y las
invariantes de la copia— y **la prueba de que funciona es la verificación en
navegador de abajo**, no los tests. Ninguno de los 10 se escribió para rellenar el
criterio.

---

## Verificación

### Gate completo — todo en verde

```
./init.sh        → [OK] Entorno listo.  Test Files 5 passed (5) · Tests 37 passed (37)
                   Type check OK (tsc sin errores)
pnpm type-check  → exit 0  (vue-tsc --build --force)
pnpm lint        → oxlint exit 0 · eslint exit 0   (antes de la feature: oxlint exit 1)
pnpm build       → exit 0 · dist/assets/index.css 9.79 kB │ gzip: 3.23 kB
prettier --check src/ → All matched files use Prettier code style!
```

Tests: 27 (antes) → **37**. Ninguno de los 27 previos se rompió salvo el de
`bg-gray-50`, reescrito a propósito.

### Verificación real en navegador (lo que de verdad prueba la feature)

`pnpm dev` + Chromium vía Playwright, leyendo **estilos computados** (no el texto
del CSS). Resultado:

| Comprobación | Valor computado | Token esperado | |
|---|---|---|---|
| `body` background | `rgb(247,249,251)` | `--surface-app` `#F7F9FB` | ✅ |
| `body` font-family | `"Hanken Grotesk", system-ui…` | `--font-sans` | ✅ |
| `body` color | `rgb(56,67,79)` | `--ink-body` `#38434F` | ✅ |
| `body` font-size | `14px` | `--text-base` (no los 16px de Tailwind) | ✅ |
| shell (`App.vue`) | `rgb(247,249,251)` | `bg-surface-app` | ✅ |
| `shadow-sm` | `rgba(11,17,22,.07) 0 1px 3px, rgba(11,17,22,.04) 0 1px 2px` | `--shadow-sm` del diseño, **no** el de Tailwind | ✅ |
| `bg-brand` | `rgb(10,143,95)` | `--brand` `#0A8F5F` | ✅ |
| `rounded-pill` | `999px` | `--radius-pill` | ✅ |
| `font-display` | `"Schibsted Grotesk"…` | `--font-display` | ✅ |
| webfonts | `document.fonts` → `Hanken Grotesk`, `JetBrains Mono`, `Schibsted Grotesk` | las 3 cargadas del CDN | ✅ |

También verificado en el CSS servido por `pnpm dev`: las utilidades del theme se
generan (`.bg-surface-app{background-color:var(--surface-app)}`) y el `@import` de
fuentes llega en el índice 0.

### Acceptance

| Criterio | |
|---|---|
| Tokens en `src/assets/styles/` sin alterar valores, cargados desde `main.css` | ✅ |
| 7 alias `--text-*` → `--ink-*` en la copia, valores conservados; tamaños intactos | ✅ |
| `main.css` expone los tokens vía `@theme inline` | ✅ |
| `docs/stack.md` con tabla de equivalencias de los 7 renombrados | ✅ |
| Fuentes cargadas; `body` con `--font-sans` y `--surface-app` | ✅ (computed en Chromium) |
| Referencia en `design-system/`, íntegra, fuera de `tsconfig.app.json` y ESLint | ✅ (+ oxlint y Prettier) |
| `docs/stack.md`: de dónde salen, dónde viven, cómo se consumen | ✅ |
| `docs/conventions.md`: se usan los tokens; guía de contenido NO adoptada | ✅ |
| `pnpm build`, `pnpm type-check`, `./init.sh` en verde | ✅ |
| Política de `@apply` respetada | ✅ (no se usa `@apply` en ningún sitio) |

---

## Pendiente / sugerencias fuera de scope (NO aplicadas)

1. **`vite.config.ts` tiene un cambio sin commitear que no es mío**: alguien quitó
   `vueDevTools()` de los plugins (sigue en `package.json`). No lo he tocado.
   Conviene decidir si se commitea o se revierte.
2. **Iconos (Lucide).** Fuera de scope por decisión del humano. El design system
   los asume; hará falta su propia feature (dependencia nueva).
3. **Webfonts por CDN.** Deuda heredada del design system: no hay build offline.
   Si se quiere, bajar los woff2 a `assets/fonts/` y sustituir el `@import`.
4. **Formato de moneda/fechas.** El design system trae `12.480,55 €` (es-ES) y no
   se adopta su guía de contenido. Falta decidir el formato en inglés. Anotado
   como pendiente en `docs/conventions.md`.
5. **`index.html`** sigue con `<title>Vite App</title>` y `<html lang="">`. Tocarlo
   no estaba en el acceptance.
6. **`--num-features`, z-index, motion y layout vars** (`--sidebar-w`, `--topbar-h`,
   `--container-max`) están copiados y disponibles como `var(…)`, pero no se
   exponen como utilidades: no encajan en un namespace de Tailwind y aún no hay
   layout que los use. Se revisará al maquetar el dashboard.
