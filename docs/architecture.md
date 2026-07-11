# Arquitectura — Qué significa "hacer un buen trabajo"

> **Este documento es TUYO (humano) y está confirmado.** Recoge las decisiones
> de arquitectura de `gastos-frontend`, derivadas de las convenciones del stack
> (Vue 3 + Pinia + Vue Router + Vite) y del propósito de la app (control de
> gastos/ingresos que consume la API del backend hermano). Revisado y aceptado
> el 2026-07-08; evoluciónalo cuando tomes una decisión nueva.

---

## Principios

1. **Organización por feature, no por tipo técnico.**
   El código de una funcionalidad (componentes, composables, store, servicio,
   tipos) vive junto en `src/features/<feature>/`, no repartido en carpetas
   globales `components/` + `stores/` + `services/`. Un revisor puede decir
   "esto pertenece a una feature y está todo junto / no lo está".

2. **La UI no habla con la API directamente.**
   Los componentes `.vue` no llaman a `fetch`. Van contra un *composable* o un
   *store*, y el acceso HTTP se aísla en una capa `services/` (o `api/`). Regla
   verificable: **no hay `fetch(` dentro de un `.vue`**.

3. **El store guarda estado, el service trae datos.**
   Pinia mantiene estado de UI/dominio y orquesta; los `services/` construyen
   requests, mapean la respuesta de la API a los tipos del frontend y no
   guardan estado. Un service es una función pura de "entrada → datos".

4. **Los tipos del frontend son propios.**
   El frontend define sus interfaces a partir del contrato
   (`gastos-backend/docs/api-contract.md`), no copia tipos del backend.
   La respuesta cruda de la API se mapea a la forma que usa la UI en la capa
   `services/`; no se pasea el JSON del backend por los componentes.

5. **Estado mínimo y explícito.**
   Sin estado global mutable fuera de los stores de Pinia designados. Nada de
   variables module-level mutables como caché improvisada.

6. **Componentes tontos por defecto.**
   Un componente recibe `props` y emite `events`; la lógica de negocio vive en
   composables/stores. Si un `.vue` acumula lógica, se extrae a un
   `useXxx()`.

## Estructura de carpetas

