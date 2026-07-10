# Resumen — feature 2 `fundamentos`

Fecha de cierre: 2026-07-10
Intención original: `feature_list.json` → feature `fundamentos`, bloque `intent`
Spec (si SDD): `specs/fundamentos/`

## Qué hace ahora la app que antes no

La app tiene ahora su "fontanería" común: al arrancar valida la configuración
del entorno (si falta la URL de la API o está mal escrita, no arranca y te
dice exactamente qué variable falla), todos los errores de la app salen con
un mismo formato `[CÓDIGO] mensaje` por un único punto, y existe un cliente
HTTP base que cualquier feature futura usará para hablar con el backend sin
repetir el manejo de fallos. Antes nada de esto existía: cada feature habría
tenido que inventárselo.

## Por dónde se usa (puntos de entrada)

- `appConfig` (desde `@/shared/config`) — la configuración validada; hoy solo
  `apiUrl`, que sale de la variable de entorno `VITE_API_URL`.
- `http<T>('/ruta')` (desde `@/services/http`) — pedir datos a la API; devuelve
  el JSON tipado o lanza un `ApiError` con el detalle del fallo.
- `createHttp({ apiUrl })` — misma pieza pero con configuración inyectada
  (lo que usan los tests o un entorno alternativo).
- `AppError`, `ApiError`, `ConfigError`, `ValidationError`, `toAppError`
  (desde `@/shared/errors`) — para lanzar/normalizar errores en features
  futuras.
- Automático, sin llamarlo: cualquier error no capturado de un componente Vue
  pasa por `handleGlobalError` (registrado en el arranque).

## Dónde está el código (para revisión directa)

| Qué | Archivo:línea |
|-----|---------------|
| Config tipada (`AppConfig`) | `src/shared/config.ts:7` |
| Validación del entorno (`loadConfig`) | `src/shared/config.ts:18` |
| Singleton que valida al arrancar (`appConfig`) | `src/shared/config.ts:48` |
| Base de errores (`AppError` con `code` y `cause`) | `src/shared/errors.ts:11` |
| Subtipos (`ConfigError`/`ApiError`/`ValidationError`) | `src/shared/errors.ts:27,33,42` |
| Normalizador (`toAppError`) | `src/shared/errors.ts:49` |
| Formato único `[<code>] <message>` (`formatError`) | `src/shared/errors.ts:60` |
| Manejador global (`handleGlobalError`) | `src/shared/errors.ts:69` |
| Cliente HTTP (`createHttp` + `http`) | `src/services/http.ts:37,70` |
| Arranque: valida config + registra manejador | `src/main.ts:11,15` |
| Tipado de `import.meta.env` | `env.d.ts:3` |
| Variables de entorno (plantilla/dev/test) | `.env.example:6`, `.env.development:4`, `.env.test:2` |
| Tests de configuración (6) | `src/shared/__tests__/config.spec.ts:6` |
| Tests de errores (12) | `src/shared/__tests__/errors.spec.ts:17` |
| Tests del cliente HTTP (6) | `src/services/__tests__/http.spec.ts:15` |
| Decisiones registradas (ADR-003 y ADR-004) | `docs/architecture.md:122,144` |

## Cumplimiento de la intención

Por cada punto del `como_se_que_esta_bien` del `intent`:

- ✅ "Cuando arranca la app, la configuración por entorno está validada; si
  falta algo obligatorio, falla al arrancar con un mensaje claro." → Se
  cumple: `src/main.ts:11` evalúa `appConfig` antes de montar la app, y el
  mensaje nombra la variable y el motivo. Verificado en
  `src/shared/__tests__/config.spec.ts:14` (falta la variable),
  `config.spec.ts:19` (vacía), `config.spec.ts:26` (URL mal escrita) y
  `config.spec.ts:40` (el propio arranque del módulo falla con entorno
  inválido).
