# Revisión de todos los movimientos: dónde puede fallar un dato

> **Qué es.** Primera pasada, pedida por el humano el 2026-10-10, sobre todos
> los movimientos de la base, para localizar los casos en que la aplicación puede
> estar contando mal (lo que él llamó «posible fuga de datos»). Solo localiza y
> mide. No propone arreglos: eso se ve caso a caso con él.
>
> **Cómo se hizo.** Un script leyó por la API (`GET /api/movements`, solo
> lectura) los 1.607 movimientos, con 1.607 identificadores distintos, y los
> agrupó. Los grupos por texto del concepto son búsquedas: pueden dejarse alguno
> fuera o meter alguno de más. No se abrió ningún archivo del banco.
>
> **Nombres.** No se escriben nombres de personas. Donde hace falta, se dice
> «un familiar», «una persona» o «tu propio nombre».

## La foto de partida

| Dato | Valor |
|---|---|
| Movimientos | 1.607 (1.434 salidas, 173 entradas, ninguno de tipo neutro) |
| En pareja de traspaso | 76 (38 parejas) |
| Marcados como que no cuentan | 30 |
| Con categoría | 596 |

## Casos con duda, de más a menos dinero

### A. Dinero que va o viene de una cuenta propia sin pareja ni marca

Cuenta hoy como gasto o como ingreso y no lo es.

| Qué | Movimientos | Importe |
|---|---|---|
| Salidas de Bankinter a MyInvestor, Trade Republic, Criptan e ING | 18 | 44.500 € |
| Salida de Bankinter a tu propio nombre | 1 | 1.000 € |
| Salidas de Bankinter a tu propio nombre, escrito con guiones bajos (la búsqueda inicial no las vio) | 2 | 1.500 € |
| Entrada en Openbank desde tu propio nombre | 1 | 16.300 € |
| Entradas en N26 desde tu propio nombre (`Movimiento ING`, `Ingreso`) | 3 | 3.400 € |
| Entrada en Bankinter desde tu propio nombre | 1 | 1.000 € |
| Entrada en la cuenta de MyInvestor `Movimiento ING` | 1 | 5.000 € |

Es el cabo suelto 14 del roadmap, con más casos de los que se habían visto: no
son solo salidas, también hay **entradas** (25.700 €) que cuentan como ingreso.

### B. Lo que pasa dentro de la cuenta de MyInvestor

52 movimientos de esa cuenta cuentan en las sumas.

| Qué | Movimientos | Importe | Duda |
|---|---|---|---|
| `Aportacion automatica cartera` y `Aportacion a mi cartera` | 15 | 4.010 € de salida | Es inversión, no gasto |
| Compras de ETF y fondos | 8 | 1.781,65 € de salida | Ídem |
| `SUSCRIPCIÓN PREMIUM` y su IVA | 13 | 73,20 € de salida | Es gasto real |
| `PERIODO …` (intereses de la cuenta) | 14 | 40,88 € de entrada | Es ingreso real |
| Uno más, sin identificar en esta pasada | 1 | 0,18 € de salida | — |

### C. Los depósitos marcados como que no cuentan

29 movimientos de depósito están marcados: 15 aperturas (285.000 € de salida),
2 cancelaciones (50.000 € de entrada) y 12 `INTERESES DEP.` (225.651,57 € de
entrada).

Duda: los `INTERESES DEP.` no son solo intereses. Por los importes (25.149,95 €,
5.013,08 €) son la devolución del capital **más** los intereses. Al estar
marcados enteros, **los intereses ganados no cuentan como ingreso en ningún
sitio**. No está sumado cuánto es.

Hay además un movimiento de otra clase marcado como que no cuenta: una compra
de 25,00 € en N26 (`TULOTERO`). No se sabe quién lo marcó ni cuándo; puede ser
un resto de una prueba.

**Lo que quiere el humano para los depósitos (2026-10-16, con sus palabras):** «si un depósito se cancela no tiene repercusión en el aumento del saldo o patrimonio, tampoco debería tenerlo solo por ser un depósito; lo que se gana son los intereses cuando vence su plazo». Es decir: abrir o cancelar un depósito no es ni gasto ni ingreso; solo los intereses lo son, cuando vence.

**Cómo está hoy, medido el 2026-10-16 tras importar octubre:**

- **En el patrimonio (`Net Worth`) ya se cumple.** Abrir un depósito saca el dinero de la cuenta y lo suma como producto (`Depósito 12 meses 2026-10`, 25.000 €, su capital, sin intereses hasta que vence); el total no sube por abrirlo. Con todos los archivos al día, el patrimonio pasó de 88.852,64 € a 88.402,49 €. No se ha comprobado movimiento a movimiento.
- **En las sumas (`Movements`, `Overview`) no se cumple.** Los movimientos de depósito que no se marcan a mano cuentan enteros: octubre sale con 75.203,92 € de entrada y 78.455,20 € de salida, cuando 75.037,07 € y 75.000 € son de depósitos. Y los ya marcados están marcados enteros, así que **los intereses no cuentan en ningún sitio**: el `INTERESES DEP.` de 25.037,07 € trae 25.000 € de capital y 37,07 € de interés, y solo esos 37,07 € deberían contar como ingreso.
- Para separar capital e intereses hace falta saber el capital de cada depósito: el backend lo tiene en el producto (`principal`) y en el movimiento de apertura. Es trabajo del backend.

