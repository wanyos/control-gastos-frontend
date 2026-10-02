# Roadmap — por dónde va el frontend

> **Para qué sirve este archivo:** para saber en dos minutos **dónde estás**,
> **qué viene después** y **por qué en ese orden**. Es el mapa del recorrido
> completo, no el detalle de ninguna parada.
>
> **Última revisión:** 2026-10-02.

## Este documento frente a los otros

| Documento | Responde a | Alcance temporal |
|---|---|---|
| `../docs/ideas.md` (workspace) | ¿Qué quiero que haga la app? | Producto, sin fecha |
| **`docs/roadmap.md`** (este) | **¿Por dónde voy y qué falta?** | **Todo el recorrido** |
| [`feature_list.json`](../feature_list.json) | ¿Qué hace exactamente la feature N? | Una feature |
| [`progress/current.md`](../progress/current.md) | ¿En qué quedó la última sesión? | Una sesión |
| [`progress/history.md`](../progress/history.md) | ¿Qué pasó y cuándo? | Bitácora, append-only |

**Regla de convivencia:** este archivo **no repite** el contenido de los otros,
enlaza a ellos. Si una etapa necesita más de cinco líneas aquí, es que su sitio
es el `intent` de una feature.

---

## Dónde estás ahora mismo 📍

**Ya hay aplicación, y ya escribe.** 25 features cerradas. Las pantallas que
existen: **Patrimonio** (F9), **Review** con su cola, filtros y búsqueda (F15) y sus
acciones de categorizar y confirmar (F16), **Rules** con las reglas de categorización
y su previsualización (F17, F18), el **botón de importar** con su informe (F13, F14),
el **extracto mes a mes** en `/movements` con sus filtros, su búsqueda, la corrección de
categoría desde la propia línea, el marcado en bloque de lo que no cuenta en las sumas y el
interruptor que esconde ese ruido (F19, F20, F21, F22, F23), **Transfers** en
`/transfers`, para revisar las parejas de traspaso, deshacer las falsas y emparejar las
dudosas (F24) y, nueva, **Overview** en `/overview`, que deja de ser un placeholder y
enseña el mes de un vistazo: una frase interpretada, lo que entró, lo que salió, el ahorro
y si fue un mes habitual (F25).
Etapas E0 a E7 cerradas; **la E8 está a medias**, con su primera feature cerrada.

**Lo siguiente en la E8** (plan aprobado por el humano el 2026-10-02): **la tira del año**
en la misma pantalla `Overview`, y **lo que ganó cada depósito** en Patrimonio. Detalle en
la sección de la E8.

**El ruido de las sumas está resuelto en el extracto.** La **F22** (cerrada el
2026-09-29) permite marcar movimientos como que no cuentan, de uno en uno o en bloque, y
**los 29 apuntes de depósito ya están marcados**: el histórico pasa de 446.014 / 439.372 €
a **170.512 / 154.522 €**, y julio de 2026 de 57.948 / 59.096 € a **2.785,90 /
4.096,05 €**. La parte 1 de `../docs/handoff-sumas-honestas.md` está servida por la
**feature 49 del backend** (respuestas con `excludedFromTotals`, filtros
`transfer=only|none` y `excluded=only|none`, y escritura de la marca). Y desde la **F23**
(cerrada el 2026-09-30) ese ruido además se **esconde**: la lista y las cifras por fin
cuentan lo mismo. **La E8, los dashboards, hereda estas cifras**, que ya son las buenas:
**ya no está bloqueada por las sumas**, se resolvió con las F22 y F23.

**Lo que queda abierto:**

- ⚠️ **La comparación «mes habitual» de `Overview` tiene un límite conocido.** Enero de
  2026 sale «53,5 % menos de lo habitual» porque siete de los doce meses anteriores están
  inflados por traspasos a cuentas propias de inversión sin marcar. Se corrige marcándolos
  desde el extracto, no con código (detalle en la E8).

