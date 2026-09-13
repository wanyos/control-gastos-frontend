# Convenciones de código

> **Este documento es TUYO (humano) y está revisado.** Recoge las convenciones
> de código del frontend; revisado y confirmado el 2026-07-08.
>
> Las reglas marcadas **DESCUBIERTO** están verificadas en un archivo de config
> real (`.prettierrc.json`, `.editorconfig`, `tsconfig.*`…): son hechos, no
> opiniones; cámbialas solo si cambias la config. El resto son decisiones ya
> confirmadas por el humano.

## Idioma — confirmado

**Regla general (confirmada el 2026-07-11): los NOMBRES van siempre en inglés;
el CONTENIDO de los documentos en texto plano va en español.**

### Código: todo en inglés

- **Identificadores:** variables, funciones, métodos, clases, tipos/interfaces y
  nombres de fichero.
- **Comentarios.**
- **Vocabulario de dominio:** en inglés, no en español. Las entidades y features
  son `Expense`/`expenses` e `Income`/`incomes`, nunca `Gasto`/`gastos` ni
  `Ingreso`/`ingresos`.
- **Texto de cara al usuario** (labels, mensajes, botones): también en inglés.

### Nombres de archivos y carpetas: en inglés en TODO el repo

No solo en `src/`: también en `docs/`, `progress/`, `specs/` y cualquier
archivo o carpeta nuevos (p. ej. `docs/summary-template.md`,
`progress/summaries/`). Los slugs de feature (`name` en `feature_list.json`)
también en inglés, porque acaban siendo nombres de archivo
(`progress/summaries/<feature>.md`). Excepción histórica: la feature #2
`fundamentos` conserva su nombre.

### Documentos en texto plano: contenido en español

El **contenido** de `docs/`, `progress/`, `specs/` y de los bloques `intent` /
`title` de `feature_list.json` se escribe en español, para lectura rápida del
humano. El nombre del archivo, en inglés (regla anterior).

> Excepción: los nombres ya existentes de repos y rutas del workspace
> (`control-gastos`, `gastos-frontend`, `gastos-backend`) no se renombran; la
> regla aplica a lo que se crea dentro.

### Tildes y codificación: quien lee un fichero, en UTF-8

El contenido en español lleva tildes con normalidad (`según`, `SÍ`, `diseño`);
no se evitan ni se sustituyen por vocales sin acento. Todo el repo es UTF-8. La
condición para que eso sea seguro es **una sola**: cualquier script o herramienta
que lea un fichero del repo debe declarar la codificación UTF-8 de forma
explícita, nunca confiar en la del sistema operativo.

