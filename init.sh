# #!/usr/bin/env bash
# # init.sh — Verificación e inicialización del entorno (agnóstico al stack)
# #
# # Este script lo ejecuta el agente al COMENZAR una sesión y antes de
# # declarar cualquier tarea como `done`. Si falla, la sesión no debe avanzar.
# #
# # Detecta automáticamente el stack del proyecto y ejecuta la verificación
# # apropiada. Si tu proyecto usa un stack no soportado, edita la sección 4.

# set -u

# RED='\033[0;31m'
# GREEN='\033[0;32m'
# YELLOW='\033[0;33m'
# BLUE='\033[0;34m'
# NC='\033[0m'

# ok()    { printf "${GREEN}[OK]${NC}    %s\n" "$1"; }
# warn()  { printf "${YELLOW}[WARN]${NC}  %s\n" "$1"; }
# fail()  { printf "${RED}[FAIL]${NC}  %s\n" "$1"; }
# info()  { printf "${BLUE}[INFO]${NC}  %s\n" "$1"; }

# EXIT_CODE=0

# # ─────────────────────────────────────────────────────────────────────
# # 1. Detección de stack
# # ─────────────────────────────────────────────────────────────────────
# echo "── 1. Detectando stack ────────────────────────────────"

# STACK="unknown"
# TEST_CMD=""
# RUNTIME_VERSION=""

# if [ -f "package.json" ]; then
#   STACK="node"
#   if command -v node >/dev/null 2>&1; then
#     RUNTIME_VERSION=$(node --version 2>/dev/null)
#   fi
#   # Detectar gestor de paquetes
#   if [ -f "pnpm-lock.yaml" ]; then PKG="pnpm";
#   elif [ -f "yarn.lock" ]; then PKG="yarn";
#   else PKG="npm"; fi
#   # Detectar test runner desde package.json
#   if grep -q '"test"' package.json 2>/dev/null; then
#     TEST_CMD="$PKG test"
#   fi

# elif [ -f "requirements.txt" ] || [ -f "pyproject.toml" ] || [ -f "setup.py" ]; then
#   STACK="python"
#   for candidate in python3 python; do
#     if command -v "$candidate" >/dev/null 2>&1; then
#       version_output=$("$candidate" --version 2>/dev/null)
#       if [ -n "$version_output" ]; then
#         PYTHON="$candidate"
#         RUNTIME_VERSION="$version_output"
#         break
#       fi
#     fi
#   done
#   if [ -d "tests" ]; then
#     TEST_CMD="${PYTHON:-python3} -m unittest discover -s tests -v"
#   elif [ -f "pytest.ini" ] || grep -q "pytest" pyproject.toml 2>/dev/null; then
#     TEST_CMD="${PYTHON:-python3} -m pytest"
#   fi

# elif [ -f "Cargo.toml" ]; then
#   STACK="rust"
#   if command -v cargo >/dev/null 2>&1; then
#     RUNTIME_VERSION=$(cargo --version 2>/dev/null)
#   fi
#   TEST_CMD="cargo test"

# elif [ -f "go.mod" ]; then
#   STACK="go"
#   if command -v go >/dev/null 2>&1; then
#     RUNTIME_VERSION=$(go version 2>/dev/null)
#   fi
#   TEST_CMD="go test ./..."

# elif compgen -G "*.csproj" > /dev/null || compgen -G "*.sln" > /dev/null || compgen -G "**/*.csproj" > /dev/null; then
#   STACK="dotnet"
#   if command -v dotnet >/dev/null 2>&1; then
#     RUNTIME_VERSION=$(dotnet --version 2>/dev/null)
#   fi
#   TEST_CMD="dotnet test"

# elif [ -f "pom.xml" ]; then
#   STACK="java-maven"
#   if command -v mvn >/dev/null 2>&1; then
#     RUNTIME_VERSION=$(mvn --version 2>/dev/null | head -1)
#   fi
#   TEST_CMD="mvn test"

# elif [ -f "build.gradle" ] || [ -f "build.gradle.kts" ]; then
#   STACK="java-gradle"
#   if command -v gradle >/dev/null 2>&1; then
#     RUNTIME_VERSION=$(gradle --version 2>/dev/null | grep Gradle | head -1)
#   fi
#   TEST_CMD="gradle test"

# else
#   STACK="unknown"
# fi

