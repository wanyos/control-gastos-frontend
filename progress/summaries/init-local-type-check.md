# Resumen — tarea de higiene `init-local-type-check`

Fecha de cierre: 2026-10-04
Intención original: no es una feature de `feature_list.json`. Tarea de higiene
aprobada por el humano el 2026-10-04.
Revisión: `progress/reviews/init-local-type-check.md`

## Qué hace ahora `./init.sh` que antes no

Ejecuta `pnpm type-check` (`vue-tsc --build`) y termina en rojo si sale distinto
de 0. Hasta ahora un error de tipos, en un `.vue` o en un `.ts`, no lo ponía en
rojo: el paso de tipos que trae `init.sh` (`npx tsc --noEmit --incremental`) no
comprueba ningún archivo en este proyecto. La app no cambia.

## Por dónde se toca (puntos de entrada)

| Cómo se usa | Código |
| --- | --- |
| `./init.sh` completo lo ejecuta dentro de `local_steps`, antes del e2e | [init.local.sh:110](../../init.local.sh#L110) |
| Función que lanza `pnpm type-check` y escribe el `[OK]` o el `[FAIL]` | [init.local.sh:88](../../init.local.sh#L88) |

## Dónde está el código

### El paso

| Qué hace | Dónde |
| --- | --- |
| Lanza `pnpm type-check`, guarda su salida y, si sale distinto de 0, la escribe entera y pone `EXIT_CODE=1` | [init.local.sh](../../init.local.sh) → `run_pnpm_type_check` |
| Llama al paso después de la comprobación de rutas de los `tasks.md` y antes del e2e | [init.local.sh](../../init.local.sh) → `local_steps` |

### Documentación

| Qué dice | Dónde |
| --- | --- |
| Nota del Nivel 1, filas 4 y 6b de la tabla de pasos, sección «`pnpm type-check` dentro de `./init.sh`» (qué hace, cuándo se ejecuta, qué cubre que el paso 4 no, qué sigue sin cubrir) y «Verificación final antes de cerrar» | [docs/verification.md](../../docs/verification.md) |
| «Cómo se hace una actualización aquí» (punto 4 y el párrafo siguiente) y el punto 3 de «Por qué TypeScript 7 no entra (todavía)» | [docs/stack.md](../../docs/stack.md) |

### Tests

No hay test automático: el proyecto no tiene ejecutor de tests para scripts de
shell. Las ejecuciones a mano están en el informe del implementer y en la
revisión.

## Cumplimiento de lo pedido

- ✅ «`./init.sh` ejecuta `pnpm type-check`» → se cumple. Con el repositorio como
  está: `exit=0` y la línea `[OK] OK: pnpm type-check (vue-tsc --build, incluye
  los .vue)`.
- ✅ «y falla si sale distinto de 0» → se cumple. Ejecutado por el reviewer con
  un error de tipos en un `.vue` temporal y con otro en un `.ts` temporal (los
  dos ya borrados): `npx tsc --noEmit --incremental` salió con 0,
  `pnpm type-check` con 2 y `./init.sh` con 1, con el `[FAIL]` y la salida
  entera de `vue-tsc`.
- ✅ Cuando el paso falla, `./init.sh` sigue con el e2e y termina con `exit=1`.

## Qué NO se tocó / quedó fuera

- `init.sh` no cambia.
- El paso no se ejecuta en `./init.sh --state`, `--fast` ni `--checks`.
- **`./init.sh --fast` no comprueba tipos de ningún archivo.** Con un `.vue` con
  un error de tipos dentro de `src/` salió con `exit=0` y escribió «Estado y
  tipos OK». Un error de tipos no aparece hasta `./init.sh` completo o
  `pnpm type-check` a mano.
- `pnpm build` sigue sin ejecutarlo `./init.sh`: hay que lanzarlo a mano.
- No se ha repetido la prueba con TypeScript 7 instalado después de añadir el
  paso.

## Notas para el futuro

- El paso añade unos 7 segundos a `./init.sh` en esta máquina (`pnpm type-check`
  solo: 6,5 s medidos por el implementer, 7,3 s por el reviewer).
- Si el script `type-check` faltara en `package.json`, el paso queda en rojo con
  el error de pnpm («Command "type-check" not found»). Probado con la función
  suelta en una copia fuera del repositorio, no con `./init.sh` entero.
- Tres archivos del motor del harness dicen que `--fast` comprueba «estado +
  tipos» (`.claude/agents/implementer.md`, `.claude/settings.json`,
  `.claude/hooks/verify-changed.sh`), y `init.sh` escribe «Type check OK (tsc sin
  errores)» sin haber mirado ningún archivo. En este proyecto no es verdad y
  desde aquí no se puede corregir.
- `docs/verification.md:27` dice que `init.sh` ejecuta la suite «además del
  type-check», refiriéndose a su paso 4. Es anterior a esta tarea.
