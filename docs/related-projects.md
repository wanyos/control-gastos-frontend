# Proyecto hermano — Backend

> Este frontend forma parte de un workspace de dos proyectos. Ver el
> `CLAUDE.md` de la carpeta madre para el mapa completo.

## De dónde saco los datos

- `gastos-backend/` (Fastify + Prisma + TypeScript, Postgres) expone la API.
- **El contrato de la API vive en `../gastos-backend/docs/api-contract.md`.**
  Esa es la fuente de verdad de cómo son los datos y los endpoints.

## Qué debe saber el harness del frontend

- **Antes de tocar cualquier llamada a la API, lee
  `../gastos-backend/docs/api-contract.md`.** No inventes endpoints, campos ni
  formas de datos: si no está en el contrato, no existe.
- **Define tus propios tipos e interfaces** a partir del contrato. No se
  comparten tipos con el backend; tú creas los tuyos (ej. una interfaz
  `Gasto` con los campos que describe el contrato). Si el contrato cambia,
  ajustas tus tipos.
- Al escribir el `intent` de una feature que consume la API, usa el campo
  `delego_en_agente` para forzar la consulta del contrato. Ej:
  > "Cómo es exactamente la respuesta del endpoint de gastos: míralo en
  >  `../gastos-backend/docs/api-contract.md` y confírmamelo antes de construir."
- Si necesitas un endpoint que el contrato no tiene, **PARA**. No lo des por
  hecho: anótalo como dependencia del backend en `progress/current.md`. Ese
  endpoint se implementa primero en el backend, en su propia sesión.

## Qué NO haces desde aquí

- No edites código ni archivos del backend.
- No implementes en la misma sesión cambios de los dos proyectos.
