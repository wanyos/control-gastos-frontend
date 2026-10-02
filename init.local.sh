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

# E2E smoke (chromium) — feature 6: e2e-smoke.
# Solo chromium para que la pasada siga siendo rápida; los tres navegadores
# siguen disponibles con `pnpm test:e2e`. Si faltan los navegadores de
# Playwright en la máquina, avisa en vez de poner la pasada en rojo.
local_steps() {
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
