# Design — Feature 2: fundamentos (Fundamentos transversales)

> Cómo se construye lo descrito en `requirements.md`. Se apoya en las
> decisiones ya tomadas en `docs/architecture.md` y `docs/conventions.md`;
> este documento solo fija los puntos donde la feature roza esas fronteras.
> Código e identificadores en inglés (conventions.md → *Idioma del código*).

## Contexto y alcance

- Capa transversal SOLO: configuración por entorno tipada/validada, jerarquía
  de errores + manejador global, cliente HTTP base y consolidación de la
  estructura feature-based. **Nada de lógica de negocio.**
- **No se define ningún endpoint.** El contrato de la API vive en
  `gastos-backend/BACKEND/docs/api-contract.md` (ver
  `docs/related-projects.md`); cada feature futura definirá su `service.ts`
  contra ese contrato usando este cliente base.
- Sin dependencias nuevas (ver "Alternativas descartadas"). Todo se hace con
  TypeScript estricto (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`),
  `fetch` nativo y la infraestructura ya instalada (Vitest, @vue/test-utils).

## Archivos a crear / modificar

| Archivo | Acción | Para qué |
|---|---|---|
| `env.d.ts` | modificar | Tipar `ImportMetaEnv` con `VITE_API_URL` |
| `.env.example` | crear | Documentar las variables `VITE_*` requeridas (committed) |
| `.env.development` | crear | Valor local de `VITE_API_URL` para `pnpm dev` / e2e (committed, sin secretos) |
| `.env.test` | crear | Valor de `VITE_API_URL` para Vitest (modo `test`) (committed) |
| `src/shared/config.ts` | crear | `AppConfig`, `loadConfig()`, singleton `appConfig` |
| `src/shared/errors.ts` | crear | `AppError` + subtipos, `toAppError()`, `formatError()`, `handleGlobalError()` |
| `src/services/http.ts` | crear | `createHttp()` + cliente `http` por defecto |
| `src/main.ts` | modificar | Importar `appConfig` (validación al arrancar) y registrar `app.config.errorHandler` |
| `package.json` | modificar | Añadir script `"test": "vitest run"` (lo detecta `init.sh`) |
| `src/shared/__tests__/config.spec.ts` | crear | Tests R1–R4 |
| `src/shared/__tests__/errors.spec.ts` | crear | Tests R5–R7 |
| `src/services/__tests__/http.spec.ts` | crear | Tests R8–R11 |
| `src/shared/.gitkeep`, `src/services/.gitkeep` | eliminar | Ya hay archivos reales en esas carpetas |
| `docs/architecture.md` | modificar | ADR-003 (manejo de errores) y ADR-004 (validación manual de config); estructura actualizada |
| `docs/stack.md` | modificar | Tabla de variables de entorno (`VITE_API_URL`), decisión de validación, cliente HTTP hecho |

`src/features/` conserva su `.gitkeep` (sigue vacía hasta la primera feature
de negocio).

## Configuración por entorno (`src/shared/config.ts`)

```typescript
export interface AppConfig {
  /** Base URL of the backend API (from VITE_API_URL). */
  readonly apiUrl: string
}

/** Pure function: validates a raw env object and builds the typed config. */
export function loadConfig(raw: Readonly<Record<string, unknown>>): AppConfig

/** Eager singleton, evaluated at module import → fails at startup. */
export const appConfig: AppConfig
```

- `loadConfig` es **pura** (recibe el entorno como argumento) para que los
  tests inyecten entornos falsos sin tocar `import.meta.env`.
- Validación manual (decisión delegada b, ver requirements → Procedencia):
  - presencia y no-vacío de cada variable obligatoria → si falla,
    `ConfigError` con el nombre de la variable (R2);
  - `VITE_API_URL` debe ser parseable con `new URL(...)` → si falla,
    `ConfigError` con nombre y motivo (R3).
  - Si hay varias variables mal, el mensaje lista todas (un solo fallo claro,
    no fallo-a-fallo).
- `appConfig = Object.freeze(loadConfig(import.meta.env))` a nivel de módulo:
  importar el módulo con entorno inválido lanza (R4). `main.ts` lo importa
  antes de `mount`, de modo que el arranque falla con el mensaje claro en
  consola en lugar de fallar tarde en la primera petición.
- Archivos `.env`:
  - `.env.example` — plantilla documentada de todas las `VITE_*` (fuente de
    verdad para humanos; se registra también en `docs/stack.md`).
  - `.env.development` — `VITE_API_URL=http://localhost:3000` (valor local;
    el puerto real del backend se confirma contra el proyecto hermano cuando
    se consuma el primer endpoint — aquí solo hace falta *un* valor válido).
  - `.env.test` — mismo formato; Vitest corre en modo `test` y carga
    `.env.test`, así el singleton `appConfig` evalúa sin fallos en la suite.
  - Los tres van committeados (no contienen secretos); `.gitignore` ya cubre
    los overrides personales con `*.local`.
