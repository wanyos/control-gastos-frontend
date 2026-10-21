# own-accounts-table — implementación

## Lote A — implementación

No se ha escrito nada en la base de datos ni en las carpetas de datos del humano. Ninguna
prueba hace una petición sin simular: las del servicio y el store usan un cliente HTTP falso
que no toca `fetch`, y las de la pantalla sustituyen `fetch` por una función que rechaza
cualquier ruta no prevista.

### Archivos modificados / creados

Creados (todos dentro de la cabecera `Archivos:` del Lote A):

- `src/features/own-accounts/types.ts`
- `src/features/own-accounts/service.ts`
- `src/features/own-accounts/texts.ts`
- `src/features/own-accounts/store.ts`
- `src/features/own-accounts/components/OwnAccountTable.vue`
- `src/features/own-accounts/components/OwnAccountDialog.vue`
- `src/features/own-accounts/components/TextListField.vue`
- `src/features/own-accounts/components/HolderNames.vue`
- `src/features/own-accounts/components/HolderNamesDialog.vue`
- `src/features/own-accounts/views/OwnAccountsView.vue`
- `src/features/own-accounts/__tests__/fixtures.ts`, `texts.spec.ts`, `service.spec.ts`,
  `store.spec.ts`, `OwnAccountDialog.spec.ts`, `HolderNamesDialog.spec.ts`,
  `OwnAccountsView.spec.ts` (44 pruebas)

Modificados fuera del código: `specs/36-own-accounts-table/tasks.md` (marcadas T1–T7) y
`progress/current.md` (el plan del lote).

No se ha tocado `src/router/`, `AppSidebar.vue`, `e2e/` ni `docs/` (son del Lote B). La
pantalla todavía no es accesible desde el menú hasta que el Lote B añada la ruta.

### Decisiones tomadas

Ninguna cambia lo aprobado; son detalles que el spec no fijaba:

1. **Etiqueta de cada campo de una lista.** `BaseInput` siempre pinta su etiqueta, y el spec
   no dice cuál lleva cada campo de texto. He puesto `Text 1`, `Text 2`… en la ventana de
   cuenta y `Form 1`, `Form 2`… en la de las formas del nombre (constantes `TEXT_ITEM` y
   `FORM_ITEM` de `texts.ts`), con la lista entera bajo un título (`Appears as` /
   `Forms of your name`). Son textos de pantalla nuevos que no están en design §6: si el
   humano prefiere otros, se cambian en `texts.ts`.
2. **Mientras se lee** la tabla o las formas del nombre se ve solo el indicador giratorio de
   `BaseSpinner`, con texto para lectores de pantalla (`My accounts` / `Forms of your name`).
   Design §6 no tiene frase de carga; no he inventado una frase visible.
3. **`Edit` del bloque de las formas del nombre** solo está activo cuando la lista se ha leído
   bien: si la lectura falló, guardar desde ahí sustituiría la lista sin saber cuál había.
4. **Las dos ventanas se rellenan solo al abrirse** (no cuando cambia lo que reciben). Así,
   cuando un fallo que pudo escribir hace volver a leer la tabla o la lista por detrás, la
   ventana conserva lo escrito (R11, R14). Lo comprueban las dos pruebas «keeps what was
   typed…».
5. **Tras un fallo de guardado de una fila se vuelve a leer la tabla en todo salvo el 400**
   (incluido el 404), como dice design §5. En las formas del nombre, en todo salvo el 400.
6. **`updateOwnAccount` con un cuerpo vacío** lanza `ValidationError` sin hacer la petición,
   igual que `updateRule` de category-rules; el store nunca llega a llamarlo así (R7).
7. **`saveAccount` y `saveNames` vuelven a comprobar** lo mismo que la ventana (campos en
   blanco, tipo, textos cortos, fechas) y no mandan nada si algo falla.

### Trazabilidad (Lote A)

