# Guía de uso y de prueba de la aplicación

> **Para qué sirve este documento.** Para sentarte con la aplicación abierta al
> lado y probarla pantalla por pantalla: recuerda qué hace cada cosa, qué debes
> ver al pulsar, qué escribe en tus datos y cómo se deshace. En cada pantalla hay
> un bloque para que apuntes lo que falle o lo que quieras cambiar.
>
> **Escrita el 2026-10-05**, leyendo el código, los resúmenes de cierre de cada
> feature y el roadmap. Después se repasó en el navegador, ese mismo día, contra
> tus datos reales y **solo leyendo** (sin pulsar nada que escriba).
>
> **Lo que NO se ha comprobado en el navegador:** el apartado «Qué verás si el
> backend no está arrancado»; todos los pasos que escriben en tus datos (poner
> categoría, crear o aplicar reglas, marcar, enlazar o desenlazar parejas,
> importar); y si al crear una regla desde `Movements` sale luego en `Review` el
> aviso con el botón `Apply rules now`. Eso sale de leer el código y de las
> pruebas hechas al cerrar cada feature, no de esta revisión.
>
> **Sobre las cifras.** Las cifras de tus datos que aparecen aquí llevan la fecha
> en que se midieron. Son de ese día, no de hoy: si has importado o marcado algo
> después, verás otras.
>
> **Sobre los textos en inglés.** La aplicación está en inglés. Lo que aparece
> `así` es el texto tal como sale en pantalla. Una excepción: las etiquetas de
> las tarjetas de cifras (`Net worth`, `Money in`, `Money out`, `Savings`,
> `Savings rate`) se ven en pantalla **en mayúsculas** (`NET WORTH`, `MONEY IN`…).

---

## Antes de empezar

Tienen que estar arrancadas tres cosas, en este orden.

| Qué | Dónde | Comando | Qué deja |
|---|---|---|---|
| La base de datos | carpeta `gastos-backend/` | `docker compose up -d` | PostgreSQL en el puerto 5434 |
| El backend | carpeta `gastos-backend/` | `pnpm run dev` | La API en `http://localhost:3000` |
| El frontend | carpeta `gastos-frontend/` | `pnpm dev` | La aplicación en `http://localhost:5173` |

La documentación del backend pone, entre la base de datos y el backend, el
comando `pnpm run prisma:migrate`, que aplica las migraciones de la base.

**Dirección que abrir:** `http://localhost:5173`. Te lleva sola a `Net Worth`.
Si el puerto 5173 está ocupado, Vite arranca en el 5174: mira la dirección que
escribe en el terminal.

**Para saber si el backend está vivo** antes de abrir la aplicación, abre
`http://localhost:3000/health` en el navegador. Debe responder con
`"status":"ok"`. `http://localhost:3000/health/db` dice además si llega a la
base de datos.

### Qué verás si el backend no está arrancado

> No comprobado en el navegador: sale de leer el código.

La aplicación se abre igual, con su menú y su barra superior, pero ninguna
pantalla tiene datos. Cada una lo dice a su manera:

| Pantalla | Qué sale |
|---|---|
| `Net Worth` | Una tarjeta `Couldn't load your net worth` con un texto técnico debajo que empieza por `HTTP`. No tiene botón para reintentar: hay que recargar la página. |
| `Review` | `Something went wrong loading the list.` con un botón `Try again`. En el menú, `Review` sale sin número. |
| `Rules` | `Something went wrong loading your rules.` con `Try again`. |
| `Transfers` | `Couldn't load the doubtful transfers.` y `Couldn't load the linked pairs.`, cada una con su `Try again`. |
| `Overview` y `Movements` | `Something went wrong loading this month.` con `Try again`. |
| Botón `Import` | No sale el aviso de archivos nuevos. Al pulsarlo: `Couldn't reach the server` y `Nothing has been imported.` |

En algunos casos el texto puede ser `Couldn't reach the server.` en lugar de
`Something went wrong…`. Significa lo mismo: arranca el backend y pulsa
`Try again`.

### Tres cosas que valen para toda la aplicación

- **El menú de la izquierda** tiene siete entradas, en este orden: `Net Worth`,
  `Review`, `Rules`, `Transfers`, `Overview`, `Movements`, `Investments`.
- **La barra de arriba** enseña el nombre de la pantalla y, a la derecha, el
  botón `Import`. Está en todas las pantallas.
- **Importes, fechas y conceptos no se pueden editar desde ninguna pantalla.**
  Son lo que dijo el banco. Lo único que la aplicación escribe sobre un
  movimiento es: su categoría, si está pendiente o confirmado, si cuenta o no
  en las sumas, y con qué otro movimiento está enlazado como traspaso.

---

## Mapa de la aplicación

| Pantalla | Para qué sirve | ¿Escribe? |
|---|---|---|
| `Net Worth` | Cuánto tienes hoy y de qué está hecho, por tipo y por banco | Solo mira |
| `Overview` | Un mes resumido: qué entró, qué salió, cuánto ahorraste, y debajo los últimos 24 meses | Solo mira |
| `Investments` | Nada todavía: pantalla vacía | — |
| `Movements` | Todos tus movimientos mes a mes, con sus sumas | **Escribe**: la categoría de un movimiento, y si un movimiento cuenta o no en las sumas |
| `Review` | La lista de lo importado que aún no has dado por bueno | **Escribe**: la categoría y el estado (pendiente o confirmado) |
| `Rules` | Las reglas que ponen categoría solas según el texto del concepto | **Escribe**: crea, cambia y borra reglas; al aplicarlas, pone categoría a muchos movimientos de golpe |
| `Transfers` | Los traspasos entre tus cuentas que la aplicación tiene enlazados de dos en dos | **Escribe**: enlaza y desenlaza dos movimientos |
| Botón `Import` (barra superior) | Trae los archivos nuevos de Google Drive | **Escribe**: crea movimientos, y puede crear cuentas y productos. No se deshace desde la aplicación |

---

# Recorrido de prueba

El orden va de lo que solo mira a lo que escribe. Dentro de cada pantalla que
escribe, los primeros pasos solo miran y los últimos escriben.

**Antes de las pruebas que escriben**, si quieres una copia de la base de
datos: el backend tiene el comando `pnpm run db:backup` (carpeta
`gastos-backend/`, necesita Docker en marcha). Los pasos están en
`gastos-backend/docs/database-backup.md`.

---

## 1. `Net Worth` — solo mira

**Para qué sirve.** Es la pantalla de inicio. Enseña el total de lo que tienes,
una frase que lo resume, el reparto por tipo y por banco, y una ficha por banco
con cada cuenta y cada producto.

### Qué probar

1. Abre `http://localhost:5173`. **Debes ver** que la dirección cambia a
   `/net-worth` y que arriba hay una cifra grande con la etiqueta `Net worth`.
   -- ok

2. Lee la frase bajo la cifra. **Debe** empezar por `As of` y una fecha, decir
   el total y en cuántos bancos está. Si tienes saldo en cuentas corrientes,
   acaba diciendo qué porcentaje es (`… is idle in checking accounts.`).
   -- la fecha que pone debajo no corresponde con el ultimo import, debria poner la ultima fecha de import para saber
      cual fue el ultimo import

