# Borrador — E8, los dashboards

> **Esto es un borrador que ha escrito el agente para que TÚ lo corrijas.**
> No es una decisión: es una propuesta razonada con tus datos, medidos el 2026-10-02.
> Táchalo, cámbialo y contesta las preguntas del final. Según lo apruebes, cada vista
> se convierte en su propia feature, de una en una, y este archivo se borra.

## Lo que ya decidiste tú, en agosto

En `../docs/ideas.md` (idea nº 4, refinada el 2026-08-22) dejaste el orden y el
principio. Lo respeto tal cual:

| Orden | Vista | Qué responde | Estado |
|---|---|---|---|
| 1ª | Patrimonio | cuánto tengo, y si crecí por aportar o por ganar | ✅ hecha (F9) |
| 2ª | **Mes** | tasa de ahorro, si el mes fue normal, en qué se fue | ⬜ |
| 3ª | Extracto | el detalle, con filtros | ✅ hecha (F19–F24) |
| 4ª | **Recurrentes** | cuánto me cuesta existir, qué me ha subido | ⬜ |
| 5ª | **Año** | estacionalidad, tendencia, fijo frente a variable | ⬜ |

Y tres reglas tuyas que mandan sobre todo lo que sigue:

- **Lo primero que se lee es una frase, no un gráfico.**
- **Honestidad del dato:** cada vista dice de qué se fía.
- **Barras horizontales, no donut,** para repartos.

## Lo que dicen tus datos hoy

**1. Las sumas ya son de fiar.** Con los depósitos apartados y los traspasos
emparejados, tus últimos doce meses se leen así:

| Mes | Entra | Sale | Ahorro | Tasa |
|---|---|---|---|---|
| 2025-10 | 2.152 | 2.819 | −667 | −31 % |
| 2025-11 | 2.151 | 2.063 | 88 | 4 % |
| 2025-12 | 5.045 | 3.116 | 1.929 | 38 % |
| 2026-01 | 3.114 | 1.893 | 1.222 | 39 % |
| 2026-02 | 2.050 | 1.875 | 176 | 9 % |
| 2026-03 | 4.392 | 2.532 | 1.860 | 42 % |
| 2026-04 | 2.536 | 4.397 | −1.860 | −73 % |
| 2026-05 | 7.205 | 4.827 | 2.377 | 33 % |
| 2026-06 | 5.144 | 5.085 | 59 | 1 % |
| 2026-07 | 2.786 | 4.096 | −1.310 | −47 % |
| 2026-08 | 2.590 | 4.004 | −1.414 | −55 % |
| 2026-09 | 162 | 967 | −805 | — (solo hasta el día 11) |

Esto ya cuenta una historia que antes no se podía ver: una entrada base de unos
2.100-2.500 €, meses con ingresos extra, y un gasto que sube en primavera y verano.

**2. Pero el reparto por categoría todavía no existe.** De 154.523 € de gasto que
cuenta, **solo 10.625 € tienen categoría: el 6,9 %**. Son 221 movimientos de 1.381.
Un gráfico de «en qué se me fue el dinero» hoy sería una barra enorme que dice
«sin categoría» y cuatro rayitas. No es un problema de código: es que la cola de
revisión está por vaciar.

**3. Los recurrentes sí están, y no necesitan categorías.** Hay **24 conceptos de
gasto que se repiten en seis meses o más**. Entre ellos, sin pedirle nada a nadie:

| Concepto | Meses | Importe habitual |
|---|---|---|
| Recibo de la comunidad | 30 | 147 € (116–191) |
| Iberdrola | 31 | 49 € (25–95) |
| Gimnasio | 28 | 27 € (21–35) |
| Recibo de la tarjeta | 25 | 288 € (muy variable) |
| Telefonía | 24 | 38 € (37–39) |
| Impuesto municipal | 16 | 159 € (111–195) |
| Aportación automática a la cartera | 13 | 282 € |

Es exactamente lo que tu refinamiento llamaba «cuánto me cuesta existir».

**4. Septiembre de 2026 está incompleto** (tus datos acaban el día 11). Cualquier
vista del mes tiene que decirlo en vez de enseñar un −497 % de tasa de ahorro.

---

## Lo que propongo: cuatro features, de menos a más bloqueada

### A — El mes de un vistazo
*Lo que ya se puede hacer hoy, entero.*

