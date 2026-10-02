# Ruido en las sumas: depósitos de myinvestor y traspasos entre cuentas propias

> Medición **de solo lectura** contra el backend real (`http://localhost:3000`),
> 26-09-2026. Solo peticiones `GET /api/movements` (paginado `pageSize=100`) y
> `GET /api/accounts`. **No se hizo ninguna escritura** (ni POST, ni PATCH, ni
> DELETE). Los scripts de análisis se ejecutaron en el scratchpad, fuera del repo.

## 0. Punto de partida y una sorpresa importante

- 1.607 movimientos, 5 cuentas, de **2024-01-02 a 2026-09-11**.
- Solo hay dos `type`: `expense` (1.434) y `income` (173). No existe un tipo
  `transfer`.
- Reparto por cuenta: n26 911, bankinter 371, openbank 205, myinvestor 85,
  revolut 35.

**Lo que devuelve hoy el backend en `totals` ya excluye los movimientos con
`transferId`**:

| | Ingreso | Gasto | Neto |
|---|---|---|---|
| Suma cruda de los 1.607 movimientos | 494.564,03 | 487.922,60 | 6.641,43 |
| `totals` de la API (hoy) | 446.014,03 | 439.372,60 | 6.641,43 |
| Diferencia | 48.550,00 | 48.550,00 | 0,00 |

Los 48.550,00 son exactamente la suma de los 80 movimientos con `transferId`.
Es decir: **el criterio (b) ya está aplicado en producción**. Todo el ruido que
queda visible en la app es el que (b) no cubre.

## 1. Cuánto ruido hay

Criterios medidos:

- **(a) sin myinvestor** — se descartan los 85 movimientos de la cuenta myinvestor.
- **(b) sin `transferId`** — se descartan los 80 movimientos con `transferId` no nulo.
- **(c) sin concepto de traspaso propio** — patrón *estricto*: el concepto
  contiene una palabra de transferencia (`TRANS INM`, `TRANSF`, `TRASPASO`,
  `Pago de`) **y además** el nombre de un banco propio (`n26`, `openbank`,
  `myinvestor`, `revolut`, `bankinter`) o el nombre del titular
  (`JUAN JOSE ROMERO RAMOS` en sus variantes), **excluyendo** `TRANSF NOMI`
  (nómina). Son 71 movimientos.
- **a+b+c** — unión de los tres.
- **Mejor criterio** — `transferId` **o** movimiento de depósito de myinvestor
  (`APERTURA DEP` / `INTERESES DEP` / `CANCELACION DEP`) **o** patrón (c).
  Excluye 126 movimientos (7,8 % del total).

### Por año

| Año | Bruto I | Bruto G | (a) I | (a) G | (b) I | (b) G | (c) I | (c) G | a+b+c I | a+b+c G | Mejor I | Mejor G |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2024 | 114.989,23 | 69.718,19 | 114.989,23 | 69.718,19 | 105.539,23 | 60.268,19 | 95.689,23 | 51.818,19 | 88.239,23 | 51.768,19 | 88.239,23 | 51.768,19 |
| 2025 | 163.108,01 | 202.529,35 | 52.938,09 | 91.328,06 | 135.008,01 | 174.429,35 | 152.108,01 | 151.529,35 | 34.838,09 | 40.228,06 | 34.843,41 | 41.429,35 |
| 2026 | 216.466,79 | 215.675,06 | 34.944,26 | 36.011,32 | 205.466,79 | 204.675,06 | 210.403,32 | 204.675,06 | 24.880,79 | 25.011,32 | 29.916,35 | 29.675,06 |
| **Total** | **494.564,03** | **487.922,60** | 202.871,58 | 197.057,57 | 446.014,03 | 439.372,60 | 458.200,56 | 408.022,60 | 147.958,11 | 117.007,57 | **152.998,99** | **122.872,60** |

Lectura rápida: el ruido se come **el 69 % del ingreso y el 75 % del gasto**
acumulados. El grueso es myinvestor (289.000 € por lado, ~59 %), y la cuenta
myinvestor solo tiene datos desde agosto de 2025, por eso 2024 no se mueve.

