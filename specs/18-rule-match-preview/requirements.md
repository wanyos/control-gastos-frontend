# Requirements — Feature 18: rule-match-preview (a cuántos afecta una regla)

> Derivado del bloque `intent` de la feature 18 en `feature_list.json` (fuente de
> verdad, incluidas sus `respuestas_del_humano`) y de sus 11 criterios de
> `acceptance`. EARS estricto según `docs/specs.md`.
>
> **Entradas reales leídas antes de redactar** (regla 4 de `docs/specs.md`):
> `../../../gastos-backend/docs/api-contract.md` → `### GET /api/movements`
> (parámetros `q` —2-100 caracteres, «contiene», sin distinguir mayúsculas ni
> tildes, `%` y `_` literales, el máximo medido sobre el texto tal cual y el mínimo
> sobre el recortado, solo mira `description`—, `status`, `type`, `uncategorized`,
> `categoryId` incompatible con `uncategorized=true`, `page`, `pageSize` 1-200 def. 50;
> respuesta `{ movements[], pagination: { page, pageSize, total, totalPages }, totals }`
> con `pagination.total` = coincidencias del filtro entero; orden `bookingDate DESC,
> daySequence DESC`; 400 y 404 de la tabla de errores; un filtro válido sin
> coincidencias es 200 con `total: 0`), `### POST /api/category-rules` (mínimo de 3
> caracteres tras normalizar, `matchText` guardado normalizado y único) y
> `### POST /api/category-rules/apply` (solo toca `pending_review` + sin categoría +
> `expense`/`income`, el `neutral` nunca; dos reglas de categorías distintas dejan el
> movimiento sin categoría y lo sacan en `conflicts`).
> Código real: `src/features/category-rules/{rules.ts,store.ts,service.ts,types.ts}`
> y `components/RuleDialog.vue`; `src/features/review/{service.ts,types.ts,filters.ts}`
> (`getMovements`, `buildMovementsQuery`, `parseMovementPage`, `MovementQuery`,
> `SEARCH_DEBOUNCE_MS = 350` y el temporizador de `components/ReviewFilterBar.vue:144`);
> `src/shared/{categories,money,validation,errors}.ts`;
> `src/features/category-rules/views/RulesView.vue` y
> `src/features/review/views/ReviewView.vue` (los dos montan `RuleDialog`).
>
> **Fuera de alcance:** tocar el backend; cambiar cómo se aplican las reglas; cambiar
> la lista de `Rules`, la cola de Review o cualquier comportamiento de las F15, F16 y
> F17; impedir guardar una regla amplia; escribir nada mientras se previsualiza.

## Cobertura del intent

| Punto de `como_se_que_esta_bien` / `acceptance` | Requirements |
|---|---|
| «me dice cuántos movimientos pendientes sin categoría casan con él» | R1, R3 |
| «puedo ver unos cuantos de esos movimientos» | R4 |
| «si casan demasiados, o ninguno, me lo dice de forma clara antes de que guarde» | R5, R6 |
| «el número se actualiza si cambio el texto, sin que yo tenga que pulsar nada» | R1, R8 |
| «al cambiar una regla que ya existe, veo lo mismo» | R11 |
| «esto no escribe nada: solo mira» | R12 |
| `que_no_quiero`: que no me impida guardar una regla amplia | R7 |
| `que_no_quiero`: que no tarde ni se quede pillada | R1, R9 |
| `acceptance` 5 (por debajo del mínimo del backend no se consulta nada) | R2 |
| `acceptance` 8 (mejorar `proposeMatchText` sin estropear lo que ya salía bien) | R13, R14, R15 |
| `respuestas_del_humano` 1 (solo pendientes sin categoría) | R1 |
| `respuestas_del_humano` 2 (los ejemplos, dentro del propio diálogo) | R4 |
| Errores de la consulta, en inglés y sin el `message` del backend | R10 |

---

## R1
CUANDO han pasado 350 ms desde la última pulsación en el campo de texto del diálogo
de regla y el texto normalizado tiene al menos 3 caracteres, el sistema DEBE pedir
`GET /api/movements` con `q=<texto recortado>`, `status=pending_review`,
`uncategorized=true`, `type=<el kind del diálogo>`, `page=1` y `pageSize=5`.