- ⚠️ **La cola de revisión esconde dos movimientos.** `GET /api/movements` con
  `pageSize=100` devuelve 1.605 movimientos distintos de 1.607. Es un fallo de paginación
  del backend, encargado en `../docs/handoff-paginacion-estable.md`; hasta que lo arregle,
  sigue así (cabo 7).
- `GET /api/investments/deposits` (feature 50 del backend) está servido y **sin usar**:
  es una de las dos features siguientes de la E8, en Patrimonio.

---

## El recorrido en etapas

Leyenda: ✅ hecho · 🟡 a medias · ⬜ sin empezar · ⚠️ hecho con deuda

| # | Etapa | Estado | Features |
|---|---|---|---|
| E0 | **Cimientos** — arranque, errores, config, cliente HTTP | ✅ | F1, F2 |
| E1 | **El aspecto** — Tailwind, tokens del diseño, smoke e2e, tema oscuro | ✅ | F3, F4, F5, F6, F10 |
| E2 | **Tipos y cliente tipado** — tipos propios a partir del contrato + proxy | ✅ | F7 |
| E3 | **Shell de la aplicación** — sidebar, topbar, rutas base | ✅ | F8 |
| E4 | **Vista de Patrimonio** — la primera pantalla, contra GET /api/net-worth | ✅ | F9 |
| E5 | **La pantalla que dispara la ingesta** — aviso de «N nuevos» + botón importar | ✅ | F13, F14 |
| E6 | **Revisar antes de confirmar** — la pantalla de lo importado pendiente | ✅ | F15, F16, F17, F18 |
| E7 | **El extracto** — tabla con filtros y búsqueda: el histórico completo | ✅ | F19, F20, F21, F22, F23, F24 |
| E8 | **Los dashboards** — ingresos vs gastos, saldo por cuenta, patrimonio | 🟡 | F25 |
| E9 | **Que esto se vea desde algún sitio** — despliegue y acceso | ⬜ | *sin etapa hasta hoy* |

### E0 — Cimientos ✅

Vue 3 + TypeScript, router, manejo de errores
([`src/shared/errors.ts`](../src/shared/errors.ts)), configuración por entorno
([`src/shared/config.ts`](../src/shared/config.ts)) y el cliente HTTP
([`src/services/http.ts`](../src/services/http.ts)) que consumirán todas las
features. `src/features/` está creada y **vacía**.

### E1 — El aspecto ✅

Tailwind configurado, los tokens del diseño cargados como CSS
([`src/assets/styles/tokens/`](../src/assets/styles/tokens/)), el
[`design-system/`](../design-system/) con sus fichas, la lista blanca de fuentes
que Tailwind escanea, y un e2e que comprueba que la app monta de verdad.
Desde el 2026-09-13 (F10) la app es **solo oscura**: el tema redefine los tokens
semánticos en `src/assets/theme-dark.css`, así que todo componente que use alias
semánticos sale oscuro (regla en `docs/conventions.md`).

### E2 — Tipos y cliente tipado ✅

Leer el contrato del backend (`../gastos-backend/docs/api-contract.md`),
definir **los tipos propios** de este proyecto a partir de él (no se comparten
con el backend, ver [`docs/related-projects.md`](./related-projects.md)),
dejar el cliente HTTP tipado contra ellos y configurar el proxy de Vite para
desarrollo. Cerrada el 2026-09-12 por la F7: tipos de `GET /api/net-worth`
en `src/features/net-worth/`, servicio sobre `src/services/http.ts`, proxy de
`/api` en `vite.config.ts` y `VITE_API_URL=/` (base relativa admitida en
`loadConfig`, trade-off en [`docs/stack.md`](./stack.md)). Cierra el cabo
suelto 1 y, de paso, el 2.

### E3 — Shell de la aplicación ✅

Sidebar + topbar + `RouterView` portados del design system a Vue3, textos en
inglés. Cerrada el 2026-09-12 por la F8: shell en `src/shared/components/`,
rutas en `src/router/index.ts` (`/` → `/net-worth`; placeholders `/overview`,
`/movements`, `/investments`, `/import`), Lucide vía `@lucide/vue`, `index.html`
con `lang="en"`. Sin página 404 todavía.