# if [ "$STACK" = "unknown" ]; then
#   warn "No se ha detectado un stack conocido"
#   warn "El harness funcionará pero sin verificación de tests automática"
#   warn "Edita init.sh sección 4 para añadir tu stack si es necesario"
# else
#   ok "Stack detectado: $STACK"
#   if [ -n "$RUNTIME_VERSION" ]; then
#     ok "Runtime: $RUNTIME_VERSION"
#   else
#     warn "Runtime de $STACK no encontrado en PATH"
#   fi
# fi

# # ─────────────────────────────────────────────────────────────────────
# # 2. Verificación de archivos base del arnés
# # ─────────────────────────────────────────────────────────────────────
# echo ""
# echo "── 2. Verificando archivos base del arnés ──────────────"

# BASE_FILES=(
#   "AGENTS.md"
#   "CHECKPOINTS.md"
#   "feature_list.json"
#   "progress/current.md"
#   "docs/stack.md"
#   "docs/architecture.md"
#   "docs/conventions.md"
#   "docs/verification.md"
# )

# for f in "${BASE_FILES[@]}"; do
#   if [ ! -f "$f" ]; then
#     fail "Falta archivo base: $f"
#     EXIT_CODE=1
#   else
#     ok "Existe $f"
#   fi
# done

# # Avisar si docs/related-projects.md no existe (no es bloqueante)
# if [ ! -f "docs/related-projects.md" ]; then
#   warn "No existe docs/related-projects.md (opcional, créalo si hay proyectos hermanos)"
# fi

# # ─────────────────────────────────────────────────────────────────────
# # 3. Validación de feature_list.json
# # ─────────────────────────────────────────────────────────────────────
# echo ""
# echo "── 3. Validando feature_list.json ──────────────────────"

# if command -v python3 >/dev/null 2>&1 || command -v python >/dev/null 2>&1; then
#   PYBIN=$(command -v python3 || command -v python)
#   "$PYBIN" - <<'PY'
# import json, sys
# try:
#     with open("feature_list.json", encoding="utf-8") as fp:
#         data = json.load(fp)
#     valid = {"pending", "in_progress", "done", "blocked"}
#     features = data.get("features", [])
#     in_progress = [f for f in features if f.get("status") == "in_progress"]
#     if len(in_progress) > 1:
#         print(f"[FAIL]  Hay {len(in_progress)} features en in_progress (máximo 1)")
#         sys.exit(1)
#     for f in features:
#         if f.get("status") not in valid:
#             print(f"[FAIL]  Estado inválido en feature {f.get('id')}: {f.get('status')}")
#             sys.exit(1)
#     print(f"[OK]    feature_list.json válido ({len(features)} features)")
# except Exception as e:
#     print(f"[FAIL]  feature_list.json inválido: {e}")
#     sys.exit(1)
# PY
#   if [ $? -ne 0 ]; then EXIT_CODE=1; fi
# elif command -v node >/dev/null 2>&1; then
#   # Fallback con Node si no hay Python
#   node -e '
#     const fs = require("fs");
#     try {
#       const data = JSON.parse(fs.readFileSync("feature_list.json", "utf8"));
#       const valid = new Set(["pending", "in_progress", "done", "blocked"]);
#       const features = data.features || [];
#       const inProgress = features.filter(f => f.status === "in_progress");
#       if (inProgress.length > 1) {
#         console.log(`[FAIL]  Hay ${inProgress.length} features en in_progress (máximo 1)`);
#         process.exit(1);
#       }
#       for (const f of features) {
#         if (!valid.has(f.status)) {
#           console.log(`[FAIL]  Estado inválido en feature ${f.id}: ${f.status}`);
#           process.exit(1);
#         }
#       }
#       console.log(`[OK]    feature_list.json válido (${features.length} features)`);
#     } catch (e) {
#       console.log(`[FAIL]  feature_list.json inválido: ${e.message}`);
#       process.exit(1);
#     }
#   '
#   if [ $? -ne 0 ]; then EXIT_CODE=1; fi
# else
#   warn "No hay Python ni Node disponibles; saltando validación de feature_list.json"
# fi

# # ─────────────────────────────────────────────────────────────────────
# # 4. Ejecución de tests (depende del stack)
# # ─────────────────────────────────────────────────────────────────────
# echo ""
# echo "── 4. Ejecutando tests ─────────────────────────────────"