3. Mira la tarjeta `By type`. **Debes ver** hasta cuatro filas, cada una con su
   importe, su porcentaje y una barra: `Checking accounts`, `Savings`,
   `Market investments` y `Fixed-term deposits`. La de `Checking accounts`
   lleva la etiqueta `Idle money`.
   -- ok

4. Mira la tarjeta `By bank`. **Debes ver** una fila por banco, de mayor a
   menor importe.
   -- ok

5. Baja a `Details`. **Debes ver** una ficha por banco. Compara el importe que
   lleva la ficha de un banco en su cabecera con el de ese mismo banco en
   `By bank`: **tienen que ser iguales**.
   -- ok

6. Dentro de una ficha, mira una cuenta y un producto. Las cuentas dicen
   `As of` y una fecha. Los depósitos dicen `Matures` o `Matured` y una fecha.
   Los demás productos dicen `Valued` y una fecha.
   -- ok

7. Si hay una tarjeta `Data warnings`, léela. Solo sale cuando el backend
   avisa de algo: un producto sin valoración, una valoración antigua, o un
   depósito vencido sin cerrar. El 2026-10-05 había una: `Depósito 1 mes
   matured on 2 Oct 2026 but is not closed yet; its money may be counted
   twice.` Mientras siga ahí, la cifra grande puede estar contando ese dinero
   dos veces.
   -- ok

### Lo que no hace o hace a medias

- **No tiene histórico.** No dice cuánto ha crecido ni cómo ha evolucionado: el
  backend no sirve todavía el patrimonio a una fecha pasada.
- **No dice desde cuándo hay dato** de cada producto. El backend no lo envía.
- **No enseña lo que ganó cada depósito.** Es lo siguiente que está previsto.
- Un producto sin valoración sale con el texto `No valuation` en lugar de un
  importe, y **no suma** en ningún total. No es un cero.
- Si la carga falla, la tarjeta de error **no tiene botón de reintentar**.
- El 2026-10-05 la frase decía: `As of 5 Oct 2026, you have 88.852,64 € across
  6 banks. 31,6 % of it is idle in checking accounts.`

> **Mis notas de esta prueba**
> - Falla:
> - Quiero cambiar: me gustaria trener como referncia la ultima fecha que se hizo un import de algun archivo
                     por regla general hare un import con todos los archivos, pero me gustaria ver la fecha 
                     del ultimo import para saber de cuando son los datos
> - No entiendo: el tema de las fechas que pone en varias tarjetas, lo de los depositos correcto, cuando
                  vencen o de cuando son, pero en casi todos los sitios pone la fecha de hoy y no se para que

---

## 2. `Overview` — solo mira

**Para qué sirve.** Enseña un mes de un vistazo: una frase que lo resume,
cuatro cifras, si fue un mes habitual y cuánto gasto está sin categoría. Debajo,
los 24 meses que acaban en el mes de tu último movimiento, cada uno con lo que
entró y lo que salió.

**Importante antes de probar.** La pantalla se abre en el mes del calendario de
hoy. Si tus datos acaban antes (el 2026-10-04 acababan en septiembre de 2026),
verás solo una frase del tipo `No movements in October 2026.` seguida de
`Your data ends on` y la fecha de tu último movimiento. No es un fallo: pulsa
`Previous`.

### Qué probar

1. Pulsa `Overview` en el menú. **Debes ver** el título `Overview`, y debajo
   los botones `Previous` y `Next` con el nombre del mes en medio, y a la
   derecha el campo `Jump to month`. `Next` está apagado cuando estás en el mes
   de hoy.
   -- ok

2. Ve a agosto de 2026 con `Jump to month`. **Debes ver** primero una frase.
   El 2026-10-02 decía: `In August 2026, 2.590 € came in and 4.004 € went out:
   you spent 1.414 € more than came in.`
   -- ok

3. Bajo la frase, **debes ver** cuatro tarjetas: `Money in`, `Money out`,
   `Savings` y `Savings rate`.
   -- ok

4. En `Money in` y `Money out`, **debes ver** una etiqueta (`More than usual`,
   `Less than usual` o `About usual`) y una línea que dice cuánto por encima o
   por debajo está de tu mes habitual. El 2026-10-02, en agosto de 2026,
   `Money out` salía `More than usual`, un 34,9 % por encima de 2.967,58 €, y
   `Money in` salía `About usual`.
   -- ok

5. Bajo las tarjetas, lee la línea pequeña. **Debe** decir con cuántos meses se
   ha comparado: `Your usual month is the middle value of the previous 12
   months, worked out here from each month's totals.`
   -- ok

6. Mira la tarjeta siguiente. **Debe** decir cuánto del gasto del mes no tiene
   categoría, con el porcentaje y el número de movimientos
   (`… spending has no category yet`).
   -- ok

7. Pulsa el enlace `See the movements of August 2026`. **Debes llegar** a
   `Movements` en agosto de 2026, sin filtros. Comprueba que las tres cifras
   de arriba (`Money in`, `Money out`, `Difference`) **son las mismas** que
   las de `Overview`. Vuelve con el botón de atrás del navegador.
   -- ok

8. Ve a septiembre de 2026 (o al mes en que acaben tus datos, si ese mes no
   está completo). **Debes ver** que la frase dice que el mes
   `is incomplete`, que `Savings rate` enseña `—` con el texto
   `Not shown: the month is incomplete.`, y que no hay etiquetas de mes
   habitual: `No comparison for an incomplete month.`
   -- ok

9. Baja a la tarjeta `Month by month`. **Debes ver** 24 filas, de la más
   reciente a la más antigua. Cada fila: el nombre del mes, dos barras, y tres
   cifras (`Money in`, `Money out`, `Savings`). `Savings` sale en rojo y con
   signo menos en los meses en que salió más de lo que entró.
   -- ok 

10. En esa tarjeta, **comprueba tres marcas**: el mes que tienes arriba lleva
    `Shown above`; el mes incompleto lleva `Incomplete`, no tiene barras y en
    su lugar dice `Data ends on` y una fecha; un mes sin movimientos diría
    `No movements` (el 2026-10-05 ninguna de las 24 filas lo decía: todas
    tenían datos, así que esta marca no la vas a ver).
   -- ok

11. Lee la frase de encima de las filas. **Debe** decir lo que entró y lo que
    salió en todo el periodo. El 2026-10-04 acababa en `you spent 41.887 €
    more than came in`. Debajo, una línea dice qué mes se queda fuera de esa
    suma por estar incompleto (`… is left out: it is incomplete.`).
   -- ok

12. Pulsa el nombre de un mes de la tarjeta. **Debes ver** que la página sube,
    que ese mes pasa a ser el de arriba, que la marca `Shown above` se mueve a
    su fila, y que las 24 filas **no cambian de sitio**. El botón de atrás del
    navegador te devuelve al mes anterior.
   -- ok

13. Recarga la página. **Debes seguir** en el mismo mes: el mes va en la
    dirección (`/overview?month=2026-08`).
    ok

### Lo que no hace o hace a medias