### Por mes

| Mes | Bruto I | Bruto G | (a) I | (a) G | (b) I | (b) G | (c) I | (c) G | a+b+c I | a+b+c G | Mejor I | Mejor G |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2024-01 | 3.337,42 | 1.509,59 | 3.337,42 | 1.509,59 | 3.337,42 | 1.509,59 | 3.337,42 | 1.509,59 | 3.337,42 | 1.509,59 | 3.337,42 | 1.509,59 |
| 2024-02 | 2.122,41 | 1.074,93 | 2.122,41 | 1.074,93 | 2.122,41 | 1.074,93 | 2.122,41 | 1.074,93 | 2.122,41 | 1.074,93 | 2.122,41 | 1.074,93 |
| 2024-03 | 54.122,12 | 1.321,44 | 54.122,12 | 1.321,44 | 53.622,12 | 821,44 | 54.122,12 | 821,44 | 53.622,12 | 821,44 | 53.622,12 | 821,44 |
| 2024-04 | 4.293,60 | 1.837,04 | 4.293,60 | 1.837,04 | 4.293,60 | 1.837,04 | 4.293,60 | 1.837,04 | 4.293,60 | 1.837,04 | 4.293,60 | 1.837,04 |
| 2024-05 | 4.345,40 | 3.200,13 | 4.345,40 | 3.200,13 | 2.345,40 | 1.200,13 | 4.345,40 | 1.200,13 | 2.345,40 | 1.200,13 | 2.345,40 | 1.200,13 |
| 2024-06 | 5.957,77 | 1.964,54 | 5.957,77 | 1.964,54 | 5.957,77 | 1.964,54 | 5.957,77 | 1.964,54 | 5.957,77 | 1.964,54 | 5.957,77 | 1.964,54 |
| 2024-07 | 2.445,68 | 1.740,57 | 2.445,68 | 1.740,57 | 2.445,68 | 1.740,57 | 2.445,68 | 1.740,57 | 2.445,68 | 1.740,57 | 2.445,68 | 1.740,57 |
| 2024-08 | 20.822,88 | 22.680,32 | 20.822,88 | 22.680,32 | 18.822,88 | 20.680,32 | 4.522,88 | 20.680,32 | 2.522,88 | 20.680,32 | 2.522,88 | 20.680,32 |
| 2024-09 | 5.583,22 | 9.020,14 | 5.583,22 | 9.020,14 | 2.633,22 | 6.070,14 | 3.583,22 | 5.620,14 | 2.633,22 | 5.570,14 | 2.633,22 | 5.570,14 |
| 2024-10 | 2.754,13 | 2.857,48 | 2.754,13 | 2.857,48 | 2.254,13 | 2.357,48 | 2.754,13 | 1.357,48 | 2.254,13 | 1.357,48 | 2.254,13 | 1.357,48 |
| 2024-11 | 3.790,07 | 11.617,32 | 3.790,07 | 11.617,32 | 3.290,07 | 11.117,32 | 2.790,07 | 7.117,32 | 2.290,07 | 7.117,32 | 2.290,07 | 7.117,32 |
| 2024-12 | 5.414,53 | 10.894,69 | 5.414,53 | 10.894,69 | 4.414,53 | 9.894,69 | 5.414,53 | 6.894,69 | 4.414,53 | 6.894,69 | 4.414,53 | 6.894,69 |
| 2025-01 | 3.253,73 | 6.031,17 | 3.253,73 | 6.031,17 | 2.253,73 | 5.031,17 | 2.253,73 | 2.031,17 | 2.253,73 | 2.031,17 | 2.253,73 | 2.031,17 |
| 2025-02 | 4.372,08 | 9.271,67 | 4.372,08 | 9.271,67 | 2.372,08 | 7.271,67 | 3.372,08 | 4.271,67 | 2.372,08 | 4.271,67 | 2.372,08 | 4.271,67 |
| 2025-03 | 9.002,93 | 13.147,47 | 9.002,93 | 13.147,47 | 4.002,93 | 8.147,47 | 7.002,93 | 4.147,47 | 4.002,93 | 4.147,47 | 4.002,93 | 4.147,47 |
| 2025-04 | 1.993,36 | 6.314,44 | 1.993,36 | 6.314,44 | 1.993,36 | 6.314,44 | 1.993,36 | 3.314,44 | 1.993,36 | 3.314,44 | 1.993,36 | 3.314,44 |
| 2025-05 | 3.254,36 | 3.573,59 | 3.254,36 | 3.573,59 | 2.254,36 | 2.573,59 | 2.254,36 | 2.573,59 | 2.254,36 | 2.573,59 | 2.254,36 | 2.573,59 |
| 2025-06 | 4.249,94 | 2.371,53 | 4.249,94 | 2.371,53 | 4.149,94 | 2.271,53 | 4.249,94 | 2.371,53 | 4.149,94 | 2.271,53 | 4.149,94 | 2.271,53 |
| 2025-07 | 3.212,66 | 12.527,15 | 3.212,66 | 12.527,15 | 2.212,66 | 11.527,15 | 3.212,66 | 1.527,15 | 2.212,66 | 1.527,15 | 2.212,66 | 1.527,15 |
| 2025-08 | 24.380,17 | 32.941,80 | 4.346,16 | 12.941,80 | 22.380,17 | 30.941,80 | 22.380,17 | 30.941,80 | 2.346,16 | 10.941,80 | 2.346,16 | 10.941,80 |
| 2025-09 | 24.944,74 | 23.352,42 | 4.909,23 | 3.052,42 | 23.944,74 | 22.352,42 | 24.944,74 | 22.352,42 | 3.909,23 | 2.052,42 | 3.910,73 | 2.352,42 |
| 2025-10 | 24.184,87 | 24.819,35 | 4.150,89 | 4.519,35 | 22.184,87 | 22.819,35 | 22.184,87 | 22.819,35 | 2.150,89 | 2.519,35 | 2.151,95 | 2.819,35 |
| 2025-11 | 23.184,67 | 22.062,95 | 3.149,03 | 1.762,95 | 22.184,67 | 22.062,95 | 23.184,67 | 22.062,95 | 2.149,03 | 1.762,95 | 2.150,66 | 2.062,95 |
| 2025-12 | 37.074,50 | 46.115,81 | 7.043,72 | 15.814,52 | 25.074,50 | 33.115,81 | 35.074,50 | 33.115,81 | 5.043,72 | 2.814,52 | 5.044,85 | 3.115,81 |
| 2026-01 | 34.195,19 | 32.892,53 | 4.111,01 | 2.584,54 | 33.195,19 | 31.892,53 | 33.195,19 | 31.892,53 | 3.111,01 | 1.584,54 | 3.114,10 | 1.892,53 |
| 2026-02 | 2.050,19 | 1.874,57 | 2.049,15 | 1.566,58 | 2.050,19 | 1.874,57 | 2.050,19 | 1.874,57 | 2.049,15 | 1.566,58 | 2.050,19 | 1.874,57 |
| 2026-03 | 5.392,47 | 3.532,16 | 5.391,14 | 3.223,99 | 4.392,47 | 2.532,16 | 5.392,47 | 2.532,16 | 4.391,14 | 2.223,99 | 4.392,47 | 2.532,16 |
| 2026-04 | 33.714,03 | 35.396,54 | 2.535,33 | 4.088,55 | 32.714,03 | 34.396,54 | 33.714,03 | 34.396,54 | 2.535,33 | 3.088,55 | 2.536,07 | 4.396,54 |
| 2026-05 | 12.217,76 | 4.827,26 | 2.203,95 | 4.459,27 | 12.217,76 | 4.827,26 | 12.217,76 | 4.827,26 | 2.203,95 | 4.459,27 | 7.204,68 | 4.827,26 |
| 2026-06 | 6.144,33 | 11.085,22 | 6.138,04 | 5.095,47 | 5.144,33 | 10.085,22 | 5.080,86 | 10.085,22 | 5.074,57 | 4.095,47 | 5.080,86 | 5.085,22 |
| 2026-07 | 61.948,93 | 63.096,05 | 6.779,17 | 7.738,06 | 57.948,93 | 59.096,05 | 58.948,93 | 59.096,05 | 2.779,17 | 3.738,06 | 2.785,90 | 4.096,05 |
| 2026-08 | 34.642,07 | 11.003,89 | 4.582,61 | 5.645,90 | 32.642,07 | 9.003,89 | 33.642,07 | 9.003,89 | 2.582,61 | 3.645,90 | 2.590,26 | 4.003,89 |
| 2026-09 | 26.161,82 | 51.966,84 | 1.153,86 | 1.608,96 | 25.161,82 | 50.966,84 | 26.161,82 | 50.966,84 | 153,86 | 608,96 | 161,82 | 966,84 |