# if [ -z "$TEST_CMD" ]; then
#   warn "No hay comando de tests configurado para el stack '$STACK'"
#   warn "Esto es OK al inicio del proyecto. Cuando añadas tests, edita esta sección."
# else
#   info "Ejecutando: $TEST_CMD"
#   if eval "$TEST_CMD"; then
#     ok "Todos los tests pasan"
#   else
#     fail "Hay tests rotos"
#     EXIT_CODE=1
#   fi
# fi

# # ─────────────────────────────────────────────────────────────────────
# # 5. Resumen
# # ─────────────────────────────────────────────────────────────────────
# echo ""
# echo "── 5. Resumen ──────────────────────────────────────────"

# if [ $EXIT_CODE -eq 0 ]; then
#   ok "Entorno listo. Puedes empezar a trabajar."
# else
#   fail "Entorno NO está listo. Resuelve los errores antes de avanzar."
# fi

# exit $EXIT_CODE








#!/usr/bin/env bash
# init.sh — Verificación e inicialización del entorno (agnóstico al stack)
#
# Este script lo ejecuta el agente al COMENZAR una sesión y antes de
# declarar cualquier tarea como `done`. Si falla, la sesión no debe avanzar.
#
# Detecta automáticamente el stack del proyecto y ejecuta la verificación
# apropiada. Si tu proyecto usa un stack no soportado, edita la sección 7.

set -u

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ok()    { printf "${GREEN}[OK]${NC}    %s\n" "$1"; }
warn()  { printf "${YELLOW}[WARN]${NC}  %s\n" "$1"; }
fail()  { printf "${RED}[FAIL]${NC}  %s\n" "$1"; }
info()  { printf "${BLUE}[INFO]${NC}  %s\n" "$1"; }

EXIT_CODE=0

# ─────────────────────────────────────────────────────────────────────
# 1. Detección de stack
# ─────────────────────────────────────────────────────────────────────
echo "── 1. Detectando stack ────────────────────────────────"

STACK="unknown"
TEST_CMD=""
RUNTIME_VERSION=""

if [ -f "package.json" ]; then
  STACK="node"
  if command -v node >/dev/null 2>&1; then
    RUNTIME_VERSION=$(node --version 2>/dev/null)
  fi
  # Detectar gestor de paquetes
  if [ -f "pnpm-lock.yaml" ]; then PKG="pnpm";
  elif [ -f "yarn.lock" ]; then PKG="yarn";
  else PKG="npm"; fi
  # Detectar test runner desde package.json. Soporta tanto el clásico
  # `test` como `test:unit` (este proyecto usa `test:unit`).
  if grep -q '"test:unit"' package.json 2>/dev/null; then
    TEST_CMD="$PKG test:unit"
  elif grep -q '"test"' package.json 2>/dev/null; then
    TEST_CMD="$PKG test"
  fi

elif [ -f "requirements.txt" ] || [ -f "pyproject.toml" ] || [ -f "setup.py" ]; then
  STACK="python"
  for candidate in python3 python; do
    if command -v "$candidate" >/dev/null 2>&1; then
      version_output=$("$candidate" --version 2>/dev/null)
      if [ -n "$version_output" ]; then
        PYTHON="$candidate"
        RUNTIME_VERSION="$version_output"
        break
      fi
    fi
  done
  if [ -d "tests" ]; then
    TEST_CMD="${PYTHON:-python3} -m unittest discover -s tests -v"
  elif [ -f "pytest.ini" ] || grep -q "pytest" pyproject.toml 2>/dev/null; then
    TEST_CMD="${PYTHON:-python3} -m pytest"
  fi

elif [ -f "Cargo.toml" ]; then
  STACK="rust"
  if command -v cargo >/dev/null 2>&1; then
    RUNTIME_VERSION=$(cargo --version 2>/dev/null)
  fi
  TEST_CMD="cargo test"

elif [ -f "go.mod" ]; then
  STACK="go"
  if command -v go >/dev/null 2>&1; then
    RUNTIME_VERSION=$(go version 2>/dev/null)
  fi
  TEST_CMD="go test ./..."

elif compgen -G "*.csproj" > /dev/null || compgen -G "*.sln" > /dev/null || compgen -G "**/*.csproj" > /dev/null; then
  STACK="dotnet"
  if command -v dotnet >/dev/null 2>&1; then
    RUNTIME_VERSION=$(dotnet --version 2>/dev/null)
  fi
  TEST_CMD="dotnet test"