- **La etiqueta de mes habitual todavía no es de fiar en todos los meses.** El
  2026-10-02, enero de 2026 salía «53,5 % menos de lo habitual», y no es
  verdad: entre octubre de 2024 y septiembre de 2025, siete de los doce meses
  pasan de 5.000 € de salida por traspasos a tus cuentas de inversión que
  nadie ha marcado. No se arregla con código: se arregla marcándolos tú (ver
  «El trabajo que solo puedes hacer tú»).
- **Lo ahorrado en el periodo sale muy negativo** por el mismo motivo.
- **Las barras de los meses normales quedan cortas** mientras haya meses de
  más de 10.000 €: todas comparten una escala, y la marca el mes más alto. El
  2026-10-04 la barra más ancha era la salida de julio de 2025 (11.527,15 €).
- El mes habitual es **el valor central** de los doce meses anteriores, no la
  media. Es la única cifra que la pantalla calcula por su cuenta. Los importes
  vienen del backend, y los porcentajes salen de dividir dos de esos importes.
- Un mes se da por incompleto mirando el último movimiento **de toda la
  base**, no el de cada banco.
- Los 24 meses cuelgan de tu último movimiento, no del mes que mires. Si vas a
  un mes más antiguo, la tarjeta lo dice (`… is not one of these months.`) y
  no señala ninguno.
- **No hay reparto por categoría** ni gráficos por categoría. Está aplazado
  hasta que haya más gasto categorizado.
- La pantalla de inicio sigue siendo `Net Worth`, no esta.

> **Mis notas de esta prueba**
> - Falla:
> - Quiero cambiar:
> - No entiendo: hay meses que pone un gasto excesivo, quizas es lo que me dices hasta que no este todo categorizado no se ve bien, por ejemplo hay muchos meses en el año 2024 con un gasto que no es real

---

## 3. `Investments` — vacía

**Para qué sirve.** Hoy, para nada. Es una entrada del menú sin pantalla
construida.

### Qué probar

1. Pulsa `Investments` en el menú. **Debes ver** una tarjeta que dice
   `Investments is not built yet.`

> **Mis notas de esta prueba**
> - Falla:
> - Quiero cambiar:
> - No entiendo:

---

## 4. `Movements` — mira y escribe

**Para qué sirve.** Es tu histórico completo, mes a mes: lo pendiente y lo
confirmado juntos, agrupado por días, con lo que entró, lo que salió y la
diferencia. Desde aquí se corrige la categoría de un movimiento y se decide qué
movimientos no cuentan en las sumas.

**Importante antes de probar.** Igual que `Overview`, se abre en el mes del
calendario de hoy. Si ese mes no tiene datos verás `No movements in` y el
nombre del mes. Pulsa `Previous`.

### Qué probar — primero lo que solo mira

1. Pulsa `Movements` y ve a julio de 2026 con `Jump to month`. **Debes ver**,
   de arriba abajo: los botones de mes, una barra de filtros, una casilla
   `Hide what does not count`, una tarjeta con cuatro datos (el número de
   movimientos, `Money in`, `Money out` y `Difference`), una nota gris, un
   botón `Select movements` y la lista por días.
   -- ok

2. Mira la lista. **Debes ver** una cabecera por día con la fecha, y en cada
   línea: el concepto, el banco y la cuenta, la categoría (o `Uncategorized`)
   y el importe. Las entradas van en verde y las salidas con signo menos.
   -- ok

3. Busca una línea con la etiqueta `Transfer`. Es uno de los dos movimientos
   de un traspaso entre tus cuentas. **Está en la lista pero no está en las
   sumas.**
   -- ok

4. Busca una línea con la etiqueta `Not counted` y el importe en gris. Es un
   movimiento marcado como que no cuenta. **Tampoco está en las sumas.** El
   2026-09-29 los 29 apuntes de depósito de la cuenta de myinvestor ya estaban
   marcados así.
   -- la cantidad no esta en gris, pone not counted, pero al lado en verde intereses, ademas en español

5. Marca la casilla `Hide what does not count`. **Debes ver** que desaparecen
   de la lista las líneas `Transfer` y `Not counted`, que a la derecha sale
   `Hiding` y un número de movimientos, y que **las tres cifras no se mueven**.
   El 2026-09-30, julio de 2026 pasaba de 93 a 79 filas. Las cifras no cambian
   porque nunca contaron esas líneas: lo que cambia es que la lista deja de
   enseñarlas.
   -- ok

6. Con la casilla puesta, pulsa `Previous`. **Debe** seguir puesta en el mes
   anterior. Recarga la página: **debe** seguir puesta. Quítala: **vuelven**
   todas las líneas.
   -- ok

7. En `Account`, elige una cuenta. **Debes ver** solo sus movimientos, las
   tres cifras recalculadas para esa cuenta, y bajo las cifras una línea que
   dice cuántos movimientos casan y con qué filtro
   (`… movements match these filters in July 2026 · Account …`).
   -- no me gusta como esta el texto del select ni como se ponen los nombres de los bancos, es un string que repite dos veces el mismo nombre
      Bankinter - bankinter -- 4073

8. Marca `Uncategorized`. **Debes ver** solo los que no tienen categoría. Ahora
   elige una categoría en `Category`: **`Uncategorized` se desmarca sola**. Las
   dos cosas a la vez no pueden estar.
   -- el funcionamiento es correcto, los texto del select no me gustan, aparecen siempre dos lineas repetidas de la misma categoria

9. En `Search`, escribe un trozo de un concepto en minúsculas y sin tildes.
   **Debe** encontrarlo aunque el concepto esté en mayúsculas o lleve tildes.
   La búsqueda sale sola al dejar de teclear. Con una sola letra no busca.
   -- ok

10. Busca algo que no exista. **Debes ver**
    `No movements match these filters in July 2026.` con un botón
    `Clear filters`. Es una frase distinta de la del mes vacío.
   -- ok

11. Pulsa `Clear filters`. **Debes ver** el mes entero otra vez, **en el mismo
    mes** en que estabas. La casilla `Hide what does not count`, si estaba
    puesta, **sigue puesta**: `Clear filters` no la toca.
   -- ok

12. Pon un filtro, cambia de mes con `Previous`, y comprueba que el filtro
    **sigue puesto**. Pulsa atrás en el navegador: vuelves al mes anterior.
   -- ok

13. Lee la nota gris bajo las cifras. Dice de qué están hechas: que ya dejan
    fuera los traspasos emparejados y lo que marcaste, y avisa de dos cosas
    que la aplicación no puede saber. No se puede cerrar, a propósito.
    -- esta parte no la entiendo

### Qué probar — corregir la categoría de un movimiento (escribe)

14. Elige un movimiento cualquiera y **apunta su categoría actual**. Pulsa
    sobre su etiqueta de categoría. **Debes ver** que en ese mismo sitio
    aparece un desplegable, un botón `Create rule` y un botón `Close`.
   -- ok