- ✅ "Cuando una feature lanza un error, sale con un formato consistente en
  toda la app." → Se cumple: todo pasa por `[<code>] <message>` vía
  `handleGlobalError` (registrado en `src/main.ts:15`), y la frontera HTTP
  siempre lanza `ApiError` (nunca errores crudos). Verificado en
  `src/shared/__tests__/errors.spec.ts:97-128` (formato y reporte único) y
  `src/services/__tests__/http.spec.ts:39,55,67` (errores HTTP y de red
  normalizados).
- ✅ "Cuando miro src/, la estructura por features ya está establecida y
  documentada." → Se cumple: `src/shared/` y `src/services/` pueblan la
  estructura descrita en `docs/architecture.md:50-70` (y `src/features/`
  espera a la primera feature de negocio); los propios tests importan por las
  rutas canónicas `@/shared/...` y `@/services/...`
  (`config.spec.ts:3`, `errors.spec.ts:3`, `http.spec.ts:3`), así que si la
  estructura no existiera, la suite no compilaría.

También se respetaron los `que_no_quiero`: cero lógica de negocio (el cliente
HTTP no conoce ningún endpoint) y cero valores hardcodeados fuera del sistema
de entorno (verificado en `http.spec.ts:81`: la URL sale solo de la config).

## Decisiones que se tomaron por ti

Lo que en el spec estaba marcado como `(delegado)` o `(añadido)`:

- (delegado) **Patrón de manejo de errores**: jerarquía `AppError` con `code`
  + manejador global en `app.config.errorHandler` (el mecanismo oficial de
  Vue). Vive en `src/shared/errors.ts` y quedó registrado como ADR-003 en
  `docs/architecture.md:122`.
- (delegado) **Validación a mano, sin librería (no Zod)**: hoy solo hay una
  variable que validar; añadir una librería no compensaba. Vive en
  `src/shared/config.ts:18` y quedó como ADR-004 en `docs/architecture.md:144`,
  con nota explícita de **revisar cuando se consuma el primer endpoint** de la
  API (ahí Zod sí pagaría su coste).
- (añadido) **R3**: además de "falta la variable", también se rechaza una URL
  presente pero mal escrita (aprobaste este añadido en la puerta del spec).
- (añadido) **R14 / script `test`**: se añadió `"test": "vitest run"` a
  `package.json:10` para que `./init.sh` ejecute la suite completa (antes
  avisaba "No hay comando de tests configurado").
- (añadido) **`VITE_API_URL`** como la variable obligatoria concreta, con
  valor local `http://localhost:3000`; el puerto real del backend se
  confirmará contra el proyecto hermano al consumir el primer endpoint.

## Qué NO se tocó / quedó fuera

- Ninguna feature de negocio: no hay pantallas, stores ni servicios de
  gastos/ingresos todavía.
- Ningún endpoint de la API: el cliente HTTP es genérico; los endpoints se
  definirán feature a feature contra el contrato del backend.
- Tailwind CSS: sigue pendiente en su propia feature (#3).
- `ValidationError` existe pero aún no se usa: es la pieza reservada para
  validar datos de la API cuando se consuman.
- Tests E2E nuevos: no tocaba; el E2E existente no se ejecutó porque no hay
  navegadores de Playwright instalados en esta máquina (documentado en
  `progress/impl_fundamentos.md`).

## Notas para el futuro (opcional)

- El Node local (v24.11.0) no cumple el rango de `engines`
  (`^22.18.0 || >=24.12.0`): pnpm avisa con un WARN no bloqueante en cada
  comando. Actualizar Node o ajustar `engines`.
- `tsconfig.vitest.json` tiene `lib: []`, lo que obligó a declarar `cause`
  como propiedad propia en `AppError` (`src/shared/errors.ts:12-14`) en vez
  de usar el `ErrorOptions` nativo. Valorar añadir `"lib": ["ES2022"]` en una
  tarea de tooling.
- Mensajes del validador de `init.sh` se ven con encoding roto en consolas
  Windows (cosmético, preexistente).