- R1 (título y frase de la pantalla; la entrada del menú es del Lote B) → `paints one row per account with every field`
- R2 → `maps every field of an own account`, `paints one row per account with every field`, `says there are no accounts when the table is empty`, `loads the table and the forms of your name`
- R3 → `paints a dash for an empty number or date and No texts for a row with none`
- R4 → `a failed load says so and offers Try again`
- R5 → `the body of a new account carries only the filled fields`, `posts a new account with only the given fields`, `creating an account sends only the filled fields and reads the table again`, `adding an account from the header button shows the new row`, `opens empty to add and filled with the row to edit`
- R6 → `the changes of a row carry only what differs and null for an emptied field`, `changing one text sends the whole list of texts`, `patches an account with only the given fields`, `changing only the texts sends only the texts and reads the table again`, `editing a row from its Edit button shows the change`
- R7 → `no change gives an empty body`, `saving with nothing changed sends nothing and closes`
- R8 → `adds and removes text fields and drops the blank ones on save`
- R9 → `setting the closing date sends only closedAt`, `the changes of a row carry only what differs and null for an emptied field`
- R10 → `normalizes a text the way the contract compares it`, `a text shorter than three characters once compared is too short`, `a closing date before the opening date is a problem`, `blank name bank or type are problems and a blank text is not`, `a text shorter than three characters once compared keeps Save off and says why`, `a closing date before the opening date keeps Save off and says why`, `blank name or bank or no type keep Save off`
- R11 → `a rejected save keeps the dialog open with a sentence and the table as it was`, `a failure that may have written reads the table again`, `keeps what was typed and shows the message after a failed save`
- R12 → `shows the forms of your name above the table`, `a failed load of the forms of your name leaves the table alone`
- R13 → `puts the whole list of the forms of your name`, `saving the forms of your name sends the whole list and shows what came back`, `edits the forms of your name as a list and saves them whole`, `a form shorter than three characters keeps Save off`
- R14 → `a rejected save of the forms of your name keeps the list as it was`, `a failed save of the forms of your name that may have written asks them again`, `keeps what was typed and shows the message after a failed save of the forms`
- R15 → `sends no DELETE to own accounts`, `offers no way to delete a row`

Además, dos pruebas que no pide el spec: `never shows the message of the backend and says
what each failure means` (texts) y `the block shows each form, or says there is none, or
offers Try again` (HolderNames).

Que las pruebas pueden fallar lo he comprobado rompiendo el código a propósito y
deshaciéndolo después:

- quitando la segunda lectura de la tabla tras un fallo, falla
  `a failure that may have written reads the table again`;
- haciendo que `changesOf` mande siempre el tipo, fallan 8 pruebas (texts, store, la
  ventana y la pantalla).

### Datos de prueba

Todos inventados: nombres de cuenta del tipo `Cuenta inventada uno`, `Hucha inventada`;
formas del nombre `Titular Inventado` / `Inventado Titular`; números de cuenta
`ES00 0000 0000 0000 0000 00NN` (no pasan la suma de control). Los bancos son nombres reales
de banco, como permite `tasks.md`. Las 12 filas siguen el orden del contrato (`bank`,
`name`, `id`), con los seis tipos, tres filas sin textos, dos sin número y una cerrada.

### Documentos actualizados

`git grep -n "own-accounts\|My accounts" -- . ':!progress' ':!specs' ':!src/features/own-accounts'`
solo devuelve `feature_list.json` (el nombre y los `checks` de la feature). El lote solo crea
archivos nuevos y no cambia ningún nombre, ruta ni comportamiento existente, así que no deja
ninguna línea falsa. `docs/architecture.md` y `docs/guia-de-uso.md` son del Lote B (T12, T13).

### Prueba real

No aplica: la feature no lee archivos del humano ni importa nada. Habla con el backend propio,
y no he hecho ninguna petición al backend real (ni de lectura ni de escritura).

### Último ./init.sh

`timeout 900 ./init.sh` → **exit 0**. Extracto de la salida:

```
[OK]    Type check OK (tsc sin errores)
[OK]    OK: pnpm lint:oxlint:check
All matched files use Prettier code style!
[OK]    OK: pnpm format:check
 Test Files  126 passed (126)
      Tests  2076 passed (2076)
[OK]    Todos los tests pasan
[OK]    Cabeceras Archivos: de 25 tasks.md: ninguna declara dos rutas que solo se distingan en mayúsculas y minúsculas
[OK]    OK: pnpm type-check (vue-tsc --build, incluye los .vue)
[OK]    E2E smoke verde (chromium)
[OK]    Entorno listo. Puedes empezar a trabajar.
```

