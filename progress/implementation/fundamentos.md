# Informe de implementación — Feature 2: fundamentos (Fundamentos transversales)

- **Fecha:** 2026-07-10
- **Agente:** implementer
- **Spec:** `specs/02-fundamentos/` (requirements.md, design.md, tasks.md) — aprobado por el humano
- **Tasks:** T1–T13 completadas, todas marcadas `[x]` en `specs/02-fundamentos/tasks.md`

## Archivos creados

| Archivo | Contenido |
|---|---|
| `.env.example` | Plantilla documentada de variables `VITE_*` (committed, sin secretos) |
| `.env.development` | `VITE_API_URL=http://localhost:3000` para `pnpm dev` / e2e |
| `.env.test` | `VITE_API_URL` para Vitest (modo `test`, mantiene válido el singleton) |
| `src/shared/errors.ts` | `AppError` (con `code` y `cause`), `ConfigError`, `ApiError` (con `status`), `ValidationError`, constantes `CONFIG_INVALID`/`API_HTTP`/`API_NETWORK`/`VALIDATION`/`UNKNOWN`, `toAppError()`, `formatError()`, `handleGlobalError()` |
| `src/shared/config.ts` | `AppConfig`, `loadConfig(raw)` pura (presencia + URL parseable, `ConfigError` listando todas las inválidas), singleton congelado `appConfig` evaluado al importar |
| `src/services/http.ts` | `HttpClient`, `createHttp(config)` (URL solo desde config, 2xx→JSON tipado, 204/vacío→`undefined`, no-2xx→`ApiError` con `status`, red→`ApiError` con `cause`), cliente por defecto `http` ligado a `appConfig` |
| `src/shared/__tests__/errors.spec.ts` | 12 tests (R5, R6, R7) |
| `src/shared/__tests__/config.spec.ts` | 6 tests (R1, R2, R3, R4) |
| `src/services/__tests__/http.spec.ts` | 6 tests (R8, R9, R10, R11), mockeando solo `fetch` |

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `env.d.ts` | `interface ImportMetaEnv { readonly VITE_API_URL: string }` |
| `src/main.ts` | Importa `appConfig` antes de `mount` (validación fail-fast, R4) y registra `app.config.errorHandler = handleGlobalError` (R7) |
| `package.json` | Script `"test": "vitest run"` (lo detecta `init.sh` → R14) |
| `docs/architecture.md` | ADR-003 (manejo de errores centralizado), ADR-004 (validación manual de config, revisar al consumir la API), árbol de `src/` actualizado con los módulos reales |
| `docs/stack.md` | Tabla de variables de entorno con `VITE_API_URL`, cliente HTTP `services/http.ts` hecho, decisión de validación manual anotada |
| `docs/verification.md` | Retirado el aviso "init.sh NO ejecuta Vitest"; gate final actualizado |
| `specs/02-fundamentos/tasks.md` | T1–T13 marcadas `[x]` |

## Archivos eliminados

- `src/shared/.gitkeep`, `src/services/.gitkeep` (carpetas ya con módulos reales; `src/features/.gitkeep` se queda).

## Decisiones tomadas (dentro del margen del design)

1. **`cause` declarado como propiedad propia de `AppError`** en vez de pasar
   `ErrorOptions` nativo a `super()`. Motivo: `tsconfig.vitest.json` usa
   `lib: []` (sin `ES2022.Error`), por lo que `new Error(msg, { cause })` y
   `error.cause` no type-checkean bajo `vue-tsc --build`. La firma pública es
   exactamente la del design (`constructor(message, code, options?: { cause?: unknown })`)
   y el comportamiento observable es idéntico (los tests de R6/R10 verifican
   `cause`). No se tocó ningún tsconfig (no estaba en la lista de archivos del spec).
2. **Validación de URL con `try { new URL(...) } catch`** tal y como especifica
   el design (en vez de `URL.canParse`), compatible con ambas configuraciones de lib.
3. **`Object.freeze` dentro de `loadConfig`** (el design lo mostraba en el
   singleton): así *todo* `AppConfig` devuelto es inmutable, incluido el de los
   tests con entorno inyectado. El singleton queda congelado igualmente
   (verificado por test de R1).
4. **Imports de los tests por rutas canónicas** `@/shared/config`,
   `@/shared/errors`, `@/services/http` — exigido por la verificación de R12
   ("los propios tests importan por esas rutas"), prevalece sobre la
   preferencia general de relativos intra-feature de conventions.md.

## Verificación (gate completo de `docs/verification.md`)

- `./init.sh` → todo `[OK]`, incluido el bloque de tests (sin el WARN anterior).
- `pnpm type-check` (`vue-tsc --build`) → sin errores.
- `pnpm lint` (oxlint + eslint) → exit 0, sin modificaciones de archivos.
- `pnpm build` → build de producción compila (`dist/` generado).
- `pnpm test:e2e --project=chromium` → **omitido legítimamente**: T12 lo
  condiciona a "si hay navegadores instalados" y no hay ninguno
  (`$LOCALAPPDATA/ms-playwright` no existe). No se descargaron navegadores
  (descarga pesada no autorizada por el spec).

