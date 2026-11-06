# Encargo para el backend: esconder lo que no cuenta sin esconder los vencimientos que suman

**Para:** el leader de `gastos-backend`, en su propia sesión.
**De:** el leader de `gastos-frontend`, 2026-11-05.
**Para qué:** cerrar el cabo 37 (b) del `docs/roadmap.md` del frontend. El humano eligió
resolverlo en el backend el 2026-11-05. Análisis completo:
`gastos-frontend/progress/implementations/hide-not-counted-maturities.md`.

Esto describe **qué** necesita el frontend. El nombre del parámetro, su forma y cómo se
filtra por dentro los decide el backend en su propio spec, y los publica en
`docs/api-contract.md`.

## El problema

En la pantalla `Movements`, la casilla `Hide what does not count` pide el mes con
`GET /api/movements?…&excluded=none&transfer=none`. Según el contrato:

- `excluded=none` deja fuera todo movimiento con `excludedFromTotals: true`, también
  los de depósito, aunque en ellos la marca no cambie lo que suman (feature 57).
- `transfer=none` deja fuera todo movimiento con `transferId`, sin excepción para los
  depósitos.
- Pero un vencimiento de depósito con capital cierto **suma su interés**
  (`deposit.countedAmount`) aunque esté marcado o emparejado.

Así que, si un vencimiento queda marcado (la marca se puede poner con
`PATCH /api/movements`) o emparejado (lo hace la detección de traspasos en cada
importación), al poner la casilla:

1. desaparece de la lista, aunque su fila dice `Counts <interés>`;
2. su interés falta en los `totals` de esa misma respuesta, que son las cifras que el
   frontend pinta arriba del mes.

Hoy no hay ningún caso así en los datos del humano: el fallo puede pasar, pero no ha
pasado.

## Qué necesita el frontend

Un filtro de `GET /api/movements` que deje fuera **los marcados y los emparejados,
salvo los movimientos de depósito que suman algo**, con su `pagination` y sus `totals`
calculados sobre ese mismo filtro. Puede ser un valor nuevo de `excluded`/`transfer`, un
parámetro propio o lo que el backend vea mejor.

Con eso, el frontend solo cambia los parámetros que manda con la casilla puesta, y no
cambia nada más a la vista.

Hoy no hay ningún filtro por `deposit` ni por «lo que suma». Pedir dos veces y mezclar
en el navegador (dos paginaciones, `totals` sumados a mano) está descartado.

## Lo que el backend tiene que decidir y enseñar al humano

Son propuestas del leader del frontend, **no las ha decidido el humano**:

- **Un vencimiento dudoso** (suma 0) que esté marcado o emparejado: se sigue escondiendo.
- **Una apertura o cancelación de depósito marcada o emparejada** (suma 0): se sigue
  escondiendo.
- **Qué devuelve el conteo de lo escondido** que hoy pide el frontend (`hiddenCountQuery`,
  la segunda petición que da `Hiding N movements`): que siga cuadrando con el filtro
  nuevo.

## Lo que no se pide

- Ningún cambio en lo que suma cada movimiento ni en los `totals` sin la casilla.
- Ningún cambio en `excluded=only` / `transfer=only`.

## Cuando esté hecho

Con la sección actualizada en `docs/api-contract.md`, el frontend cambia los parámetros
de la casilla en otra sesión, con implementer y reviewer.
