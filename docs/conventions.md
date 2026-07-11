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

Pendientes de definir cuando apliquen: dark mode, accesibilidad (roles/aria),
responsive (mobile-first).