### Output del último `./init.sh`

```
── 1. Detectando stack ────────────────────────────────
[OK]    Stack detectado: node
[OK]    Runtime: v24.11.0

── 2. Verificando archivos base del arnés ──────────────
[OK]    Existe AGENTS.md
[OK]    Existe CHECKPOINTS.md
[OK]    Existe feature_list.json
[OK]    Existe progress/current.md
[OK]    Existe docs/stack.md
[OK]    Existe docs/architecture.md
[OK]    Existe docs/conventions.md
[OK]    Existe docs/verification.md
[OK]    Existe docs/specs.md

── 3. Validando feature_list.json ──────────────────────
[OK]    feature_list.json válido (3 features)
[OK]    Specs presentes para features sdd con estado no-pending

── 4. Type checking (tsc) ──────────────────────────────
[INFO]  Ejecutando: npx tsc --noEmit
[OK]    Type check OK (tsc sin errores)

── 5. Ejecutando tests ─────────────────────────────────
[INFO]  Ejecutando: pnpm test
$ vitest run

 Test Files  4 passed (4)
      Tests  25 passed (25)

[OK]    Todos los tests pasan

── 6. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

(25 tests = 24 nuevos de esta feature + 1 preexistente de `App.spec.ts`.)

## Trazabilidad

- R1 → `config.spec.ts` › `builds a typed immutable AppConfig from a valid environment (R1)`
- R2 → `config.spec.ts` › `throws a ConfigError naming the variable when it is missing (R2)` y `throws a ConfigError naming the variable when it is empty (R2)`
- R3 → `config.spec.ts` › `throws a ConfigError with variable name and reason for an unparseable URL (R3)`
- R4 → `config.spec.ts` › `module import fails with ConfigError when the environment is invalid` y `module import exposes the validated appConfig when the environment is valid` (vía `vi.stubEnv` + `vi.resetModules` + import dinámico; `main.ts` importa `appConfig` antes de `mount`)
- R5 → `errors.spec.ts` › describe `error hierarchy (R5)` (4 tests: `AppError`, `ConfigError`, `ApiError`, `ValidationError` con `instanceof`, `code`, `message`)
- R6 → `errors.spec.ts` › describe `toAppError (R6)` (4 tests: `AppError`, `Error`, `string`, valor desconocido; preserva `message` y `cause`)
- R7 → `errors.spec.ts` › `reports an Error once through the sink with the consistent format`, `reports a non-Error value once with the consistent format`, `keeps the code of an AppError when reporting`, `formats errors as [<code>] <message>`
- R8 → `http.spec.ts` › `returns the parsed JSON body typed as T on a 2xx response (R8)` y `returns undefined on a 204 response without body (R8)`
- R9 → `http.spec.ts` › `throws an ApiError carrying the status on a 404 response (R9)` y `... on a 500 response (R9)`
- R10 → `http.spec.ts` › `throws a network ApiError preserving the original cause when fetch rejects (R10)`
- R11 → `http.spec.ts` › `builds URLs exclusively from the injected config apiUrl (R11)` (dos bases inyectadas; sin URLs de API hardcodeadas en el cliente)
- R12 → cubierto estructuralmente: los tests de R1–R11 importan por `@/shared/config`, `@/shared/errors` y `@/services/http`; si la estructura no existiera, la suite no compilaría (verificado por `vue-tsc` + Vitest). Revisión del árbol: pendiente del reviewer.
- R13 → requisito documental (excepción aceptada en el spec): ADR-003 y ADR-004 en `docs/architecture.md`; `VITE_API_URL` y decisiones en `docs/stack.md`; aviso retirado en `docs/verification.md`. Verificación: reviewer.
- R14 → ejecución de `./init.sh` (output arriba): sección 5 corre `pnpm test` (`vitest run`) y termina `[OK] Todos los tests pasan`, sin el WARN "No hay comando de tests configurado".

## Estado final en feature_list.json

- Feature 2 `fundamentos` permanece en **`in_progress`** a la espera del
  veredicto del reviewer (el implementer no marca `done`).

## Sugerencias fuera de scope (NO aplicadas)

1. **WARN de pnpm por `engines`:** el Node local es v24.11.0 y `package.json`
   exige `^22.18.0 || >=24.12.0`; pnpm emite un WARN (no bloqueante) en cada
   comando. Preexistente a esta feature. Sugerencia: actualizar Node local o
   ajustar `engines`.
2. **Encoding en `init.sh` sección 3:** los mensajes del validador Python
   muestran `v�lido` en consolas Windows (cp1252 vs UTF-8). Cosmético y
   preexistente.
3. **`tsconfig.vitest.json` con `lib: []`:** obliga a evitar tipos de
   `ES2022.Error` (`ErrorOptions`, `Error.cause`) en código compartido con
   tests. Valorar añadir `"lib": ["ES2022"]` en una tarea de tooling.
