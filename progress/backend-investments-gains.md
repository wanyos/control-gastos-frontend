# Encargo para el backend: lo que gana o pierde cada inversión, y el total

**Para:** el leader de `gastos-backend`, en su propia sesión.
**De:** el leader de `gastos-frontend`, 2026-11-03.
**Para qué:** la feature 40 del frontend (`investments-gains`) no puede escribir su
spec sin esto. Análisis completo del hueco: `gastos-frontend/progress/spec_investments-gains.md`.

Esto describe **qué** necesita el frontend y las respuestas del humano. El
nombre del endpoint, la forma exacta de la respuesta y cómo se calcula por
dentro los decide el backend en su propio spec, y los publica en
`docs/api-contract.md`.

## Qué quiere ver el humano

La pantalla `Investments` del frontend enseña, de forma simple, **cuánto gana o
pierde con las inversiones**: cada producto con su fecha de inicio, lo invertido,
lo que vale ahora y lo que gana o pierde en euros y en %, y arriba un total. Más
contexto: `../docs/ideas.md`, idea #3, sección «Para qué sirve cada pantalla».

## Lo que ha decidido el humano (2026-11-03)

1. **En esta pantalla no sale ninguna cuenta.** Ni las cuentas corrientes ni la
   cuenta remunerada: solo productos de inversión. Lo que gana una cuenta
   remunerada ya está en sus propios movimientos y en el saldo de la cuenta.
   Encaja con lo que ya estaba decidido: «la cuenta remunerada cuenta como
   líquido, no como inversión» (`../docs/ideas.md`, refinamiento de Patrimonio).
2. **Los productos cerrados se ven, pero no suman.** Un fondo vendido o un
   depósito vencido salen aparte, como referencia, con lo que ganaron o
   perdieron y la fecha en que se cerraron. **No entran en el total**: al cerrarse,
   el dinero pasó a la cuenta corriente de MyInvestor, y lo ganado ya está en su
   saldo.
3. **El total es solo de los productos que siguen vivos.**

## Qué tiene que dar la lectura (solo `GET`, no escribe nada)

**Por cada producto de inversión** de tipo `fund`, `etf`, `managed_portfolio` o
`deposit` (los `savings_account` quedan fuera, por la decisión 1):

- `id`, `bank`, `name`, `type`, `openedAt`, `closedAt`, y si está vivo o cerrado
  a fecha de hoy.
- **Lo acumulado desde que se abrió**: invertido (€), valor actual (€), ganancia
  (€), ganancia (%), y **la fecha del dato** con que se sacó.
  - Fondo, ETF y cartera gestionada: los de su **última foto con fecha ≤ hoy**, sea
    del mes que sea, tal como están guardados (regla 4 del modelo, ADR-012: no
    se recalcula nada). Hoy `GET /api/investments/overview` solo da la foto del
    mes pedido, y la anterior va en `previousValuation`, que según el contrato no
    puede hacerse pasar por la actual.
  - Depósito vivo: sus condiciones (capital, TAE, ganancia esperada, vencimiento).
    Su ganancia es 0 hasta que vence: «la ganancia aparece el día que vencen»
    (`../docs/ideas.md`).
  - Depósito vencido: lo que ganó, con la misma regla que
    `GET /api/investments/deposits` (solo si venció y se encontró su cobro), o
    una referencia explícita a ese endpoint.
  - Fondo o ETF cerrado: lo que ganó o perdió según su última foto antes del
    cierre.
- **Si una cifra no se puede sacar**: `null` en su sitio y un motivo de una lista
  cerrada, como hoy `periodGain.excluded`. Nunca cero.

**El total, solo de los productos vivos:**

- Ganancia total en €: la suma de las ganancias de los vivos que se pueden sacar.
- Ganancia total en %, con **la fórmula escrita en el contrato**.
- La lista de los productos vivos que no entran, con su motivo.

## Lo que el backend tiene que decidir y enseñar al humano en su hoja de decisiones

Estas son propuestas del leader del frontend, **no las ha decidido el humano**:

- **Sobre qué se calcula el % del total.** Propuesta: ganancia total ÷ invertido
  de los productos vivos que entran.
- **Si el capital de un depósito vivo entra en ese invertido.** Si entra, el %
  baja mientras el depósito no vence (porque su ganancia es 0). Si no entra, el
  % es solo de lo que fluctúa.
- **Endpoint nuevo o ampliación de `GET /api/investments/overview`.**

## Lo que no se pide

- Ningún cambio en `GET /api/net-worth` ni en lo que enseña `Net Worth`.
- Ninguna escritura. Desde la pantalla no se edita nada.
- Evolución en el tiempo o series: no forman parte de esto.

## Cuando esté hecho

Con la sección nueva publicada en `docs/api-contract.md`, el frontend vuelve a
lanzar el spec de su feature 40 en otra sesión.