elif [ -f "pom.xml" ]; then
  STACK="java-maven"
  if command -v mvn >/dev/null 2>&1; then
    RUNTIME_VERSION=$(mvn --version 2>/dev/null | head -1)
  fi
  TEST_CMD="mvn test"

elif [ -f "build.gradle" ] || [ -f "build.gradle.kts" ]; then
  STACK="java-gradle"
  if command -v gradle >/dev/null 2>&1; then
    RUNTIME_VERSION=$(gradle --version 2>/dev/null | grep Gradle | head -1)
  fi
  TEST_CMD="gradle test"

else
  STACK="unknown"
fi

if [ "$STACK" = "unknown" ]; then
  warn "No se ha detectado un stack conocido"
  warn "El harness funcionará pero sin verificación de tests automática"
  warn "Edita init.sh sección 7 para añadir tu stack si es necesario"
else
  ok "Stack detectado: $STACK"
  if [ -n "$RUNTIME_VERSION" ]; then
    ok "Runtime: $RUNTIME_VERSION"
  else
    warn "Runtime de $STACK no encontrado en PATH"
  fi
fi

# ─────────────────────────────────────────────────────────────────────
# 2. Verificación de archivos base del arnés
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── 2. Verificando archivos base del arnés ──────────────"

BASE_FILES=(
  "AGENTS.md"
  "CHECKPOINTS.md"
  "feature_list.json"
  "progress/current.md"
  "docs/stack.md"
  "docs/architecture.md"
  "docs/conventions.md"
  "docs/verification.md"
  "docs/specs.md"
)

for f in "${BASE_FILES[@]}"; do
  if [ ! -f "$f" ]; then
    fail "Falta archivo base: $f"
    EXIT_CODE=1
  else
    ok "Existe $f"
  fi
done

# Avisar si docs/related-projects.md no existe (no es bloqueante)
if [ ! -f "docs/related-projects.md" ]; then
  warn "No existe docs/related-projects.md (opcional, créalo si hay proyectos hermanos)"
fi

# ─────────────────────────────────────────────────────────────────────
# 3. Validación de feature_list.json
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── 3. Validando feature_list.json ──────────────────────"

# Elegir un intérprete Python que REALMENTE funcione. En Windows, el alias de
# ejecución de la Microsoft Store deja un `python3` en el PATH que no ejecuta
# nada y sale con error (49); hay que descartarlo probando `--version`.
PYBIN=""
for _py in python3 python; do
  if command -v "$_py" >/dev/null 2>&1 && "$_py" --version >/dev/null 2>&1; then
    PYBIN="$_py"; break
  fi
done

if [ -n "$PYBIN" ]; then
  "$PYBIN" - <<'PY'
import json, os, sys
try:
    # encoding explícito: feature_list.json es UTF-8, pero en Windows el
    # encoding por defecto de Python es cp1252, que decodifica mal las tildes
    # en silencio y revienta con las que no están en su tabla (p. ej. la Í).
    with open("feature_list.json", encoding="utf-8") as fp:
        data = json.load(fp)
    valid = {"pending", "spec_ready", "in_progress", "done", "blocked"}
    features = data.get("features", [])
    in_progress = [f for f in features if f.get("status") == "in_progress"]
    if len(in_progress) > 1:
        print(f"[FAIL]  Hay {len(in_progress)} features en in_progress (máximo 1)")
        sys.exit(1)
    requires_spec = {"spec_ready", "in_progress", "done"}
    spec_errors = []
    for f in features:
        if f.get("status") not in valid:
            print(f"[FAIL]  Estado inválido en feature {f.get('id')}: {f.get('status')}")
            sys.exit(1)
        if f.get("sdd") and f.get("status") in requires_spec:
            # specs/<nn>-<name>/: nn es el id con dos digitos (docs/specs.md).
            spec_dir = os.path.join("specs", f"{int(f.get('id', 0)):02d}-{f.get('name', '')}")
            required = ["requirements.md", "design.md", "tasks.md"]
            # decisions.md es la hoja de revision del humano: se exige mientras la
            # feature esta en la puerta o en curso. Las cerradas antes de que
            # existiera la regla no se tocan.
            if f.get("status") in ("spec_ready", "in_progress"):
                required.insert(0, "decisions.md")
            for fname in required:
                if not os.path.isfile(os.path.join(spec_dir, fname)):
                    spec_errors.append(
                        f"feature {f.get('id')} ({f.get('name')}) en "
                        f"{f.get('status')} sin {spec_dir}/{fname}"
                    )
    if spec_errors:
        for e in spec_errors:
            print(f"[FAIL]  {e}")
        sys.exit(1)
    print(f"[OK]    feature_list.json válido ({len(features)} features)")
    print(f"[OK]    Specs presentes para features sdd con estado no-pending")
