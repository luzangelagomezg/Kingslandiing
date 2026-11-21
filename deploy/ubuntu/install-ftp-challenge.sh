#!/usr/bin/env bash
set -Eeuo pipefail

target_ip="192.168.56.20"
environment_file="/etc/kinglanding/kinglanding.env"
ftp_root="/srv/kinglanding-ftp"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${EUID}" -ne 0 ]]; then
  printf 'Ejecuta este instalador con sudo.\n' >&2
  exit 1
fi

if ! ip -o -4 addr show | awk '{split($4, address, "/"); print address[1]}' | grep -Fxq "$target_ip"; then
  printf 'No se encontró %s en esta VM; no se instalará FTP.\n' "$target_ip" >&2
  exit 1
fi

if [[ ! -f "$environment_file" ]] || ! id kinglanding >/dev/null 2>&1; then
  printf 'Instala primero el portal KINGSLANDING y su archivo de entorno.\n' >&2
  exit 1
fi

if [[ ! -f "$script_dir/vsftpd.kinglanding.conf" ]]; then
  printf 'Falta vsftpd.kinglanding.conf junto al instalador.\n' >&2
  exit 1
fi

if ! command -v vsftpd >/dev/null 2>&1; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y vsftpd openssl
fi

read_environment_value() {
  local key="$1"
  local value
  value="$(sed -n "s/^[[:space:]]*${key}[[:space:]]*=[[:space:]]*//p" "$environment_file" | tr -d '\r' | head -n 1)"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  if [[ "$value" == '"'*'"' || "$value" == "'"*"'" ]]; then
    value="${value:1:${#value}-2}"
  fi
  printf '%s' "$value"
}

final_flag="$(read_environment_value KINGSLANDING_FINAL_FLAG)"
if [[ -z "$final_flag" ]]; then
  final_flag="KINGSLANDING{$(openssl rand -hex 16)}"
fi

ftp_user="$(read_environment_value KINGSLANDING_FTP_USER)"
ftp_password="$(read_environment_value KINGSLANDING_FTP_PASSWORD)"
ftp_user="${ftp_user:-varys_reader}"
ftp_password="${ftp_password:-$(openssl rand -hex 16)}"

temporary_environment="$(mktemp)"
trap 'rm -f "$temporary_environment"' EXIT
awk '!/^(KINGSLANDING_FINAL_FLAG|KINGSLANDING_FTP_USER|KINGSLANDING_FTP_PASSWORD)=/' "$environment_file" > "$temporary_environment"
printf 'KINGSLANDING_FINAL_FLAG="%s"\n' "$final_flag" >> "$temporary_environment"
printf 'KINGSLANDING_FTP_USER="%s"\n' "$ftp_user" >> "$temporary_environment"
printf 'KINGSLANDING_FTP_PASSWORD="%s"\n' "$ftp_password" >> "$temporary_environment"
install -o root -g kinglanding -m 0640 "$temporary_environment" "$environment_file"

if [[ -f /etc/vsftpd.conf ]]; then
  cp -n /etc/vsftpd.conf /etc/vsftpd.conf.kinglanding-backup
fi
install -o root -g root -m 0644 "$script_dir/vsftpd.kinglanding.conf" /etc/vsftpd.conf

if id "$ftp_user" >/dev/null 2>&1; then
  usermod --home "$ftp_root" --shell /usr/sbin/nologin "$ftp_user"
else
  useradd --system --no-create-home --home-dir "$ftp_root" --shell /usr/sbin/nologin "$ftp_user"
fi
printf '%s:%s\n' "$ftp_user" "$ftp_password" | chpasswd
if ! grep -Fxq /usr/sbin/nologin /etc/shells; then
  printf '%s\n' /usr/sbin/nologin >> /etc/shells
fi
printf '%s\n' "$ftp_user" > /etc/vsftpd.kinglanding.userlist
chown root:root /etc/vsftpd.kinglanding.userlist
chmod 0644 /etc/vsftpd.kinglanding.userlist

install -d -o root -g root -m 0755 "$ftp_root"
cat > "$ftp_root/mensaje_de_varys.txt" <<'EOF'
Mensaje de Varys

Un mensaje interceptado llego desde el Norte:
WKH QRUWK UHPHPEHUV

Descifra la frase en The Raven's Cipher y resuelve el orden de los sellos
en The Maester's Seal dentro del portal. Entonces presenta la prueba final.
EOF
printf '%s\n' "$final_flag" > "$ftp_root/trono_de_hierro.txt"
chown root:root "$ftp_root/mensaje_de_varys.txt" "$ftp_root/trono_de_hierro.txt"
chmod 0644 "$ftp_root/mensaje_de_varys.txt" "$ftp_root/trono_de_hierro.txt"

if command -v ufw >/dev/null 2>&1 && ufw status | grep -q '^Status: active'; then
  ufw allow from 192.168.56.0/24 to "$target_ip" port 21 proto tcp
  ufw allow from 192.168.56.0/24 to "$target_ip" port 30000:30009 proto tcp
fi

systemctl enable --now vsftpd
systemctl restart vsftpd
systemctl restart kinglanding.service

printf 'FTP de solo lectura activo en %s:21 (Host-Only).\n' "$target_ip"
printf 'Cuenta local del reto creada; consulta el Consejo para obtener las credenciales.\n'
printf 'Archivos publicados: mensaje_de_varys.txt y trono_de_hierro.txt.\n'