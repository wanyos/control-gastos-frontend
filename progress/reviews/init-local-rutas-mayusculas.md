# init-local-rutas-mayusculas — revisión

## Review (2026-10-04)

**Veredicto:** APPROVED
Tarea de higiene, no es una feature de `feature_list.json`: no hay `acceptance`,
ni spec, ni `checks` propios. Comprobado lo pedido por el humano contra
ejecuciones mías, `docs/verification.md`, vocabulario y que `init.sh` no cambia.
Sin cambios requeridos. Hay cuatro observaciones al final que no bloquean y dos
erratas de `docs/verification.md` anteriores a esta tarea, que son ciertas.
Resumen de cierre: `progress/summaries/init-local-rutas-mayusculas.md`.

Entorno de mis ejecuciones: `bash` de Git para Windows con GNU Awk 5.0.0, y
Ubuntu en WSL (GNU Awk 5.2.1 y mawk 1.3.4, `LANG=C.UTF-8`). Las funciones
sueltas las llamé desde un script mío fuera del repositorio que carga
`init.local.sh` con `ok`/`fail` sin color e imprime `EXIT_CODE`.

### Qué ejecuté y qué salió

| # | Qué | Comando | Resultado |
|---|---|---|---|
| 1 | Repositorio como está | `./init.sh` | `exit=0`; 104 archivos de test, 1703 tests; `[OK] Cabeceras Archivos: de 16 tasks.md: ninguna declara dos rutas…`; `[OK] E2E smoke verde (chromium)`; ningún `[FAIL]` ni `[WARN]` |
| 2 | Se pone rojo, con un caso mío | creé `specs/98-revision-rutas/tasks.md` (Lote A con `…/__tests__/widgetStore.spec.ts`, Lote B con `…/__tests__/WidgetStore.spec.ts`) y lancé `./init.sh` | `exit=1`; `[FAIL] specs/98-revision-rutas/tasks.md declara en sus cabeceras Archivos: dos rutas que solo se distinguen en mayúsculas y minúsculas: src/features/demo/__tests__/widgetStore.spec.ts y src/features/demo/__tests__/WidgetStore.spec.ts`; `[FAIL] Entorno NO está listo`. Tests y e2e seguían en verde: el rojo viene solo del paso nuevo |
| 2 | No queda nada | `ls -d specs/98*` y `git status --short` tras borrar | `No such file or directory`; solo ` M docs/verification.md`, ` M init.local.sh` y el informe sin seguimiento |
| 3 | Spec de la feature 26 antes del arreglo | `git show dd14a5f:specs/26-overview-previous-months/tasks.md` a un archivo fuera del repositorio (4 cabeceras `Archivos:`) y `check_case_only_paths` sobre él | `[FAIL] … src/features/overview/__tests__/previousMonths.spec.ts y src/features/overview/__tests__/PreviousMonths.spec.ts`, `EXIT_CODE=1` |
| 4 | Misma ruta tal cual en dos lotes | `check_case_only_paths repetida.md` | `[OK]`, `EXIT_CODE=0` |
| 4 | Sin cabeceras `Archivos:` (con `src/A.ts` y `src/a.ts` dentro de una task) | ídem | `[OK]`, `EXIT_CODE=0` |
| 4 | Los 16 `tasks.md` reales | `check_case_only_paths specs/*/tasks.md` | `[OK] … de 16 tasks.md`, `EXIT_CODE=0`. Solo `specs/26-overview-previous-months/tasks.md` tiene cabeceras (4) |
| 4 | Dos `tasks.md` distintos, uno con `src/a/Foo.ts` y otro con `src/a/foo.ts` | `check_case_only_paths specA/tasks.md specB/tasks.md` | `[OK] … de 2 tasks.md`, `EXIT_CODE=0`: la comparación es dentro de cada archivo |
| 7 | `init.sh` no se ha tocado | `git hash-object init.sh` y `git rev-parse HEAD:init.sh` | los dos `079e07c425dc21e66acd66d5d1f686694dc1ca6c`; `git status --short init.sh` vacío |
| 7 | Los otros modos no ejecutan el paso (lanzados **con** el `tasks.md` de prueba del punto 2 dentro de `specs/`) | `./init.sh --state`, `--fast`, `--checks 26` | los tres `exit=0`, 0 líneas con `Cabeceras Archivos` y 0 con `98-revision-rutas`. `--checks 26`: `Checks: 11 de 11 en verde` |