Una pantalla con el mes en una frase —«En agosto entraron 2.590 € y salieron 4.004 €:
gastaste 1.414 € más de lo que ingresaste»— y debajo las tres cifras, la tasa de
ahorro, y **si fue un mes normal**: comparado con tu media de los doce anteriores.
Con una línea de honestidad: cuánto del gasto de ese mes no tiene categoría todavía.

*No lleva* reparto por categoría: con un 6,9 % categorizado sería mentir con un
gráfico.

### B — El año en una tira
*También se puede hacer hoy.*

Doce o veinticuatro meses seguidos: lo que entró y lo que salió cada mes, y el ahorro
acumulado. Es donde se ve la estacionalidad —tu gasto sube de abril a agosto— y la
tendencia. Marcando el mes incompleto como incompleto.

### C — Recurrentes: cuánto me cuesta existir
*Se puede hacer con tus datos, pero hay una decisión de fondo.*

La lista de lo que pagas todos los meses, cuánto suma al mes, y **qué ha subido**
(«la luz pasó de 62 a 84 €»). Es la vista que más te va a enseñar, y no necesita ni una
categoría.

**La decisión:** hoy **no existe ningún endpoint** que diga qué es recurrente. Hay dos
caminos, y son distintos de verdad:

- **Calcularlo en el frontend,** bajándose el histórico y agrupando. Funciona ya, pero
  es lógica de negocio viviendo en la pantalla, que es justo lo que hemos evitado en
  toda la E7 («las cifras son del backend»).
- **Pedírselo al backend** con un traspaso, como hicimos con las sumas. Es lo coherente
  con la regla del workspace, y lo que yo haría; tarda una sesión suya más.

### D — En qué se me fue (por categoría)
*Bloqueada por dato, no por código.*

El reparto del gasto por categoría, con barras horizontales, y el corte fijo/variable
que querías decidir tú marcando categorías. **Hoy no tiene sentido construirla:**
enseñaría un 93 % «sin categoría». Tiene sentido cuando hayas vaciado una parte de la
cola, y las reglas y la pantalla de revisión ya están para eso.

### Y una pequeña, aparte: lo que ganó cada depósito
El backend ya lo sirve (`GET /api/investments/deposits`) y nadie lo usa. Encaja en la
vista de Patrimonio, y recupera los intereses que, al apartar los vencimientos de las
sumas, dejaron de verse en ningún sitio.

---

## Preguntas que cambian el plan

Contéstalas aquí mismo, en una línea cada una:

1. **¿Por cuál empezamos?** Mi orden sería A (el mes), B (el año), y la pequeña de los
   depósitos; C cuando decidas cómo se calcula, y D cuando tengas más categorizado.
   → *respuesta:*

2. **«Si el mes fue normal»:** ¿comparado con qué? Con la **media de los doce meses
   anteriores**, con el **mismo mes del año pasado**, o con las dos cosas.
   → *respuesta:*

3. **Recurrentes: ¿lo calcula el frontend, o se lo pedimos al backend?**
   → *respuesta:*

4. **¿El mes y el año son dos pantallas** (dos entradas en el menú) **o una sola** con
   el mes arriba y la tira del año debajo?
   → *respuesta:*

5. **¿Qué es para ti la pantalla de inicio?** Hoy al abrir la aplicación caes en
   Patrimonio. ¿Sigue siendo esa, o debería ser el mes de un vistazo?
   → *respuesta:*

6. **La aportación automática a la cartera (282 € al mes) sale hoy como gasto.** Es
   dinero que sigue siendo tuyo, solo que cambia de forma. ¿La quieres ver como gasto,
   o la marcas como que no cuenta, igual que los depósitos?
   → *respuesta:*

---

## Lo que yo haría, si me dejas opinar

**Empezar por A y pequeño.** El mes en una frase, tres cifras, y la comparación con tu
media. Es lo que más rápido te devuelve algo, y lo que más vas a mirar.

**No construir D todavía.** No porque no se pueda, sino porque enseñaría un vacío. Lo
honesto es que la vista del mes diga «solo el 7 % de este gasto tiene categoría» y te
empuje a vaciar la cola, no fabricar un gráfico que finge saber.

**Y C, por el backend.** Sé que tarda más, pero llevamos seis features repitiendo que
las cifras son del backend; ponerse ahora a detectar recurrentes en el navegador sería
deshacer esa regla justo donde más importa.