- `env.d.ts` amplía `ImportMetaEnv`:

```typescript
interface ImportMetaEnv {
  readonly VITE_API_URL: string
}
```

## Manejo de errores (`src/shared/errors.ts`)

Patrón de `docs/conventions.md` (decisión delegada a):

```typescript
export class AppError extends Error {
  constructor(message: string, readonly code: string, options?: { cause?: unknown })
}
export class ConfigError extends AppError {}     // code: 'CONFIG_INVALID'
export class ApiError extends AppError {         // code: 'API_HTTP' | 'API_NETWORK'
  readonly status?: number
}
export class ValidationError extends AppError {} // code: 'VALIDATION'

/** Normalizes any thrown value into an AppError (code 'UNKNOWN' if foreign). */
export function toAppError(value: unknown): AppError

/** Single consistent format: `[<code>] <message>`. */
export function formatError(error: AppError): string

/** Global sink: normalize + report once. Registered as app.config.errorHandler. */
export function handleGlobalError(error: unknown): void
```

- **Códigos**: `CONFIG_INVALID`, `API_HTTP`, `API_NETWORK`, `VALIDATION`,
  `UNKNOWN`. Constantes exportadas (UPPER_SNAKE_CASE) para evitar strings
  mágicos en los tests.
- `toAppError`: si ya es `AppError` lo devuelve tal cual; si es `Error` lo
  envuelve preservando `message` y `cause: value`; cualquier otro valor se
  convierte a string como mensaje. Nunca pierde información (R6).
- `handleGlobalError` reporta con `console.error(formatError(...))` — un
  único punto de salida, sustituible más adelante por un toast/telemetría sin
  tocar a los llamantes. No se usa `console.log` (prohibido en
  `docs/architecture.md`) y no se loguean datos sensibles.
- `main.ts` registra `app.config.errorHandler = handleGlobalError` (mecanismo
  oficial de Vue 3 para errores no capturados de componentes) → R7.
- `ValidationError` queda definido pero sin usos todavía: es la pieza que
  usará la validación de datos de la API cuando se consuma el contrato.

## Cliente HTTP base (`src/services/http.ts`)

```typescript
import type { AppConfig } from '@/shared/config'

export type HttpClient = <T>(path: string, init?: RequestInit) => Promise<T>

/** Factory with injected config (testable). */
export function createHttp(config: Pick<AppConfig, 'apiUrl'>): HttpClient

/** Default client bound to the validated appConfig. */
export const http: HttpClient
```

Comportamiento:

- URL = `new URL(path, config.apiUrl)` (la base viene SOLO de la config → R11).
- Cabecera `Accept: application/json` por defecto; el resto de `RequestInit`
  lo controla el llamante (método, body, headers extra).
- Respuesta 2xx → `response.json()` tipado como `T` (R8). Respuesta 2xx sin
  cuerpo (204 / content-length 0) → `undefined as T` (documentado en JSDoc).
- Respuesta no-2xx → `throw new ApiError(...)` con `code: 'API_HTTP'` y
  `status` de la respuesta (R9). Si el cuerpo trae un mensaje de error JSON
  se incorpora al `message`; si no, se usa `statusText`.
- `fetch` rechaza (red caída, DNS, CORS) → `throw new ApiError(...)` con
  `code: 'API_NETWORK'` y `cause` = error original (R10).
- El cliente **no** conoce endpoints ni formas de datos: mapear respuestas a
  tipos del frontend es trabajo del `service.ts` de cada feature (ADR-002).

## main.ts (cambios mínimos)