## R2
SI el texto normalizado tiene menos de 3 caracteres, o el texto tal cual pasa de 100
caracteres, ENTONCES el sistema NO DEBE pedir nada a la API ni mostrar recuento,
ejemplos ni aviso de amplitud.

## R3
CUANDO llega la respuesta de la consulta lanzada en último lugar, el sistema DEBE
mostrar en el diálogo el `pagination.total` de esa respuesta en una frase que diga
que son movimientos pendientes sin categoría que contienen ese texto.

## R4
CUANDO llega la respuesta de la consulta lanzada en último lugar y su `movements` no
está vacío, el sistema DEBE mostrar dentro del mismo diálogo hasta 5 de esos
movimientos, cada uno con su fecha, su concepto y su importe.

## R5
SI el `pagination.total` mostrado es mayor que 50 ENTONCES el sistema DEBE mostrar un
aviso visible de que el texto casa con demasiados movimientos.

## R6
SI el `pagination.total` mostrado es 0 ENTONCES el sistema DEBE mostrar un aviso
visible de que ningún pendiente sin categoría contiene ese texto.

## R7
MIENTRAS se muestra el aviso de R5 o el de R6, el botón de guardar del diálogo DEBE
seguir habilitado siempre que haya categoría elegida y el texto llegue al mínimo de
3 caracteres.

## R8
CUANDO llega la respuesta de una consulta que no es la lanzada en último lugar, el
sistema DEBE descartarla sin cambiar el recuento, los ejemplos ni los avisos que se
estén viendo.

## R9
MIENTRAS hay una consulta de previsualización en vuelo, el sistema DEBE mostrar un
indicador de carga en el bloque de previsualización dejando el campo de texto, el
selector de categoría y el botón de guardar utilizables.

## R10
SI la consulta de previsualización falla, o su respuesta no cumple el contrato,
ENTONCES el sistema DEBE mostrar en el bloque de previsualización una frase propia en
inglés, sin pintar el `message` del backend.

## R11
CUANDO el diálogo de regla se abre, en modo crear o en modo editar, con un texto
inicial de al menos 3 caracteres, el sistema DEBE lanzar la consulta de R1 sin
esperar a ninguna pulsación.

## R12
MIENTRAS el diálogo de regla está abierto y no se pulsa su botón de guardar, el
sistema NO DEBE enviar ninguna petición distinta de `GET /api/movements`.

## R13
CUANDO `proposeMatchText` recibe un concepto cuyas primeras palabras son de canal o
de terminal de cobro (`tpv`, `virtual`, `online`, `internet`, `web`, `terminal`,
`comercio`, `efectivo`, `ingreso`, `ingresos`, `nomina`, `liquidacion`, `orden`,
`envio`), el sistema DEBE saltárselas igual que hoy se salta las de trámite
bancario: «TPV VIRTUAL 1234 AMAZON MARKETPLACE» → `amazon`.

## R14
CUANDO la propuesta termina en una palabra genérica —de negocio (`servicios`,
`grupo`, `centro`, `comercial`…) o nombre de pila (`juan`, `jose`, `maria`…)—, el
sistema DEBE seguir añadiendo palabras del concepto hasta que la última añadida no
sea genérica, hasta agotar el concepto o hasta llegar a 4 palabras: «AB Servicios
Selecta E» → `servicios selecta`; «JUAN JOSE ROMERO RAMOS - INGRESO» →
`juan jose romero`.

## R15
`proposeMatchText` NO DEBE cambiar lo que propone hoy para «RECIB /IBERDROLA
CLIENTES, S.A» (`iberdrola`), «COMPRA TARJ. MERCADONA» (`mercadona`), «MEGA
DEPORTES» (`mega deportes`) ni «TULOTERO» (`tulotero`).

---

## Restricciones (no son requirements, pero el reviewer las comprueba)

- **C1 — Solo lectura.** Ninguna petición de esta feature usa un método distinto de
  `GET`. Grep de cierre: en el camino de la previsualización no aparece `POST`,
  `PATCH` ni `DELETE`.
- **C2 — Sentido de las dependencias.** `category-rules` sigue sin importar nada de
  `review` ni de `import` (`docs/architecture.md`): lo que necesiten las dos se
  mueve a `shared/`, como se hizo con las categorías en la F17.
- **C3 — Sin dependencias nuevas**, todo en inglés, tema oscuro con alias semánticos
  y las parejas de color con su línea `contrast:` en `theme-dark.css`.