### E4 — Vista de Patrimonio ✅

La primera pantalla contra `GET /api/net-worth`. Bloque A (cifra total y
frase interpretada), bloque B (reparto por naturaleza y por banco) y bloque
E (detalle por banco y producto). Avisos de `investments.issues`. Portar
`StatCard`, `AccountCard`, `Card` y `Badge` del design system. Barras
horizontales, no donut. Cerrada el 2026-09-12 por la F9: cifras y porcentajes
en es-ES (`1.234,56 €`, `38,3 %`), fechas en-GB (`12 Sept 2026`), 4 grupos por
tipo, total leído de la API. Spec en `specs/09-net-worth-view/`. «Desde cuándo hay
dato» queda fuera: la API no lo trae (cabo 4).

> Los bloques C (cascada) y D (evolución) esperan a que el backend exponga
> patrimonio a una fecha o como serie histórica.

### E5 — La pantalla que dispara la ingesta ✅

Es la razón de ser de la idea nº 1 y **el backend ya tiene los dos endpoints**:
`GET /api/ingestion/pending` (el aviso de «N nuevos» al abrir) y
`POST /api/import` (el botón). Separadas a propósito: detectar es barato y
automático; importar es explícito y revisado.

> Corregido el 2026-09-15: el botón **no** es `POST /api/ingestion/process`, que
> desde la feature «import» del backend solo descarga y copia. `POST /api/import`
> es síncrono (sin progreso por archivo) y devuelve el informe completo.
> Decisiones del humano: progreso por fases, botón en la barra superior (se
> retira `/import` de la sidebar) y aviso incluido. Features **F13**
> `import-dialog` y **F14** `import-report-details`, ambas SDD.
>
> **F13 cerrada el 2026-09-15:** botón y aviso en la barra, modal por fases y
> resumen; probada contra el backend real (un archivo ya importado → 35
> duplicados). **F14 cerrada el mismo día:** detalle plegable de lo que conviene
> revisar (fallos de pasadas finales, descuadres, líneas no leídas, traspasos por
> emparejar, conflictos de reglas, archivos importados); solo lectura. Resolver
> traspasos y conflictos desde la web queda para etapas posteriores.

### E6 — Revisar antes de confirmar ✅

Todo lo que importe el backend nace en estado `pending_review`. Esta pantalla es
la que lo confirma o lo corrige. El endpoint `PATCH /api/movements/:id` ya
existe (feature 37 del backend).

