# Lecciones de este proyecto

> **Qué es este archivo.** Las correcciones que el humano ha hecho a los agentes
> en este proyecto y que ha aprobado apuntar, para que no se repitan.
>
> **Quién lo lee:** todos los agentes, al arrancar. Cada uno cumple como regla
> las entradas `activa` dirigidas a él (columna *Agente*) o a `todos`.
>
> **Quién escribe:** el `leader`, al cerrar una feature, y **solo lo que el
> humano aprueba** (ver `.claude/agents/leader.md §Las correcciones del humano
> se apuntan`). El comando `/lessons` propone limpiezas, pero tampoco escribe
> sin aprobación.
>
> **El update del harness no lo toca nunca:** lo crea si falta y a partir de ahí
> es de este proyecto.

## Formato de una entrada

Una fila por lección, en lenguaje llano:

- **Qué pasó:** el fallo concreto, en una línea.
- **Qué hay que hacer:** la regla que evita que vuelva a pasar, redactada para
  que el agente la pueda cumplir sin contexto (nombra archivos, comandos o
  símbolos concretos si los hay).
- **Alcance:** `proyecto` si solo tiene sentido aquí; `harness` si es un fallo
  del harness que pasaría en cualquier proyecto.
- **Estado:** `activa` · `en plantilla v<versión>` · `retirada`. Solo las
  `activa` obligan a los agentes. Una lección `harness` sigue `activa` aquí hasta
  que la plantilla la incorpora y el proyecto se actualiza a esa versión; entonces
  pasa a `en plantilla v<versión>`, porque ya la cumple el propio agente.

Si el archivo pasa de ~20 entradas activas, deja de leerse con atención: es la
señal para lanzar `/lessons` y consolidar.

## Entradas

| # | Fecha | Feature | Agente | Qué pasó | Qué hay que hacer | Alcance | Estado |
|---|---|---|---|---|---|---|---|
| 1 | 2026-10-04 | higiene (`init-local-type-check`) | motor del harness (`init.sh`) | El paso 4 de `init.sh` lanza `npx tsc --noEmit --incremental`, que con un `tsconfig.json` de solo `references` y `"files": []` no comprueba ningún archivo y sale con 0. Dijo «Type check OK» durante 26 features sin mirar nada. `./init.sh --fast` sigue igual. | En un proyecto con `references`, el paso de tipos de `init.sh` tiene que usar el script de tipos del proyecto (`tsc --build` o `vue-tsc --build`), o fallar si la lista de archivos sale vacía. | harness | activa |
