# Resumen — feature 7 `api-types-and-net-worth-client`

Fecha de cierre: 2026-09-12
Intención original: `feature_list.json` → feature `api-types-and-net-worth-client`, bloque `intent`
Spec: no aplica (la feature no es SDD)

## Qué hace ahora la app que antes no

Ahora el frontend sabe pedirle el patrimonio al backend. Tiene sus propios tipos
de TypeScript para esa respuesta —escritos leyendo el contrato del backend, no de
memoria— y una función que la pide, la comprueba y te la devuelve ya con forma.
Antes este proyecto no consumía absolutamente nada de la API.

Y en desarrollo las llamadas a `/api` ya no se van directas al backend: salen
contra el propio servidor de Vite, que las reenvía al puerto 3000. Por eso no hay
error de CORS, que era el otro motivo de la feature.

Ojo con lo que **no** cambia: no hay pantalla todavía. Esto es solo la capa de
datos, lista para que la feature 9 la pinte.

## Por dónde se usa (puntos de entrada)

- `getNetWorth()` — pide `GET /api/net-worth` y devuelve un objeto `NetWorth`
  (importable desde `@/features/net-worth/service`). Acepta un cliente HTTP
  inyectado si algún día se quiere testear un store sin tocar globales.
- `parseNetWorth(raw)` — la misma comprobación, sin la llamada, por si conviene
  usarla suelta.
- Los tipos (`NetWorth`, `InvestmentProduct`, `NetWorthIssue`…) se importan de
  `@/features/net-worth/types`.
- `VITE_API_URL` ahora admite `/` además de una URL absoluta. Los cuatro `.env`
  del repo usan `/`.

## Dónde está el código (para revisión directa)

| Qué | Archivo:línea |
|-----|---------------|
| Los tipos propios de la respuesta | `src/features/net-worth/types.ts:91` (`NetWorth`) |
| La forma del producto según su `type` (unión discriminada) | `src/features/net-worth/types.ts:72` |
| Importes como string decimal | `src/features/net-worth/types.ts:7` (`DecimalString`) |
| La función que pide los datos | `src/features/net-worth/service.ts:218` (`getNetWorth`) |
| La comprobación de la respuesta | `src/features/net-worth/service.ts:204` (`parseNetWorth`) |
| La guarda que impide convertir un importe a número | `src/features/net-worth/service.ts:87` (`asDecimal`) |
| El proxy `/api` → `localhost:3000` | `vite.config.ts:20` |
| La base relativa admitida en la config | `src/shared/config.ts:49` |
| Test principal del servicio (11 tests) | `src/features/net-worth/__tests__/service.spec.ts:107` |
| Tests nuevos de la config | `src/shared/__tests__/config.spec.ts:26` y `:35` |
| La decisión y su trade-off, documentados | `docs/stack.md` → *Acceso a la API en desarrollo: proxy + base relativa* |

## Cumplimiento de la intención

Por cada punto del `como_se_que_esta_bien` del `intent`:

- ✅ **«Los campos coinciden exactamente con lo que el contrato dice, incluida la
  forma distinta de cada producto según su `type`»** → se cumple. Cotejado campo
  a campo contra `../gastos-backend/docs/api-contract.md` (líneas 1063-1190) y
  verificado en `src/features/net-worth/__tests__/service.spec.ts:122` (el
  ejemplo del contrato entero) y `:165` (un producto de cada tipo, con
  `expect(savings).not.toHaveProperty('marketValue')` para que un `null` nunca
  sea ambiguo). Además el revisor comprobó los tipos contra la **respuesta real**
  del backend en marcha: ni un campo declarado que la API no mande, ni un campo
  enviado que los tipos no declaren.
- ✅ **«Arranco `pnpm dev` con el backend en `:3000`, pido el patrimonio y me
  llegan los datos reales sin escribir la URL completa y sin CORS»** → se cumple.
  El proxy está en `vite.config.ts:20` y el revisor comprobó que
  `http://localhost:5173/api/net-worth` devuelve **el mismo cuerpo byte a byte**
  que `http://localhost:3000/api/net-worth`. Que la URL la construya el propio
  origen de la página (y no `:3000`) se verifica en
  `src/shared/__tests__/config.spec.ts:26`, que comprueba literalmente que `/`
  resuelto contra `http://localhost:5173` da `http://localhost:5173/api/net-worth`.
  **Matiz honesto:** la parte de «cero errores en la consola del navegador» la
  ejecutó el implementer en un navegador real; el revisor no tiene navegador y la
  respalda por equivalencia (una petición same-origin no dispara CORS), no por
  haberla visto.