except SystemExit:
    raise
except Exception as e:
    print(f"[FAIL]  feature_list.json o specs inválidos: {e}")
    sys.exit(1)
PY
  if [ $? -ne 0 ]; then EXIT_CODE=1; fi
elif command -v node >/dev/null 2>&1; then
  # Fallback con Node si no hay Python
  node -e '
    const fs = require("fs");
    const path = require("path");
    try {
      const data = JSON.parse(fs.readFileSync("feature_list.json", "utf8"));
      const valid = new Set(["pending", "spec_ready", "in_progress", "done", "blocked"]);
      const features = data.features || [];
      const inProgress = features.filter(f => f.status === "in_progress");
      if (inProgress.length > 1) {
        console.log(`[FAIL]  Hay ${inProgress.length} features en in_progress (máximo 1)`);
        process.exit(1);
      }
      const requiresSpec = new Set(["spec_ready", "in_progress", "done"]);
      const specErrors = [];
      for (const f of features) {
        if (!valid.has(f.status)) {
          console.log(`[FAIL]  Estado inválido en feature ${f.id}: ${f.status}`);
          process.exit(1);
        }
        if (f.sdd && requiresSpec.has(f.status)) {
          // specs/<nn>-<name>/: nn es el id con dos digitos (docs/specs.md).
          const specDir = path.join("specs", `${String(f.id).padStart(2, "0")}-${f.name || ""}`);
          const required = ["requirements.md", "design.md", "tasks.md"];
          // decisions.md es la hoja de revision del humano: se exige mientras la
          // feature esta en la puerta o en curso. Las cerradas antes de que
          // existiera la regla no se tocan.
          if (f.status === "spec_ready" || f.status === "in_progress") {
            required.unshift("decisions.md");
          }
          for (const fname of required) {
            if (!fs.existsSync(path.join(specDir, fname))) {
              specErrors.push(`feature ${f.id} (${f.name}) en ${f.status} sin ${specDir}/${fname}`);
            }
          }
        }
      }
      if (specErrors.length) {
        for (const e of specErrors) console.log(`[FAIL]  ${e}`);
        process.exit(1);
      }
      console.log(`[OK]    feature_list.json válido (${features.length} features)`);
      console.log(`[OK]    Specs presentes para features sdd con estado no-pending`);
    } catch (e) {
      console.log(`[FAIL]  feature_list.json o specs inválidos: ${e.message}`);
      process.exit(1);
    }
  '
  if [ $? -ne 0 ]; then EXIT_CODE=1; fi
else
  warn "No hay Python ni Node disponibles; saltando validación de feature_list.json"
fi

# ─────────────────────────────────────────────────────────────────────
# 4. Type checking (solo Node con TypeScript)
# ─────────────────────────────────────────────────────────────────────
# WHY: vitest/esbuild son permisivos con tipos en mocks; tsc no. Si dejamos
# que solo los tests se ejecuten, errores de TS pueden colarse al commit y
# romper `npm run dev:server` o el build de producción. Esto los atrapa antes.
if [ "$STACK" = "node" ] && [ -f "tsconfig.json" ]; then
  echo ""
  echo "── 4. Type checking (tsc) ──────────────────────────────"

  if [ -x "node_modules/.bin/tsc" ]; then
    info "Ejecutando: npx tsc --noEmit"
    if npx tsc --noEmit; then
      ok "Type check OK (tsc sin errores)"
    else
      fail "Type check fallido (tsc reporta errores)"
      EXIT_CODE=1
    fi
  else
    warn "tsconfig.json existe pero no se encuentra tsc en node_modules. ¿Falta 'npm install'?"
  fi
fi