### D. El recibo de la tarjeta de crédito

26 recibos `RECIBO VISA CLASICA` de Bankinter suman 7.492,29 €. Las compras
hechas con esa tarjeta no están en la aplicación: solo el recibo del mes
siguiente.

Dudas: ese gasto no se puede categorizar (es un solo movimiento por mes), y cae
en el mes del recibo, no en el de la compra. Si algún día se importan las
compras de la tarjeta, se contarían dos veces.

### E. Devoluciones que cuentan como ingreso

Entradas que vienen de un comercio, de un seguro o de una comunidad y no de una
nómina: al menos 14 movimientos y unos 2.186 € (anulaciones de recibos de
seguros y comunidad, devoluciones de Amazon y AliExpress, una entrada de una
empresa de alquiler de coches).

Duda: hoy suben `Money in` en lugar de bajar `Money out`. El mes sale con más
ingreso y más gasto del real; la diferencia es la misma.

### F. Dinero de personas

| Qué | Movimientos | Importe |
|---|---|---|
| Bizum que salen | 67 | 3.420,40 € |
| Bizum que entran | 23 | 1.026,75 € |
| Transferencias a dos familiares desde Openbank | 86 | unos 14.900 € de salida |
| Entradas grandes de un familiar en Bankinter | 2 | 50.281,22 € |
| Otras entradas de familiares | 4 | 1.400 € |

Dudas: un Bizum que entra suele ser alguien que te devuelve su parte de un
gasto que pagaste tú, y cuenta como ingreso. Las transferencias periódicas a
familiares pueden ser gasto o un reparto de gastos comunes: solo lo sabes tú.
Las entradas de 50.000 € no son ingreso de un mes normal y deforman cualquier
media.

### G. Compras y pagos excepcionales

Reales, pero deforman el mes y la comparación con el mes habitual: la compra de
un coche (16.990 €), una moto (7.100 €), un taller (unos 6.000 € en tres pagos),
un alojamiento (1.820 €), cinco pagos a Hacienda (3.832,80 €), cuatro entradas
de un juzgado (2.440,88 €).

### H. Movimientos idénticos el mismo día

62 grupos de movimientos con la misma cuenta, día, importe y concepto: 128
movimientos. Si fueran repeticiones sobrarían 66.

- 54 grupos son de menos de 20 €, casi todos de una máquina de café (48).
  Verosímil que sean reales.
- 8 grupos son de 20 € o más: dos aperturas de depósito de 25.000 € el mismo
  día (marcadas como que no cuentan); tres traspasos de 1.000 € el mismo día,
  en sus dos lados (emparejados); cuatro meses con dos recibos de gimnasio de
  29,90 €; dos cobros de 36,50 € de un TPV.

Cada uno lleva un número de orden distinto dentro del día, así que el banco los
dio como movimientos separados. No se ha comprobado contra los archivos.

### I. Cuentas donde no se puede comprobar el saldo

| Banco | Movimientos | Con saldo del banco en cada línea | Saltos entre saldo y movimientos |
|---|---|---|---|
| Bankinter | 371 | 371 | 0 |
| Openbank | 205 | 205 | 0 |
| Revolut | 35 | 35 | 0 |
| N26 | 911 | 0 | no se puede comprobar |
| MyInvestor | 85 | 0 | no se puede comprobar |

En Bankinter, Openbank y Revolut el saldo que da el banco cuadra línea a línea
con los movimientos: no falta ni sobra ninguno entre el primero y el último. En
**N26 y MyInvestor (996 movimientos, el 62 % del total) esa comprobación no
existe**, porque sus archivos no traen saldo.

### J. Periodos sin datos

| Banco | Tiene movimientos | Meses vacíos en medio |
|---|---|---|
| Bankinter | ene 2024 → sep 2026 | ninguno |
| N26 | ene 2024 → sep 2026 | ninguno |
| Openbank | ago 2024 → sep 2026 | ninguno |
| MyInvestor | ago 2025 → sep 2026 | ninguno |
| Revolut | feb 2025 → oct 2025 | marzo, julio y septiembre de 2025 |

Revolut no tiene nada desde octubre de 2025: o no se usa, o faltan archivos.
Trade Republic, ING y Criptan no tienen movimientos.

### K. Lo que no pasa por el banco

Ningún movimiento de cajero ni de retirada de efectivo en toda la base. Los
gastos en metálico que apuntaba en su Excel (26 € y 171,10 € en los dos meses
que enseñó) no existen en la aplicación.

## Lo que se comprobó y está bien

- Las 38 parejas de traspaso tienen los dos lados con el mismo importe y a tres
  días o menos uno del otro.
- Ningún Bizum está emparejado como traspaso.
- No hay identificadores repetidos.

## Lo que esta pasada no mira

- Si cada movimiento coincide con su línea del archivo del banco.
- Si la categoría puesta a cada movimiento es la correcta.
- Los movimientos de menos de 1.000 € que no caen en ningún grupo de arriba:
  no se ha mirado uno por uno, ni se ha contado cuántos son.
- Las inversiones y sus valoraciones (`Net Worth`).