> Estructura *feature-based* establecida (feature #1 creó el esqueleto;
> la feature #2 pobló `shared/` y `services/` con los módulos transversales).
> `@` es alias de `src/`.

```
src/
  main.ts                 # bootstrap: createApp + Pinia + Router
  App.vue                 # shell raíz
  router/
    index.ts              # rutas (hoy vacío); rutas por feature se agregan aquí
  features/
    <feature>/            # p.ej. expenses, incomes, dashboard
      components/         # componentes de presentación de la feature
      composables/        # useXxx() con la lógica reutilizable
      views/              # componentes-página montados por el router
      store.ts            # store Pinia de la feature (setup store)
      service.ts          # acceso a la API + mapeo a tipos del frontend
      types.ts            # tipos/interfaces propios (derivados del contrato)
      __tests__/          # tests co-localizados (*.spec.ts)
  shared/                 # componentes/composables/utils reutilizables entre features
    config.ts             # AppConfig tipada + loadConfig() + singleton appConfig (feature #2)
    errors.ts             # AppError y subtipos, toAppError, formatError, handleGlobalError (feature #2)
  services/
    http.ts               # cliente HTTP base: createHttp(config) + http (feature #2)
```

> El scaffold de ejemplo (`src/stores/counter.ts`) se retiró en el bootstrap.
> Un `src/stores/` global se reintroduciría solo para estado verdaderamente
> transversal (p. ej. sesión); lo demás va por feature.

## Flujo de datos

```
  vista (.vue) ──► composable (useXxx) ──► store (Pinia) ──► service ──► HTTP ──► API backend
       ▲                                      │                                     │
       └──────────── render reactivo ◄────────┴──────── mapea respuesta ◄───────────┘
```

- La **vista** monta y muestra; delega acciones en un composable o en el store.
- El **store** mantiene el estado (lista de gastos, filtros, loading, error) y
  llama al service.
- El **service** construye la request, llama a `services/http.ts`, y **mapea**
  la respuesta de la API a los tipos del frontend antes de devolverla.
- El estado reactivo de Pinia vuelve a la vista.

## Decisiones de arquitectura (ADRs)

> Las ADRs recogen decisiones de arquitectura ya tomadas. Añade una nueva
> cuando tomes una decisión que quieras dejar registrada.

### ADR-001: Organización por feature

- **Fecha:** 2026-07-08
- **Estado:** aceptada
- **Contexto:** app pequeña pero con varias áreas (gastos, ingresos,
  dashboards) que crecerán.
- **Decisión:** organizar `src/features/<feature>/` en vez de
  carpetas por tipo técnico.
- **Alternativas:** estructura plana por tipo (`components/`, `stores/`,
  `services/`) — más simple al inicio, peor a escala.
- **Consecuencias:** cada feature es autocontenida; el scaffold por defecto
  (`src/stores/`) se reserva para estado transversal.

### ADR-002: Capa de acceso a la API aislada

- **Fecha:** 2026-07-08
- **Estado:** aceptada
- **Contexto:** el frontend consume la API del backend hermano y no comparte
  tipos con él.
- **Decisión:** un cliente HTTP base en `services/http.ts` + un
  `service.ts` por feature que mapea la respuesta a tipos propios.
- **Alternativas:** `fetch` disperso por componentes (rechazado: acopla UI y
  transporte); instalar axios (pendiente de decidir; hoy no hay cliente HTTP).
- **Consecuencias:** un solo punto donde tocar baseURL, headers y manejo de
  error de red.

### ADR-003: Manejo de errores centralizado (jerarquía + manejador global)

- **Fecha:** 2026-07-10 (feature #2, `fundamentos`)
- **Estado:** aceptada
- **Contexto:** cada feature necesita reportar errores con un formato
  consistente en toda la app, sin `console.log` disperso.
- **Decisión:** jerarquía en `src/shared/errors.ts` según el patrón de
  `docs/conventions.md`: `AppError extends Error` con `code: string`;
  subtipos `ConfigError` (`CONFIG_INVALID`), `ApiError` (`API_HTTP` /
  `API_NETWORK`, con `status`) y `ValidationError` (`VALIDATION`). Un
  normalizador `toAppError(unknown) → AppError` (código `UNKNOWN` para
  valores ajenos, preservando `cause`) y un manejador global
  `handleGlobalError` registrado en `app.config.errorHandler` (mecanismo
  oficial de Vue 3). Formato único de reporte: `[<code>] <message>`, con
  `console.error` como único sink (sustituible por toast/telemetría).
- **Alternativas:** plugin de Vue (`app.use(errorPlugin)`) — descartado:
  misma capacidad con más ceremonia y sin estado que instalar.
- **Consecuencias:** la capa `services/` lanza siempre `ApiError`; los errores
  no capturados de componentes pasan por un único punto con formato
  consistente. `ValidationError` queda definido para la futura validación de
  datos de la API.

### ADR-004: Validación manual de configuración (sin librería de schemas)

- **Fecha:** 2026-07-10 (feature #2, `fundamentos`)
- **Estado:** aceptada (revisar al consumir el primer endpoint de la API)
- **Contexto:** la configuración por entorno (`VITE_API_URL`) debe validarse
  al arrancar, fail-fast y con mensaje claro.
- **Decisión:** validación a mano en `src/shared/config.ts`: `loadConfig(raw)`
  pura (testable con entornos inyectados) que valida presencia y URL
  parseable, lanza `ConfigError` listando todas las variables inválidas, y un
  singleton congelado `appConfig` evaluado al importar el módulo — `main.ts`
  lo importa antes de `mount`, así un entorno inválido impide el arranque.
- **Alternativas:** Zod (u otra librería de schemas) — descartada *por ahora*:
  dependencia nueva y peso en bundle para validar una sola variable; su
  beneficio real (schemas declarativos + tipos inferidos) aparece al validar
  respuestas de la API, que aún no se consumen. **Revisar esta decisión
  cuando la primera feature consuma la API.**
- **Consecuencias:** cero dependencias nuevas; el fallo de configuración
  ocurre en el arranque, no en mitad de una interacción.

## Qué NO hacer

- **No llamar a `fetch` / la API desde un componente `.vue`.** Pasa por un
  composable/store y la capa `services/`.
- **No devolver el JSON crudo del backend a la UI.** Mapéalo a los tipos del
  frontend en `services/`.
- **No mezclar lógica de negocio con presentación.** Si un `.vue` crece en
  lógica, extráela a un composable.
- **No usar `console.log` para errores.** Define un manejo de error
  consistente (ver `docs/conventions.md`).
- **No añadir librerías nuevas** (cliente HTTP, validación, UI kit) sin
  discutir el trade-off primero y anotarlo en `docs/stack.md`; si bloquea,
  cambia el status a `blocked` en `feature_list.json`.
