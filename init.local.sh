# init.local.sh — verificación propia de gastos-frontend.
#
# Lo carga ./init.sh (formato en su cabecera). Es del proyecto: el update del
# harness no lo toca nunca. Sale de las secciones 5, 6, 7 y 8 que este proyecto
# tenía escritas a mano en init.sh hasta la v1.x del harness.

# Tests unitarios: este proyecto usa el script test:unit, no test.
LOCAL_TEST_CMD="$PKG test:unit"

# Lint y formato en modo comprobación, sin arreglar nada.
# WHY (higiene 2026-09-30): `pnpm lint` lleva --fix; una verificación comprueba,
# no arregla. Un lint en rojo se coló hasta la revisión de la feature 23.
LOCAL_STYLE_CMDS="$PKG lint:oxlint:check
$PKG format:check"

# Rutas de las cabeceras `Archivos:` de un tasks.md que solo se distinguen en
# mayúsculas y minúsculas.
# WHY (higiene 2026-10-04): en la feature 26 el tasks.md declaraba
# `__tests__/previousMonths.spec.ts` en un lote y `__tests__/PreviousMonths.spec.ts`
# en otro. En un disco que no distingue mayúsculas (Windows, macOS por defecto)
# son el mismo archivo: el segundo lote escribió encima del primero y se
# perdieron 44 tests que no estaban en git.
#
# Imprime, para el tasks.md que recibe, una línea por pareja: ruta<TAB>ruta.
# Sin cabeceras `Archivos:` no imprime nada. La misma ruta repetida tal cual en
# dos lotes no es una pareja. Solo usa awk, que init.sh ya usa; quita el \r de
# los tasks.md con finales de línea CRLF.
case_only_path_pairs() {
  awk '
    { sub(/\r$/, "") }
    /^Archivos:/ {
      line = $0
      while (match(line, /`[^`]+`/)) {
        path = substr(line, RSTART + 1, RLENGTH - 2)
        line = substr(line, RSTART + RLENGTH)
        if (path in seen) continue
        seen[path] = 1
        key = tolower(path)
        if (key in first) print first[key] "\t" path
        else first[key] = path
      }
    }
  ' "$1"
}

# Aplica case_only_path_pairs a cada tasks.md que recibe, cada uno por separado
# (dos specs distintos pueden declarar el mismo archivo). Por cada pareja,
# `fail` con el tasks.md y las dos rutas, y EXIT_CODE=1. Si no hay ninguna, una
# línea `ok`.
check_case_only_paths() {
  local tasks_file pairs first second found=0 checked=0
  for tasks_file in "$@"; do
    [ -f "$tasks_file" ] || continue
    checked=$((checked + 1))
    pairs="$(case_only_path_pairs "$tasks_file")"
    [ -z "$pairs" ] && continue
    while IFS=$'\t' read -r first second; do
      fail "$tasks_file declara en sus cabeceras Archivos: dos rutas que solo se distinguen en mayúsculas y minúsculas: $first y $second"
      found=1
    done <<EOF_PAIRS
$pairs
EOF_PAIRS
  done
  if [ "$found" -eq 1 ]; then
    fail "En un disco que no distingue mayúsculas son el mismo archivo: renombra una de las dos en el tasks.md."
    EXIT_CODE=1
  else
    ok "Cabeceras Archivos: de $checked tasks.md: ninguna declara dos rutas que solo se distingan en mayúsculas y minúsculas"
  fi
}

# E2E smoke (chromium) — feature 6: e2e-smoke.
# Solo chromium para que la pasada siga siendo rápida; los tres navegadores
# siguen disponibles con `pnpm test:e2e`. Si faltan los navegadores de
# Playwright en la máquina, avisa en vez de poner la pasada en rojo.
local_steps() {
  # Antes del e2e, que es lo lento.
  check_case_only_paths specs/*/tasks.md

  if ! grep -q '"test:e2e"' package.json 2>/dev/null; then
    warn "No hay script test:e2e en package.json; se omite el e2e"
    return
  fi
  local cmd="$PKG test:e2e --project=chromium"
  info "Ejecutando: $cmd"
  local out status
  out="$($cmd 2>&1)"
  status=$?
  if [ "$status" -eq 0 ]; then
    ok "E2E smoke verde (chromium)"
  elif echo "$out" | grep -qi "executable doesn't exist\|please run the following command to download new browsers"; then
    warn "Navegadores de Playwright no encontrados; se omite el e2e."
    warn "Instálalos con: npx playwright install chromium"
  else
    fail "E2E smoke rojo (chromium):"
    echo "$out"
    EXIT_CODE=1
  fi
}
