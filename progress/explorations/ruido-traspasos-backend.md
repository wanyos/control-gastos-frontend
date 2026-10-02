# Ruido de traspasos y depósitos: qué ofrece hoy el backend

> Exploración de solo lectura del código de `gastos-backend` (no del contrato),
> 2026-09-26, para decidir cómo hace el extracto (E7) unas sumas honestas y si hace
> falta una feature del backend. Los puntos 1, 3 y 5 los verificó el leader leyendo
> el código citado; el resto viene del subagente explorador.

## 1. `Movement.type` — `neutral` no marca traspasos

- `enum MovementType { expense | income | neutral }` (`prisma/schema.prisma:29-33`). El
  comentario del schema es explícito: **no hay valor `transfer`**; un traspaso entre
  cuentas propias son dos movimientos ordinarios unidos por `transferId`, y
  **`neutral` cubre solo importe 0**.
- Lo escribe únicamente el importador, por el signo: `deriveMovementTypeFromAmount`
  (`src/modules/movements/movements.service.ts:43-47`).
- **`type` es inmutable después.** Los únicos campos escribibles de un movimiento son
  `categoryId` y `status` (`movements.service.ts:296-329`, bulk en `:344-395`).

## 2. `transferId` y los endpoints de traspasos

- `POST /api/transfers` empareja dos movimientos: exige uno `expense` y uno `income`,
  cuentas distintas y **mismo importe**; escribe **solo `transferId`** en las dos
  piernas (`transfers.service.ts:290-363`). No cambia `type`, ni importes, ni estado.
- `DELETE /api/transfers/:transferId` deshace la pareja y recuerda el id en
  `undoneTransferId`, para que la detección no vuelva a unir esa misma pareja.
- El **saldo de la cuenta sí cuenta** las piernas, y es correcto: el dinero salió de
  esa cuenta (`movements.service.ts:110-145`).
- **No hay `GET /api/transfers`:** no se pueden listar parejas ni pendientes.

## 3. Los `totals` de `GET /api/movements` ya excluyen traspasos

`computeTotals` (`movements.service.ts:456-471`), leído literal:

```ts
if (movement.transferId !== null) return totals   // las dos piernas de un traspaso, fuera
if (movement.productId !== null) return totals    // aportación a producto, fuera
// income suma a income, expense a expense; neutral cae al return final → fuera
```

- Se calculan **sobre todas las filas del filtro**, no sobre la página
  (`movements.service.ts:263-283`).
- `GET /api/overview` **reutiliza esta misma función** (`overview.service.ts:83`), así
  que sus cifras coinciden con los `totals` del mismo rango.
- **Aviso decisivo: `productId` no tiene ningún escritor.** El importador lo pone a
  `null` (`import.service.ts:126`) y el schema lo dice (`schema.prisma:169-172`:
  «Nothing writes it yet»). La exclusión existe en el código pero **hoy nunca se
  activa**.
- **No hay filtro por traspaso** en la lista (`movements.types.ts:65-79`): no se puede
  pedir «sin traspasos» ni «solo traspasos».

## 4. La detección automática de traspasos

- Corre al final de cada importación, sobre **toda** la tabla, no solo lo importado
  (`transfers.service.ts:222-223`).
- Criterio (`pairTransferCandidates`, `transfers.service.ts:89-198`): importe exacto,
  signos opuestos, cuentas distintas, **± 3 días** de fecha contable, y unicidad mutua
  (o grupo bipartito completo y equilibrado, resuelto por orden de fecha y
  `daySequence`).
- Los grupos dudosos salen **enteros** como `ambiguous`, nunca a medias. Un movimiento
  **sin pareja posible ni se marca ni se lista** (`transfers.service.ts:83-84`).
- **Los «por emparejar» no se persisten:** viven solo en la respuesta HTTP de esa
  importación. No hay tabla ni endpoint para recuperarlos (a diferencia de los avisos
  de importación, que sí tienen `/api/import/warnings`).

## 5. ¿Hay forma de marcar «esto no cuenta para mis cuentas»? No

| Candidato | Por qué no sirve |
|---|---|
| `transferId` | Solo parejas de dos movimientos compatibles. Un movimiento suelto no puede llevarlo |
| `productId` | Es el hueco previsto, pero **no tiene escritor ni endpoint** |
| `neutral` | Solo importe 0, derivado del signo, no escribible |
| `note` | Nadie lo escribe (no está en `UpdateMovementBody`) y nadie lo lee para totales |
| `status` | Es revisión, no exclusión; `computeTotals` no lo mira |
| Una categoría «Traspaso» | `computeTotals` **no mira `categoryId`**: no excluiría nada. Y `Category.kind` solo admite `expense`/`income` |

### El caso de un depósito, que es el ruido gordo

La apertura de un depósito es un `expense` **suelto** en la cuenta corriente: no tiene
pierna `income` en ninguna cuenta bancaria, porque el destino es un
`InvestmentProduct`, no una `Account`. El vencimiento es un `income` suelto. Ninguno
tiene pareja posible, así que la detección los ignora (ni salen en `ambiguous`), no hay
`productId` que escribir, y **hoy cuentan como gasto e ingreso reales**.

## 6. `GET /api/overview`

Existe, acepta solo `month`, y usa el mismo `computeTotals`. Trata los traspasos y los
`neutral` igual que la lista, y **mete los depósitos dentro** por el mismo motivo. No
acepta filtro por cuenta ni por categoría: es siempre global.

## Conclusión operativa

- **Lo que ya está resuelto:** las parejas de traspaso detectadas o enlazadas a mano
  **ya salen de los totales**. Eso no hay que construirlo.
- **Lo que no tiene solución desde el frontend:** una apertura o un vencimiento de
  depósito, y un traspaso propio que la detección no supo emparejar. No existe ningún
  campo que el frontend pueda escribir para sacarlos de `income`/`expense`.
- **Lo que pediría al backend** (su sesión, no esta): un escritor para `productId` o un
  campo nuevo tipo `excludedFromTotals`, un filtro por traspaso en
  `GET /api/movements`, y persistir los «por emparejar» para poder resolverlos desde
  la web.