> ✅ **Desbloqueada el 2026-09-18** por la feature 47 del backend
> (`movements-review-bulk`): `GET /api/movements` filtra además por `categoryId`,
> `uncategorized=true` y `q` (trozo de la descripción, sin mayúsculas ni tildes),
> y `PATCH /api/movements` aplica `status` y/o `categoryId` a una lista de hasta
> 200 ids, todo o nada, devolviendo los movimientos ya cambiados. La variante «por
> filtro» se descartó, y para crear reglas se usa `POST /api/category-rules`.
>
> Parte 2 del traspaso hecha: **F15** `review-queue` (la cola con filtros,
> búsqueda y totales, solo lectura) y **F16** `review-actions` (categorizar y
> confirmar, uno a uno y en bloque). Emparejar traspasos ambiguos y resolver
> conflictos de reglas queda para una feature posterior.
>
> **F15 cerrada el 2026-09-20:** `/review` con la cola, filtros en la URL,
> búsqueda por descripción, 100 por página y contador en la sidebar. Probada
> contra el backend real: 1.607 pendientes, 1.379 sin categoría y la búsqueda
> encontrando con y sin tildes, todo igual que la API. **F16 cerrada el
> 2026-09-22:** categorizar y confirmar uno a uno y en bloque (hasta la página
> entera), con deshacer y la cola y el contador al día sin recargar. Probada
> contra el backend real sobre un solo movimiento: categorizar, confirmar y
> deshacer, la cola bajando de 1.607 a 1.606 y volviendo.
>
> **F17 cerrada el 2026-09-22:** crear reglas desde un movimiento, la pantalla `Rules`
> (`/rules`) para verlas, cambiarlas y borrarlas, y aplicarlas sobre lo pendiente con
> `POST /api/category-rules/apply` bajo confirmación, viendo todos los conflictos sin
> resolverlos. Es lo que hace que categorizar sirva para las próximas importaciones.
> Probada contra el backend real: la regla `tulotero` → Ocio, creada desde Review y
> aplicada, dio «5 movements categorized · 1372 still without a matching rule ·
> 1 conflict» y la API confirmó esos mismos cinco movimientos. Spec en
> `specs/17-category-rules/`.
>
> **F18 cerrada el 2026-09-24:** al escribir el texto de una regla, el propio diálogo
> dice a cuántos movimientos pendientes sin categoría afectaría y enseña hasta cinco,
> avisando si casan demasiados o ninguno sin impedir guardar; además mejora el texto
> que propone por defecto. Solo lectura: la única petición es `GET /api/movements`.
> Comprobada con el humano delante sobre 14 conceptos reales, coincidiendo con la API
> en todos. Spec en `specs/18-rule-match-preview/`. Queda una deuda anotada: la
> propuesta arrastra papeleo («ANUL. /VivaGym») y sigue floja con nombres de canal
> («TRANS INM/ N26», «TPV VIRTUAL»).
>
> Con la F17 la E6 quedó cerrada y la F18 la remata. Emparejar traspasos ambiguos y
> resolver los conflictos de reglas desde la web siguen fuera: son features posteriores.

### E7 — El extracto ✅

La tabla tipo extracto con búsqueda y filtros por fecha, cuenta, categoría y
texto: la vista del histórico completo, confirmados incluidos.

