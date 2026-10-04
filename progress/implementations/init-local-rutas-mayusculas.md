# init-local-rutas-mayusculas — implementación

Tarea de higiene aprobada por el humano el 2026-10-04. No es una feature de
`feature_list.json`: no se ha tocado ese archivo ni `specs/`.

Qué hace ahora `./init.sh` que antes no: falla si, en las cabeceras `Archivos:`
de un mismo `specs/*/tasks.md`, dos rutas declaradas solo se distinguen en
mayúsculas y minúsculas.

## Archivos modificados / creados

- `init.local.sh` (modificado): dos funciones nuevas y una llamada al principio
  de `local_steps`.
  - `case_only_path_pairs <tasks.md>`: imprime una línea `ruta<TAB>ruta` por
    cada pareja. Solo usa `awk`.
  - `check_case_only_paths <tasks.md>...`: llama a la anterior con cada archivo
    por separado; por cada pareja, `fail` con el `tasks.md` y las dos rutas, y
    `EXIT_CODE=1`; si no hay ninguna, una línea `ok`.
  - `local_steps` llama a `check_case_only_paths specs/*/tasks.md` antes del e2e.
- `docs/verification.md` (modificado): fila `7b` en la tabla de pasos y una
  sección nueva, «Rutas de un `tasks.md` que solo se distinguen en mayúsculas y
  minúsculas».
- `progress/implementations/init-local-rutas-mayusculas.md` (creado): este informe.

`init.sh` no se ha tocado.

## Decisiones tomadas

- **Solo `awk`**, que `init.sh` ya usa (línea 317). Sin Python ni Node, para no
  depender de cuál de los dos haya.
- **CRLF**: el `awk` quita el `\r` final de cada línea antes de mirarla. Hay dos
  `tasks.md` reales con CRLF (`specs/18-rule-match-preview`,
  `specs/22-statement-exclude-from-totals`); ninguno tiene cabeceras `Archivos:`,
  así que el caso CRLF se probó con un archivo de prueba fuera del repositorio.
- **Las funciones reciben la ruta del `tasks.md` como parámetro.** Así se pueden
  probar con archivos fuera de `specs/`.
- **Una línea cuenta como cabecera solo si empieza exactamente por `Archivos:`**
  (es lo que pedía el encargo y como están escritas las cuatro del spec 26, el
  único que hoy las tiene).
- **Tres o más variantes de la misma ruta**: cada una se reporta emparejada con
  la primera que apareció.
- **No he anotado nada en `progress/current.md`**, aunque el protocolo del
  implementer lo pide: el encargo dice que `git status` al final tiene que
  enseñar solo `init.local.sh`, los documentos y este informe.
- Los nombres de las dos funciones describen en inglés lo que hacen; no he puesto
  ningún nombre corto al paso en comentarios, mensajes ni documentos.

## Documentos actualizados

`git grep -n "E2E smoke\|local_steps\|init.local.sh" -- . ':!progress' ':!specs' ':!init.sh' ':!init.local.sh'`
devolvió tres líneas: `.claude/hooks/protect-motor.sh:84` y `CLAUDE.md:116`
(siguen siendo verdad, y son del motor del harness) y `docs/verification.md:115`
(la tabla de pasos, donde se añadió la fila `7b`).

En `docs/verification.md` queda escrito qué comprueba, cuándo se ejecuta, qué no
es un fallo y qué no ve.

## Comprobaciones

Entorno: `bash` de Git para Windows, GNU Awk 5.0.0. Las salidas van sin los
códigos de color.

### 1. `./init.sh` con el repositorio como está

`exit=0`. Líneas filtradas de la salida (títulos de bloque, `[FAIL]`, `[WARN]`,
recuento de tests, el paso nuevo, el e2e y el resumen):

```
── 6. Ejecutando tests ─────────────────────────────────
 Test Files  104 passed (104)
      Tests  1703 passed (1703)
── 6b. Pasos propios del proyecto (init.local.sh) ──────
[OK]    Cabeceras Archivos: de 16 tasks.md: ninguna declara dos rutas que solo se distingan en mayúsculas y minúsculas
[OK]    E2E smoke verde (chromium)
── 7. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

Ningún `[FAIL]` ni `[WARN]` en toda la salida.

### 2. Que se pone rojo de verdad, con `./init.sh` entero

Creé `specs/99-prueba-mayusculas/tasks.md` con dos lotes (`Archivos:
`src/x/previousMonths.spec.ts`` en el Lote A y `Archivos:
`src/x/PreviousMonths.spec.ts`` en el Lote B), lancé `./init.sh` y borré la
carpeta. `init.sh` no dio ningún otro error por la carpeta de más: su bloque 3
comprueba que cada feature tenga su spec, no al revés.

`exit=1`. Mismas líneas filtradas:

```
── 6. Ejecutando tests ─────────────────────────────────
 Test Files  104 passed (104)
      Tests  1703 passed (1703)