15. Elige otra categoría en el desplegable. **Se guarda sola, sin botón de
    guardar.** **Debes ver** que la etiqueta de la línea cambia y que, bajo las
    cifras, aparece una línea verde `Categorized as` y el nombre, con un botón
    `Undo`. Las tres cifras **no cambian**: cambiar una categoría no mueve
    ninguna suma.
   -- cambie la categoria, solo cambia la categoria en este movimiento, cambia el texto nada mas

16. Pulsa `Undo`. **Debes ver** la categoría anterior en la línea y el texto
    `Change undone`, ya sin botón.
   -- ese boton no lo veo

17. Abre el editor de otra línea y pulsa `Esc` o `Close`. **Debe** cerrarse sin
    cambiar nada.
   -- ok

18. Busca una línea cuyo importe salga en gris y sin signo (un movimiento de
    tipo neutro, si tienes alguno). Su etiqueta de categoría **no se puede
    pulsar**.
    -- el boton aparece arriba de la tabla, al dar al boton reload cambio el texto de la categoria don lo habia cambiado

### Qué probar — marcar que un movimiento no cuenta (escribe y mueve las sumas)

19. **Apunta las tres cifras del mes.** Pulsa `Select movements`. **Debes ver**
    una casilla en cada línea y una barra con: cuántos llevas marcados,
    `Exclude from totals`, `Include in totals`, `Select all shown`,
    `Clear selection` y `Done`. Mientras las casillas están a la vista, las
    etiquetas de categoría **no se pueden pulsar**.
   -- ok

20. Con `Hide what does not count` quitada, marca la casilla de **un solo**
    movimiento que hoy cuente (sin etiqueta `Not counted` ni `Transfer`) y
    pulsa `Exclude from totals`. **Debes ver**:
    que la línea sigue en la lista con la etiqueta `Not counted` y el importe
    en gris; que la cifra correspondiente **baja exactamente en ese importe**;
    y una línea verde `1 movement excluded from totals` con `Undo`.
    -- escojo un movimiento, al pulsar en exclude total, baja la cantidad con ese valor, pulso el boton reload y vuelve todo como estaba
       cantidad en gris nunca la vi

21. Pulsa `Undo`. **Debes ver** que la etiqueta desaparece, que las tres cifras
    **vuelven a ser las que apuntaste**, y el texto `1 movement back in totals`.
    -- ok

22. Marca un movimiento que ya tenga `Not counted` y pulsa
    `Exclude from totals`. **Debes ver**
    `Nothing to change: those movements are already like that.` No se envía
    nada.
    -- ok

23. Pulsa `Done`. **Debes ver** que las casillas desaparecen y la pantalla
    queda como al principio.
    -- ok

### Qué escribe y cómo se deshace

| Acción | Qué cambia exactamente | Qué no cambia nunca | Cómo se deshace |
|---|---|---|---|
| Elegir una categoría en una línea | Solo la categoría de ese movimiento. Funciona igual si está pendiente o confirmado | Importe, fecha, concepto y estado (no se puede confirmar ni devolver a pendiente desde aquí) | `Undo` en la línea verde. O volviendo a abrir el editor y eligiendo la categoría de antes (o `No category`) |
| `Exclude from totals` / `Include in totals` | Solo la marca de «no cuenta en las sumas» de los movimientos marcados. Las tres cifras se vuelven a pedir al backend | Importe, fecha, concepto, categoría y estado. El movimiento **no se borra ni se esconde** | `Undo`, que devuelve exactamente los que cambiaron. O seleccionándolos y pulsando la acción contraria |
| `Create rule` desde el editor | Crea una regla. **No toca** el movimiento del que sale | Todo lo del movimiento | Borrando la regla en `Rules` |

**El `Undo` dura poco.** Solo deshace la última acción, y desaparece al cambiar
de mes, al tocar un filtro, al tocar la casilla `Hide what does not count` o
al salir de la pantalla. Pasado ese momento, se deshace a mano como dice la
tabla.

A partir de 20 movimientos, `Exclude from totals` e `Include in totals`
preguntan antes, diciendo el número exacto. Lo marcado con las casillas se
suelta al cambiar de mes o de filtro: marcar una cuenta entera son varias
veces, una por mes.

### Lo que no hace o hace a medias

- **No dice el importe de lo que esconde**, solo cuántos movimientos son. El
  backend no envía ese importe.
- **Con la casilla `Hide what does not count` quitada, el recuento y las
  cifras no cuadran a ojo**: el número de movimientos cuenta también los
  `Transfer` y los `Not counted`, y las tres cifras no. Con la casilla puesta,
  cuadran.
- **Nada se marca solo.** Ni las reglas ni la importación marcan un movimiento
  como que no cuenta. Lo marcas siempre tú, y también los movimientos nuevos
  de depósito cada vez que importes.
- **Un traspaso tuyo cuyo otro movimiento nunca se importó sigue contando**
  como entrada o salida hasta que lo marques. La nota gris lo avisa.
- **No se puede marcar desde `Review`**, solo desde aquí.
- **Filtrar por una categoría no incluye sus subcategorías.** El backend busca
  la categoría exacta.
- No hay filtro por fechas sueltas (manda el mes), ni por tipo, ni por estado,
  ni por forma de pago. Este último no va a existir.
- No hay columna de saldo, ni exportar, ni acciones en bloque sobre la
  categoría.
- **Crear una regla desde aquí no ofrece aplicarla.** Para aplicarla hay que ir
  a `Rules`.
- La frase que la nota gris añade a veces sobre grupos que parecen traspasos y
  no se pudieron emparejar se lee **una sola vez**, la primera vez que abres
  `Movements` después de cargar la página. Si arreglas algo en `Transfers`, no
  cambia hasta que recargues. Si no hay ninguno, la frase no sale.
- **Fallo conocido** (comprobado el 2026-10-05): si abres un mes sin ningún
  movimiento con la casilla `Hide what does not count` puesta, la pantalla dice
  `Hiding 0 movements` y `Nothing left to show in October 2026: everything in
  this month is hidden.`, como si la casilla lo hubiera vaciado. Te pasará en
  el mes en curso mientras no tenga datos, porque la casilla se conserva al
  cambiar de mes. El botón `Show everything` quita la casilla. Está apuntado
  en `docs/roadmap.md`, cabo suelto 11.
- `Load more` solo aparece si un mes tiene más de 200 movimientos. El
  2026-09-26 tu mes más cargado tenía 93.
- Si una escritura falla por un corte de red, la pantalla dice
  `Couldn't reach the server. Nothing changed.` sin comprobarlo. Si te pasa,
  recarga la página para ver qué quedó escrito de verdad.

> **Mis notas de esta prueba**
> - Falla:
> - Quiero cambiar: los textos de los selets, aparecen textos repetidos, en los movimeintos aparecen igual
> - No entiendo: hay movimientos que pone la etique not counted seguida por ejemplo de la etiqueta ocio, es un gasto
                  transferecnias, en unas pone en verde que seran de entrada, otras en blanco que seran de salida
                  en verde pone otros ingresos, en blanco pone uncategriced, mezcla ingles con español tambien

---

## 5. `Review` — mira y escribe

**Para qué sirve.** Es la lista de trabajo: todo lo importado que todavía está
pendiente de que lo des por bueno. Aquí le pones categoría y lo confirmas, de
uno en uno o varios a la vez. Lo confirmado sale de esta lista.

