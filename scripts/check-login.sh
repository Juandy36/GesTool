#!/usr/bin/env bash
# Check end-to-end del flujo de login contra el dev server (pnpm dev).
# Deja al admin con la contraseña cambiada: restaurar con `pnpm db:reset`.
set -u
BASE=http://localhost:3000
JAR=$(mktemp)
fail=0

check() { # check <descripcion> <esperado> <obtenido>
  if [[ "$3" == *"$2"* ]]; then echo "  ok   $1"
  else echo "  FALL $1"; echo "       esperaba: $2"; echo "       obtuvo:   $3"; fail=1; fi
}

login() { # login <usuario> <password> -> imprime redirect
  local csrf
  csrf=$(curl -sS -c "$JAR" -b "$JAR" "$BASE/api/auth/csrf" | sed -E 's/.*"csrfToken":"([^"]+)".*/\1/')
  curl -sS -c "$JAR" -b "$JAR" -X POST "$BASE/api/auth/callback/credentials" \
    -d "usuario=$1" -d "password=$2" -d "csrfToken=$csrf" -o /dev/null -w '%{redirect_url}'
}

sesion() { curl -sS -c "$JAR" -b "$JAR" "$BASE/api/auth/session"; }

cambiar() { # cambiar <actual> <nueva> <confirmacion> -> imprime cuerpo de respuesta
  local html key ref0 ref1
  html=$(curl -sS -c "$JAR" -b "$JAR" "$BASE/cambiar-password")
  key=$(grep -oE 'name="\$ACTION_KEY" value="[^"]+"' <<<"$html" | sed -E 's/.*value="([^"]+)".*/\1/')
  ref0=$(grep -oE 'name="\$ACTION_1:0" value="[^"]+"' <<<"$html" | sed -E 's/.*value="([^"]+)".*/\1/' | sed 's/&quot;/"/g')
  ref1=$(grep -oE 'name="\$ACTION_1:1" value="[^"]+"' <<<"$html" | sed -E 's/.*value="([^"]+)".*/\1/' | sed 's/&quot;/"/g')
  curl -sS -c "$JAR" -b "$JAR" -X POST "$BASE/cambiar-password" \
    -F "actual=$1" -F "nueva=$2" -F "confirmacion=$3" \
    -F '$ACTION_REF_1=' -F "\$ACTION_1:0=$ref0" -F "\$ACTION_1:1=$ref1" -F "\$ACTION_KEY=$key"
}

echo "1. rechazo de credenciales"
check "password incorrecta rechazada" "error=CredentialsSignin" "$(login admin noesta)"
check "sin sesion tras fallo"          "null"                    "$(sesion)"
check "usuario inexistente rechazado"  "error=CredentialsSignin" "$(login fantasma admin123)"

echo "2. login del admin sembrado"
login admin admin123 >/dev/null
check "sesion con rol ADMIN"        '"rol":"ADMIN"'                 "$(sesion)"
check "marcado para cambiar clave"  '"debeCambiarPassword":true'    "$(sesion)"
check "dashboard manda a cambiar"   "/cambiar-password" \
  "$(curl -sS -c "$JAR" -b "$JAR" "$BASE/dashboard" -o /dev/null -w '%{redirect_url}')"

echo "3. validaciones del cambio de clave"
check "rechaza clave corta"        "al menos 8 caracteres"        "$(cambiar admin123 corta corta)"
check "rechaza confirmacion mala"  "confirmación no coincide"     "$(cambiar admin123 claveNueva9 otraClave9)"
check "rechaza clave igual"        "distinta de la actual"        "$(cambiar admin123 admin123 admin123)"
check "rechaza actual incorrecta"  "contraseña actual es incorrecta" "$(cambiar noesta claveNueva9 claveNueva9)"
check "sigue marcado"              '"debeCambiarPassword":true'   "$(sesion)"

echo "4. cambio exitoso"
cambiar admin123 claveNueva9 claveNueva9 >/dev/null
check "cierra sesion tras cambiar" "null" "$(sesion)"

echo "5. login con la clave nueva"
check "clave vieja ya no sirve" "error=CredentialsSignin" "$(login admin admin123)"
login admin claveNueva9 >/dev/null
check "clave nueva entra"        '"rol":"ADMIN"'              "$(sesion)"
check "ya no exige cambio"       '"debeCambiarPassword":false' "$(sesion)"
check "dashboard accesible"      "200" \
  "$(curl -sS -c "$JAR" -b "$JAR" "$BASE/dashboard" -o /dev/null -w '%{http_code}')"

rm -f "$JAR"
[[ $fail -eq 0 ]] && echo "TODO OK" || echo "HAY FALLOS"
exit $fail