# ─────────────────────────────────────────────────────────────────────
# 5. Lint (solo comprobación, sin --fix)
# ─────────────────────────────────────────────────────────────────────
# WHY (higiene 2026-09-30): hasta hoy la puerta decía "Entorno listo" sin haber
# pasado el linter, y un `pnpm lint` en rojo se coló hasta la revisión de la
# feature 23. Aquí se usa `lint:oxlint:check` (oxlint SIN --fix) a propósito:
# una puerta de verificación comprueba, no arregla. `pnpm lint` sigue siendo
# el de siempre (con --fix) para el trabajo a mano.
if [ "$STACK" = "node" ] && grep -q '"lint:oxlint:check"' package.json 2>/dev/null; then
  echo ""
  echo "── 5. Lint (oxlint, sin --fix) ─────────────────────────"

  info "Ejecutando: $PKG lint:oxlint:check"
  if $PKG lint:oxlint:check; then
    ok "Lint OK (oxlint sin errores)"
  else
    fail "Lint fallido (oxlint reporta errores). Arréglalo con: $PKG lint"
    EXIT_CODE=1
  fi
fi

# ─────────────────────────────────────────────────────────────────────
# 6. Formato (Prettier en modo comprobación)
# ─────────────────────────────────────────────────────────────────────
# WHY: no había ninguna comprobación de formato, así que el formato podía
# divergir sin que nada se quejara. `format:check` es `prettier --check` sobre
# exactamente las mismas rutas que `pnpm format`; no escribe nada.
if [ "$STACK" = "node" ] && grep -q '"format:check"' package.json 2>/dev/null; then
  echo ""
  echo "── 6. Formato (prettier --check) ───────────────────────"

  info "Ejecutando: $PKG format:check"
  if $PKG format:check; then
    ok "Formato OK (Prettier sin diferencias)"
  else
    fail "Hay archivos sin formatear. Arréglalo con: $PKG format"
    EXIT_CODE=1
  fi
fi

# ─────────────────────────────────────────────────────────────────────
# 7. Ejecución de tests (depende del stack)
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── 7. Ejecutando tests ─────────────────────────────────"

if [ -z "$TEST_CMD" ]; then
  warn "No hay comando de tests configurado para el stack '$STACK'"
  warn "Esto es OK al inicio del proyecto. Cuando añadas tests, edita esta sección."
else
  info "Ejecutando: $TEST_CMD"
  if eval "$TEST_CMD"; then
    ok "Todos los tests pasan"
  else
    fail "Hay tests rotos"
    EXIT_CODE=1
  fi
fi

# ─────────────────────────────────────────────────────────────────────
# 8. E2E smoke (chromium) — puerta de humo real (feature 6: e2e-smoke)
# ─────────────────────────────────────────────────────────────────────
# Solo chromium, para que la arrancada de sesión siga siendo rápida; los
# tres navegadores quedan disponibles con `pnpm test:e2e`. Si faltan los
# navegadores de Playwright en la máquina, se degrada con un aviso claro en
# vez de reventar con un error críptico.
echo ""
echo "── 8. E2E smoke (chromium) ─────────────────────────────"

E2E_CMD=""
if [ -f "package.json" ] && grep -q '"test:e2e"' package.json 2>/dev/null; then
  E2E_CMD="$PKG test:e2e --project=chromium"
fi

if [ -z "$E2E_CMD" ]; then
  warn "No hay script test:e2e en package.json; se omite el e2e"
else
  info "Ejecutando: $E2E_CMD"
  E2E_OUTPUT="$($E2E_CMD 2>&1)"
  E2E_STATUS=$?
  if [ "$E2E_STATUS" -eq 0 ]; then
    ok "E2E smoke verde (chromium)"
  elif echo "$E2E_OUTPUT" | grep -qi "executable doesn't exist\|please run the following command to download new browsers"; then
    warn "Navegadores de Playwright no encontrados; se omite el e2e."
    warn "Instálalos con: npx playwright install chromium"
  else
    fail "E2E smoke rojo (chromium):"
    echo "$E2E_OUTPUT"
    EXIT_CODE=1
  fi
fi

# ─────────────────────────────────────────────────────────────────────
# 9. Resumen
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── 9. Resumen ──────────────────────────────────────────"

if [ $EXIT_CODE -eq 0 ]; then
  ok "Entorno listo. Puedes empezar a trabajar."
else
  fail "Entorno NO está listo. Resuelve los errores antes de avanzar."
fi

exit $EXIT_CODE
