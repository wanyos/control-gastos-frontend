# unit-tests-no-network — implementación

Primera mitad del cabo 9 de `docs/roadmap.md`: ningún test unitario puede llegar a
la red. No es una feature de `feature_list.json` y no cambia nada de lo que ve el
usuario. No se ha escrito en la base de datos ni en las carpetas de datos del
humano. No se ha tocado `docs/roadmap.md`. Sin commits.

## Cómo estaba antes (comprobado)

- `vitest.config.ts`: `environment: 'jsdom'`, sin `setupFiles`. No había nada global
  que interceptara `fetch`.
- `mockBackend` (uno por feature, en `src/features/*/__tests__/fixtures.ts`) hace
  `vi.spyOn(globalThis, 'fetch').mockImplementation(...)` y rechaza lo que no
  espera; los tests lo deshacen con `vi.restoreAllMocks()`, que devolvía el `fetch`
  real de Node.
- Prueba de usar y tirar (`probe.spec.ts`: un `fetch` de
  `new URL('/api/movements', location.origin)` sin mock, que registra lo que pasa y
  se traga el error). El archivo vive en la carpeta temporal de la sesión; para
  ejecutarlo hubo que copiarlo a `src/__probe_tmp__/` (vitest no carga un spec
  fuera del proyecto: `Cannot find module '/@fs/C:/…/scratchpad/…'`) y la carpeta se
  borró después. Con el backend parado (`netstat` sin nada en `:3000`):

  ```
  origin http://localhost:3000 fetch is native? function fetch(input, init = undefined) { …
  REJECTED TypeError fetch failed cause: ECONNREFUSED
  Tests  1 passed (1)
  ```

  Con un servidor de prueba propio (`node listen.mjs`, escucha en `127.0.0.1:3000`
  y responde `{"probe":true}`, nada del backend real) en lugar del backend:

  ```
  RESOLVED 200
  Tests  1 passed (1)
  --- listener log:
  listening
  LISTENER GOT GET /api/movements
  ```

  Es decir: la petición salía de verdad a `localhost:3000`, y el test pasaba.

## Archivos modificados / creados

- `src/__tests__/no-network.ts` (nuevo): se carga antes de cada archivo de test.
  Sustituye `globalThis.fetch` por una función que anota `MÉTODO /ruta?query` y
  rechaza con `TypeError('Unit tests do not reach the network: no mock answered GET /api/…')`.
  Igual con `XMLHttpRequest` (lanza en `send`, solo si existe: los archivos con
  `// @vitest-environment node` no lo tienen), `WebSocket`, `EventSource` y
  `navigator.sendBeacon`. Un `afterEach` hace fallar el test si quedó alguna
  petición anotada, con el método y la ruta; un `afterAll` hace lo mismo con las que
  lleguen después del último test del archivo. Exporta `takeUnansweredRequests()`,
  que solo usa su propio test.
- `vitest.config.ts`: `setupFiles: ['src/__tests__/no-network.ts']`.
- `src/__tests__/no-network.spec.ts` (nuevo): 6 tests (ver abajo).
- `docs/conventions.md` (sección *Tests*) y `docs/verification.md` (debajo del
  comando de los tests unitarios): ver *Documentos actualizados*.

## Decisiones tomadas

- **Rechazar no basta; el fallo se produce después de cada test.** El cliente HTTP
  (`createHttp`) convierte el rechazo en `ApiError(API_NETWORK)` y la vista lo
  muestra, así que un test que no mire el error seguiría en verde. Por eso la
  petición se anota y el `afterEach` del archivo de setup es el que pone el test en
  rojo.
- **Asignación directa, no `vi.stubGlobal`.** Si el setup usara `vi.stubGlobal`, un
  test que llame a `vi.unstubAllGlobals()` (hay uno) devolvería el `fetch` real.
  Con asignación directa, tanto `vi.restoreAllMocks()` como `vi.unstubAllGlobals()`
  devuelven la función que rechaza.
- **El archivo de setup vive en `src/__tests__/`** para que lo compruebe
  `tsconfig.vitest.json` (incluye `src/**/__tests__/*`) y lo excluya
  `tsconfig.app.json`; no se llama `.spec.ts`, así que vitest no lo toma como test.
- **También `XMLHttpRequest`, `WebSocket`, `EventSource` y `sendBeacon`**: la app
  solo usa `fetch` (`git grep` no encuentra ninguno de los otros en `src/`), pero el
  encargo pide que ningún test pueda llegar a la red.
- **Límite conocido:** una petición que salga entre dos tests (una promesa que
  sigue viva tras terminar el suyo) se atribuye al test siguiente, o al `afterAll`
  si era el último. No llega a la red en ningún caso.

## Tests que hablaban con la red