Notas de lectura:

- Desde 2025-08 (primer mes con datos de myinvestor) **cada mes lleva 20.000 a
  30.000 € de ruido por lado** solo por los depósitos.
- 2024-03 tiene un ingreso de 50.000 € (`TRANSF O /<persona>`) que
  **no es ruido** según ningún criterio: es un ingreso real de un tercero. Domina
  el año 2024 y conviene no confundirlo con un traspaso.
- 2024-08 tiene 16.990 € de gasto (compra de coche, Clicars) y 16.300 € de
  ingreso (`TRANSFERENCIA DE ROMERO RAMOS JUAN JOSE`) que sí parece dinero propio
  llegando de una cuenta no dada de alta.

## 2. Los 80 movimientos con `transferId`

Emparejamiento **perfecto**: 40 grupos, **todos de exactamente 2 movimientos**.

| Propiedad | Resultado |
|---|---|
| Grupos | 40, todos de tamaño 2 (ninguno de 1 ni de 3) |
| Importes | 40/40 coinciden al céntimo |
| `type` | 40/40 son un `expense` + un `income` (nunca dos del mismo signo) |
| Fechas | 16 mismo día, 18 a 1 día, 1 a 2 días, 5 a 3 días. Máximo 3 días |
| Importe total | 48.550,00 por lado |
| Rango | 2024-03-18 a 2026-09-09 |