### Último ./init.sh --checks 36

`timeout 900 ./init.sh --checks 36` → **exit 1**, `Checks: 2 de 9 en verde`. En cada uno de
los checks en rojo, **todas las partes del Lote A pasan**; lo que falla es lo primero del
Lote B que encuentran:

| Check | Partes del Lote A | Dónde se para |
|---|---|---|
| [1] 12 filas | `paints one row…`, `paints a dash…`, `maps every field…`: 1 passed cada una | `grep: e2e/own-accounts-table.spec.ts: No such file or directory` |
| [2] dar de alta | `creating an account…`: 1 passed | el mismo `grep` del e2e |
| [3] cambiar textos | `changing only the texts…`, `adds and removes text fields…`: 1 passed cada una | el mismo `grep` del e2e |
| [4] cerrar | `setting the closing date…`: 1 passed | el mismo `grep` del e2e |
| [5] formas del nombre | `shows the forms…`, `saving the forms…`: 1 passed cada una | el mismo `grep` del e2e |
| [6] fallos | las seis pruebas unitarias: 1 passed cada una | el mismo `grep` del e2e |
| [7] no borrar | `offers no way to delete a row`, `sends no DELETE to own accounts` | **OK, exit 0** |
| [8] menú | — | `grep` de `lists My accounts in the menu right below Transfers` en `src/router/__tests__/router.spec.ts` (T9, Lote B) |
| [9] la ventana no deja guardar | las tres pruebas | **OK, exit 0** |

Los rojos son esperables: `e2e/own-accounts-table.spec.ts` (T10) y el test del router (T9)
son del Lote B.

### Sugerencias fuera de scope (NO aplicadas)

- Ninguna.

## Lote B — implementación

No se ha escrito nada en la base de datos ni en las carpetas de datos del humano. La prueba de
navegador nueva no habla con el backend real: todo `/api` está simulado con `page.route`, y la
primera ruta aborta cualquier `/api` no prevista y la apunta en una lista que cada prueba exige
vacía. No he arrancado ni parado servidores a mano (los arranca Playwright).

### Archivos modificados / creados

Todos dentro de la cabecera `Archivos:` del Lote B:

- `src/router/index.ts` (T8): import de `Landmark`, import de `OwnAccountsView`, el objeto de
  ruta `/own-accounts` entre el de `transfers` y el de `overview`, y una línea en el
  comentario de encima de `routes`. El objeto de `transfers` no cambia.
- `src/router/__tests__/router.spec.ts` (T9): `/own-accounts` / `own-accounts` / `My accounts`
  en el quinto puesto de las tres listas fijas; el nombre del test pasa de
  `declares the eight navigable routes…` a `declares the nine navigable routes…` (y su
  comentario); test nuevo `lists My accounts in the menu right below Transfers`.
- `e2e/own-accounts-table.spec.ts` (T10, nuevo): las seis pruebas de tasks.md.
- `docs/architecture.md` (T12) y `docs/guia-de-uso.md` (T13).

Sin tocar: `src/shared/components/AppSidebar.vue` (la entrada sale sola de `navEntries`; el
número junto a `Transfers` de la F35 sigue igual) y `e2e/transfer-pairs-review.spec.ts`
(T11: lanzada, sus 4 pruebas pasan, incluida
`reaches the screen from the sidebar and sees every pair, only the fine labelled`; la entrada
nueva va en la posición 4, después de `Transfers`, que sigue en la 3).

Fuera del código: `specs/36-own-accounts-table/tasks.md` (marcadas T8–T13) y
`progress/current.md` (el plan del lote).

### Decisiones tomadas

1. **La prueba de navegador llega a `My accounts` desde `/transfers`**, no desde `/`: así solo
   hay que simular lo que pide `Transfers` (lo mismo que ya simula
   `e2e/doubtful-own-money.spec.ts`), además de lo que pide el menú (el número de `Review` y,
   desde la F35, el de `Transfers`: `GET /api/movements`, contestado vacío) y la barra
   superior (`GET /api/ingestion/pending`). Comprueba que `nav a` 3 es `Transfers` y 4 es
   `My accounts`, y pulsa esta.
