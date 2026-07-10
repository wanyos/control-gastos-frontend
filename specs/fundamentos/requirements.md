# Requirements — Feature 2: fundamentos (Fundamentos transversales)

> Derivado del bloque `intent` de la feature 2 en `feature_list.json`
> (fuente de verdad) y redactado en EARS estricto según `docs/specs.md`.
> Alcance: SOLO la capa transversal (configuración por entorno, manejo de
> errores centralizado, cliente HTTP base y estructura por features).
> Sin lógica de negocio y sin inventar endpoints (ver
> `docs/related-projects.md`: el contrato de la API vive en el backend).

## Cobertura del intent

| Punto de `como_se_que_esta_bien` | Requirements que lo cubren |
|---|---|
| "Cuando arranca la app, la configuración por entorno está validada; si falta algo obligatorio, falla al arrancar con un mensaje claro." | R1, R2, R3, R4 |
| "Cuando una feature lanza un error, sale con un formato consistente en toda la app." | R5, R6, R7, R9, R10 |
| "Cuando miro src/, la estructura por features ya está establecida y documentada." | R12, R13 |
| `que_no_quiero`: "No dejar la config con valores hardcodeados fuera del sistema de entorno." | R11 |
| `acceptance`: "Al menos un test del camino feliz de los fundamentos pasa con ./init.sh" | R14 |

---

## Configuración por entorno

## R1
CUANDO `loadConfig` recibe un entorno con todas las variables obligatorias
presentes y válidas, el sistema DEBE devolver un objeto `AppConfig` tipado e
inmutable cuyos valores provienen de esas variables (`VITE_API_URL` →
`apiUrl`).

> Verificación: test unitario en `src/shared/__tests__/config.spec.ts`
> (camino feliz con entorno inyectado).

## R2
SI una variable de entorno obligatoria falta o está vacía ENTONCES el sistema
DEBE lanzar un `ConfigError` cuyo mensaje incluya el nombre de la variable
ausente.

> Verificación: test unitario (entorno sin `VITE_API_URL` → `ConfigError`
> con `VITE_API_URL` en el mensaje).

## R3
SI una variable de entorno obligatoria tiene un valor inválido (p. ej.
`VITE_API_URL` no es una URL parseable) ENTONCES el sistema DEBE lanzar un
`ConfigError` cuyo mensaje incluya el nombre de la variable y el motivo del
rechazo.

> Verificación: test unitario (`VITE_API_URL = "no-es-una-url"` →
> `ConfigError` con nombre y motivo).

## R4
CUANDO la aplicación arranca, el sistema DEBE evaluar y validar la
configuración (`appConfig`) antes de montar la app, de modo que un entorno
inválido impide el arranque con el error de R2/R3 visible.

> Verificación: test unitario con `vi.stubEnv` + `vi.resetModules` + import
> dinámico del módulo `@/shared/config` (la evaluación del módulo lanza si
> el entorno es inválido). `main.ts` importa `appConfig` antes de `mount`.

## Manejo de errores centralizado

## R5
El sistema DEBE definir una jerarquía de errores base `AppError extends Error`
con `code: string`, y los subtipos `ConfigError`, `ApiError` y
`ValidationError`, según el patrón acordado en `docs/conventions.md`.

> Verificación: test unitario en `src/shared/__tests__/errors.spec.ts`
> (instancias con `instanceof`, `code` y `message` correctos).

## R6
CUANDO `toAppError` recibe un valor lanzado de cualquier tipo (`AppError`,
`Error`, `string`, desconocido), el sistema DEBE devolver siempre un
`AppError`, preservando el mensaje original y la causa (`cause`).

> Verificación: test unitario con los cuatro tipos de entrada.

## R7
CUANDO Vue captura un error no manejado de un componente, el sistema DEBE
pasarlo por el manejador global (`handleGlobalError`), que lo normaliza con
`toAppError` y lo reporta una sola vez con el formato consistente
`[<code>] <message>`.