### Qué probar — primero lo que solo mira

1. Mira el menú. **Debes ver** un número junto a `Review`: son los movimientos
   pendientes. El 2026-10-04 eran 1.607. Si no queda ninguno pendiente, no
   sale número.
2. Pulsa `Review`. **Debes ver** arriba cuatro datos: cuántos movimientos hay,
   `In`, `Out` y `Net`. El número de movimientos **debe ser el mismo** que el
   del menú.
3. Mira una fila. **Debes ver**: una casilla, el concepto, el banco con la
   cuenta y la fecha, la categoría (o `Uncategorized`), el importe, un
   desplegable de categoría, un botón `Confirm` y un botón `Create rule`.
4. Baja al final. **Debes ver** `Page 1 of` y el total de páginas, con
   `Previous` y `Next`. Van de 100 en 100. Pulsa `Next` y luego el botón de
   atrás del navegador: **vuelves** a la página 1.
5. Marca `Uncategorized`. **Debes ver** que el número de movimientos y las
   cifras de arriba cambian. El 2026-09-22 eran 1.373 sin categoría. El número
   del menú **no cambia**: cuenta todos los pendientes.
6. En `Search`, escribe un trozo de un concepto sin tildes y en minúsculas.
   **Debe** encontrarlo igual.
7. Prueba `Type` (`Expense`, `Income`, `Neutral`), `From` y `To`. La lista y
   las cifras **deben** ajustarse cada vez.
8. Recarga la página con filtros puestos. **Deben seguir puestos**: van en la
   dirección.
9. Pulsa `Clear filters`. **Vuelves** a la lista entera.

### Qué probar — sobre un solo movimiento (escribe)

10. Elige una fila y **apunta su categoría**. En el desplegable de la fila,
    elige una categoría. **Se guarda sola.** **Debes ver** la etiqueta nueva
    en la fila y, sobre la lista, una línea verde
    `1 movement categorized as` y el nombre, con un botón `Undo`. La fila
    **sigue en la lista**: categorizar no es confirmar.
11. Pulsa `Undo`. **Debes ver** la categoría de antes en la fila, y la línea
    verde desaparece.
12. **Apunta el número del menú.** Pulsa `Confirm` en esa fila. **Debes ver**
    que la fila desaparece al momento, que el número del menú **baja en uno**,
    y la línea `1 movement confirmed` con `Undo`. El 2026-09-22 esta prueba
    bajó la lista de 1.607 a 1.606.
13. Pulsa `Undo`. **Debes ver** que la fila vuelve y que el número del menú
    **sube en uno**.

### Qué probar — varios a la vez (escribe)

14. Marca las casillas de dos o tres filas. **Debes ver** una barra nueva con
    cuántos llevas (`3 selected`), un desplegable `Choose a category…`,
    `Apply category`, `Confirm 3 movements` y `Clear selection`.
15. Elige una categoría en el desplegable de la barra. **Debes ver** una frase
    del tipo `Applies to 2 of 3 selected`: dice a cuántos de los marcados se
    les puede poner. Una categoría de gasto no se aplica a un ingreso.
16. Pulsa `Apply category`. **Debes ver** las etiquetas cambiadas y la línea
    verde con `Undo`. Pulsa `Undo`: **cada movimiento vuelve a su categoría
    anterior**, no a una común.
17. Marca la casilla `Select all` de la cabecera. **Debes ver** marcadas todas
    las filas de la página. Con solo algunas marcadas, esa casilla sale con un
    guion.
18. Con 20 o más marcadas, pulsa `Confirm … movements` y **mira la pregunta sin
    aceptarla**: dice el número exacto y
    `It is all or nothing: either every movement changes or none of them does.`
    Pulsa `Cancel`.
19. Cambia de página con las casillas marcadas. **Deben soltarse**: lo marcado
    no viaja entre páginas.

### Qué escribe y cómo se deshace

| Acción | Qué cambia exactamente | Qué no cambia nunca | Cómo se deshace |
|---|---|---|---|
| Elegir categoría en una fila, o `Apply category` | Solo la categoría | Importe, fecha, concepto | `Undo`. O eligiendo la de antes (o `No category`) |
| `Confirm` o `Confirm N movements` | Solo el estado: pasa de pendiente a confirmado y sale de esta lista | Importe, fecha, concepto, categoría | **Solo con `Undo`**, y solo mientras siga en pantalla |

**Cuidado con confirmar.** El `Undo` deshace solo la última acción y desaparece
con la siguiente acción, al cambiar de página, de filtro o de búsqueda, y al
salir de la pantalla. **Pasado el `Undo`, ninguna pantalla devuelve un
movimiento confirmado a pendiente.** Su categoría sí se puede seguir cambiando,
desde `Movements`.

Cada acción en bloque es todo o nada: o cambian todos los movimientos, o no
cambia ninguno.

### Lo que no hace o hace a medias

- **El desplegable `Account` solo enseña las cuentas que hay en la página
  cargada**, no todas. Con un filtro estrecho enseñará pocas.
- La barra de filtros no se queda fija arriba al bajar por 100 filas.
- No hay la casilla `Hide what does not count`, ni se puede marcar un
  movimiento como que no cuenta: eso es solo de `Movements`.
- Los movimientos de tipo neutro no admiten categoría: su desplegable está
  apagado y dice `Neutral movements can't be categorized`. Su botón
  `Create rule` también está apagado.
- No se resuelven aquí los traspasos dudosos ni los choques entre reglas.
- Si actúas con filtros puestos y la relectura posterior falla, el número del
  menú puede quedar un poco desfasado hasta la siguiente carga.
- No existe: marcar un rango con Mayúsculas, recordar la última categoría
  aplicada, ni un botón que categorice y confirme a la vez.

> **Mis notas de esta prueba**
> - Falla:
> - Quiero cambiar:
> - No entiendo:

---

## 6. `Rules` — mira y escribe

**Para qué sirve.** Una regla dice: «todo movimiento cuyo concepto contenga
este texto va a esta categoría». Las reglas se aplican solas al importar, y
también cuando tú pulsas `Apply rules`. Solo tocan movimientos **pendientes y
sin categoría**.

Las reglas **se crean desde un movimiento** (en `Review` o en `Movements`), no
desde esta pantalla. Aquí se ven, se cambian, se borran y se aplican.

### Qué probar — primero lo que solo mira

1. Pulsa `Rules`. **Debes ver** una lista con una fila por regla: el texto
   entre comillas, una flecha, la categoría, una etiqueta `Income` o
   `Expense`, y los botones `Edit` y `Delete`. El 2026-09-22 había 63 reglas.
2. Pulsa `Edit` en una regla. **Debes ver** una ventana `Edit rule` con el
   texto, y debajo, sin teclear nada, una frase que dice cuántos movimientos
   pendientes sin categoría contienen ese texto
   (`… pending movements without a category contain this text.`), con hasta
   cinco ejemplos. Pulsa `Cancel`.