> ✅ **Servida por el backend, comprobado el 2026-09-22.** `GET /api/movements`
> filtra por `accountId`, `from`, `to`, `type` y `status` (feature 36 del backend) y,
> desde su feature 47, también por `categoryId`, `uncategorized` y `q` (trozo del
> concepto, sin mayúsculas ni tildes). La F15 ya usa los seis contra el backend real,
> así que esta etapa no está bloqueada por nada.
>
> **Filtro por forma de pago: no existe ni va a existir.** `Movement.paymentMethod`
> se quedó sin fuente y el histórico del Excel está descartado (decisión del humano,
> 2026-09-22: no se va a hacer nada con él). Esta etapa no debe prometerlo.
>
> **F19 cerrada el 2026-09-26** — primera rodaja: `/movements` deja de ser placeholder y
> es el extracto mes a mes. Entras y ves el mes en curso entero (pendiente y confirmado,
> sin filtrar), con `Money in`, `Money out` y `Difference` tal como los calcula el
> backend, la lista agrupada por días con marca `Transfer`, flechas y selector de mes, y
> el mes vivo solo en la URL (`/movements?month=2026-03`). Solo lectura: una petición
> `GET /api/movements` por mes. Comprobada con el humano delante contra el backend real:
> seis meses (2026-09, 2026-07, 2026-03, 2025-12, 2024-01 y 2023-05, vacío) coincidiendo
> al céntimo con la API, y las 11 marcas `Transfer` de diciembre de 2025 iguales a sus 11
> `transferId`. Spec en `specs/19-statement-by-month/`.
>
> ⚠️ ~~**Las sumas que hoy enseña la pantalla están infladas por los depósitos**~~ —
> **resuelto el 2026-09-29 por la F22**: los 29 apuntes de depósito de myinvestor
> (285.000 €, el 58 % de la base) ya están marcados y no cuentan. La parte 1 de
> `../docs/handoff-sumas-honestas.md` la sirvió la feature 49 del backend
> (`excludedFromTotals`, filtros `transfer=only|none` y `excluded=only|none`, y la marca
> escribible) y la F22 es la feature del frontend que la usa. La nota fija de la pantalla,
> que decía que las cifras estaban infladas, **la reescribió la F23** y ya no lleva
> ninguna cifra clavada.
>
> **F20 cerrada el 2026-09-27** — segunda rodaja: dentro del mes hay una barra con cuatro
> controles (buscador por un trozo del concepto, cuenta, categoría y una casilla
> `Uncategorized`) que afinan el mes sin sacarte de él. Las tres cifras pasan a ser las de
> lo filtrado, siempre calculadas por el backend, y debajo aparece una línea que dice qué
> has filtrado y cuántos movimientos son. Los cuatro filtros y el mes viven solo en la URL
> (`/movements?month=2026-03&account=2&uncategorized=true&q=luz`), con las mismas claves que
> la cola de revisión; hay `Clear filters` que no reinicia el mes, y una URL con categoría y
> «sin categoría» a la vez se corrige antes de pedir nada. Sigue siendo solo lectura, con
> una llamada nueva, `GET /api/accounts`, para llenar el desplegable. La lógica compartida
> se mudó a `src/shared/movement-filters.ts` y la cola la re-exporta, sin cambiar de
> comportamiento. Comprobada con el humano delante contra el backend real: ocho
> combinaciones de filtros, cifras y recuento cuadrando en las ocho, y la URL imposible
> corregida antes de salir la petición. Spec en `specs/20-statement-filters/`.
>
> 💡 **Lo que enseñó esa prueba:** julio de 2026 filtrado por la cuenta **n26** son 221,45 €
> de entrada y 1.038,07 € de salida, cuando el mes entero lee 57.948 € y 59.096 €; por
> **myinvestor** salen 55.169 € y 55.357 €, que es el depósito rodando. Hasta que el frontend use la
> marca del backend, **filtrar por cuenta es la única forma de ver el gasto real**.
>
> **F21 cerrada el 2026-09-27** — tercera rodaja, y la primera vez que el extracto
> **escribe**: la etiqueta de categoría de cada línea es un botón que se convierte, en su
> mismo sitio, en un desplegable con las categorías del tipo de ese movimiento (más
> `No category`); eliges y se guarda solo, esté pendiente o confirmado, con un único
> `PATCH /api/movements/:id` cuyo cuerpo es **solo `categoryId`** — el estado no puede viajar.
> Del mismo editor cuelga `Create rule`, el diálogo de la F17 con la previsualización de la
> F18. Bajo las cifras hay una línea fija que dice qué hizo la última corrección, con
> `Undo` sin cuenta atrás. Si hay filtro de categoría puesto, la línea corregida desaparece
> al momento y las cifras se vuelven a pedir al backend; sin filtro no se pide nada porque no
> cambian. La mitad de escritura (`updateMovement`, `needsReload`) bajó a
> `src/shared/movements.ts` y la cola la re-exporta, sin cambiar de comportamiento.
> Comprobada contra el backend real con el humano delante: movimiento 32428, cambio a
> Vivienda y deshacer, dos `PATCH` con solo `categoryId`, el antes y el después idénticos
> salvo `updatedAt` y cero errores. Spec en `specs/21-statement-fix-category/`.
>
> **F22 cerrada el 2026-09-29** — cuarta rodaja, y la primera vez que el extracto **mueve
> las cifras**: en `/movements` hay un botón `Select movements` que saca una casilla en
> cada línea y una barra arriba; marcas las que quieras y `Exclude from totals` las aparta
> de las sumas (`Include in totals` las devuelve). Lo marcado **sigue en la lista**, con
> una etiqueta gris `Not counted` y el importe apagado, y las tres cifras del mes se
> vuelven a pedir al backend, así que bajan de verdad. Una sola petición
> `PATCH /api/movements` con el cuerpo **solo `{ ids, excludedFromTotals }`**, pregunta de
> confirmación a partir de 20 movimientos y `Undo` sin cuenta atrás sobre exactamente los
> que cambiaron. Nada marca nada por su cuenta: la marca la escribe siempre el humano.
> Comprobada contra el backend real con el humano delante: movimiento 42373, la entrada de
> agosto bajando de 2.590,26 € a 2.240,26 € al marcarlo y volviendo al deshacer, con dos
> `PATCH` en bloque de cuerpo limpio. Spec en `specs/22-statement-exclude-from-totals/`.
>
> 💡 **Los 29 apuntes de depósito ya están marcados** (los marcó la sesión del backend al
> probar su feature 49 contra datos reales): el histórico pasa de 446.014 / 439.372 € a
> **170.512 / 154.522 €**, y julio de 2026 de 57.948 / 59.096 € a **2.785,90 /
> 4.096,05 €**. Filtrar por cuenta ya no es la única forma de ver el gasto real.
>
> **F23 cerrada el 2026-09-30** — quinta rodaja, y la que hace que la lista y las cifras
> cuenten lo mismo: encima de las tres cifras hay una casilla `Hide what does not count`
> que esconde a la vez lo marcado en la F22 y las dos piernas de cada traspaso, pidiéndolo
> al backend con `excluded=none&transfer=none` (los filtros del contrato que seguían sin
> usar). A su lado, `Hiding N movements`, un número del backend —la resta de dos
> recuentos suyos, con una sola lectura extra de una fila—; el **importe no se dice**,
> porque cuando a la API se le pide solo lo apartado devuelve las sumas a cero y
> calcularlo aquí sería aritmética inventada. **Las tres cifras no se mueven** al ponerla:
> el backend nunca contó ni los traspasos ni lo marcado, lo que estaba roto era la lista.
> El interruptor vive en la URL (`/movements?month=2026-07&hide=true`), empieza siempre
> apagado, sobrevive al cambio de mes y a la recarga, y `Clear filters` no lo apaga.
> Solo lectura: no escribe ni un campo. Además **reescribe entera la nota permanente de la
> F19**, que ya no dice que las sumas estén infladas y **no lleva ninguna cifra clavada**:
> la única cifra viva es el recuento de grupos que parecen traspasos y no se pudieron
> emparejar solos, que se pide una vez por sesión y, si falla o vale cero, no se dice.
> Comprobada contra el backend real con el humano delante: cinco vistas cuadrando, julio
> pasando de **93 a 79 filas sin que cambien las sumas**, la nota sin un solo dígito y sin
> botón de cerrar, y una sola petición de dudosos por sesión.
> Spec en `specs/23-statement-noise-toggle/`.
>
> **F24 cerrada el 2026-10-02** — sexta rodaja, la que cierra la etapa, y la primera
> pantalla que **corrige la detección de traspasos**: `Transfers` (`/transfers`, en la
> barra lateral justo debajo de `Rules`) lista todas las parejas enlazadas con sus dos
> patas (fecha, cuenta, concepto e importe) y una etiqueta `Bizum` en las que llevan uno,
> sin reordenar ni esconder nada. `Unlink` pregunta antes y manda
> `DELETE /api/transfers/:transferId`; encima van los grupos dudosos en dos columnas,
> `Money out` y `Money in`, y `Link these two` manda `POST /api/transfers` con **solo
> `movementIds`**. Las dos acciones dejan un `Undo`. Al abrir solo lee:
> `GET /api/transfers` y `GET /api/transfers/ambiguous`, cuyas rutas viven ahora en
> `src/shared/transfers.ts`, compartidas con el extracto. No toca importes, fechas,
> categorías, estado ni la marca de no contar.
> Comprobada contra el backend real con el visto bueno del humano, **con una variante
> distinta de la del spec** (no se volvió a enlazar la multa de 100 €): se deshizo y se
> rehízo una pareja buena, la 42369/42519 (1.000 € de bankinter a n26, 9 de septiembre de
> 2026). Al deshacer, septiembre pasó de 161,82 / 966,84 € a **1.161,82 / 1.966,84 €**
> —exactamente 1.000 por lado— y de 38 parejas a 37; con `Undo` volvió a 161,82 /
> 966,84 € y a 38. Solo cambiaron `transferId` y `updatedAt`; dos escrituras, cero errores.
> Spec en `specs/24-transfer-pairs-review/`.
>
> ⚠️ **Lo que esa prueba no cubre:** **emparejar dudosos solo está probado con datos
> fabricados**, porque en los datos reales hay 0 grupos dudosos. Y las dos multas que
> motivaron la feature **ya estaban deshechas antes** (las deshizo la sesión del backend
> el 2026-09-28): la pantalla queda para la próxima vez que la detección se equivoque.
>
> **Con la F24 la E7 queda cerrada.** No falta nada en esta etapa.
>
> **La parte del backend del traspaso `../docs/handoff-sumas-honestas.md` está cerrada**
> (features 49 y 50, commits `7711063` y `a6195be`). De ahí queda **sin usar en el
> frontend** la feature 50: `GET /api/investments/deposits`, lo que ganó cada depósito,
> que no encaja aquí sino en la **E8**.
>
> ⚠️ **Abierto fuera de la etapa: la paginación del backend.** `GET /api/movements` con
> `pageSize=100` devuelve 1.605 movimientos distintos de 1.607 (dos no salen nunca y otros
> dos salen repetidos). **La cola de revisión, que pagina de 100 en 100, esconde dos
> movimientos** hasta que el backend lo arregle. Encargo en
> `../docs/handoff-paginacion-estable.md`.