> Verificación: test unitario que invoca `handleGlobalError` con un `Error`
> y con un valor no-Error, y comprueba (con spy sobre el sink de reporte)
> el formato `[<code>] <message>`.

## Cliente HTTP base

## R8
CUANDO se llama `http<T>(path)` y la API responde 2xx con cuerpo JSON, el
sistema DEBE devolver el cuerpo parseado tipado como `T`.

> Verificación: test unitario en `src/services/__tests__/http.spec.ts`
> mockeando solo la frontera `fetch` (según `docs/conventions.md`).

## R9
SI la respuesta HTTP es no-2xx ENTONCES `http` DEBE lanzar un `ApiError` que
incluya el `status` de la respuesta en el error.

> Verificación: test unitario (mock `fetch` → 404/500, se espera `ApiError`
> con `status`).

## R10
SI la petición de red falla (rechazo de `fetch`, sin respuesta) ENTONCES
`http` DEBE lanzar un `ApiError` con código de error de red y la causa
original preservada en `cause`.

> Verificación: test unitario (mock `fetch` que rechaza → `ApiError` de red
> con `cause`).

## R11
El cliente HTTP DEBE construir sus URLs exclusivamente a partir de la
`apiUrl` de la configuración validada (`AppConfig`), sin URLs de API
hardcodeadas en `src/`.

> Verificación: test unitario con `createHttp({ apiUrl })` inyectando dos
> bases distintas y comprobando la URL usada en `fetch`. El reviewer
> comprueba además que no hay literales de URL de API en `src/`.

## Estructura por features

## R12
El sistema DEBE exponer los módulos transversales en las rutas canónicas de
la estructura feature-based: `@/shared/config`, `@/shared/errors` y
`@/services/http` (alias `@` → `src/`).

> Verificación: los propios tests de R1–R11 importan por esas rutas; si la
> estructura no existe, la suite no compila. El reviewer verifica el árbol
> contra `docs/architecture.md`.

## R13
CUANDO la feature se cierre, la documentación DEBE reflejar las decisiones
tomadas: `docs/architecture.md` (patrón de errores y decisión de validación
como ADRs, estructura confirmada) y `docs/stack.md` (tabla de variables de
entorno con `VITE_API_URL`, decisión de validación manual).

> Verificación: por revisión (reviewer); no es verificable por test
> unitario — se acepta como excepción documentada porque es un requisito de
> documentación exigido por el `acceptance`.

## Verificación con init.sh

## R14
CUANDO se ejecuta `./init.sh`, el bloque de tests DEBE ejecutar la suite
unitaria (Vitest, una sola pasada) y terminar en verde, sin el WARN actual
"No hay comando de tests configurado".

> Verificación: ejecutar `./init.sh` y comprobar que la sección de tests
> corre `pnpm test` (alias de `vitest run`) y termina `[OK]`.

---

## Procedencia

### Decisiones delegadas (de `delego_en_agente`), resueltas aquí

**(a) Patrón concreto de manejo de errores idiomático del stack.**
Decidido: implementar tal cual el patrón ya acordado en
`docs/conventions.md` → *Manejo de errores*: clase base
`AppError extends Error` con `code: string`, subtipos `ConfigError`,
`ApiError` y `ValidationError`; la capa `services/` traduce fallos HTTP a un
`ApiError` normalizado; nunca `throw` de strings. Se añade lo idiomático de
Vue 3 para que "toda la app" tenga formato consistente: un normalizador
`toAppError(unknown) → AppError` y un manejador global registrado en
`app.config.errorHandler` (el mecanismo oficial de Vue para errores no
capturados de componentes). Formato único de reporte: `[<code>] <message>`.
Por qué: conventions.md ya fija las clases (no reinvento); el
`errorHandler` global es el punto de captura estándar de Vue y evita
`console.log` disperso (prohibido por `docs/architecture.md`).

