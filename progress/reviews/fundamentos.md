# Review — feature 2 `fundamentos`

**Veredicto:** APPROVED

- **Fecha:** 2026-07-10
- **Agente:** reviewer
- **Insumos:** `specs/02-fundamentos/{requirements,design,tasks}.md`, `progress/implementation/fundamentos.md`, docs del harness, código y tests leídos en su totalidad, `./init.sh` + `pnpm type-check` + `pnpm lint` ejecutados por el reviewer.

## Trazabilidad requirements ↔ tests (solo SDD)

Verificada leyendo los specs de tests (no solo el informe del implementer):

- R1: [x] cubierto por `src/shared/__tests__/config.spec.ts:7` — `builds a typed immutable AppConfig from a valid environment (R1)` (valor de `apiUrl` + `Object.isFrozen`).
- R2: [x] cubierto por `config.spec.ts:14` (variable ausente) y `config.spec.ts:19` (variable vacía) — ambos exigen `ConfigError` y `/VITE_API_URL/` en el mensaje.
- R3: [x] cubierto por `config.spec.ts:26` — URL no parseable → `ConfigError` con nombre y motivo (`VITE_API_URL is not a parseable URL`).
- R4: [x] cubierto por `config.spec.ts:40` (import del módulo con env inválido rechaza con el mensaje claro, vía `vi.stubEnv` + `vi.resetModules`) y `config.spec.ts:47` (env válido expone `appConfig`). `src/main.ts:4` + `src/main.ts:11` evalúan `appConfig` antes de `app.mount` (`src/main.ts:20`).
- R5: [x] cubierto por `src/shared/__tests__/errors.spec.ts:17-52` — 4 tests de jerarquía (`instanceof`, `code`, `message` para `AppError`, `ConfigError`, `ApiError` con `status`, `ValidationError`).
- R6: [x] cubierto por `errors.spec.ts:54-90` — `toAppError` con los 4 tipos de entrada (`AppError` → misma instancia; `Error`/`string`/desconocido → `AppError` código `UNKNOWN` preservando `message` y `cause`).
- R7: [x] cubierto por `errors.spec.ts:97-128` — formato exacto `[<code>] <message>` (`formatError`), y `handleGlobalError` reporta UNA sola vez por el sink (spy sobre `console.error`) con `Error`, no-Error y `AppError` (conserva su `code`). Registro en Vue: `src/main.ts:15`.
- R8: [x] cubierto por `src/services/__tests__/http.spec.ts:20` (2xx JSON → body parseado tipado) y `http.spec.ts:30` (204 sin cuerpo → `undefined`).
- R9: [x] cubierto por `http.spec.ts:39` (404 → `ApiError` con `code: API_HTTP`, `status: 404` y mensaje del body) y `http.spec.ts:55` (500 → `status: 500`).
- R10: [x] cubierto por `http.spec.ts:67` — `fetch` rechaza → `ApiError` con `code: API_NETWORK` y `cause` === error original.
- R11: [x] cubierto por `http.spec.ts:81` — dos bases inyectadas vía `createHttp`, URLs exactas verificadas en el spy de `fetch`. Comprobación adicional del reviewer: grep de URLs en `src/` → los únicos literales están en los tests como fixtures inyectados; el código de aplicación (`src/services/http.ts:39`) construye la URL solo desde `config.apiUrl`.
- R12: [x] cubierto estructuralmente: los 3 specs importan por las rutas canónicas (`config.spec.ts:3-4`, `errors.spec.ts:3-15`, `http.spec.ts:3-4` → `@/shared/config`, `@/shared/errors`, `@/services/http`); la suite compila y pasa. Árbol verificado contra `docs/architecture.md:50-70`: `src/shared/{config,errors}.ts`, `src/services/http.ts`, `src/features/.gitkeep` conservado.
- R13: [x] requisito documental (excepción aceptada en el propio spec): ADR-003 en `docs/architecture.md:122-142`, ADR-004 en `docs/architecture.md:144-161`, árbol actualizado (`docs/architecture.md:44-74`); tabla de variables con `VITE_API_URL` en `docs/stack.md:122-124` y decisión de validación manual en `docs/stack.md:38-43`; aviso retirado y gate actualizado en `docs/verification.md:26-28` y `docs/verification.md:84-98`. Verificado por lectura directa.
- R14: [x] verificado por ejecución propia del reviewer: `./init.sh` → sección 5 ejecuta `pnpm test` (`vitest run`), `Test Files 4 passed (4)`, `Tests 25 passed (25)`, `[OK] Todos los tests pasan`, exit code 0, sin el WARN "No hay comando de tests configurado".