Rutas (origen del `expense` → destino del `income`):

| Ruta | Grupos |
|---|---|
| bankinter → n26 | 18 |
| bankinter → openbank | 15 |
| bankinter → myinvestor | 4 |
| n26 → openbank | 2 |
| bankinter → revolut | 1 |

**bankinter es el origen de 38 de los 40**: es la cuenta nodriza.

### Dos de los 40 son falsos positivos

El emparejador del backend juntó importe + fecha pero no es un traspaso propio:

| Fecha | Importe | Gasto | Ingreso |
|---|---|---|---|
| 2024-09-14 / 17 | 50,00 | n26 `DGT SANCIONES INTERNET` | openbank `BIZUM DE <persona> CONCEPTO multa` |
| 2025-06-30 / 06-27 | 100,00 | n26 `AYTO MADRID PAGO INTER` | openbank `BIZUM DE <persona> CONCEPTO multa` |

Son una multa pagada y su reembolso vía Bizum de otra persona. Se están ocultando
150 € de gasto real y 150 € de ingreso real. Precisión de `transferId`:
**38/40 = 95 %**.

### Un caso de triplicado

`2026-07-24 / 1.000,00 / bankinter → openbank` aparece **tres veces** con tres
`transferId` distintos y los seis movimientos idénticos. Es una reimportación
duplicada, no tres traspasos.

## 3. Traspasos que lo parecen pero no tienen `transferId`

Con el patrón estricto (c): **71 movimientos coinciden, 54 ya tienen
`transferId`, 17 no lo tienen.**

Cobertura del patrón sobre los que sí tienen `transferId`: 54 de 80 = 67,5 %.
Los 26 que no captura son los lados `income` con conceptos como
`JUAN JOSE ROMERO RAMOS - INGRESO` sin palabra de transferencia previa, o
`INGRESO` seco en myinvestor.

Los 17 sin `transferId`, con búsqueda de espejo (mismo importe, otra cuenta,
signo contrario, ±3 días):

