#!/usr/bin/env bash
# Check end-to-end del flujo de login contra el dev server (pnpm dev).
#
# Autosuficiente: guarda las credenciales del admin, las deja en el estado del
# seed para poder probar la rotación de verdad, y las restaura al salir — pase,
# falle o lo corten con Ctrl-C. Así se puede correr dos veces seguidas y en
# cualquier orden con los otros checks.
set -u
BASE=${BASE:-http://localhost:3000}
JAR=$(mktemp)
SNAP=$(mktemp)
USUARIO=${SEED_ADMIN_USUARIO:-admin}
CLAVE=${SEED_ADMIN_PASSWORD:-admin123}
NUEVA=claveNueva9
fail=0

cred() { pnpm -s tsx "$(dirname "$0")/credenciales.ts" "$@"; }

if ! cred guardar "$USUARIO" "$SNAP"; then
  echo "  FALL no se pudo leer al usuario '$USUARIO' (¿corriste 'pnpm db:seed'?)"
  rm -f "$JAR" "$SNAP"
  exit 1
fi

# Se instala recién con el snapshot en mano: restaurar sin él no restauraría nada.
FANTASMA=qa.fantasma
# Nombre distinto por corrida: el contador de intentos vive en memoria del
# servidor y sobrevive a que se borre el usuario, asi que reusar el nombre
# dejaria la cuenta nueva bloqueada por los fallos de la corrida anterior.
FRENO=qa.freno.$$

limpiar() {
  cred borrar "$FANTASMA"
  cred borrar "$FRENO"
  cred restaurar "$SNAP" || echo "  !! quedaron sin restaurar las credenciales de $USUARIO ($SNAP)"
  rm -f "$JAR" "$SNAP"
}
trap limpiar EXIT INT TERM

cred poner "$USUARIO" "$CLAVE" true

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
check "password incorrecta rechazada" "error=CredentialsSignin" "$(login "$USUARIO" noesta)"
check "sin sesion tras fallo"          "null"                    "$(sesion)"
check "usuario inexistente rechazado"  "error=CredentialsSignin" "$(login fantasma "$CLAVE")"

echo "2. login del admin sembrado"
login "$USUARIO" "$CLAVE" >/dev/null
check "sesion con rol ADMIN"        '"rol":"ADMIN"'                 "$(sesion)"
check "marcado para cambiar clave"  '"debeCambiarPassword":true'    "$(sesion)"
check "dashboard manda a cambiar"   "/cambiar-password" \
  "$(curl -sS -c "$JAR" -b "$JAR" "$BASE/dashboard" -o /dev/null -w '%{redirect_url}')"

echo "3. validaciones del cambio de clave"
check "rechaza clave corta"        "al menos 8 caracteres"        "$(cambiar "$CLAVE" corta corta)"
check "rechaza confirmacion mala"  "confirmación no coincide"     "$(cambiar "$CLAVE" "$NUEVA" otraClave9)"
check "rechaza clave igual"        "distinta de la actual"        "$(cambiar "$CLAVE" "$CLAVE" "$CLAVE")"
check "rechaza actual incorrecta"  "contraseña actual es incorrecta" "$(cambiar noesta "$NUEVA" "$NUEVA")"
check "sigue marcado"              '"debeCambiarPassword":true'   "$(sesion)"

echo "4. cambio exitoso"
cambiar "$CLAVE" "$NUEVA" "$NUEVA" >/dev/null
check "cierra sesion tras cambiar" "null" "$(sesion)"

echo "5. login con la clave nueva"
check "clave vieja ya no sirve" "error=CredentialsSignin" "$(login "$USUARIO" "$CLAVE")"
login "$USUARIO" "$NUEVA" >/dev/null
check "clave nueva entra"        '"rol":"ADMIN"'              "$(sesion)"
check "ya no exige cambio"       '"debeCambiarPassword":false' "$(sesion)"
check "dashboard accesible"      "200" \
  "$(curl -sS -c "$JAR" -b "$JAR" "$BASE/dashboard" -o /dev/null -w '%{http_code}')"

echo "6. sesion cuya cuenta ya no existe"
# El token es JWT y no se revalida contra la base: sobrevive a que borren la
# cuenta. Sin la comprobacion de `sesionViva`, la app renderiza normal y revienta
# en la primera escritura contra la foreign key de Auditoria.
GHOST=$(mktemp)

# `login` usa el jar global; el fantasma necesita el suyo, asi que va aparte.
glogin() { # glogin <usuario> <password>
  local csrf
  csrf=$(curl -sS -c "$GHOST" -b "$GHOST" "$BASE/api/auth/csrf" | sed -E 's/.*"csrfToken":"([^"]+)".*/\1/')
  curl -sS -c "$GHOST" -b "$GHOST" -X POST "$BASE/api/auth/callback/credentials" \
    -d "usuario=$1" -d "password=$2" -d "csrfToken=$csrf" -o /dev/null -w '%{redirect_url}'
}
gsesion() { curl -sS -c "$GHOST" -b "$GHOST" "$BASE/api/auth/session"; }
gexport() { curl -sS -c "$GHOST" -b "$GHOST" "$BASE/api/inventario/export" -o /dev/null -w '%{http_code}'; }

# Cuenta recien creada: la clave que puso el admin es de un solo uso y el flag
# viaja en el token, asi que hay que entrar *despues* de ponerlo.
cred crear "$FANTASMA" "$CLAVE" BODEGUERO
cred poner "$FANTASMA" "$CLAVE" true
glogin "$FANTASMA" "$CLAVE" >/dev/null
check "el fantasma entra" '"usuario":"'"$FANTASMA"'"'   "$(gsesion)"

# /api/** vive fuera del grupo (app): el guard del layout no lo cubre y el
# endpoint tiene que revalidar por su cuenta. Sin eso, la clave anotada en un
# papel alcanzaba para bajarse el catalogo entero sin haberla cambiado nunca.
check "con el cambio de clave pendiente, no exporta" "401" "$(gexport)"
cred poner "$FANTASMA" "$CLAVE" false
glogin "$FANTASMA" "$CLAVE" >/dev/null
check "ya sin el flag, exporta"                      "200" "$(gexport)"

cred borrar "$FANTASMA"
check "con la cuenta borrada, el dashboard manda a login" "/login"   "$(curl -sS -c "$GHOST" -b "$GHOST" "$BASE/dashboard" -o /dev/null -w '%{redirect_url}')"
# Mismo agujero que arriba pero por el lado de `activo`: con `auth()` a secas el
# JWT de una cuenta ya borrada seguia bajando el inventario hasta que expirara.
check "con la cuenta borrada, tampoco exporta"            "401"     "$(gexport)"
rm -f "$GHOST"

echo "7. freno de fuerza bruta"
# Sin techo, /api/auth/callback/credentials acepta intentos sin limite y escribe
# una fila de auditoria por cada uno: se prueban claves gratis y ~500 intentos
# empujan todo evento real fuera de las 500 filas que muestra /reportes.
FJAR=$(mktemp)
cred crear "$FRENO" "$CLAVE" BODEGUERO
flogin() { # flogin <password>
  local csrf
  csrf=$(curl -sS -c "$FJAR" -b "$FJAR" "$BASE/api/auth/csrf" | sed -E 's/.*"csrfToken":"([^"]+)".*/\1/')
  curl -sS -c "$FJAR" -b "$FJAR" -X POST "$BASE/api/auth/callback/credentials" \
    -d "usuario=$FRENO" -d "password=$1" -d "csrfToken=$csrf" -o /dev/null -w '%{redirect_url}'
}
flogin "$CLAVE" >/dev/null
check "con la clave buena entra" '"usuario":"'"$FRENO"'"' "$(curl -sS -c "$FJAR" -b "$FJAR" "$BASE/api/auth/session")"
for _ in $(seq 1 10); do flogin noesta >/dev/null; done
# Bloqueado se rechaza con el mismo mensaje generico: no se le confirma a nadie
# que la cuenta existe ni que le acerto a la clave.
check "agotados los intentos, la clave buena tampoco entra" "error=CredentialsSignin" "$(flogin "$CLAVE")"
rm -f "$FJAR"

[[ $fail -eq 0 ]] && echo "TODO OK" || echo "HAY FALLOS"
exit $fail
