# init-local-type-check — revisión

## Review (2026-10-04)

**Veredicto:** APPROVED
Tarea de higiene, no es una feature de `feature_list.json`: no hay `acceptance`,
ni spec, ni `checks` propios. Comprobado lo pedido por el humano contra
ejecuciones mías, `docs/verification.md`, `docs/stack.md`, vocabulario y que
`init.sh` no cambia. Sin cambios requeridos. Al final hay tres observaciones que
no bloquean.
Resumen de cierre: `progress/summaries/init-local-type-check.md`.

Entorno de mis ejecuciones: `bash` de Git para Windows, pnpm 11.22.0, en esta
máquina. Los archivos temporales los creé yo en `src/` y los borré; el caso del
script ausente lo ejecuté en una carpeta fuera del repositorio.

### Qué ejecuté y qué salió

| # | Qué | Comando | Resultado |
|---|---|---|---|
| 1 | Repositorio como está | `./init.sh` | `exit=0`, 51,7 s; 104 archivos de test, 1703 tests; `[OK] OK: pnpm type-check (vue-tsc --build, incluye los .vue)`; `[OK] E2E smoke verde (chromium)`; ningún `[FAIL]` ni `[WARN]` |
| 2 | Error de tipos en un `.vue` mío: `src/ZzReviewerProbe.vue` con `const reviewerFlag: boolean = 12` | `npx tsc --noEmit --incremental` | `exit=0`, sin salida |
| 2 | ídem | `pnpm type-check` | `exit=2`; `src/ZzReviewerProbe.vue(2,7): error TS2322: Type 'number' is not assignable to type 'boolean'.` |
| 2 | ídem | `./init.sh` | `exit=1`; `[FAIL] Fallido: pnpm type-check (exit 2):` seguido de la salida entera de `vue-tsc`; `[FAIL] Entorno NO está listo` |
| 2 | Error de tipos en un `.ts` mío: `src/zzReviewerProbe.ts` con `export const reviewerLabels: string[] = [1, 2]` | `npx tsc --noEmit --incremental` | `exit=0`, sin salida |
| 2 | ídem | `pnpm type-check` | `exit=2`; `src/zzReviewerProbe.ts(1,42): error TS2322: Type 'number' is not assignable to type 'string'.` (y otra igual en la columna 45) |
| 2 | ídem | `./init.sh` | `exit=1`; `[FAIL] Fallido: pnpm type-check (exit 2):` con las dos líneas de error; `[FAIL] Entorno NO está listo` |
| 2 | No queda nada | `ls` de cada archivo tras borrarlo, y `git status --short` | `No such file or directory` los dos; solo ` M docs/stack.md`, ` M docs/verification.md`, ` M init.local.sh`, ` M progress/current.md` y el informe sin seguimiento. `pnpm type-check` después: `exit=0` |
| 3 | Cuando el paso falla, sigue y acaba en rojo | las dos pasadas de `./init.sh` del punto 2 | En las dos, después del `[FAIL]` del paso salen `[INFO] Ejecutando: pnpm test:e2e --project=chromium`, `[OK] E2E smoke verde (chromium)` y el bloque «7. Resumen»; `exit=1`. Paso 4, lint, formato y tests unitarios en verde: el único `[FAIL]` antes del resumen es el del paso nuevo |
| 4 | Los otros modos no ejecutan el paso (lanzados **con** el `.vue` con error dentro de `src/`) | `./init.sh --state`, `--fast`, `--checks 26` | Los tres `exit=0` y 0 líneas con `type-check`, `vue-tsc` o `6b.`. `--checks 26`: `Checks: 11 de 11 en verde` |
| 5 | `init.sh` no se ha tocado | `git hash-object init.sh` y `git rev-parse HEAD:init.sh` | los dos `079e07c425dc21e66acd66d5d1f686694dc1ca6c`; `git diff --quiet HEAD -- init.sh` sale con 0 |
| 6 | Script `type-check` ausente de `package.json` | ver más abajo | `[FAIL]`, `EXIT_CODE=1` |
| 8 | Tiempo de `pnpm type-check` solo | `time pnpm type-check`, tres veces seguidas | 7,338 s, 7,228 s y 7,349 s; `exit=0` |

En la pasada con el `.vue` temporal la suite contó 1704 tests en vez de 1703.
No he mirado qué test cuenta los archivos de `src/`; con el archivo borrado
vuelve a 1703.

### El paso 4 de `init.sh` no comprueba ningún archivo (hallazgo del implementer)

Confirmado. Con el `.vue` con error puesto:
`npx tsc --noEmit --incremental --listFiles | wc -l` da `0`, y el comando sin
`--listFiles` sale con 0. Con el `.ts` con error, también sale con 0.
`tsconfig.json` tiene `"files": []` y tres `references`, leído.
`npx vue-tsc --build --verbose` lista `tsconfig.node.json`, `tsconfig.app.json`,
`tsconfig.vitest.json` y `tsconfig.json`, y construye los tres primeros.

### Qué comprueba de tipos `./init.sh --fast` ahora (punto 4)

**Nada.** Con el `.vue` con error dentro de `src/`, `./init.sh --fast` salió con
`exit=0` y escribió `[OK] Type check OK (tsc sin errores)` y
`[OK] Estado y tipos OK (modo --fast; los tests NO se han ejecutado).` Ese modo
solo ejecuta el paso 4, que mira cero archivos, y sale en `init.sh:519-527`,
antes de `local_steps`.