3. Pulsa `Apply rules` y **lee la pregunta sin aceptarla**. **Debe** decir:
   `Only pending movements without a category are touched.`,
   `Confirmed and already categorized movements are never changed.` y, en
   rojo, `This can't be undone from the app.` Pulsa `Cancel`.

### Qué probar — crear una regla y ver a cuántos afectaría (escribe una regla)

4. Ve a `Review`, marca `Uncategorized` y elige un movimiento de un comercio
   que se repita. Pulsa su `Create rule`. **Debes ver** la ventana
   `Create a rule`, con el concepto original arriba (`From …`) y un texto
   propuesto en `Text to look for`.
5. Mira la frase bajo el texto. **Debe** decir a cuántos pendientes sin
   categoría afectaría, con hasta cinco ejemplos y, en letra pequeña,
   `Estimate: what a pass would look at today, not what it will change.`
6. Cambia el texto y espera un momento. **El número debe actualizarse solo.**
7. Deja el texto en dos letras. **Debes ver** `Use at least 3 letters or
   digits.` y el botón `Create rule` apagado.
8. Escribe un texto muy general (por ejemplo, una palabra que salga en muchos
   conceptos). Si casan más de 50, **debes ver** un aviso en ámbar:
   `That is a lot — check the examples below before you save.` Avisa, pero
   **no impide guardar**.
9. Vuelve a un texto concreto, elige la categoría y pulsa `Create rule`.
   **Debes ver** la ventana cerrarse y, sobre la lista de `Review`, una línea
   verde con la regla creada y un botón `Apply rules now`. **El movimiento del
   que salió la regla sigue sin categoría**: crear una regla no categoriza
   nada.
10. Repite el paso 4 con el mismo texto. Al guardar, **debes ver**
    `Nothing was saved: another rule already uses that text.` La ventana sigue
    abierta.
11. Ve a `Rules`. **Debes ver** la regla nueva en la lista.

### Qué probar — cambiar y borrar una regla (escribe una regla)

12. Pulsa `Edit` en la regla que has creado, cambia el texto y pulsa `Save`.
    **Debes ver** el texto nuevo en la lista.
13. Pulsa `Delete`. **Debes ver** una pregunta que dice
    `Movements it already categorized keep their category.` Pulsa `Delete`.
    **La regla desaparece** de la lista.

### Qué probar — aplicar las reglas (escribe en muchos movimientos y no se deshace)

> **Haz este paso solo si quieres.** Aplica **todas** tus reglas, no solo la
> última, sobre todos los pendientes sin categoría. No se puede deshacer desde
> la aplicación: el backend dice cuántos categorizó, pero no cuáles.

14. Pulsa `Apply rules`, y en la pregunta, otra vez `Apply rules`. Mientras
    trabaja, la ventana no se puede cerrar. Al terminar **debes ver**
    `Rules applied` y tres líneas: cuántos movimientos se categorizaron,
    cuántos siguen sin regla que les case (`… still without a matching rule`)
    y cuántos choques hay. Debajo, la lista de choques: movimientos a los que
    les casan dos reglas de categorías distintas, y que se quedan sin
    categoría. El 2026-09-22, tras crear la regla `tulotero`, esta ventana
    dijo: 5 categorizados, 1.372 sin regla y 1 choque.
15. Cierra y ve a `Review`. **Debes ver**, sin recargar, que la lista, sus
    cifras y el número del menú ya están al día.

### Qué escribe y cómo se deshace

| Acción | Qué cambia exactamente | Qué no cambia nunca | Cómo se deshace |
|---|---|---|---|
| `Create rule` | Crea una regla | Ningún movimiento, tampoco el de origen | `Delete` en `Rules` |
| `Edit` → `Save` | El texto o la categoría de la regla | Ningún movimiento. Lo que la regla ya categorizó se queda como estaba | Editándola otra vez |
| `Delete` | Borra la regla | Ningún movimiento. Lo que categorizó conserva su categoría | Creándola de nuevo desde un movimiento |
| `Apply rules` | Pone categoría a los **pendientes sin categoría** que casan con alguna regla | Lo confirmado, lo que ya tiene categoría, los movimientos neutros. Importe, fecha, concepto y estado | **No se deshace desde la aplicación.** Se corrige movimiento a movimiento en `Review` o en `Movements` |

### Lo que no hace o hace a medias

- **El número de la ventana es una estimación, y lo dice.** Puede quedarse
  corto al editar una regla (lo que ya categorizó ya no está «sin categoría»)
  y largo si otra regla casa con los mismos movimientos, porque un choque los
  deja sin categorizar.
- **El texto que propone a veces es malo.** Arrastra palabras de trámite y
  puntuación (de «ANUL. /VivaGym» propone `anul. /vivagym`) y se queda flojo
  con nombres de canal (`trans inm`, `tpv virtual`). El texto se puede editar
  antes de guardar. Está anotado como pendiente, sin fecha.
- **Los choques se ven, pero no se resuelven** desde la aplicación, y no se
  guardan: al cerrar la ventana desaparecen. Para volver a verlos se aplica
  otra vez, que no cambia nada de lo ya hecho.
- **No se puede crear una regla en blanco** desde `Rules`.
- No se crean, renombran ni borran categorías.
- Si a un pendiente le quitas la categoría y hay una regla que casa con él,
  al aplicar se la vuelve a poner. Para evitarlo: confírmalo sin categoría, o
  cambia la regla.
- Aplicar las reglas borra el `Undo` y las casillas marcadas que tuvieras en
  `Review`.
- Por encima de 100 caracteres de texto, la ventana deja de contar, aunque
  deja guardar.

> **Mis notas de esta prueba**
> - Falla:
> - Quiero cambiar:
> - No entiendo:

---

## 7. `Transfers` — mira y escribe

**Para qué sirve.** Cuando mueves dinero entre dos cuentas tuyas, la
importación enlaza los dos movimientos (la salida de una cuenta y la entrada en
la otra) para que **ninguno de los dos cuente** como gasto ni como ingreso.
Esta pantalla enseña todas esas parejas y deja desenlazar la que no sea un
traspaso tuyo. Arriba van los grupos que la importación no supo emparejar, para
que los enlaces tú.

### Qué probar — primero lo que solo mira

1. Pulsa `Transfers`. **Debes ver** dos secciones: `Doubtful transfers` y
   `Linked pairs` con el número de parejas entre paréntesis. El 2026-10-02
   había 38 parejas y ningún grupo dudoso.
2. Si no hay grupos dudosos, **debes ver** una frase que empieza por
   `No doubtful transfers.` y explica cuándo aparecerían.
3. Mira una pareja. **Debes ver** dos líneas, `Money out` y `Money in`, cada
   una con el concepto, la fecha, la cuenta y el importe, y un botón `Unlink`.
4. Repasa la lista buscando parejas que **no** sean un traspaso tuyo. Si el
   concepto de alguno de los dos movimientos contiene «bizum», la pareja lleva
   la etiqueta `Bizum` y la frase
   `A Bizum usually comes from another person, not from one of your accounts.`
   El 2026-10-02 ninguna de las 38 la llevaba.
