#!/usr/bin/env bash
# Check end-to-end del módulo de inventario contra el dev server (pnpm dev).
# Requiere el catálogo de ejemplo: `pnpm db:seed`.
# Necesita un usuario `bodeguero` para los checks de rol; si no existe, los salta.
set -u
BASE=http://localhost:3000
ADMIN=$(mktemp)
BODEGA=$(mktemp)
fail=0

check() { # check <descripcion> <esperado> <obtenido>
  if [[ "$3" == *"$2"* ]]; then echo "  ok   $1"
  else echo "  FALL $1"; echo "       esperaba: $2"; echo "       obtuvo:   $3"; fail=1; fi
}

check_no() { # check_no <descripcion> <no-esperado> <obtenido>
  if [[ "$3" != *"$2"* ]]; then echo "  ok   $1"
  else echo "  FALL $1"; echo "       no debía aparecer: $2"; fail=1; fi
}

login() { # login <jar> <usuario> <password>
  local csrf
  csrf=$(curl -sS -c "$1" -b "$1" "$BASE/api/auth/csrf" | sed -E 's/.*"csrfToken":"([^"]+)".*/\1/')
  curl -sS -c "$1" -b "$1" -X POST "$BASE/api/auth/callback/credentials" \
    -d "usuario=$2" -d "password=$3" -d "csrfToken=$csrf" -o /dev/null
  curl -sS -c "$1" -b "$1" "$BASE/api/auth/session"
}

echo "1. la ruta exige sesión"
anon=$(mktemp)
check "inventario redirige a login" "/login" \
  "$(curl -sS -c "$anon" -b "$anon" "$BASE/inventario" -o /dev/null -w '%{redirect_url}')"
check "la exportación responde 401" "401" \
  "$(curl -sS -c "$anon" -b "$anon" "$BASE/api/inventario/export" -o /dev/null -w '%{http_code}')"
rm -f "$anon"

echo "2. el admin ve el catálogo"
sesion=$(login "$ADMIN" admin admin123)
if [[ "$sesion" != *'"rol":"ADMIN"'* ]]; then
  echo "  FALL no se pudo entrar como admin (¿corriste 'pnpm db:seed' y ya cambiaste la clave inicial?)"
  exit 1
fi
html=$(curl -sS -c "$ADMIN" -b "$ADMIN" "$BASE/inventario")
check "lista ítems del catálogo"  "CBL-001"          "$html"
check "muestra la categoría"      "Eléctricos"       "$html"
check "badge normal"              "Normal"           "$html"
check "badge bajo mínimo"         "Bajo mínimo"      "$html"
check "badge crítico"             "Crítico"          "$html"
check "buscador presente"         "Buscar por nombre o código" "$html"
check "filtro de categoría"       "Todas las categorías"       "$html"

echo "3. el admin ve las acciones de escritura"
check "botón nuevo ítem"   "Nuevo ítem"       "$html"
check "botón categorías"   "Categorías"       "$html"
check "acción editar"      "Editar"           "$html"
check "acción dar de baja" "Dar de baja"      "$html"
check "botón exportar"     "Exportar a Excel" "$html"

echo "4. la exportación entrega un xlsx"
tmpx=$(mktemp)
tipo=$(curl -sS -c "$ADMIN" -b "$ADMIN" "$BASE/api/inventario/export" -o "$tmpx" -w '%{content_type}')
check "content-type de Excel" "spreadsheetml.sheet" "$tipo"
# Un .xlsx es un zip: sus dos primeros bytes son "PK".
check "el archivo es un xlsx real" "PK" "$(head -c 2 "$tmpx")"
check "pesa algo"                  "ok" "$([[ $(wc -c < "$tmpx") -gt 1000 ]] && echo ok)"
rm -f "$tmpx"

echo "5. el bodeguero consulta pero no administra"
sesion=$(login "$BODEGA" bodeguero admin123)
if [[ "$sesion" != *'"rol":"BODEGUERO"'* ]]; then
  echo "  -- sin usuario 'bodeguero', se saltan los checks de rol"
else
  htmlb=$(curl -sS -c "$BODEGA" -b "$BODEGA" "$BASE/inventario")
  check    "ve el catálogo"           "CBL-001"           "$htmlb"
  check    "puede exportar"           "Exportar a Excel"  "$htmlb"
  check_no "sin botón de nuevo ítem"  "Nuevo ítem"        "$htmlb"
  check_no "sin gestión de categorías" "Categorías"       "$htmlb"
  check_no "sin acción de editar"     "Editar"            "$htmlb"
  check_no "sin acción de dar de baja" "Dar de baja"      "$htmlb"
  check "la exportación sí le responde" "200" \
    "$(curl -sS -c "$BODEGA" -b "$BODEGA" "$BASE/api/inventario/export" -o /dev/null -w '%{http_code}')"
fi

echo "6. el stock no se puede editar a mano"
# El formulario de ítem vive en un modal que solo monta al abrirse, así que se
# revisa en la fuente: ningún input de stock, ni en crear ni en editar.
if grep -qE 'name="stock"' "$(dirname "$0")/../src/app/(app)/inventario/formulario-item.tsx"; then
  echo "  FALL el formulario de ítem expone un campo de stock"; fail=1
else
  echo "  ok   el formulario de ítem no expone el stock"
fi

rm -f "$ADMIN" "$BODEGA"
[[ $fail -eq 0 ]] && echo "TODO OK" || echo "HAY FALLOS"
exit $fail
