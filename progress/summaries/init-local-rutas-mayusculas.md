# Resumen — tarea de higiene `init-local-rutas-mayusculas`

Fecha de cierre: 2026-10-04
Intención original: no es una feature de `feature_list.json`. Tarea de higiene
aprobada por el humano el 2026-10-04.
Revisión: `progress/reviews/init-local-rutas-mayusculas.md`

## Qué hace ahora `./init.sh` que antes no

Falla si, en las cabeceras `Archivos:` de un mismo `specs/*/tasks.md`, hay dos
rutas que solo se distinguen en mayúsculas y minúsculas. En Windows esas dos
rutas son el mismo archivo: en la feature 26 un lote escribió encima del archivo
de otro y se perdieron 44 tests. La app no cambia.

## Por dónde se toca (puntos de entrada)

| Cómo se usa | Código |
| --- | --- |
| `./init.sh` completo lo ejecuta dentro de `local_steps`, antes del e2e | [init.local.sh:78](../../init.local.sh#L78) |
| Función que recorre los `tasks.md` y escribe el `[FAIL]` o el `[OK]` | [init.local.sh:50](../../init.local.sh#L50) |

## Dónde está el código

### El paso

| Qué hace | Dónde |
| --- | --- |
| Saca de un `tasks.md` las rutas entre acentos graves de las líneas `Archivos:` e imprime las que solo cambian en mayúsculas, de dos en dos | [init.local.sh](../../init.local.sh) → `case_only_path_pairs` |
| Llama a la anterior con cada `tasks.md` por separado, escribe el mensaje y pone `EXIT_CODE=1` | [init.local.sh](../../init.local.sh) → `check_case_only_paths` |
| Llama al paso antes del e2e | [init.local.sh](../../init.local.sh) → `local_steps` |

### Documentación

| Qué dice | Dónde |
| --- | --- |
| Fila `7b` de la tabla de pasos y la sección «Rutas de un `tasks.md` que solo se distinguen en mayúsculas y minúsculas»: qué comprueba, cuándo se ejecuta, qué no es un fallo y qué no ve | [docs/verification.md](../../docs/verification.md) |

### Tests

No hay test automático: el proyecto no tiene ejecutor de tests para scripts de
shell. Las ejecuciones a mano están en el informe del implementer y en la
revisión.

## Cumplimiento de lo pedido

- ✅ «`./init.sh` falla si dos rutas declaradas en las cabeceras `Archivos:` de
  un mismo `tasks.md` solo se distinguen en mayúsculas y minúsculas» → se
  cumple. Ejecutado por el reviewer con un `tasks.md` de prueba dentro de
  `specs/` (ya borrado): `exit=1`, y el mensaje nombra el `tasks.md` y las dos
  rutas.
- ✅ Con el spec de la feature 26 anterior al arreglo (commit `dd14a5f`) habría
  saltado: ejecutado, `EXIT_CODE=1` con las dos rutas reales.
- ✅ Con el repositorio como está, `./init.sh` termina con `exit=0`.

## Qué NO se tocó / quedó fuera

- `init.sh` no cambia.
- El paso no se ejecuta en `./init.sh --state`, `--fast` ni `--checks`.
- Solo lee las cabeceras `Archivos:` de los `tasks.md`: no mira el disco ni git,
  así que no ve un archivo creado fuera de lo que declara el spec.
- Solo cuenta una línea como cabecera si empieza exactamente por `Archivos:`, y
  solo las rutas entre acentos graves.
- Letras fuera de ASCII (`Árbol.ts` / `árbol.ts`): en esta máquina no se detectan.
- No se ha probado en macOS. En Linux (Ubuntu en WSL) el reviewer ejecutó las
  dos funciones con GNU Awk y con mawk, no `./init.sh` entero.

## Notas para el futuro

- `docs/verification.md` numera los pasos de `./init.sh` del 1 al 9 y habla de
  «sección 8»; el `init.sh` actual los titula del 1 al 7, con el e2e en el 6b.
  En la línea 75 dice `progress/implementation/` y la carpeta es
  `progress/implementations/`. Son anteriores a esta tarea.
- La línea `[OK]` del paso cuenta los `tasks.md` recorridos, no los que tienen
  cabeceras `Archivos:`: hoy son 16 recorridos y 1 con cabeceras.