| Fecha | Tipo | Importe | Cuenta | Concepto | ¿Espejo? |
|---|---|---|---|---|---|
| 2024-08-28 | income | 16.300,00 | openbank | TRANSFERENCIA DE ROMERO RAMOS JUAN JOSE, CONCEPTO ingreso | no |
| 2024-09-12 | expense | 500,00 | bankinter | TRANSF /Juan_Jose_Romero_Ramos | **sí** (n26, 2024-09-13) |
| 2024-10-30 | expense | 1.000,00 | bankinter | TRANSF /Juan_Jose_Romero_Ramos | no |
| 2024-11-05 | expense | 1.000,00 | bankinter | TRANSF /Juan Jose Romero Ramos | no |
| 2024-11-05 | income | 1.000,00 | bankinter | TRANSF /JUAN JOSE ROMERO RAMOS | no (vuelve a la misma cuenta) |
| 2024-11-25 | expense | 3.000,00 | bankinter | TRANSF OTRAS ENTID /Myinvestor | no |
| 2024-12-09 | expense | 3.000,00 | bankinter | TRANSF OTRAS ENTID /MyInvestor | no |
| 2025-01-03 | expense | 3.000,00 | bankinter | TRANSF OTRAS ENTID /Myinvestor | no |
| 2025-02-28 | expense | 3.000,00 | bankinter | TRANSF OTR /V.M.Día-Myinvestor | no |
| 2025-03-05 | expense | 2.000,00 | bankinter | TRANSF OTR /V.M.Día-Myinvestor | no |
| 2025-03-28 | expense | 2.000,00 | bankinter | TRANSF OTR /V.M.Día-Myinvestor | no |
| 2025-04-04 | expense | 3.000,00 | bankinter | TRANSF OTR /V.M.Día-Myinvestor | no |
| 2025-07-08 | expense | 3.000,00 | bankinter | TRANSF OTRAS ENTID /Myinvestor | no |
| 2025-07-10 | expense | 3.000,00 | bankinter | TRANSF OTRAS ENTID /Myinvestor | no |
| 2025-07-16 | expense | 4.000,00 | bankinter | TRANSF OTRAS ENTID /Myinvestor | no |
| 2026-06-04 | income | 0,89 | openbank | TRANSFERENCIA INMEDIATA DE JUAN JOSE ROMERO RAMOS CONCEPTO Movimiento ING | no |
| 2026-06-04 | income | 62,58 | openbank | TRANSFERENCIA DE JUAN JOSE ROMERO RAMOS, CONCEPTO Movimiento ING | no |

**Con espejo: 1. Sin espejo: 16.** Total: 17.363,47 de ingreso y 31.500,00 de gasto.

El motivo de tanto "sin espejo" es explicable y no invalida nada: **9 de los 16
son envíos bankinter → Myinvestor entre 2024-11 y 2025-07, y la cuenta myinvestor
solo tiene movimientos importados desde 2025-08-25.** El espejo no existe porque
falta el extracto, no porque no sea un traspaso. Lo mismo para los 16.300 € de
2024-08 (cuenta origen no dada de alta) y los dos micro-ingresos de ING.

**Conclusión operativa: buscar el espejo no sirve como señal principal.** Solo
funciona cuando las dos cuentas tienen el mismo periodo importado.

### Cuidado con el patrón laxo

Si se relaja el patrón a "el concepto contiene TRANSF", salen **251**
movimientos, de los que **179 no tienen `transferId`** y la mayoría **no son
traspasos propios**:

- 48 `TRANSF NOMI /EMPRESA MUNICIPAL` → **es la nómina** (≈2.100 €/mes de ingreso real).
- ~100 `TRANSFERENCIA A FAVOR DE <persona>` (dos destinatarias) → gasto real a terceros.
- `TRANSFERENCIA A FAVOR DE Clicars Spain S.L.U` (16.990 €) → compra de coche.
- `TRANSF O /<persona>` (50.000 €) → ingreso real.
- `TRANSFERENCIA DE AMAZON PAYMENTS` → devoluciones.