2. **Los datos de la prueba de navegador están copiados a mano** (las 12 filas inventadas de
   `__tests__/fixtures.ts`, con una fecha de apertura cambiada de septiembre a marzo para no
   depender de cómo abrevia el navegador septiembre) y lo que pinta cada celda está escrito a
   mano, no calculado. No importa `fixtures.ts` porque ese archivo importa `vitest`.
3. **El simulador tiene estado**: un `POST` añade la fila y reordena por banco, nombre e id; un
   `PATCH` cambia solo lo que viaja; el `PUT` guarda la lista en orden alfabético. Así lo que
   enseña la pantalla tras guardar solo puede salir de volver a pedirlo. La prueba de las
   formas del nombre escribe una forma que el orden alfabético recoloca, para comprobar que el
   bloque pinta lo que devolvió el backend y no lo escrito.
4. **El rechazo** (`a rejected save says so and the table stays as it was`) es un `PATCH` con
   400 del simulador. La prueba deja pasar solo la línea de consola
   `Failed to load resource` que el propio navegador escribe por ese 400, igual que hacen
   `category-rules.spec.ts` y `review-actions.spec.ts`. Comprueba además que no se volvió a
   pedir la tabla (con 400 el contrato garantiza que no se escribió nada).
5. **La pantalla tiene dos `h1` con `My accounts`** (el de la barra superior y el de la vista),
   igual que las demás vistas de `src/features/*/views/`. La prueba mira cada uno por su
   `data-test`. No es un cambio, solo lo apunto.

### Trazabilidad (Lote B)

- R1 → `lists My accounts in the menu right below Transfers` (unitaria),
  `reaches My accounts from the menu and sees every row with its data` (navegador)
- R2 → `reaches My accounts from the menu and sees every row with its data`
- R5 → `adding an account sends it and the new row appears`
- R6 → `editing the texts of a row sends the whole list and the row shows them`
- R9 → `closing an account sends its closing date and the row shows it`
- R11 → `a rejected save says so and the table stays as it was`
- R13 → `changing the forms of your name sends them and shows the saved list`

Cada escritura se comprueba con método, ruta y cuerpo exacto (`watch.writes`, cuerpo leído
como JSON y comparado entero).

Que las pruebas nuevas pueden fallar: moviendo a mano el objeto de ruta de `/own-accounts`
debajo del de `overview` (y deshaciéndolo después), fallan
`lists My accounts in the menu right below Transfers` (1 failed) y
`reaches My accounts from the menu and sees every row with its data`
(`Expected: "My accounts"` en la posición 4 del menú).

### Documentos actualizados

- `docs/architecture.md`: `own-accounts/` en el árbol de carpetas (con cada archivo) y un
  párrafo: qué escribe (solo `POST` y `PATCH /api/own-accounts`,
  `PUT /api/own-accounts/holder-names`, nunca `DELETE`), que vuelve a pedir la tabla tras
  guardar, y que no avisa a otras pantallas. Lo de que solo importa `DateOnly` de `net-worth`
  lo he comprobado con `grep -rn "@/features" src/features/own-accounts`.
- `docs/guia-de-uso.md`:
  - «El menú de la izquierda tiene ocho entradas» → nueve, con `My accounts` entre
    `Transfers` y `Overview`, y «desde la feature 36».
  - Una fila de `My accounts` en la tabla «Qué verás si el backend no está arrancado» (sale de
    leer `texts.ts`, como dice el aviso de esa tabla).
  - Una fila de `My accounts` en «Mapa de la aplicación», debajo de `Transfers`, con
    **Escribe**: da de alta y cambia filas de la tabla de tus cuentas y las formas de tu nombre;
    no borra.
  - La sección `## 7b. My accounts — mira y escribe`, entre el `---` que cierra la §7 y la
    `## 8.`. Su primera línea dice que es nueva desde la feature 36 y que no se probó en la
    primera revisión. Las 12 filas se citan como lo que dijo el humano al pedir la feature
    (2026-10-21), **no comprobado** pidiéndolo al backend. Termina en el bloque vacío de notas.