5. Pulsa `Unlink` en una pareja y **lee la pregunta sin aceptarla**. **Debe**
   nombrar los dos movimientos y decir
   `Both movements will count in your totals again.` y
   `The next import won't pair these two again.` Pulsa `Cancel`.

### Qué probar — desenlazar y volver a enlazar (escribe y mueve las sumas)

> **Hazlo sobre una pareja que sepas que está bien, y pulsa `Undo` en el acto,
> sin salir de la pantalla.** Pasado el `Undo`, una pareja desenlazada no se
> puede volver a enlazar desde la aplicación.

6. Elige una pareja y **apunta su fecha y su importe**. Abre en otra pestaña
   `Movements` en ese mes y **apunta las tres cifras**.
7. En `Transfers`, pulsa `Unlink` y luego `Yes, unlink`. **Debes ver** que la
   pareja desaparece, que el número de `Linked pairs` baja en uno, y la línea
   verde `Pair unlinked. Its two movements count in your totals again.` con
   `Undo`.
8. En la otra pestaña, recarga `Movements`. **Debes ver** que `Money in` y
   `Money out` han subido, cada una, exactamente en el importe de la pareja.
   El 2026-10-02, con una pareja de 1.000 € del 9 de septiembre de 2026,
   septiembre pasó de 161,82 € y 966,84 € a 1.161,82 € y 1.966,84 €.
9. Vuelve a `Transfers` y pulsa `Undo`. **Debes ver** `Pair linked again.`, la
   pareja de vuelta en la lista y el número como al principio. Recarga
   `Movements`: **las tres cifras vuelven a ser las que apuntaste**.

### Qué probar — enlazar un grupo dudoso (escribe)

Solo se puede probar si hay algún grupo en `Doubtful transfers`. **El
2026-10-02 no había ninguno**, y esta mitad de la pantalla solo se ha probado
con datos fabricados.

10. Si hay un grupo, **debes ver** su importe y dos columnas, `Money out` y
    `Money in`, con los movimientos candidatos. Elige uno de cada columna.
    El botón `Link these two` no se enciende hasta que hay uno por columna.
11. Si eliges dos de la misma cuenta, **debes ver**
    `Both movements are in the same account. Pick one from another account.`
12. Pulsa `Link these two`. No pregunta. **Debes ver**
    `Linked as a transfer. These two movements no longer count in your
    totals.` con `Undo`, y la pareja nueva en `Linked pairs`.

### Qué escribe y cómo se deshace

| Acción | Qué cambia exactamente | Qué no cambia nunca | Cómo se deshace |
|---|---|---|---|
| `Unlink` | Quita el enlace entre los dos movimientos. Los dos vuelven a contar en las sumas de su mes. El backend recuerda que no debe volver a emparejarlos | Importe, fecha, concepto, categoría, estado y la marca de «no cuenta» | **Solo con `Undo`**, que los vuelve a enlazar |
| `Link these two` | Enlaza los dos movimientos. Los dos dejan de contar en las sumas | Lo mismo | `Undo`. O más tarde, con `Unlink` sobre la pareja nueva |

El `Undo` deshace solo la última acción y desaparece con la siguiente o al
salir de la pantalla.

Si uno de los dos movimientos de una pareja está marcado como que no cuenta,
al desenlazar **ese sigue sin contar**. La pregunta y el aviso lo dicen.

### Lo que no hace o hace a medias

- **Pasado el `Undo`, una pareja desenlazada no se recupera desde la
  aplicación**: la importación no la vuelve a juntar y no sale como dudosa.
- **La etiqueta `Bizum` solo ve Bizums.** Una pareja falsa que no lleve esa
  palabra no lleva ninguna marca: para eso está la lista entera a la vista.
- La lista no se puede ordenar, filtrar ni buscar. Sale en el orden en que la
  envía el backend.
- **Un traspaso tuyo cuya otra mitad nunca se importó no sale aquí**: no tiene
  con quién emparejarse y no aparece como dudoso. Se marca a mano en
  `Movements`.
- La nota gris de `Movements` avisa de que una pareja puede no ser un
  traspaso, pero no enlaza a esta pantalla.
- Cada `Unlink` mueve tus sumas históricas. Desenlaza solo lo que sepas que no
  es un traspaso tuyo.

> **Mis notas de esta prueba**
> - Falla:
> - Quiero cambiar:
> - No entiendo:

---

## 8. El botón `Import` — mira hasta que confirmas; luego escribe

**Para qué sirve.** Trae a la base de datos los archivos nuevos que hayas
dejado en Google Drive. Está arriba a la derecha en todas las pantallas. Si hay
archivos nuevos, a su lado sale un aviso con cuántos son.

### Qué probar — solo mirar

1. Mira la barra superior. Si hay archivos nuevos en Drive, **debes ver** un
   aviso del tipo `3 new files` junto al botón. Si no hay, no sale nada.
2. Pulsa `Import`. **Debes ver** la ventana `Import from Google Drive` con el
   texto `Checking Drive for new files…`.
3. Si no hay nada nuevo, **debes ver** `You're up to date` y
   `No new files in Google Drive.` Pulsa `Close`. No se ha escrito nada.
4. Si hay archivos, **debes ver** la lista, agrupada por banco y por año, la
   frase `Files are moved to the processed folder in Drive once imported.` y
   dos botones: `Cancel` y uno que dice cuántos va a importar. **Hasta aquí
   solo se ha leído.** Pulsa `Cancel` si no quieres importar.

### Qué probar — importar de verdad (escribe y no se deshace)

> **Hazlo solo si quieres importar esos archivos.** No hay `Undo`.

5. Pulsa el botón de importar. **Debes ver** el texto `Importing` con el
   número de archivos y `This can take a few seconds.` Mientras importa, la
   ventana **no se puede cerrar**.
6. Al terminar, **debes ver** un titular, que es uno de estos cuatro:
   `Import complete`, `Imported, with a few things to check`,
   `Partially imported` o `Nothing was imported`.
7. Bajo el titular, **debes ver** cuatro contadores: `New movements`,
   `Already imported`, `Investment files updated` y `Files not imported`. Si
   entraron movimientos nuevos, una frase dice cuántos esperan tu revisión.
8. Si algún archivo no entró, **debes ver** un bloque `Needs attention` con el
   motivo en inglés de cada uno. Bajo `Details` está el mensaje original del
   backend, en castellano.
9. Si hay cosas que revisar, **debes ver** `Things to check` con secciones
   plegadas, cada una con su recuento: `Balance mismatches`, `Unread lines`,
   `Transfers to match`, `Category rule conflicts`. Al final, si entró algún
   archivo, `Imported files`. Ábrelas y comprueba que se entienden.
10. Pulsa `Close` y comprueba, sin recargar: que el aviso de archivos nuevos
    ha bajado o ha desaparecido; que el número junto a `Review` ha subido en
    los movimientos nuevos; y que `Net Worth`, si la habías abierto antes,
    enseña los saldos nuevos.

### Qué escribe y cómo se deshace

Según el resumen de cierre de esta feature (2026-09-15), importar de verdad:

- crea movimientos nuevos, todos **pendientes**, que aparecen en `Review`;
- puede crear cuentas y productos de inversión nuevos;
- vuelve a pasar la detección de traspasos y las reglas de categoría sobre
  toda la base;