`docs/verification.md:202-204` lo dice con claridad: «`./init.sh --fast` no
comprueba tipos de ningún archivo. Solo ejecuta el paso 4 […] un error de tipos
no aparece hasta `./init.sh` completo o `pnpm type-check` a mano». Ver
observación 1 sobre lo que dicen los archivos del motor del harness.

### Script `type-check` ausente de `package.json` (punto 6)

**Probado, no solo leído**, en una copia fuera del repositorio: una carpeta
temporal con `init.local.sh` copiado, un `package.json` con un solo script
(`dev`) y un script mío que define `ok`/`warn`/`fail`/`info` sin color, pone
`PKG=pnpm`, carga `init.local.sh` y llama a `run_pnpm_type_check`. Salida:

```
[INFO] Ejecutando: pnpm type-check
[FAIL] Fallido: pnpm type-check (exit 1):
Already up to date

Done in 351ms using pnpm v11.22.0
"type-check" no se reconoce como un comando interno o externo,
programa o archivo por lotes ejecutable.
undefined
[ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL] Command "type-check" not found
EXIT_CODE=1
```

El paso queda en rojo, como dice el comentario de `init.local.sh:86-87`. El
mensaje no dice «falta el script»: dice que pnpm no encuentra el comando. Lo que
**no** he ejecutado es `./init.sh` entero sin el script; lo que probé es la
función suelta. `local_steps` la llama sin condición (`init.local.sh:110`) y
`init.sh:650-656` sale con `EXIT_CODE`, leído.

### `docs/verification.md` y `docs/stack.md` (punto 7)

Lo que dicen del paso coincide con lo que ejecuté:

- **`pnpm build` es lo que queda sin cubrir.**
  `grep -n "pnpm build\|vite build\|build-only\|PKG build\|run build" init.sh init.local.sh`
  no da ninguna línea (exit 1). En la salida de `./init.sh` (62 líneas),
  `grep -n -i build` da una sola: la del paso nuevo (`vue-tsc --build`). No he
  provocado un fallo de `pnpm build` para ver que `./init.sh` lo deja pasar.
- **El paso 4 no mira ningún archivo aquí:** `docs/verification.md:113` y
  `:190-198`, `docs/stack.md:644-647`. Coincide con lo ejecutado arriba.
- **Cuándo se ejecuta, qué escribe y con qué exit** (`docs/verification.md:173-184`):
  coincide con los puntos 1 a 4.
- **`docs/stack.md:684-692`** dice que la prueba con TypeScript 7 no se ha
  repetido con el paso nuevo. Yo tampoco la he repetido.
- `git grep -n "type-check\|vue-tsc\|tsc --noEmit\|solo corre tsc"` fuera de
  `progress/`, `specs/`, `pnpm-lock.yaml` y `feature_list.json`: no queda
  ninguna línea que diga que `pnpm type-check` hay que lanzarlo a mano ni que
  `./init.sh` no ejecuta `vue-tsc`.

### Tiempos (punto 8)

`pnpm type-check` solo: 7,2 a 7,3 s en tres medidas mías, frente a los 6,5 s del
implementer. Mismo orden. `./init.sh` entero: una sola medida mía, 51,7 s,
frente a sus 46,5 s y 47,9 s; mismo orden, y no he medido la variación entre
pasadas iguales ni `./init.sh` sin el paso.

### Vocabulario (punto 9)

Leídos el diff de `init.local.sh`, los de `docs/verification.md` y
`docs/stack.md`, y el informe. El paso no recibe ningún nombre corto: se
describe como «`pnpm type-check` dentro de `./init.sh`», «la comprobación de
tipos con el script del proyecto» o «el paso nuevo». `docs/vocabulary.md` no
tiene términos aprobados y el texto nuevo no añade ninguno. El nombre de la
función, `run_pnpm_type_check`, dice lo que hace.

### Observaciones (no bloquean; decide el leader)

1. **Tres archivos del motor del harness dicen que `--fast` comprueba tipos, y
   en este proyecto no es verdad:** `.claude/agents/implementer.md:54`
   («`./init.sh --fast` (estado + tipos»), `.claude/settings.json:23` y
   `.claude/hooks/verify-changed.sh:15`, además de la línea que escribe el propio
   `init.sh:522` («Estado y tipos OK»). No se pueden editar desde aquí. Es lo
   mismo que el implementer propone llevar a `docs/lessons.md` con alcance
   `harness`.
2. **`docs/verification.md:27`** sigue diciendo que `init.sh` ejecuta la suite
   «además del type-check», refiriéndose a su paso 4. Es anterior a esta tarea y
   cinco líneas más abajo remite a la sección que lo aclara, pero leída sola da a
   entender que ese paso comprueba algo.
3. **Si faltara el script `type-check`,** el `[FAIL]` muestra el error de pnpm
   («Command "type-check" not found»), no una frase propia. Queda en rojo, que
   es lo pedido.

### Comprobado sin hallazgos

`./init.sh` verde con el repositorio como está; rojo provocado por mí con un
`.vue` y con un `.ts`; que tras el fallo sigue el e2e y el exit es 1; los modos
`--state`, `--fast` y `--checks 26`; `init.sh` idéntico a `HEAD`; el script
ausente, en una copia fuera del repositorio; `docs/verification.md` y
`docs/stack.md` frente al comportamiento real; tiempos; vocabulario;
`docs/lessons.md` (sin entradas); datos reales del humano en archivos que van a
git (ninguno); archivos temporales borrados.