```typescript
import { appConfig } from '@/shared/config' // validates env at startup (R4)
import { handleGlobalError } from '@/shared/errors'
// ...
app.config.errorHandler = handleGlobalError // R7
```

(`appConfig` se importa aunque solo sea por el efecto de validación; se usa
`void appConfig` o se pasa a quien lo necesite para evitar el aviso de import
sin uso — detalle del implementer.)

## Conexión de tests con init.sh (R14)

- `init.sh` detecta el comando de tests con `grep -q '"test"' package.json`;
  hoy solo existen `test:unit` / `test:e2e`, por eso emite WARN.
- Se añade a `package.json`: `"test": "vitest run"` (una sola pasada, sin
  watch). Es la vía que sugiere `docs/verification.md` ("hasta que se añada
  un alias \"test\" o se ajuste init.sh") y no toca `init.sh`.
- No se usa `run-s test:*` como alias porque arrastraría los e2e de
  Playwright (navegadores instalados aparte) a `./init.sh` — demasiado pesado
  y frágil para el gate de entorno.
- Tras el cambio, `./init.sh` ejecuta `pnpm test` → Vitest en verde. La nota
  de advertencia de `docs/verification.md` (Nivel 1) se actualiza (R13/T11).

## Estrategia de tests (trazabilidad en tasks.md)

- `src/shared/__tests__/config.spec.ts` — `loadConfig` con entorno inyectado
  (feliz, falta variable, URL inválida) + import dinámico del módulo con
  `vi.stubEnv`/`vi.resetModules` para R4.
- `src/shared/__tests__/errors.spec.ts` — jerarquía/`code` (R5), `toAppError`
  con los 4 tipos de entrada (R6), `handleGlobalError` con spy sobre
  `console.error` verificando `[<code>] <message>` (R7).
- `src/services/__tests__/http.spec.ts` — mock de `fetch` (única frontera
  mockeada, según conventions.md): 200 JSON (R8), 404/500 (R9), rechazo de
  red (R10), dos `createHttp` con bases distintas (R11).
- El e2e existente (`e2e/vue.spec.ts`) sigue verde: `.env.development`
  provee `VITE_API_URL` al dev server y `App.vue` no llama a la API.

## Manejo de errores de esta propia feature

- Config inválida → `ConfigError` al arrancar (fail-fast, mensaje con
  variable y motivo). Es el único caso donde "romper el arranque" es el
  comportamiento correcto pedido por el intent.
- Frontera HTTP → siempre `ApiError` (nunca escapa un `TypeError` crudo de
  `fetch` ni un throw de string).
- Cualquier error no capturado en componentes → `handleGlobalError` (formato
  único, sin tragar errores).

## Alternativas descartadas

1. **Zod (u otra librería de schemas) para validar la config** — descartada
   *por ahora*. Coste: dependencia nueva (prohibida sin necesidad demostrada
   por `docs/architecture.md`) y peso en bundle para validar UNA variable.
   Beneficio real de Zod (schemas declarativos + tipos inferidos) aparece al
   validar respuestas de la API, que esta feature no consume. Decisión
   registrada como "revisar al consumir el primer endpoint" en
   `docs/stack.md`. (Decisión delegada b — ver Procedencia en requirements.)
2. **axios / ky como cliente HTTP** — descartado. `fetch` nativo cubre el
   caso (JSON + errores normalizados), es la opción por defecto ya anotada en
   `docs/stack.md`, y evita otra dependencia. Interceptores/reintentos no se
   necesitan aún; si algún día hacen falta, `createHttp` es el único punto a
   tocar (ADR-002).
3. **Validar la config de forma lazy (al primer uso) en vez de eager (al
   arrancar)** — descartado: contradice el intent ("falla al arrancar con un
   mensaje claro"); el fallo tardío aparecería en mitad de una interacción.
4. **Plugin de Vue (`app.use(errorPlugin)`) para el manejo de errores** —
   descartado: `app.config.errorHandler` + un módulo en `shared/` hace lo
   mismo sin la ceremonia de un plugin; no hay estado que instalar.
5. **Ajustar `init.sh` para que ejecute `pnpm test:unit run`** — descartado:
   `init.sh` es agnóstico al stack y compartido por el harness; el alias
   `"test"` en `package.json` logra lo mismo sin bifurcar el script (y es la
   opción que ya sugiere `docs/verification.md`).