## Tasks completas (solo SDD)

Todas marcadas `[x]` en `specs/02-fundamentos/tasks.md`:

- T1: [x] (`.env.example`, `.env.development`, `.env.test`, `env.d.ts:3-5`)
- T2: [x] (`src/shared/errors.ts`)
- T3: [x] (`src/shared/__tests__/errors.spec.ts`, 12 tests)
- T4: [x] (`src/shared/config.ts`)
- T5: [x] (`src/shared/__tests__/config.spec.ts`, 6 tests)
- T6: [x] (`src/services/http.ts`)
- T7: [x] (`src/services/__tests__/http.spec.ts`, 6 tests)
- T8: [x] (`src/main.ts:4-15`)
- T9: [x] (`package.json:10` → script `test`; único cambio en package.json, sin dependencias nuevas — diff verificado)
- T10: [x] (`.gitkeep` de `shared/` y `services/` eliminados; `src/features/.gitkeep` conservado — verificado con `ls -a`)
- T11: [x] (docs actualizados, ver R13)
- T12: [x] (gate reproducido por el reviewer: `./init.sh` exit 0, `pnpm type-check` OK, `pnpm lint` exit 0; e2e omitido legítimamente según la condición del propio T12 "si hay navegadores instalados" — no los hay, justificado en `progress/implementation/fundamentos.md`)
- T13: [x] (mapa de trazabilidad completo en `progress/implementation/fundamentos.md`)

## Criterios de aceptación (siempre)

- [x] "Configuración de variables de entorno tipada y validada al arrancar" → `src/shared/config.ts:18-48` + `src/main.ts:4,11`; tests `config.spec.ts:7-54`.
- [x] "Manejo de errores centralizado con formato consistente" → `src/shared/errors.ts` + `src/main.ts:15`; tests `errors.spec.ts:17-129`; la frontera HTTP emite siempre `ApiError` (`http.spec.ts:39-79`), nunca errores crudos ni strings.
- [x] "Estructura de carpetas por feature establecida en src/" → árbol coincide con `docs/architecture.md:50-70`; rutas canónicas verificadas por los imports de los tests (R12).
- [x] "Al menos un test del camino feliz de los fundamentos pasa con ./init.sh" → 24 tests nuevos corren dentro de `./init.sh` (sección 5), incluidos los caminos felices de R1/R8; ejecutado por el reviewer, verde.
- [x] "docs/architecture.md actualizado con las decisiones tomadas" → ADR-003 (`docs/architecture.md:122`) y ADR-004 (`docs/architecture.md:144`).

## Arquitectura (docs/architecture.md)

- [x] Organización por feature respetada: transversales en `shared/` y `services/`, `features/` intacta para las features de negocio.
- [x] "La UI no habla con la API": ningún `fetch(` en un `.vue`; el único `fetch` de aplicación vive en `src/services/http.ts:43`.
- [x] El cliente HTTP no conoce endpoints ni formas de datos (ADR-002): `http.ts` recibe `path` y devuelve `T`; el mapeo queda para el `service.ts` de cada feature.
- [x] Estado mínimo: sin variables module-level mutables; `appConfig` es un singleton congelado (`Object.freeze`, `config.ts:44`).
- [x] Sin `console.log` (grep verificado); `console.error` en `errors.ts:70` es el sink único diseñado en ADR-003.
- [x] Sin dependencias nuevas (diff de `package.json`: solo el script `test`).

## Convenciones (docs/conventions.md)