**Notas del humano en `docs/guia-de-uso.md`, antes y después** (comparando con `HEAD`):

- Líneas que empiezan por `--` (sin contar los separadores `---`): **92 antes, 92 después**;
  `diff` entre las de `HEAD` y las actuales: idénticas y en el mismo orden.
- Bloques «Mis notas de esta prueba»: **11 antes, 12 después**; el `diff` de los bloques con
  sus cuatro líneas solo muestra el nuevo, vacío, de la §7b.
- `git diff --stat docs/guia-de-uso.md`: 123 líneas añadidas y 3 quitadas. Las 3 quitadas son
  las de «El menú de la izquierda tiene ocho entradas…», sin ninguna nota. Ninguna línea nueva
  queda pegada a un `-- ok` del humano: las filas nuevas van en dos tablas y la sección nueva
  tras el bloque vacío de notas de la §7.

`git grep` lanzado fuera de `progress/` y `specs/`:
`git grep -n -w -i "ocho\|eight" -- docs src e2e README.md AGENTS.md` (solo quedaba la línea de
la guía; las de `docs/roadmap.md` y `theme-dark.css` hablan de otra cosa) y
`git grep -n "own-accounts\|My accounts"` (solo el router, sus pruebas, los dos documentos y
`feature_list.json`). Ninguna otra línea ha quedado falsa.

### Prueba real

No aplica: la feature no lee archivos del humano ni importa nada. No he hecho ninguna petición
al backend real.

### Último ./init.sh

`timeout 900 ./init.sh` → **exit 0**: `Test Files 126 passed (126)`,
`Tests 2078 passed (2078)`, `E2E smoke verde (chromium)`, última línea
`[OK] Entorno listo. Puedes empezar a trabajar.`

Antes de esa pasada, una primera había salido con exit 1 por una prueba de navegador ajena:
`e2e/category-rules.spec.ts` › `the result of applying looks the same on Rules and on Review and
the next pass replaces it`, con un color de fondo que difería en una unidad
(`rgb(21, 28, 35)` frente a `rgb(20, 27, 34)`). Lanzado ese archivo solo tres veces
(`--repeat-each=3`): 30 de 30 pasan; y la segunda pasada completa de `./init.sh` sale con 0.
No he tocado ese archivo. Parece una prueba que a veces falla por tiempo, pero no lo he
comprobado más allá de esas repeticiones.

### Último ./init.sh --checks (36 y 35 a 27)

Cada uno con `timeout 900`, en este orden; última línea de cada uno:

| Feature | exit | Última línea |
|---|---|---|
| 36 | 0 | `Checks: 9 de 9 en verde.` |
| 35 | 0 | `Checks: 12 de 12 en verde.` |
| 34 | 0 | `Checks: 12 de 12 en verde.` |
| 33 | 0 | `Checks: 11 de 11 en verde.` |
| 32 | 0 | `Checks: 14 de 14 en verde.` |
| 31 | 0 | `Checks: 10 de 10 en verde.` |
| 30 | 0 | `Checks: 9 de 9 en verde.` |
| 29 | 0 | `Checks: 11 de 11 en verde.` |
| 28 | 0 | `Checks: 8 de 8 en verde.` |
| 27 | 0 | `Checks: 12 de 12 en verde.` |

### Sugerencias fuera de scope (NO aplicadas)

- Ninguna.

## Correcciones tras el rechazo

Corrige los dos puntos de `progress/reviews/own-accounts-table.md` según la corrección del
leader al final de `specs/36-own-accounts-table/design.md`. Solo se han tocado archivos de
la cabecera `Archivos:` del Lote A.

### Archivos modificados

- `src/features/own-accounts/texts.ts`: `saveErrorMessage` y `namesSaveErrorMessage`
  reciben un segundo parámetro, `readAgain` (por defecto `true`). En la rama «resto»
  (todo salvo 400 y, en las filas, 404), con `readAgain` dicen la frase de antes; sin él,
  `Something went wrong saving, and the table couldn't be read again. Reload the page to
  see what the server has.` (con las formas del nombre, `…and the list couldn't be read
  again…`). Las frases de 400 y 404 no cambian.