**Ninguno.** Con la sustitución puesta, la suite entera pasó sin cambiar ningún
test: `Test Files 133 passed`, `Tests 2145 passed | 1 expected fail`. Los 2140
tests que ya existían siguen en verde, así que ninguno enviaba una petición sin
mock. (Una primera pasada dio 3 archivos rojos por `ReferenceError: XMLHttpRequest
is not defined`: eran los tres archivos con `// @vitest-environment node`, y el
fallo era mío; se corrigió comprobando antes si `XMLHttpRequest` existe.)

## Test que demuestra la sustitución (`src/__tests__/no-network.spec.ts`)

- `refuses an unmocked fetch, naming the method and the path`: GET con query,
  PATCH con cuerpo y un `Request` POST; los tres rechazan con método y ruta y quedan
  anotados.
- `writes down the request even when the code under test swallows the rejection`:
  a través de `createHttp`, sale `API_NETWORK` y la petición queda anotada.
- `refuses the other ways a page opens a connection`: XHR, WebSocket, sendBeacon.
- `lets a mock answer, and brings back the refusal, not the real fetch, when the mock is restored`.
- `a spy that does not answer passes the request on to the refusal`.
- `it.fails('fails a test whose request no mock answered, even if the test swallows it')`:
  el test hace una petición sin mock, se traga el error y comprueba que es un
  `ApiError`; solo el `afterEach` lo pone en rojo, y `it.fails` lo cuenta como
  esperado. Comprobado que depende de verdad del `afterEach`: cambiando
  temporalmente la petición por un `Promise.reject(new ApiError(…))` (sin red), la
  pasada sale `Error: Expect test to fail`, `Tests 1 failed | 5 passed (6)`. Se
  restauró el archivo.

## Prueba del caso a propósito

Con la protección puesta y el mismo `probe.spec.ts` copiado a `src/__probe_tmp__/`:

Con el servidor de prueba propio escuchando en `:3000`:

```
REJECTED TypeError Unit tests do not reach the network: no mock answered GET /api/movements cause: undefined undefined
 FAIL  src/__probe_tmp__/probe.spec.ts > probe: unmocked fetch
Error: During this test, a request was sent that no mock answered (unit tests never reach the network): GET /api/movements
 Test Files  1 failed (1)
vitest exit 1
--- listener log:
listening
```

El servidor no recibió nada (solo su línea de arranque).

`./init.sh` completo con ese archivo puesto: **código de salida 1**.

```
Error: During this test, a request was sent that no mock answered (unit tests never reach the network): GET /api/movements
 Test Files  1 failed | 133 passed (134)
      Tests  1 failed | 2145 passed | 1 expected fail (2147)
[FAIL]  Hay tests rotos
[FAIL]  Entorno NO está listo. Resuelve los errores antes de avanzar.
```

(En esa misma pasada el lint también salió en rojo por tres avisos de oxlint en mis
archivos nuevos —`no-extraneous-class` en dos clases y `expect-expect` en el
`it.fails`—; se corrigieron antes de la pasada final.) Después se borró
`src/__probe_tmp__/`.

## Documentos actualizados

`git grep -n -i "localhost:3000\|sin mock\|olvid\|setupFiles\|no-network\|salga a la red\|llegar a la red\|a la red" -- . ':!progress' ':!specs' ':!docs/roadmap.md'`:
ninguna línea se ha vuelto falsa (las de `localhost:3000` hablan del proxy y de
`VITE_API_URL`; `docs/stack.md:878` dice que Vitest 5 no exigió cambios en
`vitest.config.ts`, y eso sigue siendo cierto en la feature #12). Los comentarios
de los `mockBackend` («nothing may leave for real…») siguen siendo ciertos.

Añadido, porque deberían decirlo:

- `docs/conventions.md`, sección *Tests*: bullet «Ningún test unitario sale a la
  red», con qué archivo lo hace, cómo se responde una petición en un test y que no
  se desactiva para ningún test.
- `docs/verification.md`, debajo del comando `pnpm test:unit`: nota de que desde el
  2026-11-04 una petición sin mock hace fallar su test, con puntero a
  `docs/conventions.md`.

`docs/roadmap.md` no se ha tocado, como se pidió.

## Último `pnpm test:unit`

```
pnpm test:unit
 Test Files  133 passed (133)
      Tests  2145 passed | 1 expected fail (2146)
exit 0
```

## Último ./init.sh

Sin el archivo de prueba, tras todos los cambios: **código de salida 0**.

```
[OK]    Type check OK (tsc sin errores)
[OK]    OK: pnpm lint:oxlint:check
[OK]    OK: pnpm format:check
 Test Files  133 passed (133)
      Tests  2145 passed | 1 expected fail (2146)
[OK]    Todos los tests pasan
[OK]    OK: pnpm type-check (vue-tsc --build, incluye los .vue)
[OK]    E2E smoke verde (chromium)
[OK]    Entorno listo. Puedes empezar a trabajar.
```

## Sugerencias fuera de scope (NO aplicadas)

- Ninguna.