### E8 — Los dashboards 🟡

Ingresos vs gastos del mes, saldo por cuenta, patrimonio total y su evolución,
reparto por categoría, comparativa entre meses. El backend ya expone los
agregados: `GET /api/overview`, `GET /api/investments/overview`,
`GET /api/net-worth`.

> **Esta etapa ya no está bloqueada por las sumas**: el ruido de depósitos y traspasos se
> resolvió con las F22 y F23, así que las cifras que hereda son las buenas.
>
> **Plan de la etapa, aprobado por el humano el 2026-10-02:**
>
> 1. ✅ **El mes de un vistazo** — F25, cerrada.
> 2. ⬜ **La tira del año**, en esta misma pantalla `Overview`, debajo del mes (el mes y el
>    año son una sola pantalla). Es lo siguiente.
> 3. ⬜ **Lo que ganó cada depósito**, en Patrimonio, con `GET /api/investments/deposits`
>    (feature 50 del backend, commit `a6195be`), servido y todavía **sin usar en el
>    frontend**. También es lo siguiente.
> 4. ⏸️ **Recurrentes**: espera al backend, a la parte 1 de
>    `../docs/handoff-recurrentes.md`. No se calcula en el navegador.
> 5. ⏸️ **El reparto por categoría**: aplazado hasta que haya más categorizado. Hoy solo
>    el 6,9 % del gasto tiene categoría y sería un gráfico que finge saber.
>
> **F25 cerrada el 2026-10-02** — primera rodaja: `/overview` deja de ser placeholder y
> enseña un mes. Lo primero es una frase ya interpretada; debajo, lo que entró, lo que
> salió, el ahorro y la tasa de ahorro, tal como los calcula el backend; una etiqueta que
> dice si la entrada y la salida fueron lo habitual, comparando con la **mediana** de los
> doce meses anteriores (margen del 25 %, decidido sobre el porcentaje a la décima); y qué
> parte del gasto no tiene categoría. La mediana es **lo único que calcula el cliente**. Un
> mes incompleto lo dice y no enseña tasa ni comparación. El mes vive solo en la URL
> (`/overview?month=2026-08`), con las flechas y el selector del extracto. Solo lectura:
> tres lecturas `GET /api/movements`, ninguna escritura. Patrimonio sigue siendo la
> pantalla de inicio. Comprobada con el humano delante contra el backend real: siete meses
> con las cifras, la mediana y el gasto sin categoría coincidiendo en los siete; agosto de
> 2026 lee «In August 2026, 2.590 € came in and 4.004 € went out: you spent 1.414 € more
> than came in», con la salida `More than usual` (34,9 % sobre 2.967,58 €); septiembre sale
> como incompleto; y las tres cifras de agosto son las mismas que enseña el extracto.
> Spec en `specs/25-month-at-a-glance/`.
>
> ⚠️ **El límite conocido de la comparación:** con la mediana, enero de 2026 sigue
> saliendo «53,5 % menos de lo habitual», porque entre octubre de 2024 y septiembre de 2025
> **siete de doce meses pasan de 5.000 € de gasto** por traspasos a cuentas propias de
> inversión sin marcar. La mediana resiste excepciones, no limpia datos. Se corrige cuando
> el humano los marque como que no cuentan desde el extracto (F22), **no con código**.