- mueve los archivos importados a la carpeta de procesados en Drive.

**No se deshace desde la aplicación.** Importar dos veces el mismo archivo no
duplica nada: lo ya importado se cuenta en `Already imported`. El 2026-09-15 se
probó con un archivo que ya estaba importado y dio 35 duplicados.

### Lo que no hace o hace a medias

- **El detalle del informe se pierde al cerrar la ventana.** No queda guardado
  en ninguna pantalla. Si quieres conservarlo, apúntalo o haz una captura
  antes de pulsar `Close`.
- **No enseña todo.** Como mucho 5 líneas no leídas por archivo y 10 traspasos
  o choques de reglas; el resto solo se cuenta (`and … more`).
- **No se resuelve nada desde el informe.** Los traspasos se revisan después
  en `Transfers`; los choques de reglas, a mano.
- No hay progreso archivo a archivo: una fase «importando» y luego el
  resultado.
- La importación no tiene límite de tiempo. Si el navegador corta una llamada
  muy larga, verás un fallo de conexión aunque el backend termine por detrás.
  El texto lo avisa: `Some files may already have been imported. Trying again
  is safe: nothing is imported twice.`
- `Try again`, tras un fallo, vuelve a mirar Drive. No relanza la importación
  sola.
- El aviso de archivos nuevos se mira al abrir la aplicación, al abrir la
  ventana y al terminar una importación. No se actualiza solo mientras tanto.
- **El detalle de `Things to check` no se había visto con un informe real** el
  día en que se cerró (2026-09-15): solo con datos de prueba.

> **Mis notas de esta prueba**
> - Falla:
> - Quiero cambiar:
> - No entiendo:

---

# El trabajo que solo puedes hacer tú

Hay dos trabajos que ninguna feature va a hacer por ti y que cambian lo que
dicen las cifras. Los dos se hacen con pantallas que ya existen.

## A. Marcar los traspasos a tus cuentas que no tienen pareja

**Por qué.** Cuando envías dinero a una cuenta tuya y el otro movimiento nunca
se importó (porque esa cuenta no está dada de alta, o su archivo no entró), la
aplicación no puede saber que es un traspaso. Lo cuenta como una salida. Eso
hace que:

- en `Overview`, la comparación con tu mes habitual salga torcida (el
  2026-10-02, enero de 2026 salía «53,5 % menos de lo habitual»);
- en `Overview`, lo ahorrado en el periodo salga peor de lo que es (el
  2026-10-04: 41.887 € más de salida que de entrada en 23 meses).

El 2026-10-02 los meses afectados eran sobre todo los de octubre de 2024 a
septiembre de 2025: siete de esos doce pasaban de 5.000 € de salida. El
2026-09-29 se contaron 17 traspasos propios sin pareja; es un recuento hecho a
mano ese día, no un dato que la aplicación calcule.

**Cómo, paso a paso.**

1. Abre `Overview` y baja a `Month by month`. Apunta los meses con `Money out`
   muy por encima de lo normal.
2. Abre `Movements` y ve al primero de esos meses con `Jump to month`.
3. En `Account`, elige la cuenta desde la que salió el dinero.
4. Busca los envíos a tus propias cuentas que **no** lleven la etiqueta
   `Transfer` ni `Not counted`. Solo tú sabes cuáles son.
5. Apunta las tres cifras del mes.
6. Pulsa `Select movements`, marca la casilla de esos movimientos y pulsa
   `Exclude from totals`.
7. Comprueba que `Money out` ha bajado exactamente en la suma de lo marcado, y
   que las líneas llevan `Not counted`. Si te has equivocado, `Undo`.
8. Pulsa `Previous` o `Next` para ir al mes siguiente y repite. Las casillas
   siguen a la vista al cambiar de mes, pero lo marcado se suelta: va mes a
   mes.
9. Al terminar, pulsa `Done`.
10. Vuelve a `Overview`. Mira otra vez enero de 2026 y la frase del periodo:
    las dos deben haber cambiado.

**Y cada vez que importes:** los movimientos nuevos de depósito de la cuenta
de myinvestor tampoco se marcan solos. Repite los pasos 2 a 7 con esa cuenta
en los meses nuevos.

## B. Poner categoría al gasto

**Por qué.** El 2026-10-02 solo el 6,9 % del gasto tenía categoría. Por eso el
reparto por categoría está aplazado: hoy sería un gráfico que no sabe lo que
enseña. La línea de `Overview` que dice cuánto gasto del mes no tiene
categoría es donde se ve avanzar este trabajo.

**Cómo, paso a paso.**

1. Abre `Review` y marca `Uncategorized`.
2. Elige un comercio que se repita y pulsa su `Create rule`. Mira en la
   ventana a cuántos afectaría y repasa los ejemplos. Ajusta el texto hasta
   que el número y los ejemplos sean los que esperas. Guarda.
3. Repite con los comercios que más se repitan.
4. Ve a `Rules` y pulsa `Apply rules`. Lee cuántos se categorizaron y los
   choques. Recuerda que esto no se deshace desde la aplicación.
5. Lo que quede suelto, categorízalo a mano en `Review`, de uno en uno o
   marcando varios y con `Apply category`.
6. Cuando un movimiento esté bien, pulsa `Confirm`. Recuerda que, pasado el
   `Undo`, no vuelve a pendiente.
7. Lo que ya esté confirmado con una categoría equivocada se corrige en
   `Movements`, pulsando sobre su etiqueta de categoría.

> **Mis notas de esta prueba**
> - Falla:
> - Quiero cambiar:
> - No entiendo:

---

# Lo que está pendiente

Sacado de `docs/roadmap.md` (última revisión del roadmap: 2026-10-04). Nada de
esto existe todavía en la aplicación.

- **Lo que ganó cada depósito**, en `Net Worth`. Es lo siguiente previsto. El
  backend ya lo sirve; el frontend no lo usa.
- **Los gastos recurrentes.** Espera al backend.
- **El reparto por categoría.** Aplazado hasta que haya más gasto
  categorizado.
- **La evolución del patrimonio** y **desde cuándo hay dato** de cada
  producto, en `Net Worth`. Esperan al backend.
- **Usar la aplicación desde otro sitio que no sea este ordenador**: dónde se
  sirve y cómo se controla el acceso. Sin empezar.
- **Cuentas tuyas que no están dadas de alta.** Mientras no existan como
  cuenta, sus traspasos no pueden tener pareja. Es una conversación de
  producto sin abrir; mientras tanto se resuelve con el trabajo A.
- **El texto que propone la ventana de reglas**, que a veces arrastra palabras
  de trámite. Anotado, sin fecha.
- **Un corte de red al escribir se cuenta como «no cambió nada»** en `Review`,
  `Movements` y `Transfers`, sin comprobarlo. Anotado, sin fecha.
- No hay página para una dirección que no existe.

---

# Notas generales

Para lo que no encaje en ninguna pantalla.

> **Mis notas de esta prueba**
> - Falla:
> - Quiero cambiar:
> - No entiendo:
