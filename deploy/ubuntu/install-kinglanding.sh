#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  printf 'Ejecuta este instalador como root (por ejemplo, con sudo).\n' >&2
  exit 1
fi

if [[ "$#" -ne 2 ]]; then
  printf 'Uso: install-kinglanding.sh <bundle.tar.gz> <archivo-entorno>\n' >&2
  exit 2
fi

bundle_path="$(realpath -- "$1")"
environment_path="$(realpath -- "$2")"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if [[ ! -f "$bundle_path" || ! -f "$environment_path" ]]; then
  printf 'No se encuentra el bundle o el archivo de entorno.\n' >&2
  exit 1
fi

if ! tr -d '\r\357\273\277' < "$environment_path" | grep -Eq '^[[:space:]]*KINGSLANDING_FINAL_FLAG[[:space:]]*='; then
  printf 'El archivo de entorno debe contener la variable KINGSLANDING_FINAL_FLAG.\n' >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  if ! command -v apt-get >/dev/null 2>&1; then
    printf 'Node.js no está instalado y este sistema no tiene apt-get.\n' >&2
    exit 1
  fi
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
fi

node_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
if (( node_major < 18 )); then
  printf 'Se requiere Node.js 18 o posterior; encontrado: %s.\n' "$(node --version)" >&2
  exit 1
fi

if ! id kinglanding >/dev/null 2>&1; then
  useradd --system --home-dir /nonexistent --shell /usr/sbin/nologin kinglanding
fi

install -d -o root -g root -m 0755 /opt/kinglanding
tar -xzf "$bundle_path" -C /opt/kinglanding
test -f /opt/kinglanding/server.mjs
test -f /opt/kinglanding/dist/index.html

install -d -o root -g kinglanding -m 0750 /etc/kinglanding
install -o root -g kinglanding -m 0640 "$environment_path" /etc/kinglanding/kinglanding.env
install -o root -g root -m 0644 "$script_dir/kinglanding.service" /etc/systemd/system/kinglanding.service

systemctl daemon-reload
systemctl enable --now kinglanding.service
systemctl --no-pager --full status kinglanding.service

printf '\nPortal instalado. Puerto configurado: 5000/tcp.\n'
printf 'Comprueba que la VM solo tenga el adaptador Host-Only antes de entregar el laboratorio.\n'