### E9 — Que esto se vea desde algún sitio ⬜

**Ninguna etapa lo cubría hasta hoy.** La app es web y se usa desde varios
ordenadores; en algún momento deja de ser `localhost`. Dónde se sirve el build,
contra qué URL de API, y cómo se controla el acceso a una aplicación que enseña
datos bancarios reales. No es urgente; es que no estaba.

---

## Cabos sueltos con dueño

| # | Cabo suelto | Lo resuelve |
|---|---|---|
| ~~1~~ | ~~Los tipos de este proyecto todavía no existen; el contrato del backend cambió y nadie lo consume~~ | ✅ **cerrado por la F7** |
| ~~2~~ | ~~`src/features/` está vacía: la convención de una carpeta por feature no se ha estrenado~~ | ✅ **cerrado por la F7**: la estrenó `src/features/net-worth/`, no la F8 como se previó |
| 3 | Cascada y evolución de Patrimonio necesitan histórico del backend (`GET /api/net-worth?asOf=` o serie) | backend, luego **E4** bloques C y D |
| 4 | La ficha de Patrimonio no puede decir «desde cuándo hay dato»: `GET /api/net-worth` no trae la fecha del primer dato por producto | backend, luego **E4** |
| 5 | El ejemplo JSON de `GET /api/net-worth` en el contrato del backend no cuadra (`investments.total`) — defecto de documentación, no de datos | backend |
| ~~6~~ | ~~`GET /api/ingestion/pending` cuenta también los archivos sin parser, así que el aviso «N new files» no bajaría a 0~~ | ✅ **retirado el 2026-09-15**: el humano confirma que todos los bancos tienen parser (Revolut incluido) y en Drive no hay PDFs, así que todo lo pendiente es importable |
| 7 | `GET /api/movements` con `pageSize=100` devuelve 1.605 movimientos distintos de 1.607: la cola de revisión esconde dos (`../docs/handoff-paginacion-estable.md`) | backend, luego **E6** se corrige sola |

> Los cabos 3, 4, 5 y 7 **no son tuyos**: son del backend. Está aquí porque bloquea bloques
> de la vista de Patrimonio y la regla de oro del workspace dice que el backend
> va primero. Si aparece aquí antes de estar resuelto allí, la feature nace mal.

---

## La regla que manda en este proyecto

**El backend es dueño del contrato y va primero.** Si hace falta un endpoint que
`../gastos-backend/docs/api-contract.md` no tiene, **se para**: se anota como
dependencia del backend en [`progress/current.md`](../progress/current.md) y se
implementa allí, en su propia sesión. Detalle en
[`docs/related-projects.md`](./related-projects.md).

---

## Cómo se mantiene este archivo

1. **Se lee al empezar** la sesión, después de `progress/current.md`
   ([`AGENTS.md`](../AGENTS.md) §1).
2. **Se actualiza al cerrar** una feature, en el mismo paso en que se vacía
   `current.md` ([`AGENTS.md`](../AGENTS.md) §5): cambiar el estado de su etapa y
   tachar el cabo suelto que haya resuelto. Normalmente son **dos líneas**.
3. **No crece.** Si una etapa necesita más de cinco líneas, su sitio es el
   `intent` de una feature, no aquí.