- **C4 — Las F15, F16 y F17 no cambian de comportamiento**: sus suites pasan sin
  tocarlas, salvo los imports que el movimiento a `shared/` re-exporta.
- **C5 — Puerta verde:** `pnpm type-check`, `pnpm lint`, `pnpm test:unit`,
  `pnpm build` y `./init.sh`.
- **C6 — Comprobación final con el humano delante**, contra el backend real. Es de
  solo lectura: no necesita el aparato de visto bueno explícito de la F17 (T22).

---

## Procedencia

- **R1** — (humano) «me dice cuántos movimientos pendientes sin categoría casan con
  él» + `respuestas_del_humano` 1. **(delegado)** en tres detalles:
  (a) la espera de **350 ms**, la misma constante que ya usa la búsqueda de Review
  (`SEARCH_DEBOUNCE_MS`), en vez de inventar otra; alternativa descartada: 600 ms
  (menos peticiones, se siente lento);
  (b) `pageSize=5`, porque con una sola petición vienen ya el total y los ejemplos;
  (c) **`type=<kind>`** añadido al filtro: la pasada de reglas nunca toca un
  `neutral` y nunca aplica una regla de categoría de ingreso a un gasto, así que sin
  este filtro el número contaría movimientos que aplicar jamás tocaría.
- **R2** — (humano) `acceptance` 5, «con un texto por debajo del mínimo del backend
  no se consulta nada, como hoy». El tope de **100 caracteres** es **(añadido)**: el
  contrato responde 400 a un `q` más largo y `matchText` no tiene ese tope, así que
  por encima se deja de previsualizar pero se **sigue pudiendo guardar**.
  ← REVISAR EN APROBACIÓN.
- **R3** — (humano) el recuento es lo primero que pide el `intent`.
- **R4** — (humano) «puedo ver unos cuantos de esos movimientos» y
  `respuestas_del_humano` 2 (dentro del diálogo). **(delegado):** son **5** y son los
  **más recientes**, porque es el orden en que el backend los devuelve
  (`bookingDate DESC`); qué se ve de cada uno (fecha, concepto, importe) copia la
  fila de Review. Alternativa descartada: los conceptos **más repetidos**, que
  obligaría a traerse todas las páginas y agruparlas en el navegador.
- **R5** — (delegado) «a partir de cuántos se considera demasiado amplio». Decido
  **más de 50**. Con ~1.373 pendientes sin categoría, 50 es un 3,6%: por debajo cabe
  un comercio muy frecuente sin dar la alarma, por encima casi siempre es una
  palabra genérica. ← REVISAR EN APROBACIÓN.
- **R6** — (humano) «o ninguno, me lo dice de forma clara».
- **R7** — (humano) `que_no_quiero`: «que me avise, no que decida por mí».
- **R8** — (humano) `acceptance` 3, «una consulta en vuelo no pisa a la siguiente».
- **R9** — (humano) `que_no_quiero`: «que no se quede pillada mientras cuenta».
- **R10** — (añadido) el `intent` no dice qué pasa si la consulta falla. Propongo:
  frase propia en inglés dentro del bloque de previsualización, sin recuento, sin
  ejemplos y **sin bloquear el guardado** — un fallo al contar no es razón para no
  dejar crear la regla. ← REVISAR EN APROBACIÓN.
- **R11** — (humano) «al cambiar una regla que ya existe, veo lo mismo». Que la
  consulta salga **al abrir** el diálogo, y no solo al teclear, es **(delegado)**: si
  no, al editar una regla habría que tocar el texto para ver el número.
- **R12** — (humano) «esto no escribe nada: solo mira».
- **R13** — (delegado) `delego_en_agente` 4. La lista de palabras de canal la escribo
  yo **sin mirar tus extractos**, igual que la de trámite bancario de la F17; se
  corrige cuando falle. ← REVISAR EN APROBACIÓN.
- **R14** — (delegado) `delego_en_agente` 4. El criterio de hoy («crece hasta 6
  caracteres») no distingue una marca de una palabra común: `servicios` mide 9 y se
  queda sola. El criterio nuevo hace crecer la propuesta mientras la última palabra
  sea genérica, con la **lista de palabras genéricas y de nombres de pila escrita a
  mano**, y un tope de 4 palabras. ← REVISAR EN APROBACIÓN.
- **R15** — (humano) `acceptance` 8, «sin cambiar los que ya salían bien».