- ✅ **«Los importes llegan y se guardan tal y como los manda la API; no se pierde
  ni un céntimo»** → se cumple. Todos los importes son `DecimalString`
  (`types.ts:7`) y en toda la feature **no hay ni un `Number(`, `parseFloat` ni
  `parseInt`** (comprobado con grep por el revisor). Más aún: `asDecimal`
  (`service.ts:87`) **rechaza** un número donde el contrato promete string, con
  test en `service.spec.ts:254`. Verificado también en
  `service.spec.ts:143` (todo importe es string de dos decimales) y con datos
  reales: el `total` llegó como `"90162.46"`, string.
- ✅ **«Cuando el contrato cambie, ajusto mis tipos y TypeScript me dice dónde se
  rompe»** → se cumple por construcción: los tipos son propios y viven en un
  único archivo (`types.ts`), `pnpm type-check` pasa en verde, y la deriva en
  **tiempo de ejecución** también avisa: `parseNetWorth` lanza un
  `ValidationError` que nombra el campo exacto (`investments.products[0].type
  is not one of …`), con test en `service.spec.ts:263`.
- ✅ **«Los tests del servicio pasan con la frontera HTTP mockeada, sin backend
  real»** → se cumple. `service.spec.ts:101` mockea **solo** `globalThis.fetch` y
  deja correr el cliente HTTP de verdad, así que los tests también verifican la
  URL que se construye. Suite completa reejecutada por el revisor: **62 tests en
  7 archivos**, y `./init.sh` verde de punta a punta (type-check + unitarios +
  e2e de humo).

## Decisiones que se tomaron por ti

Lo que el `intent` dejaba en manos del agente (`delego_en_agente`):

- (delegado) **Cómo modelar que la forma del producto depende de su `type`:**
  unión discriminada (`types.ts:72`). Así un `savings_account` ni siquiera tiene
  la propiedad `marketValue`, y el `value` de un `deposit` no es nullable porque
  un depósito vale su `principal` mientras vive.
- (delegado) **El choque entre el proxy y `appConfig.apiUrl`:** se admite una
  base *root-relative* en la configuración (`src/shared/config.ts:49`) y los
  `.env` pasan a `VITE_API_URL=/`. Se descartó apuntar la variable a
  `http://localhost:5173` porque ataría la config a un puerto concreto: si el
  5173 está ocupado, Vite arranca en el 5174 y todas las llamadas se irían al
  servidor equivocado sin un error claro. El coste aceptado: `apiUrl` deja de ser
  literalmente lo que pone el `.env` (se resuelve contra el origen), y un
  despliegue con la API en otro origen tendrá que escribir la URL absoluta y
  habilitar CORS. Todo escrito en `docs/stack.md`.
- (delegado) **Tipar otros endpoints: no.** Solo patrimonio. `/api/overview` e
  `/api/investments/overview` son bastante mayores y ninguna pantalla los usa
  todavía: se habrían desfasado antes de estrenarse.
- (delegado) **Se tocaron los `.env`:** los cuatro (`development`, `test`,
  `production`, `example`) pasan a `/`, con el comentario que explica las dos
  formas admitidas.
- (añadido) **La respuesta se comprueba, no se castea.** No estaba pedido: en vez
  de un `as NetWorth` a ciegas, `parseNetWorth` recorre el JSON y lanza
  `ValidationError` con la ruta del campo que falla. Sin dependencias nuevas
  (nada de Zod), y con eso queda revisada la decisión que ADR-004 dejó pendiente
  «para cuando se consuma la API».

## Qué NO se tocó / quedó fuera

- **No hay pantalla ni store.** Es solo capa de datos; el estado
  (`loading`/`error`) y la vista son la feature 9 (`net-worth-view`).
- **No se tocó `src/services/http.ts`**: se reutiliza tal cual, y sigue habiendo
  **un solo `fetch` en todo `src/`**.
- **No se tocó nada del backend.** El contrato se leyó, no se editó.
- **Cero dependencias nuevas.** `package.json` no cambia.
- El `bank` de una cuenta o un producto se tipa como `string`, no como enum: el
  backend descubre los bancos dinámicamente.

## Notas para el futuro (opcional)

- **El camino de `investments.issues` no se ha visto con datos reales**: la base
  de hoy devuelve la lista vacía. Está cubierto por el test con el ejemplo del
  contrato (los tres motivos, `service.spec.ts:221`), lo cual basta para esta
  capa, pero cuando la feature 9 pinte los avisos conviene provocar uno real
  (un producto sin valoración) y verlo en pantalla una vez.
- **En producción `VITE_API_URL=/` asume que la app se sirve desde el mismo
  origen que la API.** Si algún día no es así, hay que poner la URL absoluta ahí
  y habilitar CORS en el backend.
- `vite.config.ts` no pasa `prettier --check` porque `pnpm format` solo cubre
  `src/`. Viene de antes de esta feature; merece su propia tarea de
  mantenimiento.
