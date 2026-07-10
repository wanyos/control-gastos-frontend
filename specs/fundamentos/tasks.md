# Tasks — Feature 2: fundamentos (Fundamentos transversales)

> Checklist ejecutable para el `implementer`. Orden pensado para que cada
> paso deje el repo compilando. Cada task referencia los `R<n>` de
> `requirements.md` que cubre. Marcar `[x]` al completar.

- [x] T1 — Crear `.env.example`, `.env.development` y `.env.test` con
  `VITE_API_URL` (valores locales, sin secretos) y ampliar `env.d.ts` con
  `interface ImportMetaEnv { readonly VITE_API_URL: string }`.
  Cubre: R1, R2, R3 (soporte), R11.

- [x] T2 — Crear `src/shared/errors.ts`: `AppError` (con `code` y `cause`),
  `ConfigError`, `ApiError` (con `status`), `ValidationError`, constantes de
  código (`CONFIG_INVALID`, `API_HTTP`, `API_NETWORK`, `VALIDATION`,
  `UNKNOWN`), `toAppError()`, `formatError()`, `handleGlobalError()`.
  Cubre: R5, R6, R7.

- [x] T3 — Crear `src/shared/__tests__/errors.spec.ts`: jerarquía y códigos
  (R5), `toAppError` con `AppError`/`Error`/`string`/valor desconocido (R6),
  `handleGlobalError` con spy verificando el formato `[<code>] <message>`
  (R7). Cubre: R5, R6, R7.

- [x] T4 — Crear `src/shared/config.ts`: `AppConfig`, `loadConfig(raw)`
  (valida presencia + URL parseable, lanza `ConfigError` con nombre de
  variable y motivo, listando todas las inválidas) y singleton congelado
  `appConfig` evaluado al importar. Cubre: R1, R2, R3, R4.

- [x] T5 — Crear `src/shared/__tests__/config.spec.ts`: camino feliz con
  entorno inyectado (R1), variable ausente/vacía (R2), URL inválida (R3), e
  import dinámico del módulo con `vi.stubEnv` + `vi.resetModules` para el
  fallo en el arranque (R4). Cubre: R1, R2, R3, R4.

- [x] T6 — Crear `src/services/http.ts`: `HttpClient`, `createHttp(config)`
  y cliente por defecto `http` ligado a `appConfig` (URL solo desde config,
  2xx → JSON tipado, no-2xx → `ApiError` con `status`, rechazo de red →
  `ApiError` con `cause`). Cubre: R8, R9, R10, R11.

- [x] T7 — Crear `src/services/__tests__/http.spec.ts` mockeando solo
  `fetch`: 200 con JSON (R8), 404/500 → `ApiError` con `status` (R9),
  rechazo de red → `ApiError` con `cause` (R10), dos bases distintas vía
  `createHttp` (R11). Cubre: R8, R9, R10, R11.

- [x] T8 — Modificar `src/main.ts`: importar `appConfig` antes de `mount`
  (validación al arrancar) y registrar
  `app.config.errorHandler = handleGlobalError`. Cubre: R4, R7.

- [x] T9 — Añadir `"test": "vitest run"` a los scripts de `package.json`
  para que `./init.sh` detecte y ejecute la suite unitaria. Cubre: R14.

- [x] T10 — Eliminar `src/shared/.gitkeep` y `src/services/.gitkeep`
  (carpetas ya con módulos reales); `src/features/.gitkeep` se queda.
  Cubre: R12.

- [x] T11 — Actualizar documentación: `docs/architecture.md` (ADR-003
  patrón de manejo de errores; ADR-004 validación manual de config sin
  librería, con nota de revisión al consumir la API; estructura/estado
  actualizado), `docs/stack.md` (tabla de variables de entorno con
  `VITE_API_URL`, cliente HTTP `services/http.ts` hecho, decisión de
  validación) y `docs/verification.md` (retirar el aviso de que `init.sh`
  no ejecuta Vitest). Cubre: R13, R14 (doc).

- [x] T12 — Gate completo de verificación: `./init.sh` (tests incluidos, en
  verde y sin el WARN de tests), `pnpm type-check`, `pnpm lint`,
  `pnpm build`, y `pnpm test:e2e --project=chromium` si hay navegadores
  instalados (el e2e existente debe seguir verde). Cubre: R14 (y regresión
  de R1–R12).

- [x] T13 — Documentar en `progress/impl_fundamentos.md` el mapa de
  trazabilidad `R<n> → test` (Nivel 4 de `docs/verification.md`) y el
  resumen de lo hecho. Cubre: trazabilidad de R1–R14.