- [x] Todo en inglés (identificadores, comentarios, mensajes, nombres de test).
- [x] `import type` donde toca (`http.ts:6`); orden de imports vendor → alias → relativos respetado (`main.ts`, tests); relativo dentro de la misma capa (`config.ts:5` → `./errors`), alias al cruzar (`http.ts:5-7`).
- [x] Nombres: clases PascalCase sin prefijo `I`, funciones camelCase, constantes UPPER_SNAKE_CASE (`CONFIG_INVALID`…), factory `createHttp`.
- [x] Manejo de errores según el patrón acordado: `AppError extends Error` con `code`; nunca `throw` de strings; sin tragar errores.
- [x] Tests co-localizados en `src/**/__tests__/*.spec.ts`, AAA, descriptivos; formato verificado con `pnpm lint` (exit 0, sin archivos modificados por --fix).
- [x] Comentarios cortos, en inglés, explicando el porqué (p. ej. `errors.ts:12-13` justifica la desviación de `ErrorOptions` por el `lib: []` del tsconfig de vitest).

## Verificación (docs/verification.md)

- [x] Tests usan los recursos correctos: única frontera mockeada es `fetch` (`http.spec.ts`); `loadConfig` se testea como función pura con entornos inyectados; el singleton con `vi.stubEnv` + import dinámico. Sin mocks innecesarios.
- [x] Tests verifican output concreto: valores exactos (`toBe`, `toEqual`, `toMatchObject` con `code`/`status`/`cause`, URLs exactas, formato exacto `[API_HTTP] server exploded`), no solo "no lanza excepción".
- [x] Camino feliz + caminos de error en los tres módulos (config: válido/ausente/vacío/inválido; errors: 4 tipos de entrada; http: 2xx/204/404/500/red).

## CHECKPOINTS.md

- [x] C1 — Arnés completo: archivos base y docs existen (sección 2 de `init.sh` toda en `[OK]`); `./init.sh` exit 0.
- [x] C2 — Estado coherente: solo la feature 2 en `in_progress`; la feature 1 `done` tiene su test verde (`src/__tests__/App.spec.ts`); `progress/current.md` describe la sesión activa.
- [x] C3 — Arquitectura: estructura coincide con `docs/architecture.md`; cero dependencias nuevas; sin `console.log` ni TODOs sueltos (greps verificados); convenciones respetadas.
- [x] C4 — Verificación real: 24 tests nuevos (25 totales) en el entorno descrito (Vitest/jsdom), todos pasan, caminos felices + de error.
- [x] C5 — Sesión cerrada bien: sin temporales sospechosos (`dist/` cubierto por `.gitignore`; los untracked son el harness y los módulos nuevos, pendientes del commit del humano); `progress/history.md` tiene la entrada de la última sesión cerrada (feature 1); la feature 2 está en su estado correcto (`in_progress` hasta que el implementer cierre tras este APPROVED).
- [x] C6 — Coherencia con proyectos hermanos: ningún endpoint inventado (el cliente HTTP no conoce rutas de la API); el puerto de `VITE_API_URL` queda anotado como "a confirmar contra el backend" en `docs/stack.md:126-127`; `docs/related-projects.md` no requería cambios.
- [x] C7 — SDD: `specs/02-fundamentos/` con los 3 archivos; EARS estricto (CUANDO / SI…ENTONCES / DEBE, un DEBE por requirement); sección de Procedencia completa con los 14 R clasificados (humano/delegado/añadido; los añadidos R3, R14 y `VITE_API_URL` marcados "REVISAR EN APROBACIÓN" y aprobados por el humano el 2026-07-10, ver `progress/current.md:31-33`); todas las tasks `[x]`; cada R con test o excepción documentada (R13).
- [x] C8 — Resumen de cierre escrito: `progress/summaries/fundamentos.md`.

## Resumen de cierre (si APPROVED)

- Escrito en `progress/summaries/fundamentos.md` → **sí**

## Cambios requeridos (si aplica)

Ninguno. Dos observaciones menores, NO bloqueantes (no requieren acción):

1. `src/shared/__tests__/config.spec.ts:44` — el test de R4 con env inválido verifica el rechazo por mensaje (`/VITE_API_URL/`) pero no el `instanceof ConfigError` que anuncia su nombre. El tipo queda cubierto por los tests de R2/R3 sobre el mismo camino de código (`loadConfig`), así que la sustancia de R4 (el import falla en el arranque con mensaje claro) está verificada.
2. `src/shared/__tests__/config.spec.ts:27` — el fixture `'no-es-una-url'` es un literal en español; es exactamente el valor de ejemplo que prescribe el spec aprobado (R3, nota de verificación), por lo que se acepta tal cual.
