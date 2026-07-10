# Stack del proyecto

> Este archivo describe QUÉ tecnologías usa el proyecto. Es el primero que
> debe leer un agente para entender el entorno antes de tocar nada.
>
> Estado: **rellenado desde la configuración real del repo** (package.json,
> tsconfig, vite/vitest/playwright config, prettier, editorconfig). Todo lo de
> aquí es descubrible; si algo cambia en esos archivos, actualiza este doc.

## Lenguaje

- **TypeScript** `~6.0.3` (rango en `package.json` → serie 6.0.x).
- **Modo estricto: sí.** `strict: true` viene de `@vue/tsconfig` (base que
  heredan los tsconfig del proyecto vía `@vue/tsconfig/tsconfig.dom.json`).
  Además:
  - `noUncheckedIndexedAccess: true` (en `tsconfig.app.json`) — accesos a
    array/objeto pueden ser `undefined`.
  - `verbatimModuleSyntax: true` — obliga a `import type` / `export type`
    explícitos para tipos.
  - `moduleResolution: bundler`, `target: ESNext` con `lib: ES2022` (el target
    real de compilación lo fija Vite).

## Framework / Runtime

- **Vue 3** `^3.5.39` — SFC (`.vue`) con Composition API. `jsx: preserve` /
  `jsxImportSource: vue` habilitados por si se usa TSX.
- **Runtime Node** — `engines`: `^22.18.0 || >=24.12.0`. En desarrollo todo
  corre sobre Vite; no hay servidor propio (el backend es un proyecto hermano).

## Librerías clave

- **Estado / store:** Pinia `^3.0.4` — se usan *setup stores* (función que
  devuelve refs/computed/acciones). Se registra en `src/main.ts` como plugin
  base. El store de ejemplo del scaffold (`src/stores/counter.ts`) se retiró en
  el bootstrap; los stores viven por feature en `src/features/<feature>/store.ts`
  (ver `docs/architecture.md`).
- **Routing:** Vue Router `^5.1.0` — `createWebHistory(import.meta.env.BASE_URL)`.
  Ver `src/router/index.ts` (aún con `routes: []`).