── 6b. Pasos propios del proyecto (init.local.sh) ──────
[FAIL]  specs/99-prueba-mayusculas/tasks.md declara en sus cabeceras Archivos: dos rutas que solo se distinguen en mayúsculas y minúsculas: src/x/previousMonths.spec.ts y src/x/PreviousMonths.spec.ts
[FAIL]  En un disco que no distingue mayúsculas son el mismo archivo: renombra una de las dos en el tasks.md.
[OK]    E2E smoke verde (chromium)
── 7. Resumen ──────────────────────────────────────────
[FAIL]  Entorno NO está listo. Resuelve los errores antes de avanzar.
```

Tras borrar: `ls specs | grep -c 99` → `0`; `git status --short` → solo
` M init.local.sh` (en ese momento aún no había tocado los documentos).

### 3. El spec real de la feature 26 antes del arreglo

`git show dd14a5f:specs/26-overview-previous-months/tasks.md` volcado a un
archivo en una carpeta temporal fuera del repositorio (tiene 4 cabeceras
`Archivos:`), y `check_case_only_paths` llamada con esa ruta desde un script que
carga `init.local.sh` con `ok`/`fail` iguales a los de `init.sh` pero sin color:

```
== tasks-26-dd14a5f.md
[FAIL]  tasks-26-dd14a5f.md declara en sus cabeceras Archivos: dos rutas que solo se distinguen en mayúsculas y minúsculas: src/features/overview/__tests__/previousMonths.spec.ts y src/features/overview/__tests__/PreviousMonths.spec.ts
[FAIL]  En un disco que no distingue mayúsculas son el mismo archivo: renombra una de las dos en el tasks.md.
EXIT_CODE=1
```

(La ruta de la carpeta temporal está recortada de la salida.)

### 4. Otros casos, misma forma de probar (archivos fuera del repositorio)

```
== crlf.md            (finales CRLF; la pareja repartida en dos lotes, más una ruta repetida tal cual)
[FAIL]  crlf.md declara en sus cabeceras Archivos: dos rutas que solo se distinguen en mayúsculas y minúsculas: src/x/previousMonths.spec.ts y src/x/PreviousMonths.spec.ts
[FAIL]  En un disco que no distingue mayúsculas son el mismo archivo: renombra una de las dos en el tasks.md.
EXIT_CODE=1
== repetida.md        (la misma ruta tal cual en dos lotes)
[OK]    Cabeceras Archivos: de 1 tasks.md: ninguna declara dos rutas que solo se distingan en mayúsculas y minúsculas
EXIT_CODE=0
== sin-cabeceras.md   (sin líneas Archivos:; `src/A.ts` y `src/a.ts` dentro de una task)
[OK]    Cabeceras Archivos: de 1 tasks.md: ninguna declara dos rutas que solo se distingan en mayúsculas y minúsculas
EXIT_CODE=0
== tasks.md           (ruta con comodín que no existe: ningún tasks.md)
[OK]    Cabeceras Archivos: de 0 tasks.md: ninguna declara dos rutas que solo se distingan en mayúsculas y minúsculas
EXIT_CODE=0
```

Los textos entre paréntesis los he añadido aquí; no salen por consola. La salida
del caso CRLF no contiene ningún `\r` (`| tr -cd '\r' | wc -c` → `0`).

### 5. Los otros modos de `init.sh` no ejecutan el paso

```
init.sh --state: exit=0 lineas_con_'Cabeceras Archivos'=0
init.sh --fast: exit=0 lineas_con_'Cabeceras Archivos'=0
init.sh --checks 26: exit=0 lineas_con_'Cabeceras Archivos'=0
```

Coincide con lo que se lee en `init.sh`: `--checks` sale en la línea 158, antes
de cargar `init.local.sh` (línea 267); `--state` sale en la 487 y `--fast` en la
526, las dos antes de la llamada a `local_steps` (línea 641).

## Lo que no funciona o no he comprobado

- **Letras fuera de ASCII: no se detectan aquí.** Probado: `src/x/Árbol.ts` y
  `src/x/árbol.ts` dan `[OK]` y `EXIT_CODE=0` con el `awk` de Git para Windows
  (`LANG` y `LC_ALL` vacíos). Está escrito en `docs/verification.md`.
- **Linux y macOS: no lo he comprobado.** Solo tengo esta máquina Windows. El
  `awk` usa `sub`, `match`, `RSTART`/`RLENGTH`, `substr` y `tolower`; para
  comprobarlo haría falta lanzar `./init.sh` (o el script de prueba del punto 3)
  en un Linux y en un macOS.
- **No hay test automático de las dos funciones en la suite**: el proyecto no
  tiene ejecutor de tests para scripts de shell. Lo que hay son las ejecuciones
  de arriba.
- Después de la última ejecución completa de `./init.sh` solo cambiaron
  `docs/verification.md` y este informe; `init.local.sh` es el mismo que se
  ejecutó en los puntos 1 y 2. No he vuelto a lanzar `./init.sh` tras editar el
  documento.

## Último ./init.sh

El del punto 1: `exit=0`, 104 archivos de test y 1703 tests en verde, e2e de
chromium en verde.

## Sugerencias fuera de scope (NO aplicadas)

- `docs/verification.md` numera los pasos de `./init.sh` del 1 al 9 y habla de
  la «sección 8» para el e2e; el `init.sh` actual los titula 1 a 7, con lint y
  formato juntos en el 5 y el e2e en el «6b». Por eso la fila nueva es `7b` y no
  he renumerado nada. Poner esa tabla al día es un cambio aparte.
- El mismo documento, en el Nivel 4, dice
  `progress/implementation/<name>.md`; la carpeta real es
  `progress/implementations/`.