- `src/features/own-accounts/store.ts`: `saveAccount` y `saveNames` eligen la frase
  **después** de la segunda lectura, pasando `loadState !== 'failed'` (o
  `namesState !== 'failed'`). Antes la elegían antes de volver a leer.
- `src/features/own-accounts/__tests__/store.spec.ts`: dos tests nuevos,
  `a failed save whose second read of the table fails too says the table could not be read`
  (fallo de red y 500 en el `PATCH`, y fallo de red en el `POST`, con la segunda lectura
  de la tabla también fallando por red) y
  `a failed save of the forms of your name whose second read fails too says the list could not be read`
  (fallo de red y 500 en el `PUT`, con la segunda lectura también fallando por red).
- `src/features/own-accounts/__tests__/texts.spec.ts`: tres comprobaciones más de las
  frases con `readAgain = false` (las dos nuevas, y que el 400 no cambia).
- `src/features/own-accounts/__tests__/OwnAccountDialog.spec.ts`: el test
  `blank name or bank or no type keep Save off` ya existía, pero el caso «solo el nombre en
  blanco» no iba aislado (al abrir la ventana vacía faltan también banco y tipo). Reescrito
  para que cada uno de los tres casos vaya solo, partiendo de una ventana válida: nombre
  en blanco (solo espacios), banco en blanco (solo espacios) y sin tipo. En cada uno
  comprueba que `Save` queda apagado, que la ventana dice por qué en ese campo
  (`Write something here.` / `Choose a type.`) y no en los otros, y que pulsar `Save` no
  manda nada.

### Comprobado que los tests nuevos fallan con el código de antes

- Con `texts.ts` y `store.ts` todavía sin cambiar,
  `npx vitest run src/features/own-accounts/__tests__/store.spec.ts`:
  `Tests  2 failed | 10 passed (12)`; los dos que fallan son los nuevos, con
  `Received: "Something went wrong saving. The table now shows what the server has."` y
  `Received: "Something went wrong saving. The list now shows what the server has."`.
  Tras el cambio, `npx vitest run src/features/own-accounts`: `Tests  46 passed (46)`.
- `draftProblems`: copia de `texts.ts` en la carpeta temporal de la sesión, quitando cada
  vez una línea (nombre, banco, tipo) y luego las tres a la vez, y lanzando
  `vitest -t "blank name or bank or no type keep Save off"`: las cuatro veces
  `Tests  1 failed | 5 skipped (6)` (las tres primeras por la frase del campo que falta,
  la cuarta por `expected false to be true` en `Save` apagado). Restaurado después;
  `sha256sum -c` → `src/features/own-accounts/texts.ts: OK`.

### Documentos que citan la frase antigua (no tocados)

- `git grep` y `grep -r` de `shows what the server` y `lo que tiene el servidor` fuera de
  `progress/`, `specs/` y `node_modules/`: solo aparece en `src/features/own-accounts/`.
- `docs/architecture.md` no cita la frase; lo que dice (se vuelve a pedir la tabla tras un
  fallo que pudo haber escrito) sigue siendo verdad.
- `docs/guia-de-uso.md` no cita la frase literal, pero la §7b (línea 1577-1580) dice que,
  si no se sabe si se guardó, sale `Something went wrong saving.` «y la tabla (o la lista)
  vuelve a pedirse para enseñar lo que hay de verdad». No cubre el caso nuevo: sin
  conexión, la tabla no se puede leer y la ventana pide recargar la página. Lo reporto; no
  lo he tocado.

### Último ./init.sh (tras las correcciones)

`timeout 900 ./init.sh` → exit 0. `Test Files  126 passed (126)`,
`Tests  2080 passed (2080)`, tipos, oxlint, formato, `vue-tsc --build` y E2E de chromium
en verde. Última línea: `[OK]    Entorno listo. Puedes empezar a trabajar.`

### Último ./init.sh --checks 36 (tras las correcciones)

`timeout 900 ./init.sh --checks 36` → exit 0. Última línea con resultado:
`[OK]    Checks: 9 de 9 en verde.`