- **Validación de schemas:** ninguna instalada (no Zod, no Typebox). Decisión
  (feature #2, 2026-07-10): la configuración de entorno se valida **a mano** en
  `src/shared/config.ts` (una sola variable hoy; ver ADR-004 en
  `docs/architecture.md`). **Revisar cuando se consuman respuestas de la API**
  (caso donde una librería de schemas sí paga su coste).
- **Cliente HTTP:** ninguno instalado (no axios); se usa `fetch` nativo.
  El cliente base vive en `src/services/http.ts` (feature #2): `createHttp()`
  con config inyectada + cliente `http` por defecto ligado a `appConfig`;
  normaliza fallos HTTP/red a `ApiError`.
- **Estilos:** **Tailwind CSS v4** (utility-first) — elegido el 2026-07-08 como
  sistema de estilos del proyecto. **Aún no instalado**; la instalación y
  configuración (plugin oficial `@tailwindcss/vite` + CSS global) se hace en su
  feature de setup (`feature_list.json`). La versión exacta se fija al instalar.
  Política de uso y de `@apply`: `docs/conventions.md` → *Estilos / UI*.
- **Test utils:** `@vue/test-utils` `^2.4.11`.

## Build / Dev tooling

- **Bundler / build tool:** Vite `^8.1.3` (`@vitejs/plugin-vue` 6 +
  `vite-plugin-vue-devtools`).
- **Gestor de paquetes:** **pnpm** (`pnpm-lock.yaml`, `pnpm-workspace.yaml`).
- **Alias de imports:** `@` → `./src` (definido en `vite.config.ts` y en los
  `paths` de `tsconfig.app.json`).
- **Comandos** (definidos en `package.json`):

  | Acción | Comando | Qué hace |
  |--------|---------|----------|
  | Dev | `pnpm dev` | Arranca Vite (por defecto `http://localhost:5173`). |
  | Build | `pnpm build` | `run-p type-check "build-only"` → type-check + `vite build`. |
  | Preview | `pnpm preview` | Sirve el build de producción (`4173`). |
  | Type-check | `pnpm type-check` | `vue-tsc --build` (incluye `.vue`). |
  | Lint | `pnpm lint` | `run-s lint:*` → `oxlint . --fix` y `eslint . --fix --cache`. |
  | Format | `pnpm format` | `prettier --write src/`. |

## Testing

- **Unitarios:** **Vitest** `^4.1.10`, entorno `jsdom`, con `@vue/test-utils`.
  - Comando: `pnpm test:unit`.
  - Ubicación: co-localizados por módulo en `src/**/__tests__/*.spec.ts`
    (así lo esperan `eslint.config.ts` y `tsconfig.vitest.json`).
- **E2E:** **Playwright** `^1.61.1`.
  - Comando: `pnpm test:e2e`.
  - Ubicación: `e2e/`.
  - Navegadores: chromium, firefox, webkit. `baseURL` = `5173` en local
    (dev server) / `4173` en CI (preview). Config: `playwright.config.ts`.

## Base de datos / Persistencia

- **No aplica en el frontend.** No hay ORM ni acceso directo a datos. La
  persistencia vive en el backend hermano (**gastos-backend**: Fastify +
  Prisma + PostgreSQL) y se consume **solo por la API**.
- Fuente de verdad del contrato: `gastos-backend/BACKEND/docs/api-contract.md`
  (ver `docs/related-projects.md`).

## Restricciones / decisiones de versionado

- **Node bloqueado** a `^22.18.0 || >=24.12.0` (campo `engines`). El resto de
  dependencias usan rangos semver estándar (`^` / `~`) fijados en
  `package.json`; el lockfile es `pnpm-lock.yaml`.
- **Librerías prohibidas:** ninguna declarada aún. Si se decide vetar algo
  (p. ej. un UI kit para forzar componentes propios), anótalo en
  `docs/conventions.md` → *Estilos / UI* y aquí.
- **Bootstrap (feature #1, 2026-07-08):** se confirman las versiones ya fijadas
  en `package.json` (TypeScript `~6.0.3`, Vue `^3.5.39`, Vite `^8.1.3`, Pinia
  `^3.0.4`, Vue Router `^5.1.0`, Vitest `^4.1.10`) como línea base; **no se
  añadió ninguna dependencia nueva**. Se creó el esqueleto feature-based en
  `src/` (`features/`, `shared/`, `services/`, con `.gitkeep` para carpetas
  vacías) y se retiró el scaffold de ejemplo (`src/stores/counter.ts`). El
  cliente HTTP (`services/http.ts`) y Tailwind quedan para sus features
  respectivas (#2 y #3).

## Variables de entorno requeridas

- Convención Vite: solo las variables con prefijo **`VITE_`** se exponen al
  cliente vía `import.meta.env`. Playwright lee `CI` para su comportamiento
  en CI.
- La configuración se valida al arrancar en `src/shared/config.ts`
  (`loadConfig` + singleton `appConfig`); un entorno inválido impide el
  arranque con un `ConfigError` claro (feature #2, ADR-004).
- Ficheros committeados (sin secretos): `.env.example` (plantilla),
  `.env.development` (valores locales de `pnpm dev`), `.env.test` (Vitest).
  Overrides personales via `*.local` (git-ignored).

| Nombre | Descripción | Obligatoria | Ejemplo |
|--------|-------------|-------------|---------|
| `VITE_API_URL` | Base URL de la API del backend (debe ser URL parseable). | sí | `http://localhost:3000` |

> El puerto real del backend se confirma contra el proyecto hermano
> (`gastos-backend`) cuando se consuma el primer endpoint.