### Casos que busqué yo para ver si se le escapan (punto 5)

Todos con `check_case_only_paths` sobre un archivo fuera del repositorio.

**Los detecta** (`[FAIL]`, `EXIT_CODE=1`):

- la pareja repartida en dos lotes, y la pareja en la misma cabecera;
- finales de línea CRLF (el mensaje sale sin `\r`, mirado con `cat -A`);
- la diferencia en una carpeta y no en el archivo (`src/A/foo.ts` / `src/a/foo.ts`);
- tres variantes (`Foo`, `FOO`, `foo`): dos líneas `[FAIL]`, cada una contra la primera;
- las dos rutas con barra invertida (`src\a\Foo.ts` / `src\a\foo.ts`);
- un `tasks.md` sin salto de línea final, y uno en una carpeta con espacio en el nombre.

**No los detecta** (`[OK]`, `EXIT_CODE=0`):

| Caso | ¿Importa? |
|---|---|
| Rutas sin acentos graves (`Archivos: src/a/Foo.ts, src/a/foo.ts`) | Poco. El formato del harness (`docs/specs.md:264`, `.claude/agents/spec-author.md:112`) las pone entre acentos graves y las 4 cabeceras reales también. El documento lo dice en «Qué comprueba», no en «Qué no ve» |
| Cabecera con sangría, con viñeta (`- Archivos:`), en negrita (`**Archivos:**`), `archivos:` o `ARCHIVOS:` | Poco hoy: ninguna línea real con `archivos:` deja de empezar por `Archivos:` (`grep -n -i 'archivos:' specs/*/tasks.md \| grep -v ':Archivos:'` → vacío). Está escrito en «Qué no ve». Ver observación 1 |
| Cabecera `Archivos:` vacía y las rutas en una lista debajo | Igual que la anterior |
| Una ruta con `\` y la otra con `/` (`src\a\Foo.ts` / `src/a/foo.ts`) | No. Nadie escribe así un spec y no está en el formato |
| Una con `./` delante y la otra sin él | No, por lo mismo |
| Espacios dentro de los acentos graves (`` ` src/a/Foo.ts ` ``) | No |
| Archivo con BOM al principio y la cabecera en la primera línea | No: la cabecera nunca es la primera línea de un `tasks.md` |
| Letras fuera de ASCII (`Árbol.ts` / `árbol.ts`) | Ver punto 6 |

### Lo que el implementer declara que no cubre (punto 6)

**Letras fuera de ASCII.** Confirmado aquí: `[OK]`, `EXIT_CODE=0`. Depende de la
configuración regional y del `awk`, y eso lo he ejecutado:

- Git para Windows, sin `LC_ALL`: no la detecta.
- Git para Windows con `LC_ALL=C.UTF-8` (y con `en_US.UTF-8`): **sí** la detecta.
- Ubuntu en WSL, GNU Awk 5.2.1, `LANG=C.UTF-8`: sí la detecta.
- Ubuntu en WSL, mawk 1.3.4, `LANG=C.UTF-8`: no la detecta.

No hace falta arreglarlo ahora: ninguna ruta de `src/` ni de los specs lleva
letras fuera de ASCII, el caso que motivó la tarea era ASCII, y la frase de
`docs/verification.md` es exacta para la máquina donde se probó. Basta con que
esté escrito. Ver observación 2.

**Linux.** Ejecutado por mí en Ubuntu (WSL), con `awk` apuntando a GNU Awk y
luego a mawk: el spec 26 de `dd14a5f`, CRLF, dos lotes y mismo lote dan `[FAIL]`
y `EXIT_CODE=1`; ruta repetida, sin cabeceras y los 16 `tasks.md` reales dan
`[OK]` y `EXIT_CODE=0`. Lo que **no** he ejecutado en Linux es `./init.sh`
entero (no comprobé si esa distribución tiene Node y pnpm instalados).

**macOS: no lo he comprobado.** No tengo un macOS ni el `awk` de BSD (en esta
máquina y en el WSL solo hay GNU Awk y mawk). Lo que sigue es **lectura**, no
ejecución:

- El programa usa `sub`, `match` con `RSTART`/`RLENGTH`, `substr`, `tolower`,
  `in` sobre arrays y `continue` dentro de un `while`. Todo eso es awk POSIX; no
  usa nada exclusivo de GNU Awk (ni `gensub`, ni `\<`, ni `IGNORECASE`, ni
  arrays de arrays). No veo nada que deba dar error ni dejar de funcionar.
- El `\r` dentro de la expresión regular no lo define POSIX; lo aceptan GNU Awk
  y mawk (ejecutado) y, hasta donde sé, el `awk` de macOS. Si alguno no lo
  aceptara, lo que se perdería es el caso CRLF, no el paso entero.
- La parte de `bash` (`local`, `IFS=$'\t' read -r`, el documento en línea) vale
  para el bash 3.2 de macOS.
- Lo más cercano que sí ejecuté: `awk --posix` y `awk --traditional` (GNU Awk
  5.0.0) con el mismo programa sobre el spec 26 de `dd14a5f` y sobre el caso
  CRLF: las dos parejas salen igual. Eso **no** es el `awk` de BSD.

Para comprobarlo de verdad haría falta lanzar `./init.sh` en un macOS. No hace
falta arreglar nada ahora; el informe ya dice que no se probó.

### `docs/verification.md` (punto 8)

Lo que dice del paso coincide con lo que ejecuté: qué comprueba, el `[FAIL]` con
el `tasks.md` y las dos rutas, exit 1, la línea `[OK]`, que va después de los
tests unitarios y antes del e2e (se ve en el orden de la salida del bloque 6b),
los tres modos que no lo ejecutan, los tres casos que no son fallo y lo que no
ve, incluido el archivo creado fuera de lo que declara el spec (el paso solo lee
`specs/*/tasks.md`; no mira el disco ni git).

### Vocabulario (punto 9)

Leídos el diff de `init.local.sh`, el de `docs/verification.md` y el informe. El
paso no recibe ningún nombre corto: se describe siempre como «rutas de las
cabeceras `Archivos:` … que solo se distinguen en mayúsculas y minúsculas».
`docs/vocabulary.md` no tiene términos aprobados y el texto nuevo no necesita
ninguno. Los nombres de las dos funciones describen en inglés lo que hacen.

### Las dos cosas que el implementer señala fuera de su encargo

Las dos son ciertas:

1. `docs/verification.md:108-117` numera los pasos del 1 al 9, y las líneas 29,
   30 y 53 hablan de «sección 8» y «secciones 5 y 6». `grep -n '^echo "── ' init.sh`
   da los títulos 1, 2, 3, 5, 6 y 7 (más el 4 y el 6b, que se imprimen dentro de
   un `if`): lint y formato van juntos en el 5, los tests son el 6, el e2e sale
   en el 6b y el resumen es el 7.
2. `docs/verification.md:75` dice `progress/implementation/<name>.md`; `ls progress`
   da `implementations/`.

### Observaciones (no bloquean; decide el leader)

1. **Si la cabecera no empieza exactamente por `Archivos:`, el paso dice `[OK]`
   sin haber mirado nada de ese `tasks.md`.** La línea `[OK]` cuenta los
   `tasks.md` recorridos (16), no los que tienen cabeceras (1). Está escrito en
   «Qué no ve». Si algún día un spec escribe la cabecera de otra forma, el paso
   dejará de comprobarlo sin avisar.
2. **Letras fuera de ASCII:** en esta máquina se detectan llamando a `awk` con
   `LC_ALL=C.UTF-8` (ejecutado). Es un cambio de una línea en
   `case_only_path_pairs`, pero con mawk no sirve. No lo he pedido porque no hay
   rutas así en el proyecto.
3. **«Qué no ve» de `docs/verification.md`** no nombra dos casos que sí probé:
   rutas sin acentos graves y una ruta con `\` frente a otra con `/`. El primero
   se deduce de «Qué comprueba».
4. **No hay test automático de las dos funciones**, como dice el informe: el
   proyecto no tiene ejecutor de tests para scripts de shell. Lo que las cubre
   son las ejecuciones a mano de este informe y del del implementer.

### Comprobado sin hallazgos

`./init.sh` verde y rojo provocado por mí, spec 26 de `dd14a5f`, los cuatro
casos que no deben fallar, comparación dentro de cada `tasks.md`, Linux con GNU
Awk y mawk, `init.sh` idéntico a `HEAD`, los modos `--state`, `--fast` y
`--checks`, `docs/verification.md` frente al comportamiento real, vocabulario,
`docs/lessons.md` (sin entradas), datos reales del humano en archivos que van a
git (ninguno: las rutas de ejemplo son las del propio spec 26).
