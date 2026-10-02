# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

- **Feature en curso:** ninguna. La E7 quedó cerrada el 2026-10-02 con la F24.
- **Última sesión:** 2026-09-22 → 2026-10-02 (features 16 a 24). Todo su detalle está
  en `progress/history.md`.

## Estado

24 features cerradas, etapas E0 a E7 completas. `./init.sh` ejecuta nueve pasos, con
lint y formato incluidos.

## Cabos sueltos que no son de ninguna feature en curso

- **Fallo de paginación del backend** (`../docs/handoff-paginacion-estable.md`):
  `GET /api/movements` con `pageSize=100` devuelve 1.605 movimientos distintos de 1.607.
  La cola de revisión esconde dos (21728 y 24276) hasta que el backend lo arregle. Cuando
  esté, comprobar desde la cola que recorrer las 17 páginas da 1.607 distintos.
- **`GET /api/investments/deposits`** (feature 50 del backend): servido y sin usar. Dice
  lo que ganó cada depósito; encaja en Patrimonio, ya en la E8.
- **Deuda de las reglas** (anotada en el resumen de la F18): «ANUL. /VivaGym» propone
  `anul. /vivagym`, y los nombres de canal (`trans inm`, `tpv virtual`) siguen flojos.
- **Higiene transversal** anotada por el reviewer: los tests unitarios no tienen una red
  de seguridad global (el origen de jsdom coincide con el backend real; se cierra con una
  línea en `vitest.config.ts`), y un fallo de red al escribir se cuenta como «no cambió
  nada» en F16, F21, F22 y F24.
- **Historial con nombres de terceros**: en dos commits antiguos, aún sin subir. El
  humano decidió dejarlo como está (2026-10-02).
- **17 traspasos propios sin pareja** siguen contando en las sumas; los marca el humano
  desde el extracto cuando quiera.

## Próximo paso

La E8, los dashboards. Ya no está bloqueada por las sumas (features 22 y 23). Empieza,
como siempre, por que el humano escriba qué quiere ver.