**(b) ¿Librería de validación (Zod) o validación a mano?**
Decidido: **validación a mano, sin librería**, para esta feature.
Trade-off: Zod daría schemas declarativos, tipos inferidos y mensajes ricos,
pero (1) hoy solo hay que validar 1 variable de entorno (`VITE_API_URL`) —
~20 líneas de TypeScript puro lo cubren con tipado estricto; (2)
`docs/architecture.md` prohíbe añadir librerías nuevas sin necesidad
demostrada, y `docs/stack.md` registra la decisión como pendiente "si se
necesita validar datos de la API"; (3) todavía no se consume ningún endpoint,
así que no hay datos de API que validar. La decisión se **revisará** cuando la
primera feature consuma la API (validar respuestas del contrato es el caso
donde Zod sí paga su coste); queda anotado en `docs/stack.md` (R13).

### Clasificación por requirement

- **R1 — (humano).** Sale de "cuando arranca la app, la configuración por
  entorno está validada" (tipada = "configuración de variables de entorno
  tipada" del acceptance derivado del intent).
- **R2 — (humano).** Sale de "si falta algo obligatorio, falla al arrancar
  con un mensaje claro".
- **R3 — (añadido).** El humano habló de "falta algo obligatorio"; añado el
  caso *presente pero inválido* (URL no parseable) porque una URL rota
  produce el mismo daño que una ausente. ← REVISAR EN APROBACIÓN.
- **R4 — (humano).** Sale de "cuando arranca la app… falla al arrancar":
  la validación ocurre en el arranque, antes de montar la app.
- **R5 — (delegado).** Resuelve la decisión (a): clases exactas del patrón
  de `docs/conventions.md`.
- **R6 — (delegado).** Parte de la decisión (a): sin un normalizador, los
  valores lanzados que no son `AppError` romperían el "formato consistente".
- **R7 — (delegado).** Parte de la decisión (a): el `app.config.errorHandler`
  es el mecanismo idiomático de Vue para que el formato sea consistente "en
  toda la app", no solo donde se use try/catch.
- **R8 — (humano).** Sale de "el cliente HTTP … que todas las features
  posteriores reutilicen"; además `docs/stack.md` ya asigna
  `services/http.ts` a esta feature (#2). El cliente NO define endpoints
  (eso es de cada feature contra el contrato del backend).
- **R9 — (humano).** Intersección de "cliente HTTP" + "formato consistente
  de errores": la frontera HTTP debe emitir `ApiError`, no errores crudos.
- **R10 — (humano).** Igual que R9 para el fallo de red (caso de error del
  mismo camino).
- **R11 — (humano).** Sale de `que_no_quiero`: "No dejar la config con
  valores hardcodeados fuera del sistema de entorno".
- **R12 — (humano).** Sale de "cuando miro src/, la estructura por features
  ya está establecida".
- **R13 — (humano).** Sale de "… y documentada" + acceptance
  "docs/architecture.md actualizado con las decisiones tomadas".
- **R14 — (añadido).** El intent no menciona `./init.sh`; sale del
  `acceptance` ("al menos un test del camino feliz pasa con ./init.sh") y de
  la regla `require_tests_to_close` del harness. Hoy `init.sh` avisa
  "No hay comando de tests configurado" porque busca un script llamado
  exactamente `"test"`; se resuelve añadiendo `"test": "vitest run"` a
  `package.json` (la vía que sugiere `docs/verification.md`).
  ← REVISAR EN APROBACIÓN.
- **Sub-decisión dentro de R1–R4 — (añadido).** La primera (y única, por
  ahora) variable obligatoria concreta es `VITE_API_URL`. El humano no la
  nombró; la propongo porque el cliente HTTP (R8–R11) necesita una base URL
  del sistema de entorno y `docs/stack.md` ya la anticipaba ("lo esperable
  es añadir algo como VITE_API_URL"). ← REVISAR EN APROBACIÓN.
