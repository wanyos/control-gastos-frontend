# Borrador de las features 35 y 36 — Mis cuentas y los movimientos dudosos

> **Borrador escrito por el leader para que lo corrijas.** Son dos features
> pequeñas. Cambia, tacha o añade lo que quieras. Cada una tiene sus preguntas al
> final. Cuando las des por buenas, las copio a `feature_list.json` y borro este
> archivo.

## De dónde sale (para situarte)

Es la parte del frontend de `../docs/handoff-cuentas-propias.md`, que acordaste el
20 de octubre en la sesión del backend. Con tus palabras:

> «Lo ideal es que a partir de ahora contaran como gasto e ingreso de forma natural
> para no tener que andar revisando si es a una cuenta mía.»
>
> «En el caso de que una transferencia no esté clara que es mía o de otra persona,
> ponerla como dudosa, y la resuelvo a mano; igual son muy pocos casos pero dejar
> esto como un seguro.»

El backend ya lo tiene hecho (su feature 62):

- **Una tabla con tus cuentas y productos**, de cualquier banco, se importe o no:
  hoy tiene 12 filas (de Bankinter a Trade Republic, Criptan e ING), con los
  textos con los que aparece cada una en los conceptos. Y las formas de tu nombre.
- **Cada movimiento dice si es dinero tuyo:** reconocido por la tabla (no cuenta),
  dudoso (cuenta hasta que lo resuelvas), o resuelto por ti («es mío» o «no es
  mío»).
- **Dudoso** es cuando lo único que lo nombra es el nombre de un banco: tus hijas
  tienen cuentas en los mismos bancos, así que no se da por tuyo solo por eso.

Hoy hay **0 dudosos** y 68 movimientos reconocidos como tuyos. El primer dudoso
llegará con la próxima transferencia a una cuenta que solo se reconoce por el nombre
de su banco. Por eso estas pantallas se probarán con datos inventados hasta
entonces.

Hasta ahora la tabla solo se ha podido tocar desde la sesión del backend.

---

## Feature 35 — Ver y resolver los movimientos dudosos

### Qué quiero que pase

Ver los movimientos dudosos, cada uno con su concepto, su importe, su fecha y por
qué es dudoso (qué banco lo nombra), y resolverlos uno a uno: «es mío» o «no es
mío». Poder deshacer lo que decida. Y enterarme de que hay dudosos sin tener que ir
a buscarlos.

### Por qué lo quiero

Porque un dudoso cuenta como gasto o ingreso hasta que lo resuelvo, y si no me
entero, el mes sale mal sin que lo sepa. Es justo el seguro que pedí.

### Cómo sabré que está bien

- Veo la lista de dudosos con su concepto, importe, fecha y el motivo.
- Digo «es mío» y deja de contar en las sumas; digo «no es mío» y cuenta y deja de
  salir como dudoso.
- Puedo deshacer lo que acabo de decidir.
- Si no hay ninguno, me lo dice.
- Me entero de que hay dudosos sin tener que buscarlos.
- Si falla, me lo dice y no ha cambiado nada.

### Qué NO quiero / límites

- No quiero tocar el backend.
- No quiero resolver varios a la vez (el backend no lo admite, y son pocos).
- No quiero que se resuelva ninguno sin que yo lo diga.

### Lo que NO sé y delego en el agente

- Cómo se dibuja la lista y los dos botones.

### Preguntas para ti

1. **¿Dónde viven los dudosos?**
   - a) En la pantalla `Transfers`, que hoy enseña las parejas de traspasos y sus
     grupos dudosos. Encaja: es donde ya miras si una transferencia es tuya. Es la
     que yo pondría.
   - b) Dentro de `Review`, como un filtro.
   - c) Una entrada nueva en el menú.

2. **¿Cómo te enteras de que hay dudosos?** Yo pondría un número junto a la entrada
   del menú, como el de `Review`, que solo sale si hay alguno. Y además, en el
   informe de la importación, una línea si han entrado dudosos nuevos.

3. **En `Movements`, ¿se ve que un movimiento no cuenta por ser dinero tuyo?** Hoy
   lo que no cuenta sale tachado y en gris con `Not counted` o `Transfer` (feature
   29). Yo haría lo mismo con estos, con un texto que diga que es entre tus cuentas,
   y con `Doubtful` en ámbar para los dudosos, como los depósitos dudosos.

---

## Feature 36 — Ver y mantener la tabla de mis cuentas

### Qué quiero que pase

Ver todas mis cuentas y productos de la tabla, con su banco, número, tipo, fechas
de apertura y cierre y los textos con los que aparecen. Poder dar de alta una nueva
(por ejemplo, la cuenta de Criptan cuando la añada) y cambiar una existente, sobre
todo sus textos. Y ver y cambiar las formas de mi nombre.

### Por qué lo quiero

Porque la tabla es lo que decide qué es dinero mío, y hoy solo se puede tocar desde
la sesión del backend. Si abro una cuenta nueva o un banco escribe mi nombre de otra
forma, tengo que poder decírselo a la aplicación yo.

### Cómo sabré que está bien

- Veo las 12 filas de la tabla con todos sus datos.
- Doy de alta una cuenta nueva y aparece.
- Cambio los textos de una cuenta y se guardan.
- Cierro una cuenta poniéndole fecha de cierre.
- Veo y cambio las formas de mi nombre.
- Si algo falla, me lo dice y no ha cambiado nada.

### Qué NO quiero / límites

- No quiero tocar el backend.
- No quiero borrar filas (el backend no lo admite: una fila que no sirve se deja sin
  textos).

### Lo que NO sé y delego en el agente

- Cómo se dibuja la tabla y cómo se edita (en la propia fila o en una ventana).

### Preguntas para ti

1. **¿Dónde vive la tabla?**
   - a) Una entrada nueva en el menú, por ejemplo `Accounts`. Es la que yo pondría:
     es una lista que mantendrás de vez en cuando, no algo de cada día.
   - b) Dentro de `Net Worth`, que ya enseña tus cuentas con su saldo.

2. **Cuando cambias la tabla, ¿quieres ver qué movimientos cambian?** Por ejemplo,
   al añadir un texto, cuántos movimientos pasan a contar como tuyos. Hoy el backend
   no lo dice al guardar. Yo lo dejaría fuera: si lo quieres, primero hay que
   pedírselo al backend.