El patrón laxo destruiría 162.101,65 € de ingreso legítimo. **No usarlo.**

## 4. Los depósitos de myinvestor

85 movimientos en la cuenta. Conceptos distintos (normalizando los números):

| Patrón | n | Naturaleza |
|---|---|---|
| `APERTURA DEP.:  <num>` | 15 | traspaso a plazo fijo (ruido) |
| `INTERESES DEP.: <num>` | 12 | vencimiento: principal + intereses (ruido + algo de señal) |
| `CANCELACION DEP:<num>` | 2 | cancelación (ruido) |
| `Aportacion automatica cartera` | 14 | aportación a cartera indexada (inversión) |
| `SUSCRIPCIÓN PREMIUM` / `IVA SUSCRIPCIÓN PREMIUM` | 10 + 3 | gasto real (7,99 €/mes) |
| `ISHARE DEVLP REAL ESTATE INDX` | 7 | compra de fondo (inversión) |
| `PERIODO dd/mm/aaaa dd/mm/aaaa` | 13 | remuneración de la cuenta, 0,39–7,96 € (ingreso real) |
| `INGRESO` | 4 | entradas desde bankinter (3 de las 4 ya tienen `transferId`) |
| `Movimiento ING` | 1 | 5.000 € desde ING (traspaso propio sin espejo) |
| `ETC ISHARES PHYSICAL GOLD @ 7` | 1 | compra de fondo |
| `Aportacion a mi cartera` | 1 | inversión |
| `Remuneración premium primer me` / `Ret. remuneración premium prim` | 1 + 1 | ingreso real / retención |

**Los tres patrones de depósito (29 movimientos) suman 285.000,00 de gasto y
275.651,57 de ingreso**, es decir, ellos solos explican el 58 % del gasto y el
56 % del ingreso de toda la base de datos.

### ¿Se pueden emparejar apertura y vencimiento?

**Sí, por el número de depósito**, que aparece en los dos conceptos. 12 números
distintos:

| Depósito | Apertura (gasto) | Vencimiento (ingreso) | Emparejado |
|---|---|---|---|
| 665251 | — (anterior al inicio de datos) | 2025-08-25 · 20.034,01 | huérfano |
| 665264 | 2025-08-25 · 20.000,00 | 2025-09-25 · 20.034,01 | sí |
| 665279 | 2025-09-25 · 20.000,00 | 2025-10-25 · 20.032,92 | sí |
| 665295 | 2025-10-26 · 20.000,00 | 2025-11-27 · 20.034,01 | sí |
| 665309 | 2025-11-28 · 20.000,00 | 2025-12-28 · 20.029,65 | sí |
| 665322 | 2025-12-29 · 30.000,00 | 2026-01-29 · 30.081,09 | sí |
| 665341 | 2026-01-30 · 30.000,00 | 2026-04-30 · 30.177,96 | sí |
| 665387 | 2026-04-30 · 25.000,00 + 5.000,00 | 2026-05-30 · 5.013,08 y 2026-07-30 · 25.149,95 | sí (2 tramos) |
| 665405 | 2026-06-01 · 5.000,00 | 2026-07-01 · 5.013,08 | sí |
| 665419 | 2026-07-01 · 5.000,00 | 2026-08-01 · 5.013,51 | sí |
| 665432 | 2026-07-31 · 25.000,00 ×2 y 2026-08-01 · 5.000,00, con `CANCELACION` de 25.000,00 | 2026-08-31 · 25.038,30 | sí, con un duplicado de reimportación |
| 665447 | 2026-09-01 · 25.000,00 y 2026-09-02 · 25.000,00, con `CANCELACION` de 25.000,00 | pendiente (aún no vencido) | abierto |

El emparejamiento por número es limpio: **11 de 12 tienen los dos lados** (el
huérfano 665251 se abrió antes del primer extracto). El patrón es mensual: cada
mes vence uno y se abre el siguiente por el mismo principal.

Detalle útil: el vencimiento trae **principal + intereses** en un solo apunte
(20.000 → 20.034,01). Si se descarta el apunte entero se pierden los intereses,
que **sí son ingreso real**. La suma de intereses realmente ganados (vencimientos
menos aperturas emparejadas) es del orden de **900 €** en todo el periodo. Es
pequeño, pero es el único ingreso financiero de verdad que hay ahí.

## 5. Qué señal distingue mejor el ruido

Comparativa honesta, señal a señal:

| Señal | Cobertura | Falsos positivos | Veredicto |
|---|---|---|---|
| **La cuenta (excluir myinvestor entera)** | 85 movs, 289 k€ por lado | Altos: se lleva los 13 `PERIODO` de remuneración, la `Remuneración premium`, las suscripciones premium (gasto real de 7,99 €/mes) y los ~900 € de intereses | Demasiado bruto. Borra una cuenta del mapa |
| **`transferId` no nulo** | 80 movs, 48.550 € por lado | 2 de 40 grupos (multa DGT + Bizum de un tercero): 150 € por lado | Muy buena precisión (95 %) pero cobertura bajísima: deja fuera el 100 % de los depósitos y 17 traspasos |
| **Concepto (patrón estricto)** | 71 movs | 0 detectados en la revisión manual de los 71 | Preciso, pero solo si el patrón exige banco propio o titular. Fragilísimo al formato de cada banco: `TRANS INM/`, `TRANSF OTRAS ENTID /`, `TRANSF OTR /V.M.Día-`, `TRANSF /Juan_Jose_Romero_Ramos`, `JUAN JOSE ROMERO RAMOS - INGRESO`… cinco plantillas para lo mismo |
| **Concepto (patrón laxo "contiene TRANSF")** | 251 movs | Catastróficos: 48 nóminas, ~100 transferencias a dos personas, la compra del coche, los 50.000 € de un tercero | Descartar |
| **Importe redondo (≥500 y múltiplo de 500)** | 119 movs | 14 de 119 no son ruido (11,8 %): 50.000 € de un tercero, 16.990 € de Clicars, 1.500 € a otra persona, 2.500–3.000 € a Trade Republic/Criptan… | Como señal única, no. Como refuerzo de una sospecha, sí |
| **Espejo en otra cuenta (±3 días, signo contrario)** | 1 de 17 candidatos | El emparejador se cae cuando dos cuentas tienen periodos importados distintos | Inútil como señal principal en estos datos |

### El criterio recomendado

Unión de tres reglas **ortogonales**, ninguna basada en la cuenta entera:

1. `transferId` no nulo — *pero revisando el emparejador*, que hoy tiene 2
   falsos positivos por juntar solo importe + fecha sin mirar el concepto.
2. Concepto que empieza por `APERTURA DEP`, `INTERESES DEP` o `CANCELACION DEP`
   — 29 movimientos, cero ambigüedad, y el número de depósito permite trazar el par.
3. Concepto de transferencia **más** nombre de banco propio o del titular, con
   `TRANSF NOMI` excluido explícitamente — 71 movimientos.

Excluye **126 movimientos de 1.607 (7,8 %)** y deja las sumas globales en
152.998,99 de ingreso y 122.872,60 de gasto.

**Falsos positivos que asume este criterio:** los 2 grupos de multa/Bizum que
arrastra `transferId` (150 € por lado). Es el único coste conocido.

**Falsos negativos que quedan** (ruido que sigue colándose):

| Fecha | Importe | Concepto | Por qué se escapa |
|---|---|---|---|
| 2026-05-08 | 5.000,00 income | `Movimiento ING` (myinvestor) | dinero propio desde ING; no dice "transferencia" ni nombra un banco propio |
| 2024-11-01 | 1.000,00 expense | `TRANSF OTRAS ENTID /ING` | ING no está dado de alta como cuenta |
| 2024-11-19, 12-09, 12-30, 2025-02-28, 03-05 | 2.000–3.000 | `TRANSF … /Trade Republic` | broker propio, cuenta no dada de alta |
| 2024-11-01, 11-07 | 1.000,00 ×2 | `TRANSF … /Criptan` | ídem |

Es decir: **el hueco real son las cuentas propias no dadas de alta** (ING, Trade
Republic, Criptan). Ninguna heurística de concepto puede resolverlo bien sin una
lista de "entidades mías" que el usuario mantenga. Esa lista, junto con la regla 3,
es la señal más fuerte disponible sin tocar el backend.

**Casos límite que no hay que romper**, para tenerlos en la cabeza al escribir
cualquier regla:

- `TRANSF NOMI /EMPRESA MUNICIPAL`: 48 apuntes, ≈105.000 € de ingreso. Es la
  nómina. Cualquier patrón que empiece por "TRANSF" la atrapa. Hay que excluirla
  a mano.
- `TRANSFERENCIA A FAVOR DE <persona>` (dos destinatarias): ~100 apuntes de
  gasto real. El concepto suele ser `CONCEPTO: ingreso`, que engaña doblemente.
- `TRANSF O /<persona>` 50.000 €: importe redondísimo e ingreso enorme,
  y es dinero real que entra. La regla de importe redondo lo mataría.
- `TRANSFERENCIA A FAVOR DE Clicars Spain S.L.U` 16.990 €: gasto real grande.
- `Pago de JUAN JOSE ROMERO RAMOS` (revolut): mismo titular, y **sí** es traspaso
  propio. Si algún día hay un homónimo, el nombre deja de servir.

## 6. Últimos 6 meses (2026-04 a 2026-09)

| | Ingreso | Gasto | Neto | Movimientos |
|---|---|---|---|---|
| **Hoy** (lo que enseña la API, ya sin `transferId`) | 165.828,94 | 168.375,80 | −2.546,86 | 347 |
| **Con el criterio recomendado** | 20.359,59 | 23.375,80 | −3.016,21 | 328 |
| Reducción | **−87,7 %** | **−86,1 %** | | −19 |

Mes a mes:

| Mes | Hoy I | Hoy G | Criterio I | Criterio G |
|---|---|---|---|---|
| 2026-04 | 32.714,03 | 34.396,54 | 2.536,07 | 4.396,54 |
| 2026-05 | 12.217,76 | 4.827,26 | 7.204,68 | 4.827,26 |
| 2026-06 | 5.144,33 | 10.085,22 | 5.080,86 | 5.085,22 |
| 2026-07 | 57.948,93 | 59.096,05 | 2.785,90 | 4.096,05 |
| 2026-08 | 32.642,07 | 9.003,89 | 2.590,26 | 4.003,89 |
| 2026-09 | 25.161,82 | 50.966,84 | 161,82 | 966,84 |

Las cifras limpias (2.500–5.000 € de ingreso y 4.000–5.000 € de gasto al mes) son
coherentes con una nómina de ≈2.100 € por catorce pagas y un gasto corriente del
mismo orden. Las de hoy no son interpretables: 2026-07 da 58.000 / 59.000 € y
2026-09 da 25.000 de ingreso contra 52.000 de gasto, puro artefacto de los
depósitos.

Notas:

- **2026-05 sigue inflado** (7.204,68 en vez de ~2.200) por los 5.000 €
  `Movimiento ING`. Es el falso negativo más caro del criterio.
- **2026-09 está incompleto**: los datos acaban el día 11, y con el criterio
  aplicado quedan 161,82 de ingreso y 966,84 de gasto.
- Si además se sacaran las aportaciones a cartera y compras de fondos de
  myinvestor (28 movimientos, 16.000 de ingreso y 5.791,65 de gasto), los 6 meses
  quedarían en **15.359,59 / 19.684,15**. Eso ya no es quitar ruido, es decidir
  que una inversión no es un gasto: es una decisión de producto, no de limpieza.

## Anexo: calidad del dato

Buscando movimientos idénticos (misma cuenta, fecha, importe, tipo y concepto)
aparecen **62 grupos con 128 movimientos implicados**. Algunos son legítimos
(dos cafés de 0,45 € el mismo día), pero al menos uno no lo es: el triplicado de
`2026-07-24 / 1.000,00 / bankinter → openbank`, con tres `transferId` distintos.
Conviene tenerlo presente porque contamina cualquier medición de traspasos.