> Por qué existe esta regla: en Windows el encoding por defecto de Python es
> `cp1252`, no UTF-8. Un `open("feature_list.json")` sin `encoding` decodificaba
> mal las tildes en silencio y reventaba con las que su tabla no cubre — la `Í`
> de «SÍ» tumbó `./init.sh` (feature #5). El arreglo nunca es quitar la tilde del
> dato: es que el lector declare UTF-8. En el repo: `open(..., encoding="utf-8")`
> en Python, `readFileSync(..., "utf8")` en Node. El `.editorconfig` fija
> `charset = utf-8` para código, `.md`, `.json` y `.sh`.

## Estilo del lenguaje — DESCUBIERTO

Verificado en `.prettierrc.json`, `.editorconfig`, `tsconfig.*` y
`package.json`:

- **TypeScript** serie 6.0.x, `strict: true`, target efectivo ES2022
  (ver `docs/stack.md`).
- **Formatter:** Prettier `3.9.4`. **Linters:** oxlint + ESLint (flat config,
  `@vue/eslint-config-typescript`, reglas Vue + Vitest + Playwright).
- **Longitud de línea:** 100 columnas (`printWidth: 100`, `max_line_length = 100`).
- **Comillas:** simples (`singleQuote: true`).
- **Punto y coma:** no (`semi: false`).
- **Indentación:** 2 espacios (`indent_style = space`, `indent_size = 2`).
- **Fin de línea:** LF; UTF-8; newline final obligatorio; sin espacios al final
  (`.editorconfig`).

> No añadas estas reglas "a mano" en el código: deja que `pnpm format` y
> `pnpm lint` las apliquen.

## Imports / Usings

- **DESCUBIERTO:** alias raíz `@` → `src/` (`vite.config.ts` + `tsconfig.app.json`).
  Úsalo para imports que cruzan features (`@/shared/...`); relativos (`./`)
  dentro de la misma feature.
- **DESCUBIERTO:** `verbatimModuleSyntax: true` → los tipos se importan con
  `import type { X } from '...'` (obligatorio, no opcional).
- **Orden de imports:** vendor (vue, pinia, vue-router) → alias `@/` →
  relativos `./`, separados por línea en blanco (como en `src/main.ts`). Una
  entidad por import, sin agrupar rutas distintas.

## Nombres

Convenciones estándar de Vue/TS; el scaffold actual ya las sigue.

| Tipo                    | Convención                         | Ejemplo                        |
|-------------------------|------------------------------------|--------------------------------|
| Componentes `.vue`      | PascalCase                         | `ExpenseList.vue`, `App.vue`   |
| Composables             | camelCase con prefijo `use`        | `useExpenses.ts` → `useExpenses()` |
| Stores (Pinia)          | `useXxxStore`, id string kebab/camel | `useCounterStore('counter')` |
| Services / utils (`.ts`)| camelCase                          | `expenseService.ts`            |
| Clases / tipos / interfaces | PascalCase, **sin** prefijo `I`| `Expense`, `ExpenseDTO`        |
| Funciones / variables   | camelCase                          | `fetchExpenses`, `total`       |
| Constantes              | UPPER_SNAKE_CASE (solo verdaderas constantes) | `API_BASE_URL`      |
| Booleanos               | prefijo `is` / `has` / `should`    | `isLoading`, `hasError`        |

## Estructura de archivo

Orden de imports dentro de un `.ts` y un `<script setup>`:

```typescript
// 1. Imports vendor
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

// 2. Imports alias
import { useAuth } from '@/features/auth/composables/useAuth'

// 3. Imports relativos (incl. tipos con `import type`)
import type { Expense } from './types'
```

Orden de bloques en un SFC (**confirmado**): `<template>` →
`<script setup lang="ts">` → `<style scoped>`. El template primero, luego el
código, y el CSS al final. Preferir siempre `<script setup lang="ts">`.

## Tests

- **DESCUBIERTO:** los unit tests viven en `src/**/__tests__/*.spec.ts`
  (así lo esperan `eslint.config.ts` y `tsconfig.vitest.json`). Los E2E en
  `e2e/`. Runner: Vitest (jsdom) + `@vue/test-utils`.
- Un fichero de test co-localizado por módulo. Nombres de test descriptivos y en
  inglés, como el resto del código (el scaffold ya lo hace:
  `it('mounts renders properly')`).
- Estructura `describe` / `it`, patrón AAA (arrange-act-assert). Preferir
  recursos reales ligeros a mocks cuando sea viable; mockear solo la frontera
  HTTP.

## Manejo de errores

> No hay patrón de errores en el código todavía (proyecto recién inicializado);
> este es el patrón acordado:

- Un tipo base `AppError extends Error` con un `code: string`; subtipos como
  `ApiError` (fallo de red / respuesta no-2xx) y `ValidationError`.
- La capa `services/` traduce fallos HTTP a un `ApiError` normalizado; el store
  guarda `error` en estado y la vista lo muestra. Nunca `throw` de strings.
- No tragar errores en silencio ni loguear datos sensibles.

```typescript
// Ejemplo del patrón
class AppError extends Error {
  constructor(message: string, readonly code: string) {
    super(message)
  }
}
class ApiError extends AppError {}
```

## Estructura de carpetas (recordatorio)

> Coherente con `docs/architecture.md` (feature-based). Si hay conflicto, manda
> `architecture.md`.

## Comentarios

- **En inglés** (ver «Idioma»).
- **Cortos y simples.** Un comentario es una línea breve al grano; si necesitas
  un párrafo, suele ser señal de que el código debería simplificarse.
- **Solo lo relevante.** Se comenta lo que aporta —el *por qué* de una decisión
  no obvia—, no lo que el propio código ya dice. Por defecto **no** se comenta
  el *qué*: los nombres lo explican.
- `TODO:` permitido en código solo con contexto y, si aplica, referencia a la
  feature (`// TODO(feat-3): ...`). No dejar TODOs sueltos al cerrar sesión.

## Estilos / UI — confirmado

**Sistema de estilos: Tailwind CSS (v4), utility-first.** Se estiliza con clases
de utilidad directamente en el `<template>` —la forma recomendada por Tailwind y
la de este proyecto—. Los bloques `<style scoped>` pasan a ser la excepción, no
la norma.

### Se maqueta con los tokens del design system — confirmado (feature #4)

El aspecto visual lo manda el design system **control·cuentas**
(`design-system/`, referencia de solo lectura). Sus tokens ya están cargados y
expuestos como utilidades de Tailwind; el mapa completo está en `docs/stack.md`
→ *Design system y tokens*.

- **Usa los alias semánticos, nunca un valor a mano.** `bg-surface-card`,
  `text-ink-muted`, `border-line-subtle`, `text-positive`, `bg-chart-3`.
  **Nada de hex sueltos** (`#0A8F5F`) ni de la paleta de serie de Tailwind
  (`bg-gray-50`, `text-red-500`): si sale un color por defecto de Tailwind en un
  diff, está mal.
- **Los defaults de Tailwind ya están sobreescritos**: `text-base` son 14px y
  `rounded-md` 10px, los del diseño. Úsalos sin pensar.
- **Los números van en `font-mono`** con cifras tabulares
  (`font-mono tabular-nums`): saldos, importes, porcentajes y métricas. Es una
  regla central de la marca. Los títulos, en `font-display`.
- **Tarjetas:** `rounded-lg border border-line-subtle bg-surface-card shadow-sm`.
- Al **portar un componente** de `design-system/` (React) a Vue, traduce sus
  `var(--text-*)` de color con la tabla de equivalencias de `docs/stack.md`
  (en el proyecto son `--ink-*`), y **traduce sus textos al inglés**.

> **La guía de CONTENIDO del design system NO se adopta.** El design system está
> escrito para español es-ES (textos en «tú», moneda `12.480,55 €`). Aquí manda
> la sección «Idioma» de este documento: **el texto de cara al usuario va en
> inglés**. Del design system se adopta **solo la capa visual** (colores,
> tipografía, espaciado, radios, sombras, motion). El formato de cifras y fechas
> no se copia de la referencia por inercia: lo fijó la feature 9 (ver abajo).

> **Formato de cifras y fechas — decidido en la feature 9 (`net-worth-view`,
> 2026-09-12).** UI en inglés con cifras en es-ES, mezcla elegida a propósito.
> Todo pasa por `src/shared/money.ts`; no se crean formateadores sueltos por
> componente.
>
> - **Importes:** `formatMoney("1234.56")` → `1.234,56 €` (EUR, dos decimales;
>   `-5,00 €`, `0,00 €`). Se formatea **desde el string exacto** de la API con
>   `Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', useGrouping: 'always' })`.
>   ⚠️ **Trampa CLDR:** sin `useGrouping: 'always'`, es-ES **no agrupa números de
>   4 cifras** (`1234,56 €`); hay test de regresión.
> - **Sumas y porcentajes:** en céntimos enteros `bigint` (`toCents`,
>   `sumAmounts`, `sharePermille`), redondeando **una sola vez**. Nunca
>   `Number()`, `parseFloat` ni `parseInt` sobre un importe.
> - **Porcentajes:** `formatPercent(383)` → `38,3 %` (un decimal).
> - **Espacios:** antes de `€` y de `%` va un espacio no separable U+00A0. En los
>   tests se genera (`String.fromCharCode(0xa0)`), nunca se teclea.
> - **Fechas:** en-GB con `timeZone: 'UTC'`: `formatDate("2026-09-12")` →
>   `12 Sept 2026`. ICU abrevia septiembre como `Sept` y puede cambiarlo: los
>   textos esperados de los tests salen de `formatDate`.

> **Iconos: Lucide, instalado en la feature 8 (`app-shell`)** como `@lucide/vue`
> (paquete, versión y por qué en `docs/stack.md` → *Iconos (Lucide)*). Se importa
> **un icono por nombre** (`import { Wallet } from '@lucide/vue'`), nunca el set
> entero con `import *`: es lo que mantiene fuera del bundle los que no se usan.
> El color se hereda por `currentColor` desde una utilidad de texto del
> contenedor, no con la prop `color`. Los nombres de icono de la referencia React
> (`data-lucide="line-chart"`) se traducen al componente en PascalCase y pueden
> haber cambiado de nombre en Lucide (`line-chart` es hoy `ChartLine`).

> **Enlaces de UI y `base.css`.** `src/assets/styles/tokens/base.css` pinta todo
> `a` con `--ink-link` y lo subraya en `:hover`, **fuera de las capas de
> Tailwind**, así que gana a cualquier utilidad puesta en el propio `<a>`. En
> enlaces de navegación el color va en un elemento hijo (ver
> `src/shared/components/AppSidebar.vue`), y el subrayado se anula con un
> `<style scoped>`. No se arregla editando `base.css`: es copia literal.

> **No edites `src/assets/styles/` a mano.** Son copias literales de
> `design-system/`; se re-copian cuando el design system se regenera y hay tests
> que vigilan que no se alteren (`src/assets/__tests__/styles.spec.ts`).

Política de `@apply`:

- **Por defecto NO se usa `@apply`.** Las utilidades van en el markup. Si un
  patrón de clases se repite, se extrae un **componente** Vue reutilizable
  (`BaseButton.vue`, `Card.vue`), no un `@apply`.
- **`@apply` es la excepción**, solo cuando no cabe un componente: estilizar HTML
  que no controlas (contenido de terceros, `v-html`) o una capa base global.
  Nunca para "limpiar" una plantilla.
- **Si se usa `@apply` dentro de un `<style>` de un SFC**, hay que añadir
  `@reference "<css-global>"` al inicio del bloque: en Tailwind v4 los `<style>`
  de componentes no ven el theme por defecto. Alternativa preferida: usar las
  variables CSS del theme directamente (más rápido, sin procesado extra).

> Instalar Tailwind es una **dependencia nueva**: hay que registrarla en
> `docs/stack.md` y añadirla en una feature de setup antes de usarla.

Pendientes de definir cuando apliquen: accesibilidad (roles/aria) y responsive
(mobile-first). El modo oscuro ya está decidido: ver abajo.

### La app es solo oscura — confirmado (feature #10, 2026-09-13)

Toda la UI es oscura y **no hay selector claro/oscuro**. El design system viene
en claro, pero el proyecto redefine sus alias semánticos a tonos oscuros en
`src/assets/theme-dark.css` (dónde vive y por qué funciona: `docs/stack.md` →
*Tema oscuro*). Consecuencias al maquetar:

- **Al portar un componente de `design-system/`, usa los alias semánticos**
  (`bg-surface-card`, `text-ink-muted`, `border-line-subtle`,
  `bg-warning-subtle text-warning`…). Ya resuelven al tema oscuro: el componente
  sale oscuro **sin hacer nada especial**. No copies el aspecto claro de la
  referencia ni añadas variantes `dark:`.
- **Prohibidos los fondos claros.** Ni `--neutral-0`…`--neutral-300`, ni los
  peldaños claros de color (`--green-50`, `--red-100`…), ni `bg-white`, ni un
  `var(--neutral-50)` suelto en un `<style>`. Un fondo es siempre `surface-*` o
  un `*-subtle`. Las únicas zonas de color vivo son rellenos de datos pequeños
  (barras, puntos, iniciales de banco: `bg-chart-*`).
- **Texto sobre fondo coloreado:** `text-ink-on-brand` (oscuro en este tema), no
  un blanco a mano.
- **Si pones un token sobre un fondo nuevo** (p. ej. `text-info` dentro de una
  tarjeta hundida), añade su línea `contrast:` en `theme-dark.css`; el test
  `src/assets/__tests__/theme-dark.spec.ts` la mide y falla por debajo de 4.5:1
  (texto) o 3:1 (barras, bordes, iconos).
  **Única excepción de texto a 3:1:** un texto que esté oculto a tecnologías de
  asistencia (`aria-hidden="true"`) **y** que repita un texto visible al lado,
  como la inicial de la ficha de banco (monograma del nombre que va escrito
  junto a ella). Tienen que cumplirse las dos condiciones; cualquier otro texto,
  aunque sea pequeño o secundario, se mide a 4.5:1. La justificación queda
  escrita junto a sus líneas `contrast:` en `theme-dark.css`.
- **Si hace falta un tono que no existe**, se cambia el alias en
  `theme-dark.css` (dentro de la paleta del design system), nunca el componente
  con un color suelto. `src/assets/styles/` sigue sin tocarse.
